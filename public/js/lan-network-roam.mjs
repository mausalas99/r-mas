/**
 * Sync LAN host bindings when local subnets change (no transport/orchestrator imports).
 */
import { storage } from './storage.js';
import { lanClient } from './features/lan/runtime.mjs';
import { clearPinnedHostUrl, getPinnedHostUrl, isPinnedHostLocal } from './lan-host-pin.mjs';
import {
  isHostOnCurrentSubnets,
  normalizeLanHostBase,
} from './lan-host-subnet-discovery.mjs';

export { isHostOnCurrentSubnets };

/**
 * @param {{ prefixes?: string[], candidateBaseUrl?: string }} payload
 */
export function applyLanNetworkRoaming(payload = {}) {
  const prefixes = Array.isArray(payload.prefixes) ? payload.prefixes : [];
  const candidateBaseUrl = normalizeLanHostBase(payload.candidateBaseUrl || '');
  const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
  const teamCode = String(cfg.teamCode || '').trim();
  const uiRole = typeof storage.getLanUiRole === 'function' ? storage.getLanUiRole() : 'client';
  const pinned = getPinnedHostUrl();

  if (pinned && !isHostOnCurrentSubnets(pinned, prefixes) && !isPinnedHostLocal(candidateBaseUrl)) {
    clearPinnedHostUrl();
  }

  if (uiRole === 'host' && candidateBaseUrl && teamCode) {
    const current = normalizeLanHostBase(cfg.hostUrl || '');
    if (current !== candidateBaseUrl) {
      storage.saveLanConfig({ hostUrl: candidateBaseUrl, teamCode });
      lanClient.configure({ hostUrl: candidateBaseUrl, teamCode });
      try {
        lanClient.disconnect();
        lanClient.connectSyncChannel();
      } catch (_e) {}
    }
    return { role: 'host', candidateBaseUrl };
  }

  const savedHost = normalizeLanHostBase(cfg.hostUrl || '');
  if (savedHost && prefixes.length && !isHostOnCurrentSubnets(savedHost, prefixes)) {
    storage.saveLanConfig(teamCode ? { hostUrl: '', teamCode } : null);
    try {
      lanClient.disconnect();
    } catch (_e2) {}
    return { role: 'client', clearedStaleHost: true };
  }

  return { role: uiRole, clearedStaleHost: false };
}
