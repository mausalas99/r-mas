import { esc } from '../../dom-escape.mjs';
import { getCloudSyncRemember } from './settings.mjs';

function readCloudRememberChecked() {
  try {
    return getCloudSyncRemember();
  } catch {
    return false;
  }
}

/** Recuérdame as a switch (the checkbox handlers read stays underneath). */
function rememberSwitchHtml(attr) {
  const id = 'cloud-sync-' + attr;
  return (
    '<div class="cloud-sync-auth-remember">' +
    '<label class="rpc-switch"><input type="checkbox" id="' + id + '" class="rpc-switch-input" role="switch" data-cloud-' + attr +
    (readCloudRememberChecked() ? ' checked' : '') +
    ' aria-labelledby="' + id + '-lbl" /><span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label>' +
    '<span id="' + id + '-lbl">Recuérdame en este dispositivo <span class="cloud-sync-auth-hint">· no en una Mac compartida</span></span></div>'
  );
}

/** @param {string} key @param {string} label @param {string} input @param {string} [hint] */
function authFieldHtml(key, label, input, hint) {
  return (
    '<div class="cloud-sync-field"><label for="cloud-sync-' + key + '">' + label + '</label>' + input +
    (hint ? '<p class="cloud-sync-auth-hint">' + hint + '</p>' : '') + '</div>'
  );
}

function authInput(key, attr, type, extra) {
  return '<input id="cloud-sync-' + key + '" type="' + type + '" class="profile-input" data-cloud-' + attr + (extra || '') + ' />';
}

/** Head of the account card: person icon, what this mode does, ‹ Entrar off the login mode. */
function authHeadHtml(title, back) {
  return (
    '<div class="cloud-sync-auth-head"><span class="cloud-sync-avatar cloud-sync-avatar--empty" aria-hidden="true">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></span>' +
    '<h4 class="cloud-sync-auth-title">' + title + '</h4>' +
    (back ? '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-auth-back" data-cloud-tab="login">‹ Entrar</button>' : '') +
    '</div>'
  );
}

const USER_INPUT = ' autocomplete="username" placeholder="drdemo" spellcheck="false"';

function loginPanelHtml() {
  return (
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="login" role="tabpanel">' +
    authHeadHtml('Entra a tu cuenta', false) +
    '<div class="cloud-sync-auth-grid">' +
    authFieldHtml('login-user', 'Usuario', authInput('login-user', 'login-user', 'text', USER_INPUT)) +
    authFieldHtml('login-pass', 'Contraseña', authInput('login-pass', 'login-pass', 'password', ' autocomplete="current-password"')) +
    '</div>' +
    '<div class="cloud-sync-auth-foot">' + rememberSwitchHtml('login-remember') +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary ui-pressable" data-cloud-action="login">Entrar</button></div>' +
    '<div class="cloud-sync-auth-links">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-tab="register">Crear cuenta</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-tab="recover">¿Olvidaste tu contraseña?</button></div></div>'
  );
}

function registerPanelHtml() {
  return (
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="register" role="tabpanel" hidden>' +
    authHeadHtml('Crea tu cuenta', true) +
    '<div class="cloud-sync-auth-grid">' +
    authFieldHtml('reg-user', 'Usuario', authInput('reg-user', 'reg-user', 'text', USER_INPUT), 'Minúsculas, sin espacios ni acentos. Sin «Dr.».') +
    authFieldHtml('reg-display', 'Nombre en guardia', authInput('reg-display', 'reg-display', 'text', ' autocomplete="name" placeholder="Dr. Demo"'), 'Así te ven en el censo y las entregas.') +
    '</div>' +
    authFieldHtml('reg-pass', 'Contraseña', authInput('reg-pass', 'reg-pass', 'password', ' autocomplete="new-password"')) +
    rememberSwitchHtml('reg-remember') +
    '<div class="cloud-sync-auth-foot"><span class="cloud-sync-auth-hint">Luego te damos un código de recuperación. Guárdalo.</span>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary ui-pressable" data-cloud-action="register">Crear cuenta</button></div></div>'
  );
}

function recoverPanelHtml() {
  return (
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="recover" role="tabpanel" hidden>' +
    authHeadHtml('Recupera tu cuenta', true) +
    '<div class="cloud-sync-auth-grid">' +
    authFieldHtml('recover-user', 'Usuario', authInput('recover-user', 'recover-user', 'text', USER_INPUT)) +
    authFieldHtml('recover-code', 'Código de recuperación', authInput('recover-code', 'recover-code', 'text', ' autocomplete="off" placeholder="R+XXXX-XXXX-XXXX" spellcheck="false"')) +
    authFieldHtml('recover-pass', 'Nueva contraseña', authInput('recover-pass', 'recover-pass', 'password', ' autocomplete="new-password"')) +
    authFieldHtml('recover-pass2', 'Confírmala', authInput('recover-pass2', 'recover-pass2', 'password', ' autocomplete="new-password"')) +
    '</div>' +
    '<div class="cloud-sync-auth-foot"><span class="cloud-sync-auth-hint">Te damos un código nuevo; el anterior deja de servir.</span>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary ui-pressable" data-cloud-action="recover">Recuperar cuenta</button></div></div>'
  );
}

/**
 * Signed-out Nube home (board «Nube sin sesión», variant D): the same order
 * as the signed-in home — the account card is the sign-in form (Crear cuenta
 * and Recuperar swap in place), «Tu sala» waits greyed, «Avanzado» last.
 * The status hero above it lives in the panel head.
 * @param {string} url @param {string} [displaySala]
 */
export function connectStepHtml(url, displaySala = '') {
  const sala = String(displaySala || '').trim();
  return (
    '<div class="cloud-sync-status-sheet cloud-sync-signed-out" data-cloud-signed-out>' +
    '<div class="cloud-sync-inset-group cloud-sync-auth-card" aria-label="Cuenta Nube">' +
    loginPanelHtml() + registerPanelHtml() + recoverPanelHtml() +
    '</div>' +
    (sala
      ? '<div class="cloud-sync-room cloud-sync-room--waiting"><p class="cloud-sync-options-label">Tu sala</p>' +
        '<div class="cloud-sync-inset-group"><div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-inset-row--identity">' +
        '<span class="cloud-sync-options-entry-text"><span class="cloud-sync-room-name">' + esc(sala) + '</span>' +
        '<span class="cloud-sync-status-display">Se conecta al entrar</span></span></div></div></div>'
      : '') +
    '<details class="cloud-sync-inset-group cloud-sync-advanced cloud-sync-advanced--row"><summary>' +
    '<span class="cloud-sync-options-entry-text"><span class="cloud-sync-options-entry-title">Avanzado</span>' +
    '<span class="cloud-sync-options-entry-meta">URL del servicio</span></span></summary>' +
    '<div class="cloud-sync-field"><label for="cloud-sync-url">URL del servicio</label>' +
    '<input id="cloud-sync-url" type="url" class="profile-input" data-cloud-sync-url value="' + esc(url) +
    '" placeholder="https://…workers.dev" /></div></details>' +
    '</div>'
  );
}

export { connectedViewsHtml, connectedStepsHtml } from './panel-conexion-views.mjs';

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
