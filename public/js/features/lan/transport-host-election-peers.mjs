/**
 * LAN host election — peer discovery and auto-join helpers.
 */
import { storage } from '../../storage.js';
import { listLivePeerHostUrls } from '../../lan-surrogate-host.mjs';
import { normalizeLanHostBase } from '../../lan-host-subnet-discovery.mjs';
import { discoverLanHostsConcurrent } from '../../lan-discovery.mjs';
import {
  pickPreferredLanPeerHost,
} from '../../lan-host-rank-policy.mjs';
import { getLanClientId } from './runtime.mjs';
import { deps } from './transport-deps.mjs';
import { isLanRemoteJoinMode } from './transport-session.mjs';

/** Subnet scan only when this Mac already acts as turn host (not while discovering peers). */
export function shouldSkipSubnetScanForDiscovery(canLocalMacBeLanHost) {
  if (isLanRemoteJoinMode()) return false;
  if (typeof storage.getLanUiRole === 'function' && storage.getLanUiRole() !== 'host') return false;
  return canLocalMacBeLanHost();
}

export async function collectAutoJoinPeers(teamCode, ownUrl, canLocalMacBeLanHost) {
  let peers = listLivePeerHostUrls(getLanClientId());
  const subnetPeers = await discoverLanHostsConcurrent(teamCode, ownUrl, {
    skipSubnetScan: shouldSkipSubnetScanForDiscovery(canLocalMacBeLanHost),
  });
  const seen = new Set();
  return [...peers, ...subnetPeers].filter((u) => {
    const n = normalizeLanHostBase(u);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

export async function tryReactToDiscoveredPeers(peers, teamCode, opts, reactToDiscoveredLanHost) {
  for (const peerUrl of peers) {
    if (!(await reactToDiscoveredLanHost(peerUrl, teamCode))) continue;
    if (!opts.boot) deps().renderLanPanel?.();
    return true;
  }
  return false;
}

export async function joinPreferredLanPeer(peers, teamCode, ownUrl, opts, joinRemoteLanHostAsClient) {
  const pick = await pickPreferredLanPeerHost(peers, teamCode, ownUrl);
  if (!pick || !pick.url) return false;
  const joined = await joinRemoteLanHostAsClient(pick.url, teamCode, {
    requireConfirm: false,
    toastLabel: pick.peer?.rank || 'R4',
  });
  if (joined && !opts.boot) deps().renderLanPanel?.();
  return joined;
}
