/** LAN directorio data for the view (props); markup lives in teams-roster-directory-view.jsx. */
import { getCycleLetterOptionsForRank } from '../../clinico-access.mjs';
import { getClinicalOpsTrace } from '../../clinical-ops-sync.mjs';
import { isValidUsernameFormat, normalizeUsername } from '../../clinical-username.mjs';
import {
  clinicalUserActivityTier,
  clinicalUserActivityLabel,
  formatClinicalUserLastActivity,
} from '../../../../lib/clinical-user-activity.mjs';
import {
  shouldRankGroupOpen,
  directoryToolbarProps,
} from './teams-roster-directory-filters.mjs';
import { DIRECTORY_USER_RANK_ORDER } from './teams-roster-directory-state.mjs';

export function cycleLettersForAssign(team, userRank) {
  const service = String(team?.service || 'Sala');
  const rank = String(userRank || 'R1');
  return getCycleLetterOptionsForRank(service, rank);
}

/** @param {object[]} teams @param {string} selectedTeamId @returns {{ value: string, label: string, selected?: boolean }[]} */
export function assignTeamOptions(teams, selectedTeamId) {
  const list = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || '').trim();
  if (!list.length) return [{ value: '', label: '— Sin equipos —' }];
  return [
    { value: '', label: '— Equipo —' },
    ...list.map((team) => {
      const id = String(team.team_id || '');
      const staged = Number(team.rotation_active) === 0;
      const label =
        `${String(team.name || 'Equipo').trim()} · ${String(team.sala || '').trim() || 'Sala'}` +
        (staged ? ' · Próxima rotación, aún no activo' : '');
      const members = Array.isArray(team.members) ? team.members.length : 0;
      return { value: id, label: `${label} (${members})`, selected: !!selected && id === selected };
    }),
  ];
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

/** @param {object} u @param {object|null} placement @param {string} userRank @param {number} now */
function userRowActivityProps(u, placement, userRank, now) {
  const activityIso = String(u.last_activity_at || '').trim();
  const activityTier = clinicalUserActivityTier(activityIso, now);
  const activityDetail = formatClinicalUserLastActivity(activityIso, now);
  return {
    activityTier,
    activityLabel: clinicalUserActivityLabel(activityTier),
    activityDetail,
    search: `${lanUserSearchHaystack(u, placement)} ${activityDetail}`.toLowerCase(),
  };
}

/** @param {object|null} placement @param {string} userRank */
function userRowPlacementProps(placement, userRank) {
  const cycle = placement?.cycle ? formatCycleOptionLabel(placement.cycle, userRank) : '';
  return {
    preferredCycle: placement?.cycle || '',
    hasTeam: Boolean(placement?.teamId),
    placementLabel: formatLanUserPlacementLabel(placement, userRank),
    placementShort: placement?.teamId ? [placement.teamName, cycle].filter(Boolean).join(' · ') : '',
    cycleLabel: cycle,
  };
}

const validHandle = (u, handle) => (isValidUsernameFormat(handle) && !u.lanDirectoryPending ? handle : '');
const canDeleteRow = (opts, id) => !!opts.canDelete && !!id && id !== String(opts.callerUserId || '').trim();

/** @param {object} u @param {object[]} teamList @param {{ canDelete?: boolean, callerUserId?: string }} opts @param {number} now */
export function directoryUserRowProps(u, teamList, opts = {}, now = Date.now()) {
  const rawUserId = String(u.user_id || '').trim();
  const userRank = String(u.rank || 'R1');
  const placement = resolveUserPlacement(u.user_id, teamList);
  const rawHandle = normalizeUsername(u.username || '');
  return {
    userId: String(u.user_id || ''),
    rank: userRank,
    name: String(u.clinical_name || '').trim() || 'Sin nombre',
    handle: validHandle(u, rawHandle),
    sala: String(u.sala || '').trim(),
    ...userRowActivityProps(u, placement, userRank, now),
    ...userRowPlacementProps(placement, userRank),
    teamOptions: assignTeamOptions(teamList, placement?.teamId),
    canDelete: canDeleteRow(opts, rawUserId),
    deleteLabel: String(u.clinical_name || rawHandle || rawUserId),
  };
}

/** @param {object[]} users @param {{ trace?: object[] }} [ctx] */
function directoryEmptyProps(users, ctx = {}) {
  const trace = ctx.trace || getClinicalOpsTrace();
  const lastGet = trace.find((e) => e.boundary === 'get' && e.data && e.data.ok === true);
  const lastMerge = trace.find((e) => e.boundary === 'merge');
  const hostUsers = Number(lastGet?.data?.incomingUsers || 0);
  const mergeDeferred = lastMerge?.data?.deferred === true || lastMerge?.data?.code === 'DB_LOCKED';
  return { empty: true, hostUsers: hostUsers > 0 && (!users || !users.length) ? hostUsers : 0, mergeDeferred };
}

/**
 * @param {object[]} users @param {object[]} teams
 * @param {{ canDelete?: boolean, callerUserId?: string }} [opts]
 * @param {{ now?: number, trace?: object[] }} [ctx] clock and ops trace, passed in for tests
 */
export function directoryUsersModalBodyProps(users, teams, opts = {}, ctx = {}) {
  const list = Array.isArray(users) ? users : [];
  const teamList = Array.isArray(teams) ? teams : [];
  if (!list.length) return directoryEmptyProps(list, ctx);
  const now = ctx.now ?? Date.now();
  const rowOpts = { canDelete: !!opts.canDelete, callerUserId: String(opts.callerUserId || '') };
  const { groups, other } = groupUsersByRank(list);
  const group = (rank, us) => ({
    rank,
    open: shouldRankGroupOpen(rank, us.length),
    rows: us.map((u) => directoryUserRowProps(u, teamList, rowOpts, now)),
  });
  return {
    empty: false,
    toolbar: directoryToolbarProps(list, teamList),
    teamsHint: !teamList.length,
    groups: [
      ...DIRECTORY_USER_RANK_ORDER.filter((r) => (groups.get(r) || []).length).map((r) => group(r, groups.get(r))),
      ...(other.length ? [group('Otros', other)] : []),
    ],
  };
}
