#!/usr/bin/env python3
"""
One-off helper: convierte FELIPE LISTADO DE PROBLEMAS.docx en un template
limpio template_listado.docx con sentinelas ~~CAMPO~~ que generate_listado.py
sustituye con datos reales.

Ejecuta:  python3 _clean_listado_template.py /ruta/a/FELIPE\ LISTADO\ DE\ PROBLEMAS.docx

El archivo de salida es template_listado.docx en el mismo directorio del script.
"""
import sys, os, re, zipfile, io

if len(sys.argv) < 2:
    sys.stderr.write("Uso: _clean_listado_template.py /ruta/a/FELIPE.docx\n")
    sys.exit(1)

SRC = sys.argv[1]
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'template_listado.docx')

with zipfile.ZipFile(SRC, 'r') as zin:
    names = zin.namelist()
    files = {n: zin.read(n) for n in names}

xml = files['word/document.xml'].decode('utf-8')

# ── Patient header (each value appears twice) ──────────────────────────
xml = xml.replace(
    '<w:t>FELIPE DE JESUS RIVERA MENDOZA</w:t>',
    '<w:t xml:space="preserve">~~NOMBRE~~</w:t>',
)
xml = xml.replace(
    '<w:t>2203959-4</w:t>',
    '<w:t xml:space="preserve">~~REGISTRO~~</w:t>',
)
xml = xml.replace('<w:t>61</w:t>', '<w:t xml:space="preserve">~~EDAD~~</w:t>')
xml = xml.replace('<w:t>MASC</w:t>', '<w:t xml:space="preserve">~~SEXO~~</w:t>')
# AREA: '<w:t>MEDICINA INTERNA</w:t>' (sin espacio inicial)
xml = xml.replace(
    '<w:t>MEDICINA INTERNA</w:t>',
    '<w:t xml:space="preserve">~~AREA~~</w:t>',
)
# SERVICIO: '<w:t xml:space="preserve"> MEDICINA INTERNA</w:t>' (con espacio inicial)
xml = xml.replace(
    '<w:t xml:space="preserve"> MEDICINA INTERNA</w:t>',
    '<w:t xml:space="preserve"> ~~SERVICIO~~</w:t>',
)

# CUARTO: dos runs separados '<w:t>2</w:t>' + '<w:t>17</w:t>' con mismo rPr.
# Localizamos la pareja exacta y la colapsamos al sentinela ~~CUARTO~~.
VALUE_RPR = (
    '<w:rPr><w:rFonts w:ascii="Times New Roman"/><w:b/>'
    '<w:color w:val="231F20"/><w:sz w:val="20"/>'
    '<w:u w:val="single" w:color="231F20"/></w:rPr>'
)
cuarto_re = re.compile(
    r'<w:r(?:\s+w:rsidR="[^"]*")?>' + re.escape(VALUE_RPR) + r'<w:t>2</w:t></w:r>'
    r'<w:r(?:\s+w:rsidR="[^"]*")?>' + re.escape(VALUE_RPR) + r'<w:t>17</w:t></w:r>'
)
xml, cuarto_n = cuarto_re.subn(
    '<w:r>' + VALUE_RPR + '<w:t xml:space="preserve">~~CUARTO~~</w:t></w:r>',
    xml,
)
sys.stderr.write(f'Cuarto pairs replaced: {cuarto_n}\n')

# CAMA: <w:t>4</w:t> con rPr sz=20+u=single (valor cama).
cama_re = re.compile(
    r'<w:r(?:\s+w:rsidR="[^"]*")?>' + re.escape(VALUE_RPR) + r'<w:t>4</w:t></w:r>'
)
xml, cama_n = cama_re.subn(
    '<w:r>' + VALUE_RPR + '<w:t xml:space="preserve">~~CAMA~~</w:t></w:r>',
    xml,
)
sys.stderr.write(f'Cama runs replaced: {cama_n}\n')

# ── Médicos (5 líneas, dentro de la tabla cell 3 de row 4) ─────────────
xml = xml.replace(
    '<w:t>Profesor: Dr. Iván Galarza</w:t>',
    '<w:t xml:space="preserve">~~MEDICO_PROFESOR~~</w:t>',
)
xml = xml.replace(
    '<w:t>R4MI Andrea Flores</w:t>',
    '<w:t xml:space="preserve">~~MEDICO_R4~~</w:t>',
)
# R2MI Fernando Garcia está partido en dos runs con <w:proofErr>. Colapsa.
r2_re = re.compile(
    r'<w:r><w:rPr>(<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="es-MX"/>)</w:rPr><w:t xml:space="preserve">R2MI Fernando </w:t></w:r>'
    r'<w:proofErr w:type="spellStart"/>'
    r'<w:r><w:rPr>\1</w:rPr><w:t>Garcia</w:t></w:r>'
    r'<w:proofErr w:type="spellEnd"/>'
)
xml, r2_n = r2_re.subn(
    r'<w:r><w:rPr>\1</w:rPr><w:t xml:space="preserve">~~MEDICO_R2~~</w:t></w:r>',
    xml,
)
sys.stderr.write(f'R2 médico runs collapsed: {r2_n}\n')

xml = xml.replace(
    '<w:t>R1MI Karina Palomo</w:t>',
    '<w:t xml:space="preserve">~~MEDICO_R1A~~</w:t>',
)
xml = xml.replace(
    '<w:t>R1MI Juan Pablo Toledo</w:t>',
    '<w:t xml:space="preserve">~~MEDICO_R1B~~</w:t>',
)

# ── Tabla de problemas: reconstruye como header + body marker + signature_row ─
tbl_match = re.search(r'<w:tbl>.*?</w:tbl>', xml, re.DOTALL)
if not tbl_match:
    sys.stderr.write('No se encontró <w:tbl>\n')
    sys.exit(1)
tbl = tbl_match.group()
rows = list(re.finditer(r'<w:tr[ >].*?</w:tr>', tbl, re.DOTALL))
if len(rows) < 5:
    sys.stderr.write('Se esperaban al menos 5 filas en la tabla original\n')
    sys.exit(1)
header_row = rows[0].group()
sig_row = rows[4].group()  # row con los médicos (cell 3)

# Limpia las celdas 0,1,2 del sig_row (preserva sus tcPr) y cell 3 con sentinelas ya inyectadas.
sig_cells = list(re.finditer(r'<w:tc>.*?</w:tc>', sig_row, re.DOTALL))
if len(sig_cells) != 4:
    sys.stderr.write(f'Signature row no tiene 4 celdas (tiene {len(sig_cells)})\n')
    sys.exit(1)


def empty_cell_with_tcpr(cell_xml):
    tcpr_match = re.search(r'<w:tcPr>.*?</w:tcPr>', cell_xml, re.DOTALL)
    tcpr = tcpr_match.group() if tcpr_match else ''
    return f'<w:tc>{tcpr}<w:p/></w:tc>'


cleaned_sig_cells = [empty_cell_with_tcpr(sig_cells[i].group()) for i in range(3)]
cleaned_sig_cells.append(sig_cells[3].group())

# Reconstruye sig_row reemplazando las primeras 3 celdas.
new_sig_row = sig_row
for i in range(3):
    new_sig_row = new_sig_row.replace(sig_cells[i].group(), cleaned_sig_cells[i], 1)

tbl_open = tbl[: rows[0].start()]
new_tbl_xml = (
    tbl_open
    + header_row
    + '<!--LISTADO_TABLE_BODY-->'
    + new_sig_row
    + '</w:tbl>'
)
xml = xml.replace(tbl, new_tbl_xml, 1)

# ── Save ───────────────────────────────────────────────────────────────
files['word/document.xml'] = xml.encode('utf-8')
with zipfile.ZipFile(DST, 'w', zipfile.ZIP_DEFLATED) as zout:
    for name in names:
        zout.writestr(name, files[name])

sys.stderr.write(f'OK → {DST}\n')
