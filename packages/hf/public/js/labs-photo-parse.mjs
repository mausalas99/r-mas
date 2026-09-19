/**
 * Parses OCR'd text from a photographed OUTSIDE-lab report (not SOME) into
 * candidate lab rows. Outside labs use varied layouts and OCR does not
 * preserve table columns, so this works line-by-line instead of reusing
 * parseSomeReportTables (which depends on SOME's fixed column layout).
 */
import { matchLabSynonym } from './labs-photo-synonyms.mjs';

var NAME_RESULT_RE = /^([^\d]+?)\s+(-?\d+(?:[.,]\d+)?)\s*(\*)?\s*(.*)$/;
var UNIT_RE =
  /\b(mg\/dL|g\/dL|mmol\/L|mEq\/L|ng\/mL|pg\/mL|µg\/dL|ug\/dL|10\^3\/µL|10\^3\/uL|10\^6\/µL|10\^6\/uL|U\/L|fL|pg|seg(?:undos)?|%)\b/i;
var RANGE_TOKEN_RE = /[<>≤≥]\s*-?\d+(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?\s*-\s*-?\d+(?:[.,]\d+)?/g;
// Single-letter H/L flags are deliberately excluded: they collide with unit
// abbreviations like "U/L" or "mmol/L" and would false-positive constantly.
var FLAG_WORD_RE = /\b(alto|bajo)\b/i;

function toNumber(token) {
  if (token == null) return NaN;
  return parseFloat(String(token).replace(',', '.'));
}

function lastRangeMatch(rest) {
  RANGE_TOKEN_RE.lastIndex = 0;
  var m;
  var last = null;
  while ((m = RANGE_TOKEN_RE.exec(rest))) {
    last = m[0];
  }
  return last;
}

function parseRangeBounds(rangeText) {
  if (!rangeText) return null;
  var t = rangeText.trim();
  var cmp = /^([<>≤≥])\s*(-?\d+(?:[.,]\d+)?)$/.exec(t);
  if (cmp) return { cmp: cmp[1], value: toNumber(cmp[2]) };
  var range = /^(-?\d+(?:[.,]\d+)?)\s*-\s*(-?\d+(?:[.,]\d+)?)$/.exec(t);
  if (range) return { min: toNumber(range[1]), max: toNumber(range[2]) };
  return null;
}

// ponytail: naive numeric-range/flag-word heuristic for `abnormal`; upgrade
// to structured qualitative-flag detection if outside labs commonly print
// explicit H/L markers this misses.
function isAbnormal(resultNum, bounds, star, rest) {
  if (star) return true;
  if (FLAG_WORD_RE.test(rest)) return true;
  if (!bounds || Number.isNaN(resultNum)) return false;
  if (bounds.cmp) {
    if (bounds.cmp === '<') return resultNum >= bounds.value;
    if (bounds.cmp === '≤') return resultNum > bounds.value;
    if (bounds.cmp === '>') return resultNum <= bounds.value;
    if (bounds.cmp === '≥') return resultNum < bounds.value;
    return false;
  }
  if (typeof bounds.min === 'number' && typeof bounds.max === 'number') {
    return resultNum < bounds.min || resultNum > bounds.max;
  }
  return false;
}

/**
 * @param {string} rawText raw OCR output
 * @returns {Array<{rawLine:string, rawName:string, resultado:string, unidades:string, ref:string, abnormal:boolean, matchedKey:string|null, matchedSectionKey:string|null}>}
 */
export function parseOcrLabText(rawText) {
  var lines = String(rawText || '').split(/\r?\n/);
  var rows = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || !/\d/.test(line)) continue;
    var m = NAME_RESULT_RE.exec(line);
    if (!m) continue;
    var name = m[1].replace(/[\s.:\-]+$/, '').trim();
    if (!name) continue;
    var resultToken = m[2];
    var resultNum = toNumber(resultToken);
    if (Number.isNaN(resultNum)) continue;
    var star = !!m[3];
    var rest = m[4] || '';
    var unitMatch = UNIT_RE.exec(rest);
    var unit = unitMatch ? unitMatch[0] : '';
    var rangeText = lastRangeMatch(rest);
    var bounds = parseRangeBounds(rangeText);
    var match = matchLabSynonym(name);
    rows.push({
      rawLine: line,
      rawName: name,
      resultado: resultToken.replace(',', '.') + (star ? '*' : ''),
      unidades: unit,
      ref: rangeText || '',
      abnormal: isAbnormal(resultNum, bounds, star, rest),
      matchedKey: match ? match.key : null,
      matchedSectionKey: match ? match.sectionKey : null,
    });
  }
  return rows;
}
