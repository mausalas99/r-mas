import { esc } from '../../dom-escape.mjs';
import { readRpcSettings } from '../../clinical-settings.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { filterJoinedTeams } from '../clinical-teams/shared.mjs';
import { connectStepHtml } from './panel-steps-html.mjs';

/** @typedef {'idle' | 'syncing' | 'pending' | 'offline' | 'error'} CloudSyncStatus */

export const STATUS_LABELS = {
  idle: 'Nube al día',
  syncing: 'Sincronizando…',
  pending: 'Pendiente',
  offline: 'Sin conexión Nube',
  error: 'Error',
};

/** @param {CloudSyncStatus} status */
export function statusChipModifier(status) {
  if (status === 'syncing') return 'is-syncing';
  if (status === 'error') return 'is-error';
  if (status === 'pending' || status === 'offline') return 'is-pending';
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
    '<p class="cloud-sync-hint">Configurá tu equipo en Mi rotación para sincronizar con tu guardia.</p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-cloud-action="open-rotation">Ir a Mi rotación</button></div>'
  );
}

/** @param {object} room @param {() => number} getRevision */
export function roomConnectedHtml(room, getRevision) {
  const code = String(room?.code || '').trim();
  const revision = room?.revision ?? getRevision();
  return (
    '<div class="cloud-sync-room cloud-sync-room--connected">' +
    '<p class="cloud-sync-room-title">Sala nube</p>' +
    '<dl class="cloud-sync-room-meta">' +
    '<div><dt>Código</dt><dd><code data-cloud-room-code>' + esc(code) + '</code></dd></div>' +
    '<div><dt>Revisión</dt><dd><span data-cloud-room-revision>' + esc(String(revision)) + '</span></dd></div></dl>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-cloud-action="leave-room">Salir de la sala</button></div>'
  );
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
export function advancedUrlHtml(url) {
  return (
    '<details class="cloud-sync-advanced"><summary>Avanzado</summary>' +
    '<div class="cloud-sync-field"><label for="cloud-sync-url-connected">URL del servicio</label>' +
    '<input id="cloud-sync-url-connected" type="url" class="profile-input" data-cloud-sync-url value="' + esc(url) +
    '" placeholder="https://…workers.dev" /></div></details>'
  );
}

/** @param {string} normalizedSala @param {string} bodyHtml @param {CloudSyncStatus} status */
export function conexionShellHtml(normalizedSala, bodyHtml, status) {
  return (
    '<header class="cloud-sync-conexion-head">' +
    '<h4 class="cloud-sync-conexion-title">Conexión — ' + esc(normalizedSala) + '</h4>' +
    '<span class="cloud-sync-status-chip ' + statusChipModifier(status) + '" data-cloud-status-chip data-status="' + esc(status) + '">' +
    esc(STATUS_LABELS[status] || status) + '</span></header>' +
    '<p class="cloud-sync-lead">En Sala y Torre HU la nube sustituye al anfitrión LAN. ' +
    'Interconsultas, UX, Eme y Área A siguen en LAN.</p>' + bodyHtml
  );
}
