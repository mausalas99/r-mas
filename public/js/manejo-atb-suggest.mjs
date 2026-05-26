/** Clasificación orientativa ATB vs aislamiento / mecanismos. */

const BLEE_CAUTION_IDS = new Set([
  'ceftriaxona',
  'cefotaxima',
  'ceftazidima',
  'cefepime',
]);
const VRE_CAUTION_IDS = new Set(['vancomicina']);
const CARBAPENEM_CAUTION_IDS = new Set(['meropenem', 'imipenem', 'ertapenem']);

/**
 * @param {{ id: string, someAbbrev?: string[] }} drug
 * @param {{ markers?: string[], sensKeys?: string[], organismo?: string }} isolate
 */
export function classifyAtbForIsolate(drug, isolate) {
  if (!drug || !isolate) return { status: 'neutral', reasons: [] };
  var reasons = [];
  var markers = isolate.markers || [];
  if (markers.indexOf('BLEE') !== -1 && BLEE_CAUTION_IDS.has(drug.id)) {
    reasons.push('BLEE: evitar cefalosporinas 3ª gen');
  }
  if (markers.indexOf('ESBL') !== -1 && BLEE_CAUTION_IDS.has(drug.id)) {
    reasons.push('ESBL: evitar cefalosporinas 3ª gen');
  }
  if (markers.indexOf('VRE') !== -1 && VRE_CAUTION_IDS.has(drug.id)) {
    reasons.push('VRE: vancomicina no indicada');
  }
  if (
    markers.some(function (m) {
      return /^(KPC|NDM|VIM|IMP|MBL|CRE|Carb-R)$/.test(m);
    }) &&
    CARBAPENEM_CAUTION_IDS.has(drug.id)
  ) {
    reasons.push('Carbapenemasa: evitar carbapenémicos');
  }
  if (reasons.length) return { status: 'caution', reasons: reasons };

  var sens = isolate.sensKeys || [];
  var abbr = drug.someAbbrev || [];
  var hit = abbr.some(function (a) {
    return sens.indexOf(String(a).toUpperCase()) !== -1;
  });
  if (hit) return { status: 'compatible', reasons: ['S en antibiograma'] };
  return { status: 'neutral', reasons: [] };
}

export function buildGlobalAlertsFromMarkers(markers) {
  var out = [];
  var seen = Object.create(null);
  (markers || []).forEach(function (mk) {
    var u = String(mk || '').toUpperCase();
    if (!u || seen[u]) return;
    seen[u] = 1;
    if (u === 'BLEE' || u === 'ESBL') out.push('BLEE/ESBL: evitar cefalosporinas 3ª gen');
    else if (u === 'VRE') out.push('VRE: preferir linezolid/daptomicina según antibiograma');
    else if (/^(KPC|NDM|VIM|IMP|MBL|CRE)$/.test(u)) {
      out.push('Carbapenemasa (' + u + '): evitar meropenem/imipenem');
    }
  });
  return out.filter(function (a, i, arr) {
    return arr.indexOf(a) === i;
  });
}
