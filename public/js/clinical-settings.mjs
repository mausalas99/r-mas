/**
 * Persist clinical identity binding in rpc-settings (device ↔ DB user).
 */
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from './clinical-username.mjs';
import { readMigratedClientId } from './live-sync-room.mjs';

/** Bump when every device must re-confirm LAN profile (admin directory / team assign). */
export const CLINICAL_LAN_PROFILE_GATE_VERSION = '7.9.0';

/** Spanish copy when the device must confirm @usuario vs nombre en guardia (R+ Cloud). */
export const CLINICAL_LAN_PROFILE_GATE_LEAD_HTML =
  'Confirma tu <strong>@usuario</strong> de R+ Cloud y tu <strong>nombre en guardia</strong>. ' +
  '<strong>Pacientes y labs se conservan</strong>. ' +
  'En salas clínicas también registras tu <strong>contraseña de Nube</strong> aquí — ' +
  'no copies el nombre en guardia en el campo de usuario.';

export const CLINICAL_LAN_USERNAME_HINT_HTML =
  '<strong>Usuario (@usuario)</strong> — identificador único en minúsculas, sin espacios ni tildes: ' +
  'apellido + inicio del nombre, p. ej. <code>drmendoza</code> o <code>garcia</code>. ' +
  'No escribas «Dr. …» aquí.';

export const CLINICAL_LAN_DISPLAY_NAME_HINT_HTML =
  '<strong>Nombre en guardia</strong> — cómo te ven en el censo y las entregas: ' +
  'p. ej. <code>Dr. Mendoza</code> o <code>R1 García</code>.';

/** Device uses SQLCipher only — no LAN LiveSync, Mi rotación, or @usuario in sala. */
export function isClinicalLocalOnlyMode(settings = readRpcSettings()) {
  return settings?.clinicalLocalOnly === true;
}

/** User chose LAN vs local before first profile save (`clinicalLocalOnly` true | false). */
export function isClinicalSyncModeChosen(settings = readRpcSettings()) {
  return settings?.clinicalLocalOnly === true || settings?.clinicalLocalOnly === false;
}

/**
 * @param {boolean} localOnly
 * @returns {Record<string, unknown>}
 */
export function setClinicalSyncModeLocalOnly(localOnly) {
  const settings = readRpcSettings();
  settings.clinicalLocalOnly = !!localOnly;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) { void _e; }
  return settings;
}

/** Onboarding path: login with existing Nube account (step before profile form). */
export function isClinicalExistingAccountPath(settings = readRpcSettings()) {
  return settings?.clinicalOnboardingExistingAccount === true;
}

/** @returns {Record<string, unknown>} */
export function setClinicalExistingAccountPath(enabled) {
  const settings = readRpcSettings();
  if (enabled) {
    settings.clinicalOnboardingExistingAccount = true;
    settings.clinicalLocalOnly = false;
  } else {
    delete settings.clinicalOnboardingExistingAccount;
  }
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) { void _e; }
  return settings;
}

/** Auto @usuario assigned in solo-equipo mode; must be replaced for LAN. */
export function isLocalOnlyPlaceholderUsername(raw) {
  return /^local_[a-z0-9_]+$/.test(normalizeUsername(raw || ''));
}

/**
 * Ward shift PIN pre-filled during onboarding / ⇄ connect (rotate monthly in code).
 * @returns {string} six digits or ''
 */
export function bundledWardShiftPin() {
  const now = new Date();
  if (now.getFullYear() === 2026 && now.getMonth() === 5) return '527953';
  return '';
}

/**
 * Ward LAN host base URL pre-filled for client connect / discovery.
 * @returns {string} http://host:3738 or ''
 */
export function bundledWardHostUrl() {
  return 'http://10.0.57.65:3738';
}

/**
 * Ward sala invite link shipped with the release (rotate when R4 mints a new ticket).
 * Clients see it pre-filled in ⇄ → Unirse con enlace after updating.
 * @returns {string} http://host:3738/join/req_… or ''
 */
export function bundledWardInviteUrl() {
  return 'http://10.0.57.65:3738/join/req_5246cafe2d94?th=1407e41b';
}

/** @returns {Record<string, unknown>} */
export function readRpcSettings() {
  try {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch {
    return {};
  }
}

/** Device id for clinical bootstrap (rpc-settings → client id → desktop default). */
export function resolveClinicalClientId(settings = readRpcSettings()) {
  const fromSettings = String(settings?.clientId || '').trim();
  if (fromSettings) return fromSettings;
  const fromStorage = readMigratedClientId();
  if (fromStorage) return fromStorage;
  return 'desktop-host';
}

/** @param {Record<string, unknown>} settings */
function canAutoCompleteLanProfileGate(settings) {
  const cachedUser = normalizeUsername(String(settings.clinicalUsername || ''));
  if (!isValidUsernameFormat(cachedUser)) return false;
  if (isLegacyMachineUsername(cachedUser, resolveClinicalClientId(settings))) return false;
  if (isLocalOnlyPlaceholderUsername(cachedUser)) return false;
  const hasName = String(settings.clinicalDisplayName || '').trim();
  const hasSala = String(settings.clinicalSala || '').trim();
  return !!hasName && !!hasSala;
}

/**
 * Devices that already completed registration before the 7.9 gate should not
 * be forced through onboarding again on every restart.
 * @param {Record<string, unknown>|null|undefined} [settings]
 */
export function maybeAutoCompleteLanProfileGate(settings = readRpcSettings()) {
  if (isClinicalLocalOnlyMode(settings)) return settings;
  if (
    String(settings?.clinicalLanProfileGateVersion || '') === CLINICAL_LAN_PROFILE_GATE_VERSION
  ) {
    return settings;
  }
  if (settings?.clinicalRegistered !== true) return settings;
  if (!canAutoCompleteLanProfileGate(settings)) return settings;
  return markClinicalLanProfileGateComplete(settings);
}

/** @param {Record<string, unknown>|null|undefined} [settings] */
export function needsClinicalLanProfileGate(settings = readRpcSettings()) {
  if (isClinicalLocalOnlyMode(settings)) return false;
  settings = maybeAutoCompleteLanProfileGate(settings);
  return (
    String(settings?.clinicalLanProfileGateVersion || '') !== CLINICAL_LAN_PROFILE_GATE_VERSION
  );
}

/** @param {Record<string, unknown>|null|undefined} [settings] */
export function markClinicalLanProfileGateComplete(settings = readRpcSettings()) {
  settings.clinicalLanProfileGateVersion = CLINICAL_LAN_PROFILE_GATE_VERSION;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) { void _e; }
  return settings;
}

/** @param {string} cachedUser @param {string} clientId */
function shouldKeepLanProfileUsername(cachedUser, clientId) {
  return (
    isValidUsernameFormat(cachedUser) &&
    !isLegacyMachineUsername(cachedUser, clientId) &&
    !isLocalOnlyPlaceholderUsername(cachedUser)
  );
}

/** @param {string} display */
function isPlaceholderDisplayName(display) {
  return !display || /^usuario$/i.test(display) || /^local/i.test(display);
}

/**
 * Clears only stale machine/placeholder prefills when the gate is pending.
 * Keeps a valid claimed @usuario + display name so re-open of registro does not
 * spawn a second clinical identity / orphan team memberships.
 * @param {Record<string, unknown>|null|undefined} [settings]
 */
export function ensureLanProfileGateDeviceReset(settings = readRpcSettings()) {
  if (!needsClinicalLanProfileGate(settings)) return settings;
  const next = { ...settings };
  let dirty = false;
  const clientId = resolveClinicalClientId(next);
  const cachedUser = normalizeUsername(String(next.clinicalUsername || ''));
  const keepUsername = shouldKeepLanProfileUsername(cachedUser, clientId);
  if (next.clinicalUsername && !keepUsername) {
    delete next.clinicalUsername;
    dirty = true;
  }
  const display = String(next.clinicalDisplayName || '').trim();
  // Only wipe display with username when handle was machine/placeholder noise.
  if (next.clinicalDisplayName && !keepUsername && isPlaceholderDisplayName(display)) {
    delete next.clinicalDisplayName;
    dirty = true;
  }
  if (dirty) {
    try {
      localStorage.setItem('rpc-settings', JSON.stringify(next));
    } catch (_e) {
      void _e;
    }
  }
  return next;
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
  if (!settings.clientId) {
    settings.clientId = resolveClinicalClientId(settings);
  }
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
  } catch (_e) { void _e; }
  return settings;
}
