import { readRpcSettings } from '../../clinical-settings.mjs';

export const CLOUD_SALA_UPGRADE_KEY = 'cloudSyncSalaUpgrade';

export function isCloudSalaUpgradePending(settings = readRpcSettings()) {
  return String(settings?.[CLOUD_SALA_UPGRADE_KEY] || '') === 'pending';
}

export function setCloudSalaUpgradePending(value) {
  const s = readRpcSettings();
  if (value) s[CLOUD_SALA_UPGRADE_KEY] = 'pending';
  else delete s[CLOUD_SALA_UPGRADE_KEY];
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(s));
  } catch (e) {
    console.warn('[cloud-sala-upgrade] failed to write rpc-settings', e);
  }
  return s;
}

export function clearCloudSalaUpgradePending() {
  return setCloudSalaUpgradePending(false);
}

/** Retired: all clinical wards use Nube; no LAN-only → cloud migration gate. */
export function maybeMarkCloudSalaUpgrade(_prevSala, _nextSala) {
  return false;
}
