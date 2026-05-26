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

export const CAD_CHECKLIST = [
  {
    id: 'cad-fluids',
    phase: 'Líquidos',
    text: '1 L SS 0.9% primera hora si no hay shock; continuar 0.45–0.9%; déficit 24–48 h.',
  },
  {
    id: 'cad-insulin',
    phase: 'Insulina',
    text: 'Iniciar 1–2 h post líquidos: insulina regular 0.1 U/kg/h; si glucosa no baja ~50 mg/dL/h → +1 U/h; al 250 mg/dL → 0.05 U/kg/h; agregar dextrosa a fluidos.',
  },
  {
    id: 'cad-k',
    phase: 'Potasio',
    text: 'Agregar K+ a solución si K < límite superior y hay diuresis.',
  },
  {
    id: 'cad-bicarb',
    phase: 'Bicarbonato',
    text: 'No usar bicarbonato de forma rutinaria (ADA).',
  },
  {
    id: 'cad-resolution',
    phase: 'Resolución',
    text: 'Criterios: pH >7.3, HCO3 ≥18, gap normalizado, glucosa <200 mg/dL.',
  },
  {
    id: 'cad-transition',
    phase: 'Transición',
    text: 'Insulina basal SC 2–4 h antes de suspender insulina IV.',
  },
];

export const EHH_CHECKLIST = [
  {
    id: 'ehh-fluids',
    phase: 'Líquidos',
    text: 'SS 0.9% 15–20 mL/kg/h o 1–1.5 L/h; ~9 L/48 h; corregir osmol <3 mOsm/kg/h.',
  },
  {
    id: 'ehh-insulin',
    phase: 'Insulina',
    text: 'Tras rehidratación parcial: bolo 0.1 U/kg o infusión 0.14 U/kg/h sin bolo; hasta glucosa <300 mg/dL.',
  },
  {
    id: 'ehh-precipitant',
    phase: 'Precipitante',
    text: 'Buscar infección, IAM, ACV u otra causa precipitante.',
  },
];

export function evaluateResolutionChecks(labs) {
  var L = labs || {};
  return {
    phOk: L.ph != null && L.ph > CAD_EHH_THRESHOLDS.cadPh,
    hco3Ok: L.hco3 != null && L.hco3 >= CAD_EHH_THRESHOLDS.cadHco3,
    glucoseOk: L.glucoseMgDl != null && L.glucoseMgDl < 200,
    agOk: L.anionGap != null && L.anionGap <= 12,
  };
}

/**
 * @param {{ parsed?: object, parsedBySection?: object, patient?: object }} input
 */
export function evaluateCadEhh(input) {
  var inp = input || {};
  var labs = extractCadEhhLabs(inp.parsed, inp.parsedBySection);
  var suggestedMode = suggestCadEhhMode(labs);
  return {
    labs: labs,
    suggestedMode: suggestedMode,
    resolutionChecks: evaluateResolutionChecks(labs),
    disclaimer: 'Sugerencia orientativa; confirmar clínicamente.',
  };
}
