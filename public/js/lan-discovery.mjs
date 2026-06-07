/**
 * Concurrent LAN host discovery: UDP broadcast + subnet scan, with registry upsert.
 */

import { discoverLanHostsOnSubnet } from './lan-host-subnet-discovery.mjs';
import { upsertHost } from './lan-host-registry.mjs';

function normalizeHostUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/**
 * Run UDP and subnet scan in parallel; upsert UDP hits into the host registry.
 * @param {string} teamCode
 * @param {string} ownUrl
 * @returns {Promise<string[]>} deduped host base URLs (UDP + scan)
 */
export async function discoverLanHostsConcurrent(teamCode, ownUrl) {
  const [udpHosts, scanned] = await Promise.all([
    typeof window !== 'undefined' && window.electronAPI?.lanUdpDiscover
      ? window.electronAPI.lanUdpDiscover().catch(() => [])
      : Promise.resolve([]),
    discoverLanHostsOnSubnet(teamCode, ownUrl),
  ]);

  const udpUrls = [];
  if (Array.isArray(udpHosts)) {
    for (const h of udpHosts) {
      if (!h?.clientId || !h?.startedAt) continue;
      upsertHost({
        fingerprint: `${h.clientId}:${h.startedAt}`,
        clientId: h.clientId,
        startedAt: h.startedAt,
        currentUrl: h.url,
        rank: h.rank || '',
        dbUnlocked: false,
        shiftPinActive: false,
        rttMs: 0,
        lastSeenAt: Date.now(),
        source: 'udp',
      });
      const url = normalizeHostUrl(h.url);
      if (url) udpUrls.push(url);
    }
  }

  const seen = new Set();
  const merged = [];
  for (const url of [...udpUrls, ...(Array.isArray(scanned) ? scanned : [])]) {
    const n = normalizeHostUrl(url);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    merged.push(n);
  }
  return merged;
}
