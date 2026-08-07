import {
  clinicalSessionContext,
  resolveClinicalSessionUserId,
} from '../../clinical-session-context.mjs';
import { persistClinicalUserBinding } from '../../clinical-settings.mjs';
import {
  normalizeUsername,
  shouldClaimClinicalUsername,
} from '../../clinical-username.mjs';

/** @returns {import('../../preload.js').ElectronAPI | null} */
function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {string} username */
async function readClientId() {
  try {
    const { readRpcSettings } = await import('../../clinical-settings.mjs');
    return String(readRpcSettings().clientId || '');
  } catch {
    return '';
  }
}

/** @param {string} username @param {string} clientId */
function shouldSkipUsernameClaim(username, clientId) {
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || '');
  return !shouldClaimClinicalUsername(currentHandle, username, clientId);
}

async function tryClaimUsername(sessionUserId, username) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalUsernameClaim !== 'function') return { ok: true };

  const clientId = await readClientId();
  if (shouldSkipUsernameClaim(username, clientId)) return { ok: true };

  const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username });
  if (claimRes?.ok) {
    if (clinicalSessionContext.user) clinicalSessionContext.user.username = username;
    return { ok: true };
  }
  if (/ya está en uso/i.test(String(claimRes?.error || ''))) {
    return { ok: true };
  }
  return { ok: false, error: claimRes?.error || 'No se pudo registrar @usuario.' };
}

/** @param {{ displayName?: string, rank?: string, sala?: string|null }} profile */
function applyProfileToSession(profile) {
  if (!clinicalSessionContext.user) return;
  const name = String(profile.displayName || '').trim();
  if (name) clinicalSessionContext.user.clinical_name = name;
  if (profile.rank) clinicalSessionContext.user.rank = profile.rank;
  if (profile.sala != null) clinicalSessionContext.user.sala = profile.sala;
}

/**
 * @param {string} sessionUserId
 * @param {{ displayName?: string, rank?: string, sala?: string|null }} profile
 */
async function tryUpsertClinicalProfile(sessionUserId, profile) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalProfileUpsert !== 'function') return { ok: true };

  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: String(profile.displayName || '').trim(),
    rank: String(profile.rank || clinicalSessionContext.user?.rank || 'R1'),
    sala: profile.sala ?? clinicalSessionContext.user?.sala ?? null,
    isProgramAdmin: false,
  });
  if (!profileRes?.ok) {
    return { ok: false, error: profileRes?.error || 'No se guardó el perfil clínico.' };
  }
  applyProfileToSession(profile);
  return { ok: true };
}

/** @param {string} raw */
export function normalizeCloudIdentityUsername(raw) {
  return normalizeUsername(raw);
}

/**
 * After cloud register/login, sync @usuario + perfil clínico to local session.
 * @param {{ username: string, displayName?: string, rank?: string, sala?: string|null }} params
 */
export async function bridgeCloudIdentityToLocal({ username, displayName, rank, sala }) {
  const localHandle = normalizeCloudIdentityUsername(username);
  const clinicalName = String(displayName || '').trim();
  const clinicalRank = String(rank || clinicalSessionContext.user?.rank || 'R1');
  const clinicalSala = sala ?? clinicalSessionContext.user?.sala ?? null;
  const sessionUserId = resolveClinicalSessionUserId();

  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.username = localHandle;
    if (clinicalName) clinicalSessionContext.user.clinical_name = clinicalName;
    clinicalSessionContext.user.rank = clinicalRank;
    if (clinicalSala != null) clinicalSessionContext.user.sala = clinicalSala;
  }

  if (sessionUserId) {
    await tryClaimUsername(sessionUserId, localHandle);
    await tryUpsertClinicalProfile(sessionUserId, {
      displayName: clinicalName,
      rank: clinicalRank,
      sala: clinicalSala,
    });
  }

  persistClinicalUserBinding({
    userId: sessionUserId || undefined,
    username: localHandle,
    displayName: clinicalName || undefined,
    registered: true,
    lanProfileGateComplete: true,
  });

  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  }

  return { username: localHandle, displayName: clinicalName, rank: clinicalRank };
}
