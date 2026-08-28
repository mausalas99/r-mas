/** Cached app version for the sync Worker's fleet-adoption tracking (login/register). */
let cachedAppVersion = '';

if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
  window.electronAPI
    .getAppVersion()
    .then(function (v) {
      cachedAppVersion = String(v || '');
    })
    .catch(function () {});
}

/** @returns {string} empty string if unresolved yet (early boot) or non-Electron (web/dev). */
export function getCachedAppVersion() {
  if (cachedAppVersion) return cachedAppVersion;
  // R+ Móvil (cloud-mobile web build) has no Electron updater — the deployed
  // page is always the version stamped in at build time by build-cloud-mobile.mjs.
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__RPC_CLOUD_MOBILE_APP_VERSION__) {
      return String(globalThis.__RPC_CLOUD_MOBILE_APP_VERSION__);
    }
  } catch {
    /* ignore */
  }
  return '';
}
