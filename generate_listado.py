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
PARA_RPR_DEFAULT = (
    '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" '
    'w:cs="Times New Roman"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>'
)


def mk_para(content_xml, centered=False):
    jc = '<w:jc w:val="center"/>' if centered else ''
    return (
        f'<w:p><w:pPr><w:pStyle w:val="TableParagraph"/>{jc}'
        f'{PARA_RPR_DEFAULT}</w:pPr>{content_xml}</w:p>'
    )


def mk_run(text):
    return f'<w:r>{CELL_RPR_DEFAULT}<w:t xml:space="preserve">{esc(text)}</w:t></w:r>'


def text_to_paragraphs(text, centered=False):
    """Convierte texto multilínea (con \n) a múltiples <w:p>. Una línea vacía → <w:p/>."""
    if not text:
        return '<w:p/>'
    paragraphs = []
    for line in str(text).split('\n'):
        line = line.rstrip('\r')
        if not line.strip():
            paragraphs.append('<w:p/>')
        else:
            paragraphs.append(mk_para(mk_run(line), centered=centered))
    return ''.join(paragraphs)


def cell(width_dxa, text, *, centered=False, borders=''):
    """Construye una <w:tc> con ancho y bordes opcionales."""
    tcpr = f'<w:tcPr><w:tcW w:w="{width_dxa}" w:type="dxa"/>{borders}</w:tcPr>'
    body = text_to_paragraphs(text, centered=centered)
    return f'<w:tc>{tcpr}{body}</w:tc>'


def build_problem_row(fecha, num, activos_text, inactivos_text):
    """Una fila por problema. Anchos coinciden con el header del template."""
    cells = (
        cell(1542, fmt_fecha(fecha), centered=True,
             borders='<w:tcBorders><w:left w:val="nil"/>'
                     '<w:right w:val="single" w:sz="6" w:space="0" w:color="373435"/></w:tcBorders>')
        + cell(599, f'{num}.', centered=True,
               borders='<w:tcBorders>'
                       '<w:left w:val="single" w:sz="6" w:space="0" w:color="373435"/></w:tcBorders>')
        + cell(5387, activos_text,
               borders='<w:tcBorders>'
                       '<w:right w:val="single" w:sz="6" w:space="0" w:color="373435"/></w:tcBorders>')
        + cell(3249, inactivos_text,
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

rows_xml = ''
n = 1
for p in activos:
    rows_xml += build_problem_row(
        p.get('fecha', ''), n,
        p.get('descripcion', '') or '',
        '',
    )
    n += 1
for p in inactivos:
    rows_xml += build_problem_row(
        p.get('fecha', ''), n,
        '',
        p.get('descripcion', '') or '',
    )
    n += 1

xml = xml.replace('<!--LISTADO_TABLE_BODY-->', rows_xml, 1)

# ── Save ──────────────────────────────────────────────────────────────
files['word/document.xml'] = xml.encode('utf-8')
out = io.BytesIO()
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zout:
    for name in names:
        zout.writestr(name, files[name])

sys.stdout.buffer.write(out.getvalue())
