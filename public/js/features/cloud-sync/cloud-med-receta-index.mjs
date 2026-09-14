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

export const CLOUD_MED_RECETA_FP_INDEX_KEY = 'rpc-cloud-sync-med-receta-fp-index';

/** @param {unknown} medReceta */
export function cloudMedRecetaFingerprint(medReceta) {
  return canonicalStringify(medReceta || null);
}

/** @returns {Record<string, string>} */
export function readMedRecetaFingerprintIndex() {
  try {
    const raw = localStorage.getItem(CLOUD_MED_RECETA_FP_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} index */
function writeMedRecetaFingerprintIndex(index) {
  try {
    localStorage.setItem(CLOUD_MED_RECETA_FP_INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    console.warn('[cloud-med-receta-index] failed to write ' + CLOUD_MED_RECETA_FP_INDEX_KEY, e);
  }
}

/**
 * @param {string} patientId
 * @param {unknown} medReceta
 * @param {Record<string, string>} [index]
 */
export function shouldSkipCloudMedRecetaPush(patientId, medReceta, index) {
  const pid = String(patientId || '').trim();
  if (!pid) return true;
  const path = `entries/${pid}/medReceta`;
  const idx = index || readMedRecetaFingerprintIndex();
  return idx[path] === cloudMedRecetaFingerprint(medReceta);
}

/** Call once ops actually got sent (chunk acked, applied or rejected). @param {unknown[]} ops */
export function noteCloudMedRecetaOpsSent(ops) {
  if (!Array.isArray(ops) || !ops.length) return 0;
  const idx = readMedRecetaFingerprintIndex();
  let n = 0;
  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    const path = String(/** @type {{ path?: unknown }} */ (op).path || '');
    if (!/^entries\/[^/]+\/medReceta$/.test(path)) continue;
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
    if (!pid || !Object.prototype.hasOwnProperty.call(entry, 'medReceta')) continue;
    idx[`entries/${pid}/medReceta`] = cloudMedRecetaFingerprint(
      /** @type {{ medReceta?: unknown }} */ (entry).medReceta
    );
    n += 1;
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
