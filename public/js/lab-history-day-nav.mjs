/**
 * Groups a lab-history list into day buckets and steps between them —
 * backs the Laboratorio → Resultados day picker (prev/next arrows).
 *
 * `hist` (and therefore the `days` this produces) is newest-first, matching
 * `sortLabHistoryChronological` (tend-core.mjs) — index 0 is the most recent day/set.
 * So stepping to an OLDER day means a HIGHER index, and a NEWER day a LOWER index.
 */

/** @param {Array} hist newest-first lab history sets (sortLabHistoryChronological order) */
export function groupLabHistoryByDay(hist) {
  var days = [];
  var byKey = Object.create(null);
  (hist || []).forEach(function (set, idx) {
    var key = String((set && set.fecha) || 'Anterior');
    if (!byKey[key]) {
      byKey[key] = { dayKey: key, rows: [] };
      days.push(byKey[key]);
    }
    byKey[key].rows.push({ set: set, idx: idx });
  });
  return days;
}

/**
 * Index of the day bucket containing setId; falls back to the last bucket (oldest day)
 * when the id isn't found.
 * @param {Array} days output of groupLabHistoryByDay
 * @param {(set: object, idx: number) => string} idFn
 * @param {string} setId
 */
export function findLabHistoryDayIndexForSet(days, idFn, setId) {
  for (var i = 0; i < days.length; i++) {
    var found = days[i].rows.some(function (row) {
      return idFn(row.set, row.idx) === setId;
    });
    if (found) return i;
  }
  return days.length ? days.length - 1 : -1;
}

/** Clamped day step — stays at either end instead of wrapping. */
export function stepLabHistoryDayIndex(days, currentIndex, delta) {
  if (!days || !days.length) return -1;
  var next = currentIndex + delta;
  if (next < 0) return 0;
  if (next > days.length - 1) return days.length - 1;
  return next;
}

/** Most recent set (first row — `days` is newest-first) within a day bucket. */
export function latestSetIdInLabHistoryDay(day, idFn) {
  if (!day || !day.rows.length) return '';
  return idFn(day.rows[0].set, day.rows[0].idx);
}
