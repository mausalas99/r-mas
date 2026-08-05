import {
  persistClinicalUserBinding
} from "/mobile/js/chunks/chunk-3566DTDN.js";
import {
  normalizeUsername,
  shouldClaimClinicalUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import {
  clinicalSessionContext,
  resolveClinicalSessionUserId
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/features/cloud-sync/identity-bridge.mjs
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function readClientId() {
  try {
    const { readRpcSettings } = await import("/mobile/js/chunks/clinical-settings-LWHIEZQA.js");
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
async function tryUpsertClinicalName(sessionUserId, displayName) {
  const name = String(displayName || "").trim();
  if (!name) return { ok: true };
  const api = dbApi();
  if (!api || typeof api.dbClinicalProfileUpsert !== "function") return { ok: true };
  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: name,
    rank: String(clinicalSessionContext.user?.rank || "R1"),
    sala: clinicalSessionContext.user?.sala || null,
    isProgramAdmin: false
  });
  if (!profileRes?.ok) {
    return { ok: false, error: profileRes?.error || "No se guard\xF3 el nombre cl\xEDnico." };
  }
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.clinical_name = name;
  }
  return { ok: true };
}
function normalizeCloudIdentityUsername(raw) {
  return normalizeUsername(raw);
}
async function bridgeCloudIdentityToLocal({ username, displayName }) {
  const localHandle = normalizeCloudIdentityUsername(username);
  const clinicalName = String(displayName || "").trim();
  const sessionUserId = resolveClinicalSessionUserId();
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.username = localHandle;
    if (clinicalName) clinicalSessionContext.user.clinical_name = clinicalName;
  }
  if (sessionUserId) {
    await tryClaimUsername(sessionUserId, localHandle);
    if (clinicalName) await tryUpsertClinicalName(sessionUserId, clinicalName);
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
  return { username: localHandle, displayName: clinicalName };
}

export {
  bridgeCloudIdentityToLocal
};
//# sourceMappingURL=/js/chunks/chunk-YQNA53YU.js.map
