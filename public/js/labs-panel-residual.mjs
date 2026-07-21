/**
 * Residual SOME study detector — rows not covered by panel defs / core labs.
 */
import { parseSomeReportTables } from './labs-some-table-parse.mjs';
import { getEffectivePanelDefs } from './labs-panel-overlay-store.mjs';

var CORE_DENY_LABELS = [
  'GLUCOSA',
  'HGB',
  'HTO',
  'WBC',
  'RBC',
  'PLT',
  'CREATININA',
  'UREA',
  'SODIO',
  'POTASIO',
  'CLORO',
];

function flattenSomeRows(departments) {
  var rows = [];
  for (var d = 0; d < departments.length; d++) {
    var groups = departments[d].groups || [];
    for (var g = 0; g < groups.length; g++) {
      var groupRows = groups[g].rows || [];
      for (var r = 0; r < groupRows.length; r++) rows.push(groupRows[r]);
    }
  }
  return rows;
}

function parseRefMinMax(ref) {
  if (!ref) return { min: null, max: null };
  var m = String(ref).match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
  if (!m) return { min: null, max: null };
  return {
    min: parseFloat(m[1].replace(',', '.')),
    max: parseFloat(m[2].replace(',', '.')),
  };
}

function buildCoverageIndex(defs) {
  var labels = [];
  var patterns = [];
  for (var i = 0; i < defs.length; i++) {
    var fields = defs[i].fields || [];
    for (var f = 0; f < fields.length; f++) {
      var field = fields[f];
      if (field.labels) {
        for (var l = 0; l < field.labels.length; l++) {
          labels.push(String(field.labels[l]).toUpperCase().trim());
        }
      }
      if (field.patterns) {
        for (var p = 0; p < field.patterns.length; p++) patterns.push(field.patterns[p]);
      }
    }
  }
  return { labels: labels, patterns: patterns };
}

function substringLabelMatch(a, b) {
  if (!a || !b) return false;
  return a.indexOf(b) >= 0 || b.indexOf(a) >= 0;
}

function matchesDenyList(labelUpper) {
  for (var i = 0; i < CORE_DENY_LABELS.length; i++) {
    if (substringLabelMatch(labelUpper, CORE_DENY_LABELS[i])) return true;
  }
  return false;
}

function isCoveredByDefs(labelUpper, idx) {
  for (var i = 0; i < idx.labels.length; i++) {
    if (substringLabelMatch(labelUpper, idx.labels[i])) return true;
  }
  for (var p = 0; p < idx.patterns.length; p++) {
    if (idx.patterns[p].test(labelUpper)) return true;
  }
  return false;
}

function isCoveredByResLabs(labelUpper, resLabs, idx) {
  if (!resLabs || !resLabs.length) return false;
  var blob = resLabs.join('\n').toUpperCase();
  if (blob.indexOf(labelUpper) >= 0) return true;
  for (var i = 0; i < idx.labels.length; i++) {
    if (blob.indexOf(idx.labels[i]) >= 0 && substringLabelMatch(labelUpper, idx.labels[i])) {
      return true;
    }
  }
  for (var p = 0; p < idx.patterns.length; p++) {
    if (idx.patterns[p].test(blob) && idx.patterns[p].test(labelUpper)) return true;
  }
  return false;
}

function isRowCovered(estudio, resLabs, idx) {
  var labelUpper = String(estudio || '').toUpperCase().trim();
  if (!labelUpper) return true;
  if (matchesDenyList(labelUpper)) return true;
  if (isCoveredByDefs(labelUpper, idx)) return true;
  if (isCoveredByResLabs(labelUpper, resLabs, idx)) return true;
  return false;
}

function rowToCandidate(row, id) {
  var range = parseRefMinMax(row.ref);
  return {
    id: id,
    label: row.estudio,
    value: row.resultado || '',
    min: range.min,
    max: range.max,
    qual: '',
    sco: '',
    selected: true,
  };
}

/**
 * @param {string} texto SOME report text
 * @param {{ resLabs?: string[] }} [opts]
 * @returns {{ candidates: object[], coveredCount: number }}
 */
export function findResidualSomeStudies(texto, opts) {
  opts = opts || {};
  var resLabs = opts.resLabs || [];
  var parsed = parseSomeReportTables(texto || '');
  var rows = flattenSomeRows(parsed.departments || []);
  var idx = buildCoverageIndex(getEffectivePanelDefs());
  var candidates = [];
  var coveredCount = 0;
  var nextId = 0;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (isRowCovered(row.estudio, resLabs, idx)) {
      coveredCount++;
      continue;
    }
    candidates.push(rowToCandidate(row, 'r' + nextId++));
  }

  return { candidates: candidates, coveredCount: coveredCount };
}
