/** LAN directorio — single user card HTML fragments. */
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import {
  clinicalUserActivityTier,
  clinicalUserActivityLabel,
  formatClinicalUserLastActivity,
} from '../../../../lib/clinical-user-activity.mjs';
import { escapeHtml, escapeAttr } from './shared.mjs';
import {
  formatCycleOptionLabel,
  renderAssignTeamOptionsHtml,
  resolveUserPlacement,
} from './teams-roster-directory-render.mjs';

/** @param {object} u @param {ReturnType<typeof resolveUserPlacement>} placement */
export function lanUserSearchHaystack(u, placement) {
  return [
    u?.username,
    u?.clinical_name,
    u?.sala,
    u?.rank,
    placement?.teamName,
    placement?.teamSala,
    placement?.cycle,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** @param {ReturnType<typeof resolveUserPlacement>} placement @param {string} userRank */
function formatLanUserPlacementLabel(placement, userRank) {
  if (!placement?.teamId) return 'Sin equipo asignado';
  const parts = [placement.teamName || 'Equipo'];
  if (placement.teamSala) parts.push(placement.teamSala);
  if (placement.cycle) {
    parts.push(formatCycleOptionLabel(placement.cycle, userRank || placement.rank));
  }
  return parts.join(' · ');
}

/** @param {object} u */
function renderLanUserHandleCell(u) {
  const rawHandle = normalizeUsername(u.username || '');
  const handleValid = isValidUsernameFormat(rawHandle) && !u.lanDirectoryPending;
  return handleValid
    ? `<span class="clinical-directory-users-handle">@${escapeHtml(rawHandle)}</span>`
    : `<span class="clinical-directory-users-handle clinical-directory-users-handle--pending" title="Falta registrar @usuario en Mi rotación">sin @usuario</span>`;
}

/** @param {object} u @param {ReturnType<typeof resolveUserPlacement>} placement */
function renderLanUserPlacementShort(placement, userRank) {
  const hasTeam = Boolean(placement?.teamId);
  if (!hasTeam) {
    return '<span class="clinical-directory-users-placement clinical-directory-users-placement--none">Sin equipo asignado</span>';
  }
  return escapeHtml(
    [placement.teamName, placement.cycle ? formatCycleOptionLabel(placement.cycle, userRank) : '']
      .filter(Boolean)
      .join(' · ')
  );
}

/** @param {object} u @param {object[]} teamList @param {{ canDelete?: boolean, callerUserId?: string }} opts */
function lanUserCardActivityMeta(u) {
  const activityIso = String(u.last_activity_at || '').trim();
  const activityTier = clinicalUserActivityTier(activityIso);
  return {
    activityIso,
    activityTier,
    activityLabel: escapeHtml(clinicalUserActivityLabel(activityTier)),
    activityDetail: escapeHtml(formatClinicalUserLastActivity(activityIso)),
  };
}

/** @param {object} u @param {ReturnType<typeof resolveUserPlacement>} placement @param {object[]} teamList */
function lanUserCardAssignMeta(u, placement, teamList, userRank) {
  const userId = escapeAttr(String(u.user_id || ''));
  const teamOptions = renderAssignTeamOptionsHtml(teamList, placement?.teamId);
  const cycleOptions = placement?.cycle
    ? `<option value="${escapeAttr(placement.cycle)}" selected>${escapeHtml(formatCycleOptionLabel(placement.cycle, userRank))}</option>`
    : '<option value="">— Ciclo —</option>';
  return { userId, teamOptions, cycleOptions };
}

/** @param {object} ctx */
function assembleLanUserRowArticle(ctx) {
  const {
    u,
    userId,
    rawUserId,
    name,
    rankRaw,
    placement,
    placementLabel,
    teamOptions,
    cycleOptions,
    placementShort,
    activityTier,
    activityLabel,
    activityDetail,
    searchHaystack,
    salaAttr,
    deleteBtnClass,
    deleteBtnAttrs,
    salaLabel,
  } = ctx;
  return `<article class="clinical-lan-user-card clinical-lan-user-row" data-user-id="${userId}" data-user-rank="${rankRaw}" data-preferred-cycle="${escapeAttr(placement?.cycle || '')}" data-sala="${salaAttr}" data-has-team="${placement?.teamId ? '1' : '0'}" data-activity-tier="${escapeAttr(activityTier)}" data-search="${searchHaystack}">
    <div class="clinical-lan-user-card-main">
      <div class="clinical-lan-user-card-identity">
        ${renderLanUserHandleCell(u)}
        <span class="clinical-directory-users-name" title="${name}">${name}</span>
        <span class="clinical-lan-user-sala-chip">${salaLabel}</span>
        <span class="clinical-lan-user-activity-chip clinical-lan-user-activity-chip--${escapeAttr(activityTier)}" title="${activityDetail}">${activityLabel}</span>
      </div>
      <p class="clinical-lan-user-card-placement" title="${placementLabel}">${placementShort}</p>
      <p class="clinical-lan-user-card-activity">${activityDetail}</p>
    </div>
    <div class="clinical-lan-user-card-assign">
      <label class="visually-hidden" for="clinical-lan-team-${userId}">Equipo</label>
      <select id="clinical-lan-team-${userId}" class="profile-input clinical-directory-assign-team" title="Asignar equipo">${teamOptions}</select>
      <label class="visually-hidden" for="clinical-lan-cycle-${userId}">Ciclo</label>
      <select id="clinical-lan-cycle-${userId}" class="profile-input clinical-directory-assign-cycle" title="Ciclo del integrante" ${placement?.teamId ? '' : 'disabled'}>
        ${cycleOptions}
      </select>
      <span class="clinical-directory-assign-actions" role="group" aria-label="Acciones">
        <button type="button" class="btn-save clinical-directory-assign-btn" data-user-id="${userId}">Asignar</button>
        <button type="button" class="btn-med-secondary clinical-directory-delete-user-btn${deleteBtnClass}" data-user-id="${userId}" data-user-label="${escapeAttr(String(u.clinical_name || normalizeUsername(u.username || '') || rawUserId))}" title="Quitar de la base clínica (se publica por R+ Cloud)"${deleteBtnAttrs}>Quitar</button>
      </span>
    </div>
  </article>`;
}

/** @param {object} u @param {object[]} teamList @param {{ canDelete?: boolean, callerUserId?: string }} opts */
export function renderDirectoryUserRowHtml(u, teamList, opts = {}) {
  const rawUserId = String(u.user_id || '').trim();
  const canDelete =
    !!opts.canDelete && rawUserId && rawUserId !== String(opts.callerUserId || '').trim();
  const name = escapeHtml(String(u.clinical_name || '').trim() || 'Sin nombre');
  const rankRaw = escapeAttr(String(u.rank || 'R1'));
  const userRank = String(u.rank || 'R1');
  const salaLabel = escapeHtml(String(u.sala || '').trim() || '—');
  const placement = resolveUserPlacement(u.user_id, teamList);
  const placementLabel = escapeHtml(formatLanUserPlacementLabel(placement, userRank));
  const { userId, teamOptions, cycleOptions } = lanUserCardAssignMeta(u, placement, teamList, userRank);
  const placementShort = renderLanUserPlacementShort(placement, userRank);
  const { activityIso, activityTier, activityLabel, activityDetail } = lanUserCardActivityMeta(u);
  const searchHaystack = escapeAttr(
    `${lanUserSearchHaystack(u, placement)} ${formatClinicalUserLastActivity(activityIso)}`.toLowerCase()
  );
  const salaAttr = escapeAttr(String(u.sala || '').trim());
  const deleteBtnClass = canDelete ? '' : ' clinical-directory-delete-user-btn--placeholder';
  const deleteBtnAttrs = canDelete ? '' : ' disabled tabindex="-1" aria-hidden="true"';

  return assembleLanUserRowArticle({
    u,
    userId,
    rawUserId,
    name,
    rankRaw,
    userRank,
    salaLabel,
    placement,
    placementLabel,
    teamOptions,
    cycleOptions,
    placementShort,
    activityTier,
    activityLabel,
    activityDetail,
    searchHaystack,
    salaAttr,
    deleteBtnClass,
    deleteBtnAttrs,
  });
}
