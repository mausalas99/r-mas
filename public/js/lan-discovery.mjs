/**
 * Concurrent LAN host discovery: registry + UDP fast path, optional subnet scan.
 */

import {
  discoverLanHostsOnSubnet,
  discoverLanHostsOnSubnetViaBeacon,
} from './lan-host-subnet-discovery.mjs';
import { upsertHost, listRegistryDiscoveryUrls } from './lan-host-registry.mjs';
import { listWardHostUrlsForProbe } from './lan-ward-host-registry.mjs';
import { pingLanHostUrl } from './lan-surrogate-host.mjs';

const DEFAULT_REGISTRY_AGE_MS = 90_000;

function normalizeHostUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function dedupeUrls(urls) {
  const seen = new Set();
  const merged = [];
  for (const url of urls) {
    const n = normalizeHostUrl(url);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    merged.push(n);
  }
  return merged;
}

/**
 * Verify beacon hits with a single bearer ping (avoids double-fetch probeLanHostBase).
 * @param {string[]} urls
 * @param {string} teamCode
 * @returns {Promise<string[]>}
 */
async function verifyLanHostsWithBearer(urls, teamCode) {
  const code = String(teamCode || '').trim();
  if (!code) return [];
  const verified = [];
  for (const url of urls) {
    if (await pingLanHostUrl(url, code)) verified.push(normalizeHostUrl(url));
  }
  return verified;
}

/**
 * Run UDP (+ optional subnet scan); upsert UDP hits into the host registry.
 * @param {string} teamCode
 * @param {string} ownUrl
 * @param {{
 *   skipSubnetScan?: boolean,
 *   skipUdpDiscover?: boolean,
 *   forceSubnetScan?: boolean,
 *   subnetScanMode?: 'beacon' | 'bearer',
 *   registryMaxAgeMs?: number,
 * }} [opts]
 * @returns {Promise<string[]>} deduped host base URLs
 */
export async function discoverLanHostsConcurrent(teamCode, ownUrl, opts = {}) {
  const own = normalizeHostUrl(ownUrl);
  const registryUrls = listRegistryDiscoveryUrls(
    opts.registryMaxAgeMs ?? DEFAULT_REGISTRY_AGE_MS
  ).filter((url) => url !== own);

  const udpHosts =
    opts.skipUdpDiscover || registryUrls.length > 0
      ? []
      : typeof window !== 'undefined' && window.electronAPI?.lanUdpDiscover
        ? await window.electronAPI.lanUdpDiscover().catch(() => [])
        : [];

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
      if (url && url !== own) udpUrls.push(url);
    }
  }

  const wardUrls = listWardHostUrlsForProbe().filter((url) => url !== own);
  const fastUrls = dedupeUrls([...registryUrls, ...udpUrls, ...wardUrls]);
  const verifiedFast = fastUrls.length
    ? await verifyLanHostsWithBearer(fastUrls, teamCode)
    : [];

  if (opts.skipSubnetScan) {
    return verifiedFast.length ? verifiedFast : fastUrls;
  }
  if (verifiedFast.length > 0 && !opts.forceSubnetScan) {
    return verifiedFast;
  }

  const scanMode = opts.subnetScanMode || 'beacon';
  let scanned = [];
  if (scanMode === 'bearer') {
    scanned = await discoverLanHostsOnSubnet(teamCode, ownUrl);
  } else {
    const beaconHits = await discoverLanHostsOnSubnetViaBeacon(ownUrl);
    scanned = await verifyLanHostsWithBearer(beaconHits, teamCode);
  }

  return dedupeUrls([...verifiedFast, ...scanned]);
}
