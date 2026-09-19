import { ensureClinicalPatientRow, setTeamGuardiaToday } from './clinical-access-db.mjs';
import { indexBy, pickLastWriteRow } from './clinical-ops-sync-merge-utils.mjs';

export function mergePatientTeamAssignments(db, incomingRows) {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO patient_team_assignment (patient_id, team_id, effective_at, created_at)
     VALUES (?, ?, ?, COALESCE(?, datetime('now')))`
  );
  let inserted = 0;
  for (const row of incomingRows) {
    if (!row?.patient_id || !row?.team_id || !row?.effective_at) continue;
    try {
      ensureClinicalPatientRow(db, String(row.patient_id));
      const info = stmt.run(
        String(row.patient_id),
        String(row.team_id),
        String(row.effective_at),
        row.created_at ? String(row.created_at) : null
      );
      if (Number(info?.changes || 0) > 0) inserted += 1;
    } catch {
      /* skip rows whose patient_id / team_id still cannot be satisfied on this peer */
    }
  }
  return inserted;
}

export function mergeTeamGuardiaToday(db, localRows, incomingRows) {
  const localByTeam = indexBy(localRows, 'team_id');
  const incomingByTeam = indexBy(incomingRows, 'team_id');
  const allTeams = new Set([...localByTeam.keys(), ...incomingByTeam.keys()]);

  for (const teamId of allTeams) {
    const winner = pickLastWriteRow(localByTeam.get(teamId), incomingByTeam.get(teamId), 'declared_at');
    if (!winner?.user_id) continue;
    try {
      setTeamGuardiaToday(db, teamId, String(winner.user_id));
    } catch {
      /* skip rows whose user_id / team_id still cannot be satisfied */
    }
  }
}
