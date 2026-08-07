import { assignPatientToTeamClinical } from '../../patient-team-assign-ui.mjs';

/**
 * @param {string[]} patientIds
 * @param {string} teamId
 * @returns {Promise<{ claimed: number, errors: string[] }>}
 */
export async function claimPatientsToTeam(patientIds, teamId, deps = {}) {
  const tid = String(teamId || '').trim();
  const assign = typeof deps.assign === 'function' ? deps.assign : assignPatientToTeamClinical;
  const errors = [];
  let claimed = 0;
  if (!tid) return { claimed: 0, errors: ['Sin equipo'] };

  for (const rawId of patientIds || []) {
    const pid = String(rawId || '').trim();
    if (!pid) continue;
    try {
      const res = await assign(pid, tid);
      // assignPatientToTeamClinical returns { ok }; legacy callers may return boolean.
      if (res && res.ok === false) errors.push(pid);
      else if (res === false) errors.push(pid);
      else claimed += 1;
    } catch (err) {
      errors.push(pid + ': ' + (err?.message || 'error'));
    }
  }
  return { claimed, errors };
}

/**
 * Filter snapshot patients for a username and/or team.
 * @param {object} snapshot
 * @param {{ username?: string, teamId?: string }} filter
 */
export function filterSnapshotPatients(snapshot, filter = {}) {
  const patients = Array.isArray(snapshot?.patients) ? snapshot.patients : [];
  const username = String(filter.username || '').trim().toLowerCase();
  const teamId = String(filter.teamId || '').trim();
  return patients.filter((p) => {
    if (teamId && String(p.teamId || '') === teamId) return true;
    if (username && String(p.ownerUsername || '').toLowerCase() === username) return true;
    if (!username && !teamId) return true;
    // If filtering by username only, also include team mates' patients on shared teams
    if (username && !teamId) {
      const teams = Array.isArray(snapshot?.teams) ? snapshot.teams : [];
      const myTeams = new Set(
        teams.filter((t) => (t.memberUsernames || []).includes(username)).map((t) => t.teamId)
      );
      return myTeams.has(String(p.teamId || ''));
    }
    return false;
  });
}
