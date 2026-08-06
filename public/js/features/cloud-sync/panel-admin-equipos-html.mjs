import { esc } from '../../dom-escape.mjs';
import { adminErrorHtml } from './panel-admin-html.mjs';
import {
  formatLanCycleOptionLabel,
  renderLanAssignTeamOptionsHtml,
  resolveLanUserPlacement,
} from '../clinical-teams/teams-roster-lan-render.mjs';
import { getCycleLetterOptionsForRank } from '../../clinico-access.mjs';
import { resolveMembershipCycleForUser } from '../../clinico-access.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';

export const CLINICAL_RANK_OPTIONS = ['R1', 'R2', 'R3', 'R4', 'Admin'];

/** @param {string} selectedRank */
export function rankSelectOptionsHtml(selectedRank) {
  const selected = String(selectedRank || 'R1');
  return CLINICAL_RANK_OPTIONS.map((rank) => {
    const sel = rank === selected ? ' selected' : '';
    return '<option value="' + esc(rank) + '"' + sel + '>' + esc(rank) + '</option>';
  }).join('');
}

export function equiposShellHtml() {
  return (
    '<div class="cloud-sync-admin-panel-head">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-equipos">Actualizar</button></div>' +
    '<p class="cloud-sync-hint cloud-sync-admin-equipos-hint">Asigná usuarios de R+ Cloud o perfiles clínicos locales a equipos. Buscá tests aquí (no en Usuarios). <strong>Quitar</strong> los elimina del equipo y de la base clínica; se publica a la sala Nube.</p>' +
    '<div class="cloud-sync-admin-toolbar">' +
    '<input type="search" class="profile-input" data-admin-equipos-search placeholder="Buscar @usuario o nombre" />' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-sala">Sala</label>' +
    '<select id="cloud-admin-equipos-sala" class="profile-input" data-admin-equipos-sala>' +
    '<option value="">Todas las salas</option></select></div>' +
    '<div data-admin-equipos-list><p class="cloud-sync-hint">Cargando usuarios y equipos…</p></div>'
  );
}

/** @param {string[]} salas */
export function equiposSalaOptionsHtml(salas) {
  const opts = (salas || [])
    .map((s) => '<option value="' + esc(String(s)) + '">' + esc(String(s)) + '</option>')
    .join('');
  return '<option value="">Todas las salas</option>' + opts;
}

/** @param {object[]} teams @param {string} userId @param {string} userRank */
export function cycleOptionsForTeam(team, userId, userRank, selectedCycle) {
  if (!team) return '<option value="">— Ciclo —</option>';
  const service = String(team.service || 'Sala');
  const rank = String(userRank || 'R1');
  const letters = getCycleLetterOptionsForRank(service, rank);
  const defaultCycle = resolveMembershipCycleForUser(team, userId, rank);
  const selected = String(selectedCycle || '').trim() || defaultCycle;
  if (!letters.length) return '<option value="">— Ciclo —</option>';
  return letters
    .map((letter) => {
      const label = formatLanCycleOptionLabel(letter, rank);
      const sel = letter === selected ? ' selected' : '';
      return '<option value="' + esc(letter) + '"' + sel + '>' + esc(label) + '</option>';
    })
    .join('');
}

/** @param {object} row @param {object[]} teams */
function renderEquiposUserRow(row, teams) {
  const userId = String(row.user_id || '').trim();
  const userRank = String(row.rank || 'R1');
  const handle = normalizeUsername(row.username || '');
  const name = esc(String(row.clinical_name || '').trim() || 'Sin nombre');
  const placement = userId ? resolveLanUserPlacement(userId, teams) : null;
  const teamOptions = renderLanAssignTeamOptionsHtml(teams, placement?.teamId);
  const team = placement?.teamId
    ? teams.find((t) => String(t.team_id) === String(placement.teamId))
    : null;
  const cycleOptions = cycleOptionsForTeam(team, userId, userRank, placement?.cycle);
  const placementLabel = placement?.teamId
    ? esc(
        [placement.teamName, placement.cycle ? formatLanCycleOptionLabel(placement.cycle, userRank) : '']
          .filter(Boolean)
          .join(' · ')
      )
    : '<span class="cloud-sync-admin-equipos-unassigned">Sin equipo</span>';
  const pendingBadge = row.hasLocalProfile
    ? row.clinicalOnly
      ? '<span class="cloud-sync-admin-badge" title="Solo en base clínica (sin cuenta Nube)">Solo clínico</span>'
      : ''
    : '<span class="cloud-sync-admin-badge cloud-sync-admin-equipos-pending" title="Se creará perfil clínico al asignar">Nuevo</span>';
  const searchHaystack = esc(
    [handle, row.clinical_name, row.rank, row.sala, placement?.teamName, row.clinicalOnly ? 'clinico test' : '']
      .map((p) => String(p || '').trim())
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  );
  const purgeBtn = userId
    ? '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="purge-equipo-user" data-user-id="' +
      esc(userId) +
      '" data-cloud-username="' +
      esc(handle) +
      '" title="Quitar del equipo y de la base clínica">Quitar</button>'
    : '';

  return (
    '<article class="cloud-sync-admin-equipos-row" data-user-id="' +
    esc(userId) +
    '" data-cloud-username="' +
    esc(handle) +
    '" data-cloud-display="' +
    esc(String(row.clinical_name || '')) +
    '" data-user-rank="' +
    esc(userRank) +
    '" data-sala="' +
    esc(String(row.sala || '')) +
    '" data-has-team="' +
    (placement?.teamId ? '1' : '0') +
    '" data-search="' +
    searchHaystack +
    '">' +
    '<div class="cloud-sync-admin-equipos-row-main">' +
    '<span class="cloud-sync-admin-equipos-handle">@' +
    esc(handle) +
    '</span> ' +
    pendingBadge +
    '<span class="cloud-sync-admin-equipos-name">' +
    name +
    '</span>' +
    '<select class="profile-input cloud-sync-admin-equipos-rank" title="Rango clínico" aria-label="Rango">' +
    rankSelectOptionsHtml(userRank) +
    '</select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="save-equipo-rank" data-cloud-username="' +
    esc(handle) +
    '">Guardar rango</button>' +
    '<span class="cloud-sync-admin-equipos-placement">' +
    placementLabel +
    '</span></div>' +
    '<div class="cloud-sync-admin-equipos-assign">' +
    '<select class="profile-input cloud-sync-admin-equipos-team" title="Equipo">' +
    teamOptions +
    '</select>' +
    '<select class="profile-input cloud-sync-admin-equipos-cycle" title="Ciclo"' +
    (placement?.teamId ? '' : ' disabled') +
    '>' +
    cycleOptions +
    '</select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-btn--compact" data-admin-action="assign-equipo" data-cloud-username="' +
    esc(handle) +
    '">Asignar</button>' +
    purgeBtn +
    '</div></article>'
  );
}

/** @param {object[]} rows @param {object[]} teams */
export function equiposListHtml(rows, teams) {
  if (!rows.length) {
    return '<p class="cloud-sync-hint">No hay usuarios Nube ni perfiles clínicos locales para asignar.</p>';
  }
  const cards = rows.map((row) => renderEquiposUserRow(row, teams)).join('');
  return '<div class="cloud-sync-admin-equipos-list">' + cards + '</div>';
}

export { adminErrorHtml };
