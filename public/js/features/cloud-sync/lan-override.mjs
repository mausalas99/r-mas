import { isCloudSala } from './sala-allowlist.mjs';
import { getCloudSyncRoomId } from './settings.mjs';

let _cloudRoomConnected = false;

/** @param {boolean} connected */
export function setCloudRoomConnected(connected) {
  _cloudRoomConnected = !!connected;
}

/** True when a cloud room session is active (memory or persisted room id). */
export function isCloudSyncActive() {
  if (_cloudRoomConnected) return true;
  return !!getCloudSyncRoomId();
}

/** @param {unknown} profileSala */
export function shouldShowNubePanel(profileSala) {
  return isCloudSala(profileSala);
}

/**
 * @param {unknown} profileSala
 * @param {boolean} [cloudRoomConnected]
 */
export function shouldUseNubeNotLan(profileSala, cloudRoomConnected) {
  if (!isCloudSala(profileSala)) return false;
  if (cloudRoomConnected != null) return !!cloudRoomConnected;
  return isCloudSyncActive();
}
