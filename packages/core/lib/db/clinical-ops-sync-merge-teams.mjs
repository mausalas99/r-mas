import { indexBy, pickTeamMergeWinner, resolveMergeUserFk } from './clinical-ops-sync-merge-utils.mjs';
import { effectiveTeamSala } from './clinical-access-teams-core.mjs';

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

/** @returns {boolean} true on success, false if the row was skipped */
function upsertTeamMergeWinner(db, teamId, winner) {
  const createdBy = resolveMergeUserFk(db, winner.created_by);
  const leaderUserId = resolveMergeUserFk(db, winner.leader_user_id);
  // Mirror resolveMergeUserFk for the teams self-FK: a dangling succeeds_team_id
  // must not cost us the whole team row (it is a nice-to-have patient-inheritance
  // link, and the row is the only way the team is ever visible).
  const succeedsRaw = String(winner.succeeds_team_id || '').trim();
  const succeedsTeamId =
    succeedsRaw && db.prepare(`SELECT 1 AS ok FROM teams WHERE team_id = ?`).get(succeedsRaw)
      ? succeedsRaw
      : null;
  const existing = db.prepare(`SELECT team_id FROM teams WHERE team_id = ?`).get(teamId);
  try {
    if (existing) {
      updateTeamRow(db, teamId, winner, createdBy, leaderUserId, succeedsTeamId);
    } else {
      insertTeamRow(db, teamId, winner, createdBy, leaderUserId, succeedsTeamId);
    }
    return true;
  } catch (err) {
    // skip team row when service check or FK still cannot be satisfied — logged so a future
    // constraint/FK failure leaves a trace instead of silently vanishing (see MISTAKES.md).
    console.warn('[teams sync] skipped team row', teamId, err);
    return false;
  }
}

/** @returns {number} count of team rows skipped (constraint/FK still unsatisfiable) */
export function mergeTeams(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'team_id');
  const incomingById = indexBy(incomingRows, 'team_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  let skipped = 0;
  for (const teamId of allIds) {
    const winner = pickTeamMergeWinner(localById.get(teamId), incomingById.get(teamId));
    if (!winner) continue;
    if (!upsertTeamMergeWinner(db, teamId, winner)) skipped += 1;
  }
  promoteOrphanStagedTeams(db);
  return skipped;
}

/**
 * Pre-8.2.8 peers staged a new team (rotation_active=0) whenever ANY sala had a live
 * rotation, not just the team's own sala — so a sala can end up with only staged
 * teams: invisible to listTeamsForRenderer for anyone who hasn't already joined, and
 * stuck until a hospital-wide "Iniciar nueva rotación". A staged team means nothing
 * without a live team in the same sala, so promote it once none exists there.
 * @param {import('better-sqlite3').Database} db
 */
function promoteOrphanStagedTeams(db) {
  const rows = db
    .prepare(`SELECT team_id, sala, created_by, rotation_active FROM teams WHERE archived_at IS NULL`)
    .all();
  const activeSalas = new Set(
    rows.filter((r) => Number(r.rotation_active) === 1).map((r) => effectiveTeamSala(db, r))
  );
  const now = new Date().toISOString();
  const promote = db.prepare(`UPDATE teams SET rotation_active = 1, updated_at = ? WHERE team_id = ?`);
  for (const row of rows) {
    if (Number(row.rotation_active) !== 0) continue;
    if (activeSalas.has(effectiveTeamSala(db, row))) continue;
    promote.run(now, row.team_id);
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
