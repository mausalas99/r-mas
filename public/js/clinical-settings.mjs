/**
 * Persist clinical identity binding in rpc-settings (device ↔ DB user).
 */

/** Bump when every device must re-confirm LAN profile (admin directory / team assign). */
export const CLINICAL_LAN_PROFILE_GATE_VERSION = '5.5.7';

/** @returns {Record<string, unknown>} */
export function readRpcSettings() {
  try {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) {
    return {};
  }
}

/** Device id for clinical bootstrap (rpc-settings → LAN id → desktop default). */
export function resolveClinicalClientId(settings = readRpcSettings()) {
  const fromSettings = String(settings?.clientId || '').trim();
  if (fromSettings) return fromSettings;
  try {
    const raw = localStorage.getItem('rpc-lan-client-id');
    const fromLan = String(raw || '').trim();
    if (fromLan) return fromLan;
  } catch (_e) {}
  return 'desktop-host';
}

/** @param {Record<string, unknown>|null|undefined} [settings] */
export function needsClinicalLanProfileGate(settings = readRpcSettings()) {
  return (
    String(settings?.clinicalLanProfileGateVersion || '') !== CLINICAL_LAN_PROFILE_GATE_VERSION
  );
}

/** @param {Record<string, unknown>|null|undefined} [settings] */
export function markClinicalLanProfileGateComplete(settings = readRpcSettings()) {
  settings.clinicalLanProfileGateVersion = CLINICAL_LAN_PROFILE_GATE_VERSION;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}
  return settings;
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
  if (patch.lanProfileGateComplete === true) {
    settings.clinicalLanProfileGateVersion = CLINICAL_LAN_PROFILE_GATE_VERSION;
  }
  if (patch.isProgramAdmin !== undefined) {
    settings.clinicalProgramAdmin = !!patch.isProgramAdmin;
  }
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) {}
  return settings;
}
