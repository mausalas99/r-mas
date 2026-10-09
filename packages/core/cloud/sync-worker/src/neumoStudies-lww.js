/**
 * neumoStudies = `{ spirometry: Study[], pleural: Study[] }`, R+ Neumo saved
 * studies. Study = `{ id, date: 'YYYY-MM-DD', inputs, result, engine, updatedAt, deleted? }`.
 * Union each list by `id`; same id → newer study `updatedAt` wins as a whole
 * study, a study with no `updatedAt` loses, a tie keeps the stored study.
 * Deletes are tombstones (`deleted: true`), so they win only by being newer.
 * Sorted by date, then id. Core never sends this path.
 *
 * Under E2EE the Worker sees only ciphertext and the newest op replaces the
 * whole value (lww.js), so clients must merge before push: pull, decrypt,
 * merge by id, push the full union. Desktop: public/js/features/cloud-sync/
 * neumo-studies-sync.mjs re-exports this function; iOS must do the same.
 */

/** @param {unknown} study */
function studyAt(study) {
  return String(/** @type {{ updatedAt?: unknown }} */ (study)?.updatedAt || '');
}

/** @param {unknown} stored @param {unknown} incoming */
function mergeStudiesById(stored, incoming) {
  const map = new Map();
  const all = (Array.isArray(stored) ? stored : []).concat(Array.isArray(incoming) ? incoming : []);
  for (const study of all) {
    if (!study || typeof study !== 'object' || !study.id) continue;
    const key = String(study.id);
    const cur = map.get(key);
    if (!cur || studyAt(study) > studyAt(cur)) map.set(key, study);
  }
  return Array.from(map.values()).sort(
    (a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id))
  );
}

/**
 * @param {unknown} storedIn currently stored (or local) neumoStudies
 * @param {unknown} incomingIn incoming (or pulled) neumoStudies
 */
export function mergeNeumoStudiesLww(storedIn, incomingIn) {
  if (!storedIn || typeof storedIn !== 'object') return incomingIn;
  if (!incomingIn || typeof incomingIn !== 'object') return storedIn;
  const a = /** @type {any} */ (storedIn);
  const b = /** @type {any} */ (incomingIn);
  return {
    spirometry: mergeStudiesById(a.spirometry, b.spirometry),
    pleural: mergeStudiesById(a.pleural, b.pleural),
  };
}

/**
 * Op clock: the max study `updatedAt`; none → epoch (loses to any real save).
 * Never the batch "now".
 * @param {unknown} value
 */
export function neumoStudiesUpdatedAt(value) {
  const v = /** @type {any} */ (value) || {};
  let max = '';
  for (const s of [...(Array.isArray(v.spirometry) ? v.spirometry : []), ...(Array.isArray(v.pleural) ? v.pleural : [])]) {
    const at = studyAt(s);
    if (at > max) max = at;
  }
  return max || '1970-01-01T00:00:00.000Z';
}
