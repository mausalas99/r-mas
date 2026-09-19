import {
  fetchPatientTeamAssignments,
  assignPatientToTeam,
} from '../db/clinical-access-assignments.mjs';
import { resolvePatientTeamIdFromAssignments } from './team-membership.mjs';

/**
 * On team-role rollover, moves a post-call team's non-resolved patients to
 * the remaining active teams (simple round-robin). Notes/indicaciones are
 * patient-scoped already, so nothing needs copying — just the team link.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} postCallTeamId
 * @param {string[]} remainingTeamIds
 * @param {string} [nowIso]
 * @returns {{ movedCount: number, byTeam: Record<string, string[]> }}
 */
export function redistributePostCallPatients(db, postCallTeamId, remainingTeamIds, nowIso = new Date().toISOString()) {
  const byTeam = {};
  for (const teamId of remainingTeamIds || []) byTeam[teamId] = [];
  if (!remainingTeamIds || remainingTeamIds.length === 0) return { movedCount: 0, byTeam };

  const assignments = fetchPatientTeamAssignments(db);
  const patientIds = new Set(assignments.map((a) => String(a.patient_id || '').trim()).filter(Boolean));
  const patientsOnTeam = [...patientIds].filter(
    (pid) => resolvePatientTeamIdFromAssignments(pid, assignments, nowIso) === postCallTeamId
  );

  const statusById = new Map();
  if (patientsOnTeam.length > 0) {
    const statusRows = db
      .prepare(`SELECT id, interconsult_status FROM patients WHERE id IN (${patientsOnTeam.map(() => '?').join(',')})`)
      .all(...patientsOnTeam);
    for (const r of statusRows) statusById.set(String(r.id), r.interconsult_status);
  }

  const toMove = patientsOnTeam.filter((pid) => statusById.get(pid) !== 'Resolved');

  toMove.forEach((patientId, i) => {
    const teamId = remainingTeamIds[i % remainingTeamIds.length];
    assignPatientToTeam(db, { patientId, teamId, effectiveAt: nowIso });
    byTeam[teamId].push(patientId);
  });

  return { movedCount: toMove.length, byTeam };
}
