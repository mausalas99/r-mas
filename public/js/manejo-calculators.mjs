import {
  requirePositiveFinite,
  clamp,
  VANCO_LOAD_MAX_MG,
  VANCO_MAINT_MAX_MG,
  MEQ_PER_AMPOULE_8_4_PCT,
  LEVETIRACETAM_LOAD_MAX_MG,
  INSULIN_MAX_U_PER_HR,
  HYPERTONIC_MAX_ML,
  ALBUMIN_MAX_GRAMS,
  PROPOFOL_MAX_MG_PER_KG_H,
} from './clinical-safety.mjs';

/** @param {{ weightKg: number, mgPerKg: number, maxMg?: number, label?: string }} p */
export function calcVancoDose(p) {
  var w = requirePositiveFinite(p.weightKg);
  var mgKg = requirePositiveFinite(p.mgPerKg);
  if (w == null || mgKg == null) return null;

  var maxMg = p.maxMg != null ? p.maxMg : VANCO_LOAD_MAX_MG;
  var rawMg = Math.round(w * mgKg);
  var totalMg = clamp(rawMg, 1, maxMg);
  var volumeCc = Math.round(totalMg / 5);
  var capNote = rawMg > maxMg ? ' (tope ' + maxMg + ' mg)' : '';
  var copyLine =
    'Vancomicina ' +
    totalMg +
    ' mg diluir en ' +
    volumeCc +
    ' cc glucosado 5% para 2 h cada 12 h' +
    capNote;
  return { totalMg, volumeCc, copyLine };
}

/** @param {{ weightKg: number, bicPx: number }} p */
export function calcBicHuBalanceada(p) {
  var w = requirePositiveFinite(p.weightKg);
  var bic = typeof p.bicPx === 'number' ? p.bicPx : Number(p.bicPx);
  if (w == null || !Number.isFinite(bic)) return null;

  var meqDeficit = (24 - bic) * w * 0.3;
  if (meqDeficit <= 0) return null;

  var rounded = Math.round(meqDeficit);
  var ampoules8_4Pct = Math.ceil(meqDeficit / MEQ_PER_AMPOULE_8_4_PCT);
  var third = Math.round(rounded / 3);
  return {
    meqTotal: rounded,
    ampoules8_4Pct,
    thirds: [
      { phase: 'bolo', meq: third, note: 'Sin diluir' },
      { phase: '4h', meq: third, note: 'Diluido balanceada HU' },
      { phase: '24h', meq: third, note: 'Infusión titular 24 h' },
    ],
    copyLine:
      'Balanceada HU total ~' +
      rounded +
      ' mEq (' +
      ampoules8_4Pct +
      ' amp 8.4%; 3 tercios: ' +
      third +
      '/' +
      third +
      '/' +
      third +
      ')',
  };
}

/** @param {{ litersRemoved: number }} p */
export function calcAlbuminParacentesis(p) {
  var L = requirePositiveFinite(p.litersRemoved);
  if (L == null) return null;
  var grams = clamp(Math.round(L * 8), 1, ALBUMIN_MAX_GRAMS);
  var ampoules20pct = Math.ceil(grams / 10);
  return {
    grams,
    ampoules20pct,
    copyLine: grams + ' g albumina (~' + ampoules20pct + ' amp 20%) tras ' + L + ' L',
  };
}

/** @param {{ weightKg?: number, useWeightRule?: boolean }} p */
export function calcHypertonicVolume(p) {
  if (p.useWeightRule && p.weightKg != null) {
    var w = requirePositiveFinite(p.weightKg);
    if (w == null) return null;
    var vol = clamp(Math.round(w * 3), 1, HYPERTONIC_MAX_ML);
    return { volumeCc: vol, copyLine: 'Hipertónica: pasar ' + vol + ' cc (3 cc/kg)' };
  }
  return { volumeCc: 100, copyLine: 'Hipertónica: 100 cc SS 0.9% + 3 amp NaCl 17.7% en 20 min' };
}

/** @param {{ weightKg: number, unitsPerKgPerHour: number }} p */
export function calcInsulinUnitsPerHour(p) {
  var w = requirePositiveFinite(p.weightKg);
  var rate = requirePositiveFinite(p.unitsPerKgPerHour);
  if (w == null || rate == null) return null;
  var u = w * rate;
  var rounded = clamp(Math.round(u * 10) / 10, 0.1, INSULIN_MAX_U_PER_HR);
  return {
    unitsPerHour: rounded,
    copyLine: 'Insulina regular ' + rate + ' U/kg/h → ' + rounded + ' U/h',
  };
}

/** @param {{ weightKg: number }} p */
export function calcLevetiracetamLoad(p) {
  var w = requirePositiveFinite(p.weightKg);
  if (w == null) return null;
  var mg = clamp(Math.round(w * 60), 1, LEVETIRACETAM_LOAD_MAX_MG);
  return { totalMg: mg, copyLine: 'Levetiracetam ' + mg + ' mg (60 mg/kg) en 100 cc SS 0.9%' };
}

/** @param {{ weightKg: number, drug: 'midazolam'|'propofol'|'dexmed' }} p */
export function calcSedationMgPerHour(p) {
  var w = requirePositiveFinite(p.weightKg);
  if (w == null) return null;
  var drug = String(p.drug || 'midazolam').toLowerCase();

  if (drug === 'propofol') {
    var minMcgKgMin = 5;
    var maxMcgKgMin = 20;
    var mgMin = Math.round(w * minMcgKgMin * 0.06 * 10) / 10;
    var mgMax = Math.round(w * maxMcgKgMin * 0.06 * 10) / 10;
    var propofolCeiling = w * PROPOFOL_MAX_MG_PER_KG_H;
    mgMax = Math.min(mgMax, propofolCeiling);
    return {
      drug,
      mgPerHourMin: mgMin,
      mgPerHourMax: mgMax,
      rangeText: '5–20 mcg/kg/min (no diluir; máx 4 mg/kg/h)',
      copyLine:
        'Propofol ' +
        minMcgKgMin +
        '–' +
        maxMcgKgMin +
        ' mcg/kg/min (~' +
        mgMin +
        '–' +
        mgMax +
        ' mg/h). No diluir. Máx 4 mg/kg/h. Permitir titular.',
    };
  }

  if (drug === 'dexmed') {
    var minMcgKgH = 0.2;
    var maxMcgKgH = 0.7;
    var dexMin = Math.round(w * minMcgKgH) / 1000;
    var dexMax = Math.round(w * maxMcgKgH) / 1000;
    return {
      drug,
      mgPerHourMin: dexMin,
      mgPerHourMax: dexMax,
      rangeText: '0.2–0.7 mcg/kg/h (IOT: 0.5 mcg/kg/h)',
      copyLine:
        'Dexmedetomidina 0.2–0.7 mcg/kg/h (~' +
        dexMin +
        '–' +
        dexMax +
        ' mg/h). IOT: 0.5 mcg/kg/h. Permitir titular.',
    };
  }

  var minMgKgH = 0.02;
  var maxMgKgH = 0.1;
  var mgPerHourMin = Math.round(w * minMgKgH * 100) / 100;
  var mgPerHourMax = Math.round(w * maxMgKgH * 100) / 100;
  return {
    drug: 'midazolam',
    mgPerHourMin,
    mgPerHourMax,
    rangeText: '0.02–0.1 mg/kg/h (50 mg en 100 cc SS0.9%)',
    copyLine:
      'Midazolam ' +
      mgPerHourMin +
      '–' +
      mgPerHourMax +
      ' mg/h (0.02–0.1 mg/kg/h). 50 mg en 100 cc SS0.9%. Permitir titular.',
  };
}

/** Map calculatorId → runner */
export const MANEJO_CALCULATORS = {
  'vanco-load': (inputs) =>
    calcVancoDose({ ...inputs, mgPerKg: inputs.mgPerKg ?? 25, maxMg: VANCO_LOAD_MAX_MG }),
  'vanco-maint': (inputs) =>
    calcVancoDose({ ...inputs, mgPerKg: inputs.mgPerKg ?? 17.5, maxMg: VANCO_MAINT_MAX_MG }),
  'bic-hu-balanceada': calcBicHuBalanceada,
  'albumin-paracentesis': calcAlbuminParacentesis,
  'hypertonic-volume': calcHypertonicVolume,
  'insulin-u-kg-h': calcInsulinUnitsPerHour,
  'sedation-mg-kg-h': calcSedationMgPerHour,
  'levetiracetam-load': calcLevetiracetamLoad,
};
