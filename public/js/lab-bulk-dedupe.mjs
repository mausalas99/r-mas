/**
 * Dedupe de renglones al consolidar labs del mismo día (extraído de lab-bulk-paste.mjs).
 */
import { mergeBhResLabRows_, mergeCoagResLabRows_ } from './labs.js';
import { normalizeLabLine } from './lab-history-auto-store-core.mjs';
import { mergeTroponinaResLabRows_ } from './labs-troponin.mjs';
import {
  mergeQsResLabRows_,
  mergeEscResLabRows_,
  mergePfhResLabRows_,
  mergeLipasaResLabRows_,
} from './labs-chemistry.mjs';
import { sortResLabsByClinicalOrder } from './labs-section-order.mjs';

function labRowSectionKey(row) {
  var s = String(row || '').trim();
  if (!s) return '';
  var m = s.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
  return m ? m[1].toUpperCase() : '';
}

function labRowRichnessScore(row) {
  var s = String(row || '');
  var score = s.length;
  score += (s.match(/\b(?:AG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  if (/INTERPRETACI[ÓO]N\s+GASOMETR[IÍ]A/i.test(s)) score += 20;
  return score;
}

function isBhResLabRow(row) {
  var key = labRowSectionKey(row);
  return key === 'BH' || /^BH:/i.test(String(row || '').trim());
}

function isPairMergeSectionKey(key) {
  return key === 'QS' || key === 'ESC' || key === 'PFHS' || key === 'LIPASA';
}

/** Dedupe de renglones al consolidar mismo día (misma lógica que lab-panel). */
export function dedupeConsolidatedLabRows(rows, tipo) {
  var normalized = [];
  var seenExact = Object.create(null);
  (rows || []).forEach(function (row) {
    var norm = normalizeLabLine(String(row == null ? '' : row));
    if (!norm) return;
    if (seenExact[norm]) return;
    seenExact[norm] = true;
    normalized.push(String(row));
  });
  if (tipo !== 'labs') return normalized;

  var bhRows = [];
  var tropRows = [];
  var qsRows = [];
  var escRows = [];
  var pfhRows = [];
  var lipasaRows = [];
  var coagRows = [];
  var otherRows = [];
  normalized.forEach(function (row) {
    if (isBhResLabRow(row)) {
      bhRows.push(row);
      return;
    }
    var key = labRowSectionKey(row);
    if (key === 'TROP') tropRows.push(row);
    else if (key === 'QS') qsRows.push(row);
    else if (key === 'ESC') escRows.push(row);
    else if (key === 'PFHS') pfhRows.push(row);
    else if (key === 'LIPASA') lipasaRows.push(row);
    else if (key === 'COAG') coagRows.push(row);
    else otherRows.push(row);
  });

  var bestBySection = Object.create(null);
  otherRows.forEach(function (row, idx) {
    var key = labRowSectionKey(row);
    if (!key || isPairMergeSectionKey(key)) return;
    var cand = { row: row, idx: idx, score: labRowRichnessScore(row) };
    var prev = bestBySection[key];
    if (!prev || cand.score > prev.score || (cand.score === prev.score && cand.idx > prev.idx)) {
      bestBySection[key] = cand;
    }
  });

  var out = Object.keys(bestBySection).map(function (k) {
    return bestBySection[k].row;
  });
  var mergedQs = mergeQsResLabRows_(qsRows);
  if (mergedQs) out.push(mergedQs);
  var mergedEsc = mergeEscResLabRows_(escRows);
  if (mergedEsc) out.push(mergedEsc);
  var mergedPfh = mergePfhResLabRows_(pfhRows);
  if (mergedPfh) out.push(mergedPfh);
  var mergedLip = mergeLipasaResLabRows_(lipasaRows);
  if (mergedLip) out.push(mergedLip);
  var mergedTrop = mergeTroponinaResLabRows_(tropRows);
  if (mergedTrop) out.push(mergedTrop);
  if (bhRows.length) {
    var mergedBh = mergeBhResLabRows_(bhRows);
    if (mergedBh.bh) out.push(mergedBh.bh);
    if (mergedBh.coag) coagRows.push(mergedBh.coag);
  }
  var mergedCoag = mergeCoagResLabRows_(coagRows);
  if (mergedCoag) out.push(mergedCoag);
  // BH-first unshift used to leave EGO (from an earlier same-day set) stuck
  // right after BH. Canonical clinical order puts EGO after the rest.
  return sortResLabsByClinicalOrder(out);
}
