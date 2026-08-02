import { esc } from '../../dom-escape.mjs';
import {
  CLINICAL_LAN_USERNAME_HINT_HTML,
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  readRpcSettings,
} from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';

/**
 * @param {{ username?: string, displayName?: string } | null} cloudUser
 */
function accountSummaryInnerHtml(cloudUser) {
  const settings = readRpcSettings();
  const handle = normalizeUsername(
    cloudUser?.username || clinicalSessionContext.user?.username || settings.clinicalUsername || ''
  );
  const display =
    cloudUser?.displayName ||
    clinicalSessionContext.user?.clinical_name ||
    settings.clinicalDisplayName ||
    '';
  return (
    '<p><span class="cloud-sync-account-label">Usuario</span> <strong>@' + esc(handle || '—') + '</strong></p>' +
    '<p><span class="cloud-sync-account-label">Nombre en guardia</span> <strong>' + esc(display || '—') + '</strong></p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="logout">Cerrar sesión</button>'
  );
}

/** @param {string} url */
function advancedUrlFieldHtml(url) {
  return (
    '<details class="cloud-sync-advanced"><summary>Avanzado</summary>' +
    '<div class="cloud-sync-field"><label for="cloud-sync-url">URL del servicio</label>' +
    '<input id="cloud-sync-url" type="url" class="profile-input" data-cloud-sync-url value="' + esc(url) +
    '" placeholder="https://…workers.dev" /></div></details>'
  );
}

/** @param {string} url */
export function connectStepHtml(url) {
  return (
    '<div class="cloud-sync-step" data-cloud-step="1">' +
    '<div class="cloud-sync-step-head">' +
    '<strong class="cloud-sync-step-title">1 · Conectar a Nube</strong>' +
    '<span class="cloud-sync-status-chip is-pending">Modo Nube · Sin sesión</span></div>' +
    '<p class="cloud-sync-lead">Conectate para sincronizar el censo del turno. No hace falta host LAN.</p>' +
    '<div class="cloud-sync-tabs" role="tablist" aria-label="Cuenta Nube">' +
    '<button type="button" class="cloud-sync-tab is-active" role="tab" aria-selected="true" data-cloud-tab="login">Entrar</button>' +
    '<button type="button" class="cloud-sync-tab" role="tab" aria-selected="false" data-cloud-tab="register">Crear</button>' +
    '<button type="button" class="cloud-sync-tab" role="tab" aria-selected="false" data-cloud-tab="recover">Recuperar</button></div>' +
    '<div class="cloud-sync-tab-panels">' +
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="login" role="tabpanel">' +
    '<div class="cloud-sync-field"><label>Usuario LAN (@usuario)</label>' +
    '<input type="text" class="profile-input" data-cloud-login-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" /></div>' +
    '<div class="cloud-sync-field"><label>Contraseña</label>' +
    '<input type="password" class="profile-input" data-cloud-login-pass autocomplete="current-password" /></div>' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="login">Entrar</button></div>' +
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="register" role="tabpanel" hidden>' +
    '<div class="cloud-sync-field"><label>Usuario LAN (@usuario)</label>' +
    '<input type="text" class="profile-input" data-cloud-reg-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" />' +
    '<p class="cloud-sync-hint">' + CLINICAL_LAN_USERNAME_HINT_HTML + '</p></div>' +
    '<div class="cloud-sync-field"><label>Nombre en guardia</label>' +
    '<input type="text" class="profile-input" data-cloud-reg-display autocomplete="name" placeholder="ej. Dr. Mendoza" />' +
    '<p class="cloud-sync-hint">' + CLINICAL_LAN_DISPLAY_NAME_HINT_HTML + '</p></div>' +
    '<div class="cloud-sync-field"><label>Contraseña</label>' +
    '<input type="password" class="profile-input" data-cloud-reg-pass autocomplete="new-password" /></div>' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="register">Crear cuenta</button></div>' +
    '<div class="cloud-sync-tab-panel" data-cloud-tab-panel="recover" role="tabpanel" hidden>' +
    '<div class="cloud-sync-field"><label>Usuario LAN (@usuario)</label>' +
    '<input type="text" class="profile-input" data-cloud-recover-user autocomplete="username" placeholder="ej. drmendoza" spellcheck="false" /></div>' +
    '<div class="cloud-sync-field"><label>Código de recuperación</label>' +
    '<input type="text" class="profile-input" data-cloud-recover-code autocomplete="off" placeholder="R+XXXX-XXXX-XXXX" spellcheck="false" /></div>' +
    '<div class="cloud-sync-field"><label>Nueva contraseña</label>' +
    '<input type="password" class="profile-input" data-cloud-recover-pass autocomplete="new-password" /></div>' +
    '<div class="cloud-sync-field"><label>Confirmar contraseña</label>' +
    '<input type="password" class="profile-input" data-cloud-recover-pass2 autocomplete="new-password" /></div>' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="recover">Recuperar cuenta</button></div></div>' +
    advancedUrlFieldHtml(url) +
    '</div>'
  );
}

/**
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, roomHtml: string, equipoHtml: string, masBodyHtml: string }} opts
 */
export function connectedStepsHtml({ cloudUser, roomHtml, equipoHtml, masBodyHtml }) {
  return (
    '<div class="cloud-sync-connected-steps">' +
    '<div class="cloud-sync-step cloud-sync-step--account">' +
    '<div class="cloud-sync-account-summary">' + accountSummaryInnerHtml(cloudUser) + '</div></div>' +
    '<div class="cloud-sync-step" data-cloud-step="2">' +
    '<div class="cloud-sync-step-head"><strong class="cloud-sync-step-title">2 · Sala del turno</strong></div>' +
    roomHtml + '</div>' +
    '<div class="cloud-sync-step" data-cloud-step="3">' +
    '<div class="cloud-sync-step-head"><strong class="cloud-sync-step-title">3 · Equipo</strong></div>' +
    equipoHtml + '</div>' +
    '<details class="cloud-sync-mas">' +
    '<summary class="cloud-sync-step-head cloud-sync-mas-summary"><strong class="cloud-sync-step-title">4 · Más</strong></summary>' +
    '<div class="cloud-sync-mas-body">' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="regenerate-recovery">Regenerar código de recuperación</button>' +
    masBodyHtml +
    '</div></details></div>'
  );
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
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    section.querySelectorAll('[data-cloud-tab-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-cloud-tab-panel') !== tab;
    });
  });
}
