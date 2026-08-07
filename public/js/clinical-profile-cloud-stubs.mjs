/**
 * Cloud-era stubs for retired clinical-profile LAN sync helpers.
 */
export const LAN_PROFILE_PUSH_FAILED_MSG =
  'No se pudo sincronizar el perfil con la nube. Revisa ⇄ Conexión.';

export async function assertLanRoomForUsernameRegister() {
  return { ok: true, roomId: '' };
}

export async function flushClinicalProfileToLan() {
  return { ok: true, code: 'cloud_only' };
}

export function rememberLiveSyncRoomMembership() {}

export function isBenignLanPushSkipCode() {
  return true;
}

export function notifyLanProfilePushResult() {}

export const LAN_PROFILE_NEEDS_CONNECT_MSG = 'Conecta Nube en ⇄ Conexión para sincronizar el perfil.';

export function isLanProfileNeedsConnectCode() {
  return false;
}
