/**
 * Persist clinical identity binding in rpc-settings (device ↔ DB user).
 */

/** @returns {Record<string, unknown>} */
export function readRpcSettings() {
  try {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {
    return {};
  }
}

/**
 * @param {{
 *   userId?: string,
 *   username?: string,
 *   displayName?: string,
 *   rank?: string,
 *   sala?: string,
 *   registered?: boolean,
 *   isProgramAdmin?: boolean,
 *   staleDeviceUserId?: string,
 * }} patch
 */
export function persistClinicalUserBinding(patch) {
  const settings = readRpcSettings();
  if (patch.userId) settings.clinicalUserId = String(patch.userId);
  if (patch.staleDeviceUserId) {
    settings.clinicalStaleDeviceUserId = String(patch.staleDeviceUserId);
  }
  if (patch.username) settings.clinicalUsername = String(patch.username);
  if (patch.displayName) settings.clinicalDisplayName = String(patch.displayName);
  if (patch.rank) settings.clinicalRank = String(patch.rank);
  if (patch.sala != null) settings.clinicalSala = String(patch.sala);
  if (patch.registered === true) settings.clinicalRegistered = true;
  if (patch.isProgramAdmin !== undefined) {
    settings.clinicalProgramAdmin = !!patch.isProgramAdmin;
  }
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}
  return settings;
}
