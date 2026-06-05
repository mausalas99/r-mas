/**
 * LAN anfitrión: prioridad R4 / admin de programa; rangos menores buscan primero.
 */
import {
  needsClinicalLanProfileGate,
  readRpcSettings,
} from './clinical-settings.mjs';
import { clinicalSessionContext } from './clinical-session-context.mjs';
import { hasProgramAdminPrivileges } from './clinical-privileges.mjs';
import {
  canRankHostAtEscalationTier,
  getHostEscalationTier,
  isWardTierHostMeta,
} from './lan-host-escalation.mjs';

const RANK_PRIORITY = { R1: 1, R2: 2, R3: 3, R4: 4, Admin: 5 };

/** Program admin from rpc-settings or active clinical session (DB profile). */
export function resolveLocalProgramAdmin(settings = readRpcSettings()) {
  if (settings.clinicalProgramAdmin === true || settings.clinicalIsProgramAdmin === true) {
    return true;
  }
  return hasProgramAdminPrivileges(clinicalSessionContext?.user);
}

/** Rank + admin flag for LAN election (no startedAt). */
export function buildLocalLanHostMeta(settings = readRpcSettings()) {
  const rank = String(settings?.clinicalRank || '').trim();
  return {
    rank: rank || 'R1',
    isProgramAdmin: resolveLocalProgramAdmin(settings),
  };
}

/** User completed «Configura tu rotación» with an explicit rango (required before LAN election). */
export function isClinicalRankConfiguredForLan(settings = readRpcSettings()) {
  const rank = String(settings?.clinicalRank || '').trim();
  if (!rank) return false;
  if (needsClinicalLanProfileGate(settings)) return false;
  return true;
}

/** R4/admin immediately; R3/R2/R1 after 10 min steps if no ward-tier host on the LAN. */
export function canLocalMacBeLanHost(meta) {
  if (!isClinicalRankConfiguredForLan()) return false;
  const m = meta || buildLocalLanHostMeta();
  if (isWardTierHostMeta(m)) return true;
  return canRankHostAtEscalationTier(m, getHostEscalationTier());
}

/** @param {{ rank?: string, isProgramAdmin?: boolean }} meta */
export function lanHostPriority(meta) {
  if (!meta) return 0;
  if (meta.isProgramAdmin) return 1000;
  const rank = String(meta.rank || 'R1').trim();
  return RANK_PRIORITY[rank] || 0;
}

/** R4 o administrador de programa — esta Mac puede ser servidor del turno. */
export function prefersLanHosting(meta) {
  if (!meta) return false;
  if (meta.isProgramAdmin) return true;
  const rank = String(meta.rank || '').trim();
  if (!rank) return false;
  return (RANK_PRIORITY[rank] || 0) >= RANK_PRIORITY.R4;
}

/** @param {{ rank?: string, isProgramAdmin?: boolean }} peer */
/** @param {{ rank?: string, isProgramAdmin?: boolean }} self */
export function shouldDeferToPeerHost(peer, self) {
  return lanHostPriority(peer) > lanHostPriority(self);
}

/**
 * Conectar como cliente al peer (sin confirmación en boot/scan).
 * @param {{ rank?: string, isProgramAdmin?: boolean }} peer
 * @param {{ rank?: string, isProgramAdmin?: boolean }} self
 */
export function shouldAutoJoinPeerAsClient(peer, self) {
  if (!peer || !self) return false;
  if (shouldDeferToPeerHost(peer, self)) return true;
  if (!prefersLanHosting(self) && prefersLanHosting(peer)) return true;
  const tier = getHostEscalationTier();
  if (!canRankHostAtEscalationTier(peer, tier)) return false;
  if (!canRankHostAtEscalationTier(self, tier)) return true;
  return lanHostPriority(peer) > lanHostPriority(self);
}

/**
 * @param {{ rank?: string, isProgramAdmin?: boolean, startedAt?: number }} selfMeta
 * @param {{ rank?: string, isProgramAdmin?: boolean, startedAt?: number }} peerMeta
 * @param {{ selfUrl?: string, peerUrl?: string }} [urls]
 * @returns {'self'|'peer'|'tie-self'|'tie-peer'}
 */
export function resolveHostElection(selfMeta, peerMeta, urls = {}) {
  const selfPri = lanHostPriority(selfMeta);
  const peerPri = lanHostPriority(peerMeta);
  if (peerPri > selfPri) return 'peer';
  if (selfPri > peerPri) return 'self';

  const selfStarted = Number(selfMeta?.startedAt) || 0;
  const peerStarted = Number(peerMeta?.startedAt) || 0;
  const selfMissing = selfStarted <= 0;
  const peerMissing = peerStarted <= 0;
  if (!selfMissing && peerMissing) return 'self';
  if (selfMissing && !peerMissing) return 'peer';
  if (peerStarted < selfStarted) return 'peer';
  if (selfStarted < peerStarted) return 'self';

  const selfUrl = String(urls.selfUrl || '').trim();
  const peerUrl = String(urls.peerUrl || '').trim();
  if (peerUrl && selfUrl && peerUrl < selfUrl) return 'tie-peer';
  if (peerUrl && selfUrl && selfUrl < peerUrl) return 'tie-self';
  return 'tie-self';
}

/** @deprecated use shouldDeferToPeerHost — rank string only */
export function shouldSupersedeRank(peerRank, myRank) {
  return (RANK_PRIORITY[String(peerRank || '').trim()] || 0) >
    (RANK_PRIORITY[String(myRank || '').trim()] || 0);
}

/**
 * @param {string} hostUrl
 * @param {string} teamCode
 * @returns {Promise<{ rank: string, isProgramAdmin: boolean } | null>}
 */
export async function fetchLanHostRank(hostUrl, teamCode) {
  const base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  const code = String(teamCode || '').trim();
  if (!base || !code) return null;
  try {
    const resp = await fetch(`${base}/api/lan/v1/host-rank`, {
      headers: { Authorization: `Bearer ${code}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      rank: String(data?.rank || 'R1').trim() || 'R1',
      isProgramAdmin: !!(data?.isProgramAdmin || data?.is_program_admin),
      startedAt: Number(data?.startedAt) || 0,
    };
  } catch (_e) {
    return null;
  }
}

/**
 * @param {string[]} peerUrls
 * @param {string} teamCode
 * @param {{ rank: string, isProgramAdmin: boolean }} selfMeta
 */
function peerBeatsSelfElection(election) {
  return election === 'peer' || election === 'tie-peer';
}

/** @returns {'silent-join'|'confirm-consolidate'|'stay-warn'|'noop'} */
export function evaluatePeerHostAction(selfMeta, peerMeta, election) {
  if (election === 'self' || election === 'tie-self') {
    if (prefersLanHosting(peerMeta) && prefersLanHosting(selfMeta)) return 'stay-warn';
    return 'noop';
  }
  if (shouldAutoJoinPeerAsClient(peerMeta, selfMeta)) return 'silent-join';
  if (
    prefersLanHosting(selfMeta) &&
    (election === 'peer' || election === 'tie-peer')
  ) {
    return 'confirm-consolidate';
  }
  return 'noop';
}

function comparePeerCandidates(a, b) {
  const priDiff = lanHostPriority(b.peer) - lanHostPriority(a.peer);
  if (priDiff !== 0) return priDiff;
  const aStarted = Number(a.peer?.startedAt) || 0;
  const bStarted = Number(b.peer?.startedAt) || 0;
  const aMissing = aStarted <= 0;
  const bMissing = bStarted <= 0;
  if (!aMissing && bMissing) return -1;
  if (aMissing && !bMissing) return 1;
  if (aStarted !== bStarted) return aStarted - bStarted;
  return String(a.url).localeCompare(String(b.url));
}

/**
 * @param {string[]} peerUrls
 * @param {string} teamCode
 * @param {{ rank: string, isProgramAdmin: boolean, startedAt?: number }} selfMeta
 * @param {string} [selfUrl]
 */
export async function pickPreferredLanPeerHost(peerUrls, teamCode, selfMeta, selfUrl = '') {
  let best = null;
  for (const url of peerUrls || []) {
    const peer = await fetchLanHostRank(url, teamCode);
    if (!peer || !shouldAutoJoinPeerAsClient(peer, selfMeta)) continue;
    const election = resolveHostElection(selfMeta, peer, { selfUrl, peerUrl: url });
    if (!peerBeatsSelfElection(election)) continue;
    if (!best || comparePeerCandidates({ url, peer }, { url: best.url, peer: best.peer }) < 0) {
      best = { url, peer, election };
    }
  }
  return best;
}
