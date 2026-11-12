import { esc } from '../../dom-escape.mjs';
import { readRpcSettings } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { filterJoinedTeams } from '../clinical-teams/shared.mjs';
import { appendMemberCount } from './room-label.mjs';
import { getLastCloudPushAt } from './cloud-sync-diagnostics.mjs';
import { formatCloudDiagWhen } from './cloud-sync-diagnostics-human-format.mjs';
import { humanizeCloudSyncErrorMessage } from './cloud-sync-error-text.mjs';

export { formatCloudDiagWhen };
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

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * «2026-09» → «septiembre 2026». Anything else is returned trimmed, as is.
 * @param {unknown} turnKey
 */
export function formatTurnMonth(turnKey) {
  const raw = String(turnKey || '').trim();
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  const month = m ? MONTHS_ES[Number(m[2]) - 1] : '';
  return month ? month + ' ' + m[1] : raw;
}

/**
 * "Tu sala" card data — sala, month · members, invite code. Revisión lives in Detalles técnicos: it needs
 * the live `getRevision()` getter, never `room.revision` (a join-time snapshot that goes stale the moment
 * a push advances the counter).
 * @param {object} room
 * @returns {{ name: string, meta: string, code: string }}
 */
export function roomConnectedModel(room) {
  const month = formatTurnMonth(room?.turnKey);
  return {
    name: String(room?.sala || room?.name || '').trim() || 'Sala',
    meta: appendMemberCount(month ? month.charAt(0).toUpperCase() + month.slice(1) : '', room?.memberCount)
      .replace(/^ · /, ''),
    code: String(room?.code || '').trim(),
  };
}

/** @param {number|string} queueCount @param {number|string} revision @param {number|string} patientCount */
export function techSummaryLine(queueCount, revision, patientCount) {
  const q = Number(queueCount) || 0;
  const rev = Number.isFinite(Number(revision)) ? Number(revision) : 0;
  const p = Number(patientCount) || 0;
  return 'Cola ' + q + ' · Rev. ' + rev + ' · ' + p + ' pacientes locales';
}

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
 * Status hero data — icon state, title, and the «Sala · mes · último envío hace X» line (or the plain-words
 * reason). `now` is passed in so the relative time is testable. Signed out: no main button, the form is below.
 * @param {{ status: CloudSyncStatus, detail?: string, displaySala?: string, room?: object | null, tokenPresent?: boolean }} ctx
 * @param {number} [now]
 * @returns {{ signedOut: true } | { iconState: string, title: string, subline: string }}
 */
export function statusHeroState({ status, detail, displaySala, room, tokenPresent }, now = Date.now()) {
  if (tokenPresent === false) return { signedOut: true };
  const iconState = HERO_ICON_STATE_BY_STATUS[status] || 'ok';
  const title = status === 'error' ? 'Hay un problema con Nube' : HERO_TITLE_BY_STATUS[status] || STATUS_LABELS[status] || status;
  const lastPush = getLastCloudPushAt();
  // An error says what happened in plain words, and so does «Pendiente» when the
  // runtime gave a reason (Worker unreachable or busy); every other state says
  // where and when.
  const reason = String(detail || '').trim();
  const subline =
    status === 'error'
      ? humanizeCloudSyncErrorMessage(reason) || 'Tus cambios están a salvo aquí.'
      : status === 'pending' && reason
        ? reason
        : [String(displaySala || '').trim(), formatTurnMonth(room?.turnKey)]
          .filter(Boolean)
          .concat(lastPush ? ['último envío ' + formatCloudDiagWhen(lastPush, now)] : [])
          .join(' · ');
  return { iconState, title, subline };
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
      const waiting = step.state === 'off';
      html += '<span class="cloud-sync-chain-link' + (broken ? ' is-broken' : '') + (waiting ? ' is-waiting' : '') + '"></span>';
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

/**
 * Quick look under the header icon (board «Nube C»). Lives here, not in
 * cloud-sync-header-chrome.mjs, so the header chrome stays import-free.
 * @param {{
 *   status: string, lastCycleAt?: string | null, room?: { sala?: string, turnKey?: string, code?: string, memberCount?: number } | null,
 *   pending: number, lastPushAt?: string | null, lastPullAt?: string | null, now?: number,
 *   formatWhen?: (iso: string | null | undefined, now: number) => string,
 *   stateWords: (status: string) => string, modifier: (status: string, transport: string) => string,
 * }} v
 */
export function nubePopoverHtml(v) {
  const now = v.now || Date.now();
  const when = v.formatWhen || formatCloudDiagWhen;
  const mod = v.modifier(v.status, 'ws');
  const room = v.room || {};
  const month = formatTurnMonth(room.turnKey);
  const meta = [room.sala ? (month ? month.charAt(0).toUpperCase() + month.slice(1) : '') : 'Elige tu sala en Mi perfil']
    .concat(Number.isFinite(Number(room.memberCount)) ? [room.memberCount + ' miembros'] : [])
    .filter(Boolean)
    .join(' · ');
  const stat = (label, value) =>
    '<div class="nube-pop-stat"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
  return (
    '<div class="nube-pop-head"><span class="nube-pop-dot" data-mod="' + esc(mod) + '" aria-hidden="true"></span>' +
    '<span class="nube-pop-title">' + esc(v.stateWords(v.status)) + '</span>' +
    '<span class="nube-pop-when">' + esc(v.lastPullAt ? when(v.lastPullAt, now) : '') + '</span></div>' +
    '<div class="nube-pop-room"><span class="nube-pop-room-text"><b>' + esc(room.sala || 'Sin sala') + '</b>' +
    (meta ? '<span>' + esc(meta) + '</span>' : '') + '</span>' +
    (room.code ? '<code class="nube-pop-code" aria-label="Código de sala">' + esc(room.code) + '</code>' : '') + '</div>' +
    '<div class="nube-pop-stats">' +
    stat('En espera', String(Number(v.pending) || 0)) +
    stat('Envío', when(v.lastPushAt, now)) +
    stat('Descarga', when(v.lastPullAt, now)) +
    '</div>' +
    '<div class="nube-pop-actions">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-nube-pop="sync">Sincronizar</button>' +
    '<button type="button" class="cloud-sync-btn" data-nube-pop="open-panel">Abrir panel</button></div>'
  );
}
