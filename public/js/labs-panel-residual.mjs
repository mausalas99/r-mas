/**
 * Residual SOME study detector — rows not covered by panel defs / core labs.
 */
import { parseSomeReportTables } from './labs-some-table-parse.mjs';
import { getEffectivePanelDefs } from './labs-panel-overlay-store.mjs';

/** Labels always treated as core (substring match on estudio). */
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

/**
 * If ANY of `tokens` appears as a compact lab key in resLabs, matching SOME labels are covered.
 * @type {{ tokens: string[], labels: string[] }[]}
 */
var CORE_TOKEN_ALIASES = [
  { tokens: ['Hb', 'HGB'], labels: ['HGB', 'HEMOGLOBINA', 'HB'] },
  { tokens: ['Hto'], labels: ['HCT', 'HEMATOCRITO', 'HTO'] },
  { tokens: ['VCM'], labels: ['MCV', 'VCM', 'VOLUMEN CORPUSCULAR MEDIO'] },
  { tokens: ['HCM'], labels: ['MCH', 'HCM', 'HEMOGLOBINA CORPUSCULAR'] },
  { tokens: ['CHCM'], labels: ['MCHC', 'CHCM'] },
  { tokens: ['RDW'], labels: ['RDW'] },
  { tokens: ['Leu', 'WBC'], labels: ['WBC', 'LEUCOCIT'] },
  { tokens: ['Neu'], labels: ['NEU ', 'NEUTROFIL'] },
  { tokens: ['NeuPct', 'Seg'], labels: ['NEU%', 'NEUTROFILOS %', '% NEUTRO'] },
  { tokens: ['Lin', 'LinPct'], labels: ['LYM', 'LINFOCIT'] },
  { tokens: ['Mono', 'MonoPct'], labels: ['MONO', 'MONOCIT'] },
  { tokens: ['Eos', 'EosPct'], labels: ['EOS', 'EOSINOFIL'] },
  { tokens: ['Plt'], labels: ['PLT', 'PLAQUET'] },
  { tokens: ['RBC', 'Eri'], labels: ['RBC', 'ERITROCIT'] },
  { tokens: ['Glu'], labels: ['GLUCOSA'] },
  { tokens: ['Cr'], labels: ['CREATININA'] },
  { tokens: ['BUN'], labels: ['UREA', 'NITROGENO DE LA UREA', 'BUN'] },
  { tokens: ['Na'], labels: ['SODIO'] },
  { tokens: ['K'], labels: ['POTASIO'] },
  { tokens: ['Cl'], labels: ['CLORO'] },
  { tokens: ['Ca'], labels: ['CALCIO'] },
  { tokens: ['F', 'P'], labels: ['FOSFORO', 'FÓSFORO', 'FOSFATO'] },
  { tokens: ['Mg'], labels: ['MAGNESIO'] },
  { tokens: ['Alb'], labels: ['ALBUMINA', 'ALBÚMINA'] },
  { tokens: ['BT'], labels: ['BILIRRUBINA TOTAL'] },
  { tokens: ['BD'], labels: ['BILIRRUBINA DIRECTA'] },
  { tokens: ['BI'], labels: ['BILIRRUBINA INDIRECTA'] },
  { tokens: ['LDH'], labels: ['LDH', 'DESHIDROGENASA'] },
  { tokens: ['Amil'], labels: ['AMILASA'] },
  { tokens: ['Lip'], labels: ['LIPASA'] },
  { tokens: ['FA', 'ALP'], labels: ['FOSFATASA ALCALINA', 'ALP'] },
  { tokens: ['AST'], labels: ['AST', 'ASPARTATO'] },
  { tokens: ['ALT'], labels: ['ALT', 'ALANIN'] },
  { tokens: ['GGT'], labels: ['GGT', 'GLUTAMIL'] },
  { tokens: ['COL'], labels: ['COLESTEROL'] },
  { tokens: ['TGL', 'TG'], labels: ['TRIGLICER'] },
  { tokens: ['HDL'], labels: ['HDL'] },
  { tokens: ['LDL'], labels: ['LDL'] },
  { tokens: ['PCR'], labels: ['PROTEINA C REACTIVA', 'PROTEÍNA C REACTIVA', 'PCR'] },
  { tokens: ['AU'], labels: ['ACIDO URICO', 'ÁCIDO ÚRICO'] },
  { tokens: ['CPK'], labels: ['CPK', 'CREATIN FOSFO'] },
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

function resLabsHasToken(blob, token) {
  var t = String(token || '').trim();
  if (!t || !blob) return false;
  // Compact lines: "Hb 15.2" / "\tCa 9.0" / start of line
  var re = new RegExp('(?:^|[\\s\\t])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)', 'i');
  return re.test(blob);
}

function isCoveredByCoreTokens(labelUpper, resLabs) {
  if (!resLabs || !resLabs.length) return false;
  var blob = resLabs.join('\n');
  for (var i = 0; i < CORE_TOKEN_ALIASES.length; i++) {
    var alias = CORE_TOKEN_ALIASES[i];
    var labelHit = false;
    for (var l = 0; l < alias.labels.length; l++) {
      if (substringLabelMatch(labelUpper, alias.labels[l])) {
        labelHit = true;
        break;
      }
    }
    if (!labelHit) continue;
    for (var t = 0; t < alias.tokens.length; t++) {
      if (resLabsHasToken(blob, alias.tokens[t])) return true;
    }
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
  if (isCoveredByCoreTokens(labelUpper, resLabs)) return true;
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
