/**
 * Clinical onboarding gate helpers.
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import {
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  isLocalOnlyPlaceholderUsername,
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId,
} from '../clinical-settings.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { filterJoinedTeams } from './clinical-teams.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';
import { isCloudSalaUpgradePending } from './cloud-sync/cloud-sala-upgrade.mjs';

function getClientId() {
  return resolveClinicalClientId(readRpcSettings());
}

/** True when session already belongs to at least one clinical team. */
export function hasJoinedClinicalTeam(
  user = clinicalSessionContext.user,
  teams = clinicalSessionContext.teams
) {
  if (!user?.user_id && !normalizeUsername(user?.username || '')) return false;
  return filterJoinedTeams(teams || [], user).length > 0;
}

export function needsUsernameClaim() {
  // Already on a team → keep identity; never force re-claim / re-register.
  if (hasJoinedClinicalTeam()) return false;
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return true;
  if (isLegacyMachineUsername(user.username, getClientId())) return true;
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    const cached = String(settings.clinicalUsername || '').trim();
    if (cached && !isValidUsernameFormat(normalizeUsername(cached))) return true;
    if (cached && isLegacyMachineUsername(user.username, getClientId())) return true;
  } catch (_e) {
    void _e;
  }
  const handle = normalizeUsername(user.username || '');
  return !isValidUsernameFormat(handle);
}

/** Sin equipo asignado (informativo; no bloquea la app). R4/Admin supervisan sin unirse. */
export function needsTeamOnboarding() {
  if (!clinicalSessionContext.user?.user_id) return true;
  if (hasElevatedTeamPrivileges(clinicalSessionContext.user)) return false;
  return !hasJoinedClinicalTeam();
}

/** First screen: LAN guardia vs solo este equipo (before any profile fields). */
export function needsClinicalSyncModeChoice() {
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  if (settings.clinicalRegistered === true) return false;
  if (hasJoinedClinicalTeam()) return false;
  if (isClinicalSyncModeChosen(settings)) return false;
  return true;
}

/** @param {string} current @param {string} clientId */
function sessionHandleNeedsReplace(current, clientId) {
  if (!current) return true;
  if (!isValidUsernameFormat(current)) return true;
  if (isLegacyMachineUsername(current, clientId)) return true;
  return isLocalOnlyPlaceholderUsername(current);
}

/** @param {Record<string, unknown>} settings @param {Record<string, unknown>} user @param {string} clientId */
function syncUsernameFromSettings(settings, user, clientId) {
  const cachedUser = normalizeUsername(String(settings.clinicalUsername || ''));
  const current = normalizeUsername(user.username || '');
  // Never overwrite a valid claimed @usuario with a different cached handle —
  // that reopens registration and orphans team memberships.
  if (!cachedUser || !isValidUsernameFormat(cachedUser)) return;
  if (!sessionHandleNeedsReplace(current, clientId)) return;
  user.username = cachedUser;
}

/** @param {Record<string, unknown>} settings @param {Record<string, unknown>} user */
function syncSessionFieldsFromSettings(settings, user) {
  if (!String(user.clinical_name || '').trim() && settings.clinicalDisplayName) {
    user.clinical_name = String(settings.clinicalDisplayName);
  }
  if (!String(user.sala || '').trim() && settings.clinicalSala) {
    user.sala = String(settings.clinicalSala);
  }
  if (settings.clinicalRank && !String(user.rank || '').trim()) {
    user.rank = String(settings.clinicalRank);
  }
}

function syncSessionFromPersistedProfile(settings, user) {
  if (!user) return;
  syncUsernameFromSettings(settings, user, getClientId());
  syncSessionFieldsFromSettings(settings, user);
}

function hasValidPersistedUsername(settings) {
  const cachedUser = normalizeUsername(String(settings.clinicalUsername || ''));
  return (
    isValidUsernameFormat(cachedUser) &&
    !isLegacyMachineUsername(cachedUser, getClientId()) &&
    !isLocalOnlyPlaceholderUsername(cachedUser)
  );
}

/** Device binding written by onboarding submit — trust when session row lags IPC refresh. */
export function hasPersistedClinicalProfile(settings = readRpcSettings(), user = clinicalSessionContext.user) {
  if (settings.clinicalRegistered !== true) return false;
  if (isClinicalLocalOnlyMode(settings)) return true;
  if (needsClinicalLanProfileGate(settings)) return false;
  if (!hasValidPersistedUsername(settings)) return false;
  const hasName = String(settings.clinicalDisplayName || user?.clinical_name || '').trim();
  const hasSala = String(settings.clinicalSala || user?.sala || '').trim();
  return !!hasName && !!hasSala;
}

function needsLocalOnlyProfile(settings) {
  if (!isClinicalLocalOnlyMode(settings)) return false;
  return settings.clinicalRegistered !== true;
}

function needsLanProfile(settings, user) {
  if (hasPersistedClinicalProfile(settings, user)) return false;
  if (needsClinicalLanProfileGate(settings)) return true;
  if (isLocalOnlyPlaceholderUsername(user?.username)) return true;
  if (needsUsernameClaim()) return true;
  if (!String(user?.clinical_name || settings.clinicalDisplayName || '').trim()) return true;
  if (!String(user?.sala || settings.clinicalSala || '').trim()) return true;
  return false;
}

/** Falta perfil clínico mínimo antes de usar guardia / Mi rotación con datos. */
function needsCloudRegistration(settings, _user) {
  // LAN-only → Sala/Torre: force landing until Nube password saved.
  return isCloudSalaUpgradePending(settings);
}

/** @param {Record<string, unknown>} settings @param {Record<string, unknown>|null|undefined} user */
function pickSettledUsername(settings, user) {
  return normalizeUsername(user?.username || settings.clinicalUsername || '') || undefined;
}

/** @param {Record<string, unknown>} settings @param {Record<string, unknown>|null|undefined} user */
function pickSettledDisplayName(settings, user) {
  return String(user?.clinical_name || settings.clinicalDisplayName || '').trim() || undefined;
}

/** @param {Record<string, unknown>} settings @param {Record<string, unknown>|null|undefined} user */
function pickSettledRank(settings, user) {
  return String(user?.rank || settings.clinicalRank || '').trim() || undefined;
}

/** @param {Record<string, unknown>} settings @param {Record<string, unknown>|null|undefined} user */
function pickSettledSala(settings, user) {
  return String(user?.sala || settings.clinicalSala || '').trim() || undefined;
}

/**
 * When the user is already on a team, settle local registration flags so gates
 * and LAN profile reset stop clearing @usuario.
 */
function markJoinedTeamProfileSettled(settings, user) {
  persistClinicalUserBinding({
    userId: user?.user_id,
    username: pickSettledUsername(settings, user),
    displayName: pickSettledDisplayName(settings, user),
    rank: pickSettledRank(settings, user),
    sala: pickSettledSala(settings, user),
    registered: true,
    lanProfileGateComplete: true,
  });
}

export function needsProfileOnboarding() {
  if (!isDbMode()) return false;
  if (!clinicalSessionContext.user?.user_id) return true;
  // Team membership is stronger than profile-gate flags — do not relaunch registro.
  if (hasJoinedClinicalTeam()) {
    const settings = readRpcSettings();
    syncSessionFromPersistedProfile(settings, clinicalSessionContext.user);
    markJoinedTeamProfileSettled(settings, clinicalSessionContext.user);
    if (needsCloudRegistration(settings, clinicalSessionContext.user)) return true;
    return false;
  }
  if (needsClinicalSyncModeChoice()) return true;
  const settings = readRpcSettings();
  const user = clinicalSessionContext.user;
  if (hasPersistedClinicalProfile(settings, user)) {
    syncSessionFromPersistedProfile(settings, user);
    if (needsCloudRegistration(settings, user)) return true;
    return false;
  }
  if (needsLocalOnlyProfile(settings)) return true;
  return needsLanProfile(settings, user);
}

export function needsClinicalOnboarding() {
  return needsProfileOnboarding();
}

/** Perfil listo pero el residente aún no está en un equipo (no aplica R4/Admin ni solo-local). */
export function needsTeamOnboardingStep() {
  if (!isDbMode()) return false;
  if (hasJoinedClinicalTeam()) return false;
  if (needsProfileOnboarding()) return false;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;
  return needsTeamOnboarding();
}

/** Pantalla de onboarding (perfil o equipo) activa en #main-area. */
export function needsOnboardingShell() {
  if (hasJoinedClinicalTeam()) return false;
  return needsProfileOnboarding() || needsTeamOnboardingStep();
}

export { getClientId, needsLocalOnlyProfile };
