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
  const sala = String(profileSala || '').trim();
  // Pre-profile / mid-onboarding: still mount login + sala setup in ⇄ Conexión.
  if (!sala) return true;
  return isCloudSala(sala);
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
