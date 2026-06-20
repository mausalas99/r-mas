/** Mi rotación submodule. */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  refreshClinicalUserProfile,
  touchClinicalSessionActivity,
} from '../../clinical-access-runtime.mjs';
import {
  isBenignLanPushSkipCode,
  LAN_PROFILE_PUSH_FAILED_MSG,
} from '../../clinical-profile-lan-sync.mjs';
import {
  getCycleLetterOptionsForRank,
  getCycleFieldMetaForTeamCreate,
  formatMemberCycleLabel,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
} from '../../clinico-access.mjs';
import {
  buildClinicalTeamInviteMessage,
  teamInviteCode,
} from '../../clinical-team-invite.mjs';
import { copyToClipboardSafe } from '../soap-estado.mjs';
import { recordClinicalOpsTrace, getClinicalOpsTrace } from '../../lan-sync-diagnostics.mjs';
import {
  effectiveClinicalRank,
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  canViewLanUserDirectory,
  canManageTeamRoster,
  canDeleteLanDirectoryUser,
} from '../../clinical-privileges.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../../clinical-username.mjs';
import { syncRotationConfigButton, wireNuevaRotacionControl } from '../clinical-rotation.mjs';
import { persistClinicalUserBinding, readRpcSettings } from '../../clinical-settings.mjs';
import { resumeClinicalIdentityByUsername } from '../../clinical-access-runtime.mjs';
import { verifyAdminAccessCode } from '../../../../lib/admin-access-code.mjs';
import {
  clinicalUserActivityTier,
  clinicalUserActivityLabel,
  formatClinicalUserLastActivity,
} from '../../../../lib/clinical-user-activity.mjs';
import {
  ensureClinicalPanelSession,
  getClinicalTeamsPanelHost,
  safeRenderClinicalTeamsPanel,
  setClinicalTeamsPanelError,
} from '../clinical-panel-host.mjs';
import {
  dbApi,
  toast,
  escapeHtml,
  escapeAttr,
  hintHtml,
  currentUserId,
  filterJoinedTeams,
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  BROWSE_SALA_LS,
  promptAdminAccessCode,
} from './shared.mjs';
import {
  publishClinicalTeamsToLan,
  toastTeamLanPublishResult,
  pullClinicalOpsFromLanRoom,
  resolveLocalUserIdByLanHandle,
} from './teams-guardia-bridge.mjs';
import { lanDirectoryUserMatchesFilters } from './lan-directory-filters.mjs';
import { flushPendingClinicalOpsLanSnapshot } from '../../clinical-ops-lan.mjs';


/** Top-bar CTA beside «Crear equipo» (opens separate modal). */
export function renderLanUsersDirectoryTopButtonHtml(user) {
  if (!canViewLanUserDirectory(user)) return '';
  return `<button type="button" class="btn-med-secondary clinical-teams-open-lan-users-btn" id="btn-open-lan-users-directory">Directorio LAN</button>`;
}

/** @deprecated — use renderLanUsersDirectoryTopButtonHtml in create top bar */
export function renderLanUsersDirectoryEntryHtml(user) {
  return renderLanUsersDirectoryTopButtonHtml(user);
}

export function lanUsersModalBackdropEl() {
  return document.getElementById('clinical-lan-users-backdrop');
}

export function lanUsersModalBodyEl() {
  return document.getElementById('clinical-lan-users-panel-body');
}

export function isLanDirectoryModalOpen() {
  const bd = lanUsersModalBackdropEl();
  return !!(bd && bd.classList.contains('open'));
}

/** @type {object[]} */
let _lanUsersModalTeams = [];

/** Rank groups the user collapsed in directorio LAN (persists across background refreshes). */
const lanDirectoryCollapsedRanks = new Set();
/** Large rank groups the user explicitly expanded (default: collapsed when >4 users). */
const lanDirectoryExpandedRanks = new Set();

const LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD = 4;
const LAN_DIRECTORY_LAN_PULL_MIN_MS = 30_000;
const LAN_DIRECTORY_IPC_MIN_MS = 4_000;

let lastLanDirectoryFingerprint = '';
let lanDirectoryLanPullLastAt = 0;
let lanDirectoryIpcLastAt = 0;
/** While open: no auto-refresh (avoids lag from ⇄ sync storms). User taps Actualizar. */
let lanDirectoryFreezeAutoRefresh = false;
let lanDirectoryFilterQuery = '';
let lanDirectoryFilterStatus = 'all';
let lanDirectoryFilterSala = '';
let lanDirectoryFilterActivity = 'all';

function lanRankGroupKey(rank) {
  return String(rank || '').trim() || 'Otros';
}

/** @param {string} rank @param {number} userCount */
function shouldLanRankGroupOpen(rank, userCount) {
  const key = lanRankGroupKey(rank);
  if (lanDirectoryCollapsedRanks.has(key)) return false;
  if (lanDirectoryExpandedRanks.has(key)) return true;
  return userCount <= LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD;
}

/** @param {HTMLElement} host */
function captureLanDirectoryCollapseState(host) {
  host.querySelectorAll('details.clinical-lan-rank-group').forEach((el) => {
    const key = String(el.dataset.lanRankGroup || '').trim();
    if (!key) return;
    const count = Number(el.dataset.lanRankCount) || 0;
    if (el.open) {
      lanDirectoryCollapsedRanks.delete(key);
      if (count > LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD) {
        lanDirectoryExpandedRanks.add(key);
      }
    } else {
      lanDirectoryCollapsedRanks.add(key);
      lanDirectoryExpandedRanks.delete(key);
    }
  });
}

/** @param {object} u @param {ReturnType<typeof resolveLanUserPlacement>} placement */
function lanUserSearchHaystack(u, placement) {
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

/** @param {object[]} users @param {object[]} teams */
function lanDirectorySalaFilterOptions(users, teams) {
  const salas = new Set(CLINICAL_SALAS);
  for (const u of users || []) {
    const sala = String(u?.sala || '').trim();
    if (sala) salas.add(sala);
  }
  for (const t of teams || []) {
    const sala = String(t?.sala || '').trim();
    if (sala) salas.add(sala);
  }
  return [...salas].sort((a, b) => a.localeCompare(b, 'es'));
}

function renderLanDirectoryToolbarHtml(users, teams) {
  const salas = lanDirectorySalaFilterOptions(users, teams);
  const salaOptions = salas
    .map(
      (s) =>
        `<option value="${escapeAttr(s)}"${lanDirectoryFilterSala === s ? ' selected' : ''}>${escapeHtml(s)}</option>`
    )
    .join('');
  const statusSelected = (value) => (lanDirectoryFilterStatus === value ? ' selected' : '');
  const activitySelected = (value) => (lanDirectoryFilterActivity === value ? ' selected' : '');
  return `
    <div class="clinical-lan-directory-toolbar">
      <label class="clinical-lan-directory-search-wrap">
        <span class="visually-hidden">Buscar usuario</span>
        <input type="search" id="clinical-lan-directory-search" class="profile-input clinical-lan-directory-search" placeholder="Buscar @usuario o nombre…" value="${escapeAttr(lanDirectoryFilterQuery)}" autocomplete="off">
      </label>
      <label class="clinical-lan-directory-filter">
        <span class="clinical-lan-directory-filter-label">Actividad</span>
        <select id="clinical-lan-directory-activity-filter" class="profile-input">
          <option value="all"${activitySelected('all')}>Todas</option>
          <option value="active"${activitySelected('active')}>Activos (24 h)</option>
          <option value="inactive"${activitySelected('inactive')}>Inactivos</option>
        </select>
      </label>
      <label class="clinical-lan-directory-filter">
        <span class="clinical-lan-directory-filter-label">Equipo</span>
        <select id="clinical-lan-directory-status-filter" class="profile-input">
          <option value="all"${statusSelected('all')}>Todos</option>
          <option value="unassigned"${statusSelected('unassigned')}>Sin equipo</option>
          <option value="assigned"${statusSelected('assigned')}>Con equipo</option>
        </select>
      </label>
      <label class="clinical-lan-directory-filter">
        <span class="clinical-lan-directory-filter-label">Sala</span>
        <select id="clinical-lan-directory-sala-filter" class="profile-input">
          <option value=""${lanDirectoryFilterSala ? '' : ' selected'}>Todas</option>
          ${salaOptions}
        </select>
      </label>
      <span class="clinical-lan-directory-match-count" aria-live="polite"></span>
    </div>`;
}

/** @param {HTMLElement} host */
function applyLanDirectoryFilters(host) {
  const searchEl = host.querySelector('#clinical-lan-directory-search');
  const statusEl = host.querySelector('#clinical-lan-directory-status-filter');
  const salaEl = host.querySelector('#clinical-lan-directory-sala-filter');
  const activityEl = host.querySelector('#clinical-lan-directory-activity-filter');
  const countEl = host.querySelector('.clinical-lan-directory-match-count');

  if (searchEl instanceof HTMLInputElement) lanDirectoryFilterQuery = searchEl.value;
  if (statusEl instanceof HTMLSelectElement) lanDirectoryFilterStatus = statusEl.value;
  if (salaEl instanceof HTMLSelectElement) lanDirectoryFilterSala = salaEl.value;
  if (activityEl instanceof HTMLSelectElement) lanDirectoryFilterActivity = activityEl.value;

  const filters = {
    query: lanDirectoryFilterQuery,
    status: lanDirectoryFilterStatus,
    sala: lanDirectoryFilterSala,
    activity: lanDirectoryFilterActivity,
  };

  let visible = 0;
  let total = 0;
  host.querySelectorAll('.clinical-lan-user-card').forEach((card) => {
    total += 1;
    const show = lanDirectoryUserMatchesFilters(
      {
        search: card.dataset.search || '',
        hasTeam: card.dataset.hasTeam === '1',
        sala: card.dataset.sala || '',
        activityTier: card.dataset.activityTier || 'unknown',
      },
      filters
    );
    card.hidden = !show;
    card.classList.toggle('clinical-lan-user-card--filtered-out', !show);
    if (show) visible += 1;
  });

  host.querySelectorAll('.clinical-lan-rank-group').forEach((group) => {
    const cards = group.querySelectorAll('.clinical-lan-user-card');
    let visibleInGroup = 0;
    for (const card of cards) {
      if (!card.hidden) visibleInGroup += 1;
    }
    const groupCountEl = group.querySelector('.clinical-lan-rank-group-count');
    const totalInGroup = cards.length;
    if (groupCountEl) {
      groupCountEl.textContent =
        visibleInGroup === totalInGroup ? String(totalInGroup) : `${visibleInGroup}/${totalInGroup}`;
    }
    const anyVisible = visibleInGroup > 0;
    group.hidden = !anyVisible;
    group.classList.toggle('clinical-lan-rank-group--filtered-out', !anyVisible);
  });

  if (countEl) {
    countEl.textContent =
      visible === total ? `${total} usuarios` : `Mostrando ${visible} de ${total}`;
  }
}

const LAN_DIRECTORY_FILTER_SELECT_IDS = new Set([
  'clinical-lan-directory-status-filter',
  'clinical-lan-directory-sala-filter',
  'clinical-lan-directory-activity-filter',
]);

function runLanDirectoryFiltersFromUi() {
  const host = lanUsersModalBodyEl();
  if (host?.querySelector('.clinical-lan-rank-groups')) applyLanDirectoryFilters(host);
}

/** Re-bind filter controls after each directory render (innerHTML replaces nodes). */
function bindLanDirectoryFilterControls(host) {
  if (!host) return;
  if (host._lanDirFilterAbort) host._lanDirFilterAbort.abort();
  const ac = new AbortController();
  host._lanDirFilterAbort = ac;
  const { signal } = ac;
  const apply = () => applyLanDirectoryFilters(host);

  const searchEl = host.querySelector('#clinical-lan-directory-search');
  if (searchEl instanceof HTMLInputElement) {
    searchEl.addEventListener('input', apply, { signal });
    searchEl.addEventListener('search', apply, { signal });
  }
  for (const id of LAN_DIRECTORY_FILTER_SELECT_IDS) {
    const el = host.querySelector(`#${id}`);
    if (el instanceof HTMLSelectElement) el.addEventListener('change', apply, { signal });
  }
}

/** One-time delegation on modal backdrop (survives panel-body innerHTML swaps). */
function ensureLanDirectoryFilterDelegation() {
  const bd = lanUsersModalBackdropEl();
  if (!bd || bd._rpcLanDirFilterDelegated) return;
  bd._rpcLanDirFilterDelegated = true;
  bd.addEventListener('input', (ev) => {
    if (!(ev.target instanceof HTMLInputElement)) return;
    if (ev.target.id !== 'clinical-lan-directory-search') return;
    runLanDirectoryFiltersFromUi();
  });
  bd.addEventListener('change', (ev) => {
    if (!(ev.target instanceof HTMLSelectElement)) return;
    if (!LAN_DIRECTORY_FILTER_SELECT_IDS.has(ev.target.id)) return;
    runLanDirectoryFiltersFromUi();
  });
}

function cycleLettersForAssign(team, userRank) {
  const service = String(team?.service || 'Sala');
  const rank = String(userRank || 'R1');
  return getCycleLetterOptionsForRank(service, rank);
}

function renderLanAssignTeamOptionsHtml(teams, selectedTeamId) {
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
        const label = escapeHtml(
          `${String(team.name || 'Equipo').trim()} · ${String(team.sala || '').trim() || 'Sala'}`
        );
        const members = Array.isArray(team.members) ? team.members.length : 0;
        const isSelected = selected && id === selected ? ' selected' : '';
        return `<option value="${id}"${isSelected}>${label} (${members})</option>`;
      })
      .join('')
  );
}

/** @param {string} userId @param {object[]} teams */
function resolveLanUserPlacement(userId, teams) {
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

/** @param {ReturnType<typeof resolveLanUserPlacement>} placement @param {string} userRank */
function formatLanUserPlacementLabel(placement, userRank) {
  if (!placement?.teamId) return 'Sin equipo asignado';
  const parts = [placement.teamName || 'Equipo'];
  if (placement.teamSala) parts.push(placement.teamSala);
  if (placement.cycle) {
    parts.push(formatLanCycleOptionLabel(placement.cycle, userRank || placement.rank));
  }
  return parts.join(' · ');
}

const LAN_USER_RANK_ORDER = ['R1', 'R2', 'R3', 'R4', 'Admin'];

/** @param {object[]} users */
function groupLanUsersByRank(users) {
  /** @type {Map<string, object[]>} */
  const groups = new Map(LAN_USER_RANK_ORDER.map((rank) => [rank, []]));
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
function formatLanCycleOptionLabel(letter, userRank) {
  const frac = String(letter || '').trim();
  if (!frac) return '— Ciclo —';
  const rank = String(userRank || 'R1');
  if (rank === 'R2' || /^[A-F]$/i.test(frac)) return `Ciclo R2 · ${frac}`;
  if (rank === 'R1' || /[12]$/i.test(frac)) return `Subciclo R1 · ${frac}`;
  return `Ciclo · ${frac}`;
}

/** @param {object} u @param {object[]} teamList @param {{ canDelete?: boolean, callerUserId?: string }} [opts] */
function renderLanUserRowHtml(u, teamList, opts = {}) {
  const userId = escapeAttr(String(u.user_id || ''));
  const rawUserId = String(u.user_id || '').trim();
  const canDelete =
    !!opts.canDelete &&
    rawUserId &&
    rawUserId !== String(opts.callerUserId || '').trim();
  const rawHandle = normalizeUsername(u.username || '');
  const handleValid = isValidUsernameFormat(rawHandle) && !u.lanDirectoryPending;
  const handleCell = handleValid
    ? `<span class="clinical-lan-users-handle">@${escapeHtml(rawHandle)}</span>`
    : `<span class="clinical-lan-users-handle clinical-lan-users-handle--pending" title="Falta registrar @usuario en Mi rotación">sin @usuario</span>`;
  const name = escapeHtml(String(u.clinical_name || '').trim() || 'Sin nombre');
  const rankRaw = escapeAttr(String(u.rank || 'R1'));
  const salaLabel = escapeHtml(String(u.sala || '').trim() || '—');
  const placement = resolveLanUserPlacement(u.user_id, teamList);
  const placementLabel = escapeHtml(formatLanUserPlacementLabel(placement, String(u.rank || 'R1')));
  const teamOptions = renderLanAssignTeamOptionsHtml(teamList, placement?.teamId);
  const cycleOptions = placement?.cycle
    ? `<option value="${escapeAttr(placement.cycle)}" selected>${escapeHtml(formatLanCycleOptionLabel(placement.cycle, String(u.rank || 'R1')))}</option>`
    : '<option value="">— Ciclo —</option>';

  const hasTeam = Boolean(placement?.teamId);
  const placementShort = hasTeam
    ? escapeHtml(
        [placement.teamName, placement.cycle ? formatLanCycleOptionLabel(placement.cycle, String(u.rank || 'R1')) : '']
          .filter(Boolean)
          .join(' · ')
      )
    : '<span class="clinical-lan-users-placement clinical-lan-users-placement--none">Sin equipo asignado</span>';
  const activityIso = String(u.last_activity_at || '').trim();
  const activityTier = clinicalUserActivityTier(activityIso);
  const activityLabel = escapeHtml(clinicalUserActivityLabel(activityTier));
  const activityDetail = escapeHtml(formatClinicalUserLastActivity(activityIso));
  const searchHaystack = escapeAttr(
    `${lanUserSearchHaystack(u, placement)} ${formatClinicalUserLastActivity(activityIso)}`.toLowerCase()
  );
  const salaAttr = escapeAttr(String(u.sala || '').trim());

  return `<article class="clinical-lan-user-card clinical-lan-user-row" data-user-id="${userId}" data-user-rank="${rankRaw}" data-preferred-cycle="${escapeAttr(placement?.cycle || '')}" data-sala="${salaAttr}" data-has-team="${hasTeam ? '1' : '0'}" data-activity-tier="${escapeAttr(activityTier)}" data-search="${searchHaystack}">
    <div class="clinical-lan-user-card-main">
      <div class="clinical-lan-user-card-identity">
        ${handleCell}
        <span class="clinical-lan-users-name" title="${name}">${name}</span>
        <span class="clinical-lan-user-sala-chip">${salaLabel}</span>
        <span class="clinical-lan-user-activity-chip clinical-lan-user-activity-chip--${escapeAttr(activityTier)}" title="${activityDetail}">${activityLabel}</span>
      </div>
      <p class="clinical-lan-user-card-placement" title="${placementLabel}">${placementShort}</p>
      <p class="clinical-lan-user-card-activity">${activityDetail}</p>
    </div>
    <div class="clinical-lan-user-card-assign">
      <label class="visually-hidden" for="clinical-lan-team-${userId}">Equipo</label>
      <select id="clinical-lan-team-${userId}" class="profile-input clinical-lan-assign-team" title="Asignar equipo">${teamOptions}</select>
      <label class="visually-hidden" for="clinical-lan-cycle-${userId}">Ciclo</label>
      <select id="clinical-lan-cycle-${userId}" class="profile-input clinical-lan-assign-cycle" title="Ciclo del integrante" ${placement?.teamId ? '' : 'disabled'}>
        ${cycleOptions}
      </select>
      <span class="clinical-lan-assign-actions" role="group" aria-label="Acciones">
        <button type="button" class="btn-save clinical-lan-assign-btn" data-user-id="${userId}">Asignar</button>
        <button type="button" class="btn-med-secondary clinical-lan-delete-user-btn${
          canDelete ? '' : ' clinical-lan-delete-user-btn--placeholder'
        }" data-user-id="${userId}" data-user-label="${escapeAttr(String(u.clinical_name || rawHandle || rawUserId))}" title="Quitar de la base clínica en esta Mac"${
          canDelete ? '' : ' disabled tabindex="-1" aria-hidden="true"'
        }>Quitar</button>
      </span>
    </div>
  </article>`;
}

/** @param {object[]} users */
function renderLanDirectoryEmptyStateHtml(users) {
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
function renderLanUsersModalBodyHtml(users, teams, opts = {}) {
  const list = Array.isArray(users) ? users : [];
  const teamList = Array.isArray(teams) ? teams : [];
  const rowOpts = {
    canDelete: !!opts.canDelete,
    callerUserId: String(opts.callerUserId || ''),
  };

  if (!list.length) {
    return renderLanDirectoryEmptyStateHtml(list);
  }

  const { groups, other } = groupLanUsersByRank(list);

  const rankSections = LAN_USER_RANK_ORDER.map((rank) => {
    const usersInRank = groups.get(rank) || [];
    if (!usersInRank.length) return '';
    const openAttr = shouldLanRankGroupOpen(rank, usersInRank.length) ? ' open' : '';
    return `<details class="clinical-lan-rank-group"${openAttr} data-lan-rank-group="${escapeAttr(rank)}" data-lan-rank-count="${usersInRank.length}">
      <summary class="clinical-lan-rank-group-summary">
        <span class="clinical-lan-rank-group-title">${escapeHtml(rank)}</span>
        <span class="clinical-lan-rank-group-count">${usersInRank.length}</span>
      </summary>
      <div class="clinical-lan-user-cards">
        ${usersInRank.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join('')}
      </div>
    </details>`;
  }).join('');

  const otherSection = other.length
    ? `<details class="clinical-lan-rank-group"${shouldLanRankGroupOpen('Otros', other.length) ? ' open' : ''} data-lan-rank-group="Otros" data-lan-rank-count="${other.length}">
        <summary class="clinical-lan-rank-group-summary">
          <span class="clinical-lan-rank-group-title">Otros</span>
          <span class="clinical-lan-rank-group-count">${other.length}</span>
        </summary>
        <div class="clinical-lan-user-cards">
          ${other.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join('')}
        </div>
      </details>`
    : '';

  const teamsHint = teamList.length
    ? ''
    : '<p class="clinical-teams-empty">Crea un equipo vacío en Mi rotación para poder asignar residentes.</p>';

  return `
    <div class="clinical-lan-directory-head">
      <p class="clinical-lan-users-modal-lead">Asigna residentes a equipos activos en esta Mac. <strong>Actualizar desde ⇄</strong> trae usuarios de todas las salas (Sala 1–E, Interconsultas, UX, Eme, etc.).
        <button type="button" class="btn-med-secondary clinical-lan-directory-refresh-btn">Actualizar desde ⇄</button>
      </p>
      ${renderLanDirectoryToolbarHtml(list, teamList)}
    </div>
    ${teamsHint}
    <div class="clinical-lan-rank-groups">${rankSections}${otherSection}</div>`;
}

function syncLanAssignCycleSelect(teamSelect, preferredCycle = '') {
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const row = teamSelect.closest('.clinical-lan-user-row');
  const cycleSelect = row?.querySelector('.clinical-lan-assign-cycle');
  if (!(cycleSelect instanceof HTMLSelectElement)) return;

  const teamId = String(teamSelect.value || '').trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">— Ciclo —</option>';
    cycleSelect.disabled = true;
    return;
  }

  const team = _lanUsersModalTeams.find((t) => String(t.team_id) === teamId);
  const userId = String(row?.dataset.userId || '').trim();
  const userRank = String(row?.dataset.userRank || 'R1');
  const letters = team ? cycleLettersForAssign(team, userRank) : [];
  const rowPreferred = String(preferredCycle || row?.dataset.preferredCycle || '').trim();
  let defaultCycle = team ? resolveMembershipCycleForUser(team, userId, userRank) : letters[0] || 'A';
  if (rowPreferred && letters.includes(rowPreferred)) {
    defaultCycle = rowPreferred;
  }

  cycleSelect.innerHTML = letters
    .map((letter) => {
      const label = formatLanCycleOptionLabel(letter, userRank);
      return `<option value="${escapeAttr(letter)}" ${letter === defaultCycle ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  cycleSelect.disabled = letters.length === 0;
  cycleSelect.value = defaultCycle;
}

/** @param {Element} row */
function initLanUserRowAssignState(row) {
  const teamSelect = row.querySelector('.clinical-lan-assign-team');
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const preferred = String(row.dataset.preferredCycle || '').trim();
  syncLanAssignCycleSelect(teamSelect, preferred);
}

async function handleLanAssignUserToTeam(userId, teamId, subAreaFraction) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('No se pudo asignar.', 'error');
    return false;
  }
  const res = await api.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction,
  });
  if (!res || res.ok === false) {
    toast(res?.error || 'No se asignó al equipo.', 'error');
    return false;
  }
  if (Array.isArray(res.warnings) && res.warnings[0]) {
    toast(String(res.warnings[0]), 'warn');
  }
  return true;
}

async function handleLanDeleteDirectoryUserClick(btn) {
  const userId = String(btn.dataset.userId || '').trim();
  if (!userId) return;
  const label = String(btn.dataset.userLabel || '').trim() || userId;
  const api = dbApi();
  if (!api || typeof api.dbClinicalUserDelete !== 'function') {
    toast('Eliminar usuarios requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }
  const confirmed = window.confirm(
    `¿Eliminar a «${label}» de la base clínica en esta Mac?\n\nDesaparecerá del directorio LAN. Las demás R+ en la misma sala ⇄ lo quitarán al sincronizar.`
  );
  if (!confirmed) return;

  btn.disabled = true;
  const res = await api.dbClinicalUserDelete({
    targetUserId: userId,
    callerUserId: currentUserId(),
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast(res?.error || 'No se pudo eliminar el usuario.', 'error');
    return;
  }

  toast('Usuario eliminado de esta Mac.', 'success');
  const { isBenignLanPushSkipCode } = await import('../../clinical-profile-lan-sync.mjs');
  const lanPush = await publishClinicalTeamsToLan();
  if (!lanPush.ok && !isBenignLanPushSkipCode(lanPush.code)) {
    toast(
      'Usuario eliminado aquí, pero no se pudo publicar el cambio a la sala ⇄. Revisa la conexión.',
      'warning'
    );
  }
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await reloadLanUsersDirectoryAfterMutation();
}

async function handleLanAssignButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const row = btn.closest('.clinical-lan-user-row');
  if (!row) return;

  const userId = String(btn.dataset.userId || row.dataset.userId || '').trim();
  const teamSelect = row.querySelector('.clinical-lan-assign-team');
  const cycleSelect = row.querySelector('.clinical-lan-assign-cycle');
  const teamId =
    teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || '').trim() : '';
  let subAreaFraction =
    cycleSelect instanceof HTMLSelectElement ? String(cycleSelect.value || '').trim() : '';

  if (!userId || !teamId) {
    toast('Elige un equipo.', 'error');
    return;
  }

  const team = _lanUsersModalTeams.find((t) => String(t.team_id) === teamId);
  const userRank = String(row.dataset.userRank || 'R1');
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, userRank);
  }
  if (!subAreaFraction) {
    toast('Elige el ciclo del integrante.', 'error');
    return;
  }

  const wasMember = Boolean(
    team?.members?.some((m) => String(m.user_id || '') === userId)
  );

  btn.disabled = true;
  const ok = await handleLanAssignUserToTeam(userId, teamId, subAreaFraction);
  btn.disabled = false;
  if (!ok) return;

  toast(wasMember ? 'Ciclo actualizado.' : 'Integrante asignado al equipo.', 'success');
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  await publishClinicalTeamsToLan();
  await fetchClinicalTeamsFromDb();
  await reloadLanUsersDirectoryAfterMutation();
}

/** @param {object[]} users @param {object[]} teams */
function buildLanDirectoryFingerprint(users, teams) {
  const userPart = (users || [])
    .map(
      (u) =>
        `${String(u.user_id || '')}\t${String(u.username || '')}\t${String(u.rank || '')}\t${String(u.clinical_name || '')}\t${String(u.sala || '')}\t${String(u.last_activity_at || '')}`
    )
    .sort()
    .join('\n');
  const teamPart = (teams || [])
    .map((t) => {
      const members = (t.members || [])
        .map((m) => `${String(m.user_id || '')}:${String(m.sub_area_fraction || '')}`)
        .sort()
        .join(',');
      return `${String(t.team_id || '')}\t${members}`;
    })
    .sort()
    .join('\n');
  return `${userPart}::${teamPart}`;
}

/** @param {{ forceIpc?: boolean, force?: boolean }} [options] */
async function reloadLanUsersDirectoryPreservingUi(options = {}) {
  const host = lanUsersModalBodyEl();
  if (!host || !isLanDirectoryModalOpen()) return;
  if (!options.force && isLanDirectoryUserInteracting()) return;
  lastLanDirectoryFingerprint = '';
  captureLanDirectoryCollapseState(host);
  const draft = captureLanDirectoryDraftState(host);
  await loadLanUsersDirectoryIntoHost(host, {
    forceRender: true,
    forceIpc: options.forceIpc !== false,
  });
  restoreLanDirectoryDraftState(host, draft);
}

async function reloadLanUsersDirectoryAfterMutation() {
  await reloadLanUsersDirectoryPreservingUi({ force: true, forceIpc: true });
}

/** @param {HTMLElement} host @param {{ forceRender?: boolean, forceIpc?: boolean }} [options] */
export async function loadLanUsersDirectoryIntoHost(host, options = {}) {
  const now = Date.now();
  if (
    !options.forceIpc &&
    lanDirectoryFreezeAutoRefresh &&
    now - lanDirectoryIpcLastAt < LAN_DIRECTORY_IPC_MIN_MS &&
    host.querySelector('.clinical-lan-rank-groups')
  ) {
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalUsersList !== 'function') {
    host.innerHTML =
      '<p class="clinical-teams-empty">Directorio solo en la app de escritorio R+ (base clínica desbloqueada). En iPad/móvil usa el censo LAN; Mi rotación con directorio requiere Mac.</p>';
    return;
  }

  const callerUserId = currentUserId();
  lanDirectoryIpcLastAt = now;
  const [usersRes, teamsRes] = await Promise.all([
    api.dbClinicalUsersList({ callerUserId }),
    typeof api.dbClinicalTeamsList === 'function' ? api.dbClinicalTeamsList() : Promise.resolve(null),
  ]);

  if (!usersRes?.ok) {
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(usersRes?.error || 'No se pudo cargar el directorio.')}</p>`;
    return;
  }

  _lanUsersModalTeams =
    teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];

  const users = Array.isArray(usersRes.users) ? usersRes.users : [];
  const fingerprint = buildLanDirectoryFingerprint(users, _lanUsersModalTeams);
  if (
    !options.forceRender &&
    fingerprint === lastLanDirectoryFingerprint &&
    host.querySelector('.clinical-lan-rank-groups')
  ) {
    const title = document.getElementById('clinical-lan-users-title');
    if (title) title.textContent = `Directorio de usuarios LAN (${users.length})`;
    applyLanDirectoryFilters(host);
    return;
  }
  lastLanDirectoryFingerprint = fingerprint;

  const sessionUser = clinicalSessionContext.user || {};
  host.innerHTML = renderLanUsersModalBodyHtml(users, _lanUsersModalTeams, {
    canDelete: canDeleteLanDirectoryUser(sessionUser),
    callerUserId: currentUserId(),
  });
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => initLanUserRowAssignState(row));
  bindLanDirectoryFilterControls(host);
  applyLanDirectoryFilters(host);

  const title = document.getElementById('clinical-lan-users-title');
  const pending = users.filter((u) => u && u.lanDirectoryPending).length;
  recordClinicalOpsTrace('display', {
    directoryCount: users.length,
    lanDirectoryPending: pending,
  });
  if (title) {
    title.textContent = `Directorio de usuarios LAN (${users.length})`;
  }
}

function isLanDirectoryUserInteracting() {
  const bd = lanUsersModalBackdropEl();
  if (!bd?.classList.contains('open')) return false;
  const active = document.activeElement;
  if (active instanceof HTMLElement && bd.contains(active)) {
    if (
      active.closest(
        '.clinical-lan-assign-team, .clinical-lan-assign-cycle, .clinical-lan-assign-btn, .clinical-lan-delete-user-btn, .clinical-lan-rank-group-summary, .clinical-lan-directory-refresh-btn, .clinical-lan-directory-search, #clinical-lan-directory-status-filter, #clinical-lan-directory-sala-filter, #clinical-lan-directory-activity-filter'
      )
    ) {
      return true;
    }
  }
  if (active instanceof HTMLSelectElement && bd.contains(active)) return true;
  if (
    active instanceof HTMLOptionElement &&
    active.parentElement instanceof HTMLSelectElement &&
    bd.contains(active.parentElement)
  ) {
    return true;
  }
  return false;
}

/** @param {HTMLElement} host */
function captureLanDirectoryDraftState(host) {
  /** @type {Map<string, { team: string, cycle: string }>} */
  const draft = new Map();
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => {
    const uid = String(row.dataset.userId || '').trim();
    if (!uid) return;
    const teamEl = row.querySelector('.clinical-lan-assign-team');
    const cycleEl = row.querySelector('.clinical-lan-assign-cycle');
    draft.set(uid, {
      team: teamEl instanceof HTMLSelectElement ? String(teamEl.value || '') : '',
      cycle: cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || '') : '',
    });
  });
  return draft;
}

/** @param {HTMLElement} host @param {Map<string, { team: string, cycle: string }>} draft */
function restoreLanDirectoryDraftState(host, draft) {
  if (!draft || !draft.size) return;
  host.querySelectorAll('.clinical-lan-user-row').forEach((row) => {
    const uid = String(row.dataset.userId || '').trim();
    const saved = draft.get(uid);
    if (!saved) return;
    const teamSelect = row.querySelector('.clinical-lan-assign-team');
    if (teamSelect instanceof HTMLSelectElement && saved.team) {
      teamSelect.value = saved.team;
      syncLanAssignCycleSelect(teamSelect, saved.cycle);
      if (saved.cycle) {
        const cycleSelect = row.querySelector('.clinical-lan-assign-cycle');
        if (cycleSelect instanceof HTMLSelectElement) {
          cycleSelect.value = saved.cycle;
        }
      }
    }
  });
}

/** Manual or post-mutation reload; optional LAN pull from host. */
export async function refreshLanDirectoryFromHostUi(options = {}) {
  const host = lanUsersModalBodyEl();
  if (!host || !isLanDirectoryModalOpen()) return;
  const btn = host.querySelector('.clinical-lan-directory-refresh-btn');
  if (btn instanceof HTMLButtonElement) btn.disabled = true;
  try {
    if (options.pullFromHost !== false) {
      await pullLanDirectoryFromHostIfDue({ force: !!options.forcePull });
    }
    await reloadLanUsersDirectoryPreservingUi({ force: true, forceIpc: true });
  } finally {
    if (btn instanceof HTMLButtonElement) btn.disabled = false;
  }
}

async function pullLanDirectoryFromHostIfDue(options = {}) {
  const force = !!options.force;
  const now = Date.now();
  if (!force && now - lanDirectoryLanPullLastAt < LAN_DIRECTORY_LAN_PULL_MIN_MS) {
    return false;
  }
  lanDirectoryLanPullLastAt = now;
  try {
    const lanMod = await import('../lan-sync.mjs');
    if (typeof lanMod.refreshLanClinicalDirectoryFromRoom !== 'function') return false;
    return !!(await lanMod.refreshLanClinicalDirectoryFromRoom({
      timeoutMs: 12_000,
      allRooms: true,
    }));
  } catch (_e) {
    return false;
  }
}

export async function openLanUsersDirectoryModal() {
  const user = clinicalSessionContext.user || {};
  if (!canViewLanUserDirectory(user)) {
    toast(
      'Solo R4, Admin o quien tenga privilegios de administración puede abrir el directorio LAN.',
      'warn'
    );
    return;
  }

  const bd = lanUsersModalBackdropEl();
  const host = lanUsersModalBodyEl();
  if (!bd || !host) {
    console.error('[Directorio LAN] Falta #clinical-lan-users-backdrop o #clinical-lan-users-panel-body');
    toast(
      'No se pudo abrir el directorio (falta el diálogo en la UI). Ejecuta npm run build:ui y reinicia R+.',
      'error'
    );
    return;
  }

  host.innerHTML = '<p class="clinical-teams-empty">Cargando directorio…</p>';
  document.body.classList.add('clinical-lan-directory-open');
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');

  lastLanDirectoryFingerprint = '';
  lanDirectoryFreezeAutoRefresh = true;
  ensureLanDirectoryFilterDelegation();
  touchClinicalSessionActivity({ force: true });

  try {
    await pullLanDirectoryFromHostIfDue({ force: true });
    await loadLanUsersDirectoryIntoHost(host, { forceRender: true, forceIpc: true });
    const pendingSnap = await flushPendingClinicalOpsLanSnapshot();
    if (pendingSnap?.changed) {
      await loadLanUsersDirectoryIntoHost(host, { forceRender: true, forceIpc: true });
    }
  } catch (err) {
    console.error('[Directorio LAN]', err);
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(
      err instanceof Error ? err.message : 'No se pudo cargar el directorio.'
    )}</p>`;
  }

}

export function closeLanUsersDirectoryModal() {
  lanDirectoryFreezeAutoRefresh = false;
  lastLanDirectoryFingerprint = '';
  const bd = lanUsersModalBackdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('clinical-lan-directory-open');
}

function wireLanDirectoryActivityRefresh() {
  if (typeof document === 'undefined' || document._rpcLanDirActivityRefreshWired) return;
  document._rpcLanDirActivityRefreshWired = true;
  document.addEventListener('rpc-clinical-user-activity-touched', () => {
    if (!isLanDirectoryModalOpen()) return;
    const host = lanUsersModalBodyEl();
    if (!host?.querySelector('.clinical-lan-rank-groups')) return;
    void reloadLanUsersDirectoryPreservingUi();
  });
}

export function wireLanUsersDirectoryControls() {
  wireLanDirectoryActivityRefresh();
  const panelHost = getClinicalTeamsPanelHost();
  if (panelHost && !panelHost._rpcLanDirOpenDelegated) {
    panelHost._rpcLanDirOpenDelegated = true;
    panelHost.addEventListener('click', (ev) => {
      const openBtn =
        ev.target instanceof Element
          ? ev.target.closest('#btn-open-lan-users-directory, .clinical-teams-open-lan-users-btn')
          : null;
      if (!openBtn) return;
      ev.preventDefault();
      void openLanUsersDirectoryModal();
    });
  }

  const openBtn = document.getElementById('btn-open-lan-users-directory');
  if (openBtn && !openBtn._rpcLanDirOpenWired) {
    openBtn._rpcLanDirOpenWired = true;
    openBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void openLanUsersDirectoryModal();
    });
  }

  const bd = lanUsersModalBackdropEl();
  if (bd && !bd._rpcLanUsersBackdropWired) {
    bd._rpcLanUsersBackdropWired = true;
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeLanUsersDirectoryModal();
    });
  }

  const closeBtn = document.getElementById('btn-clinical-lan-users-close');
  if (closeBtn && !closeBtn._rpcLanUsersCloseWired) {
    closeBtn._rpcLanUsersCloseWired = true;
    closeBtn.addEventListener('click', () => closeLanUsersDirectoryModal());
  }

  ensureLanDirectoryFilterDelegation();
  const host = lanUsersModalBodyEl();
  if (host) bindLanDirectoryFilterControls(host);
  if (host && !host._rpcLanUsersAssignWired) {
    host._rpcLanUsersAssignWired = true;
    host.addEventListener(
      'toggle',
      (ev) => {
        const details = ev.target;
        if (!(details instanceof HTMLDetailsElement)) return;
        if (!details.classList.contains('clinical-lan-rank-group')) return;
        const key = String(details.dataset.lanRankGroup || '').trim();
        if (!key) return;
        const count = Number(details.dataset.lanRankCount) || 0;
        if (details.open) {
          lanDirectoryCollapsedRanks.delete(key);
          if (count > LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD) {
            lanDirectoryExpandedRanks.add(key);
          }
        } else {
          lanDirectoryCollapsedRanks.add(key);
          lanDirectoryExpandedRanks.delete(key);
        }
      },
      true
    );
    host.addEventListener('change', (ev) => {
      const teamSelect = ev.target instanceof Element ? ev.target.closest('.clinical-lan-assign-team') : null;
      if (teamSelect) syncLanAssignCycleSelect(teamSelect);
    });
    host.addEventListener('click', (ev) => {
      const refreshBtn =
        ev.target instanceof Element ? ev.target.closest('.clinical-lan-directory-refresh-btn') : null;
      if (refreshBtn) {
        void refreshLanDirectoryFromHostUi({ forcePull: true });
        return;
      }
      const delBtn =
        ev.target instanceof Element ? ev.target.closest('.clinical-lan-delete-user-btn') : null;
      if (delBtn) {
        void handleLanDeleteDirectoryUserClick(delBtn);
        return;
      }
      const btn = ev.target instanceof Element ? ev.target.closest('.clinical-lan-assign-btn') : null;
      if (btn) void handleLanAssignButtonClick(btn);
    });
  }
}