import { loadClinicalBlobValue, saveClinicalBlobValue } from './blobs.mjs';

/** @param {import('better-sqlite3').Database} db */
export function loadPatientsBlob(db) {
  return /** @type {object[]} */ (loadClinicalBlobValue(db, 'patients'));
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object[]} patients
 * @param {string} [updatedAt]
 */
export function savePatientsBlob(db, patients, updatedAt = new Date().toISOString()) {
  saveClinicalBlobValue(db, 'patients', patients, updatedAt);
}

export {
  loadClinicalBlobValue,
  saveClinicalBlobValue,
  loadClinicalBlobValues,
  saveClinicalBlobValues,
  CLINICAL_PERSIST_BLOB_KEYS,
} from './blobs.mjs';
