#!/usr/bin/env python3
"""
Generates a DOCX evolution note by filling the original template.
Reads JSON from stdin, writes DOCX bytes to stdout.
"""
import sys, json, zipfile, io, re, os

TEMPLATE_PATH = os.environ.get(
    'TEMPLATE_PATH',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), 'template.docx')
)

def esc(text):
    if not text:
        return ''
    return (str(text)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;'))

def replace_t(xml, old_val, new_val):
    """Replace exact <w:t> content."""
    e_old = esc(old_val)
    e_new = esc(new_val)
    xml = xml.replace(f'<w:t>{e_old}</w:t>', f'<w:t>{e_new}</w:t>')
    xml = xml.replace(f'<w:t xml:space="preserve">{e_old}</w:t>',
                      f'<w:t xml:space="preserve">{e_new}</w:t>')
    return xml

def clear_t(xml, val):
    """Clear a <w:t> element's content."""
    return replace_t(xml, val, '')

def main():
    data = json.load(sys.stdin)
    patient = data['patient']
    note    = data['note']

    with zipfile.ZipFile(TEMPLATE_PATH, 'r') as zin:
        names = zin.namelist()
        files = {n: zin.read(n) for n in names}

    xml = files['word/document.xml'].decode('utf-8')

    # ── Patient info (appears twice) ─────────────────────────────────────────
    nombre   = (patient.get('nombre') or '').upper()
    registro = patient.get('registro') or ''
    edad     = str(patient.get('edad') or '')
    sexo     = patient.get('sexo') or ''
    area     = (patient.get('area') or '').upper()
    servicio = (patient.get('servicio') or '').upper()
    cuarto   = patient.get('cuarto') or ''
    cama     = patient.get('cama') or ''

    # ── Fecha y Hora (early, before any content replacement) ─────────────────
    fecha = note.get('fecha') or ''
    hora  = note.get('hora') or ''
    xml = replace_t(xml, '08/04/2026', fecha)
    xml = replace_t(xml, '09:00', hora)

    # ── Interrogatorio FIRST (before SERVICIO replace, since body text contains MEDICINA INTERNA) ──
    interrogatorio = (note.get('interrogatorio') or '').upper()
    ORIG_INTERR = ('PACIENTE FEMENINA DE 77 AÑOS CON ANTECEDENTES DE DM2 E HTA, INTERCONSULTADA A MEDICINA INTERNA EL 03/04/26 POR DESCONTROL HIPERTENSIVO EN CONTEXTO DE HOSPITALIZACIÓN POR ABSCESO HEPÁTICO EN LÓBULO IZQUIERDO DE 153 CC (CON ANTECEDENTE DE LAPAROTOMÍA EXPLORATORIA CON DRENAJE DE ABSCESO Y APENDICECTOMÍA EL 13/03/26 EN CHARCAS, SLP, Y POSTERIOR DRENAJE PERCUTÁNEO CON KIT UNIVERSAL 10 FR EL 01/04/26). DURANTE SU SEGUIMIENTO SE HA LOGRADO MEJOR CONTROL TENSIONAL, ENCONTRÁNDOSE HOY CON TA DE 130/70 MMHG. SE DOCUMENTÓ HIPOKALEMIA PERSISTENTE (NADIR 3.1) CON REPOSICIONES SERIADAS DE POTASIO Y MAGNESIO, PENDIENTE AÚN ABORDAJE COMPLETO CON ELECTROLITOS URINARIOS Y GASES VENOSOS. PRESENTA EDEMA GODET ++ SIN HABERSE COLOCADO VENDAJE COMPRESIVO NI SONDA FOLEY A PESAR DE SUGERENCIAS REITERADAS. SIN POSIBILIDAD DE VALORAR RETO CON FUROSEMIDA A PESAR DE SU SUGERENCIA. LA TAC ABDOMINAL CONTRASTADA PARA VALORAR EVOLUCIÓN DE LA COLECCIÓN Y POSICIÓN DEL DRENAJE BLAKE CONTINÚA PENDIENTE A PESAR DE MULTIPLES SUGERENCIAS. SE MODIFICÓ ESQUEMA ANTIBIÓTICO A ERTAPENEM POR INDICACION DE SERVICIO DE INFECTOLOGIA. LAS GLUCOMETRÍAS SE HAN MANTENIDO PARCIALMENTE FUERA DE META CON AJUSTE DE RESCATES DE INSULINA. DEBIDO A LO ANTERIOR SE DECIDE ALTA POR PARTE DE MEDICINA INTERNA DE MANERA INTRAHOSPITALARIA. EN CASO DE PERSISTENCIA DE ALTERACION ELECTROLITICA, FALLA A CONTROL DE TENSION ARTERIAL, SE RECOMIENDA INTERCONSULTAR A EQUIPO DE GUARDIA. ')
    xml = replace_t(xml, ORIG_INTERR, interrogatorio)

    # ── Patient info (AFTER interrogatorio to avoid 'MEDICINA INTERNA' collision) ──
    xml = xml.replace('MARÍA ELVIRA SIFUENTES GARCÍA', esc(nombre))
    xml = xml.replace('2207709-2', esc(registro))
    xml = replace_t(xml, '77', edad)
    xml = xml.replace('CIRUGÍA AB', esc(area))
    xml = xml.replace('MEDICINA INTERNA', esc(servicio))
    xml = xml.replace('<w:t>F</w:t>', f'<w:t>{esc(sexo)}</w:t>', 1)
    xml = replace_t(xml, '440', cuarto)
    xml = xml.replace('<w:t xml:space="preserve"> 05</w:t>',
                      f'<w:t xml:space="preserve"> {esc(cama)}</w:t>')

    # ── Evolución: distribute each user line into its own paragraph slot ──────
    # Template has 5 evolucion paragraphs (SOAP: N, V, HD, HI, NM) — duplicated
    ORIG_EVOL_LINES = [
        'N: FOUR 16/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN 3 ESFERAS, ALERTA || ANALGESIA CON PARACETAMOL 1 GRAMO EN CASO DE DOLOR LEVE O FIEBRE',
        'V: FR 19 RPM, SATO2 97% AL AIRE AMBIENTE | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS',
        'HD: ESTABLE, TA 130/70 MMHG, FC 72 LPM || SIN VASOPRESORES',
        'HI: AFEBRIL, TEMPERATURA 36°C || ANTIBIÓTICOS: ERTAPENEM 1 G IV CADA 24 HORAS (DÍA 1 FUNCIONAL — METRONIDAZOL Y TRIMETOPRIM/SULFAMETOXAZOL SUSPENDIDOS)',
        'NM: DIETA BLANDA DIABÉTICA || INGRESOS 1100 CC, 3 DIURESIS ESPONTÁNEAS, BALANCE NC || DRENAJE UNIVERSAL (BLAKE): 0 CC || GLUCOMETRÍAS CAPILARES (194, 114, 168 MG/DL)',
    ]
    evolucion_raw = note.get('evolucion') or ''
    evolucion_lines = [l.upper() for l in evolucion_raw.split('\n') if l.strip()]
    for i, orig in enumerate(ORIG_EVOL_LINES):
        new_val = evolucion_lines[i] if i < len(evolucion_lines) else ''
        xml = replace_t(xml, orig, new_val)

    # ── Estudios: distribute each user line into its own paragraph slot ───────
    # Template has 8 study paragraphs (date + BH/QS/ESC/PFHs lines) — duplicated
    ORIG_ESTUDIOS_LINES = [
        '07.04.26',
        'Glu  Cr 0.4 BUN 9    AU 2.3  COL 171',
        'Na 137.7 Cl 101.2 K 3.3 Ca 8.1 F 3.7 Mg 1.63',
        '06.04.26',
        'Hb 11.4 Hto 34.8 VCM 86 HCM 28.2 Leu 4.92 Neu 2.76 Eos 0.275 Plt 198   ',
        'Glu 190 Cr 0.4 BUN 8 PCR 0.3   AU 2.6 TGL 153 COL 166',
        'Na 139.8 Cl 105 K 3.2 Ca 7.9 F 3.4 ',
        'Alb 2.5 AST 11 ALT 6 FA 103 BT 0.3 BD 0.1 BI 0.2 LDH 120 Amil 25',
    ]
    estudios_raw = note.get('estudios') or ''
    estudios_lines = [l.upper() for l in estudios_raw.split('\n') if l.strip()]
    for i, orig in enumerate(ORIG_ESTUDIOS_LINES):
        new_val = estudios_lines[i] if i < len(estudios_lines) else ''
        xml = replace_t(xml, orig, new_val)
    # Clear prefix nodes (split from value nodes in template XML)
    for prefix in ['QS', 'ESC', 'BH', 'PFHs']:
        xml = clear_t(xml, prefix)

    # ── Diagnósticos ─────────────────────────────────────────────────────────
    diagnosticos = note.get('diagnosticos') or []
    if isinstance(diagnosticos, str):
        diagnosticos = [d.strip() for d in diagnosticos.split('\n') if d.strip()]

    dx1 = diagnosticos[0].upper() if len(diagnosticos) > 0 else ''
    dx2 = diagnosticos[1].upper() if len(diagnosticos) > 1 else ''
    if len(diagnosticos) > 2:
        dx2 += ' | ' + ' | '.join(d.upper() for d in diagnosticos[2:])

    xml = replace_t(xml, 'CONTROL METABÓLICO', dx1)
    xml = replace_t(xml, 'ABSCESO HEPÁTICO EN LÓBULO HEPÁTICO IZQUIERDO', dx2)

    # ── Signos vitales ────────────────────────────────────────────────────────
    ta   = note.get('ta')   or ''
    fr   = note.get('fr')   or ''
    fc   = note.get('fc')   or ''
    temp = note.get('temp') or ''
    peso = note.get('peso') or ''

    # TA: standalone <w:t>130/70</w:t>
    xml = replace_t(xml, '130/70', ta)
    # FR: standalone <w:t>19</w:t>
    xml = replace_t(xml, '19', fr)
    # FC: <w:t xml:space="preserve">72  </w:t>
    xml = xml.replace('<w:t xml:space="preserve">72  </w:t>',
                      f'<w:t xml:space="preserve">{esc(fc)}  </w:t>')
    # T: <w:t xml:space="preserve"> 36°C</w:t>
    xml = xml.replace('<w:t xml:space="preserve"> 36°C</w:t>',
                      f'<w:t xml:space="preserve"> {esc(temp)}°C</w:t>')
    # Peso: <w:t xml:space="preserve"> 55.000</w:t>
    xml = xml.replace('<w:t xml:space="preserve"> 55.000</w:t>',
                      f'<w:t xml:space="preserve"> {esc(peso)}</w:t>')

    # ── Tratamiento ───────────────────────────────────────────────────────────
    tratamiento = note.get('tratamiento') or []
    if isinstance(tratamiento, str):
        tratamiento = [t.strip() for t in tratamiento.split('\n') if t.strip()]

    def get_tx(i):
        return tratamiento[i].upper() if i < len(tratamiento) else ''

    # ── Treatment line 1: paragraph P68 has 153 char-split runs → replace whole paragraph ──
    # Find P68 by finding all paragraphs and replacing index 68
    paragraphs = re.findall(r'<w:p\b[^>]*>.*?</w:p>', xml, re.DOTALL)
    p68 = paragraphs[68]
    ppr68 = re.search(r'<w:pPr>.*?</w:pPr>', p68, re.DOTALL)
    ppr68_str = ppr68.group() if ppr68 else ''

    rpr_normal = ('<w:rPr><w:color w:val="231F20"/><w:spacing w:val="6"/>'
                  '<w:sz w:val="23"/><w:lang w:val="es-ES"/></w:rPr>')

    left1  = f'1. {get_tx(0)}' if get_tx(0) else '1. ___________________________________'
    right6 = f'6. {get_tx(5)}' if get_tx(5) else '6. ___________________________________'

    p68_new = (
        f'<w:p><w:pPr>{ppr68_str}</w:pPr>'
        f'<w:r>{rpr_normal}<w:t xml:space="preserve">{esc(left1)}'
        f'{"  " * 10}</w:t></w:r>'
        f'<w:r>{rpr_normal}<w:t>{esc(right6)}</w:t></w:r>'
        f'</w:p>'
    )
    xml = xml.replace(p68, p68_new, 1)

    # Lines 2-5 (left) and 7-10 (right) — these are merged, simple replace
    for i, orig in enumerate([
        '2.____________________________________',
        '3.____________________________________',
        '4.____________________________________',
        '5.____________________________________',
    ]):
        new_tx = f'{i+2}. {get_tx(i+1)}' if get_tx(i+1) else orig
        xml = xml.replace(orig, esc(new_tx))

    for i, orig in enumerate([
        '7.   _______________________________________',
        '8.   _______________________________________',
        '9.   _______________________________________',
        '10._______________________________________',
    ]):
        num = i + 7
        new_tx = f'{num}. {get_tx(i+6)}' if get_tx(i+6) else orig
        xml = xml.replace(orig, esc(new_tx))

    # ── Médico Tratante ───────────────────────────────────────────────────────
    medico = note.get('medico') or ''
    # Medico name is split: <w:t>R3</w:t> + <w:t>MI KARLA PAOLA...SALAS,</w:t>
    # Clear the 'R3' prefix run and replace the main run
    ORIG_MEDICO_SUFFIX = 'MI KARLA PAOLA MONCADA, R3MI ALEXANDRA MAGAÑA, R2MI PAULINA GARCIA, R1MI MAURICIO SALAS,'
    # Clear 'R3' that immediately precedes the medico name (use regex for safety)
    xml = re.sub(
        r'<w:t>R3</w:t>(\s*</w:r>\s*<w:r>.*?)<w:t>' + re.escape(esc(ORIG_MEDICO_SUFFIX)) + r'</w:t>',
        r'<w:t></w:t>\1<w:t>' + esc(medico) + r'</w:t>',
        xml, flags=re.DOTALL
    )

    # ── Profesor Responsable ──────────────────────────────────────────────────
    profesor = note.get('profesor') or ''
    xml = replace_t(xml, 'DRA. MÓNICA SANCHEZ', profesor)
    # Clear the trailing underscores run for Profesor
    xml = xml.replace('<w:t xml:space="preserve"> _____</w:t>',
                      '<w:t xml:space="preserve"> </w:t>')

    # ── Write new DOCX ────────────────────────────────────────────────────────
    files['word/document.xml'] = xml.encode('utf-8')

    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zout:
        for name in names:
            zout.writestr(name, files[name])

    sys.stdout.buffer.write(out.getvalue())


if __name__ == '__main__':
    main()
