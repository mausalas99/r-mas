import { extraerConRango, extraerConRangoSuero, toNum_ } from './labs-extract.mjs';
import { labSectionKey_ } from './labs-gaso-section.mjs';
import {
  emptyCitoquimicoFields_,
  scanCitoquimicoLine_,
  citoquimicoFieldsEmpty_,
  buildCitoquimicoParts_,
  CITO_DEPT_HEADER_RE_,
} from './labs-citoquimico-scan.mjs';
import {
  citoquimicoTipoFingerprintFromLine_,
  getCitoquimicoTipoOverride,
} from './labs-citoquimico-tipo-override.mjs';
import { parseFluidLeu_, parsePmnField_ } from './labs-fluid-interpret-values.mjs';

/**
 * Frontera de "otro reporte" tras UNA aparición de "CITOQUIMICO DE LIQUIDOS
 * CORPORALES": el separador "\n\n---\n\n" que el merge de varios envíos del
 * mismo día inserta ENTRE REPORTES (ver lab-bulk-paste.mjs /
 * lab-panel-history-dedupe.mjs — siempre con línea en blanco de ambos lados),
 * o un encabezado de departamento nuevo. Ojo: un renglón "---" suelto (sin
 * línea en blanco alrededor) puede ser el valor "sin dato" de un campo dentro
 * de la MISMA tabla (p. ej. POLIMORFONUCLEARES sin porcentaje) — ese no debe
 * cortar el bloque.
 */
var CITO_NEXT_BOUNDARY_RE =
  /\n\n\s*---\s*\n\n|\n\n\s*(?:QUIMICA\s+CLINICA|BIOMETRIA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|BACTERIOLOGIA)\b/i;

/**
 * Entre las dos apariciones legítimas de "CITOQUIMICO DE LIQUIDOS CORPORALES"
 * de UN mismo estudio (sub-tabla de química + sub-tabla de bacteriología) solo
 * debe haber, a lo sumo, el encabezado "BACTERIOLOGIA" y/o el separador "---"
 * que junta envíos del mismo día — nunca OTRO departamento. Si "Actualizar
 * labs" intercala un envío ajeno (p. ej. Química Sanguínea de otra solicitud)
 * entre las dos mitades del citoquímico, esa pareja no es válida: tomar todo
 * lo de en medio arrastraría valores séricos ajenos hacia los campos del
 * citoquímico (Glu/Prot/LDH quedarían con el valor sérico, no el del líquido).
 * En ese caso se descarta la pareja y se prueba con la siguiente aparición —
 * o, si no hay otra, se acota solo desde la aparición que quede.
 */
var OTHER_DEPT_BETWEEN_CITO_PAIR_RE =
  /\b(?:QUIMICA\s+CLINICA|BIOMETRIA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|ELECTROLITOS|PFH|COAGULACION|URIANALISIS|EXAMEN\s+GENERAL\s+DE\s+ORINA|CUADERNILLO)\b/i;

function boundCitoquimicoOccurrence_(t, u, idx, key) {
  var stop = u.substring(idx + key.length).search(CITO_NEXT_BOUNDARY_RE);
  return stop === -1 ? t.substring(idx) : t.substring(idx, idx + key.length + stop);
}

export function bloqueCitoquimicoLiquidosFull(textoBruto) {
  var t = textoBruto.replace(/\r/g, '');
  var u = t.toUpperCase();
  var key = 'CITOQUIMICO DE LIQUIDOS CORPORALES';
  var occ = [];
  for (var p = u.indexOf(key); p !== -1; p = u.indexOf(key, p + key.length)) occ.push(p);
  if (!occ.length) return '';
  var i0 = occ[0];
  var i2 = -1;
  for (var k = 1; k < occ.length; k++) {
    var gap = u.substring(i0 + key.length, occ[k]);
    if (!OTHER_DEPT_BETWEEN_CITO_PAIR_RE.test(gap)) {
      i2 = occ[k];
      break;
    }
    i0 = occ[k]; // el hueco trae otro reporte de por medio — no es pareja de i0
  }
  if (i2 === -1) return boundCitoquimicoOccurrence_(t, u, i0, key);
  var stop2 = u.substring(i2 + key.length).search(CITO_NEXT_BOUNDARY_RE);
  var end = stop2 === -1 ? t.length : i2 + key.length + stop2;
  return t.substring(i0, end);
}

/** Próximo encabezado de departamento tras un bloque CITOQUIMICO (cualquier fluido). */
var CITOQUIMICO_BLOCK_STOP_RE =
  /\n+\s*(?:QUIMICA\s+CLINICA|BIOMETRIA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA|BACTERIOLOGIA|ELECTROLITOS|PFH|COAGULACION|URIANALISIS|EXAMEN\s+GENERAL\s+DE\s+ORINA|CUADERNILLO)\b/i;
var CITOQUIMICO_BLOCK_RE = new RegExp(
  'CITOQUIMICO\\b[\\s\\S]*?(?=' + CITOQUIMICO_BLOCK_STOP_RE.source + '|$)',
  'gi'
);

/**
 * Todo bloque "CITOQUIMICO ..." del reporte — LCR, líquidos corporales, o
 * cualquier fluido no contemplado hoy (sinovial, pericárdico…) — acotado por
 * el siguiente encabezado de departamento. A diferencia de
 * bloqueCitoquimicoLiquidosFull (solo "LIQUIDOS CORPORALES") y de las regex
 * específicas de LCR, esto no depende de reconocer el nombre del fluido:
 * cualquier encabezado que empiece con CITOQUIMICO cuenta. Úsalo para excluir
 * estos bloques de parsers genéricos (BH, QS, ESC, PFH) que de otro modo
 * leerían analitos de un panel de líquidos como si fueran suyos.
 */
export function citoquimicoBlocksNormText_(textoBruto) {
  var t = String(textoBruto || '').replace(/\r/g, '');
  var matches = t.match(CITOQUIMICO_BLOCK_RE) || [];
  return matches.map(function (b) {
    return b.replace(/\s+/g, ' ');
  });
}

/** mg/dL del laboratorio → g/dL para ratios (p. ej. 6000→6, 300→3). */
export function normalizarProteinasFluidoGdl_(valStr) {
  var n = toNum_(String(valStr || '').replace(/[A-Z*]$/i, ''));
  if (n == null) return null;
  if (n >= 1000) return n / 1000;
  if (n >= 100) return n / 100;
  return n;
}

export function esLiquidoPleural_(fluid, com, bloque) {
  var s = ((fluid || '') + ' ' + (com || '') + ' ' + (bloque || '')).toUpperCase();
  return /\bPLEURAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PLEURAL\b/.test(s);
}

export function esLiquidoAscitico_(fluid, com, bloque) {
  if (esLiquidoPleural_(fluid, com, bloque)) return false;
  var s = ((fluid || '') + ' ' + (com || '') + ' ' + (bloque || '')).toUpperCase();
  return (
    /\bASCIT/i.test(s) ||
    /\bPERITONEAL\b/.test(s) ||
    /\bL[IÍ]QUIDO\s+PERITONEAL\b/.test(s)
  );
}

/** GASA = Alb sérica − Alb del líquido ascítico (g/dL). */
export function computeGasaValue_(serumAlbGdl, asciticAlbGdl) {
  if (serumAlbGdl == null || asciticAlbGdl == null) return null;
  return Math.round((serumAlbGdl - asciticAlbGdl) * 100) / 100;
}

/** ≥1.1 g/dL sugiere hipertensión portal; <1.1 otras causas de ascitis. */
export function evaluarGasa_(serumAlbGdl, asciticAlbGdl) {
  var gasa = computeGasaValue_(serumAlbGdl, asciticAlbGdl);
  if (gasa == null) return '';
  var gasaStr = String(gasa);
  if (gasa >= 1.1) return 'GASA ' + gasaStr + ' (≥1.1 portal HTN)';
  return 'GASA ' + gasaStr + ' (<1.1 no portal HTN)';
}

function extraerGlucosaSuero_(textoBruto) {
  var t = serumTextWithoutCitoBlock_(textoBruto);
  if (!t) return null;
  var gluData = extraerConRangoSuero(['GLUCOSA'], t);
  return toNum_(gluData.valor);
}

/**
 * Glucosa sérica en PFHs/QS de otros envíos del mismo día.
 * @param {string[]} resLabs
 */
export function extractSerumGlucoseMgdlFromResLabs_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || '');
    var key = labSectionKey_(line);
    if (key !== 'QS' && key !== 'PFHS') continue;
    var m = line.match(/\bGlu\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (m) return toNum_(m[1]);
  }
  return null;
}

export function resolveSerumGlucoseForInterpret_(textoBruto, serumOpts) {
  var glu = extraerGlucosaSuero_(textoBruto);
  if (glu != null) return glu;
  var opts = serumOpts || {};
  var extras = opts.extraSourceTexts || [];
  for (var i = 0; i < extras.length; i++) {
    var txt = String(extras[i] || '').trim();
    if (!txt) continue;
    glu = extraerGlucosaSuero_(txt);
    if (glu != null) return glu;
  }
  var labGroups = opts.extraResLabs || [];
  for (var j = 0; j < labGroups.length; j++) {
    glu = extractSerumGlucoseMgdlFromResLabs_(labGroups[j]);
    if (glu != null) return glu;
  }
  return null;
}

/** Texto del informe sin citoquímico de líquidos (misma lógica que PFHs / QS). */
function serumTextWithoutCitoBlock_(textoBruto) {
  if (!textoBruto) return '';
  var bloqueCito = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloqueCito) return String(textoBruto);
  var tNorm = String(textoBruto).replace(/\s+/g, ' ');
  var bloqueNorm = bloqueCito.replace(/\r/g, '').replace(/\s+/g, ' ');
  return tNorm.replace(bloqueNorm, ' ');
}

function extraerAlbuminaSueroParaGasa_(textoBruto, _bloqueCito) {
  var t = serumTextWithoutCitoBlock_(textoBruto);
  if (!t) return null;
  var albData = extraerConRangoSuero(['ALBUMINA'], t);
  return toNum_(albData.valor);
}

/**
 * Albúmina sérica ya parseada en renglones PFHs (p. ej. otro envío del mismo día).
 * @param {string[]} resLabs
 */
export function extractSerumAlbuminGdlFromResLabs_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || '');
    if (labSectionKey_(line) !== 'PFHS') continue;
    var m = line.match(/\bAlb\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (m) return toNum_(m[1]);
  }
  return null;
}

/**
 * @param {string} textoBruto
 * @param {string} bloqueCito
 * @param {{ extraSourceTexts?: string[], extraResLabs?: string[][] }} [serumOpts]
 */
export function resolveSerumAlbuminForGasa_(textoBruto, bloqueCito, serumOpts) {
  var alb = extraerAlbuminaSueroParaGasa_(textoBruto, bloqueCito);
  if (alb != null) return alb;
  var opts = serumOpts || {};
  var extras = opts.extraSourceTexts || [];
  for (var i = 0; i < extras.length; i++) {
    var txt = String(extras[i] || '').trim();
    if (!txt) continue;
    alb = extraerAlbuminaSueroParaGasa_(txt, bloqueCitoquimicoLiquidosFull(txt));
    if (alb != null) return alb;
  }
  var labGroups = opts.extraResLabs || [];
  for (var j = 0; j < labGroups.length; j++) {
    alb = extractSerumAlbuminGdlFromResLabs_(labGroups[j]);
    if (alb != null) return alb;
  }
  return null;
}

export function resLabsHasAsciticFluid_(resLabs) {
  return !!(resLabs || []).some(function (row) {
    var line = String(row || '');
    return labSectionKey_(line) === 'LIQ:' && /\bASCIT|PERITONEAL/i.test(line);
  });
}

export function resLabsHasPleuralFluid_(resLabs) {
  return !!(resLabs || []).some(function (row) {
    var line = String(row || '');
    return labSectionKey_(line) === 'LIQ:' && /\bPLEURAL\b/i.test(line);
  });
}

/** Citología de líquido ascítico/peritoneal en el mismo reporte (POSITIVO/NEGATIVO). */
function extraerCitologiaAscitica_(textoBruto) {
  var t = String(textoBruto || '').toUpperCase();
  var idx = t.search(/\bCITOLOG/i);
  if (idx === -1) return null;
  var chunk = t.substring(idx, idx + 1200);
  if (!/\b(ASCIT|PERITONEAL|LIQUIDO\s+ASCIT)\b/.test(chunk)) return null;
  if (/\b(POSITIVO|MALIGN|ADENOCARCINOMA|CARCINOMA|CARCINOMATOSIS|METÁSTASIS|METASTASIS)\b/.test(chunk)) {
    return 'positive';
  }
  if (/\bNEGATIVO\b/.test(chunk)) return 'negative';
  return null;
}

/**
 * Criterios de Light: exudado si ≥1 de Prot/ProtS>0.5, LDH/LDHS>0.6, LDHpleural>2/3 ULN LDH sérica.
 * TRASUDADO solo si los tres criterios aplicables fueron evaluados y ninguno es positivo.
 */
function applyLightProtCriterion_(pleuralProtGdl, serumProtGdl, hits, details) {
  if (pleuralProtGdl == null || serumProtGdl == null || serumProtGdl <= 0) return 0;
  var r1 = pleuralProtGdl / serumProtGdl;
  if (r1 > 0.5) hits.push('prot');
  details.push('Prot ' + r1.toFixed(2) + (r1 > 0.5 ? '' : '−'));
  return 1;
}

function applyLightLdhCriterion_(pleuralLdh, serumLdh, hits, details) {
  if (pleuralLdh == null || serumLdh == null || serumLdh <= 0) return 0;
  var r2 = pleuralLdh / serumLdh;
  if (r2 > 0.6) hits.push('ldh');
  details.push('LDH ' + r2.toFixed(2) + (r2 > 0.6 ? '' : '−'));
  return 1;
}

function applyLightLdhUlnCriterion_(pleuralLdh, serumLdhUln, hits, details) {
  if (pleuralLdh == null || serumLdhUln == null || serumLdhUln <= 0) return 0;
  var umbral = (2 / 3) * serumLdhUln;
  if (pleuralLdh > umbral) hits.push('ldhUln');
  details.push('LDH>2/3' + (pleuralLdh > umbral ? '' : '−'));
  return 1;
}

export function evaluarCriteriosLight_(pleuralProtGdl, pleuralLdh, serumProtGdl, serumLdh, serumLdhUln) {
  var hits = [];
  var details = [];
  var nEval =
    applyLightProtCriterion_(pleuralProtGdl, serumProtGdl, hits, details) +
    applyLightLdhCriterion_(pleuralLdh, serumLdh, hits, details) +
    applyLightLdhUlnCriterion_(pleuralLdh, serumLdhUln, hits, details);
  if (!nEval || !details.length) return '';
  if (hits.length > 0) return 'Light EXUDADO (' + details.join(', ') + ')';
  if (nEval === 3) return 'Light TRASUDADO (' + details.join(', ') + ')';
  return 'Light TRASUDADO parcial (' + details.join(', ') + ')';
}

function extraerSueroParaLight_(textoBruto, bloqueCito) {
  var t = textoBruto || '';
  if (bloqueCito) t = t.replace(bloqueCito, ' ');
  var protData = extraerConRangoSuero(
    ['PROTEINAS TOTALES EN SANGRE', 'PROTEINAS TOTALES', 'PROTEINA TOTAL EN SANGRE', 'PROTEINAS EN SANGRE'],
    t
  );
  var ldhData = extraerConRangoSuero(['LDH DESHIDROGENASA LACTICA', 'LDH '], t);
  return {
    protGdl: normalizarProteinasFluidoGdl_(protData.valor),
    ldh: toNum_(ldhData.valor),
    ldhUln: ldhData.max != null ? ldhData.max : null,
  };
}

function normalizarRecuentoCelular_(valStr) {
  var c = String(valStr || '').replace(/\*/g, '').trim();
  if (/^\d{1,3},\d{3}$/.test(c)) return c.replace(',', '');
  return c.replace(',', '.');
}

function fmtProteinaFluido_(valStr) {
  var g = normalizarProteinasFluidoGdl_(valStr);
  if (g == null) return String(valStr || '').replace(/[A-Z*]$/i, '');
  var star = /[A-Z*]$/.test(String(valStr || ''));
  var s = g >= 10 ? String(Math.round(g * 10) / 10) : String(Math.round(g * 100) / 100);
  return s + (star ? '*' : '');
}

function buildLightPleural_(bloque, pleuralProtRaw, pleuralLdhRaw, textoBruto) {
  var pleuralProt = normalizarProteinasFluidoGdl_(pleuralProtRaw);
  var pleuralLdh = toNum_(pleuralLdhRaw);
  if (pleuralProt == null && pleuralLdh == null) return '';

  var suero = extraerSueroParaLight_(textoBruto, bloque);
  var ldhUln = suero.ldhUln;
  if (ldhUln == null && bloque) {
    var ldhRef = extraerConRango(['LDH DESHIDROGENASA LACTICA', 'LDH '], bloque);
    if (ldhRef.max != null) ldhUln = ldhRef.max;
  }

  return evaluarCriteriosLight_(pleuralProt, pleuralLdh, suero.protGdl, suero.ldh, ldhUln);
}

/**
 * Citoquímico de líquidos corporales (ascitis, pleural, peritoneal, etc.).
 * No confundir con LCR (parsearLCR).
 */
export function parseCitoquimicoLiquidosParsed(textoBruto, serumOpts) {
  var bloque = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloque) return { line: '', esAscitico: false };
  var lineas = bloque.split(/\r?\n/).map(function(l) { return l.trim(); });
  var fields = emptyCitoquimicoFields_();
  for (var i = 0; i < lineas.length; i++) {
    var lin = lineas[i];
    scanCitoquimicoLine_(fields, lineas, i, lin, lin.toUpperCase(), normalizarRecuentoCelular_);
  }
  if (!fields.fluid && fields.com && !CITO_DEPT_HEADER_RE_.test(fields.com)) fields.fluid = fields.com;
  if (!fields.fluid && esLiquidoPleural_(fields.fluid, fields.com, bloque)) fields.fluid = 'LIQUIDO PLEURAL';

  if (citoquimicoFieldsEmpty_(fields)) {
    return { line: '', esAscitico: false };
  }

  var esPleural = esLiquidoPleural_(fields.fluid, fields.com, bloque);
  var esAscitico = esLiquidoAscitico_(fields.fluid, fields.com, bloque);
  var leuNum = parseFluidLeu_(fields.leu);
  var pmnInfo = parsePmnField_(fields.pmn, leuNum);
  var lightTxt = esPleural ? buildLightPleural_(bloque, fields.prot, fields.ldh, textoBruto) : '';
  var gasaVal = null;
  var serumAlb = null;
  var asciticAlb = null;
  if (esAscitico && fields.alb) {
    asciticAlb = toNum_(fields.alb);
    serumAlb = resolveSerumAlbuminForGasa_(textoBruto, bloque, serumOpts);
    gasaVal = computeGasaValue_(serumAlb, asciticAlb);
  }

  var p = buildCitoquimicoParts_(fields, { fmtProteinaFluido: fmtProteinaFluido_, gasaVal: gasaVal });
  var tipoFingerprint = citoquimicoTipoFingerprintFromLine_(p[0] + '\t' + p.slice(1).join(' '));
  var tipoOverride = getCitoquimicoTipoOverride(tipoFingerprint);
  if (tipoOverride && tipoOverride !== fields.fluid) {
    fields.fluid = tipoOverride;
    p = buildCitoquimicoParts_(fields, { fmtProteinaFluido: fmtProteinaFluido_, gasaVal: gasaVal });
  }
  return {
    line: p[0] + '\t' + p.slice(1).join(' '),
    tipoFingerprint: tipoFingerprint,
    esAscitico: esAscitico,
    esPleural: esPleural,
    alb: asciticAlb,
    serumAlb: serumAlb,
    gasaVal: gasaVal,
    protGdl: normalizarProteinasFluidoGdl_(fields.prot),
    tgl: toNum_(fields.tgl),
    amil: toNum_(fields.amil),
    citologia: extraerCitologiaAscitica_(textoBruto),
    lightTxt: lightTxt,
    leu: leuNum,
    pmnInfo: pmnInfo,
    glu: toNum_(fields.glu),
    pH: toNum_(fields.pH),
    gram: fields.gram || '',
  };
}

export function parsearCitoquimicoLiquidos(textoBruto, serumOpts) {
  return parseCitoquimicoLiquidosParsed(textoBruto, serumOpts).line;
}

export {
  parseFisicoquimicoHeces_,
  parseFrotisSangre_,
  parsePlaquetasCitrato_,
  parseSerologiaBancoSangre_,
  parseCuantOrina_,
  parseElectrolitosOrina_,
} from './labs-fluidos-misc.mjs';

