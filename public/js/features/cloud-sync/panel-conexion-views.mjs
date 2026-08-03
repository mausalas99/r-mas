import { esc } from '../../dom-escape.mjs';
import { readRpcSettings } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { hasElevatedTeamPrivileges } from '../../clinical-privileges.mjs';
import { advancedUrlFieldsHtml } from './panel-conexion-html.mjs';

/**
 * @param {{ username?: string, displayName?: string } | null} cloudUser
 * @returns {{ handle: string, display: string }}
 */
function resolveIdentity(cloudUser) {
  const settings = readRpcSettings();
  const handle = normalizeUsername(
    cloudUser?.username || clinicalSessionContext.user?.username || settings.clinicalUsername || ''
  );
  const display =
    cloudUser?.displayName ||
    clinicalSessionContext.user?.clinical_name ||
    settings.clinicalDisplayName ||
    '';
  return { handle, display };
}

/** @param {string} id @param {string} title @param {string} body @param {boolean} [hidden] */
function viewBlock(id, title, body, hidden = true) {
  const bar =
    id === 'status'
      ? ''
      : '<div class="cloud-sync-view-bar">' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-view-back" data-cloud-action="nav-back">← Volver</button>' +
        '<strong class="cloud-sync-view-title">' +
        esc(title) +
        '</strong></div>';
  return (
    '<div class="cloud-sync-view" data-cloud-view="' +
    esc(id) +
    '"' +
    (hidden ? ' hidden' : '') +
    '>' +
    bar +
    '<div class="cloud-sync-view-body">' +
    body +
    '</div></div>'
  );
}

/** @param {string} title @param {string} meta @param {string} view */
function optionsRow(title, meta, view) {
  return (
    '<button type="button" class="cloud-sync-options-row" data-cloud-action="nav-view" data-cloud-view="' +
    esc(view) +
    '">' +
    '<span class="cloud-sync-options-row-text">' +
    '<span class="cloud-sync-options-row-title">' +
    esc(title) +
    '</span>' +
    '<span class="cloud-sync-options-row-meta">' +
    esc(meta) +
    '</span></span>' +
    '<span class="cloud-sync-options-row-chevron" aria-hidden="true">→</span></button>'
  );
}

/**
 * @param {{ username?: string, displayName?: string } | null} cloudUser
 */
function statusIdentityHtml(cloudUser) {
  const { handle, display } = resolveIdentity(cloudUser);
  return (
    '<div class="cloud-sync-status-identity">' +
    '<p class="cloud-sync-status-handle">@' +
    esc(handle || '—') +
    '</p>' +
    (display
      ? '<p class="cloud-sync-status-display">' + esc(display) + '</p>'
      : '') +
    '</div>'
  );
}

/**
 * @param {{ username?: string, displayName?: string } | null} cloudUser
 */
function cuentaBodyHtml(cloudUser) {
  const { handle, display } = resolveIdentity(cloudUser);
  return (
    '<div class="cloud-sync-cuenta">' +
    '<p class="cloud-sync-status-handle">@' +
    esc(handle || '—') +
    '</p>' +
    (display
      ? '<p class="cloud-sync-status-display">' + esc(display) + '</p>'
      : '') +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="regenerate-recovery">Código de recuperación</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="logout">Cerrar sesión Nube</button></div>'
  );
}

/**
 * @param {{
 *   cloudUser: { username?: string, displayName?: string } | null,
 *   roomHtml: string,
 *   equipoHtml: string,
 *   adminHtml?: string,
 *   url: string,
 * }} opts
 */
export function connectedViewsHtml({ cloudUser, roomHtml, equipoHtml, adminHtml = '', url }) {
  const hasAdmin = !!String(adminHtml || '').trim();
  const showOps = hasElevatedTeamPrivileges(clinicalSessionContext.user);
  const statusBody =
    '<div class="cloud-sync-status-sheet">' +
    roomHtml +
    statusIdentityHtml(cloudUser) +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="nav-options">Opciones</button></div>';

  let optionsBody = '';
  optionsBody += optionsRow('Equipo', 'Mi rotación', 'equipo');
  if (showOps) {
    optionsBody += optionsRow('Operaciones', 'Equipos y censo del turno', 'ops');
  }
  optionsBody += optionsRow('Cuenta', 'Recuperación y sesión', 'cuenta');
  if (hasAdmin) {
    optionsBody += optionsRow('Administración', 'Usuarios y salas', 'admin');
  }
  optionsBody += optionsRow('Diagnóstico LAN', 'Cola local · no es Nube', 'lan');
  optionsBody += optionsRow('Avanzado', 'URL del servicio', 'advanced');

  return (
    '<div class="cloud-sync-views" data-cloud-views>' +
    viewBlock('status', 'Conexión', statusBody, false) +
    viewBlock('options', 'Opciones', '<div class="cloud-sync-options-list">' + optionsBody + '</div>') +
    viewBlock('equipo', 'Equipo', equipoHtml) +
    (showOps
      ? viewBlock(
          'ops',
          'Operaciones',
          '<p class="cloud-sync-hint">Crear equipos, censo global y rotación del turno.</p>'
        )
      : '') +
    viewBlock('cuenta', 'Cuenta', cuentaBodyHtml(cloudUser)) +
    (hasAdmin
      ? viewBlock('admin', 'Administración', adminHtml)
      : '') +
    viewBlock(
      'lan',
      'Diagnóstico LAN',
      '<p class="cloud-sync-hint">Informe del anfitrión local y cola outbox. Con Nube activa suele estar vacío.</p>'
    ) +
    viewBlock('advanced', 'Avanzado', advancedUrlFieldsHtml(url)) +
    '</div>'
  );
}

/** @deprecated Prefer connectedViewsHtml — kept for existing imports. */
export function connectedStepsHtml(opts) {
  return connectedViewsHtml({
    cloudUser: opts.cloudUser,
    roomHtml: opts.roomHtml,
    equipoHtml: opts.equipoHtml,
    adminHtml: opts.masBodyHtml || opts.adminHtml || '',
    url: opts.url || '',
  });
}

/**
 * Hide/show Nube secondary LAN stack sections by view.
 * @param {HTMLElement | null} root
 * @param {string} view
 */
export function syncCloudSecondaryPanels(root, view) {
  if (!root) return;
  const stack = root.querySelector('.lan-connection-stack');
  if (!stack) return;
  const showOps = view === 'ops';
  const showLan = view === 'lan';
  stack.hidden = !showOps && !showLan;
  stack.querySelectorAll('[data-cloud-secondary]').forEach(function (el) {
    const kind = el.getAttribute('data-cloud-secondary');
    if (kind === 'ops') el.hidden = !showOps;
    else if (kind === 'lan') el.hidden = !showLan;
  });
}

/**
 * @param {HTMLElement} section
 * @param {string} view
 * @param {{ onAdmin?: () => void | Promise<void> }} [hooks]
 */
export function applyConexionView(section, view, hooks) {
  const next = String(view || 'status').trim() || 'status';
  section.dataset.cloudView = next;
  section.querySelectorAll('[data-cloud-view]').forEach(function (el) {
    el.hidden = el.getAttribute('data-cloud-view') !== next;
  });
  syncCloudSecondaryPanels(section.parentElement, next);
  if (next === 'admin' && typeof hooks?.onAdmin === 'function') {
    void hooks.onAdmin();
  }
}
