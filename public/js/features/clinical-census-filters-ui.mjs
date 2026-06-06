export const CLINICAL_CENSUS_FILTERS_COLLAPSED_LS = 'rpc.clinicalCensusFiltersCollapsed';
export const CLINICAL_CENSUS_FILTER_TEAM_LS = 'rpc.clinicalCensusFilterTeam';
export const CENSUS_TEAM_FILTER_ALL = '__all__';
export const CENSUS_TEAM_FILTER_UNASSIGNED = '__unassigned__';

/** @param {object[]} teams @param {object|null|undefined} user */
function joinedTeamsForUser(teams, user) {
  const uid = String(user?.user_id || '');
  if (!uid) return [];
  return (teams || []).filter((team) =>
    (team.members || []).some((m) => String(m.user_id) === uid)
  );
}

/**
 * Prefer the user's joined team in their sala; otherwise first membership.
 * @param {object|null|undefined} user
 * @param {object[]} teams
 */
export function resolveActiveTeamFilterId(user, teams) {
  const joined = joinedTeamsForUser(teams, user);
  if (!joined.length) return '';
  if (joined.length === 1) return String(joined[0].team_id || '');
  const sala = String(user?.sala || '').trim();
  const inSala = joined.find((t) => String(t.sala || '') === sala);
  return String((inSala || joined[0]).team_id || '');
}

/** @param {Storage|undefined} storage */
export function readElevatedTeamFilterPreference(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(CLINICAL_CENSUS_FILTER_TEAM_LS);
    if (raw === CENSUS_TEAM_FILTER_ALL) return { pinned: true, teamId: '' };
    if (raw) return { pinned: true, teamId: String(raw) };
  } catch (_e) {}
  return { pinned: false, teamId: '' };
}

/** @param {string} teamId @param {Storage|undefined} storage */
export function writeElevatedTeamFilterPreference(teamId, storage = globalThis.localStorage) {
  try {
    storage?.setItem(
      CLINICAL_CENSUS_FILTER_TEAM_LS,
      teamId ? String(teamId) : CENSUS_TEAM_FILTER_ALL
    );
  } catch (_e) {}
}

/**
 * Census Equipo filter: default to active membership unless user chose Todos/another team.
 * @param {object|null|undefined} user
 * @param {object[]} teams
 * @param {Storage|undefined} storage
 */
export function resolveElevatedTeamFilterId(user, teams, storage = globalThis.localStorage) {
  const pref = readElevatedTeamFilterPreference(storage);
  if (pref.pinned) return pref.teamId;
  // R4 / Admin / program admin: full censo by default; narrow via Equipo dropdown.
  return '';
}

/** @param {string} teamId @param {object[]} teams */
export function isTeamIdInCensusCatalog(teamId, teams) {
  if (!teamId || teamId === CENSUS_TEAM_FILTER_UNASSIGNED) return true;
  return (teams || []).some((t) => String(t.team_id || '') === String(teamId));
}

/** @param {Storage|undefined} storage */
export function readCensusFiltersCollapsed(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS) === '1';
  } catch (_e) {
    return false;
  }
}

/** @param {boolean} collapsed @param {Storage|undefined} storage */
export function writeCensusFiltersCollapsed(collapsed, storage = globalThis.localStorage) {
  try {
    if (collapsed) storage?.setItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS, '1');
    else storage?.removeItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS);
  } catch (_e) {}
}
