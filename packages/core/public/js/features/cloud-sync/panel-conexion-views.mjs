import { esc } from '../../dom-escape.mjs';
import { readRpcSettings } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { advancedUrlFieldsHtml, statusHeroHtml, pipelineChainHtml } from './panel-conexion-html.mjs';
import { canAccessCloudAdmin } from './panel-admin.mjs';
import { canManageInternoQr } from '../../clinical-privileges.mjs';
import { setClinicalTeamsEmbedHost } from '../clinical-panel-host.mjs';
import { stopCloudSyncDiagnosticsLiveRefresh } from './panel-cloud-diagnostics.mjs';
import { buildPipeline, buildLiveTileFields, formatRoomLabel } from './cloud-sync-diagnostics-human-sections.mjs';

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

/**
 * @param {string} id
 * @param {string} title
 * @param {string} body
 * @param {{ hidden?: boolean, backLabel?: string } | boolean} [opts]
 */
function viewBlock(id, title, body, opts) {
  const hidden =
    typeof opts === 'boolean' ? opts : !opts || opts.hidden !== false;
  // Navigation chrome lives in the modal header (back + title + close).
  // Body is content only — no second «‹ Conexión / Opciones» strip.
  return (
    '<div class="cloud-sync-view" data-cloud-view="' +
    esc(id) +
    '" data-cloud-view-title="' +
    esc(title) +
    '"' +
    (hidden ? ' hidden' : '') +
    '>' +
    '<div class="cloud-sync-view-body">' +
    body +
    '</div></div>'
  );
}

/**
 * @param {string} title @param {string} meta @param {string} view
 * @param {string} [action] defaults to the generic nav-view
 */
function optionsRow(title, meta, view, action = 'nav-view') {
  return (
    '<button type="button" class="cloud-sync-options-row" data-cloud-action="' +
    esc(action) +
    '" data-cloud-view="' +
    esc(view) +
    '">' +
    '<span class="cloud-sync-options-row-text">' +
    '<span class="cloud-sync-options-row-title">' +
    esc(title) +
    '</span>' +
    '<span class="cloud-sync-options-row-meta"' +
    (view === 'nube' ? ' data-cloud-tech-summary' : '') +
    '>' +
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
 * 4 chain steps (Internet, Sesión, Sala from buildPipeline; En vivo from
 * buildLiveTileFields) for the status hero.
 * ponytail: Conexión doesn't track WS close codes (diagnostics-only); a
 * neutral wsClose only affects the 'ws' abnormal-close nuance, not the
 * poll-fallback "reconnecting" case that matters here.
 * @param {{ status: string, transport: string, room: object | null, tokenPresent: boolean, displaySala?: string }} ctx
 */
function heroPipelineSteps({ status, transport, room, tokenPresent, displaySala }) {
  const roomLabel = formatRoomLabel(room, String(room?.id || ''));
  const d = {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    tokenPresent: !!tokenPresent,
    roomId: room?.id || '',
  };
  const [internet, sesion, sala] = buildPipeline(d, status, roomLabel, []);
  const live = buildLiveTileFields(d, transport, { code: 0, reason: '' });
  // The hero's subline already names the month; the step only needs the sala.
  const salaStep = sala.state === 'ok' && displaySala ? { ...sala, detail: displaySala } : sala;
  const liveDetail = live.liveStatus === 'ok' ? 'Conectado' : live.liveValue;
  return [internet, sesion, salaStep, { label: 'En vivo', state: live.liveStatus, detail: liveDetail }];
}

/**
 * Status hero + 4-step chain, wrapped for live in-place refresh (see
 * renderStatusChip in panel-conexion.mjs, which re-renders this whole block
 * on every status tick — cheap, and it never touches the mounted Equipo/
 * Admin subviews sitting elsewhere in the section).
 * @param {{ status: string, detail?: string, transport?: string, displaySala?: string, room?: object | null, tokenPresent?: boolean }} ctx
 */
export function conexionHeroBlockHtml(ctx) {
  return (
    '<div class="cloud-sync-hero-block" data-cloud-hero-block>' +
    statusHeroHtml(ctx) +
    pipelineChainHtml(heroPipelineSteps(ctx)) +
    '</div>'
  );
}

/** «Dra. Ana Ríos» → «AR»; falls back to the @usuario. @param {string} display @param {string} handle */
function initialsFor(display, handle) {
  const words = String(display || '')
    .replace(/^(dra?|dr)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  const letters = words.length
    ? words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : '')
    : String(handle || '').slice(0, 2);
  return letters.toUpperCase() || '?';
}

/**
 * @param {{ username?: string, displayName?: string } | null} cloudUser
 */
function statusIdentityHtml(cloudUser) {
  const { handle, display } = resolveIdentity(cloudUser);
  return (
    '<div class="cloud-sync-inset-group cloud-sync-status-identity" aria-label="Cuenta">' +
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-account-row">' +
    '<span class="cloud-sync-avatar" aria-hidden="true">' +
    esc(initialsFor(display, handle)) +
    '</span>' +
    '<span class="cloud-sync-options-entry-text">' +
    (display ? '<span class="cloud-sync-account-name">' + esc(display) + '</span>' : '') +
    '<span class="cloud-sync-status-handle">@' +
    esc(handle || '—') +
    '</span></span>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--danger" data-cloud-action="logout">Cerrar sesión</button>' +
    '</div></div>'
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
    // Clinical profile form (nombre, @usuario, rango, sala, admin), mounted on open.
    '<div class="cloud-sync-profile-host" data-cloud-profile-host></div>' +
    '<button type="button" class="cloud-sync-btn ui-pressable" data-cloud-action="regenerate-recovery">Código de recuperación</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="logout">Cerrar sesión Nube</button></div>'
  );
}

/**
 * Board «Nube A» body under the hero: Tu sala, your account, then two rows.
 * nav-options opens the Opciones list; nav-view 'nube' opens Diagnóstico
 * (see onCloudActionClick in panel-conexion-bootstrap.mjs).
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, roomHtml: string, showAdmin: boolean, techSummary: string }} opts
 */
function statusSheetHtml({ cloudUser, roomHtml, showAdmin, techSummary }) {
  const navRows =
    optionsRow(
      showAdmin ? 'Equipo y administración' : 'Equipo y cuenta',
      showAdmin ? 'Equipo, cuenta y administración' : 'Equipo, cuenta e iPad',
      'options',
      'nav-options'
    ) + optionsRow('Detalles técnicos', techSummary || '—', 'nube');
  return (
    '<div class="cloud-sync-status-sheet">' +
    roomHtml +
    statusIdentityHtml(cloudUser) +
    '<div class="cloud-sync-options-card">' +
    navRows +
    '</div></div>'
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
 *   techSummary?: string,
 * }} opts
 */
export function connectedViewsHtml({
  cloudUser,
  roomHtml,
  equipoHtml,
  adminHtml = '',
  url,
  hasCloudSession = false,
  techSummary = '',
}) {
  const showAdmin =
    !!String(adminHtml || '').trim() ||
    canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession });
  const adminHost = showAdmin
    ? String(adminHtml || '').trim() ||
      '<div class="cloud-sync-admin-host" data-cloud-admin-host></div>'
    : '';
  const statusBody = statusSheetHtml({ cloudUser, roomHtml, showAdmin, techSummary });

  const showInternoQr = canManageInternoQr(clinicalSessionContext.user);
  let guardiaRows =
    optionsRow('iPad / R+ Móvil', 'QR y enlace permanente', 'mobile') +
    optionsRow('Equipo', '@usuario, equipos y sala', 'equipo') +
    (showInternoQr
      ? optionsRow('QR Internos', 'Vitales desde el celular por sala', 'interno-qr')
      : '');
  let cuentaRows = optionsRow('Cuenta', 'Recuperación y sesión', 'cuenta');
  if (showAdmin) {
    cuentaRows += optionsRow('Administración', 'Usuarios, salas y clave admin', 'admin');
  }
  const sistemaRows =
    optionsRow('Diagnóstico Nube', 'Dashboard de estado y alertas', 'nube') +
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
    viewBlock(
      'mobile',
      'iPad / R+ Móvil',
      '<div class="cloud-sync-mobile-invite-host" data-cloud-mobile-invite-host></div>'
    ) +
    (showInternoQr
      ? viewBlock(
          'interno-qr',
          'QR Internos',
          '<div class="cloud-sync-interno-qr-host" data-cloud-interno-qr-host></div>'
        )
      : '') +
    viewBlock('cuenta', 'Cuenta', cuentaBodyHtml(cloudUser)) +
    (showAdmin ? viewBlock('admin', 'Administración', adminHost) : '') +
    viewBlock(
      'nube',
      'Diagnóstico Nube',
      '<div class="cloud-sync-nube-diagnostics-host" data-cloud-nube-diagnostics-host></div>'
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
    techSummary: opts.techSummary || '',
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
  const showOps = view === 'ops';
  const showLan = view === 'lan';
  const showStack = showOps || showLan;
  if (stack) {
    stack.hidden = !showStack;
    stack.setAttribute('data-cloud-stack-view', showOps ? 'ops' : showLan ? 'lan' : 'hidden');
    stack.querySelectorAll('[data-cloud-secondary]').forEach(function (el) {
      const kind = el.getAttribute('data-cloud-secondary');
      if (kind === 'ops') el.hidden = !showOps;
      else if (kind === 'lan') el.hidden = !showLan;
    });
  }
  // Orphan diagnostics on panel root (refresh-in-place) — never on status home.
  const kids = panel.children || [];
  for (let i = 0; i < kids.length; i++) {
    const el = kids[i];
    const cls = String(el.className || '');
    if (cls.split(/\s+/).includes('cloud-sync-diagnostics-panel')) {
      el.hidden = !showLan;
    }
  }
}

const CONEXION_MODAL_TITLES = {
  status: 'Conexión guardia',
  options: 'Opciones',
  mobile: 'iPad / R+ Móvil',
  'interno-qr': 'QR Internos',
  equipo: 'Equipo',
  ops: 'Operaciones',
  admin: 'Administración',
  cuenta: 'Cuenta',
  nube: 'Diagnóstico Nube',
  lan: 'Diagnóstico LAN',
  advanced: 'Avanzado',
};

const CONEXION_MODAL_BACK_LABEL = {
  options: 'Conexión',
  mobile: 'Opciones',
  'interno-qr': 'Opciones',
  equipo: 'Opciones',
  ops: 'Opciones',
  admin: 'Opciones',
  cuenta: 'Opciones',
  nube: 'Opciones',
  lan: 'Opciones',
  advanced: 'Opciones',
};

function syncConexionModalChrome(view) {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('connection-dropdown');
  if (!modal) return;
  const titleEl =
    document.getElementById('connection-dropdown-head-title') ||
    modal.querySelector('.connection-dropdown-head-title');
  const backBtn = document.getElementById('btn-connection-dropdown-back');
  const backLabel = backBtn && backBtn.querySelector('.connection-dropdown-back-label');
  const icon = modal.querySelector('.connection-dropdown-head-icon');
  const isHome = view === 'status';
  if (titleEl) {
    titleEl.textContent = CONEXION_MODAL_TITLES[view] || CONEXION_MODAL_TITLES.status;
  }
  if (backBtn) {
    backBtn.hidden = isHome;
    if (backLabel) {
      backLabel.textContent = CONEXION_MODAL_BACK_LABEL[view] || 'Opciones';
    }
  }
  if (icon) icon.hidden = !isHome;
  modal.classList.toggle('connection-dropdown-modal--subview', !isHome);
  modal.classList.toggle('connection-dropdown-modal--equipo', view === 'equipo');
  modal.classList.toggle('connection-dropdown-modal--admin', view === 'admin');
}

const CONEXION_VIEW_HOOK = {
  admin: 'onAdmin',
  mobile: 'onMobile',
  'interno-qr': 'onInternoQr',
  nube: 'onNube',
  equipo: 'onEquipo',
  cuenta: 'onCuenta',
};

function syncConexionHead(section, next, hooks) {
  const head = section.querySelector('.cloud-sync-conexion-head');
  if (!head || !section.querySelector('[data-cloud-views]')) return;
  head.hidden = next !== 'status';
  if (next === 'status' && typeof hooks?.onStatusHome === 'function') hooks.onStatusHome();
}

function invokeConexionViewHook(next, hooks) {
  const key = CONEXION_VIEW_HOOK[next];
  const fn = key && hooks ? hooks[key] : null;
  if (typeof fn === 'function') void fn();
}

/**
 * @param {HTMLElement} section
 * @param {string} view
 * @param {{ onAdmin?: () => void | Promise<void>, onMobile?: () => void | Promise<void>, onInternoQr?: () => void | Promise<void>, onNube?: () => void | Promise<void>, onEquipo?: () => void | Promise<void>, onCuenta?: () => void | Promise<void>, onStatusHome?: () => void }} [hooks]
 */
export function applyConexionView(section, view, hooks) {
  let next = String(view || 'status').trim() || 'status';
  if (next !== 'status' && !section.querySelector('.cloud-sync-view[data-cloud-view="' + next + '"]')) {
    next = 'status';
  }
  section.dataset.cloudView = next;
  // Views only: nav rows carry data-cloud-view too (their target), and the
  // section itself carries it via dataset.cloudView.
  section.querySelectorAll('.cloud-sync-view[data-cloud-view]').forEach(function (el) {
    el.hidden = el.getAttribute('data-cloud-view') !== next;
  });
  syncConexionHead(section, next, hooks);
  syncConexionModalChrome(next);
  syncCloudSecondaryPanels(resolveConexionPanelRoot(section), next);
  if (next !== 'equipo') setClinicalTeamsEmbedHost(null);
  if (next !== 'nube') {
    stopCloudSyncDiagnosticsLiveRefresh(
      section.querySelector('[data-cloud-nube-diagnostics-host]')
    );
  }
  invokeConexionViewHook(next, hooks);
}
