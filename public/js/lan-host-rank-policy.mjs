/**
 * Renderer policy helpers: local meta + peer pick (uses lan-host-rank.mjs).
 */
import { clinicalSessionContext } from './clinical-access-runtime.mjs';
import { pickPreferredLanPeerHost as pickPeer, prefersLanHosting } from './lan-host-rank.mjs';

export {
  prefersLanHosting,
  fetchLanHostRank,
  shouldAutoJoinPeerAsClient,
  evaluatePeerHostAction,
  resolveHostElection,
} from './lan-host-rank.mjs';

/** @returns {{ rank: string, isProgramAdmin: boolean }} */
export function getLocalLanHostMeta() {
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    const user =
      typeof clinicalSessionContext !== 'undefined' ? clinicalSessionContext.user : null;
    const rank = String(settings.clinicalRank || user?.rank || 'R1').trim() || 'R1';
    const isProgramAdmin =
      user?.is_program_admin === 1 ||
      user?.is_program_admin === true ||
      settings.clinicalIsProgramAdmin === true;
    return { rank, isProgramAdmin: !!isProgramAdmin };
  } catch (_e) {
    return { rank: 'R1', isProgramAdmin: false };
  }
}

export async function syncLanHostClinicalMetaToDisk() {
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
  return pickPeer(peerUrls, teamCode, getLocalLanHostMeta(), selfUrl);
}
