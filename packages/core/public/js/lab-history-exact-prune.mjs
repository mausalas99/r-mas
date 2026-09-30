/**
 * Drop exact lab-history clones (same fecha, hora, lines) from in-memory store.
 */
import { getLabHistory } from './app-state.mjs';
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';
import { stripDuplicateLabSets, findSubsumedLabSets } from './lab-history-auto-store-core.mjs';

/**
 * @param {string} patientId
 * @returns {string[]} removed set ids
 */
export function applyExactLabHistoryDedupe(patientId) {
  if (!patientId) return [];
  var hist = getLabHistory();
  var sets = hist[patientId];
  if (!sets || sets.length < 2) return [];
  var result = stripDuplicateLabSets(sets);
  var removed = result.removedIds.slice();
  var kept = result.sets;
  // Pulled from another device: a set whose values all live in a bigger set of the same day.
  var subsumed = findSubsumedLabSets(kept);
  if (subsumed.length) {
    var gone = new Set(subsumed.map(function (f) { return f.id; }));
    subsumed.forEach(function (f) {
      var small = kept.find(function (x) { return String(x.id) === f.id; });
      if (small && small.hora && !String(f.into.hora || '').trim()) f.into.hora = small.hora;
    });
    kept = kept.filter(function (x) { return !gone.has(String(x.id)); });
    removed = removed.concat(Array.from(gone));
  }
  if (!removed.length) return [];
  if (kept.length) hist[patientId] = kept;
  else delete hist[patientId];
  bumpLabHistoryRevision(patientId);
  return removed;
}
