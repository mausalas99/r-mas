/**
 * Sync LAN host bindings when local subnets change (no transport/orchestrator imports).
 */
import { storage } from './storage.js';
import { lanClient } from './features/lan/runtime.mjs';
import { clearPinnedHostUrl, getPinnedHostUrl, isPinnedHostLocal } from './lan-host-pin.mjs';
import { findByFingerprint, getPinnedFingerprint } from './lan-host-registry.mjs';
import { pingLanHostUrl } from './lan-surrogate-host.mjs';
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

/**
 * @param {{ prefixes?: string[], candidateBaseUrl?: string }} payload
 * @param {{ savedHostUrl?: string, teamCode?: string, pingFn?: (url: string) => Promise<boolean> }} [opts]
 */
export async function applyLanNetworkRoamingWithFingerprint(payload, opts = {}) {
  const pinnedFp = getPinnedFingerprint();
  if (!pinnedFp) return { shortcut: false };

  const record = findByFingerprint(pinnedFp);
  if (!record) return { shortcut: false };

  const savedHost = normalizeLanHostBase(String(opts.savedHostUrl || ''));
  const registryUrl = normalizeLanHostBase(record.currentUrl);
  if (!registryUrl || registryUrl === savedHost) return { shortcut: false };

  const pingFn = typeof opts.pingFn === 'function'
    ? opts.pingFn
    : (url) => pingLanHostUrl(url, String(opts.teamCode || ''));

  const ok = await pingFn(registryUrl);
  if (!ok) return { shortcut: false };

  return { shortcut: true, newUrl: registryUrl };
}
