/**
 * Hydrate clinical-read-model from SQLCipher blobs (preferred) or storage getters.
 * Additive P5 path — does not replace app-state / saveState yet.
 */

import { mapBlobsToAppState } from './db-storage-bridge.mjs';
import { hydrateClinicalReadModel } from './clinical-read-model.mjs';

const MAP_FIELDS = [
  'notes',
  'indicaciones',
  'labHistory',
  'medRecetaByPatient',
  'medPharmProfileByPatient',
  'recetaHuByPatient',
  'listadoProblemas',
  'vpoByPatient',
];

const STORAGE_GETTERS = [
  ['patients', 'getPatients'],
  ['notes', 'getNotes'],
  ['indicaciones', 'getIndicaciones'],
  ['labHistory', 'getLabHistory'],
  ['medRecetaByPatient', 'getMedRecetaByPatient'],
  ['medPharmProfileByPatient', 'getMedPharmProfileByPatient'],
  ['recetaHuByPatient', 'getRecetaHuByPatient'],
  ['listadoProblemas', 'getListadoProblemas'],
  ['vpoByPatient', 'getVpoByPatient'],
];

/**
 * @returns {boolean}
 */
export function canHydrateClinicalRepoFromDb() {
  return !!(
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.dbClinicalLoadAll === 'function'
  );
}

/** @param {unknown} value */
function asPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * @param {Record<string, unknown>} fields
 */
function snapshotFromFields(fields) {
  const f = fields && typeof fields === 'object' ? fields : {};
  const snap = {
    patients: Array.isArray(f.patients) ? f.patients : [],
  };
  for (const key of MAP_FIELDS) {
    snap[key] = asPlainObject(f[key]);
  }
  return snap;
}

/**
 * @param {object} storage
 */
function snapshotFromStorage(storage) {
  if (!storage || typeof storage !== 'object') return null;
  const fields = {};
  let any = false;
  for (const [field, method] of STORAGE_GETTERS) {
    if (typeof storage[method] !== 'function') continue;
    try {
      fields[field] = storage[method]();
      any = true;
    } catch {
      return null;
    }
  }
  if (!any) return null;
  return snapshotFromFields(fields);
}

/**
 * @returns {Promise<{ ok: boolean, source?: 'db', error?: string }>}
 */
async function hydrateFromDb() {
  try {
    const res = await window.electronAPI.dbClinicalLoadAll();
    if (!res || res.ok === false) {
      return { ok: false, error: String(res?.code || res?.error || 'DB_LOAD_FAILED') };
    }
    const blobs = res.blobs && typeof res.blobs === 'object' ? res.blobs : {};
    hydrateClinicalReadModel(snapshotFromFields(mapBlobsToAppState(blobs)));
    return { ok: true, source: 'db' };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err || 'DB_LOAD_FAILED') };
  }
}

/**
 * @param {object|null|undefined} storageOpt
 * @returns {Promise<object|null>}
 */
async function resolveStorage(storageOpt) {
  if (storageOpt) return storageOpt;
  try {
    const mod = await import('./storage.js');
    return mod.storage || mod.default || null;
  } catch {
    return null;
  }
}

/**
 * Load clinical blobs into the read model.
 * Prefers `window.electronAPI.dbClinicalLoadAll`; falls back to storage getters.
 *
 * @param {{ storage?: object }} [opts]
 * @returns {Promise<{ ok: boolean, source?: 'db'|'storage', error?: string }>}
 */
export async function hydrateClinicalRepoIntoReadModel(opts = {}) {
  if (canHydrateClinicalRepoFromDb()) {
    return hydrateFromDb();
  }
  const snap = snapshotFromStorage(await resolveStorage(opts.storage));
  if (!snap) {
    return { ok: false, error: 'hydrate_unavailable' };
  }
  hydrateClinicalReadModel(snap);
  return { ok: true, source: 'storage' };
}
