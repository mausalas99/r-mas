/**
 * Expired Nube session prompt: the sync worker answers 403 `auth_required`
 * when a stored token no longer works. Sync then stops, so the user sees a
 * "Cuenta Nube" card in Mi perfil until a request with a token succeeds again.
 * The Nube panel also opens on its login form, once per expired token.
 */
import { isCloudMobileClient } from '../cloud-mobile/origin.mjs';

const TARGET_IDS = ['profile-nube-session'];

/** @param {boolean} expired */
function setPromptVisible(expired) {
  if (typeof document === 'undefined') return;
  for (const id of TARGET_IDS) {
    const el = document.getElementById(id);
    if (el) el.hidden = !expired;
  }
}

/** Token of a deliberate «Cerrar sesión»: its answers say nothing about expiry. */
let signedOutToken = '';
/** Expired token already handled: late 403s of its in-flight requests do nothing. */
let expiredToken = '';

/** Drop the dead token and open the Nube panel on its empty login form. */
async function openLoginForExpiredSession() {
  const { clearCloudSyncSession } = await import('./settings.mjs');
  clearCloudSyncSession();
  await openNubeLogin();
}

/**
 * Called by the API client on every response sent with a token.
 * @param {number} status
 * @param {Record<string, unknown>} data
 * @param {string} [token] the token the request was sent with
 */
export function noteNubeAuthResponse(status, data, token) {
  // R+ Móvil has its own login gate; ⇄ Conexión does not exist there.
  if (isCloudMobileClient()) return;
  if (token && token === signedOutToken) return;
  if (status >= 200 && status < 300) setPromptVisible(false);
  else if (status === 403 && data?.error === 'auth_required') {
    setPromptVisible(true);
    if (token && token !== expiredToken && typeof document !== 'undefined') {
      expiredToken = token;
      openLoginForExpiredSession().catch(() => {});
    }
  }
}

/** «Cerrar sesión»: hide the prompt; requests still out with this token are ignored. */
export function noteNubeSignedOut(token) {
  signedOutToken = String(token || '');
  setPromptVisible(false);
}

export async function openNubeLogin() {
  const { closeProfileModal } = await import('../profile-modal.mjs');
  if (document.getElementById('profile-modal')?.classList.contains('open')) closeProfileModal();
  const { openConnectionDropdown } = await import('./panel-chrome.mjs');
  openConnectionDropdown();
}

if (typeof window !== 'undefined') {
  window.openNubeLogin = openNubeLogin;
}
