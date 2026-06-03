/**
 * LAN LiveSync helpers for V2 clinical ops SQL tables (rotation, assignments, guardia).
 */

import {
  mergeClinicalOpsFromSourcesData,
  mergeClinicalOpsSnapshotsData,
} from './clinical-ops-bundle-merge.mjs';

let cachedSnapshot = null;

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

export function isClinicalOpsLanAvailable() {
  const api = dbApi();
  return !!(
    api &&
    typeof api.dbClinicalOpsExport === 'function' &&
    typeof api.dbClinicalOpsMerge === 'function'
  );
}

/** @returns {Promise<object|null>} */
export async function refreshClinicalOpsSnapshotCache() {
  cachedSnapshot = await collectClinicalOpsForLanSync();
  return cachedSnapshot;
}

/** Refresh export cache when LAN bundles are built or clinical session starts. */
export async function prepareClinicalOpsForLanSync() {
  if (!isClinicalOpsLanAvailable()) return null;
  return refreshClinicalOpsSnapshotCache();
}

/** @returns {object|null} */
export function getCachedClinicalOpsSnapshot() {
  return cachedSnapshot;
}

/** @returns {Promise<object|null>} */
export async function collectClinicalOpsForLanSync() {
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsExport !== 'function') return null;
  const res = await api.dbClinicalOpsExport();
  if (!res || res.ok === false) return null;
  return res.snapshot && typeof res.snapshot === 'object' ? res.snapshot : null;
}

/** @param {object|null} snapshot */
export async function applyClinicalOpsLanSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsMerge !== 'function') return false;
  const res = await api.dbClinicalOpsMerge({ snapshot });
  return !!(res && res.ok !== false);
}

/** @param {object[]} sources */
export function mergeClinicalOpsFromSources(sources) {
  return mergeClinicalOpsFromSourcesData(sources);
}

export { mergeClinicalOpsSnapshotsData };
