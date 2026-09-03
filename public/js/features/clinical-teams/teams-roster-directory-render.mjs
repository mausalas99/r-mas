/** LAN directorio HTML rendering. */
import { getCycleLetterOptionsForRank } from '../../clinico-access.mjs';
import { getClinicalOpsTrace } from '../../clinical-ops-sync.mjs';
import { canViewUserDirectory } from '../../clinical-privileges.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import {
  clinicalUserActivityTier,
  clinicalUserActivityLabel,
  formatClinicalUserLastActivity,
} from '../../../../lib/clinical-user-activity.mjs';
import { escapeHtml, escapeAttr } from './shared.mjs';
import {
  shouldRankGroupOpen,
  renderDirectoryToolbarHtml,
} from './teams-roster-directory-filters.mjs';
import { DIRECTORY_USER_RANK_ORDER } from './teams-roster-directory-state.mjs';

export function renderDirectoryUsersTopButtonHtml(user) {
  if (!canViewUserDirectory(user)) return '';
  return `<button type="button" class="btn-med-secondary clinical-teams-open-lan-users-btn" id="btn-open-lan-users-directory">Directorio LAN</button>`;
}

/** @deprecated — use renderDirectoryUsersTopButtonHtml in create top bar */
export function renderDirectoryUsersEntryHtml(user) {
  return renderDirectoryUsersTopButtonHtml(user);
}

export function cycleLettersForAssign(team, userRank) {
  const service = String(team?.service || 'Sala');
  const rank = String(userRank || 'R1');
  return getCycleLetterOptionsForRank(service, rank);
}

export function renderAssignTeamOptionsHtml(teams, selectedTeamId) {
  const list = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || '').trim();
  if (!list.length) {
    return '<option value="">— Sin equipos —</option>';
  }
  return (
    '<option value="">— Equipo —</option>' +
    list
      .map((team) => {
        const id = escapeAttr(String(team.team_id || ''));
        const staged = Number(team.rotation_active) === 0;
        const label = escapeHtml(
          `${String(team.name || 'Equipo').trim()} · ${String(team.sala || '').trim() || 'Sala'}` +
            (staged ? ' · Próxima rotación, aún no activo' : '')
        );
        const members = Array.isArray(team.members) ? team.members.length : 0;
        const isSelected = selected && id === selected ? ' selected' : '';
        return `<option value="${id}"${isSelected}>${label} (${members})</option>`;
      })
      .join('')
  );
}

/** @param {string} userId @param {object[]} teams */
export function resolveUserPlacement(userId, teams) {
  const uid = String(userId || '').trim();
  if (!uid) return null;
  for (const team of teams || []) {
    const member = (team.members || []).find((m) => String(m.user_id || '') === uid);
    if (!member) continue;
    return {
      teamId: String(team.team_id || ''),
      teamName: String(team.name || 'Equipo').trim(),
      teamSala: String(team.sala || '').trim(),
      cycle: String(member.sub_area_fraction || '').trim(),
      rank: String(member.rank || ''),
    };
  }
  return null;
}

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

/** @param {object[]} users */
function groupUsersByRank(users) {
  /** @type {Map<string, object[]>} */
  const groups = new Map(DIRECTORY_USER_RANK_ORDER.map((rank) => [rank, []]));
  /** @type {object[]} */
  const other = [];
  for (const user of users) {
    const rank = String(user?.rank || 'R1');
    if (groups.has(rank)) groups.get(rank).push(user);
    else other.push(user);
  }
  return { groups, other };
}

/** @param {string} letter @param {string} userRank */
export function formatCycleOptionLabel(letter, userRank) {
  const frac = String(letter || '').trim();
  if (!frac) return '— Ciclo —';
  const rank = String(userRank || '').trim();
  // Sala R1 subcycles (A1–D2) — letter shape wins.
  if (/^[A-D][12]$/i.test(frac)) return `Subciclo R1 · ${frac.toUpperCase()}`;
  // Prefer explicit rank so Inters/UX/Eme R3 is not labeled "Ciclo R2".
  if (rank === 'R1') return `Subciclo R1 · ${frac}`;
  if (rank === 'R2') return `Ciclo R2 · ${frac}`;
  if (rank === 'R3') return `Ciclo R3 · ${frac}`;
  if (rank === 'R4') return `Ciclo R4 · ${frac}`;
  if (/^[A-F]$/i.test(frac)) return `Ciclo R2 · ${frac}`;
  return `Ciclo · ${frac}`;
}

/** @param {object[]} users */
function renderDirectoryEmptyStateHtml(users) {
  const trace = getClinicalOpsTrace();
  const lastGet = trace.find(function (e) {
    return e.boundary === 'get' && e.data && e.data.ok === true;
  });
  const lastMerge = trace.find(function (e) {
    return e.boundary === 'merge';
  });
  const hostUsers = Number(lastGet?.data?.incomingUsers || 0);
  const mergeDeferred =
    lastMerge?.data?.deferred === true || lastMerge?.data?.code === 'DB_LOCKED';
  let hostHint = '';
  if (hostUsers > 0 && (!users || !users.length)) {
    if (mergeDeferred) {
      hostHint =
        '<p class="clinical-teams-empty">El anfitrión reporta <strong>' +
        hostUsers +
        '</strong> perfil(es) registrados, pero la base clínica no pudo fusionarlos (sesión bloqueada). Desbloquea la base clínica y pulsa <strong>Actualizar desde ⇄</strong>.</p>';
    } else {
      hostHint =
        '<p class="clinical-teams-empty">El anfitrión ya tiene <strong>' +
        hostUsers +
        '</strong> perfil(es) en ⇄, pero aún no aparecen en esta Mac. Con LiveSync conectado, pulsa <strong>Actualizar desde ⇄</strong>.</p>';
    }
  }
  return (
    hostHint +
    '<p class="clinical-teams-empty">Aún no hay otros @usuario en esta Mac. Cada residente debe conectarse a tu LAN, abrir <strong>⇄ → Unirse</strong> en la misma sala y guardar <strong>Mi rotación → Guardar perfil</strong>. Luego los asignas al equipo desde aquí (no hace falta que ya tengan equipo).</p>'
  );
}

/** @param {object[]} users @param {object[]} teams @param {{ canDelete?: boolean, callerUserId?: string }} [opts] */
export function renderDirectoryUsersModalBodyHtml(users, teams, opts = {}) {
  const list = Array.isArray(users) ? users : [];
  const teamList = Array.isArray(teams) ? teams : [];
  const rowOpts = {
    canDelete: !!opts.canDelete,
    callerUserId: String(opts.callerUserId || ''),
  };

  if (!list.length) {
    return renderDirectoryEmptyStateHtml(list);
  }

  const { groups, other } = groupUsersByRank(list);

  const rankSections = DIRECTORY_USER_RANK_ORDER.map((rank) => {
    const usersInRank = groups.get(rank) || [];
    if (!usersInRank.length) return '';
    const openAttr = shouldRankGroupOpen(rank, usersInRank.length) ? ' open' : '';
    return `<details class="clinical-directory-rank-group"${openAttr} data-lan-rank-group="${escapeAttr(rank)}" data-lan-rank-count="${usersInRank.length}">
      <summary class="clinical-directory-rank-group-summary">
        <span class="clinical-directory-rank-group-title">${escapeHtml(rank)}</span>
        <span class="clinical-directory-rank-group-count">${usersInRank.length}</span>
      </summary>
      <div class="clinical-lan-user-cards">
        ${usersInRank.map((u) => renderDirectoryUserRowHtml(u, teamList, rowOpts)).join('')}
      </div>
    </details>`;
  }).join('');

  const otherSection = other.length
    ? `<details class="clinical-directory-rank-group"${shouldRankGroupOpen('Otros', other.length) ? ' open' : ''} data-lan-rank-group="Otros" data-lan-rank-count="${other.length}">
        <summary class="clinical-directory-rank-group-summary">
          <span class="clinical-directory-rank-group-title">Otros</span>
          <span class="clinical-directory-rank-group-count">${other.length}</span>
        </summary>
        <div class="clinical-lan-user-cards">
          ${other.map((u) => renderDirectoryUserRowHtml(u, teamList, rowOpts)).join('')}
        </div>
      </details>`
    : '';

  const teamsHint = teamList.length
    ? ''
    : '<p class="clinical-teams-empty">Crea un equipo vacío en Mi rotación para poder asignar residentes.</p>';

  return `
    <div class="clinical-directory-head">
      <p class="clinical-directory-users-modal-lead">Asigna residentes a equipos activos en esta Mac. <strong>Actualizar desde ⇄</strong> trae usuarios de todas las salas (Sala 1–E, Interconsultas, UX, Eme, etc.).
        <button type="button" class="btn-med-secondary clinical-directory-refresh-btn">Actualizar desde ⇄</button>
      </p>
      ${renderDirectoryToolbarHtml(list, teamList)}
    </div>
    ${teamsHint}
    <div class="clinical-directory-rank-groups">${rankSections}${otherSection}</div>`;
}
