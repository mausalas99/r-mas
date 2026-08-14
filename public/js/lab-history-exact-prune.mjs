/**
 * Drop exact lab-history clones (same fecha, hora, lines) from in-memory store.
 */
import { getLabHistory } from './app-state.mjs';
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';
import { stripDuplicateLabSets } from './lab-history-auto-store-core.mjs';

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
  if (!result.removedIds.length) return [];
  if (result.sets.length) hist[patientId] = result.sets;
  else delete hist[patientId];
  bumpLabHistoryRevision(patientId);
  return result.removedIds;
}
