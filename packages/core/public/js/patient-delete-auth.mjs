/**
 * Who may wipe a census chart: Admin/R4 anywhere; others only patients on their team.
 */
import { hasElevatedTeamPrivileges } from './clinical-privileges.mjs';
import { isPatientAssignedToJoinedTeam } from './mobile-team-patient-scope.mjs';

/**
 * @param {object|null|undefined} user
 * @param {string} patientId
 * @param {object|null|undefined} scopeContext
 */
export function canDeletePatientChart(user, patientId, scopeContext) {
  if (!user?.user_id) return false;
  const pid = String(patientId || '').trim();
  if (!pid) return false;
  if (hasElevatedTeamPrivileges(user)) return true;
  return isPatientAssignedToJoinedTeam(pid, scopeContext, user);
}
