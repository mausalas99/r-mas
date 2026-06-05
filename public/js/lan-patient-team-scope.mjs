import { hasElevatedTeamPrivileges } from './clinical-privileges.mjs';
import {
  getJoinedTeams,
  isActiveGuardiaCoveringUser,
  patientAssignedToTeam,
  patientCoveredByGuardia,
  patientInJoinedTeamScope,
  patientInUserSala,
  userHasJoinedClinicalTeams,
} from './clinico-access.mjs';
import { patientForScopeEvaluate } from './features/patients-clinical-filter.mjs';

/**
 * Whether a patient chart should sync over LAN for the current clinical user.
 * @param {object|null|undefined} user
 * @param {object|null|undefined} patient
 * @param {object|null|undefined} activeGuardia
 * @param {object|null|undefined} context
 */
export function isPatientInLanTeamSyncScope(user, patient, activeGuardia = null, context = null) {
  if (!user?.user_id || !patient?.id) return true;
  if (hasElevatedTeamPrivileges(user)) return true;
  if (isActiveGuardiaCoveringUser(String(user.user_id), activeGuardia)) return true;

  const ctx = context && typeof context === 'object' ? context : {};
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const guardias = Array.isArray(ctx.guardias) ? ctx.guardias : [];
  const now = ctx.now != null ? ctx.now : new Date();
  const userId = String(user.user_id);
  const patientId = String(patient.id);
  const rank = String(user.rank || '');
  const joinedTeams = getJoinedTeams(teams, userId);
  const joinedTeamIds = new Set(joinedTeams.map((t) => String(t.team_id)));
  const strictTeamFilter = userHasJoinedClinicalTeams(teams, userId);

  if (patientCoveredByGuardia(patientId, userId, guardias)) return true;

  if (rank === 'R1') {
    return patientInUserSala(patient, String(user.sala || ''));
  }

  if (strictTeamFilter && (rank === 'R2' || rank === 'R3')) {
    return patientAssignedToTeam(patientId, assignments, joinedTeamIds, now);
  }

  return patientInJoinedTeamScope(
    patient,
    joinedTeams,
    assignments,
    joinedTeamIds,
    userId,
    now,
    { strictTeamFilter }
  );
}

/**
 * @param {object[]} entries
 * @param {object|null|undefined} user
 * @param {object|null|undefined} context
 * @param {Map<string, object>|null|undefined} guardiasMap
 */
export function filterPatientEntriesForLanTeamScope(entries, user, context, guardiasMap) {
  if (!user?.user_id) return entries || [];
  return (entries || []).filter((entry) => {
    const patient = entry?.patient;
    if (!patient?.id) return false;
    const mapped = patientForScopeEvaluate(patient);
    const activeGuardia =
      guardiasMap && typeof guardiasMap.get === 'function'
        ? guardiasMap.get(String(patient.id)) || null
        : null;
    return isPatientInLanTeamSyncScope(user, mapped, activeGuardia, context);
  });
}
