const LS_KEY = 'rpc-clinical-repo-eventualidades';

/**
 * Feature flag: clinicalRepo.eventualidades (default off).
 * Env R_PLUS_CLINICAL_REPO_EVENTUALIDADES=1 OR localStorage key === '1'.
 */
export function isClinicalRepoEventualidadesEnabled() {
  try {
    if (
      typeof process !== 'undefined' &&
      process.env &&
      String(process.env.R_PLUS_CLINICAL_REPO_EVENTUALIDADES || '').trim() === '1'
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY) === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** @param {boolean} enabled */
export function setClinicalRepoEventualidadesEnabled(enabled) {
  if (typeof localStorage === 'undefined') return;
  if (enabled) localStorage.setItem(LS_KEY, '1');
  else localStorage.removeItem(LS_KEY);
}

export { LS_KEY as CLINICAL_REPO_EVENTUALIDADES_LS_KEY };
