/** clinical.persistSnapshot → cloud LWW ops (mapped keys only). */

import {
  cloudOp,
  isProjectablePatientId,
  pickCensusFields,
} from './op-encoder-shared.mjs';

const ENTRY_MAP_KEYS = Object.freeze({
  notes: 'note',
  indicaciones: 'indicaciones',
});

/**
 * Keys without a Worker LWW path yet.
 * Do NOT emit `blobs/{key}` — Worker rejects unsupported_path.
 * Returning no ops lets the projector skip/mark synced; local SQLCipher still
 * holds med/vpo/listado via clinical-repo. Nube paths for these await a later slice.
 */
const SYNC_SKIP_KEYS = new Set([
  'medRecetaByPatient',
  'medPharmProfileByPatient',
  'recetaHuByPatient',
  'listadoProblemas',
  'vpoByPatient',
]);

/** @param {unknown} note @param {string} fallback */
function noteOpUpdatedAt(note, fallback) {
  if (!note || typeof note !== 'object') return fallback;
  const row = /** @type {{ updatedAt?: unknown, savedAt?: unknown }} */ (note);
  const at = String(row.updatedAt || row.savedAt || '').trim();
  return at || fallback;
}

/** @param {unknown} set @param {number} index */
function labSetId(set, index) {
  const row = set && typeof set === 'object' ? set : {};
  return String(
    /** @type {{ id?: unknown, fecha?: unknown }} */ (row).id ||
      /** @type {{ fecha?: unknown }} */ (row).fecha ||
      `idx-${index}`
  ).trim();
}

/** @param {unknown} set @param {string} fallback */
function labSetUpdatedAt(set, fallback) {
  if (!set || typeof set !== 'object') return fallback;
  const row = /** @type {{ updatedAt?: unknown, fecha?: unknown, at?: unknown }} */ (set);
  const at = String(row.updatedAt || row.at || row.fecha || '').trim();
  return at || fallback;
}

/**
 * @param {object[]} patients
 * @param {string} actorId
 * @param {string} fallback
 */
function encodePatientsBlob(patients, actorId, fallback) {
  /** @type {{ path: string, value: unknown, updatedAt: string, actorId: string }[]} */
  const ops = [];
  const list = Array.isArray(patients) ? patients : [];
  for (let i = 0; i < list.length; i += 1) {
    const patient = list[i];
    if (!patient || typeof patient !== 'object') continue;
    const patientId = String(/** @type {{ id?: unknown }} */ (patient).id || '').trim();
    if (!isProjectablePatientId(patientId)) continue;
    const fields = pickCensusFields(/** @type {Record<string, unknown>} */ (patient));
    if (!Object.keys(fields).length) continue;
    const fieldsAt =
      String(/** @type {{ lanUpdatedAt?: unknown }} */ (patient).lanUpdatedAt || '').trim() ||
      fallback;
    ops.push(
      cloudOp({
        path: `entries/${patientId}/fields`,
        value: fields,
        updatedAt: fieldsAt,
        actorId,
      })
    );
  }
  return ops;
}

/**
 * @param {string} entryField
 * @param {unknown} map
 * @param {string} actorId
 * @param {string} fallback
 */
function encodePatientMapBlob(entryField, map, actorId, fallback) {
  /** @type {{ path: string, value: unknown, updatedAt: string, actorId: string }[]} */
  const ops = [];
  if (!map || typeof map !== 'object' || Array.isArray(map)) return ops;
  for (const [pid, value] of Object.entries(map)) {
    const patientId = String(pid || '').trim();
    if (!isProjectablePatientId(patientId)) continue;
    ops.push(
      cloudOp({
        path: `entries/${patientId}/${entryField}`,
        value: value == null ? {} : value,
        updatedAt: noteOpUpdatedAt(value, fallback),
        actorId,
      })
    );
  }
  return ops;
}

/**
 * @param {unknown} labHistory
 * @param {string} actorId
 * @param {string} fallback
 */
function encodeLabHistoryBlob(labHistory, actorId, fallback) {
  /** @type {{ path: string, value: unknown, updatedAt: string, actorId: string }[]} */
  const ops = [];
  if (!labHistory || typeof labHistory !== 'object' || Array.isArray(labHistory)) return ops;
  for (const [pid, sets] of Object.entries(labHistory)) {
    const patientId = String(pid || '').trim();
    if (!isProjectablePatientId(patientId)) continue;
    const list = Array.isArray(sets) ? sets : [];
    for (let i = 0; i < list.length; i += 1) {
      const setId = labSetId(list[i], i);
      if (!setId) continue;
      ops.push(
        cloudOp({
          path: `labSidecars/${patientId}/${setId}`,
          value: list[i],
          updatedAt: labSetUpdatedAt(list[i], fallback),
          actorId,
        })
      );
    }
  }
  return ops;
}

/**
 * @param {{
 *   commandType: string,
 *   blobKeys?: string[],
 *   blobs?: Record<string, unknown>,
 *   actorId?: string | null,
 *   fallbackUpdatedAt: string,
 * }} args
 * @returns {{ path: string, value: unknown, updatedAt: string, actorId: string }[]}
 */
export function encodePersistSnapshotOps(args) {
  if (String(args?.commandType || '') !== 'clinical.persistSnapshot') return [];
  const blobKeys = Array.isArray(args?.blobKeys) ? args.blobKeys : [];
  if (!blobKeys.length) return [];

  const blobs = args?.blobs && typeof args.blobs === 'object' ? args.blobs : {};
  const actorId = String(args?.actorId || '').trim() || 'local';
  const fallback = String(args?.fallbackUpdatedAt || '').trim() || new Date().toISOString();

  /** @type {{ path: string, value: unknown, updatedAt: string, actorId: string }[]} */
  const ops = [];
  for (let i = 0; i < blobKeys.length; i += 1) {
    const key = String(blobKeys[i] || '').trim();
    if (!key) continue;
    const value = blobs[key];

    if (key === 'patients') {
      ops.push(...encodePatientsBlob(/** @type {object[]} */ (value), actorId, fallback));
      continue;
    }
    if (key === 'labHistory') {
      ops.push(...encodeLabHistoryBlob(value, actorId, fallback));
      continue;
    }
    const entryField = ENTRY_MAP_KEYS[/** @type {keyof typeof ENTRY_MAP_KEYS} */ (key)];
    if (entryField) {
      ops.push(...encodePatientMapBlob(entryField, value, actorId, fallback));
      continue;
    }
    // Local-only until Nube paths exist — skip (empty → projector marks synced).
    if (SYNC_SKIP_KEYS.has(key)) continue;
  }
  return ops;
}
