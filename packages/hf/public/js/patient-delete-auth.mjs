/**
 * Who may wipe a census chart: Admin anywhere; others only patients on their
 * team. Team scoping only applies in Nube/LAN mode — "solo este equipo" has no
 * clinical login or team concept, so every local patient is deletable there.
 */
import { hasElevatedTeamPrivileges } from './clinical-privileges.mjs';
import { isPatientAssignedToJoinedTeam } from './mobile-team-patient-scope.mjs';
import { isClinicalLocalOnlyMode } from './clinical-settings.mjs';

/**
 * @param {object|null|undefined} user
 * @param {string} patientId
 * @param {object|null|undefined} scopeContext
 */
export function canDeletePatientChart(user, patientId, scopeContext) {
  const pid = String(patientId || '').trim();
  if (!pid) return false;
  if (isClinicalLocalOnlyMode()) return true;
  if (!user?.user_id) return false;
  if (hasElevatedTeamPrivileges(user)) return true;
  return isPatientAssignedToJoinedTeam(pid, scopeContext, user);
}
