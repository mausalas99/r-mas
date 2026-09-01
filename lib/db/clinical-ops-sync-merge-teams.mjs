import { indexBy, pickTeamMergeWinner, resolveMergeUserFk } from './clinical-ops-sync-merge-utils.mjs';

function updateTeamRow(db, teamId, winner, createdBy, leaderUserId, succeedsTeamId) {
  db.prepare(
    `UPDATE teams SET name = ?, service = ?, sub_area_fraction = ?, on_call_day_index = ?,
     created_by = ?, archived_at = ?, sala = ?, team_leader_name = ?, leader_user_id = ?, rotation_active = ?, succeeds_team_id = ?, updated_at = ?
     WHERE team_id = ?`
  ).run(
    winner.name,
    winner.service,
    winner.sub_area_fraction ?? null,
    Number(winner.on_call_day_index ?? 0),
    createdBy,
    winner.archived_at ?? null,
    winner.sala ?? null,
    winner.team_leader_name ?? null,
    leaderUserId,
    Number(winner.rotation_active ?? 1),
    succeedsTeamId,
    winner.updated_at ?? null,
    teamId
  );
}

function insertTeamRow(db, teamId, winner, createdBy, leaderUserId, succeedsTeamId) {
  db.prepare(
    `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active, succeeds_team_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    teamId,
    winner.name,
    winner.service,
    winner.sub_area_fraction ?? null,
    Number(winner.on_call_day_index ?? 0),
    createdBy,
    winner.archived_at ?? null,
    winner.sala ?? null,
    winner.team_leader_name ?? null,
    leaderUserId,
    Number(winner.rotation_active ?? 1),
    succeedsTeamId,
    winner.updated_at ?? null
  );
}

function upsertTeamMergeWinner(db, teamId, winner) {
  const createdBy = resolveMergeUserFk(db, winner.created_by);
  const leaderUserId = resolveMergeUserFk(db, winner.leader_user_id);
  // succeeds_team_id is linked in a second pass (see mergeTeams) once every
  // row in this batch has been upserted — a peer can receive a successor
  // team before its predecessor, and succeeds_team_id REFERENCES teams(team_id)
  // is enforced (foreign_keys = ON), so resolving it here could throw and
  // silently drop the whole team row via the catch below.
  const existing = db.prepare(`SELECT succeeds_team_id FROM teams WHERE team_id = ?`).get(teamId);
  try {
    if (existing) {
      updateTeamRow(db, teamId, winner, createdBy, leaderUserId, existing.succeeds_team_id ?? null);
    } else {
      insertTeamRow(db, teamId, winner, createdBy, leaderUserId, null);
    }
  } catch {
    /* skip team row when service check or FK still cannot be satisfied */
  }
}

function linkSucceedsTeamId(db, teamId, winner) {
  const succeedsTeamId = String(winner.succeeds_team_id || '').trim() || null;
  const row = db.prepare(`SELECT succeeds_team_id FROM teams WHERE team_id = ?`).get(teamId);
  if (!row) return;
  if ((row.succeeds_team_id ?? null) === succeedsTeamId) return;
  if (succeedsTeamId) {
    const target = db.prepare(`SELECT 1 AS ok FROM teams WHERE team_id = ?`).get(succeedsTeamId);
    if (!target) return;
  }
  try {
    db.prepare(`UPDATE teams SET succeeds_team_id = ? WHERE team_id = ?`).run(succeedsTeamId, teamId);
  } catch {
    /* leave unlinked if still unsatisfiable */
  }
}

export function mergeTeams(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'team_id');
  const incomingById = indexBy(incomingRows, 'team_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  const winners = new Map();
  for (const teamId of allIds) {
    const winner = pickTeamMergeWinner(localById.get(teamId), incomingById.get(teamId));
    if (!winner) continue;
    winners.set(teamId, winner);
    upsertTeamMergeWinner(db, teamId, winner);
  }

  // Every team row from this batch now exists (or was already local), so
  // succeeds_team_id links can be resolved regardless of merge order.
  for (const [teamId, winner] of winners) {
    linkSucceedsTeamId(db, teamId, winner);
  }
}

/** @param {import('better-sqlite3').Database} db @param {object[]} tombstones */
export function applyLanArchivedTeamsToDb(db, tombstones) {
  for (const row of tombstones || []) {
    const teamId = String(row?.team_id || '').trim();
    const archivedAt = String(row?.archived_at || '').trim();
    if (!teamId || !archivedAt) continue;
    const existing = db.prepare(`SELECT archived_at FROM teams WHERE team_id = ?`).get(teamId);
    if (!existing) continue;
    const current = String(existing.archived_at || '');
    if (current && archivedAt < current) continue;
    db.prepare(
      `UPDATE teams SET archived_at = ?, rotation_active = 0, updated_at = COALESCE(updated_at, ?) WHERE team_id = ?`
    ).run(archivedAt, archivedAt, teamId);
    db.prepare(`DELETE FROM team_membership WHERE team_id = ?`).run(teamId);
    db.prepare(`DELETE FROM team_guardia_today WHERE team_id = ?`).run(teamId);
  }
}
