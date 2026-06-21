/**
 * Clinical onboarding gate helpers.
 */
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import {
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  isLocalOnlyPlaceholderUsername,
  needsClinicalLanProfileGate,
  readRpcSettings,
} from '../clinical-settings.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { filterJoinedTeams } from './clinical-teams.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';

function getClientId() {
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    return String(settings.clientId || '');
  } catch {
    return '';
  }
}

export function needsUsernameClaim() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return true;
  if (isLegacyMachineUsername(user.username, getClientId())) return true;
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    const cached = String(settings.clinicalUsername || '').trim();
    if (cached && !isValidUsernameFormat(normalizeUsername(cached))) return true;
    if (cached && isLegacyMachineUsername(user.username, getClientId())) return true;
  } catch (_e) { void _e; }
  const handle = normalizeUsername(user.username || '');
  return !isValidUsernameFormat(handle);
}

/** Sin equipo asignado (informativo; no bloquea la app). R4/Admin supervisan sin unirse. */
export function needsTeamOnboarding() {
  if (!clinicalSessionContext.user?.user_id) return true;
  if (hasElevatedTeamPrivileges(clinicalSessionContext.user)) return false;
  const teams = clinicalSessionContext.teams || [];
  return filterJoinedTeams(teams, clinicalSessionContext.user).length === 0;
}

/** First screen: LAN guardia vs solo este equipo (before any profile fields). */
export function needsClinicalSyncModeChoice() {
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  if (settings.clinicalRegistered === true) return false;
  if (isClinicalSyncModeChosen(settings)) return false;
  return true;
}

function needsLocalOnlyProfile(settings, user) {
  if (!isClinicalLocalOnlyMode(settings)) return false;
  if (settings.clinicalRegistered !== true) return true;
  return !String(user?.clinical_name || '').trim();
}

function needsLanProfile(settings, user) {
  if (needsClinicalLanProfileGate(settings)) return true;
  if (isLocalOnlyPlaceholderUsername(user?.username)) return true;
  if (needsUsernameClaim()) return true;
  if (!String(user?.clinical_name || '').trim()) return true;
  if (!String(user?.sala || '').trim()) return true;
  return false;
}

/** Falta perfil clínico mínimo antes de usar guardia / Mi rotación con datos. */
export function needsProfileOnboarding() {
  if (!isDbMode()) return false;
  if (!clinicalSessionContext.user?.user_id) return true;
  if (needsClinicalSyncModeChoice()) return true;
  const settings = readRpcSettings();
  const user = clinicalSessionContext.user;
  if (needsLocalOnlyProfile(settings, user)) return true;
  return needsLanProfile(settings, user);
}

export function needsClinicalOnboarding() {
  return needsProfileOnboarding();
}

export { getClientId };
