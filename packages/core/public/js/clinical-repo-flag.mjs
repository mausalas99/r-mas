const LS_KEY = 'rpc-clinical-repo-eventualidades';
const LS_KEY_PROJECTOR = 'rpc-clinical-repo-sync-projector';
const LS_KEY_PERSIST = 'rpc-clinical-repo-persist';

/**
 * @param {string | undefined | null} raw
 * @param {boolean} defaultOn
 */
function parseFlag(raw, defaultOn) {
  const v = String(raw ?? '').trim();
  if (v === '1' || v === 'true') return true;
  if (v === '0' || v === 'false') return false;
  return defaultOn;
}

/**
 * Feature flag: clinicalRepo.eventualidades (default **on** — SQLCipher-first path).
 * Opt out: env `R_PLUS_CLINICAL_REPO_EVENTUALIDADES=0` or localStorage key `0`.
 */
export function isClinicalRepoEventualidadesEnabled() {
  try {
    if (typeof process !== 'undefined' && process.env) {
      const env = process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES;
      if (env != null && String(env).trim() !== '') {
        return parseFlag(env, true);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const ls = localStorage.getItem(LS_KEY);
      if (ls != null) return parseFlag(ls, true);
    }
  } catch {
    /* ignore */
  }
  return true;
}

/** @param {boolean} enabled */
export function setClinicalRepoEventualidadesEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS_KEY, enabled ? '1' : '0');
}

/**
 * Feature flag: clinicalRepo.syncProjector (default **on** with eventualidades).
 * Opt out: env `R_PLUS_CLINICAL_REPO_SYNC_PROJECTOR=0` or localStorage key `0`.
 */
export function isClinicalRepoSyncProjectorEnabled() {
  try {
    if (typeof process !== 'undefined' && process.env) {
      const env = process.env.R_PLUS_CLINICAL_REPO_SYNC_PROJECTOR;
      if (env != null && String(env).trim() !== '') {
        return parseFlag(env, true);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined') {
      const ls = localStorage.getItem(LS_KEY_PROJECTOR);
      if (ls != null) return parseFlag(ls, true);
    }
  } catch {
    /* ignore */
  }
  return true;
}

/** @param {boolean} enabled */
export function setClinicalRepoSyncProjectorEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS_KEY_PROJECTOR, enabled ? '1' : '0');
}

export { LS_KEY as CLINICAL_REPO_EVENTUALIDADES_LS_KEY };
export { LS_KEY_PROJECTOR as CLINICAL_REPO_SYNC_PROJECTOR_LS_KEY };

/**
 * Feature flag: clinicalRepo.persist (default off).
 * Historical gate for clinical.persistSnapshot / patient.* experiments (separate from eventualidades).
 * NOTE (P5 Task 5): persistClinicalState always uses clinical.persistSnapshot when IPC is
 * available — this flag must NOT block durability on that path. Keep for other callers / tests.
 * Env R_PLUS_CLINICAL_REPO_PERSIST=1 OR localStorage key === '1'.
 */
export function isClinicalRepoPersistEnabled() {
  try {
    if (
      typeof process !== 'undefined' &&
      process.env &&
      String(process.env.R_PLUS_CLINICAL_REPO_PERSIST || '').trim() === '1'
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY_PERSIST) === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** @param {boolean} enabled */
export function setClinicalRepoPersistEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;
  if (enabled) localStorage.setItem(LS_KEY_PERSIST, '1');
  else localStorage.removeItem(LS_KEY_PERSIST);
}

export { LS_KEY_PERSIST as CLINICAL_REPO_PERSIST_LS_KEY };
