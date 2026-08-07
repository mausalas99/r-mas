// public/js/clinical-profile-cloud-stubs.mjs
var LAN_PROFILE_PUSH_FAILED_MSG = "No se pudo sincronizar el perfil con la nube. Revisa \u21C4 Conexi\xF3n.";
async function assertLanRoomForUsernameRegister() {
  return { ok: true, roomId: "" };
}
async function flushClinicalProfileToLan() {
  return { ok: true, code: "cloud_only" };
}
function rememberLiveSyncRoomMembership() {
}
function isBenignLanPushSkipCode() {
  return true;
}
function notifyLanProfilePushResult() {
}
var LAN_PROFILE_NEEDS_CONNECT_MSG = "Conecta Nube en \u21C4 Conexi\xF3n para sincronizar el perfil.";
function isLanProfileNeedsConnectCode() {
  return false;
}

export {
  LAN_PROFILE_PUSH_FAILED_MSG,
  assertLanRoomForUsernameRegister,
  flushClinicalProfileToLan,
  rememberLiveSyncRoomMembership,
  isBenignLanPushSkipCode,
  notifyLanProfilePushResult,
  LAN_PROFILE_NEEDS_CONNECT_MSG,
  isLanProfileNeedsConnectCode
};
//# sourceMappingURL=/js/chunks/chunk-SFXEUBWR.js.map
