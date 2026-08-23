import {
  extraerConRango,
  extraerConRangoSuero,
  extraerIndiceAterogenico_,
  fmtLabRanged_,
  toNum_,
} from './labs-extract.mjs';
import { ageYearsFromLabDemographics, computeEgfrCkdEpi2021Creatinine } from './labs-egfr.mjs';
import { QS_SOME_TREND_ORDER } from './labs-bh.mjs';
import { computeCorrectedCalcium_ } from './labs-calcium-corrected.mjs';

/** Orden ESC al consolidar varias filas del mismo día. */
var ESC_MERGE_FIELD_ORDER = ['Na', 'Cl', 'K', 'Ca', 'F', 'Mg'];

/** Orden PFHs al consolidar. */
var PFH_MERGE_FIELD_ORDER = [
  'Alb', 'AST', 'ALT', 'FA', 'GGT', 'Prot', 'BT', 'BD', 'BI', 'LDH', 'Amil',
];

var LIPASA_MERGE_FIELD_ORDER = ['Lip'];

var PAIR_VALUE_RE_ = /^(-?\d+(?:[.,]\d+)?%?)\*?$|^---$/;

export function extraerProcalcitonina_(texto) {
  var defaultRange = { valor: '---', min: 0, max: 0.05 };
  if (!texto) return defaultRange;
  var t = texto.toUpperCase();
  var positions = [];
  var start = 0;
  while (true) {
    var p = t.indexOf('PROCALCITONINA', start);
    if (p === -1) break;
    positions.push(p);
    start = p + 'PROCALCITONINA'.length;
  }
  if (!positions.length) return defaultRange;
  for (var i = positions.length - 1; i >= 0; i--) {
    var pos = positions[i] + 'PROCALCITONINA'.length;
    var sub = texto.substring(pos, pos + 220);
    var mVal = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mVal) continue;
    var valor = mVal[1];
    var rangeM = sub.match(/ADULTO[^0-9<]*<\s*=?\s*(\d+[.,]?\d*)/i);
    var max = rangeM ? parseFloat(rangeM[1].replace(',', '.')) : 0.05;
    return { valor: valor, min: 0, max: max };
  }
  return defaultRange;
}

function fmtSuero_(data, fieldKey, priorRefs) {
  return fmtLabRanged_(data, fieldKey, priorRefs);
}

function appendQsPair_(p, key, val) {
  if (val !== '---') p.push(key, val);
}

function appendBunCrRatioIfEligible_(p, bunVal, crVal) {
  var bunNum = toNum_(bunVal);
  var crNum = toNum_(crVal);
  if (bunNum == null || crNum == null || crNum <= 0) return;
  p.push('BUN/CR', (Math.round((bunNum / crNum) * 10) / 10).toFixed(1));
}

function appendEgfrIfEligible_(p, crData, patientCtx) {
  if (!patientCtx) return;
  var ageY = ageYearsFromLabDemographics(patientCtx.edad, patientCtx.edadUnidad);
  var sexo = patientCtx.sexo;
  if (ageY == null || ageY < 18 || (sexo !== 'M' && sexo !== 'F')) return;
  var scrNum = toNum_(crData.valor);
  if (scrNum == null || scrNum <= 0) return;
  var egfr = computeEgfrCkdEpi2021Creatinine(scrNum, ageY, sexo === 'F');
  if (egfr != null) p.push('eTFG', String(Math.round(egfr)));
}

function extractQsFormatted_(texto, priorRefs) {
  var crData = extraerConRangoSuero(['CREATININA EN SANGRE', 'CREATININA'], texto);
  return {
    Glu: fmtSuero_(extraerConRangoSuero(['GLUCOSA EN SANGRE', 'GLUCOSA EN', 'GLUCOSA'], texto), 'Glu', priorRefs),
    crData: crData,
    Cr: fmtSuero_(crData, 'Cr', priorRefs),
    BUN: fmtSuero_(
      extraerConRangoSuero(['NITROGENO DE LA UREA EN SANGRE', 'NITROGENO DE LA UREA', 'UREA'], texto),
      'BUN',
      priorRefs
    ),
    PCR: fmtSuero_(extraerConRangoSuero(['PROTEINA C REACTIVA', 'PROTEÍNA C REACTIVA'], texto), 'PCR', priorRefs),
    PCT: fmtSuero_(extraerProcalcitonina_(texto), 'PCT', priorRefs),
    AU: fmtSuero_(extraerConRangoSuero(['ACIDO URICO EN SANGRE', 'ACIDO URICO', 'ÁCIDO ÚRICO'], texto), 'AU', priorRefs),
    COL: fmtSuero_(extraerConRangoSuero(['COLESTEROL'], texto), 'COL', priorRefs),
    HDL: fmtSuero_(extraerConRangoSuero(['COLESTEROL HDL', 'HDL COLESTEROL'], texto), 'HDL', priorRefs),
    LDL: fmtSuero_(extraerConRangoSuero(['COLESTEROL LDL', 'LDL COLESTEROL'], texto), 'LDL', priorRefs),
    VLDL: fmtSuero_(extraerConRangoSuero(['VLDL'], texto), 'VLDL', priorRefs),
    TGL: fmtSuero_(extraerConRangoSuero(['TRIGLICERIDOS', 'TRIGLICÉRIDOS'], texto), 'TGL', priorRefs),
    IA: fmtSuero_(extraerIndiceAterogenico_(texto), 'IA', priorRefs),
    CTHDL: fmtSuero_(
      extraerConRangoSuero(['COCIENTE COL.TOT/HDL', 'COCIENTE COL.TOT / HDL', 'COCIENTE COL TOT/HDL'], texto),
      'CTHDL',
      priorRefs
    ),
    VSG: fmtSuero_(extraerConRangoSuero(['VSG ', 'VELOCIDAD DE SEDIMENTACION'], texto), 'VSG', priorRefs),
    CPK: fmtSuero_(
      extraerConRangoSuero(
        [
          'CPK CREATIN FOSFO QUINASA',
          'CPK CREATINA FOSFOQUINASA',
          'CREATINA FOSFOQUINASA',
          'CREATIN FOSFO QUINASA',
          'CREATINA KINASA',
          'CK TOTAL',
          'CPK TOTAL',
          'CPK ',
          // No usar 'CK ' solo: coincide con «SHOCK» en ubicación.
        ],
        texto
      ),
      'CPK',
      priorRefs
    ),
  };
}

export function parseQS_(texto, patientCtx, priorRefs) {
  var q = extractQsFormatted_(texto, priorRefs);
  var vals = [
    q.Glu, q.Cr, q.BUN, q.PCR, q.PCT, q.AU,
    q.COL, q.HDL, q.LDL, q.VLDL, q.TGL, q.IA, q.CTHDL,
    q.VSG, q.CPK,
  ];
  if (vals.every(function (v) {
    return v === '---';
  })) {
    return '';
  }

  var p = ['QS'];
  appendQsPair_(p, 'Glu', q.Glu);
  if (q.Cr !== '---') {
    p.push('Cr', q.Cr);
    appendEgfrIfEligible_(p, q.crData, patientCtx);
  }
  appendQsPair_(p, 'BUN', q.BUN);
  if (q.Cr !== '---' && q.BUN !== '---') appendBunCrRatioIfEligible_(p, q.BUN, q.Cr);
  appendQsPair_(p, 'PCR', q.PCR);
  appendQsPair_(p, 'PCT', q.PCT);
  appendQsPair_(p, 'AU', q.AU);
  appendQsPair_(p, 'COL', q.COL);
  appendQsPair_(p, 'HDL', q.HDL);
  appendQsPair_(p, 'LDL', q.LDL);
  appendQsPair_(p, 'VLDL', q.VLDL);
  appendQsPair_(p, 'TGL', q.TGL);
  appendQsPair_(p, 'IA', q.IA);
  appendQsPair_(p, 'CTHDL', q.CTHDL);
  appendQsPair_(p, 'VSG', q.VSG);
  appendQsPair_(p, 'CPK', q.CPK);
  return p[0] + '\t' + p.slice(1).join(' ');
}

export function parseESC_(texto, priorRefs) {
  var naData = extraerConRangoSuero(['SODIO'], texto);
  if (naData.valor === '---') return '';
  var clData = extraerConRangoSuero(['CLORO'], texto);
  var kData  = extraerConRangoSuero(['POTASIO'], texto);
  var caData = extraerConRangoSuero(['CALCIO EN SUERO','CALCIO'], texto);
  var fData  = extraerConRangoSuero(['FOSFORO EN SANGRE','FOSFORO','FÓSFORO'], texto);
  var mgData = extraerConRangoSuero(['MAGNESIO'], texto);
  var albData = extraerConRangoSuero(['ALBUMINA'], texto);

  var Na = fmtLabRanged_(naData, 'Na', priorRefs);
  var Cl = fmtLabRanged_(clData, 'Cl', priorRefs);
  var K  = fmtLabRanged_(kData, 'K', priorRefs);
  var Ca = fmtLabRanged_(caData, 'Ca', priorRefs);
  var cCa = computeCorrectedCalcium_(caData.valor, albData.valor);
  var F  = fmtLabRanged_(fData, 'F', priorRefs);
  var Mg = fmtLabRanged_(mgData, 'Mg', priorRefs);

  var p = ['ESC'];
  p.push('Na', Na);
  if (Cl !== '---') p.push('Cl', Cl);
  if (K  !== '---') p.push('K',  K);
  if (Ca !== '---') p.push('Ca', Ca);
  if (cCa !== '---') p.push('cCa', cCa);
  if (F  !== '---') p.push('F',  F);
  if (Mg !== '---') p.push('Mg', Mg);
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parsePFH_(tNorm, priorRefs) {
  var albData  = extraerConRangoSuero(['ALBUMINA'], tNorm);
  var astData  = extraerConRango(['AST(ASPARTATO AMINOTRANSFERASA)','AST '], tNorm);
  var altData  = extraerConRango(['ALT ALANIN AMINO TRANSFERASA','ALT '], tNorm);
  var alpData  = extraerConRango(['ALP FOSFATASA ALCALINA','FOSFATASA ALCALINA'], tNorm);
  var ggtData  = extraerConRango(['GGT', 'GAMA GLUTAMIL TRANSFERASA', 'GAMMA GLUTAMIL TRANSFERASA'], tNorm);
  var protData = extraerConRangoSuero(['PROTEINAS TOTALES', 'PROTEÍNAS TOTALES'], tNorm);
  var btData   = extraerConRango(['BILIRRUBINA TOTAL'], tNorm);
  var bdData   = extraerConRango(['BILIRRUBINA DIRECTA'], tNorm);
  var biData   = extraerConRango(['BILIRRUBINA INDIRECTA'], tNorm);
  var ldhData  = extraerConRango(
    ['LDH DESHIDROGENASA LACTICA', 'LDH DESHIDROGENASA LAC', 'LDH '],
    tNorm
  );
  var amilData = extraerConRango(['AMILASA SERICA','AMILASA'], tNorm);

  var Alb  = fmtLabRanged_(albData, 'Alb', priorRefs);
  var AST  = fmtLabRanged_(astData, 'AST', priorRefs);
  var ALT  = fmtLabRanged_(altData, 'ALT', priorRefs);
  var FA   = fmtLabRanged_(alpData, 'FA', priorRefs);
  var GGT  = fmtLabRanged_(ggtData, 'GGT', priorRefs);
  var Prot = fmtLabRanged_(protData, 'Prot', priorRefs);
  var BT   = fmtLabRanged_(btData, 'BT', priorRefs);
  var BD   = fmtLabRanged_(bdData, 'BD', priorRefs);
  var BI   = fmtLabRanged_(biData, 'BI', priorRefs);
  var LDH  = fmtLabRanged_(ldhData, 'LDH', priorRefs);
  var Amil = fmtLabRanged_(amilData, 'Amil', priorRefs);

  if ([Alb,AST,ALT,FA,GGT,Prot,BT,BD,BI,LDH,Amil].every(function(v){return v==='---';})) return '';
  var p = ['PFHs'];
  if (Alb  !== '---') p.push('Alb',  Alb);
  if (AST  !== '---') p.push('AST',  AST);
  if (ALT  !== '---') p.push('ALT',  ALT);
  if (FA   !== '---') p.push('FA',   FA);
  if (GGT  !== '---') p.push('GGT',  GGT);
  if (Prot !== '---') p.push('Prot', Prot);
  if (BT   !== '---') p.push('BT',   BT);
  if (BD   !== '---') p.push('BD',   BD);
  if (BI   !== '---') p.push('BI',   BI);
  if (LDH  !== '---') p.push('LDH',  LDH);
  if (Amil !== '---') p.push('Amil', Amil);
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parseLipasa_(texto, priorRefs) {
  var lipData = extraerConRango(['LIPASA SERICA', 'LIPASA'], texto);
  var Lip = fmtLabRanged_(lipData, 'Lip', priorRefs);
  if (Lip === '---') return '';
  return 'LIPASA\tLip ' + Lip;
}

function pairTokenScore_(val) {
  var s = String(val == null ? '' : val);
  var score = s.length;
  if (s.indexOf('*') >= 0) score += 5;
  if (/\d/.test(s)) score += 2;
  return score;
}

function ingestTabPairBody_(body, into) {
  var tokens = String(body || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    var next = tokens[i + 1];
    if (!label || next == null) {
      i += 1;
      continue;
    }
    if (!PAIR_VALUE_RE_.test(next)) {
      i += 1;
      continue;
    }
    var key = String(label).replace(/:$/, '');
    var score = pairTokenScore_(next);
    var prev = into[key];
    if (!prev || score > prev.score) into[key] = { val: next, score: score };
    i += 2;
  }
}

/**
 * Une filas tabulares Label/valor del mismo panel (p. ej. varias QS del día).
 * Conserva analitos de solicitudes distintas (CPK + química básica, etc.).
 * @param {unknown[]} rows
 * @param {RegExp} sectionRe — ancla de sección al inicio (sin flags g)
 * @param {string[]} [preferredOrder]
 * @returns {string}
 */
export function mergeTabPairResLabRows_(rows, sectionRe, preferredOrder) {
  var list = (rows || [])
    .map(function (r) {
      return String(r == null ? '' : r).trim();
    })
    .filter(function (s) {
      return s && sectionRe.test(s);
    });
  if (!list.length) return '';
  if (list.length === 1) return list[0];

  var header = list[0].split(/\t/)[0] || list[0].split(/\s/)[0] || '';
  var byKey = Object.create(null);
  list.forEach(function (row) {
    var tab = row.indexOf('\t');
    var body = tab >= 0 ? row.slice(tab + 1) : row.replace(sectionRe, '').trim();
    if (tab >= 0) header = row.slice(0, tab).trim() || header;
    ingestTabPairBody_(body, byKey);
  });

  var keys = Object.keys(byKey);
  if (!keys.length) return list[list.length - 1];

  var order = preferredOrder || [];
  var rank = Object.create(null);
  order.forEach(function (k, i) {
    rank[k] = i;
  });
  keys.sort(function (a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a) ? rank[a] : 9999;
    var rb = Object.prototype.hasOwnProperty.call(rank, b) ? rank[b] : 9999;
    if (ra !== rb) return ra - rb;
    return String(a).localeCompare(String(b), 'es');
  });

  var parts = [];
  keys.forEach(function (k) {
    parts.push(k, byKey[k].val);
  });
  return header + '\t' + parts.join(' ');
}

/** Une varias filas QS (química) al consolidar el mismo día. */
export function mergeQsResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^QS\b/i, QS_SOME_TREND_ORDER);
}

/** Une varias filas ESC al consolidar. */
export function mergeEscResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^ESC\b/i, ESC_MERGE_FIELD_ORDER);
}

/** Une varias filas PFHs al consolidar. */
export function mergePfhResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^PFHS?\b/i, PFH_MERGE_FIELD_ORDER);
}

/** Une varias filas LIPASA al consolidar. */
export function mergeLipasaResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^LIPASA\b/i, LIPASA_MERGE_FIELD_ORDER);
}

