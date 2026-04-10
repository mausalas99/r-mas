#!/usr/bin/env python3
"""
Genera hoja de indicaciones médicas.
Usa template_indicaciones.docx como base (solo stdlib — sin dependencias externas).
Lee JSON de stdin, escribe DOCX bytes a stdout.
"""
import sys, json, zipfile, io, re, os

TEMPLATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'template_indicaciones.docx')

# ── XML helpers ───────────────────────────────────────────────────────────────

SZ = '<w:sz w:val="16"/><w:szCs w:val="16"/>'
LIST_NUMID = '52'   # numId used in original template for list paragraphs

def esc(text):
    if not text:
        return ''
    return (str(text)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;'))

def mk_r(text, bold=False):
    """Single run, 8pt."""
    b = '<w:b/><w:bCs/>' if bold else ''
    return (f'<w:r><w:rPr>{b}{SZ}</w:rPr>'
            f'<w:t xml:space="preserve">{esc(text)}</w:t></w:r>')

def mk_p(content_xml, centered=False):
    """Paragraph with optional centering."""
    jc = '<w:jc w:val="center"/>' if centered else ''
    return f'<w:p><w:pPr>{jc}<w:rPr>{SZ}</w:rPr></w:pPr>{content_xml}</w:p>'

def mk_list_p(text):
    """Bulleted list paragraph matching template style."""
    return (f'<w:p>'
            f'<w:pPr><w:pStyle w:val="ListParagraph"/>'
            f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{LIST_NUMID}"/></w:numPr>'
            f'<w:rPr>{SZ}</w:rPr></w:pPr>'
            f'<w:r><w:rPr>{SZ}</w:rPr>'
            f'<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>')

def section_xml(title, content):
    """Bold header + one list paragraph per non-empty line."""
    xml = mk_p(mk_r(title, bold=True))
    if content and content.strip():
        for line in content.strip().split('\n'):
            line = line.strip()
            if line:
                xml += mk_list_p(line)
    return xml

# ── Cell builders ─────────────────────────────────────────────────────────────

def cell_r0c0(fecha, hora):
    return (f'<w:tc><w:tcPr><w:tcW w:w="1980" w:type="dxa"/></w:tcPr>'
            f'{mk_p(mk_r(fecha))}'
            f'{mk_p(mk_r(hora + " HORAS"))}'
            f'</w:tc>')

def cell_r0c1(servicio):
    title = f'INDICACIONES POR {servicio}'
    return (f'<w:tc><w:tcPr><w:tcW w:w="8916" w:type="dxa"/></w:tcPr>'
            f'{mk_p(mk_r(title), centered=True)}'
            f'</w:tc>')

def cell_r1c0(medicos):
    lines = [l.strip() for l in (medicos or '').split('\n') if l.strip()]
    content = mk_p('')          # blank first paragraph (matches template)
    for line in lines:
        content += mk_p(mk_r(line))
    return (f'<w:tc><w:tcPr><w:tcW w:w="1980" w:type="dxa"/></w:tcPr>'
            f'{content}</w:tc>')

def cell_r1c1(ind, servicio, otros):
    desc = (ind.get('descripcion') or '').strip()
    if not desc:
        desc = f'INDICACIONES POR SERVICIO DE {servicio}'

    content = mk_p(mk_r(desc))

    for title, key in [
        ('DIETA',          'dieta'),
        ('CUIDADOS',       'cuidados'),
        ('ESTUDIOS',       'estudios'),
        ('MEDICAMENTOS',   'medicamentos'),
        ('INTERCONSULTAS', 'interconsultas'),
    ]:
        content += section_xml(title, ind.get(key, ''))

    for item in (otros or []):
        titulo    = (item.get('titulo') or '').strip().upper()
        contenido = (item.get('contenido') or '').strip()
        if titulo:
            content += section_xml(titulo, contenido)

    return (f'<w:tc><w:tcPr><w:tcW w:w="8916" w:type="dxa"/></w:tcPr>'
            f'{content}</w:tc>')

# ── Main ──────────────────────────────────────────────────────────────────────

data    = json.loads(sys.stdin.buffer.read().decode('utf-8'))
patient = data.get('patient', {})
ind     = data.get('indicaciones', {})

nombre   = (patient.get('nombre')   or '').upper()
registro = patient.get('registro')  or ''
edad     = str(patient.get('edad')  or '')
sexo     = (patient.get('sexo')     or '').upper()
area     = (patient.get('area')     or '').upper()
servicio = (patient.get('servicio') or 'MEDICINA INTERNA').upper()
cuarto   = patient.get('cuarto')    or ''
cama     = patient.get('cama')      or ''

fecha   = (ind.get('fecha') or '').replace('/', '-')
hora    = ind.get('hora')   or ''
medicos = ind.get('medicos') or ''
otros   = ind.get('otros')  or []

with zipfile.ZipFile(TEMPLATE_PATH, 'r') as zin:
    names = zin.namelist()
    files = {n: zin.read(n) for n in names}

xml = files['word/document.xml'].decode('utf-8')

# ── Locate the 4 cells in the main table ─────────────────────────────────────

tbl_match = re.search(r'<w:tbl>.*?</w:tbl>', xml, re.DOTALL)
if not tbl_match:
    sys.stderr.write("No table found in template\n")
    sys.exit(1)

tbl_xml = tbl_match.group()
row_list = list(re.finditer(r'<w:tr[ >].*?</w:tr>', tbl_xml, re.DOTALL))
if len(row_list) < 2:
    sys.stderr.write("Expected at least 2 rows in table\n")
    sys.exit(1)

row0_xml = row_list[0].group()
row1_xml = row_list[1].group()

cells_r0 = list(re.finditer(r'<w:tc>.*?</w:tc>', row0_xml, re.DOTALL))
cells_r1 = list(re.finditer(r'<w:tc>.*?</w:tc>', row1_xml, re.DOTALL))

orig_r0c0 = cells_r0[0].group()
orig_r0c1 = cells_r0[1].group()
orig_r1c0 = cells_r1[0].group()
orig_r1c1 = cells_r1[1].group()

# ── Replace table cells ───────────────────────────────────────────────────────

xml = xml.replace(orig_r0c0, cell_r0c0(fecha, hora), 1)
xml = xml.replace(orig_r0c1, cell_r0c1(servicio), 1)
xml = xml.replace(orig_r1c0, cell_r1c0(medicos), 1)
xml = xml.replace(orig_r1c1, cell_r1c1(ind, servicio, otros), 1)

# ── Replace patient info in header (two occurrences each) ────────────────────

ORIG_NOMBRE   = ' MA BEATRIZ LOREDO RODRÍGUEZ'  # leading space preserved from template
ORIG_REGISTRO = '2141273-5'
ORIG_EDAD     = '68'
ORIG_SEXO     = 'F'
ORIG_AREA     = 'TRAUMATOLOGIA'
ORIG_SERVICIO = 'MEDICINA INTERNA'
ORIG_CUARTO   = '419'
ORIG_CAMA     = ' 1'   # leading space preserved from template

def replace_t(xml, old, new):
    """Replace <w:t> content — both with and without xml:space attribute."""
    e_old, e_new = esc(old), esc(new)
    xml = xml.replace(f'<w:t>{e_old}</w:t>', f'<w:t>{e_new}</w:t>')
    xml = xml.replace(f'<w:t xml:space="preserve">{e_old}</w:t>',
                      f'<w:t xml:space="preserve">{e_new}</w:t>')
    return xml

xml = replace_t(xml, ORIG_NOMBRE,   f' {nombre}')
xml = replace_t(xml, ORIG_REGISTRO, registro)
xml = replace_t(xml, ORIG_EDAD,     edad)
xml = replace_t(xml, ORIG_SEXO,     sexo)
xml = replace_t(xml, ORIG_AREA,     area)
xml = replace_t(xml, ORIG_SERVICIO, servicio)
xml = replace_t(xml, ORIG_CUARTO,   cuarto)
xml = replace_t(xml, ORIG_CAMA,     f' {cama}')

# ── Write output ──────────────────────────────────────────────────────────────

files['word/document.xml'] = xml.encode('utf-8')

out = io.BytesIO()
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zout:
    for name in names:
        zout.writestr(name, files[name])

sys.stdout.buffer.write(out.getvalue())
