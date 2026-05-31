import { isVpoDxInferenceHidden } from './clinical-product-policy.mjs';

/** Parseo de diagnósticos e inferencia de factores de riesgo (RCRI, Caprini, ARISCAT, ASA). */

/**
 * @param {string} text
 * @returns {string[]}
 */
function normalizePlusSeparators(text) {
  return String(text || '')
    .replace(/[\uFF0B\u2795]/g, '+')
    .replace(/\s+\+\s+/g, ' + ');
}

export function parseDiagnosticosText(text) {
  var raw = normalizePlusSeparators(String(text || '').trim());
  if (!raw) return [];
  var parts = /\+/.test(raw) ? raw.split(/\s*\+\s*/) : raw.split(/\r?\n/);
  return parts
    .map(function (p) {
      return String(p || '')
        .trim()
        .replace(/^\d+\.\s*/, '')
        .toUpperCase();
    })
    .filter(Boolean);
}

/**
 * @param {string[]} list
 * @returns {string}
 */
export function formatDiagnosticosCopy(list) {
  return (list || [])
    .map(function (d, i) {
      return i + 1 + '. ' + String(d || '').trim();
    })
    .filter(function (line) {
      return line.length > 2;
    })
    .join('\n');
}

/**
 * @param {string[]} list
 * @returns {string}
 */
export function formatDiagnosticosPlusLine(list) {
  return (list || [])
    .map(function (d) {
      return String(d || '').trim();
    })
    .filter(Boolean)
    .join(' + ');
}

function normDx(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** @param {string[]} list @param {RegExp} re */
function anyDxMatch(list, re) {
  for (var i = 0; i < list.length; i++) {
    if (re.test(normDx(list[i]))) return true;
  }
  return false;
}

/**
 * @param {string[]} diagnosticosList
 * @returns {{
 *   rcri: Record<string, boolean>,
 *   caprini: Record<string, boolean>,
 *   ariscat: Record<string, boolean>,
 *   asaKey: string,
 * }}
 */
export function inferRiskFromDiagnosticos(diagnosticosList) {
  var list = (diagnosticosList || []).filter(Boolean);
  var rcri = {
    cardiopatiaIsquemica: anyDxMatch(list, /isquemi|infarto agudo|iam\b|angina|coronari|cardiopatia isquemica/),
    insuficienciaCardiaca: anyDxMatch(
      list,
      /insuficiencia cardiaca|fevi reducida|icc\b|ic con|ic cronic|falla cardiaca|heart failure/
    ),
    evc: anyDxMatch(list, /\bevc\b|ait\b|acv\b|ictus|infarto cerebral|evento cerebrovascular/),
    dmInsulina: anyDxMatch(
      list,
      /dm tipo 1|diabetes mellitus tipo 1|insulinodepend|con insulina|dm con insulina|diabet.*insulin/
    ),
  };

  var caprini = {
    imcMayor25: anyDxMatch(list, /obesidad|obeso|imc\s*>?\s*25|sobrepeso morbido/),
    insuficienciaVenosa: anyDxMatch(list, /varices|insuficiencia venosa|\bivc\b/),
    reposoMovilidadReducida: anyDxMatch(list, /reposo prolongado|inmovil|paraplej|tetraplej|movilidad reducida/),
    antecedenteEvc: anyDxMatch(
      list,
      /tromboembolia venosa|\btev\b|embolia pulmonar|trombosis venosa|tvpe\b/
    ),
    trombofilia: anyDxMatch(list, /trombofilia/),
    esteroideCronico: anyDxMatch(list, /esteroide cronico|corticoterapia cronica|prednisona cronica/),
    artritisInflamatoria: anyDxMatch(
      list,
      /artritis reumatoide|lupus|artritis inflamatoria|enfermedad inflamatoria/
    ),
  };

  var ariscat = {
    infeccionRespiratoriaUltimoMes: anyDxMatch(
      list,
      /infeccion respiratoria|neumonia reciente|neumonia aguda|iras\b/
    ),
  };

  var asaKey = '';
  if (
    anyDxMatch(list, /moribundo|shock refractario|falla multiorganica|paro cardiaco/)
  ) {
    asaKey = 'asa-v';
  } else if (
    anyDxMatch(
      list,
      /erc estadio 5|enfermedad renal cronica estadio 5|estadio v\b|dialisis peritoneal|hemodialisis|sepsis severa|insuficiencia respiratoria aguda|falla hepatica aguda/
    )
  ) {
    asaKey = 'asa-iv';
  } else if (
    anyDxMatch(
      list,
      /insuficiencia cardiaca|fevi reducida|cardiopatia isquemica|epoc gold|epoc severa|cirrosis|cancer activo|leucemia|linfoma|vih avanzado|diabetes mellitus tipo 2 complicada|peritonitis/
    )
  ) {
    asaKey = 'asa-iii';
  } else if (
    anyDxMatch(list, /diabetes mellitus|hipertension|hta\b|asma|epoc|hipotiroidismo|anemia cronica/)
  ) {
    asaKey = 'asa-ii';
  }

  return { rcri, caprini, ariscat, asaKey };
}

/**
 * Aplica inferencia a state (solo marca true; no desmarca manual).
 * @param {object} state
 */
export function applyDiagnosticosInference(state) {
  if (isVpoDxInferenceHidden()) return;
  var list = (state.diagnosticosList || []).filter(function (d) {
    return String(d || '').trim();
  });
  var inf = inferRiskFromDiagnosticos(list);
  if (!state.rcri) state.rcri = {};
  if (!state.caprini) state.caprini = {};
  if (!state.ariscat) state.ariscat = {};

  Object.keys(inf.rcri).forEach(function (k) {
    if (inf.rcri[k]) state.rcri[k] = true;
  });
  Object.keys(inf.caprini).forEach(function (k) {
    if (inf.caprini[k]) state.caprini[k] = true;
  });
  Object.keys(inf.ariscat).forEach(function (k) {
    if (inf.ariscat[k]) state.ariscat[k] = true;
  });

  state.diagnosticosText = formatDiagnosticosCopy(list);

  if (inf.asaKey && (!state.asaKey || state.asaFromDiagnosticos)) {
    state.asaKey = inf.asaKey;
    state.asaFromDiagnosticos = true;
  }
  if (!list.length) state.asaFromDiagnosticos = false;
}
