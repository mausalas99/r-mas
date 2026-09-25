import { CLINICAL_LS_KEYS } from '../db-storage-bridge.mjs';

export function needsPassphraseConfirm(status, probe) {
  if (!status || typeof status !== 'object') return true;
  if (status.dbFileExists && status.hasKdfSalt) return false;
  if (status.migrationPending && !status.dbFileExists) return true;
  if (probe && probe.needed && !status.dbFileExists) return true;
  if (status.dbFileExists === false) return true;
  return false;
}

export function collectClinicalLsSnapshot() {
  var snapshot = {};
  if (typeof localStorage === 'undefined') return snapshot;
  for (var i = 0; i < CLINICAL_LS_KEYS.length; i++) {
    var key = CLINICAL_LS_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
    var raw = localStorage.getItem(key);
    if (raw != null) snapshot[key] = raw;
  }
  return snapshot;
}

export function clearMigratedLocalStorageKeys(keys) {
  if (!keys || !keys.length || typeof localStorage === 'undefined') return;
  for (var i = 0; i < keys.length; i++) {
    try {
      localStorage.removeItem(keys[i]);
    } catch (_e) { void _e; }
  }
}

function hasPatients(raw) {
  try {
    var parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.length > 0;
  } catch (_e) {
    return false;
  }
}

/**
 * After a desktop unlock, SQLCipher is the durable clinical store. Any
 * `rpc-*` clinical key still in localStorage is a dead copy from before the
 * migration ran on this install — clear it, unless the DB looks emptier
 * than localStorage (a hydrate failure), which would make deleting the only
 * copy a data-loss bug instead of cleanup.
 * @param {Record<string, string> | null} blobCache from storage-core.mjs getBlobCache()
 */
export function sweepLegacyClinicalLocalStorage(blobCache) {
  if (!blobCache) return;
  if (!hasPatients(blobCache.patients)) {
    var lsRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('rpc-patients') : null;
    if (hasPatients(lsRaw)) {
      console.warn('[R+] sweepLegacyClinicalLocalStorage: DB has 0 patients but localStorage has some — refusing to clear');
      return;
    }
  }
  clearMigratedLocalStorageKeys(CLINICAL_LS_KEYS);
}

export async function runMigrationProbe(electron) {
  if (!electron || typeof electron.dbMigrationProbe !== 'function') {
    return { needed: false, hasHostJson: false };
  }
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    var res = await electron.dbMigrationProbe({ lsSnapshot: lsSnapshot });
    if (res && res.ok !== false) {
      return { needed: !!res.needed, hasHostJson: !!res.hasHostJson };
    }
  } catch (_e) { void _e; }
  return { needed: false, hasHostJson: false };
}

export function migrationUiPending(status, probe) {
  return !!(status && status.migrationPending) || !!(probe && probe.needed);
}
