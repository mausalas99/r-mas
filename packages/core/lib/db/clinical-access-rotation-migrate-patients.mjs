import { fetchPatientTeamAssignments, assignPatientToTeam } from './clinical-access-assignments.mjs';
import { resolvePatientTeamIdFromAssignments } from '../clinical-scope/team-membership.mjs';

/**
 * Carries patients over for every team linked via `succeeds_team_id`.
 * Runs right after archiveRotationAndTeams promotes staged teams to active —
 * any patient still on the now-archived predecessor moves to its successor,
 * effective now. Local-only: only touches patients this Mac already knows
 * about (patient_team_assignment rows), same as the manual "Traer pacientes"
 * flow — LAN/Nube sync carries the new rows to other Macs afterward.
 * @param {import('better-sqlite3').Database} db
 * @param {string} nowIso
 */
export function migrateLinkedTeamPatients(db, nowIso) {
  const links = db
    .prepare(
      `SELECT team_id, succeeds_team_id FROM teams
       WHERE archived_at IS NULL AND rotation_active = 1 AND succeeds_team_id IS NOT NULL`
    )
    .all();
  if (!links.length) return { migrated: 0 };

  const assignments = fetchPatientTeamAssignments(db);
  const patientIds = [...new Set(assignments.map((row) => String(row.patient_id || '')).filter(Boolean))];

  let migrated = 0;
  for (const { team_id: newTeamId, succeeds_team_id: oldTeamId } of links) {
    for (const patientId of patientIds) {
      const currentTeamId = resolvePatientTeamIdFromAssignments(patientId, assignments, nowIso);
      if (currentTeamId !== String(oldTeamId)) continue;
      assignPatientToTeam(db, { patientId, teamId: newTeamId, effectiveAt: nowIso });
      assignments.push({ patient_id: patientId, team_id: newTeamId, effective_at: nowIso, created_at: nowIso });
      migrated += 1;
    }
  }
  return { migrated };
}
