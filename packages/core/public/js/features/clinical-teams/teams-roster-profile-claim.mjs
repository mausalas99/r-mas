/** Mi rotación — username claim / resume before profile save. */
import { clinicalSessionContext, resumeClinicalIdentityByUsername } from '../../clinical-access-runtime.mjs';
import {
  isLegacyMachineUsername,
  normalizeUsername,
  shouldClaimClinicalUsername,
} from '../../clinical-username.mjs';
import { openConfirm } from '../workbench/confirm.mjs';
import { dbApi, toast, currentUserId } from './shared.mjs';

export function clientIdFromSettings() {
  try {
    return String(JSON.parse(localStorage.getItem('rpc-settings') || '{}').clientId || '');
  } catch {
    return '';
  }
}

/** @param {typeof openConfirm} confirmFn */
async function confirmUsernameChange(currentUsername, username, confirmFn) {
  if (!currentUsername || isLegacyMachineUsername(currentUsername, clientIdFromSettings())) {
    return true;
  }
  const result = await confirmFn({
    weight: 'consequence',
    title: `¿Cambiar tu usuario de @${currentUsername} a @${username}?`,
    consequenceText: 'Los equipos verán el nuevo nombre.',
    confirmLabel: 'Cambiar',
    cancelLabel: 'Cancelar',
  });
  return result === 'confirm';
}

/** @param {typeof openConfirm} confirmFn */
async function tryResumeExistingUsername(username, errMsg, confirmFn) {
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  } catch (_e) { void _e; }
  const result = await confirmFn({
    weight: 'consequence',
    title: `El usuario @${username} ya existe.`,
    consequenceText: '¿Recuperar tu cuenta en este dispositivo?',
    confirmLabel: 'Recuperar',
    cancelLabel: 'Cancelar',
  });
  if (result !== 'confirm') {
    toast(errMsg, 'error');
    return false;
  }
  const resumeRes = await resumeClinicalIdentityByUsername(
    username,
    settings,
    clientIdFromSettings()
  );
  if (!resumeRes.ok) {
    toast(resumeRes.error || errMsg, 'error');
    return false;
  }
  return true;
}

/** @param {typeof openConfirm} confirmFn */
async function submitUsernameClaim(userId, username, confirmFn) {
  const api = dbApi();
  if (typeof api.dbClinicalUsernameClaim !== 'function') {
    toast('No se pudo guardar el @usuario.', 'error');
    return false;
  }
  const claimRes = await api.dbClinicalUsernameClaim({ userId, username });
  if (claimRes?.ok) return true;
  const errMsg = String(claimRes?.error || '');
  if (/ya está en uso/i.test(errMsg)) {
    return tryResumeExistingUsername(username, errMsg, confirmFn);
  }
  toast(errMsg || 'No se pudo guardar el usuario.', 'error');
  return false;
}

/**
 * @param {string} username
 * @param {string} sala
 * @param {{ confirm?: typeof openConfirm }} [deps]
 * @returns {Promise<boolean|null>} true = changed ok, false = blocked, null = no change needed
 */
export async function claimClinicalUsernameIfNeeded(username, sala, deps = {}) {
  const confirmFn = typeof deps.confirm === 'function' ? deps.confirm : openConfirm;
  const userId = currentUserId();
  const api = dbApi();
  const currentUsername = normalizeUsername(clinicalSessionContext.user?.username || '');
  const usernameWillChange = shouldClaimClinicalUsername(
    currentUsername,
    username,
    clientIdFromSettings()
  );
  if (!usernameWillChange) return null;
  if (!userId || !api) return false;

  const { assertRoomForUsernameRegister } = await import('../../clinical-profile-cloud-stubs.mjs');
  await assertRoomForUsernameRegister({ sala });
  if (!(await confirmUsernameChange(currentUsername, username, confirmFn))) return false;

  const claimed = await submitUsernameClaim(userId, username, confirmFn);
  if (!claimed) return false;
  if (clinicalSessionContext.user) clinicalSessionContext.user.username = username;
  return true;
}
