/**
 * Pure pick/validate for clinical.persistSnapshot payloads and IPC command replies.
 * Keys match saveAll clinical domain blobs (see clinical-blob-keys / storage-save-all-helpers).
 */

export const CLINICAL_PERSIST_BLOB_KEYS = Object.freeze([
  'patients',
  'notes',
  'indicaciones',
  'labHistory',
  'medRecetaByPatient',
  'medPharmProfileByPatient',
  'recetaHuByPatient',
  'listadoProblemas',
  'vpoByPatient',
]);

const MAP_KEYS = new Set(CLINICAL_PERSIST_BLOB_KEYS.filter((k) => k !== 'patients'));

/**
 * @param {Record<string, unknown>} payload
 * @returns {{ ok: true, changedKeys: string[], snapshot: Record<string, unknown> } | { ok: false, error: string }}
 */
export function pickPersistSnapshot(payload) {
  const src = payload && typeof payload === 'object' ? payload : {};
  /** @type {Record<string, unknown>} */
  const snapshot = {};
  /** @type {string[]} */
  const changedKeys = [];

  for (const key of CLINICAL_PERSIST_BLOB_KEYS) {
    if (src[key] === undefined) continue;
    const value = src[key];
    if (key === 'patients') {
      if (!Array.isArray(value)) return { ok: false, error: 'invalid_patients' };
      snapshot.patients = value;
      changedKeys.push('patients');
      continue;
    }
    if (MAP_KEYS.has(key)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, error: `invalid_${key}` };
      }
      snapshot[key] = value;
      changedKeys.push(key);
    }
  }

  if (!changedKeys.length) return { ok: false, error: 'empty_snapshot' };
  return { ok: true, changedKeys, snapshot };
}

/**
 * IPC reply for a successful clinical-repo command.
 * `echoSnapshot: false` skips census/domain blobs so the renderer does not
 * deserialize the full patients array on every eventualidad add/delete.
 * @param {Record<string, unknown>} result
 * @param {{ echoSnapshot?: boolean }} [meta]
 */
export function clinicalCommandIpcResult(result, meta) {
  const src = result && typeof result === 'object' ? result : {};
  const base = {
    ok: true,
    changedKeys: Array.isArray(src.changedKeys) ? src.changedKeys : [],
    changeId: src.changeId != null ? src.changeId : null,
  };
  if (meta && meta.echoSnapshot === false) return base;
  /** @type {Record<string, unknown>} */
  const fields = {};
  for (const key of CLINICAL_PERSIST_BLOB_KEYS) {
    if (src[key] === undefined) continue;
    fields[key] = src[key];
  }
  return Object.assign(base, fields);
}
