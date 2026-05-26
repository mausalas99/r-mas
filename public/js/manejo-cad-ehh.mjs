/**
 * CAD / EHH — evaluación orientativa y checklists ADA (adultos).
 */
import { computeAnionGapValue_ } from './labs.js';

export const CAD_EHH_THRESHOLDS = {
  ehhGlucoseMgDl: 500,
  cadGlucoseMgDl: 250,
  cadPh: 7.3,
  cadHco3: 18,
  ehhPhMin: 7.25,
};

function toNum(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var n = parseFloat(String(v).replace(',', '.').replace(/\*/g, '').trim());
  return isFinite(n) ? n : null;
}

function findLabValue(parsed, parsedBySection, names) {
  var list = names.map(function (n) {
    return String(n).toUpperCase();
  });
  function scan(obj) {
    if (!obj || typeof obj !== 'object') return null;
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var ku = String(k).toUpperCase();
      if (list.some(function (n) {
        return ku.indexOf(n) !== -1 || n.indexOf(ku) !== -1;
      })) {
        var v = toNum(obj[k]);
        if (v != null) return v;
      }
    }
    return null;
  }
  var v = scan(parsed);
  if (v != null) return v;
  var sections = ['QS', 'GASES', 'ESC', 'EGO'];
  for (var i = 0; i < sections.length; i++) {
    var sec = parsedBySection && parsedBySection[sections[i]];
    v = scan(sec);
    if (v != null) return v;
  }
  return null;
}

export function extractCadEhhLabs(parsed, parsedBySection) {
  var glucose =
    findLabValue(parsed, parsedBySection, ['GLUCOSA', 'GLUCOSA EN SANGRE']) ||
    findLabValue(parsed, parsedBySection, ['GLU']);
  var ph = findLabValue(parsed, parsedBySection, ['PH', 'PH ARTERIAL']);
  var hco3 = findLabValue(parsed, parsedBySection, ['HCO3', 'BICARBONATO', 'HCO3-']);
  var k = findLabValue(parsed, parsedBySection, ['POTASIO', 'K']);
  var na = findLabValue(parsed, parsedBySection, ['SODIO', 'NA']);
  var cl = findLabValue(parsed, parsedBySection, ['CLORO', 'CL']);
  var ketonesRaw =
    (parsedBySection &&
      parsedBySection.EGO &&
      (parsedBySection.EGO.CETONAS || parsedBySection.EGO['CETONAS'])) ||
    null;
  var ketonesPositive = false;
  if (ketonesRaw != null) {
    var ks = String(ketonesRaw).toUpperCase();
    ketonesPositive = ks.length > 0 && !/NEGATIVO|^---$|^-$/.test(ks);
  }
  var ag =
    na != null && cl != null && hco3 != null
      ? computeAnionGapValue_(String(na), String(cl), String(hco3), null)
      : null;
  return {
    glucoseMgDl: glucose,
    ph: ph,
    hco3: hco3,
    k: k,
    na: na,
    ketonesPositive: ketonesPositive,
    anionGap: ag,
  };
}

export function suggestCadEhhMode(labs) {
  var L = labs || {};
  var glu = L.glucoseMgDl;
  var ph = L.ph;
  var hco3 = L.hco3;
  var ket = L.ketonesPositive;

  var cadLikely =
    glu != null &&
    glu > CAD_EHH_THRESHOLDS.cadGlucoseMgDl &&
    ((ph != null && ph < CAD_EHH_THRESHOLDS.cadPh) ||
      (hco3 != null && hco3 < CAD_EHH_THRESHOLDS.cadHco3));

  var ehhLikely =
    glu != null &&
    glu >= CAD_EHH_THRESHOLDS.ehhGlucoseMgDl &&
    (ph == null || ph >= CAD_EHH_THRESHOLDS.ehhPhMin) &&
    !ket;

  if (cadLikely && !ehhLikely) return 'cad';
  if (ehhLikely && !cadLikely) return 'ehh';
  if (cadLikely && ehhLikely) return 'indeterminate';
  if (glu != null && glu >= CAD_EHH_THRESHOLDS.cadGlucoseMgDl) return 'indeterminate';
  return 'indeterminate';
}

export const CAD_EHH_K_REPLETION_RANGES = [
  {
    id: 'k-lt-3.3',
    rangeLabel: 'K⁺ < 3.3 mEq/L',
    min: null,
    maxExclusive: 3.3,
    holdInsulin: true,
    addMeqPerLiter: null,
    meqPerHour: '20 mEq/h IV (máx 40 mEq/h con monitor ECG)',
    copyLine:
      'K < 3.3: SUSPENDER INSULINA. REPONER POTASIO 20 MEQ/H IV (MAX 40 MEQ/H). REEVALUAR K C/2 H. REINICIAR INSULINA CUANDO K > 3.3 MEQ/L',
    detail:
      'Hipokalemia grave. No iniciar o suspender infusión de insulina hasta K⁺ > 3.3 mEq/L. Reponer potasio IV 20 mEq/h (hasta 40 mEq/h si protocolo local y monitorización).',
  },
  {
    id: 'k-3.3-3.9',
    rangeLabel: 'K⁺ 3.3 – 3.9 mEq/L',
    min: 3.3,
    maxExclusive: 4.0,
    holdInsulin: false,
    addMeqPerLiter: 30,
    meqPerHour: null,
    copyLine:
      'K 3.3–3.9: AGREGAR 30 MEQ KCL/LITRO A SOLUCIÓN IV (SI HAY DIURESIS). MONITOR K C/2–4 H',
    detail:
      'Agregar 30 mEq de KCl por cada litro de solución IV. Continuar insulina si K⁺ ≥ 3.3. Vigilar K⁺ cada 2–4 h (insulina desplaza K⁺ intracelular).',
  },
  {
    id: 'k-4.0-5.2',
    rangeLabel: 'K⁺ 4.0 – 5.2 mEq/L',
    min: 4.0,
    maxExclusive: 5.21,
    holdInsulin: false,
    addMeqPerLiter: 20,
    meqPerHour: null,
    copyLine:
      'K 4.0–5.2: AGREGAR 20 MEQ KCL/LITRO A SOLUCIÓN IV (SI HAY DIURESIS). MONITOR K C/2–4 H',
    detail:
      'Agregar 20 mEq de KCl por cada litro de solución IV cuando haya diuresis y K⁺ por debajo del límite superior normal. Monitor K⁺ cada 2–4 h.',
  },
  {
    id: 'k-gt-5.2',
    rangeLabel: 'K⁺ > 5.2 mEq/L',
    min: 5.21,
    maxExclusive: null,
    holdInsulin: false,
    addMeqPerLiter: 0,
    meqPerHour: null,
    copyLine: 'K > 5.2: NO AGREGAR POTASIO A FLUIDOS. MONITOR K SERIADO HASTA < 5.2',
    detail:
      'No suplementar potasio en fluidos IV. Monitorizar K⁺ seriado; agregar K⁺ solo cuando descienda < 5.2 mEq/L (con diuresis).',
  },
];

/**
 * @param {number|null|undefined} kMeqL
 * @returns {{ active: object|null, ranges: typeof CAD_EHH_K_REPLETION_RANGES, kValue: number|null, summary: string }}
 */
export function getPotassiumRepletionGuidance(kMeqL) {
  var k = kMeqL != null && isFinite(Number(kMeqL)) ? Number(kMeqL) : null;
  var active = null;
  if (k != null) {
    for (var i = 0; i < CAD_EHH_K_REPLETION_RANGES.length; i++) {
      var row = CAD_EHH_K_REPLETION_RANGES[i];
      var okMin = row.min == null || k >= row.min;
      var okMax = row.maxExclusive == null || k < row.maxExclusive;
      if (okMin && okMax) {
        active = row;
        break;
      }
    }
  }
  var summary = active
    ? 'K⁺ ' +
      (k != null ? k + ' mEq/L' : '—') +
      ' → ' +
      active.rangeLabel +
      (active.holdInsulin ? ' · Suspender insulina' : '')
    : k != null
      ? 'K⁺ ' + k + ' mEq/L — revisar rango manualmente'
      : 'Sin K⁺ en último laboratorio — aplicar tabla según valor inicial';
  return {
    active: active,
    ranges: CAD_EHH_K_REPLETION_RANGES,
    kValue: k,
    summary: summary,
  };
}

export const CAD_CHECKLIST = [
  {
    id: 'cad-fluids',
    phase: 'Líquidos',
    medication: 'NaCl 0.9%',
    text: '1 L NaCl 0.9% primera hora; continuar NaCl 0.45% o NaCl 0.9%; déficit 24–48 h. Si no hay shock.',
  },
  {
    id: 'cad-insulin',
    phase: 'Insulina',
    medication: 'INSULINA REGULAR',
    text: 'Iniciar 1–2 h post líquidos: insulina regular 0.1 U/kg/h; si glucosa no baja ~50 mg/dL/h → +1 U/h; al 250 mg/dL → 0.05 U/kg/h; agregar dextrosa a fluidos.',
  },
  {
    id: 'cad-k',
    phase: 'Potasio',
    medication: 'CLORURO DE POTASIO (KCL)',
    text: 'Ver tabla de reposición por rango de K⁺ (ADA). Agregar KCl a fluidos solo con diuresis; monitor K⁺ c/2–4 h.',
  },
  {
    id: 'cad-bicarb',
    phase: 'Bicarbonato',
    medication: 'BICARBONATO DE SODIO',
    text: 'No usar bicarbonato de forma rutinaria (ADA).',
  },
  {
    id: 'cad-resolution',
    phase: 'Resolución',
    medication: 'MONITOREO DE LABORATORIO',
    text: 'Criterios: pH >7.3, HCO3 ≥18, gap normalizado, glucosa <200 mg/dL.',
  },
  {
    id: 'cad-transition',
    phase: 'Transición',
    medication: 'INSULINA BASAL SC',
    text: 'Insulina basal SC 2–4 h antes de suspender insulina IV.',
  },
];

export const EHH_CHECKLIST = [
  {
    id: 'ehh-fluids',
    phase: 'Líquidos',
    medication: 'NaCl 0.9%',
    text: 'NaCl 0.9% 15–20 mL/kg/h o 1–1.5 L/h; ~9 L/48 h; corregir osmol <3 mOsm/kg/h.',
  },
  {
    id: 'ehh-insulin',
    phase: 'Insulina',
    medication: 'INSULINA REGULAR',
    text: 'Tras rehidratación parcial: bolo 0.1 U/kg o infusión 0.14 U/kg/h sin bolo; hasta glucosa <300 mg/dL.',
  },
  {
    id: 'ehh-k',
    phase: 'Potasio',
    medication: 'CLORURO DE POTASIO (KCL)',
    text: 'Misma tabla de K⁺ que CAD durante insulina IV: reponer según rango; no agregar K si > 5.2 mEq/L.',
  },
  {
    id: 'ehh-precipitant',
    phase: 'Precipitante',
    medication: 'ESTUDIOS DIAGNÓSTICOS',
    text: 'Buscar infección, IAM, ACV u otra causa precipitante.',
  },
];

export const CAD_LAB_MONITORING = [
  {
    id: 'cad-lab-electrolytes',
    study: 'ELECTROLITOS SÉRICOS',
    frequency: 'CADA 2–4 H',
    comments: 'Incluye Na, K, Cl; durante reposición y titulación de insulina; reevaluar si K < 3.3 mEq/L c/2 h.',
  },
  {
    id: 'cad-lab-bmp',
    study: 'BH / QS / GASES (PH, HCO3, ANION GAP)',
    frequency: 'CADA 2–4 H',
    comments: 'Hasta criterios de resolución: pH > 7.3, HCO3 ≥ 18, gap normalizado.',
  },
  {
    id: 'cad-lab-ketones',
    study: 'CETONAS (ORINA O SANGRE)',
    frequency: 'CADA 4–6 H',
    comments: 'Hasta resolución de cetosis; correlacionar con gap y clínica.',
  },
  {
    id: 'cad-lab-mag',
    study: 'MAGNESIO SÉRICO',
    frequency: 'CADA 12–24 H',
    comments: 'Si reposición prolongada o diuresis osmótica marcada.',
  },
];

export const CAD_NURSING_MONITORING = [
  {
    id: 'cad-nursing-glucometry',
    study: 'GLUCOMETRÍA CAPILAR',
    frequency: 'CADA 1 H',
    kind: 'nursing',
    comments: 'Durante insulina IV; meta descenso ~50 mg/dL/h; agregar dextrosa al 250 mg/dL.',
  },
];

export const EHH_LAB_MONITORING = [
  {
    id: 'ehh-lab-electrolytes',
    study: 'ELECTROLITOS SÉRICOS',
    frequency: 'CADA 2–4 H',
    comments: 'Incluye Na, K, Cl; durante insulina y diuresis osmótica; misma tabla de reposición que CAD.',
  },
  {
    id: 'ehh-lab-osm',
    study: 'OSMOLALIDAD SÉRICA',
    frequency: 'CADA 4–6 H',
    comments: 'Meta corrección < 3 mOsm/kg/h; evitar corrección rápida de sodio/osmol.',
  },
  {
    id: 'ehh-lab-bmp',
    study: 'BH / QS',
    frequency: 'CADA 4–6 H',
    comments: 'Monitoreo de función renal y electrolitos durante rehidratación.',
  },
];

export const EHH_NURSING_MONITORING = [
  {
    id: 'ehh-nursing-glucometry',
    study: 'GLUCOMETRÍA CAPILAR',
    frequency: 'CADA 1 H',
    kind: 'nursing',
    comments: 'Durante insulina IV; meta descenso gradual; evitar >100 mg/dL/h.',
  },
  {
    id: 'ehh-nursing-neuro',
    study: 'VALORACIÓN NEUROLÓGICA / ESTADO MENTAL',
    frequency: 'CADA 2–4 H',
    kind: 'nursing',
    comments: 'Correlacionar con osmolalidad; buscar precipitante (IAM, ACV, infección).',
  },
];

export function labMonitoringForCadEhhMode(mode) {
  if (mode === 'ehh') return EHH_LAB_MONITORING.slice();
  if (mode === 'indeterminate') {
    return CAD_LAB_MONITORING.concat(EHH_LAB_MONITORING);
  }
  return CAD_LAB_MONITORING.slice();
}

export function nursingMonitoringForCadEhhMode(mode) {
  if (mode === 'ehh') return EHH_NURSING_MONITORING.slice();
  if (mode === 'indeterminate') {
    return CAD_NURSING_MONITORING.concat(EHH_NURSING_MONITORING);
  }
  return CAD_NURSING_MONITORING.slice();
}

export function evaluateResolutionChecks(labs) {
  var L = labs || {};
  return {
    phOk: L.ph != null && L.ph > CAD_EHH_THRESHOLDS.cadPh,
    hco3Ok: L.hco3 != null && L.hco3 >= CAD_EHH_THRESHOLDS.cadHco3,
    glucoseOk: L.glucoseMgDl != null && L.glucoseMgDl < 200,
    agOk: L.anionGap != null && L.anionGap <= 12,
  };
}

export function describeCadEhhSuggestion(labs) {
  var L = labs || {};
  var mode = suggestCadEhhMode(L);
  if (mode === 'cad') {
    return 'Glucosa elevada con acidosis o cetosis — priorizar protocolo CAD.';
  }
  if (mode === 'ehh') {
    return 'Hiperglucemia severa sin acidosis significativa — priorizar EHH.';
  }
  if (L.glucoseMgDl == null) {
    return 'Sin glucosa en el último laboratorio — confirma modo clínicamente.';
  }
  return 'Criterios mixtos o incompletos — comparar CAD vs EHH antes de indicar.';
}

export function checklistForCadEhhMode(mode) {
  if (mode === 'ehh') return EHH_CHECKLIST.slice();
  if (mode === 'indeterminate') {
    return CAD_CHECKLIST.concat(EHH_CHECKLIST);
  }
  return CAD_CHECKLIST.slice();
}

export function fluidGuidanceForMode(mode, weightKg) {
  var cad = CAD_CHECKLIST.find(function (s) {
    return s.id === 'cad-fluids';
  });
  var ehh = EHH_CHECKLIST.find(function (s) {
    return s.id === 'ehh-fluids';
  });
  if (mode === 'ehh') {
    var base = ehh ? ehh.text : 'NaCl 0.9% 15–20 mL/kg/h; corregir osmol gradualmente.';
    if (weightKg != null && isFinite(weightKg)) {
      return (
        base +
        ' Referencia: ~' +
        Math.round(weightKg * 17.5) +
        ' mL/h con peso ' +
        weightKg +
        ' kg.'
      );
    }
    return base;
  }
  return cad ? cad.text : '1 L NaCl 0.9% primera hora; continuar NaCl 0.45% o NaCl 0.9%. Si no hay shock.';
}

/**
 * @param {{ parsed?: object, parsedBySection?: object, patient?: object }} input
 */
export function evaluateCadEhh(input) {
  var inp = input || {};
  var labs = extractCadEhhLabs(inp.parsed, inp.parsedBySection);
  var suggestedMode = suggestCadEhhMode(labs);
  var potassiumGuidance = getPotassiumRepletionGuidance(labs.k);
  return {
    labs: labs,
    suggestedMode: suggestedMode,
    modeHint: describeCadEhhSuggestion(labs),
    resolutionChecks: evaluateResolutionChecks(labs),
    potassiumGuidance: potassiumGuidance,
    disclaimer: 'Sugerencia orientativa; confirmar clínicamente.',
  };
}
