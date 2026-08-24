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
  return cachedAppVersion;
}
