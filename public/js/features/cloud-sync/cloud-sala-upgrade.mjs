import { readRpcSettings } from '../../clinical-settings.mjs';
import { isCloudSala, isLanOnlySala } from './sala-allowlist.mjs';

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
  } catch {
    /* ignore */
  }
  return s;
}

export function clearCloudSalaUpgradePending() {
  return setCloudSalaUpgradePending(false);
}

/** LAN-only → Sala/Torre: require Nube registration via onboarding. */
export function maybeMarkCloudSalaUpgrade(prevSala, nextSala) {
  if (!isLanOnlySala(prevSala) || !isCloudSala(nextSala)) return false;
  setCloudSalaUpgradePending(true);
  return true;
}
