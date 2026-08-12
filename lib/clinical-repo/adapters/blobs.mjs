import { getBlob, upsertBlob } from '../../db/clinical-blobs.mjs';
import { CLINICAL_PERSIST_BLOB_KEYS } from '../transforms/persist-snapshot.mjs';

export { CLINICAL_PERSIST_BLOB_KEYS };

/** @param {string} blobKey */
function defaultForKey(blobKey) {
  return blobKey === 'patients' ? [] : {};
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} blobKey
 */
export function loadClinicalBlobValue(db, blobKey) {
  const key = String(blobKey || '').trim();
  const fallback = defaultForKey(key);
  const raw = getBlob(db, key);
  if (raw == null || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (key === 'patients') return Array.isArray(parsed) ? parsed : [];
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} blobKey
 * @param {unknown} value
 * @param {string} [updatedAt]
 */
export function saveClinicalBlobValue(db, blobKey, value, updatedAt = new Date().toISOString()) {
  const key = String(blobKey || '').trim();
  if (!key) return;
  upsertBlob(db, key, JSON.stringify(value), updatedAt);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} keys
 * @returns {Record<string, unknown>}
 */
export function loadClinicalBlobValues(db, keys) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of keys) {
    out[key] = loadClinicalBlobValue(db, key);
  }
  return out;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {Record<string, unknown>} snapshot
 * @param {string} [updatedAt]
 */
export function saveClinicalBlobValues(db, snapshot, updatedAt = new Date().toISOString()) {
  const src = snapshot && typeof snapshot === 'object' ? snapshot : {};
  for (const key of CLINICAL_PERSIST_BLOB_KEYS) {
    if (src[key] === undefined) continue;
    saveClinicalBlobValue(db, key, src[key], updatedAt);
  }
}
