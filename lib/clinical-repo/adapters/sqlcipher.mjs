import { getBlob, upsertBlob } from '../../db/clinical-blobs.mjs';

/** @param {import('better-sqlite3').Database} db */
export function loadPatientsBlob(db) {
  const raw = getBlob(db, 'patients');
  if (raw == null || raw === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object[]} patients
 * @param {string} [updatedAt]
 */
export function savePatientsBlob(db, patients, updatedAt = new Date().toISOString()) {
  upsertBlob(db, 'patients', JSON.stringify(patients), updatedAt);
}
