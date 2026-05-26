/** @param {{ weightKg: number, mgPerKg: number, label?: string }} p */
export function calcVancoDose(p) {
  var w = Number(p.weightKg);
  var mgKg = Number(p.mgPerKg);
  var totalMg = Math.round(w * mgKg);
  var volumeCc = Math.round(totalMg / 5);
  var copyLine =
    'Vancomicina ' + totalMg + ' mg diluir en ' + volumeCc +
    ' cc glucosado 5% para 2 h cada 12 h';
  return { totalMg, volumeCc, copyLine };
}

/** @param {{ weightKg: number, bicPx: number }} p */
export function calcBicHuBalanceada(p) {
  var meq = (24 - Number(p.bicPx)) * Number(p.weightKg) * 0.3 / 8.5;
  var rounded = Math.round(meq);
  var third = Math.round(rounded / 3);
  return {
    meqTotal: rounded,
    thirds: [
      { phase: 'bolo', meq: third, note: 'Sin diluir' },
      { phase: '4h', meq: third, note: 'Diluido balanceada HU' },
      { phase: '24h', meq: third, note: 'Infusión titular 24 h' },
    ],
    copyLine: 'Balanceada HU total ~' + rounded + ' mEq (3 tercios: ' + third + '/' + third + '/' + third + ')',
  };
}

/** @param {{ litersRemoved: number }} p */
export function calcAlbuminParacentesis(p) {
  var L = Number(p.litersRemoved);
  var grams = Math.round(L * 8);
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
    var vol = Math.round(Number(p.weightKg) * 3);
    return { volumeCc: vol, copyLine: 'Hipertónica: pasar ' + vol + ' cc (3 cc/kg)' };
  }
  return { volumeCc: 100, copyLine: 'Hipertónica: 100 cc SS 0.9% + 3 amp NaCl 17.7% en 20 min' };
}

/** @param {{ weightKg: number, unitsPerKgPerHour: number }} p */
export function calcInsulinUnitsPerHour(p) {
  var u = Number(p.weightKg) * Number(p.unitsPerKgPerHour);
  var rounded = Math.round(u * 10) / 10;
  return {
    unitsPerHour: rounded,
    copyLine: 'Insulina regular ' + p.unitsPerKgPerHour + ' U/kg/h → ' + rounded + ' U/h',
  };
}

/** @param {{ weightKg: number }} p */
export function calcLevetiracetamLoad(p) {
  var mg = Math.round(Number(p.weightKg) * 60);
  return { totalMg: mg, copyLine: 'Levetiracetam ' + mg + ' mg (60 mg/kg) en 100 cc SS 0.9%' };
}

/** @param {{ weightKg: number, drug: 'midazolam'|'propofol'|'dexmed' }} p */
export function calcSedationMgPerHour(p) {
  var w = Number(p.weightKg);
  var drug = String(p.drug || 'midazolam').toLowerCase();

  if (drug === 'propofol') {
    var minMcgKgMin = 20;
    var maxMcgKgMin = 40;
    var mgMin = Math.round(w * minMcgKgMin * 0.06 * 10) / 10;
    var mgMax = Math.round(w * maxMcgKgMin * 0.06 * 10) / 10;
    return {
      drug,
      mgPerHourMin: mgMin,
      mgPerHourMax: mgMax,
      rangeText: '20–40 mcg/kg/min (no diluir)',
      copyLine:
        'Propofol ' + minMcgKgMin + '–' + maxMcgKgMin + ' mcg/kg/min (~' + mgMin + '–' + mgMax +
        ' mg/h). No diluir. Permitir titular.',
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
        'Dexmedetomidina 0.2–0.7 mcg/kg/h (~' + dexMin + '–' + dexMax +
        ' mg/h). IOT: 0.5 mcg/kg/h. Permitir titular.',
    };
  }

  var minMgKgH = 0.1;
  var maxMgKgH = 1.2;
  var mgPerHourMin = Math.round(w * minMgKgH * 10) / 10;
  var mgPerHourMax = Math.round(w * maxMgKgH * 10) / 10;
  return {
    drug: 'midazolam',
    mgPerHourMin,
    mgPerHourMax,
    rangeText: '0.1–1.2 mg/kg/h',
    copyLine:
      'Midazolam ' + mgPerHourMin + '–' + mgPerHourMax +
      ' mg/h (0.1–1.2 mg/kg/h). Permitir titular.',
  };
}

/** Map calculatorId → runner */
export const MANEJO_CALCULATORS = {
  'vanco-load': (inputs) => calcVancoDose({ ...inputs, mgPerKg: inputs.mgPerKg ?? 25 }),
  'vanco-maint': (inputs) => calcVancoDose({ ...inputs, mgPerKg: inputs.mgPerKg ?? 17.5 }),
  'bic-hu-balanceada': calcBicHuBalanceada,
  'albumin-paracentesis': calcAlbuminParacentesis,
  'hypertonic-volume': calcHypertonicVolume,
  'insulin-u-kg-h': calcInsulinUnitsPerHour,
  'sedation-mg-kg-h': calcSedationMgPerHour,
  'levetiracetam-load': calcLevetiracetamLoad,
};
