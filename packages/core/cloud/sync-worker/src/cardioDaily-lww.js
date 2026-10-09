/**
 * cardioDaily = `{ pocusByDay: Row[], rondasByDay: Row[] }`, the HF daily bedside
 * lists. Union each list by `date`; same date → newer row `updatedAt` wins as a
 * whole row, a row with no `updatedAt` loses, a tie keeps the stored row. Sorted
 * by date. Worker-local copy of packages/hf lib/cardio/cardio-daily.mjs (the Worker does not
 * import client code — same pattern clinical-ops-lww.js uses).
 */

/** @param {unknown} row */
function rowAt(row) {
  return String(/** @type {{ updatedAt?: unknown }} */ (row)?.updatedAt || '');
}

/** @param {unknown} stored @param {unknown} incoming */
function mergeRowsByDate(stored, incoming) {
  const map = new Map();
  const all = (Array.isArray(stored) ? stored : []).concat(Array.isArray(incoming) ? incoming : []);
  for (const row of all) {
    if (!row || typeof row !== 'object') continue;
    const key = String(row.date || '');
    const cur = map.get(key);
    if (!cur || rowAt(row) > rowAt(cur)) map.set(key, row);
  }
  return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * @param {unknown} storedIn currently stored cardioDaily
 * @param {unknown} incomingIn incoming pushed cardioDaily
 */
export function mergeCardioDailyLww(storedIn, incomingIn) {
  if (!storedIn || typeof storedIn !== 'object') return incomingIn;
  if (!incomingIn || typeof incomingIn !== 'object') return storedIn;
  const a = /** @type {any} */ (storedIn);
  const b = /** @type {any} */ (incomingIn);
  return {
    pocusByDay: mergeRowsByDate(a.pocusByDay, b.pocusByDay),
    rondasByDay: mergeRowsByDate(a.rondasByDay, b.rondasByDay),
  };
}
