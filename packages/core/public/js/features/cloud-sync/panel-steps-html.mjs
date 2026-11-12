import { getCloudSyncRemember } from './settings.mjs';

function readCloudRememberChecked() {
  try {
    return getCloudSyncRemember();
  } catch {
    return false;
  }
}

/**
 * Signed-out Nube home data (board «Nube sin sesión», variant D): the account card is the sign-in form
 * (Crear cuenta and Recuperar swap in place), «Tu sala» waits greyed, «Avanzado» last.
 * The status hero above it lives in the panel head.
 * @param {string} url @param {string} [displaySala]
 */
export function signedOutBodyModel(url, displaySala = '') {
  return { kind: 'signedOut', url, sala: String(displaySala || '').trim(), remember: readCloudRememberChecked() };
}

/** @param {HTMLElement} section */
export function wireCloudAuthTabs(section) {
  if (section.dataset.cloudTabsWired === '1') return;
  section.dataset.cloudTabsWired = '1';
  section.addEventListener('click', function (ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-cloud-tab]') : null;
    if (!btn || !section.contains(btn)) return;
    const tab = btn.getAttribute('data-cloud-tab');
    if (!tab) return;
    section.querySelectorAll('[data-cloud-tab]').forEach(function (b) {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      // Only real tabs carry aria-selected; the «Crear cuenta» / «‹ Entrar» links are plain buttons.
      if (b.getAttribute('role') === 'tab') b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    section.querySelectorAll('[data-cloud-tab-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-cloud-tab-panel') !== tab;
    });
    section.querySelector('[data-cloud-tab-panel="' + tab + '"] input')?.focus();
  });
}
