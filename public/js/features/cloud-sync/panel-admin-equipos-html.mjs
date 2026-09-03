import { esc } from '../../dom-escape.mjs';
import { adminErrorHtml, userActionsHtml } from './panel-admin-html.mjs';
import {
  formatCycleOptionLabel,
  resolveUserPlacement,
} from '../clinical-teams/teams-roster-directory-render.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import {
  clinicalUserActivityTier,
  formatClinicalUserActivityBadge,
  formatClinicalUserActivityHistory,
  formatClinicalUserLastActivity,
} from '../../../../lib/clinical-user-activity.mjs';
import { equiposRowHistoryButtonHtml } from './panel-admin-equipos-history-modal.mjs';
import {
  cycleOptionsForTeam,
  rankSelectOptionsHtml,
  renderEquiposAssignTeamOptionsHtml,
  userSalaSelectOptionsHtml,
} from './panel-admin-equipos-html-fields.mjs';

export {
  CLINICAL_RANK_OPTIONS,
  rankSelectOptionsHtml,
  userSalaSelectOptionsHtml,
  renderEquiposAssignTeamOptionsHtml,
  cycleOptionsForTeam,
} from './panel-admin-equipos-html-fields.mjs';

export function equiposShellHtml() {
  return (
    '<div class="cloud-sync-admin-panel-head">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-equipos">Actualizar</button></div>' +
    '<p class="cloud-sync-hint cloud-sync-admin-equipos-hint">Usuarios clínicos + cuenta Nube. Marca → Sala / rango / equipo / ciclo → <strong>Guardar</strong> o <strong>Quitar seleccionados</strong>. En filas con Nube usa <strong>Restablecer clave</strong>; abre <strong>Nube</strong> para rol y sesiones. Los filtros no quitan las marcas.</p>' +
    '<div class="cloud-sync-admin-toolbar cloud-sync-admin-equipos-toolbar">' +
    '<input type="search" class="profile-input" data-admin-equipos-search placeholder="Buscar @usuario o nombre" />' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-sala">Sala</label>' +
    '<select id="cloud-admin-equipos-sala" class="profile-input" data-admin-equipos-sala>' +
    '<option value="">Todas</option></select>' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-activity">Uso</label>' +
    '<select id="cloud-admin-equipos-activity" class="profile-input" data-admin-equipos-activity>' +
    '<option value="all" selected>Todos</option>' +
    '<option value="has">Con última actividad</option>' +
    '<option value="none">Sin última actividad</option></select>' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-equipos-team-status">Equipo</label>' +
    '<select id="cloud-admin-equipos-team-status" class="profile-input" data-admin-equipos-team-status>' +
    '<option value="all" selected>Todos</option>' +
    '<option value="unassigned">Sin equipo</option>' +
    '<option value="assigned">Con equipo</option></select></div>' +
    '<p class="cloud-sync-hint cloud-sync-admin-equipos-summary" data-admin-equipos-summary title="Usuarios = filas de esta lista (perfil clínico + cuenta Nube). Cuentas Nube = @usuarios únicos. Membresías = inscripciones en salas de sync (un usuario en varias salas cuenta varias veces).">' +
    'Cargando resumen…</p>' +
    '<div class="cloud-sync-admin-equipos-bulk">' +
    '<label class="cloud-sync-admin-equipos-select-all-label">' +
    '<input type="checkbox" class="cloud-sync-admin-equipos-check" data-admin-equipos-select-all /> Seleccionar visibles</label>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary cloud-sync-btn--compact" data-admin-action="save-equipos-bulk">Guardar seleccionados</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="purge-equipos-bulk" title="Elimina cuentas Nube y/o perfiles clínicos de los marcados">Quitar seleccionados</button></div>' +
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

/** @param {object[]} rows @param {object[]} teams */
export function equiposListHtml(rows, teams) {
  if (!rows.length) {
    return '<p class="cloud-sync-hint">No hay usuarios Nube ni perfiles clínicos locales para asignar.</p>';
  }
  const cards = rows.map((row) => renderEquiposUserRow(row, teams)).join('');
  return '<div class="cloud-sync-admin-equipos-list">' + cards + '</div>';
}

/** @param {object} row */
function equiposRowActivityParts(row) {
  const activityIso = String(row.last_activity_at || '');
  const activityTier = clinicalUserActivityTier(activityIso);
  const activityHas = activityTier === 'unknown' ? 'none' : 'has';
  const activityBadgeText = formatClinicalUserActivityBadge(activityIso);
  const historyText = formatClinicalUserActivityHistory(row.activity_history);
  return { activityIso, activityTier, activityHas, activityBadgeText, historyText };
}

/** @param {ReturnType<typeof equiposRowActivityParts>} parts */
function equiposRowActivityBadgeHtml(parts) {
  const activityTitle = esc(
    [formatClinicalUserLastActivity(parts.activityIso), parts.historyText].filter(Boolean).join(' | ')
  );
  return (
    '<span class="cloud-sync-admin-equipos-activity cloud-sync-admin-equipos-activity--' +
    esc(parts.activityTier) +
    '" title="' +
    activityTitle +
    '">' +
    esc(parts.activityBadgeText) +
    '</span>'
  );
}

/** @param {string} handle @param {string} displayName @param {Array<{ at?: string, source?: string }>|null|undefined} history */
function equiposRowHistoryLineHtml(handle, displayName, history) {
  return equiposRowHistoryButtonHtml(handle, displayName, history);
}

/** @param {object} row */
function equiposRowPendingBadgeHtml(row) {
  if (!row.hasLocalProfile) {
    return '<span class="cloud-sync-admin-badge cloud-sync-admin-equipos-pending" title="Se creará perfil clínico al asignar">Nuevo</span>';
  }
  if (row.clinicalOnly) {
    return '<span class="cloud-sync-admin-badge" title="Solo en base clínica (sin cuenta Nube)">Solo clínico</span>';
  }
  return '';
}

/**
 * @param {object} row
 * @param {ReturnType<typeof equiposRowActivityParts>} parts
 * @param {{ teamName?: string } | null} placement
 */
function equiposRowSearchHaystack(row, parts, placement) {
  return esc(
    [
      row.username,
      row.clinical_name,
      row.rank,
      row.sala,
      placement?.teamName,
      parts.activityBadgeText,
      parts.historyText,
      parts.activityHas === 'has' ? 'con actividad' : 'sin actividad',
      row.clinicalOnly ? 'clinico test' : '',
    ]
      .map((p) => String(p || '').trim())
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  );
}

/** @param {string} userId @param {string} cloudId @param {string} handle */
function equiposRowPurgeBtnHtml(userId, cloudId, handle) {
  if (!userId && !cloudId) return '';
  const title =
    cloudId && !userId
      ? 'Eliminar cuenta Nube (sin perfil clínico local)'
      : 'Quitar del equipo / base clínica' + (cloudId ? ' y cuenta Nube' : '');
  return (
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact cloud-sync-admin-equipos-quit" data-admin-action="purge-equipo-user" data-user-id="' +
    esc(userId) +
    '" data-cloud-id="' +
    esc(cloudId) +
    '" data-cloud-username="' +
    esc(handle) +
    '" title="' +
    title +
    '">Quitar</button>'
  );
}

/** @param {string} cloudId @param {string} handle */
function equiposRowResetPasswordBtnHtml(cloudId, handle) {
  if (!cloudId) return '';
  return (
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--compact cloud-sync-admin-equipos-reset" data-admin-action="reset-password" data-user-id="' +
    esc(cloudId) +
    '" data-user-handle="' +
    esc(handle) +
    '" title="Definir contraseña temporal de Nube">Restablecer clave</button>'
  );
}

/** @param {string} resetPasswordBtn @param {string} purgeBtn */
function equiposRowActionBtnsHtml(resetPasswordBtn, purgeBtn) {
  if (!resetPasswordBtn && !purgeBtn) return '';
  return (
    '<div class="cloud-sync-admin-equipos-row-btns" role="group" aria-label="Acciones">' +
    resetPasswordBtn +
    purgeBtn +
    '</div>'
  );
}

/**
 * @param {object} row
 * @param {string} userRank
 * @param {{ teamId?: string, teamName?: string, cycle?: string } | null} placement
 * @param {object[]} teams
 */
function equiposRowAssignFieldsHtml(row, userRank, placement, teams) {
  const teamOptions = renderEquiposAssignTeamOptionsHtml(
    teams,
    placement?.teamId,
    String(row.sala || '').trim()
  );
  const team = placement?.teamId
    ? teams.find((t) => String(t.team_id) === String(placement.teamId))
    : null;
  const cycleOptions = cycleOptionsForTeam(team, String(row.user_id || '').trim(), userRank, placement?.cycle);
  return (
    '<div class="cloud-sync-admin-equipos-assign">' +
    '<label class="cloud-sync-admin-equipos-field">' +
    '<span class="cloud-sync-admin-equipos-field-label">Sala</span>' +
    '<select class="profile-input cloud-sync-admin-equipos-user-sala" aria-label="Sala">' +
    userSalaSelectOptionsHtml(String(row.sala || '')) +
    '</select></label>' +
    '<label class="cloud-sync-admin-equipos-field cloud-sync-admin-equipos-field--rank">' +
    '<span class="cloud-sync-admin-equipos-field-label">Rango</span>' +
    '<select class="profile-input cloud-sync-admin-equipos-rank" aria-label="Rango">' +
    rankSelectOptionsHtml(userRank) +
    '</select></label>' +
    '<label class="cloud-sync-admin-equipos-field cloud-sync-admin-equipos-field--team">' +
    '<span class="cloud-sync-admin-equipos-field-label">Equipo</span>' +
    '<select class="profile-input cloud-sync-admin-equipos-team" aria-label="Equipo">' +
    teamOptions +
    '</select></label>' +
    '<label class="cloud-sync-admin-equipos-field">' +
    '<span class="cloud-sync-admin-equipos-field-label">Ciclo</span>' +
    '<select class="profile-input cloud-sync-admin-equipos-cycle" aria-label="Ciclo"' +
    (placement?.teamId ? '' : ' disabled') +
    '>' +
    cycleOptions +
    '</select></label>' +
    '</div>'
  );
}

/** @param {{ teamId?: string, teamName?: string, cycle?: string } | null} placement @param {string} userRank */
function equiposRowPlacementLabelHtml(placement, userRank) {
  if (!placement?.teamId) {
    return '<span class="cloud-sync-admin-equipos-unassigned">Sin equipo</span>';
  }
  return esc(
    [placement.teamName, placement.cycle ? formatCycleOptionLabel(placement.cycle, userRank) : '']
      .filter(Boolean)
      .join(' · ')
  );
}

/**
 * @param {object} row
 * @param {string} userId
 * @param {string} userRank
 * @param {string} handle
 * @param {{ teamId?: string } | null} placement
 * @param {ReturnType<typeof equiposRowActivityParts>} activity
 */
function equiposRowArticleOpenHtml(row, userId, userRank, handle, placement, activity) {
  const cloudId = String(row.cloudId || '').trim();
  return (
    '<article class="cloud-sync-admin-equipos-row" data-user-id="' +
    esc(userId) +
    '" data-cloud-id="' +
    esc(cloudId) +
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
    '" data-activity="' +
    esc(activity.activityHas) +
    '" data-search="' +
    equiposRowSearchHaystack(row, activity, placement) +
    '">'
  );
}

/**
 * @param {string} handle
 * @param {string} name
 * @param {object} row
 * @param {ReturnType<typeof equiposRowActivityParts>} activity
 * @param {string} placementLabel
 */
function equiposRowMainSectionHtml(handle, name, row, activity, placementLabel) {
  return (
    '<div class="cloud-sync-admin-equipos-row-main">' +
    '<label class="cloud-sync-admin-equipos-check-label" title="Incluir en Guardar seleccionados">' +
    '<input type="checkbox" class="cloud-sync-admin-equipos-check" data-admin-equipos-select /></label>' +
    '<span class="cloud-sync-admin-equipos-handle">@' +
    esc(handle) +
    '</span> ' +
    equiposRowActivityBadgeHtml(activity) +
    ' ' +
    equiposRowPendingBadgeHtml(row) +
    '<span class="cloud-sync-admin-equipos-name">' +
    name +
    '</span>' +
    '<span class="cloud-sync-admin-equipos-placement">' +
    placementLabel +
    '</span>' +
    equiposRowHistoryLineHtml(handle, String(row.clinical_name || '').trim(), row.activity_history) +
    '</div>'
  );
}

/** @param {string} cloudId @param {string} handle */
function equiposRowNubeWrapHtml(cloudId, handle) {
  if (!cloudId) return '';
  const nubeActions = userActionsHtml({ id: cloudId, username: handle });
  return '<div class="cloud-sync-admin-equipos-nube-wrap">' + nubeActions + '</div>';
}

/** @param {object} row @param {object[]} teams */
export function renderEquiposUserRow(row, teams) {
  const userId = String(row.user_id || '').trim();
  const userRank = String(row.rank || 'R1');
  const handle = normalizeUsername(row.username || '');
  const name = esc(String(row.clinical_name || '').trim() || 'Sin nombre');
  const placement = userId ? resolveUserPlacement(userId, teams) : null;
  const activity = equiposRowActivityParts(row);
  const cloudId = String(row.cloudId || '').trim();
  const resetPasswordBtn = equiposRowResetPasswordBtnHtml(cloudId, handle);
  const purgeBtn = equiposRowPurgeBtnHtml(userId, cloudId, handle);

  return (
    equiposRowArticleOpenHtml(row, userId, userRank, handle, placement, activity) +
    equiposRowMainSectionHtml(
      handle,
      name,
      row,
      activity,
      equiposRowPlacementLabelHtml(placement, userRank)
    ) +
    equiposRowAssignFieldsHtml(row, userRank, placement, teams) +
    equiposRowActionBtnsHtml(resetPasswordBtn, purgeBtn) +
    equiposRowNubeWrapHtml(cloudId, handle) +
    '</article>'
  );
}

export { adminErrorHtml };
