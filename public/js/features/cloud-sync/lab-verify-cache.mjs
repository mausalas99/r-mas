/**
 * localStorage cache for "Verificar labs" portal-check results, keyed by
 * patientId — lets the Red tab's verified state survive a census reload or
 * app restart instead of resetting to the cloud-sync guess every time.
 */

const KEY = 'rplus.labVerifyCache.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

/**
 * @param {string} patientId
 * @returns {{ hasStudies: boolean, lastFechaSolicitud: string|null, checkedAt: number }|null}
 */
export function getCachedLabVerify(patientId) {
  if (!patientId) return null;
  return readAll()[patientId] || null;
}

/**
 * @param {string} patientId @param {boolean} hasStudies
 * @param {string|null} [lastFechaSolicitud]
 */
export function setCachedLabVerify(patientId, hasStudies, lastFechaSolicitud) {
  if (!patientId) return;
  const all = readAll();
  all[patientId] = { hasStudies, lastFechaSolicitud: lastFechaSolicitud || null, checkedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage full or unavailable — cache is best-effort, not a source of truth
  }
}
