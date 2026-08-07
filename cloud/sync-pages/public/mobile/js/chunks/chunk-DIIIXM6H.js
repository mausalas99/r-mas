import {
  clinicalSessionContext,
  resolveClinicalSessionUserId
} from "/mobile/js/chunks/chunk-IIOGZLID.js";
import {
  persistClinicalUserBinding
} from "/mobile/js/chunks/chunk-6WZSBH4P.js";
import {
  normalizeUsername,
  shouldClaimClinicalUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/features/cloud-sync/identity-bridge.mjs
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function readClientId() {
  try {
    const { readRpcSettings } = await import("/mobile/js/chunks/clinical-settings-LYOVO2CZ.js");
    return String(readRpcSettings().clientId || "");
  } catch {
    return "";
  }
}
function shouldSkipUsernameClaim(username, clientId) {
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || "");
  return !shouldClaimClinicalUsername(currentHandle, username, clientId);
}
async function tryClaimUsername(sessionUserId, username) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalUsernameClaim !== "function") return { ok: true };
  const clientId = await readClientId();
  if (shouldSkipUsernameClaim(username, clientId)) return { ok: true };
  const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username });
  if (claimRes?.ok) {
    if (clinicalSessionContext.user) clinicalSessionContext.user.username = username;
    return { ok: true };
  }
  if (/ya está en uso/i.test(String(claimRes?.error || ""))) {
    return { ok: true };
  }
  return { ok: false, error: claimRes?.error || "No se pudo registrar @usuario." };
}
function applyProfileToSession(profile) {
  if (!clinicalSessionContext.user) return;
  const name = String(profile.displayName || "").trim();
  if (name) clinicalSessionContext.user.clinical_name = name;
  if (profile.rank) clinicalSessionContext.user.rank = profile.rank;
  if (profile.sala != null) clinicalSessionContext.user.sala = profile.sala;
}
async function tryUpsertClinicalProfile(sessionUserId, profile) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalProfileUpsert !== "function") return { ok: true };
  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: String(profile.displayName || "").trim(),
    rank: String(profile.rank || clinicalSessionContext.user?.rank || "R1"),
    sala: profile.sala ?? clinicalSessionContext.user?.sala ?? null,
    isProgramAdmin: false
  });
  if (!profileRes?.ok) {
    return { ok: false, error: profileRes?.error || "No se guard\xF3 el perfil cl\xEDnico." };
  }
  applyProfileToSession(profile);
  return { ok: true };
}
function normalizeCloudIdentityUsername(raw) {
  return normalizeUsername(raw);
}
async function bridgeCloudIdentityToLocal({ username, displayName, rank, sala }) {
  const localHandle = normalizeCloudIdentityUsername(username);
  const clinicalName = String(displayName || "").trim();
  const clinicalRank = String(rank || clinicalSessionContext.user?.rank || "R1");
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
      sala: clinicalSala
    });
  }
  persistClinicalUserBinding({
    userId: sessionUserId || void 0,
    username: localHandle,
    displayName: clinicalName || void 0,
    registered: true,
    lanProfileGateComplete: true
  });
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  }
  return { username: localHandle, displayName: clinicalName, rank: clinicalRank };
}

export {
  bridgeCloudIdentityToLocal
};
//# sourceMappingURL=/js/chunks/chunk-DIIIXM6H.js.map
