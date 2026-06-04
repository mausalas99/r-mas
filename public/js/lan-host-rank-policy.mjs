/**
 * Renderer policy helpers: local meta + peer pick (uses lan-host-rank.mjs).
 */
import { readRpcSettings } from './clinical-settings.mjs';
import {
  pickPreferredLanPeerHost as pickPeer,
  prefersLanHosting,
  isClinicalRankConfiguredForLan,
  canLocalMacBeLanHost,
  buildLocalLanHostMeta,
} from './lan-host-rank.mjs';

export {
  prefersLanHosting,
  fetchLanHostRank,
  shouldAutoJoinPeerAsClient,
  evaluatePeerHostAction,
  resolveHostElection,
  isClinicalRankConfiguredForLan,
  canLocalMacBeLanHost,
} from './lan-host-rank.mjs';

/** @type {{ rank?: string, isProgramAdmin?: boolean, startedAt?: number } | null} */
let _diskHostMeta = null;

/** @returns {{ rank: string, isProgramAdmin: boolean, rankConfigured: boolean, startedAt: number }} */
export function getLocalLanHostMeta() {
  try {
    const settings = readRpcSettings();
    const rankConfigured = isClinicalRankConfiguredForLan(settings);
    const startedAt = Number(_diskHostMeta?.startedAt) || 0;
    if (!rankConfigured) {
      return { rank: '', isProgramAdmin: false, rankConfigured: false, startedAt };
    }
    const { rank, isProgramAdmin } = buildLocalLanHostMeta(settings);
    return {
      rank: rank || 'R1',
      isProgramAdmin: !!isProgramAdmin,
      rankConfigured: true,
      startedAt,
    };
  } catch (_e) {
    return { rank: '', isProgramAdmin: false, rankConfigured: false, startedAt: 0 };
  }
}

export async function syncLanHostClinicalMetaToDisk() {
  if (!isClinicalRankConfiguredForLan()) return false;
  if (
    typeof window === 'undefined' ||
    !window.electronAPI ||
    typeof window.electronAPI.syncLanHostClinicalMeta !== 'function'
  ) {
    return false;
  }
  const { startedAt: _drop, rankConfigured: _rc, ...meta } = getLocalLanHostMeta();
  try {
    const res = await window.electronAPI.syncLanHostClinicalMeta(meta);
    if (res?.ok && res.meta && typeof res.meta === 'object') {
      _diskHostMeta = res.meta;
    }
    return !!(res && res.ok);
  } catch (_e) {
    return false;
  }
}

/**
 * @param {string[]} peerUrls
 * @param {string} teamCode
 */
export async function pickPreferredLanPeerHost(peerUrls, teamCode, selfUrl = '') {
  if (!isClinicalRankConfiguredForLan()) return null;
  return pickPeer(peerUrls, teamCode, getLocalLanHostMeta(), selfUrl);
}
