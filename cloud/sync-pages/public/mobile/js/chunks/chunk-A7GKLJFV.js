// public/js/clinical-session-context.mjs
var clinicalSessionContext = {
  user: null,
  guardias: [],
  guardiasMap: /* @__PURE__ */ new Map(),
  orphanGuardias: [],
  teams: [],
  scopeContext: null,
  guardiaMode: false,
  decryptedPrivateKeyPem: null,
  lastBlockHashByPatient: /* @__PURE__ */ new Map()
};
function resolveClinicalSessionUserId() {
  const fromCtx = String(clinicalSessionContext.user?.user_id || "").trim();
  if (fromCtx) return fromCtx;
  if (typeof localStorage === "undefined") return "";
  try {
    const settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    return String(settings.clinicalUserId || "").trim();
  } catch {
    return "";
  }
}

export {
  clinicalSessionContext,
  resolveClinicalSessionUserId
};
//# sourceMappingURL=/js/chunks/chunk-A7GKLJFV.js.map
