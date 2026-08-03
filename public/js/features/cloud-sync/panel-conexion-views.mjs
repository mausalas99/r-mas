import { esc } from '../../dom-escape.mjs';
import { readRpcSettings } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { hasElevatedTeamPrivileges } from '../../clinical-privileges.mjs';
import { advancedUrlFieldsHtml } from './panel-conexion-html.mjs';
import { canAccessCloudAdmin } from './panel-admin.mjs';

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
      : '<header class="cloud-sync-view-bar">' +
        '<button type="button" class="cloud-sync-view-back" data-cloud-action="nav-back">' +
        '<span class="cloud-sync-view-back-chevron" aria-hidden="true">‹</span>' +
        'Opciones</button>' +
        '<h4 class="cloud-sync-view-title">' +
        esc(title) +
        '</h4></header>';
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
    '<span class="cloud-sync-options-row-chevron" aria-hidden="true">›</span></button>'
  );
}

/** @param {string} label @param {string} rowsHtml */
function optionsGroup(label, rowsHtml) {
  if (!rowsHtml) return '';
  return (
    '<section class="cloud-sync-options-group">' +
    '<h5 class="cloud-sync-options-label">' +
    esc(label) +
    '</h5>' +
    '<div class="cloud-sync-options-card">' +
    rowsHtml +
    '</div></section>'
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
 *   hasCloudSession?: boolean,
 * }} opts
 */
export function connectedViewsHtml({
  cloudUser,
  roomHtml,
  equipoHtml,
  adminHtml = '',
  url,
  hasCloudSession = false,
}) {
  const showAdmin =
    !!String(adminHtml || '').trim() ||
    canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession });
  const adminHost = showAdmin
    ? String(adminHtml || '').trim() ||
      '<div class="cloud-sync-admin-host" data-cloud-admin-host></div>'
    : '';
  const showOps = hasElevatedTeamPrivileges(clinicalSessionContext.user);
  const statusBody =
    '<div class="cloud-sync-status-sheet">' +
    roomHtml +
    statusIdentityHtml(cloudUser) +
    '<button type="button" class="cloud-sync-options-entry" data-cloud-action="nav-options">' +
    '<span class="cloud-sync-options-entry-text">' +
    '<span class="cloud-sync-options-entry-title">Opciones</span>' +
    '<span class="cloud-sync-options-entry-meta">Equipo, cuenta y administración</span></span>' +
    '<span class="cloud-sync-options-row-chevron" aria-hidden="true">›</span></button></div>';

  let guardiaRows = optionsRow('Equipo', 'Mi rotación', 'equipo');
  if (showOps) {
    guardiaRows += optionsRow('Operaciones', 'Equipos y censo del turno', 'ops');
  }
  let cuentaRows = optionsRow('Cuenta', 'Recuperación y sesión', 'cuenta');
  if (showAdmin) {
    cuentaRows += optionsRow('Administración', 'Usuarios, salas y clave admin', 'admin');
  }
  const sistemaRows =
    optionsRow('Diagnóstico LAN', 'Cola local · no es Nube', 'lan') +
    optionsRow('Avanzado', 'URL del servicio', 'advanced');

  const optionsBody =
    optionsGroup('Guardia', guardiaRows) +
    optionsGroup('Cuenta', cuentaRows) +
    optionsGroup('Sistema', sistemaRows);

  return (
    '<div class="cloud-sync-views" data-cloud-views>' +
    viewBlock('status', 'Conexión', statusBody, false) +
    viewBlock('options', 'Opciones', '<div class="cloud-sync-options-list">' + optionsBody + '</div>') +
    viewBlock('equipo', 'Equipo', equipoHtml) +
    (showOps
      ? viewBlock(
          'ops',
          'Operaciones',
          '<div class="cloud-sync-ops-host" data-cloud-ops-host aria-hidden="true"></div>'
        )
      : '') +
    viewBlock('cuenta', 'Cuenta', cuentaBodyHtml(cloudUser)) +
    (showAdmin ? viewBlock('admin', 'Administración', adminHost) : '') +
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
    hasCloudSession: opts.hasCloudSession,
  });
}

/**
 * Panel root that owns `.lan-connection-stack` (sibling of Nube section).
 * @param {HTMLElement | null} from
 * @returns {HTMLElement | null}
 */
export function resolveConexionPanelRoot(from) {
  if (!from) return null;
  if (from.id === 'lan-connection-panel-root') return from;
  const closest = typeof from.closest === 'function' ? from.closest('#lan-connection-panel-root') : null;
  if (closest) return closest;
  if (from.querySelector?.('.lan-connection-stack')) return from;
  return from.parentElement;
}

/**
 * Hide/show Nube secondary LAN stack sections by view.
 * @param {HTMLElement | null} root
 * @param {string} view
 */
export function syncCloudSecondaryPanels(root, view) {
  const panel = resolveConexionPanelRoot(root);
  if (!panel) return;
  const stack = panel.querySelector('.lan-connection-stack');
  if (!stack) return;
  const showOps = view === 'ops';
  const showLan = view === 'lan';
  const showStack = showOps || showLan;
  stack.hidden = !showStack;
  stack.setAttribute('data-cloud-stack-view', showOps ? 'ops' : showLan ? 'lan' : 'hidden');
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
  // Home chrome (Conexión + chip) only on status — subviews get a clean page.
  const head = section.querySelector('.cloud-sync-conexion-head');
  if (head && section.querySelector('[data-cloud-views]')) {
    head.hidden = next !== 'status';
  }
  syncCloudSecondaryPanels(resolveConexionPanelRoot(section), next);
  if (next === 'admin' && typeof hooks?.onAdmin === 'function') {
    void hooks.onAdmin();
  }
}
