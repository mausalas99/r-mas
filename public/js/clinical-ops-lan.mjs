/**
 * LAN LiveSync helpers for V2 clinical ops SQL tables (rotation, assignments, guardia).
 */

let cachedSnapshot = null;

function dbApi() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
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

/**
 * Last-write-wins pick across LAN bundle sources by exportedAt.
 * @param {object[]} sources
 */
export function mergeClinicalOpsFromSources(sources) {
  let winner = null;
  for (const src of sources || []) {
    const snap = src && src.clinicalOps;
    if (!snap || typeof snap !== 'object') continue;
    if (!winner) {
      winner = snap;
      continue;
    }
    const a = String(snap.exportedAt || '');
    const b = String(winner.exportedAt || '');
    if (a > b) winner = snap;
  }
  return winner;
}
