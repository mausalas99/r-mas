/**
 * Joined-team lookups used by non-visibility features (delete authorization,
 * "heredar pacientes", LAN sync scoping). There is no team-based patient
 * visibility gate anymore — every Team-rank user (and Admin) reads every
 * patient, on every device (see lib/clinical-scope/evaluate).
 */
import { getJoinedTeams, getJoinedTeamsForUser, resolvePatientTeamIdFromAssignments } from './clinico-access.mjs';

/** @param {object[]} teams @param {string|object|null|undefined} userOrUserId */
export function joinedTeamIdsForUser(teams, userOrUserId) {
  const ids = new Set();
  const joined =
    typeof userOrUserId === 'string'
      ? getJoinedTeams(teams || [], userOrUserId)
      : getJoinedTeamsForUser(teams || [], userOrUserId || '');
  for (const team of joined) {
    const tid = String(team?.team_id || '').trim();
    if (tid) ids.add(tid);
  }
  return ids;
}

/**
 * @param {string} patientId
 * @param {object|null|undefined} scopeContext
 * @param {string|object} userOrUserId session user object preferred (username match on iPad)
 */
export function isPatientAssignedToJoinedTeam(patientId, scopeContext, userOrUserId) {
  const joinedIds = joinedTeamIdsForUser(scopeContext?.teams, userOrUserId);
  if (!joinedIds.size) return false;
  const now = scopeContext?.now || new Date().toISOString();
  const teamId = resolvePatientTeamIdFromAssignments(
    patientId,
    scopeContext?.assignments || [],
    now
  );
  return !!(teamId && joinedIds.has(teamId));
}

