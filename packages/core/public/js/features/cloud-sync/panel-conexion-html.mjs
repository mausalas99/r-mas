import { esc } from '../../dom-escape.mjs';
import { readRpcSettings } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { filterJoinedTeams } from '../clinical-teams/shared.mjs';
import { connectStepHtml } from './panel-steps-html.mjs';
import { appendMemberCount } from './room-label.mjs';
import { getLastCloudPushAt } from './cloud-sync-diagnostics.mjs';
import { formatCloudDiagWhen } from './cloud-sync-diagnostics-human-format.mjs';
import { humanizeCloudSyncErrorMessage } from './cloud-sync-error-text.mjs';
/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

export const STATUS_LABELS = {
  idle: 'Nube al día',
  syncing: 'Sincronizando…',
  pending: 'Pendiente',
  reconnecting: 'Reconectando',
  offline: 'Sin conexión Nube',
  error: 'Error',
};

/** @param {'ws' | 'poll' | 'offline'} transport */
export function cloudSyncTransportLabel(transport) {
  if (transport === 'ws') return 'WS';
  if (transport === 'offline') return '—';
  return 'Poll';
}

/**
 * @param {CloudSyncStatus} status
 * @param {'ws' | 'poll' | 'offline'} [transport]
 * @param {string} [detail] Pending-ops count / send-progress text — shown inline
 *   only for 'pending' and 'syncing' (an error's detail has its own paragraph).
 */
export function formatCloudStatusChipLabel(status, transport, detail) {
  const base = STATUS_LABELS[status] || status;
  if (status === 'offline' || status === 'error' || status === 'reconnecting') return base;
  const mode = cloudSyncTransportLabel(transport || 'poll');
  const label = base + ' · ' + mode;
  const detailText = String(detail || '').trim();
  if ((status === 'pending' || status === 'syncing') && detailText) {
    return label + ' · ' + detailText;
  }
  return label;
}

/** @param {CloudSyncStatus} status */
export function statusChipModifier(status) {
  if (status === 'syncing') return 'is-syncing';
  if (status === 'error') return 'is-error';
  if (status === 'pending' || status === 'offline' || status === 'reconnecting') return 'is-pending';
  return 'is-idle';
}

/** @returns {boolean} */
export function userHasJoinedTeam() {
  return filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user).length > 0;
}

/**
 * @param {{ username?: string, displayName?: string } | null} cloudUser
 */
export function accountSummaryHtml(cloudUser) {
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
    '<div class="cloud-sync-account-summary">' +
    '<p><span class="cloud-sync-account-label">Usuario</span> <strong>@' + esc(handle || '—') + '</strong></p>' +
    '<p><span class="cloud-sync-account-label">Nombre en guardia</span> <strong>' + esc(display || '—') + '</strong></p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-cloud-action="logout">Cerrar sesión</button></div>'
  );
}

/** @param {string} url */
export function authFormsHtml(url) {
  return connectStepHtml(url);
}

/** @param {() => string} getToken */
export function nextStepHtml(getToken) {
  if (!getToken() || userHasJoinedTeam()) return '';
  return (
    '<div class="cloud-sync-next-step">' +
    '<p class="cloud-sync-next-step-lead">Siguiente paso</p>' +
    '<p class="cloud-sync-hint">Configura tu equipo en ⇄ Conexión → Opciones → Equipo.</p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cloud-action="open-rotation">Ir a Equipo</button></div>'
  );
}

/**
 * "Tu sala" card — name, month/member count, invite code (+ Copiar), leave.
 * Revisión moved to Detalles técnicos (component 5) — it always needs the
 * live `getRevision()` getter there, never `room.revision` (a join-time
 * snapshot that goes stale the moment a push advances the counter).
 * @param {object} room
 */
export function roomConnectedHtml(room) {
  const code = String(room?.code || '').trim();
  const turn = String(room?.turnKey || '').trim();
  const name = String(room?.name || room?.sala || '').trim() || 'Sala';
  const meta = appendMemberCount(turn, room?.memberCount).replace(/^ · /, '');
  return (
    '<div class="cloud-sync-room cloud-sync-room--connected">' +
    '<p class="cloud-sync-options-label">Tu sala</p>' +
    '<dl class="cloud-sync-inset-group" aria-label="Sala nube">' +
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-inset-row--identity">' +
    '<span class="cloud-sync-options-entry-text">' +
    '<span class="cloud-sync-status-handle">' +
    esc(name) +
    '</span>' +
    (meta ? '<span class="cloud-sync-status-display">' + esc(meta) + '</span>' : '') +
    '</span></div>' +
    '<div class="cloud-sync-inset-row cloud-sync-inset-row--kv"><dt>Código</dt><dd>' +
    '<span class="cloud-sync-room-code-group">' +
    '<code data-cloud-room-code>' +
    esc(code || '—') +
    '</code>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-room-copy" data-cloud-action="copy-room-code">Copiar</button>' +
    '</span></dd></div>' +
    '<button type="button" class="cloud-sync-inset-row cloud-sync-inset-row--action cloud-sync-inset-row--danger" data-cloud-action="leave-room">Salir de la sala</button>' +
    '</dl></div>'
  );
}

/** @param {number|string} queueCount @param {number|string} revision @param {number|string} patientCount */
export function techSummaryLine(queueCount, revision, patientCount) {
  const q = Number(queueCount) || 0;
  const rev = Number.isFinite(Number(revision)) ? Number(revision) : 0;
  const p = Number(patientCount) || 0;
  return 'Cola ' + q + ' · Rev. ' + rev + ' · ' + p + ' pacientes locales';
}

const HERO_ICON_PATHS = {
  ok: '<path d="m5 12 5 5 9-10"/>',
  info: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
  warn:
    '<path d="M12 9v4"/><path d="M12 16.5h.01"/>' +
    '<path d="M10.3 4.5 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.5a2 2 0 0 0-3.4 0Z"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5h.01"/>',
};

/** @param {'ok'|'info'|'warn'|'error'} state */
function heroIconSvg(state) {
  return (
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (HERO_ICON_PATHS[state] || HERO_ICON_PATHS.ok) +
    '</svg>'
  );
}

const SYNC_ICON_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/>' +
  '<path d="M20 4v5h-5"/></svg>';

/** @type {Record<CloudSyncStatus, 'ok'|'info'|'warn'|'error'>} */
const HERO_ICON_STATE_BY_STATUS = {
  idle: 'ok',
  syncing: 'info',
  pending: 'warn',
  offline: 'warn',
  reconnecting: 'warn',
  error: 'error',
};

/** @type {Partial<Record<CloudSyncStatus, string>>} */
const HERO_TITLE_BY_STATUS = {
  idle: 'Todo al día',
  syncing: STATUS_LABELS.syncing,
  pending: STATUS_LABELS.pending,
  offline: STATUS_LABELS.offline,
  reconnecting: STATUS_LABELS.reconnecting,
};

/**
 * Status hero — big round icon, title, "Sala · mes · último envío hace X",
 * and the "Sincronizar ahora" pill (reuses the shared Nube runtime's syncCycle
 * via data-cloud-action="sync-now", wired in panel-conexion-bootstrap.mjs).
 * @param {{ status: CloudSyncStatus, detail?: string, transport?: string, displaySala?: string, room?: object | null }} ctx
 */
export function statusHeroHtml({ status, detail, displaySala, room }) {
  const iconState = HERO_ICON_STATE_BY_STATUS[status] || 'ok';
  const title =
    status === 'error'
      ? humanizeCloudSyncErrorMessage(String(detail || '').trim()) || STATUS_LABELS.error
      : HERO_TITLE_BY_STATUS[status] || STATUS_LABELS[status] || status;
  const turn = String(room?.turnKey || '').trim();
  const lastPush = getLastCloudPushAt();
  const subline = [String(displaySala || '').trim(), turn]
    .filter(Boolean)
    .concat(lastPush ? ['último envío ' + formatCloudDiagWhen(lastPush, Date.now())] : [])
    .join(' · ');
  return (
    '<div class="cloud-sync-hero" data-cloud-hero>' +
    '<div class="cloud-sync-hero-icon" data-state="' +
    esc(iconState) +
    '">' +
    heroIconSvg(iconState) +
    '</div>' +
    '<div class="cloud-sync-hero-text">' +
    '<p class="cloud-sync-hero-title">' +
    esc(title) +
    '</p>' +
    (subline ? '<p class="cloud-sync-hero-sub">' + esc(subline) + '</p>' : '') +
    '</div>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-hero-sync" data-cloud-action="sync-now">' +
    SYNC_ICON_SVG +
    'Sincronizar ahora</button>' +
    '</div>'
  );
}

const CHAIN_ICON_PATHS = {
  Internet: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  Sesión: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3"/>',
  Sala: '<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M2 21h20"/><path d="M14 12h.01"/>',
  'En vivo': '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>',
};

/** @param {string} label */
function chainIconSvg(label) {
  return (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (CHAIN_ICON_PATHS[label] || CHAIN_ICON_PATHS.Internet) +
    '</svg>'
  );
}

/**
 * 4-step chain: Internet → Sesión → Sala → En vivo. Teal (ok) or amber
 * (anything else) per step, with the link into a broken step dashed.
 * @param {{ label: string, state: string, detail: string }[]} steps
 */
export function pipelineChainHtml(steps) {
  if (!Array.isArray(steps) || !steps.length) return '';
  let html = '<div class="cloud-sync-chain" data-cloud-chain aria-label="Estado de conexión">';
  steps.forEach(function (step, i) {
    if (i > 0) {
      const broken = step.state !== 'ok' || steps[i - 1].state !== 'ok';
      html += '<span class="cloud-sync-chain-link' + (broken ? ' is-broken' : '') + '"></span>';
    }
    html +=
      '<div class="cloud-sync-chain-step" data-state="' +
      esc(step.state) +
      '">' +
      '<div class="cloud-sync-chain-bubble">' +
      chainIconSvg(step.label) +
      '</div>' +
      '<div class="cloud-sync-chain-label">' +
      esc(step.label) +
      '</div>' +
      '<div class="cloud-sync-chain-detail">' +
      esc(step.detail) +
      '</div></div>';
  });
  html += '</div>';
  return html;
}

/** @param {string} normalizedSala */
export function roomActionsHtml(normalizedSala) {
  return (
    '<div class="cloud-sync-room cloud-sync-room--actions">' +
    '<p class="cloud-sync-room-title">Unirse a una sala del turno</p>' +
    '<div class="cloud-sync-field"><label>Nombre de la sala (opcional)</label>' +
    '<input type="text" class="profile-input" data-cloud-room-name placeholder="Turno ' + esc(normalizedSala) + '" /></div>' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="create-room">Crear sala</button>' +
    '<div class="cloud-sync-field"><label>Código de sala</label>' +
    '<input type="text" class="profile-input" data-cloud-join-code placeholder="ABC123" /></div>' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="join-room">Unirse con código</button></div>'
  );
}

/** @param {string} url */
export function advancedUrlFieldsHtml(url) {
  return (
    '<div class="cloud-sync-field"><label for="cloud-sync-url-connected">URL del servicio</label>' +
    '<input id="cloud-sync-url-connected" type="url" class="profile-input" data-cloud-sync-url value="' +
    esc(url) +
    '" placeholder="https://…workers.dev" /></div>' +
    '<button type="button" class="cloud-sync-btn" data-cloud-action="save-url">Guardar</button>'
  );
}

/** @param {string} url */
export function advancedUrlHtml(url) {
  return (
    '<details class="cloud-sync-advanced"><summary>Avanzado</summary>' +
    advancedUrlFieldsHtml(url) +
    '</details>'
  );
}

/**
 * @param {string} normalizedSala
 * @param {string} bodyHtml
 * @param {CloudSyncStatus} status
 * @param {string} [detail]
 * @param {string} [heroBlockHtml] Pre-built hero + 4-step chain (see
 *   conexionHeroBlockHtml in panel-conexion-views.mjs) for the connected
 *   status page. Omitted on the pre-login auth-forms screen, which keeps
 *   the compact title/chip header below.
 */
export function conexionShellHtml(normalizedSala, bodyHtml, status, detail = '', heroBlockHtml = '') {
  const detailText = String(detail || '').trim();
  const showDetail = status === 'error' && !!detailText;
  const headContent =
    heroBlockHtml ||
    '<div class="cloud-sync-conexion-head-text">' +
      '<h4 class="cloud-sync-conexion-title">Conexión</h4>' +
      '<p class="cloud-sync-conexion-sub">' +
      esc(normalizedSala) +
      '</p></div>' +
      '<span class="cloud-sync-status-chip ' +
      statusChipModifier(status) +
      '" data-cloud-status-chip data-status="' +
      esc(status) +
      '">' +
      esc(STATUS_LABELS[status] || status) +
      '</span>';
  return (
    '<header class="cloud-sync-conexion-head">' +
    headContent +
    '</header>' +
    '<p class="cloud-sync-status-detail" data-cloud-status-detail' +
    (showDetail ? '' : ' hidden') +
    '>' +
    esc(detailText) +
    '</p>' +
    bodyHtml
  );
}

/** Inline Mi rotación host for ⇄ Opciones → Equipo. */
export function equipoEmbedHostHtml() {
  return (
    '<div class="cloud-sync-equipo-embed" data-cloud-equipo-host>' +
    '<div class="clinical-teams-panel-body clinical-teams-panel-body--embed"></div></div>'
  );
}

/** @deprecated Use equipoEmbedHostHtml — kept for imports that passed getToken. */
export function equipoStepHtml(_getToken) {
  return equipoEmbedHostHtml();
}
