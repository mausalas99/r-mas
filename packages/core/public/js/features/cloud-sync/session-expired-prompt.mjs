/**
 * Expired Nube session prompt: the sync worker answers 403 `auth_required`
 * when a stored token no longer works. Sync then stops, so the user sees a
 * banner (every screen) and a "Cuenta Nube" card in Mi perfil until a request
 * with a token succeeds again.
 */
import { isCloudMobileClient } from '../cloud-mobile/origin.mjs';

const TARGET_IDS = ['nube-session-banner', 'profile-nube-session'];

/** @param {boolean} expired */
function setPromptVisible(expired) {
  if (typeof document === 'undefined') return;
  for (const id of TARGET_IDS) {
    const el = document.getElementById(id);
    if (el) el.hidden = !expired;
  }
}

/**
 * Called by the API client on every response sent with a token.
 * @param {number} status
 * @param {Record<string, unknown>} data
 */
export function noteNubeAuthResponse(status, data) {
  // R+ Móvil has its own login gate; ⇄ Conexión does not exist there.
  if (isCloudMobileClient()) return;
  if (status >= 200 && status < 300) setPromptVisible(false);
  else if (status === 403 && data?.error === 'auth_required') setPromptVisible(true);
}

export async function openNubeLogin() {
  const { closeProfileModal } = await import('../profile-modal.mjs');
  if (document.getElementById('profile-modal')?.classList.contains('open')) closeProfileModal();
  const { openConnectionDropdown } = await import('./panel-chrome.mjs');
  openConnectionDropdown();
}

export function dismissNubeSessionBanner() {
  const el = typeof document !== 'undefined' ? document.getElementById('nube-session-banner') : null;
  if (el) el.hidden = true;
}

if (typeof window !== 'undefined') {
  window.openNubeLogin = openNubeLogin;
  window.dismissNubeSessionBanner = dismissNubeSessionBanner;
}
