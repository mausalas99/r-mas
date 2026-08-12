/**
 * Cloud-era stubs for retired clinical-profile LAN sync helpers.
 */
export const PROFILE_PUSH_FAILED_MSG =
  'No se pudo sincronizar el perfil con la nube. Revisa ⇄ Conexión.';

export async function assertRoomForUsernameRegister() {
  return { ok: true, roomId: '' };
}

export async function flushClinicalProfileToCloud() {
  return { ok: true, code: 'cloud_only' };
}

export function rememberLiveSyncRoomMembership() {}

export function isBenignPushSkipCode() {
  return true;
}

export function notifyProfilePushResult() {}

export const PROFILE_NEEDS_CONNECT_MSG = 'Conecta Nube en ⇄ Conexión para sincronizar el perfil.';

export function isProfileNeedsConnectCode() {
  return false;
}
