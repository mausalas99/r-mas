/**
 * Gate ⇄ Conexión post-auth chrome (R4, censo, QR, LWW) until Nube session exists.
 */

/** @param {unknown} token */
export function shouldShowNubePostAuthChrome(token) {
  return Boolean(token && String(token).trim());
}

/** @param {unknown} prevToken @param {unknown} nextToken */
export function shouldForcePanelRebuildOnAuthChange(prevToken, nextToken) {
  return shouldShowNubePostAuthChrome(prevToken) !== shouldShowNubePostAuthChrome(nextToken);
}

/** @param {{ cloudSala: boolean, cloudActive?: boolean }} opts */
export function shouldHidePrimaryLanChrome(opts) {
  return Boolean(opts && opts.cloudSala);
}
