/**
 * Fill empty resLabs from SOME sourceText. Sets that already have rows
 * (SOME stamp of approval) are left alone.
 */
import { looksLikeSomeLabReport } from './labs-report-refs.mjs';
import { procesarLabs } from './labs.js';

function alreadyHasParsedRows(set) {
  return Array.isArray(set.resLabs) && set.resLabs.length > 0;
}

function assignParsedObject(set, key, value) {
  if (value && typeof value === 'object') set[key] = value;
}

/**
 * @param {object|null|undefined} set
 * @param {(text: string, opts?: object) => { resLabs?: unknown[], bhExtras?: object, refsBySection?: object }} [parseFn]
 * @returns {boolean} true if resLabs were filled from SOME
 */
export function reparseLabSetFromSome(set, parseFn) {
  if (!set || typeof set !== 'object') return false;
  if (alreadyHasParsedRows(set)) return false;
  var src = String(set.sourceText || '');
  if (!looksLikeSomeLabReport(src)) return false;
  var parsed = (parseFn || procesarLabs)(src, {});
  var rows = parsed && Array.isArray(parsed.resLabs) ? parsed.resLabs : null;
  if (!rows || !rows.length) return false;
  set.resLabs = rows;
  assignParsedObject(set, 'bhExtras', parsed.bhExtras);
  assignParsedObject(set, 'refsBySection', parsed.refsBySection);
  delete set._parseFingerprint;
  return true;
}

/**
 * @param {object[]} sets
 * @param {(text: string, opts?: object) => { resLabs?: unknown[] }} [parseFn]
 * @returns {number} sets updated
 */
export function reparseLabSetsFromSome(sets, parseFn) {
  if (!Array.isArray(sets) || !sets.length) return 0;
  var n = 0;
  for (var i = 0; i < sets.length; i += 1) {
    if (reparseLabSetFromSome(sets[i], parseFn)) n += 1;
  }
  return n;
}
