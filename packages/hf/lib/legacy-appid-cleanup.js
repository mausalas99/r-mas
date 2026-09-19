'use strict';

// One-time cleanup of OS-level files left behind under the retired
// com.hospitaluniversitario.rplusclinical appId (renamed to com.rmas.rplusclinical
// for compliance — institution name must not appear anywhere in the app).
// These hold no patient data (that lives in userData/, keyed by productName "R+",
// unaffected by the appId change) — just window-state/prefs/updater-cache scraps.
const OLD_APP_ID = 'com.hospitaluniversitario.rplusclinical';

/**
 * @param {string} homeDir
 * @param {NodeJS.Platform} platform
 * @returns {string[]}
 */
function legacyAppIdPaths(homeDir, platform) {
  if (platform !== 'darwin') return [];
  const lib = `${homeDir}/Library`;
  return [
    `${lib}/Preferences/${OLD_APP_ID}.plist`,
    `${lib}/Saved Application State/${OLD_APP_ID}.savedState`,
    `${lib}/Caches/${OLD_APP_ID}`,
    `${lib}/Caches/${OLD_APP_ID}.ShipIt`,
    `${lib}/HTTPStorages/${OLD_APP_ID}`,
  ];
}

/**
 * @param {{ rmSync: (p: string, opts: object) => void }} fsLike
 * @param {string} homeDir
 * @param {NodeJS.Platform} platform
 * @returns {number} paths removed (best-effort; missing paths are not errors)
 */
function cleanupLegacyAppIdFiles(fsLike, homeDir, platform) {
  let removed = 0;
  for (const p of legacyAppIdPaths(homeDir, platform)) {
    try {
      fsLike.rmSync(p, { recursive: true, force: true });
      removed += 1;
    } catch {
      /* best-effort cleanup, never block startup */
    }
  }
  return removed;
}

module.exports = { OLD_APP_ID, legacyAppIdPaths, cleanupLegacyAppIdFiles };
