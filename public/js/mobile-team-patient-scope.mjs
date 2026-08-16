/**
 * iPad/PWA and Desktop Nube share one team-scope rule: assignment/guardia match,
 * plus unassigned locals that structurally match a joined team — so a patient
 * admitted moments ago (patient_team_assignment row not synced yet) is not hidden
 * on either device (e.g. selectPatient during Actualizar labs, or a brand-new
 * admission that hasn't round-tripped its assignment op yet).
 */
import {
  getJoinedTeams,
  getJoinedTeamsForUser,
  resolvePatientTeamIdFromAssignments,
  isActiveGuardiaCoveringUser,
  patientCoveredByGuardia,
  patientHasExplicitTeamAssignment,
  patientMatchesAnyJoinedTeam,
} from './clinico-access.mjs';

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

/**
 * @param {object|null|undefined} user
 * @param {{ id?: string }} patient
 * @param {object|null|undefined} scopeContext
 * @param {object|null|undefined} activeGuardia
 */
export function isPatientVisibleOnMobileTeamMirror(user, patient, scopeContext, activeGuardia) {
  if (!user?.user_id || !patient?.id) return false;
  const pid = String(patient.id);
  const userId = String(user.user_id);
  // Pass full user so joined-team match can use username when user_id is still the Nube handle.
  if (isPatientAssignedToJoinedTeam(pid, scopeContext, user)) return true;
  if (activeGuardia && isActiveGuardiaCoveringUser(userId, activeGuardia)) return true;
  const guardias = Array.isArray(scopeContext?.guardias) ? scopeContext.guardias : [];
  if (patientCoveredByGuardia(pid, userId, guardias)) return true;
  return isUnassignedStructuralMatchOnJoinedTeam(user, patient, scopeContext);
}

/**
 * @param {object[]} patients
 * @param {object|null|undefined} user
 * @param {object|null|undefined} scopeContext
 * @param {Map<string, object>|null|undefined} guardiasMap
 */
export function filterPatientsForMobileTeamMirror(patients, user, scopeContext, guardiasMap) {
  if (!user?.user_id) return [];
  return (patients || []).filter((p) => {
    if (!p?.id) return false;
    const activeGuardia =
      guardiasMap && typeof guardiasMap.get === 'function'
        ? guardiasMap.get(String(p.id)) || null
        : null;
    return isPatientVisibleOnMobileTeamMirror(user, p, scopeContext, activeGuardia);
  });
}

/** @param {{ id?: string, servicio?: string, service?: string, area?: string, sub_area?: string, sala?: string }} patient */
function patientRowForTeamMatch(patient) {
  return {
    id: String(patient?.id || ''),
    service: String(patient?.servicio || patient?.service || ''),
    sub_area: String(patient?.area || patient?.sub_area || ''),
    sala: patient?.sala,
  };
}

/**
 * Unassigned local chart that structurally matches a joined team (desktop Nube only).
 * @param {object} user
 * @param {{ id?: string }} patient
 * @param {object|null|undefined} scopeContext
 */
function isUnassignedStructuralMatchOnJoinedTeam(user, patient, scopeContext) {
  const pid = String(patient?.id || '');
  if (!pid || patientHasExplicitTeamAssignment(pid, scopeContext?.assignments || [])) return false;
  const joined = getJoinedTeamsForUser(scopeContext?.teams || [], user);
  if (!joined.length) return false;
  return patientMatchesAnyJoinedTeam(patientRowForTeamMatch(patient), joined, String(user.user_id));
}

/**
 * Desktop Nube team scope — now identical to the iPad/PWA mirror; kept as a named
 * alias since both call sites (patients-clinical-filter.mjs) predate the unification.
 * @param {object|null|undefined} user
 * @param {{ id?: string, servicio?: string, service?: string, area?: string, sub_area?: string, sala?: string }} patient
 * @param {object|null|undefined} scopeContext
 * @param {object|null|undefined} activeGuardia
 */
export function isPatientVisibleOnDesktopCloudTeamScope(user, patient, scopeContext, activeGuardia) {
  return isPatientVisibleOnMobileTeamMirror(user, patient, scopeContext, activeGuardia);
}

/**
 * @param {object[]} patients
 * @param {object|null|undefined} user
 * @param {object|null|undefined} scopeContext
 * @param {Map<string, object>|null|undefined} guardiasMap
 */
export function filterPatientsForDesktopCloudTeamScope(patients, user, scopeContext, guardiasMap) {
  if (!user?.user_id) return [];
  return (patients || []).filter((p) => {
    if (!p?.id) return false;
    const activeGuardia =
      guardiasMap && typeof guardiasMap.get === 'function'
        ? guardiasMap.get(String(p.id)) || null
        : null;
    return isPatientVisibleOnDesktopCloudTeamScope(user, p, scopeContext, activeGuardia);
  });
}
