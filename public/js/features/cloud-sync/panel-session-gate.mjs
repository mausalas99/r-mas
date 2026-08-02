/**
 * Gate ⇄ Conexión post-auth chrome (R4, censo, QR, LWW) until Nube session exists.
 */

/** @param {unknown} token */
export function shouldShowNubePostAuthChrome(token) {
  return Boolean(token && String(token).trim());
}
