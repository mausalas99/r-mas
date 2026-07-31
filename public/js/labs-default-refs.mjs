/**
 * Rangos orientativos de laboratorio (respaldo si el reporte no trae
 * Valor de Referencia). Misma fuente que tendencias.
 */

/** @type {{ [field: string]: [number, number] }} */
export const DEFAULT_LAB_REFS = {
  Hb: [12, 17.5],
  Hto: [36, 53],
  Leu: [4, 11],
  Plt: [150, 400],
  VCM: [80, 100],
  HCM: [27, 33],
  RBC: [4.2, 5.4],
  CHCM: [31.5, 34.5],
  RDW: [11.5, 14.5],
  MPV: [7.4, 10.4],
  Neu: [1.5, 8],
  Eos: [0, 0.6],
  Lin: [0.6, 3.4],
  Mono: [0, 0.9],
  Baso: [0, 0.2],
  NeuPct: [37, 80],
  LinPct: [10, 50],
  MonoPct: [0, 12],
  EosPct: [0, 7],
  BasoPct: [0, 2.5],
  Bandas: [0, 5],
  Mielo: [0, 1],
  Metamielo: [0, 1],
  Promielo: [0, 1],
  Blastos: [0, 1],
  Atipicos: [0, 5],
  Ret: [0.5, 2.5],
  TP: [11, 14],
  TTP: [25, 35],
  INR: [0.8, 1.2],
  Fib: [150, 400],
  DD: [0, 500],
  Glu: [70, 100],
  Cr: [0.5, 1.3],
  BUN: [7, 20],
  PCR: [0, 0.5],
  PCT: [0, 0.05],
  AU: [3.5, 7],
  TGL: [0, 150],
  COL: [0, 200],
  HDL: [40, 60],
  LDL: [0, 130],
  VLDL: [2, 40],
  IA: [0, 3.22],
  CTHDL: [0, 3.1],
  CPK: [30, 200],
  Na: [136, 145],
  K: [3.5, 5.0],
  Cl: [96, 106],
  HCO3: [22, 28],
  Ca: [8.5, 10.5],
  F: [2.5, 4.5],
  Mg: [1.6, 2.6],
  AST: [10, 40],
  ALT: [7, 56],
  FA: [44, 147],
  GGT: [0, 55],
  Prot: [6, 8.3],
  BT: [0.1, 1.2],
  Alb: [3.5, 5.2],
  BD: [0, 0.3],
  BI: [0.1, 1],
  LDH: [120, 250],
  Amil: [30, 110],
  Lip: [8, 57],
  TnI1: [0, 34],
  TnI2: [0, 34],
  TSH: [0.4, 4],
  T4L: [0.8, 1.8],
  HbA1c: [4, 5.6],
  NTproBNP: [0, 125],
  Fe: [50, 170],
  Ferr: [30, 400],
  CysC: [0.5, 1],
  Vanco: [10, 20],
  B12: [200, 900],
};

/** Rangos orientativos gasometría (arterial/capilar). */
export const DEFAULT_GASO_REFS = {
  pH: [7.35, 7.45],
  pCO2: [35, 45],
  pO2: [83, 100],
  Lactato: [0.5, 2.2],
  Na: [135, 148],
  K: [3.5, 5.3],
  GLU: [70, 110],
  Hto: [34, 50],
  Bica: [22, 28],
  iCa: [1.12, 1.32],
};

function isValidRangePair_(r) {
  return r && r.length === 2 && isFinite(r[0]) && isFinite(r[1]) && r[1] > r[0];
}

/**
 * Acumula refsBySection del historial (entrada posterior gana por campo).
 * @param {Array<{ refsBySection?: object }>} history
 * @returns {{ [section: string]: { [field: string]: [number, number] } }}
 */
export function collectPriorRefsFromHistory(history) {
  var out = Object.create(null);
  if (!history || !history.length) return out;
  for (var i = 0; i < history.length; i++) {
    var refs = history[i] && history[i].refsBySection;
    if (!refs || typeof refs !== 'object') continue;
    Object.keys(refs).forEach(function (sec) {
      var row = refs[sec];
      if (!row || typeof row !== 'object') return;
      if (!out[sec]) out[sec] = Object.create(null);
      Object.keys(row).forEach(function (k) {
        var r = row[k];
        if (isValidRangePair_(r)) out[sec][k] = [r[0], r[1]];
      });
    });
  }
  return out;
}

/** @deprecated use collectPriorRefsFromHistory(history).GASES */
export function collectPriorGasRefsFromHistory(history) {
  var all = collectPriorRefsFromHistory(history);
  return all.GASES || Object.create(null);
}

/** Mezcla mapas de refs campo a campo; overlay gana. */
export function mergeRefsMap_(base, overlay) {
  var out = Object.create(null);
  if (base && typeof base === 'object') {
    Object.keys(base).forEach(function (k) {
      if (isValidRangePair_(base[k])) out[k] = [base[k][0], base[k][1]];
    });
  }
  if (overlay && typeof overlay === 'object') {
    Object.keys(overlay).forEach(function (k) {
      if (isValidRangePair_(overlay[k])) out[k] = [overlay[k][0], overlay[k][1]];
    });
  }
  return out;
}

export function mergeGasRefs_(base, overlay) {
  return mergeRefsMap_(base, overlay);
}

/**
 * Prioridad: rango del reporte → priorRefs del historial → estándar del panel.
 * @param {{ min?: number|null, max?: number|null }} data
 * @param {string} fieldKey
 * @param {{ [field: string]: [number, number] }|null|undefined} priorRefs
 * @param {{ [field: string]: [number, number] }|null|undefined} [defaults]
 * @returns {[number, number]|null}
 */
export function resolveLabFieldRange_(data, fieldKey, priorRefs, defaults) {
  if (data && isValidRangePair_([data.min, data.max])) return [data.min, data.max];
  var fromPrior = priorRefs && priorRefs[fieldKey];
  if (isValidRangePair_(fromPrior)) return [fromPrior[0], fromPrior[1]];
  var table = defaults || DEFAULT_LAB_REFS;
  var d = table[fieldKey];
  return isValidRangePair_(d) ? [d[0], d[1]] : null;
}
