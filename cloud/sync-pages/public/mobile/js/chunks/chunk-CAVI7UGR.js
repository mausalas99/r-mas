import {
  isCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncRoomId
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";

// public/js/features/cloud-sync/nube-sync-policy.mjs
var _cloudRoomConnected = false;
function setCloudRoomConnected(connected) {
  _cloudRoomConnected = !!connected;
}
function isCloudSyncActive() {
  if (_cloudRoomConnected) return true;
  return !!getCloudSyncRoomId();
}
function shouldShowNubePanel(profileSala) {
  const sala = String(profileSala || "").trim();
  if (!sala) return true;
  return isCloudSala(sala);
}
function shouldUseNubeNotLan(profileSala, cloudRoomConnected) {
  if (!isCloudSala(profileSala)) return false;
  if (cloudRoomConnected != null) return !!cloudRoomConnected;
  return isCloudSyncActive();
}

export {
  setCloudRoomConnected,
  isCloudSyncActive,
  shouldShowNubePanel,
  shouldUseNubeNotLan
};
//# sourceMappingURL=/js/chunks/chunk-CAVI7UGR.js.map
