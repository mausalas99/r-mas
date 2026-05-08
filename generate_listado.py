#!/usr/bin/env python3
"""
Genera Listado de Problemas (.docx) para R+ Sala (v3.0).

Lee JSON de stdin con la forma:
{
  "patient":  { "nombre", "registro", "edad", "sexo", "area", "servicio",
                "cuarto", "cama" },
  "listado":  { "fecha", "hora",
                "activos":   [ { "fecha", "descripcion" }, ... ],
                "inactivos": [ { "fecha", "descripcion" }, ... ] },
  "medicos":  { "profesor", "r4", "r2", "r1a", "r1b" }
}

Escribe DOCX bytes a stdout. Solo stdlib — sin dependencias externas.
Usa template_listado.docx (derivado de FELIPE) con sentinelas ~~CAMPO~~.
"""
import sys
import json
import zipfile
import io
import os
import re

TEMPLATE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'template_listado.docx',
)


def esc(value):
    if value is None:
        return ''
    return (
        str(value)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


def fmt_fecha(iso_or_dmy):
    """Acepta YYYY-MM-DD o DD/MM/YYYY o vacío. Devuelve DD/MM/YYYY."""
    if not iso_or_dmy:
        return ''
    s = str(iso_or_dmy).strip()
    m = re.match(r'^(\d{4})-(\d{2})-(\d{2})$', s)
    if m:
        y, mo, d = m.groups()
        return f'{d}/{mo}/{y}'
    return s


# ── Cell builders for problem rows ────────────────────────────────────

CELL_RPR_DEFAULT = (
    '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" '
    'w:cs="Times New Roman"/><w:color w:val="373435"/>'
    '<w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
)
CELL_RPR_BOLD = (
    '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" '
    'w:cs="Times New Roman"/><w:b/><w:bCs/><w:color w:val="373435"/>'
    '<w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
)
PARA_RPR_DEFAULT = (
    '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" '
    'w:cs="Times New Roman"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
)

# numId definido en word/numbering.xml del template (heredado de FELIPE):
# numId=35 → abstractNum=57 → formato "lowerLetter" con patrón "%1)" e
# indent left=720 hanging=360 (sangría colgante). Word genera la letra
# automáticamente y maneja el tab. Cuando hay varios bloques con título
# en la misma celda, se necesitan numIds distintos para reiniciar el
# contador en a) — los inyectamos al vuelo en numbering.xml.
LIST_NUMID_BASE = 35       # primer bloque usa el numId nativo del template
LIST_NUMID_DYNAMIC_START = 9000  # IDs sintéticos para reinicios sucesivos


def mk_para(content_xml, *, centered=False, ind=None):
    jc = '<w:jc w:val="center"/>' if centered else ''
    indent = ind or ''
    return (
        f'<w:p><w:pPr><w:pStyle w:val="TableParagraph"/>{jc}{indent}'
        f'{PARA_RPR_DEFAULT}</w:pPr>{content_xml}</w:p>'
    )


def mk_run(text, *, bold=False):
    rpr = CELL_RPR_BOLD if bold else CELL_RPR_DEFAULT
    return f'<w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r>'


def mk_list_para(content, num_id):
    """Párrafo de lista numerada (lowerLetter %1)). El ``a)``, ``b)``,
    ``c)`` lo genera Word a partir de num_id."""
    return (
        '<w:p><w:pPr>'
        '<w:pStyle w:val="TableParagraph"/>'
        f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_id}"/></w:numPr>'
        '<w:contextualSpacing/>'
        f'{PARA_RPR_DEFAULT}'
        '</w:pPr>'
        f'<w:r>{CELL_RPR_DEFAULT}<w:t xml:space="preserve">{esc(content)}</w:t></w:r>'
        '</w:p>'
    )


# Reconoce líneas tipo "a)", "  b)", "ñ)" — la letra escrita por el
# usuario se ignora y se reemplaza con la auto-generada por Word.
LIST_LINE_RE = re.compile(r'^\s*([A-Za-zÑñ])\)\s*(.*)$')


def text_to_paragraphs(text, num_id_alloc):
    """
    Convierte texto multilínea a múltiples <w:p>.

    Reglas (markdown ligero, ad hoc para Listado de Problemas):
      - Línea vacía → <w:p/>. Además abre un nuevo bloque, lo que hace
        que la siguiente lista ``a) ...`` reinicie su contador en ``a``
        (asignándole un numId fresco).
      - Línea con prefijo ``letra)`` → párrafo de lista numerada
        (lowerLetter), Word genera la letra y el tab automáticamente.
      - Cualquier otra línea no vacía → título en negritas. También
        abre un nuevo bloque para que la lista que la sigue reinicie.

    ``num_id_alloc`` es un dict mutable ``{ 'next': int, 'used': set }``
    que asigna numIds sintéticos a cada bloque nuevo. El primer bloque
    usa LIST_NUMID_BASE (numId 35 del template); los siguientes
    consumen IDs >= LIST_NUMID_DYNAMIC_START.
    """
    if not text:
        return '<w:p/>'
    paragraphs = []
    current_num_id = None  # se asigna cuando empieza un bloque de lista

    def assign_new_num_id():
        if LIST_NUMID_BASE not in num_id_alloc['used']:
            num_id_alloc['used'].add(LIST_NUMID_BASE)
            return LIST_NUMID_BASE
        nid = num_id_alloc['next']
        num_id_alloc['next'] += 1
        num_id_alloc['used'].add(nid)
        return nid

    for raw in str(text).split('\n'):
        line = raw.rstrip('\r')
        stripped = line.strip()
        if not stripped:
            paragraphs.append('<w:p/>')
            current_num_id = None       # bloque cerrado; siguiente lista reinicia
            continue
        m = LIST_LINE_RE.match(line)
        if m:
            content = m.group(2)
            if current_num_id is None:
                current_num_id = assign_new_num_id()
            paragraphs.append(mk_list_para(content, current_num_id))
        else:
            paragraphs.append(mk_para(mk_run(line, bold=True)))
            current_num_id = None       # un título también reinicia la lista
    return ''.join(paragraphs)


def plain_cell(width_dxa, text, *, centered=False, borders=''):
    """Celda con un único párrafo de texto plano (no parsea markdown)."""
    tcpr = f'<w:tcPr><w:tcW w:w="{width_dxa}" w:type="dxa"/>{borders}</w:tcPr>'
    body = mk_para(mk_run(text), centered=centered) if text else '<w:p/>'
    return f'<w:tc>{tcpr}{body}</w:tc>'


def desc_cell(width_dxa, text, num_id_alloc, *, borders=''):
    """Celda de descripción de problema con interpretación markdown."""
    tcpr = f'<w:tcPr><w:tcW w:w="{width_dxa}" w:type="dxa"/>{borders}</w:tcPr>'
    body = text_to_paragraphs(text, num_id_alloc)
    return f'<w:tc>{tcpr}{body}</w:tc>'


def build_problem_row(fecha, num, activos_text, inactivos_text, num_id_alloc):
    """Una fila por problema. Anchos coinciden con el header del template."""
    cells = (
        plain_cell(1542, fmt_fecha(fecha), centered=True,
                   borders='<w:tcBorders><w:left w:val="nil"/>'
                           '<w:right w:val="single" w:sz="6" w:space="0" w:color="373435"/></w:tcBorders>')
        + plain_cell(599, f'{num}.', centered=True,
                     borders='<w:tcBorders>'
                             '<w:left w:val="single" w:sz="6" w:space="0" w:color="373435"/></w:tcBorders>')
        + desc_cell(5387, activos_text, num_id_alloc,
                    borders='<w:tcBorders>'
                            '<w:right w:val="single" w:sz="6" w:space="0" w:color="373435"/></w:tcBorders>')
        + desc_cell(3249, inactivos_text, num_id_alloc,
                    borders='<w:tcBorders>'
                            '<w:left w:val="single" w:sz="6" w:space="0" w:color="373435"/>'
                            '<w:right w:val="nil"/></w:tcBorders>')
    )
    return f'<w:tr><w:trPr><w:trHeight w:val="448"/></w:trPr>{cells}</w:tr>'


# ── Main ──────────────────────────────────────────────────────────────

data = json.loads(sys.stdin.buffer.read().decode('utf-8'))
patient = data.get('patient', {}) or {}
listado = data.get('listado', {}) or {}
medicos = data.get('medicos', {}) or {}

nombre   = (patient.get('nombre')   or '').upper()
registro = patient.get('registro')  or ''
edad     = str(patient.get('edad')  or '')
sexo     = (patient.get('sexo')     or '').upper()
area     = (patient.get('area')     or '').upper()
servicio = (patient.get('servicio') or '').upper()
cuarto   = patient.get('cuarto')    or ''
cama     = patient.get('cama')      or ''

with zipfile.ZipFile(TEMPLATE_PATH, 'r') as zin:
    names = zin.namelist()
    files = {n: zin.read(n) for n in names}

xml = files['word/document.xml'].decode('utf-8')

# 1) Patient header replacements (each sentinel appears twice — encabezado se repite).
for sentinel, value in [
    ('~~NOMBRE~~',   nombre),
    ('~~REGISTRO~~', registro),
    ('~~EDAD~~',     edad),
    ('~~SEXO~~',     sexo),
    ('~~AREA~~',     area),
    ('~~SERVICIO~~', servicio),
    ('~~CUARTO~~',   cuarto),
    ('~~CAMA~~',     cama),
]:
    xml = xml.replace(sentinel, esc(value))

# 2) Médicos (5 líneas).
for sentinel, value in [
    ('~~MEDICO_PROFESOR~~', medicos.get('profesor', '') or ''),
    ('~~MEDICO_R4~~',       medicos.get('r4', '') or ''),
    ('~~MEDICO_R2~~',       medicos.get('r2', '') or ''),
    ('~~MEDICO_R1A~~',      medicos.get('r1a', '') or ''),
    ('~~MEDICO_R1B~~',      medicos.get('r1b', '') or ''),
]:
    xml = xml.replace(sentinel, esc(value))

# 3) Tabla de problemas: reemplaza el marcador con N filas.
activos = listado.get('activos') or []
inactivos = listado.get('inactivos') or []

# Asignador de numIds: el primer bloque usa el numId 35 nativo del
# template; los siguientes (un bloque por título o por separador) usan
# IDs sintéticos a partir de 9000 que injectamos en numbering.xml.
num_id_alloc = {'next': LIST_NUMID_DYNAMIC_START, 'used': set()}

rows_xml = ''
total = max(len(activos), len(inactivos))
for i in range(total):
    a = activos[i] if i < len(activos) else {}
    ina = inactivos[i] if i < len(inactivos) else {}
    fecha = a.get('fecha') or ina.get('fecha') or ''
    rows_xml += build_problem_row(
        fecha, i + 1,
        a.get('descripcion', '') or '',
        ina.get('descripcion', '') or '',
        num_id_alloc,
    )

xml = xml.replace('<!--LISTADO_TABLE_BODY-->', rows_xml, 1)

# 4) numbering.xml — inyecta los numIds sintéticos como aliases que
# apuntan al mismo abstractNum=57 (formato lowerLetter "%1)") pero con
# <w:lvlOverride> para reiniciar el contador en a). Sin esto, dos
# bloques distintos seguirían numerando b, c, d en vez de reiniciar.
num_xml = files.get('word/numbering.xml', b'').decode('utf-8')
synth_ids = [nid for nid in sorted(num_id_alloc['used']) if nid != LIST_NUMID_BASE]
if num_xml and synth_ids:
    inject = ''
    for nid in synth_ids:
        inject += (
            f'<w:num w:numId="{nid}">'
            f'<w:abstractNumId w:val="57"/>'
            f'<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride>'
            f'</w:num>'
        )
    # Insertamos antes del cierre </w:numbering>.
    if '</w:numbering>' in num_xml:
        num_xml = num_xml.replace('</w:numbering>', inject + '</w:numbering>', 1)
        files['word/numbering.xml'] = num_xml.encode('utf-8')

# ── Save ──────────────────────────────────────────────────────────────
files['word/document.xml'] = xml.encode('utf-8')
out = io.BytesIO()
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zout:
    for name in names:
        zout.writestr(name, files[name])

sys.stdout.buffer.write(out.getvalue())
