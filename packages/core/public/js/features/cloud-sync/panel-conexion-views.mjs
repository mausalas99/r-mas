import { readRpcSettings } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { roomConnectedModel, statusHeroState } from './panel-conexion-html.mjs';
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
  // Signed out, the chain points at the form under it; sala and live wait.
  if (!d.tokenPresent) {
    return [
      internet,
      { ...sesion, state: 'warn', detail: 'Entra abajo' },
      { label: 'Sala', state: 'off', detail: displaySala || '—' },
      { label: 'En vivo', state: 'off', detail: 'En espera' },
    ];
  }
  const live = buildLiveTileFields(d, transport, { code: 0, reason: '' });
  // The hero's subline already names the month; the step only needs the sala.
  const salaStep = sala.state === 'ok' && displaySala ? { ...sala, detail: displaySala } : sala;
  const liveDetail = live.liveStatus === 'ok' ? 'Conectado' : live.liveValue;
  return [internet, sesion, salaStep, { label: 'En vivo', state: live.liveStatus, detail: liveDetail }];
}

/**
 * Status hero + 4-step chain data, redrawn in place on every status tick (see renderStatusChip in
 * panel-conexion.mjs); it never touches the mounted Equipo/Admin subviews sitting elsewhere in the section.
 * @param {{ status: string, detail?: string, transport?: string, displaySala?: string, room?: object | null, tokenPresent?: boolean }} ctx
 * @param {number} [now]
 */
export function conexionHeroModel(ctx, now = Date.now()) {
  return { hero: statusHeroState(ctx, now), steps: heroPipelineSteps(ctx) };
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
 * Everything the signed-in body draws, as plain data (Nube A: «Tu sala», your account, option rows, sub-views).
 * `room` is the joined room (→ «Tu sala» card) or null (→ create / join actions for `displaySala`).
 * @param {{ cloudUser: { username?: string, displayName?: string } | null, room: object | null, displaySala: string,
 *   url: string, hasCloudSession?: boolean, techSummary?: string }} opts
 */
export function connectedBodyModel({ cloudUser, room, displaySala, url, hasCloudSession = false, techSummary = '' }) {
  const { handle, display } = resolveIdentity(cloudUser);
  return {
    kind: 'connected',
    identity: { handle, display, initials: initialsFor(display, handle) },
    room: room ? roomConnectedModel(room) : null,
    salaForActions: displaySala,
    showAdmin: canAccessCloudAdmin(clinicalSessionContext.user, { hasCloudSession }),
    showInternoQr: canManageInternoQr(clinicalSessionContext.user),
    url,
    techSummary,
  };
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
  'interno-qr': 'QR internos',
  equipo: 'Equipo',
  ops: 'Operaciones',
  admin: 'Administración',
  cuenta: 'Cuenta',
  nube: 'Diagnóstico nube',
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
