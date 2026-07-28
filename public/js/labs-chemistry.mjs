import {
  extraerConRango,
  extraerConRangoSuero,
  extraerIndiceAterogenico_,
  marcarSegunRango,
  fmt,
  toNum_,
} from './labs-extract.mjs';
import { ageYearsFromLabDemographics, computeEgfrCkdEpi2021Creatinine } from './labs-egfr.mjs';
import { QS_SOME_TREND_ORDER } from './labs-bh.mjs';

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

function fmtSuero_(data) {
  return fmt(marcarSegunRango(data.valor, data.min, data.max));
}

function appendQsPair_(p, key, val) {
  if (val !== '---') p.push(key, val);
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

function extractQsFormatted_(texto) {
  var crData = extraerConRangoSuero(['CREATININA EN SANGRE', 'CREATININA'], texto);
  return {
    Glu: fmtSuero_(extraerConRangoSuero(['GLUCOSA EN SANGRE', 'GLUCOSA EN', 'GLUCOSA'], texto)),
    crData: crData,
    Cr: fmtSuero_(crData),
    BUN: fmtSuero_(
      extraerConRangoSuero(['NITROGENO DE LA UREA EN SANGRE', 'NITROGENO DE LA UREA', 'UREA'], texto)
    ),
    PCR: fmtSuero_(extraerConRangoSuero(['PROTEINA C REACTIVA', 'PROTEÍNA C REACTIVA'], texto)),
    PCT: fmtSuero_(extraerProcalcitonina_(texto)),
    AU: fmtSuero_(extraerConRangoSuero(['ACIDO URICO EN SANGRE', 'ACIDO URICO', 'ÁCIDO ÚRICO'], texto)),
    COL: fmtSuero_(extraerConRangoSuero(['COLESTEROL'], texto)),
    HDL: fmtSuero_(extraerConRangoSuero(['COLESTEROL HDL', 'HDL COLESTEROL'], texto)),
    LDL: fmtSuero_(extraerConRangoSuero(['COLESTEROL LDL', 'LDL COLESTEROL'], texto)),
    VLDL: fmtSuero_(extraerConRangoSuero(['VLDL'], texto)),
    TGL: fmtSuero_(extraerConRangoSuero(['TRIGLICERIDOS', 'TRIGLICÉRIDOS'], texto)),
    IA: fmtSuero_(extraerIndiceAterogenico_(texto)),
    CTHDL: fmtSuero_(
      extraerConRangoSuero(['COCIENTE COL.TOT/HDL', 'COCIENTE COL.TOT / HDL', 'COCIENTE COL TOT/HDL'], texto)
    ),
    VSG: fmtSuero_(extraerConRangoSuero(['VSG ', 'VELOCIDAD DE SEDIMENTACION'], texto)),
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
          'CK ',
        ],
        texto
      )
    ),
  };
}

export function parseQS_(texto, patientCtx) {
  var q = extractQsFormatted_(texto);
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

export function parseESC_(texto) {
  var naData = extraerConRangoSuero(['SODIO'], texto);
  if (naData.valor === '---') return '';
  var clData = extraerConRangoSuero(['CLORO'], texto);
  var kData  = extraerConRangoSuero(['POTASIO'], texto);
  var caData = extraerConRangoSuero(['CALCIO EN SUERO','CALCIO'], texto);
  var fData  = extraerConRangoSuero(['FOSFORO EN SANGRE','FOSFORO','FÓSFORO'], texto);
  var mgData = extraerConRangoSuero(['MAGNESIO'], texto);

  var Na = fmt(marcarSegunRango(naData.valor, naData.min, naData.max));
  var Cl = fmt(marcarSegunRango(clData.valor, clData.min, clData.max));
  var K  = fmt(marcarSegunRango(kData.valor,  kData.min,  kData.max));
  var Ca = fmt(marcarSegunRango(caData.valor, caData.min, caData.max));
  var F  = fmt(marcarSegunRango(fData.valor,  fData.min,  fData.max));
  var Mg = fmt(marcarSegunRango(mgData.valor, mgData.min, mgData.max));

  var p = ['ESC'];
  p.push('Na', Na);
  if (Cl !== '---') p.push('Cl', Cl);
  if (K  !== '---') p.push('K',  K);
  if (Ca !== '---') p.push('Ca', Ca);
  if (F  !== '---') p.push('F',  F);
  if (Mg !== '---') p.push('Mg', Mg);
  return p[0]+'\t'+p.slice(1).join(' ');
}

export function parsePFH_(tNorm) {
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

  var Alb  = fmt(marcarSegunRango(albData.valor,  albData.min,  albData.max));
  var AST  = fmt(marcarSegunRango(astData.valor,  astData.min,  astData.max));
  var ALT  = fmt(marcarSegunRango(altData.valor,  altData.min,  altData.max));
  var FA   = fmt(marcarSegunRango(alpData.valor,  alpData.min,  alpData.max));
  var GGT  = fmt(marcarSegunRango(ggtData.valor,  ggtData.min,  ggtData.max));
  var Prot = fmt(marcarSegunRango(protData.valor, protData.min, protData.max));
  var BT   = fmt(marcarSegunRango(btData.valor,   btData.min,   btData.max));
  var BD   = fmt(marcarSegunRango(bdData.valor,   bdData.min,   bdData.max));
  var BI   = fmt(marcarSegunRango(biData.valor,   biData.min,   biData.max));
  var LDH  = fmt(marcarSegunRango(ldhData.valor,  ldhData.min,  ldhData.max));
  var Amil = fmt(marcarSegunRango(amilData.valor, amilData.min, amilData.max));

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

export function parseLipasa_(texto) {
  var lipData = extraerConRango(['LIPASA SERICA', 'LIPASA'], texto);
  var Lip = fmt(marcarSegunRango(lipData.valor, lipData.min, lipData.max));
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

