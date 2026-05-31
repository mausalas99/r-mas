'use strict';

const { esc, replaceT, loadDocxTemplate, packDocxBuffer } = require('./shared.js');

const ORIG_INTERR =
  'PACIENTE FEMENINA DE 77 AÑOS CON ANTECEDENTES DE DM2 E HTA, INTERCONSULTADA A MEDICINA INTERNA EL 03/04/26 POR DESCONTROL HIPERTENSIVO EN CONTEXTO DE HOSPITALIZACIÓN POR ABSCESO HEPÁTICO EN LÓBULO IZQUIERDO DE 153 CC (CON ANTECEDENTE DE LAPAROTOMÍA EXPLORATORIA CON DRENAJE DE ABSCESO Y APENDICECTOMÍA EL 13/03/26 EN CHARCAS, SLP, Y POSTERIOR DRENAJE PERCUTÁNEO CON KIT UNIVERSAL 10 FR EL 01/04/26). DURANTE SU SEGUIMIENTO SE HA LOGRADO MEJOR CONTROL TENSIONAL, ENCONTRÁNDOSE HOY CON TA DE 130/70 MMHG. SE DOCUMENTÓ HIPOKALEMIA PERSISTENTE (NADIR 3.1) CON REPOSICIONES SERIADAS DE POTASIO Y MAGNESIO, PENDIENTE AÚN ABORDAJE COMPLETO CON ELECTROLITOS URINARIOS Y GASES VENOSOS. PRESENTA EDEMA GODET ++ SIN HABERSE COLOCADO VENDAJE COMPRESIVO NI SONDA FOLEY A PESAR DE SUGERENCIAS REITERADAS. SIN POSIBILIDAD DE VALORAR RETO CON FUROSEMIDA A PESAR DE SU SUGERENCIA. LA TAC ABDOMINAL CONTRASTADA PARA VALORAR EVOLUCIÓN DE LA COLECCIÓN Y POSICIÓN DEL DRENAJE BLAKE CONTINÚA PENDIENTE A PESAR DE MULTIPLES SUGERENCIAS. SE MODIFICÓ ESQUEMA ANTIBIÓTICO A ERTAPENEM POR INDICACION DE SERVICIO DE INFECTOLOGIA. LAS GLUCOMETRÍAS SE HAN MANTENIDO PARCIALMENTE FUERA DE META CON AJUSTE DE RESCATES DE INSULINA. DEBIDO A LO ANTERIOR SE DECIDE ALTA POR PARTE DE MEDICINA INTERNA DE MANERA INTRAHOSPITALARIA. EN CASO DE PERSISTENCIA DE ALTERACION ELECTROLITICA, FALLA A CONTROL DE TENSION ARTERIAL, SE RECOMIENDA INTERCONSULTAR A EQUIPO DE GUARDIA. ';

const ORIG_EVOL_LINES = [
  'N: FOUR 16/16 PUNTOS, SIN DATOS DE FOCALIZACIÓN, ORIENTADO EN 3 ESFERAS, ALERTA || ANALGESIA CON PARACETAMOL 1 GRAMO EN CASO DE DOLOR LEVE O FIEBRE',
  'V: FR 19 RPM, SATO2 97% AL AIRE AMBIENTE | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS',
  'HD: ESTABLE, TA 130/70 MMHG, FC 72 LPM || SIN VASOPRESORES',
  'HI: AFEBRIL, TEMPERATURA 36°C || ANTIBIÓTICOS: ERTAPENEM 1 G IV CADA 24 HORAS (DÍA 1 FUNCIONAL — METRONIDAZOL Y TRIMETOPRIM/SULFAMETOXAZOL SUSPENDIDOS)',
  'NM: DIETA BLANDA DIABÉTICA || INGRESOS 1100 CC, 3 DIURESIS ESPONTÁNEAS, BALANCE NC || DRENAJE UNIVERSAL (BLAKE): 0 CC || GLUCOMETRÍAS CAPILARES (194, 114, 168 MG/DL)',
];

const ORIG_ESTUDIOS_LINES = [
  '07.04.26',
  'Glu  Cr 0.4 BUN 9    AU 2.3  COL 171',
  'Na 137.7 Cl 101.2 K 3.3 Ca 8.1 F 3.7 Mg 1.63',
  '06.04.26',
  'Hb 11.4 Hto 34.8 VCM 86 HCM 28.2 Leu 4.92 Neu 2.76 Eos 0.275 Plt 198   ',
  'Glu 190 Cr 0.4 BUN 8 PCR 0.3   AU 2.6 TGL 153 COL 166',
  'Na 139.8 Cl 105 K 3.2 Ca 7.9 F 3.4 ',
  'Alb 2.5 AST 11 ALT 6 FA 103 BT 0.3 BD 0.1 BI 0.2 LDH 120 Amil 25',
];

const ORIG_MEDICO_SUFFIX =
  'MI KARLA PAOLA MONCADA, R3MI ALEXANDRA MAGAÑA, R2MI PAULINA GARCIA, R1MI MAURICIO SALAS,';

const TX_LEFT_ORIG = [
  '2.____________________________________',
  '3.____________________________________',
  '4.____________________________________',
  '5.____________________________________',
];

const TX_RIGHT_ORIG = [
  '7.   _______________________________________',
  '8.   _______________________________________',
  '9.   _______________________________________',
  '10._______________________________________',
];

const RPR_NORMAL =
  '<w:rPr><w:color w:val="231F20"/><w:spacing w:val="6"/>' +
  '<w:sz w:val="23"/><w:lang w:val="es-ES"/></w:rPr>';

function findParagraphs(xml) {
  const paragraphs = [];
  const re = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    paragraphs.push(m[0]);
  }
  return paragraphs;
}

function getTx(tratamiento, i) {
  return i < tratamiento.length ? tratamiento[i].toUpperCase() : '';
}

function normalizeLines(raw) {
  if (!raw) return [];
  return String(raw)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.toUpperCase());
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((d) => String(d).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean);
  }
  return [];
}

async function generateNoteBuffer({ patient, note }) {
  patient = patient || {};
  note = note || {};

  const { names, files } = await loadDocxTemplate('template.docx');

  let xml = files['word/document.xml'].toString('utf-8');

  const nombre = (patient.nombre || '').toUpperCase();
  const registro = patient.registro || '';
  const edad = String(patient.edad || '');
  const sexo = patient.sexo || '';
  const area = (patient.area || '').toUpperCase();
  const servicio = (patient.servicio || '').toUpperCase();
  const cuarto = patient.cuarto || '';
  const cama = patient.cama || '';

  const fecha = note.fecha || '';
  const hora = note.hora || '';
  xml = replaceT(xml, '08/04/2026', fecha);
  xml = replaceT(xml, '09:00', hora);

  const interrogatorio = (note.interrogatorio || '').toUpperCase();
  xml = replaceT(xml, ORIG_INTERR, interrogatorio);

  xml = xml.replace('MARÍA ELVIRA SIFUENTES GARCÍA', esc(nombre));
  xml = xml.replace('2207709-2', esc(registro));
  xml = replaceT(xml, '77', edad);
  xml = xml.replace('CIRUGÍA AB', esc(area));
  xml = xml.replace('MEDICINA INTERNA', esc(servicio));
  xml = xml.replace('<w:t>F</w:t>', `<w:t>${esc(sexo)}</w:t>`);
  xml = replaceT(xml, '440', cuarto);
  xml = xml.replace(
    '<w:t xml:space="preserve"> 05</w:t>',
    `<w:t xml:space="preserve"> ${esc(cama)}</w:t>`,
  );

  const evolucionLines = normalizeLines(note.evolucion);
  for (let i = 0; i < ORIG_EVOL_LINES.length; i += 1) {
    const newVal = i < evolucionLines.length ? evolucionLines[i] : '';
    xml = replaceT(xml, ORIG_EVOL_LINES[i], newVal);
  }

  const estudiosLines = normalizeLines(note.estudios);
  for (let i = 0; i < ORIG_ESTUDIOS_LINES.length; i += 1) {
    const newVal = i < estudiosLines.length ? estudiosLines[i] : '';
    xml = replaceT(xml, ORIG_ESTUDIOS_LINES[i], newVal);
  }

  for (const prefix of ['QS', 'ESC', 'BH', 'PFHs']) {
    xml = xml.replace(
      new RegExp(`<w:t(?:\\s[^>]*)?>${prefix}</w:t>\\s*<w:tab/>`, 'g'),
      '<w:t></w:t>',
    );
  }

  let diagnosticos = normalizeStringList(note.diagnosticos);
  const dx1 = diagnosticos.length > 0 ? diagnosticos[0].toUpperCase() : '';
  let dx2 = diagnosticos.length > 1 ? diagnosticos[1].toUpperCase() : '';
  if (diagnosticos.length > 2) {
    dx2 += ` | ${diagnosticos.slice(2).map((d) => d.toUpperCase()).join(' | ')}`;
  }

  xml = replaceT(xml, 'CONTROL METABÓLICO', dx1);
  xml = replaceT(xml, 'ABSCESO HEPÁTICO EN LÓBULO HEPÁTICO IZQUIERDO', dx2);

  const ta = note.ta || '';
  const fr = note.fr || '';
  const fc = note.fc || '';
  const temp = note.temp || '';
  const peso = note.peso || '';

  xml = replaceT(xml, '130/70', ta);
  xml = replaceT(xml, '19', fr);
  xml = xml.replace(
    '<w:t xml:space="preserve">72  </w:t>',
    `<w:t xml:space="preserve">${esc(fc)}  </w:t>`,
  );
  xml = xml.replace(
    '<w:t xml:space="preserve"> 36°C</w:t>',
    `<w:t xml:space="preserve"> ${esc(temp)}°C</w:t>`,
  );
  xml = xml.replace(
    '<w:t xml:space="preserve"> 55.000</w:t>',
    `<w:t xml:space="preserve"> ${esc(peso)}</w:t>`,
  );

  let tratamiento = normalizeStringList(note.tratamiento);

  const paragraphs = findParagraphs(xml);
  if (paragraphs.length <= 68) {
    throw new Error('template.docx: párrafo P68 no encontrado');
  }
  const p68 = paragraphs[68];
  const pprMatch = p68.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const ppr68Str = pprMatch ? pprMatch[0] : '';

  const tx0 = getTx(tratamiento, 0);
  const tx5 = getTx(tratamiento, 5);
  const left1 = tx0 ? `1. ${tx0}` : '1. ___________________________________';
  const right6 = tx5 ? `6. ${tx5}` : '6. ___________________________________';

  const p68New =
    `<w:p><w:pPr>${ppr68Str}</w:pPr>` +
    `<w:r>${RPR_NORMAL}<w:t xml:space="preserve">${esc(left1)}${'  '.repeat(10)}</w:t></w:r>` +
    `<w:r>${RPR_NORMAL}<w:t>${esc(right6)}</w:t></w:r>` +
    '</w:p>';
  xml = xml.replace(p68, p68New);

  for (let i = 0; i < TX_LEFT_ORIG.length; i += 1) {
    const orig = TX_LEFT_ORIG[i];
    const tx = getTx(tratamiento, i + 1);
    const newTx = tx ? `${i + 2}. ${tx}` : orig;
    xml = xml.replace(orig, esc(newTx));
  }

  for (let i = 0; i < TX_RIGHT_ORIG.length; i += 1) {
    const orig = TX_RIGHT_ORIG[i];
    const num = i + 7;
    const tx = getTx(tratamiento, i + 6);
    const newTx = tx ? `${num}. ${tx}` : orig;
    xml = xml.replace(orig, esc(newTx));
  }

  const medico = note.medico || '';
  xml = xml.replace(
    new RegExp(
      `<w:t>R3</w:t>(\\s*</w:r>\\s*<w:r>.*?)<w:t>${esc(ORIG_MEDICO_SUFFIX).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</w:t>`,
      's',
    ),
    `<w:t></w:t>$1<w:t>${esc(medico)}</w:t>`,
  );

  const profesor = note.profesor || '';
  xml = replaceT(xml, 'DRA. MÓNICA SANCHEZ', profesor);
  xml = xml.replace(
    '<w:t xml:space="preserve"> _____</w:t>',
    '<w:t xml:space="preserve"> </w:t>',
  );

  files['word/document.xml'] = Buffer.from(xml, 'utf-8');
  return packDocxBuffer(files, names);
}

module.exports = {
  generateNoteBuffer,
  ORIG_INTERR,
  ORIG_EVOL_LINES,
};
