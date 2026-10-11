/**
 * R+ Neumo saved studies, path `entries/{id}/neumoStudies`. Core never sets
 * `patient.neumoStudies`, so every function here is a no-op in core and HF.
 *
 * Value `{ spirometry: Study[], pleural: Study[] }`,
 * Study `{ id, date: 'YYYY-MM-DD', inputs, result, engine, updatedAt, deleted? }`.
 * Merge: union by `id`; same id → newer `updatedAt` wins as a whole study; no
 * `updatedAt` loses; a tie keeps local. Deletes are tombstones. Sorted by date.
 * Same rule as the Worker (cloud/sync-worker/src/neumoStudies-lww.js, kept in
 * step by neumo-studies-sync.test.mjs).
 *
 * Under E2EE (Neumo rooms) the Worker cannot read the value: the newest op
 * replaces it whole. So the client merges: pull, decrypt, merge by id, push the
 * full union. A local study the room lacks is re-stamped on pull so the union
 * op is newer than the room's copy. iOS must do the same.
 *
 * Import-free on purpose: pull-apply-state.mjs (pure) and cloud-op-slim.mjs both use it.
 */

export const NEUMO_STUDIES_LISTS = /** @type {const} */ (['spirometry', 'pleural']);
export const CLOUD_NEUMO_STUDIES_MAX_BYTES = 150 * 1024;
const EPOCH = '1970-01-01T00:00:00.000Z';

/** @param {unknown} v */
const utf8JsonBytes = (v) => new TextEncoder().encode(JSON.stringify(v)).length;

/** @param {unknown} v */
const plain = (v) => !!v && typeof v === 'object' && /** @type {any} */ (v).enc !== 1;
/** @param {unknown} s */
const studyAt = (s) => String(/** @type {any} */ (s)?.updatedAt || '');
/** @param {any} v @param {string} k */
const list = (v, k) => (Array.isArray(v?.[k]) ? v[k] : []);

/** @param {unknown[]} local @param {unknown[]} incoming */
function mergeById(local, incoming) {
  const map = new Map();
  for (const s of [...local, ...incoming]) {
    if (!s || typeof s !== 'object' || !(/** @type {any} */ (s).id)) continue;
    const key = String(/** @type {any} */ (s).id);
    const cur = map.get(key);
    if (!cur || studyAt(s) > studyAt(cur)) map.set(key, s);
  }
  return [...map.values()].sort(
    (a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id).localeCompare(String(b.id))
  );
}

/** @param {unknown} local @param {unknown} incoming */
export function mergeNeumoStudies(local, incoming) {
  if (!plain(local)) return incoming;
  if (!plain(incoming)) return local;
  return {
    spirometry: mergeById(list(local, 'spirometry'), list(incoming, 'spirometry')),
    pleural: mergeById(list(local, 'pleural'), list(incoming, 'pleural')),
  };
}

/** Op clock: max study `updatedAt`, else epoch. Never the batch "now". @param {unknown} value */
export function neumoStudiesUpdatedAt(value) {
  let max = '';
  for (const k of NEUMO_STUDIES_LISTS) for (const s of list(value, k)) if (studyAt(s) > max) max = studyAt(s);
  return max || EPOCH;
}

/** @param {unknown} value */
export function hasNeumoStudies(value) {
  return plain(value) && NEUMO_STUDIES_LISTS.some((k) => list(value, k).length > 0);
}

/**
 * Drop the oldest studies (by date, across both lists) from the op until it fits.
 * Local studies stay. Ciphertext passes through.
 * @param {unknown} value @param {number} [maxBytes]
 */
export function fitNeumoStudiesToQuota(value, maxBytes = CLOUD_NEUMO_STUDIES_MAX_BYTES) {
  if (!plain(value) || utf8JsonBytes(value) <= maxBytes) return value;
  const all = NEUMO_STUDIES_LISTS.flatMap((k) => list(value, k).map((s) => ({ k, s })));
  all.sort((a, b) => String(a.s?.date || '').localeCompare(String(b.s?.date || '')));
  const drop = new Set();
  const build = () => ({
    ...value,
    spirometry: list(value, 'spirometry').filter((s) => !drop.has(s)),
    pleural: list(value, 'pleural').filter((s) => !drop.has(s)),
  });
  let out = build();
  for (const { s } of all) {
    if (utf8JsonBytes(out) <= maxBytes) break;
    drop.add(s);
    out = build();
  }
  return out;
}

/**
 * Pull: fold the room's studies into the local patient. Never drops a local study.
 * Local studies the room lacks get a fresh `updatedAt`, so the next push (full
 * union) beats the room's whole-value copy under E2EE.
 * @param {Record<string, any>} patient local patient (mutated)
 * @param {unknown} incoming room value
 * @param {string} [nowIso]
 * @returns {{ changed: boolean, repush: boolean }}
 */
export function applyNeumoStudiesToPatient(patient, incoming, nowIso = new Date().toISOString()) {
  if (!patient || !plain(incoming)) return { changed: false, repush: false };
  const roomIds = new Set(NEUMO_STUDIES_LISTS.flatMap((k) => list(incoming, k).map((s) => String(s?.id))));
  const merged = /** @type {any} */ (mergeNeumoStudies(patient.neumoStudies, incoming));
  let repush = false;
  for (const k of NEUMO_STUDIES_LISTS) {
    merged[k] = merged[k].map((s) => {
      if (roomIds.has(String(s.id))) return s;
      repush = true;
      return { ...s, updatedAt: nowIso > studyAt(s) ? nowIso : studyAt(s) };
    });
  }
  const changed = JSON.stringify(merged) !== JSON.stringify(patient.neumoStudies ?? null);
  if (changed) patient.neumoStudies = merged;
  return { changed, repush };
}
