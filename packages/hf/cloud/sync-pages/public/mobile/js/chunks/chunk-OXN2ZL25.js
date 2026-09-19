// public/js/features/cloud-mobile/origin.mjs
function isCloudMobileClient() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return true;
  if (typeof document !== "undefined") {
    if (document.documentElement?.dataset?.cloudMobile === "1") return true;
    if (document.documentElement?.classList?.contains("rpc-cloud-mobile")) return true;
  }
  if (typeof location !== "undefined") {
    const path = String(location.pathname || "");
    if (/^\/mobile(\/|$)/i.test(path)) return true;
  }
  return false;
}

export {
  isCloudMobileClient
};
//# sourceMappingURL=/js/chunks/chunk-OXN2ZL25.js.map
