/**
 * `cardio.scores` — dated NYHA/MLWHFQ/KCCQ/6MWT/MAGGIC/SHFM/HFSS entries.
 * Scores are recorded (from external calculators), not computed here.
 */

export function emptyScoreEntry() {
  return {
    date: '',
    nyha: '',
    mlwhfq: null,
    kccq: null,
    sixMwtMeters: null,
    maggic: null,
    shfm: null,
    hfss: null,
  };
}

/**
 * Prefer explicit `next` when the key is present on `record`; otherwise keep `prev`.
 * @template T
 * @param {Record<string, unknown>} record
 * @param {string} key
 * @param {T} prevVal
 * @param {T} emptyVal
 * @returns {T}
 */
function coalesceField(record, key, prevVal, emptyVal) {
  if (Object.prototype.hasOwnProperty.call(record, key)) {
    const v = record[key];
    return /** @type {T} */ (v === undefined || v === null ? emptyVal : v);
  }
  return prevVal !== undefined && prevVal !== null ? prevVal : emptyVal;
}

export function upsertScoreEntry(list, entry) {
  const date = String(entry.date || '').trim();
  const out = Array.isArray(list) ? list.slice() : [];
  const idx = out.findIndex((r) => r && r.date === date);
  const prev = idx >= 0 ? out[idx] : null;

  const row = {
    date,
    nyha: String(coalesceField(entry, 'nyha', prev && prev.nyha, '') || ''),
    mlwhfq: coalesceField(entry, 'mlwhfq', prev && prev.mlwhfq, null),
    kccq: coalesceField(entry, 'kccq', prev && prev.kccq, null),
    sixMwtMeters: coalesceField(entry, 'sixMwtMeters', prev && prev.sixMwtMeters, null),
    maggic: coalesceField(entry, 'maggic', prev && prev.maggic, null),
    shfm: coalesceField(entry, 'shfm', prev && prev.shfm, null),
    hfss: coalesceField(entry, 'hfss', prev && prev.hfss, null),
  };

  if (idx >= 0) out[idx] = row;
  else out.push(row);
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

/**
 * Most recent two entries by date, for Previo/Actual rendering.
 * @param {any[]} list
 * @returns {{ previo: any|null, actual: any|null }}
 */
export function latestTwoScores(list) {
  const sorted = (Array.isArray(list) ? list.slice() : []).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const n = sorted.length;
  return {
    actual: n >= 1 ? sorted[n - 1] : null,
    previo: n >= 2 ? sorted[n - 2] : null,
  };
}
