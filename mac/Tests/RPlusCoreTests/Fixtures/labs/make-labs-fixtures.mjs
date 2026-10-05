/**
 * Makes the lab-paste parity fixtures. Node (real parser) is the oracle.
 * Writes <name>.input.txt and <name>.expected.json next to this file.
 * All names, ids and values are invented. Never put real patient data here.
 *
 * Refresh after any Node lab-parser change:
 *   ELECTRON_RUN_AS_NODE=1 /Users/mauriciosalas/R+/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron \
 *     mac/Tests/RPlusCoreTests/Fixtures/labs/make-labs-fixtures.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const js = resolve(here, '../../../../../packages/core/public/js');
const { procesarLabs, parseCultivo_, parsearCitoquimicoLiquidos, parsearLCR, parseExtendedLabPanels_ } =
  await import(`${js}/labs.js`);
const { parseGaso_, parsePIE_, parseBH_, parseQS_, parseESC_, parsePFH_, parseLipasa_, parseTroponina_, buildEgfrPatientCtx } = await import(`${js}/labs.js`);
const { citoquimicoBlocksNormText_ } = await import(`${js}/labs-fluidos.mjs`);
const { parseSomeReportTables } = await import(`${js}/labs-some-table.mjs`);
const { splitBulkLabTextByPatient, dedupeConsolidatedLabRows } = await import(`${js}/lab-bulk-paste.mjs`);

const T = 'Estudio\t\tResultado\tUnidades\tValor de Referencia\n';
const hdr = (exp, name, when, sexo = 'MASCULINO', edad = '54', ubic = 'SALA INVENTADA') =>
  `Expediente:\t${exp}\tSolicitud:\t26${exp.replace(/\D/g, '')}\n` +
  `Nombre:\t${name}\tFecha Registro:\t${when}\n` +
  `Sexo:\t${sexo}\tUbicación:\t${ubic}\n` +
  `Edad:\t${edad}\tMedico:\tFICTICIO SINTETICO EJEMPLO B\n\n`;
/** Portal layout, one analyte per block: name, flag line, value, "unit<TAB>ref". flag '' = normal. */
const row = (name, flag, value, unit, ref) =>
  `${name}\t\n${flag || '*'}\n${value === '' ? '' : value + '\n'}${unit}\t${ref}\n`;
/** Same row in the one-line layout the tour demo uses. Parses for procesarLabs, not for the tables view. */
const rowL = (name, flag, value, unit, ref) => `${name}\t\t${flag}\t${value}\t${unit}\t${ref}\n`;
const num = (title, name, flag, value, unit, ref) => `${title}\n${T}${row(name, flag, value, unit, ref)}`;

const bhNormal =
  'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + T +
  row('RBC', '', '4.62', 'M/uL', '4.04 - 6.13') + row('HGB', '*', '13.9', 'g/dL', '12.20 - 18.10') +
  row('HCT', '*', '41.2', '%', '37.7 - 53.7') + row('MCV', '*', '89', 'fL', '80 - 97') +
  row('MCH', '*', '30.1', 'pg', '27.0 - 31.2') + row('MCHC', '*', '33.7', 'g/dL', '29.9 - 34.2') +
  row('RDW', '*', '13.5', '%', '11.6 - 14.8') + row('WBC', '*', '7.30', 'K/uL', '4.00 - 11.00') +
  row('NEU', '*', '4.40', 'K/uL', '2.00 - 6.90') + row('NEU%', '*', '60.3', '%', '37.0 - 80.0') +
  row('LYM', '*', '2.10', 'K/uL', '0.60 - 3.40') + row('LYM%', '*', '28.8', '%', '10.0 - 50.0') +
  row('MONO', '*', '0.50', 'K/uL', '0.000 - 0.900') + row('EOS', '*', '0.20', 'K/uL', '0.000 - 0.700') +
  row('BASO', '*', '0.05', 'K/uL', '0.000 - 0.200') + row('PLT', '*', '262', 'K/uL', '142.00 - 424.00') +
  row('MPV', '*', '9.1', 'fL', '7.4 - 10.4') + '\n';

const qsNormal =
  'QUIMICA CLINICA\n' +
  num('GLUCOSA EN SANGRE', 'GLUCOSA EN SANGRE', '*', '88', 'mg/dL', '60 - 100') +
  num('NITROGENO DE LA UREA EN SANGRE', 'NITROGENO DE LA UREA EN SANGRE', '*', '14', 'mg/dL', '7 - 20') +
  num('CREATININA EN SANGRE', 'CREATININA EN SANGRE', '*', '0.9', 'mg/dL', '0.6 - 1.4') +
  num('ACIDO URICO EN SANGRE', 'ACIDO URICO EN SANGRE', '*', '5.2', 'mg/dL', '4.8 - 8.7') +
  num('COLESTEROL', 'COLESTEROL', '*', '175', 'mg/dL', '130 - 200') +
  num('TRIGLICERIDOS', 'TRIGLICERIDOS', '*', '110', 'mg/dL', '35 - 150') +
  num('CLORO', 'CLORO', '*', '103', 'mmol/L', '101.0 - 110.0') +
  num('SODIO', 'SODIO', '*', '140', 'mmol/L', '135.0 - 145.0') +
  num('POTASIO', 'POTASIO', '*', '4.1', 'mmol/L', '3.6 - 5.0') +
  num('CALCIO', 'CALCIO EN SUERO', '*', '9.2', 'mg/dL', '8.4 - 10.2') +
  num('FOSFORO EN SANGRE', 'FOSFORO', '*', '3.4', 'mg/dL', '2.5 - 4.6');

const pfh =
  num('PROTEINAS TOTALES', 'PROTEINAS TOTALES', '*', '7.1', 'g/dL', '6.1 - 7.9') +
  num('ALBUMINA', 'ALBUMINA', '*', '4.0', 'g/dL', '3.2 - 5.5') +
  num('AST(ASPARTATO AMINOTRANSFERASA)', 'AST(ASPARTATO AMINOTRANSFERASA)', '*', '24', 'UI/L', '10 - 42') +
  num('ALT ALANIN AMINO TRANSFERASA', 'ALT ALANIN AMINO TRANSFERASA', '*', '21', 'UI/L', '10 - 42') +
  num('ALP FOSFATASA ALCALINA', 'ALP FOSFATASA ALCALINA', '*', '96', 'UI/L', '38 - 126') +
  'BILIRRUBINA\n' + T +
  row('BILIRRUBINA TOTAL', '*', '0.8', 'mg/dL', '0.2 - 1.0') +
  row('BILIRRUBINA DIRECTA', '*', '0.2', 'mg/dL', '0.0 - 0.2') +
  row('BILIRRUBINA INDIRECTA', '*', '0.6', 'mg/dL', '0.2 - 0.8') +
  num('LDH DESHIDROGENASA LACTICA', 'LDH DESHIDROGENASA LACTICA', '*', '150', 'UI/L', '91 - 180') +
  num('AMILASA SERICA', 'AMILASA', '*', '60', 'U/L', '28 - 100');

const coag =
  'HEMATOLOGIA\nCOAGULACION\n' + T +
  row('TP', '*', '12.4', 'seg', '10.0 - 14.0') + row('INR', '*', '1.05', '', '0.8 - 1.2') +
  row('TTPA', 'A', '41.2', 'seg', '25.0 - 35.0') + row('FIBRINOGENO', '*', '310', 'mg/dL', '200 - 400') + '\n';

const gasoArt =
  'GASOMETRIAS\nGASOMETRIA ARTERIAL\n' + T +
  row('PH', 'B', '7.31', '', '7.35 - 7.45') + row('pCO2', 'B', '30', 'mmHg', '35 - 45') +
  row('pO2', '*', '88', 'mmHg', '80 - 100') + row('Lactato', 'A', '3.1', 'mmol/L', '0.9 - 1.9') +
  row('HCO3', 'B', '16.2', 'mmol/L', '22.0 - 26.0') + row('EX. BASE', 'B', '-8.1', 'mmol/L', '-2.0 - 2.0') +
  row('SAT 02', '*', '96', '%', '95 - 100') + '\n';

const trop = (v, w) =>
  `BANCO DE SANGRE\n\nHsTnl o Troponina I (Alta\n\nEstudio\tResultado\tUnidades\tValor de Referencia\n\n` +
  `HsTnl o Troponina I (Alta Sensibilidad)\t\n\n${v}\nINDETERMINADO\n\nng/L\t\nPositivo >= 0.00S/CO\nNegativo <= 0.00S/CO\n`;

const lf = (label, v, unit = '') => `${label}\t\n*\n${v}\n${unit ? unit + '\t\n' : ''}`;
const ego =
  'URIANALISIS\nEXAMEN GENERAL DE ORINA\n' + T +
  lf('COLOR', 'AMARILLO') + lf('ASPECTO', 'TURBIO') + lf('DENSIDAD', '1.024') + lf('PH', '6.0') +
  lf('PROTEINAS', '30', 'mg/dL') + lf('GLUCOSA', 'NEGATIVO', 'mg/dL') + lf('CETONAS', 'NEGATIVO') +
  lf('SANGRE', '25', 'Hem/uL') + lf('NITRITOS', 'POSITIVO') + lf('ESTERASA LEUCOCITARIA', '75') +
  lf('LEUCOCITOS', '20-25', '/CAMPO') + lf('ERITROCITOS', '3-5', '/CAMPO') + lf('BACTERIAS', 'ABUNDANTES') +
  lf('MOCO', 'ESCASO') + '\n';
const egoNormal =
  'URIANALISIS\nEXAMEN GENERAL DE ORINA\n' + T +
  lf('COLOR', 'AMARILLO') + lf('ASPECTO', 'CLARO') + lf('DENSIDAD', '1.015') + lf('PH', '6.0') +
  lf('PROTEINAS', 'NEGATIVO', 'mg/dL') + lf('GLUCOSA', 'NEGATIVO', 'mg/dL') + lf('NITRITOS', 'NEGATIVO') +
  lf('LEUCOCITOS', '1-2', '/CAMPO') + lf('ERITROCITOS', '0-1', '/CAMPO') + lf('BACTERIAS', 'AUSENTES') + '\n';

const cultivoUro =
  'BACTERIOLOGIA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nUROCULTIVO POR SONDA\nPRODUCTO\t\n*\n' +
  'MICROORGANISMO\t\n*\nKlebsiella pneumoniae\nCOMENTARIO:\t\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\n' +
  'CUENTA DE KASS\t\n*\n+100,000 UFC/mL\nANTIBIOGRAMA\t\n*\nCEFTRIAXONA\n>32\tESBL\n*\nCEFOXITINA\n<=8\tS\n*\nMEROPENEM\n<=1\tS\n*\n';
const cultivoHemo =
  'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\t\n*\nPERIFERICO IZQUIERDO\nMICROORGANISMO\t\n*\nStaphylococcus aureus\n' +
  'ANTIBIOGRAMA\t\n*\nOXACILINA\n<=0.25\tS\n*\nVANCOMICINA\n1\tS\n*\nCLINDAMICINA\n>=8\tR\n*\n';
const cultivoNeg =
  'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\t\n*\nCATETER NIAGARA\nMICROORGANISMO\t\n*\n';
const cultivoPoli =
  'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n*\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\n' +
  'CUENTA DE KASS\n*\n+100,000 UFC/mL\nANTIBIOGRAMA\n*\nAMPICILINA\n>8\tR\n*\nNITROFURANTOINA\n<=16\tS\n*\n' +
  'MICROORGANISMO\n*\nEnterococcus faecalis\nCOMENTARIO:\n*\nCUENTA DE KASS\n*\n+100,000 UFC/mL\nANTIBIOGRAMA\n*\nAMPICILINA\n<=2\tS\n*\nVANCOMICINA\n<=0.5\tS\n*\n';

const citoPerit = (glu, prot, ldh, rec) =>
  'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  `EXAMEN QUIMICO\t\n*\n:\nDENSIDAD\t\n*\n1.012\nPH\t\n*\n7.5\nGLUCOSA\t\n*\n${glu}\nmg/dL\t\nPROTEINAS\t\n*\n${prot}\nmg/dL\t\n` +
  `LDH\t\n*\n${ldh}\nIU/L\t\nCITOQUIMICO DE\t\n*\nLIQUIDO PERITONEAL\n\n` +
  'BACTERIOLOGIA\nCITOQUIMICO DE LIQUIDOS CORPORALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  `ASPECTO\t\n*\nTURBIO\nRECUENTO\t\nA\n${rec}\nLEUCOCITOS/MM3\t0.00 - 5.00\nPOLIMORFONUCLEARES\t\n*\nPREDOMINIO\n%\t\nLINFOCITOS\t\n*\n%\t\n` +
  'ERITROCITOS\t\n*\nESCASOS\n/mm3\t\nGRAM\t\n*\nNEGATIVO\nCOMENTARIO\t\n*\nPERITONEAL\n';
const citoPleural =
  'QUIMICA CLINICA\nCITOQUIMICO DE LIQUIDOS CORPORALES\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'EXAMEN QUIMICO\t\n*\n:\nDENSIDAD\t\n*\n1.020\nPH\t\n*\n7.4\nGLUCOSA\t\n*\n92.0\nmg/dL\t\nPROTEINAS\t\n*\n4200\nmg/dL\t\n' +
  'LDH\t\n*\n410\nIU/L\t\nCITOQUIMICO DE\t\n*\nLÍQUIDO PLEURAL\nALBUMINA\n' + T + 'ALBUMINA\t\n*\n3.1\n';
const lcr =
  'QUIMICA CLINICA\nCITOQUIMICO DE LCR\nEstudio\t\tResultado\tUnidades\tValor de Referencia\npH\t\n*\n7.4\nASPECTO\t\n*\n' +
  'RECUENTO CELULAR\t\n*\nLEUCOCITOS/mm3\t0 - 5\nPOLIMORFONUCLEARES\t\n*\n%PMN\t\nLINFOCITOS\t\n*\n%LINFOCITOS\t\nTINTA CHINA\t\n*\n' +
  'ERITROCITOS\t\n*\nCOAGLUTINACION\t\n*\nGRAM\t\n*\nGLUCOSA\t\n*\n62\nmg/dL\t45 - 80\nPROTEINAS\t\nA\n88\nmg/dL\t15 - 45\n' +
  'CLORURO\t\nA\n130.5\nmmol/L\t118.1 - 132.0\nOTROS\t\n*\n\nBACTERIOLOGIA\nCITOQUIMICO LIQ. LCR\nEstudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'LCR\t\n*\nASPECTO\t\n*\nCLARO\nRECUENTO CELULAR\t\n*\n120\nLEUCOCITOS/MM\t\nLEUCOCITOS POLIMORFONUCLEARES\t\n*\n70\n%PMN\t\n' +
  'LINFOCITOS\t\n*\n30\n%LINFOCITOS\t\nTINTA CHINA\t\n*\nNEGATIVO\nERITROCITOS\t\n*\nESCASOS CRENOZADOS\nCOAGLUTINACION\t\n*\nGRAM\t\n*\nNEGATIVO\nCOMENTARIOS\t\n*\n';

const panelsNum =
  'QUIMICA CLINICA\n' +
  num('TSH', 'TSH', '*', '2.5', 'uUI/mL', '0.4 - 4.0') + num('T4 LIBRE', 'T4 LIBRE', '*', '1.1', 'ng/dL', '0.8 - 1.8') +
  num('HEMOGLOBINA GLICOSILADA', 'HEMOGLOBINA GLICOSILADA', 'A', '7.2', '%', '4.0 - 5.6') +
  num('FERRITINA', 'FERRITINA', 'B', '12', 'ng/mL', '30 - 400') + num('GGT', 'GGT', 'A', '88', 'U/L', '0 - 55') +
  num('NT-PROBNP', 'NT-PROBNP', 'A', '850', 'pg/mL', '0 - 125') + num('CK-MB', 'CK-MB', '*', '4.2', 'ng/mL', '0 - 5.0') +
  num('COMPLEMENTO C3', 'COMPLEMENTO C3', '*', '95', 'mg/dL', '90 - 180') +
  num('OSMOLARIDAD SERICA', 'OSMOLARIDAD SERICA', '*', '291', 'mOsm/kg', '275 - 295');

const gsRep = (g, cd, ci) =>
  'BANCO DE SANGRE\n\n\nREPORTE DE GRUPO SANGUINEO RH, COOMBS DIRECTO E INDIRECTO\n\n' +
  `Estudio\tResultado\n\nGrupo Sanguineo / RH\t\n${g}\n\nCoombs Directo\t\n${cd}\n\nCoombs Indirecto\n${ci}\n`;
const serolog = gsRep('O NEGATIVO', 'NEGATIVO', 'POSITIVO 2+');
const seroNeg = gsRep('AB POSITIVO', 'NEGATIVO', 'NEGATIVO');

const A = (n) => hdr(`80000${n}-1`, `PACIENTE INVENTADO UNO${n}`, 'Oct 3 2026 7:15AM');

/** name -> { text, options?, second? } */
const inputs = {
  normal_full: { text: A(1) + bhNormal + qsNormal + pfh },
  normal_bh_only: { text: A(2) + bhNormal },
  one_line_layout: {
    text: A(30) + 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + T +
      rowL('RBC', '', '4.40', 'M/uL', '4.04 - 6.13') + rowL('HGB', 'B', '10.9', 'g/dL', '12.20 - 18.10') +
      rowL('WBC', '*', '8.10', 'K/uL', '4.00 - 11.00') + rowL('PLT', '*', '301', 'K/uL', '142.00 - 424.00') +
      'QUIMICA CLINICA\nGLUCOSA EN SANGRE\n' + T + rowL('GLUCOSA EN SANGRE', '*', '101', 'mg/dL', '60 - 100') +
      'CREATININA EN SANGRE\n' + T + rowL('CREATININA EN SANGRE', '*', '1.1', 'mg/dL', '0.6 - 1.4'),
  },
  abnormal_flags: {
    text: A(3) +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + T +
      row('HGB', 'B', '7.9', 'g/dL', '12.20 - 18.10') + row('HCT', 'B', '24.1', '%', '37.7 - 53.7') +
      row('WBC', 'A', '18.40', 'K/uL', '4.00 - 11.00') + row('PLT', 'B', '61', 'K/uL', '142.00 - 424.00') +
      'QUIMICA CLINICA\n' + num('CREATININA EN SANGRE', 'CREATININA EN SANGRE', 'A', '3.4', 'mg/dL', '0.6 - 1.4') +
      num('POTASIO', 'POTASIO', 'A', '6.2', 'mmol/L', '3.6 - 5.0') + num('SODIO', 'SODIO', 'B', '128', 'mmol/L', '135.0 - 145.0'),
  },
  odd_units: {
    text: A(4) +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + T +
      row('HGB', '*', '139', 'g/L', '122 - 181') + row('WBC', '*', '7300', '/uL', '4000 - 11000') +
      row('PLT', '*', '262000', 'x10^3/uL', '142000 - 424000') +
      'QUIMICA CLINICA\n' + num('GLUCOSA EN SANGRE', 'GLUCOSA EN SANGRE', '*', '4.9', 'mmol/L', '3.3 - 5.6') +
      num('CREATININA EN SANGRE', 'CREATININA EN SANGRE', '*', '80', 'umol/L', '53 - 124') +
      num('CALCIO', 'CALCIO EN SUERO', '*', '2.3', 'mmol/L', '2.1 - 2.55'),
  },
  missing_values: {
    text: A(5) +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + T +
      row('HGB', '*', '', 'g/dL', '12.20 - 18.10') + row('WBC', '*', '6.1', 'K/uL', '4.00 - 11.00') + row('PLT', '*', 'N/A', 'K/uL', '142.00 - 424.00') +
      'QUIMICA CLINICA\n' + num('GLUCOSA EN SANGRE', 'GLUCOSA EN SANGRE', '*', '', 'mg/dL', '60 - 100') +
      num('SODIO', 'SODIO', '*', '139', 'mmol/L', ''),
  },
  inequality_values: {
    text: A(6) +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + T + row('HGB', 'A', '<0.01', 'g/dL', '12.20 - 18.10') +
      'QUIMICA CLINICA\n' + num('CREATININA EN SANGRE', 'CREATININA EN SANGRE', '*', '> 1000', 'mg/dL', '0.7 - 1.2'),
  },
  duplicates_same_report: { text: A(7) + bhNormal + qsNormal + bhNormal + qsNormal },
  duplicates_two_days: {
    text: A(8) + bhNormal,
    second: hdr('8000008-1', 'PACIENTE INVENTADO UNO8', 'Oct 3 2026 3:40PM') +
      'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + T + row('HGB', 'B', '9.8', 'g/dL', '12.20 - 18.10') + row('PLT', '*', '240', 'K/uL', '142.00 - 424.00') + '\n' + qsNormal,
  },
  coag_panel: { text: A(9) + bhNormal + coag },
  gaso_venosa_only: {
    text: hdr('8000010-1', 'PACIENTE INVENTADO DIEZ', 'Oct 3 2026 6:43AM', 'FEMENINO', '58') +
      'GASOMETRIAS\nGASOMETRIA VENOSA PARCIAL\n' + T +
      row('PH', '*', '7.38', '', '7.32 - 7.43') + row('pCO2', 'B', '36', 'mmHg', '40 - 45') +
      row('Lactato', '*', '1.0', 'mmol/L', '0.9 - 1.9') + row('HCO3', 'B', '21.8', 'mmol/L', '24.0 - 30.0') +
      row('EX. BASE', 'B', '-3.1', 'mmol/L', '-2.0 - 2.0'),
  },
  gaso_arterial_with_qs: { text: A(11) + qsNormal + gasoArt },
  troponina_alta: {
    text: hdr('8000012-1', 'PACIENTE INVENTADO DOCE', 'Oct 3 2026 1:24PM', 'MASCULINO', '61') + trop('1840.500'),
  },
  ego_basic: { text: A(13) + ego },
  ego_normal: { text: A(28) + egoNormal },
  panels_extended: { text: A(14) + panelsNum },
  grupo_sangre: { text: A(15) + serolog },
  grupo_sangre_simple: { text: A(29) + seroNeg },
  cultivo_uro_blee: { text: hdr('8000016-1', 'PACIENTE INVENTADO DIECISEIS', 'Oct 2 2026 3:00PM') + cultivoUro },
  cultivo_hemo_positivo: { text: A(17) + cultivoHemo },
  cultivo_hemo_negativo: { text: A(18) + cultivoNeg },
  cultivo_polimicrobiano: { text: A(19) + cultivoPoli },
  cito_peritoneal: { text: hdr('8000020-1', 'PACIENTE INVENTADO VEINTE', 'Oct 3 2026 5:11PM', 'MASCULINO', '59') + citoPerit('420.0', '2800', '88', '320') },
  cito_pleural: { text: hdr('8000021-1', 'PACIENTE INVENTADO VEINTIUNO', 'Oct 3 2026 5:11PM', 'FEMENINO', '66') + citoPleural },
  cito_lcr: { text: hdr('8000022-1', 'PACIENTE INVENTADO VEINTIDOS', 'Oct 3 2026 3:06PM', 'MASCULINO', '47') + lcr },
  header_pediatric: {
    text: hdr('8000023-1', 'PACIENTE INVENTADO VEINTITRES', 'Oct 3 2026 9:15AM', 'FEMENINO', '8 meses', 'URGENCIAS PEDIATRIA'),
  },
  crlf_and_spaces: {
    text: (A(24) + bhNormal + qsNormal).replace(/\n/g, '\r\n'),
  },
  with_options: {
    text: A(25) + qsNormal,
    options: { patient: { sexo: 'F', edad: 71 }, priorRefsBySection: { QS: { Glu: [70, 99] } } },
  },
  full_mixed_day: { text: A(26) + bhNormal + coag + qsNormal + pfh + gasoArt + ego + panelsNum + cultivoUro },
  with_chart_egfr: {
    text: A(31) + bhNormal + qsNormal + pfh,
    options: { patient: { sexo: 'M', edad: 54 }, priorBhValues: { Hb: 12.1 } },
  },
  with_chart_egfr_female_elderly: {
    text: A(32) + qsNormal,
    options: { patient: { sexo: 'F', edad: '79 años' } },
  },
  bulk_two_patients: {
    text: A(27) + bhNormal + '\n--- PACIENTE ---\n' + hdr('8000028-1', 'PACIENTE INVENTADO VEINTIOCHO', 'Oct 3 2026 8:00AM', 'FEMENINO', '33') + qsNormal,
  },
};


// More cultivo shapes (adapted from labs-cultivo-from-tests.test.mjs; names and ids are invented).
const cult = (body, when = '20/07/2026 07:43:15 p. m.', exp = '0000002-2') =>
  `Expediente:\t${exp}\tSolicitud:\t9000000032\nNombre:\tPACIENTE DE PRUEBA CUATRO\tFecha Registro:\t${when}\n` +
  'Sexo:\tFEMENINO\tUbicación:\tSALA DE PRUEBA\nEdad:\t74\tMedico:\tFICTICIO SINTETICO EJEMPLO A\n' + body;
const atbRow = (n, mic, r) => `${n}\n${mic}\t${r}\n*\n`;
Object.assign(inputs, {
  cultivo_peritoneal_atb: { text: cult(
    'BACTERIOLOGIA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nLIQUIDO PERITONEAL\nPRODUCTO\t\n*\nTINCION DE GRAM\t\n*\nESCASOS BACILOS GRAM NEGATIVO\n' +
    'CALIDAD DE LA MUESTRA\t\n*\nESTADO DE CULTIVO\t\n*\n*\nMICROORGANISMO\t\n*\nPseudomonas aeruginosa\nCOMENTARIO:\t\n*\nCUENTA\t\n*\nX\nANTIBIOGRAMA\t\n*\n' +
    atbRow('CEFTAZIDIMA', '>16', 'R') + atbRow('CIPROFLOXACINA', '<=1', 'S') + atbRow('CEFEPIMA', '16', 'I') + atbRow('IMIPENEM', '2', 'S') +
    atbRow('LEVOFLOXACINA', '<=2', 'S') + atbRow('MEROPENEM', '<=1', 'S') + atbRow('PIP/TAZO', '64', 'S') + atbRow('TOBRAMICINA', '<=4', 'S') +
    'MICROORGANISMO\t\n*\nCOMENTARIO:\t\n*\nCUENTA\t\n*\n*\nIDENTIFICACION POR ESPECTROMETRIA DE MASAS (MALDI TOF)\nMICROORGANISMO\t\n*\n', '07/05/2026 04:32:46 p. m.') },
  cultivo_klebsiella_atb_completo: { text: cult(
    'BACTERIOLOGIA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nUROCULTIVO POR SONDA\nPRODUCTO\t\n*\nMICROORGANISMO\t\n*\nKlebsiella pneumoniae\nCOMENTARIO:\t\n*\n' +
    'CUENTA DE KASS\t\n*\n80,000 UFC/mL\nANTIBIOGRAMA\t\n*\n' + atbRow('AMP/SULBACTAM', '<=8/4', 'S') + atbRow('AMPICILINA', '>16', 'R') + atbRow('CEFTRIAXONA', '<=1', 'S') +
    atbRow('CEFAZOLINA', '<=2', 'S') + atbRow('CIPROFLOXACINA', '<=1', 'S') + atbRow('NITROFURANTOINA', '<=32', 'S') + atbRow('GENTAMICINA', '<=4', 'S') +
    atbRow('LEVOFLOXACINA', '<=2', 'S') + atbRow('PIP/TAZO', '<=16', 'S') + atbRow('TRIMET/SULFA', '<=2/38', 'S') +
    'LAS CUENTAS MENORES A 100,000 UFC/ML PUEDEN REPRESENTAR , CONTAMINACION DE LA MUESTRA O RESPUESTA PARCIAL AL TRATAMIENTO\nMICROORGANISMO\t\n*\nCOMENTARIO:\t\n*\nIDENTIFICACION POR ESPECTROMETRIA DE MASAS (MALDI TOF)\n') },
  cultivo_herida_atb: { text: cult(
    'BACTERIOLOGIA\nEstudio\t\tResultado\nSECRECION DE HERIDA\nPRODUCTO\t\n*\nHERIDA DE TRAQUEOSTOMIA\nMICROORGANISMO\t\n*\nPseudomonas aeruginosa\nANTIBIOGRAMA\t\n*\nCEFTAZIDIMA\n4\tS\nCIPROFLOXACINA\n<=1\tS\n', '24/05/2026 12:47:53 p. m.') },
  cultivo_micobacterias: { text:
    'Expediente:\t0000003-3\tSolicitud:\t2605250577\nNombre:\tPACIENTE DE PRUEBA CINCO\tFecha Registro:\t25/05/2026 09:37:01 a. m.\nSexo:\tMASCULINO\tUbicación:\tSERVICIO CLÍNICO 2\nEdad:\t53\tMedico:\tFICTICIO SINTETICO EJEMPLO A\n\n' +
    'MYCOBACTERIAS\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nBACILOSCOPIA DE PRODUCTOS DIVERSOS (1 MUESTRA)\n1 MUESTRA\t\n*\nNEGATIVO\nOBSERVACIONES\t\n*\nTEJIDO DE LENGUA\n' +
    'CULTIVO DE MICOBACTERIAS (POR MUESTRA)\nSECCION DE MICOBACTERIAS\t\n*\nREPORTE PRELIMINAR MOP-647-07-RC-052\nCULTIVO\t\n*\nNEGATIVO A LA FECHA.' },
  cultivo_aspirado_prelim: { text:
    'Expediente:\t0000004-4\tSolicitud:\t2605261033\nNombre:\tPACIENTE DE PRUEBA SEIS\tFecha Registro:\t26/5/2026 15:59:36\nSexo:\tMASCULINO\tUbicación:\tCIRUGIA A.C.\nEdad:\t63\tMedico:\tFICTICIO SINTETICO EJEMPLO A\n' +
    'BACTERIOLOGIA\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nASPIRADO TRAQUEAL\nPRODUCTO\t\n*\nESTADO DE CULTIVO\t\n*\nREPORTE PRELIMINAR\n*\n' +
    'MICROORGANISMO\t\n*\nAcinetobacter baumannii\nCOMENTARIO:\t\n*\nCUENTA\t\n*\n+100,000 UFC/mL\n*\nMICROORGANISMO\t\n*\nProteus mirabilis\nCOMENTARIO:\t\n*\nCUENTA\t\n*\n+100,000 UFC/mL\n*\n' +
    'MICROORGANISMO\t\n*\nCOMENTARIO:\t\n*\nCUENTA\t\n*\n*\nMICROORGANISMO\t\n*\nStenotrophomonas maltophilia\nCOMENTARIO:\t\n*\nCUENTA\t\n*\n50,000 UFC/mL\n' },
  cultivo_ndm: { text: 'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nMICROORGANISMO\nKlebsiella pneumoniae\nCOMENTARIO:\nPRODUCTOR DE NDM-1\nCUENTA DE KASS\n+10,000 UFC/mL\n' },
  cultivo_carbapenem_r: { text: 'BACTERIOLOGIA\nMICROORGANISMO\nAcinetobacter baumannii\nCOMENTARIO:\nRESISTENTE A CARBAPENEMICOS\n' },
  cultivo_catetero_punta: { text: 'BACTERIOLOGIA\nCATETER\nPRODUCTO\t\n*\nPUNTA CVC\nMICROORGANISMO\t\n*\nPseudomonas aeruginosa\n' },
});


/** Same block cut as labs-procesar.mjs segmentLabReportBlocks_. Feeds the Base (gaso) unit test. */
function gasoInputs(textoBruto) {
  const tNorm = textoBruto.replace(/\s+/g, ' ');
  const mGaso = tNorm.match(/GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA|$)/i);
  const bloqueGaso = mGaso ? mGaso[0] : '';
  const mEGO = tNorm.match(/(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i);
  const bloqueEGO = mEGO ? mEGO[0] : '';
  const mHeces = tNorm.match(/(?:PARASITOLOGIA|FISICOQUIMICO DE HECES).*?(?=HEMATOLOGIA|BIOMETRIA|QUIMICA CLINICA|GASOMETRIA|URIANALISIS|BACTERIOLOGIA|CULTIVO|COAGULACION|$)/i);
  const bloqueHeces = mHeces ? mHeces[0] : '';
  let t = tNorm;
  for (const b of citoquimicoBlocksNormText_(textoBruto)) t = t.replace(b, ' ');
  const textoQS = t.replace(bloqueGaso, ' ').replace(bloqueEGO, ' ').replace(bloqueHeces, ' ');
  let textoParaBh = t;
  if (bloqueEGO) textoParaBh = textoParaBh.replace(bloqueEGO, ' ');
  if (bloqueHeces) textoParaBh = textoParaBh.replace(bloqueHeces, ' ');
  return { tNorm, bloqueGaso, textoQS, textoParaBh };
}

const clean = (v) => JSON.parse(JSON.stringify(v ?? null));
for (const [name, c] of Object.entries(inputs)) {
  const text = c.text;
  const tNorm = text.replace(/\s+/g, ' ');
  const res = procesarLabs(text, c.options);
  const out = {
    options: c.options ?? null,
    procesarLabs: clean(res),
    someTables: clean(parseSomeReportTables(text)),
    bulkSplit: splitBulkLabTextByPatient(text),
    cultivo: clean(parseCultivo_(text, tNorm)),
    citoLiquidos: clean(parsearCitoquimicoLiquidos(text)),
    lcr: clean(parsearLCR(text)),
    panels: clean(parseExtendedLabPanels_(text, {})),
    core: (() => {
      const g = gasoInputs(text);
      const mEdad = text.match(/Edad:\s*([^\n\r]+)/i);
      const edadRaw = mEdad ? (mEdad[1].match(/^\d+/) || [''])[0] : '';
      let edadUnidad = mEdad ? (mEdad[1].match(/\b(años|meses|dias|días|semanas)\b/i) || ['años'])[0].toLowerCase() : 'años';
      if (edadUnidad === 'dias' || edadUnidad === 'días') edadUnidad = 'días';
      const ctx = buildEgfrPatientCtx(edadRaw, edadUnidad, c.options && c.options.patient ? c.options.patient : null);
      return { textoParaBh: g.textoParaBh, egfrCtx: clean(ctx), bh: clean(parseBH_(g.textoParaBh, null, {})), qs: clean(parseQS_(g.textoQS, ctx, null)),
        esc: clean(parseESC_(g.textoQS, null)), pfh: clean(parsePFH_(g.textoParaBh, null)), lipasa: clean(parseLipasa_(g.textoQS, null)), trop: clean(parseTroponina_(text, null)) };
    })(),
    base: (() => { const g = gasoInputs(text); return { bloqueGaso: g.bloqueGaso, textoQS: g.textoQS, gaso: clean(parseGaso_(g.bloqueGaso, g.textoQS, null)), pie: clean(parsePIE_(g.tNorm)) }; })(),
  };
  if (c.second != null) {
    out.second = procesarLabs(c.second);
    out.dedupe = dedupeConsolidatedLabRows([...res.resLabs, ...out.second.resLabs], 'labs');
    writeFileSync(`${here}/${name}.second.txt`, c.second);
  }
  writeFileSync(`${here}/${name}.input.txt`, text);
  writeFileSync(`${here}/${name}.expected.json`, JSON.stringify(out, null, 1) + '\n');
}
console.log(`wrote ${Object.keys(inputs).length} fixtures`);
