/**
 * Fingerprint index for the medReceta ("Manejo") path — skip re-push when the content
 * hasn't changed since we last sent (or pulled) it.
 *
 * medReceta carries no real edit clock (only a day-precision fechaActualizacion), so the
 * op builders stamp it with the batch's "now" on every push. Without this guard, an
 * unrelated edit (notas, vitals, anything on the debounced live bundle) re-sends this
 * device's — possibly stale — local medReceta with a fresh "now" clock, which always
 * beats a genuinely newer edit a teammate made and this device hasn't pulled yet. That
 * silently wipes their meds — the reported "manejo se borra" bug.
 */
import { canonicalStringify } from '../../../../lib/db/canonical-json.mjs';
import { createOpFold, foldCloudOp } from './pull-apply-state.mjs';
import { createIdbBackedSlot } from './idb-index-store.mjs';

/** Entry paths with no real edit clock — all ride this same skip-if-unchanged guard. */
export const FP_FIELDS = ['medReceta', 'vpo', 'listadoProblemas', 'medPharmProfile'];
const FP_PATH_RE = /^entries\/[^/]+\/(medReceta|vpo|listadoProblemas|medPharmProfile)$/;

export const CLOUD_MED_RECETA_FP_INDEX_KEY = 'rpc-cloud-sync-med-receta-fp-index';

const slot = createIdbBackedSlot(CLOUD_MED_RECETA_FP_INDEX_KEY, () => ({}));

/** Test-only: force the in-memory index back to empty. */
export function __resetMedRecetaIndexForTests() {
  slot.resetForTests();
}

// One entry per patient ever synced, never pruned on delete — bound it by
// serialized size so it can't alone bloat past a reasonable footprint.
// Evicting a stale entry only costs one extra resend next sync, never a
// wrongly-skipped push.
const FP_INDEX_MAX_BYTES = 1_000_000;

/** @param {Record<string, string>} index */
function trimFingerprintIndex(index) {
  let keys = Object.keys(index);
  let size = JSON.stringify(index).length;
  while (keys.length && size > FP_INDEX_MAX_BYTES) {
    const avgBytes = size / keys.length;
    const removeCount = Math.min(keys.length, Math.max(1, Math.ceil(((size - FP_INDEX_MAX_BYTES) / avgBytes) * 1.1)));
    for (let i = 0; i < removeCount; i += 1) delete index[keys[i]];
    keys = Object.keys(index);
    size = JSON.stringify(index).length;
  }
  return index;
}

/** @param {unknown} medReceta */
export function cloudMedRecetaFingerprint(medReceta) {
  return canonicalStringify(medReceta || null);
}

/** @returns {Record<string, string>} */
export function readMedRecetaFingerprintIndex() {
  const idx = slot.read();
  return idx && typeof idx === 'object' ? idx : {};
}

/** @param {Record<string, string>} index */
function writeMedRecetaFingerprintIndex(index) {
  slot.write(trimFingerprintIndex(index));
}

/**
 * @param {string} patientId
 * @param {unknown} medReceta
 * @param {Record<string, string>} [index]
 * @param {string} [field] one of FP_FIELDS
 */
export function shouldSkipCloudMedRecetaPush(patientId, medReceta, index, field = 'medReceta') {
  const pid = String(patientId || '').trim();
  if (!pid) return true;
  const path = `entries/${pid}/${field}`;
  const idx = index || readMedRecetaFingerprintIndex();
  return idx[path] === cloudMedRecetaFingerprint(medReceta);
}

/** Index value meaning "deleted on this device, clear not sent yet". */
const CLEAR_PENDING = '__clear_pending__';

/**
 * A user deleted this record on this device: the next bundle sends a clear (null).
 * Only an explicit delete marks it — a record merely missing locally is never sent
 * as a clear, or a device that never had it would wipe a teammate's copy.
 * @param {string} patientId @param {string} field one of FP_FIELDS
 */
export function markCloudEntryCleared(patientId, field) {
  const pid = String(patientId || '').trim();
  if (!pid) return;
  const idx = readMedRecetaFingerprintIndex();
  idx[`entries/${pid}/${field}`] = CLEAR_PENDING;
  writeMedRecetaFingerprintIndex(idx);
}

/** @param {string} patientId @param {string} field */
export function isCloudEntryClearPending(patientId, field) {
  return readMedRecetaFingerprintIndex()[`entries/${String(patientId || '').trim()}/${field}`] === CLEAR_PENDING;
}

/** Call once ops actually got sent (chunk acked, applied or rejected). @param {unknown[]} ops */
export function noteCloudMedRecetaOpsSent(ops) {
  if (!Array.isArray(ops) || !ops.length) return 0;
  const idx = readMedRecetaFingerprintIndex();
  let n = 0;
  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    const path = String(/** @type {{ path?: unknown }} */ (op).path || '');
    if (!FP_PATH_RE.test(path)) continue;
    idx[path] = cloudMedRecetaFingerprint(/** @type {{ value?: unknown }} */ (op).value);
    n += 1;
  }
  if (n) writeMedRecetaFingerprintIndex(idx);
  return n;
}

/** @param {unknown[]} entries */
function seedMedRecetaFingerprintsFromEntries(entries) {
  if (!Array.isArray(entries) || !entries.length) return 0;
  const idx = readMedRecetaFingerprintIndex();
  let n = 0;
  for (const entry of entries) {
    const pid = String(/** @type {{ id?: unknown }} */ (entry)?.id || '').trim();
    if (!pid) continue;
    for (const field of FP_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) continue;
      idx[`entries/${pid}/${field}`] = cloudMedRecetaFingerprint(/** @type {Record<string, unknown>} */ (entry)[field]);
      n += 1;
    }
  }
  if (n) writeMedRecetaFingerprintIndex(idx);
  return n;
}

/** Seed the index from a pull so we don't immediately re-push what we just received. @param {unknown} result */
export function noteCloudMedRecetaFromPullResult(result) {
  if (!result || typeof result !== 'object') return 0;
  /** @type {{ state?: { entries?: unknown[] }, ops?: unknown[] }} */
  const row = result;
  if (row.state) return seedMedRecetaFingerprintsFromEntries(row.state.entries || []);
  if (!Array.isArray(row.ops) || !row.ops.length) return 0;
  const fold = createOpFold();
  for (let i = 0; i < row.ops.length; i += 1) {
    foldCloudOp(fold, row.ops[i]);
  }
  return seedMedRecetaFingerprintsFromEntries([...fold.entries.values()]);
}
