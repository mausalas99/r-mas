/**
 * Canonical display order for resLabs section chunks.
 * Fixed head: BH → QS → ESC → PFHs → GASES → (otros) → EGO last
 * (EGO is usually the longest block of text).
 */

/** Head sections in fixed clinical order (before everything else). */
var HEAD_ORDER = ['BH', 'QS', 'ESC', 'PFHS', 'GASES'];

/** Tail sections — EGO always last. */
var TAIL_ORDER = ['CUANTORINA', 'EGO'];

var HEAD_RANK = Object.create(null);
var TAIL_RANK = Object.create(null);
HEAD_ORDER.forEach(function (k, i) {
  HEAD_RANK[k] = i;
});
TAIL_ORDER.forEach(function (k, i) {
  TAIL_RANK[k] = i;
});

var HEAD_LEN = HEAD_ORDER.length;
var OTROS_RANK = HEAD_LEN;
var TAIL_BASE = HEAD_LEN + 1;

/**
 * Section key for ordering (strips trailing colon; uppercases).
 * @param {unknown} row
 * @returns {string}
 */
export function labSectionOrderKey(row) {
  var s = String(row == null ? '' : row).trim();
  if (!s) return '';
  var firstLine = s.split(/\r?\n/, 1)[0] || '';
  var tab = firstLine.indexOf('\t');
  if (tab >= 0) firstLine = firstLine.substring(0, tab);
  var colon = firstLine.indexOf(':');
  if (colon > 0) firstLine = firstLine.substring(0, colon);
  var m = firstLine.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
  return m ? m[1].toUpperCase() : '';
}

function sectionRank_(key) {
  if (!key) return OTROS_RANK;
  if (Object.prototype.hasOwnProperty.call(HEAD_RANK, key)) return HEAD_RANK[key];
  if (Object.prototype.hasOwnProperty.call(TAIL_RANK, key)) return TAIL_BASE + TAIL_RANK[key];
  return OTROS_RANK;
}

/**
 * Stable sort: BH → QS → ESC → PFHs → GASES → otros → … → EGO.
 * @param {unknown[]} rows
 * @returns {string[]}
 */
export function sortResLabsByClinicalOrder(rows) {
  var list = (rows || []).map(function (row, idx) {
    return { row: row, idx: idx, rank: sectionRank_(labSectionOrderKey(row)) };
  });
  list.sort(function (a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.idx - b.idx;
  });
  return list.map(function (item) {
    return String(item.row == null ? '' : item.row);
  });
}
