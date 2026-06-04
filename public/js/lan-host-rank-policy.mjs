/**
 * Renderer policy helpers: local meta + peer pick (uses lan-host-rank.mjs).
 */
import {
  needsClinicalLanProfileGate,
  readRpcSettings,
} from './clinical-settings.mjs';
import {
  pickPreferredLanPeerHost as pickPeer,
  prefersLanHosting,
  isClinicalRankConfiguredForLan,
  canLocalMacBeLanHost,
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

/** @returns {{ rank: string, isProgramAdmin: boolean, rankConfigured: boolean }} */
export function getLocalLanHostMeta() {
  try {
    const settings = readRpcSettings();
    const rankConfigured = isClinicalRankConfiguredForLan(settings);
    if (!rankConfigured) {
      return { rank: '', isProgramAdmin: false, rankConfigured: false };
    }
    const rank = String(settings.clinicalRank || '').trim() || 'R1';
    const isProgramAdmin =
      settings.clinicalProgramAdmin === true || settings.clinicalIsProgramAdmin === true;
    return { rank, isProgramAdmin: !!isProgramAdmin, rankConfigured: true };
  } catch (_e) {
    return { rank: '', isProgramAdmin: false, rankConfigured: false };
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
  const meta = getLocalLanHostMeta();
  try {
    const res = await window.electronAPI.syncLanHostClinicalMeta(meta);
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
