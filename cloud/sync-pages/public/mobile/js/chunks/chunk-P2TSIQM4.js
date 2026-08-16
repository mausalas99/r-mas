// public/js/clinical-profile-cloud-stubs.mjs
var PROFILE_PUSH_FAILED_MSG = "No se pudo sincronizar el perfil con la nube. Revisa \u21C4 Conexi\xF3n.";
async function assertRoomForUsernameRegister() {
  return { ok: true, roomId: "" };
}
async function flushClinicalProfileToCloud() {
  return { ok: true, code: "cloud_only" };
}
function rememberLiveSyncRoomMembership() {
}
function isBenignPushSkipCode() {
  return true;
}
function notifyProfilePushResult() {
}
var PROFILE_NEEDS_CONNECT_MSG = "Conecta Nube en \u21C4 Conexi\xF3n para sincronizar el perfil.";
function isProfileNeedsConnectCode() {
  return false;
}

export {
  PROFILE_PUSH_FAILED_MSG,
  assertRoomForUsernameRegister,
  flushClinicalProfileToCloud,
  rememberLiveSyncRoomMembership,
  isBenignPushSkipCode,
  notifyProfilePushResult,
  PROFILE_NEEDS_CONNECT_MSG,
  isProfileNeedsConnectCode
};
//# sourceMappingURL=/js/chunks/chunk-P2TSIQM4.js.map
