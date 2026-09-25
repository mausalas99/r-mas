/**
 * Stable client id for cloud sync actor attribution (replaces LAN runtime client id).
 */
import { resolveClinicalClientId } from '../../clinical-settings.mjs';

export function getCloudSyncClientId() {
  try {
    return String(resolveClinicalClientId() || '').trim() || 'local';
  } catch {
    return 'local';
  }
}
