import {
  getDeletedUserIds,
  getArchivedTeamsMeta,
  getMembershipRemovals,
  getMembershipRejoins,
  effectiveTeamSala,
} from './clinical-access-db.mjs';
import {
  isRegisteredClinicalUser,
  isValidUsernameFormat,
  normalizeUsername,
} from './clinical-username.mjs';
import { META_ROTATION_NUEVA_AT } from './clinical-ops-sync-constants.mjs';

function addReferencedUserId(needed, uid) {
  const id = String(uid || '').trim();
  if (id) needed.add(id);
}

function addUserIdsFromRows(needed, rows, field) {
  for (const row of rows || []) addReferencedUserId(needed, row?.[field]);
}

function collectMembershipReferencedUserIds(_db, rows) {
  const needed = new Set();
  addUserIdsFromRows(needed, rows?.team_membership, 'user_id');
  for (const row of rows?.teams || []) {
    addReferencedUserId(needed, row?.created_by);
    addReferencedUserId(needed, row?.leader_user_id);
  }
  addUserIdsFromRows(needed, rows?.team_guardia_today, 'user_id');
  return needed;
}

/** Export for LAN directorio: claimed @usuario or saved nombre clínico (sala optional). */
function shouldExportClinicalUserForLan(row, deletedIds) {
  const uid = String(row?.user_id || '').trim();
  if (!uid || deletedIds.has(uid)) return false;
  return isRegisteredClinicalUser(row);
}

function appendMembershipReferencedUsers(db, clinicalUsers, deletedIds, refs) {
  const exportedIds = new Set(
    (clinicalUsers || []).map((row) => String(row?.user_id || '').trim()).filter(Boolean)
  );
  const select = db.prepare(
    `SELECT user_id, username, rank, clinical_name, sala, is_program_admin, created_at
     FROM users WHERE user_id = ?`
  );
  let added = 0;
  for (const uid of refs) {
    if (exportedIds.has(uid) || deletedIds.has(uid)) continue;
    const row = select.get(uid);
    if (!row) continue;
    const handle = normalizeUsername(row?.username || '');
    const clinicalName = String(row?.clinical_name || '').trim();
    if (!isValidUsernameFormat(handle) && !clinicalName) continue;
    clinicalUsers.push({
      ...row,
      username: isValidUsernameFormat(handle) ? handle : handle || uid.slice(0, 8),
    });
    exportedIds.add(uid);
    added += 1;
  }
  return added;
}

/** @param {unknown[]} rows @param {Set<string>} teamIds @param {string} [field] */
function filterRowsByTeamId(rows, teamIds, field = 'team_id') {
  return (rows || []).filter((row) => teamIds.has(String(row?.[field] || '').trim()));
}

/**
 * A team's creator/leader is often not a member of it. Without their row the peer
 * stubs them with sala = NULL, and effectiveTeamSala() then resolves the team to ''
 * — invisible in every sala-scoped list. Same reasoning for removals/rejoins: they
 * need clinical_users for peer @username → user_id remap.
 */
function collectSalaMemberUserIds(snapshot, teams, teamIds) {
  const memberUserIds = new Set(
    filterRowsByTeamId(snapshot.team_membership, teamIds).map((row) =>
      String(row.user_id || '').trim()
    )
  );
  for (const row of filterRowsByTeamId(snapshot.team_membership_removals, teamIds)) {
    addReferencedUserId(memberUserIds, row?.user_id);
  }
  for (const row of filterRowsByTeamId(snapshot.team_membership_rejoins, teamIds)) {
    addReferencedUserId(memberUserIds, row?.user_id);
  }
  for (const team of teams) {
    addReferencedUserId(memberUserIds, team?.created_by);
    addReferencedUserId(memberUserIds, team?.leader_user_id);
  }
  return memberUserIds;
}

/**
 * Restrict a full clinicalOps export to one Nube sala (teams live in team.sala room).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} snapshot
 * @param {string} sala
 */
export function filterClinicalOpsSnapshotForSala(db, snapshot, sala) {
  const target = String(sala || '').trim();
  if (!target || !snapshot) return snapshot;

  const teams = (snapshot.teams || []).filter(
    (team) => effectiveTeamSala(db, team) === target
  );
  const teamIds = new Set(teams.map((team) => String(team.team_id || '').trim()).filter(Boolean));
  const memberUserIds = collectSalaMemberUserIds(snapshot, teams, teamIds);

  const clinical_users = (snapshot.clinical_users || []).filter((row) =>
    memberUserIds.has(String(row.user_id || '').trim())
  );

  return {
    ...snapshot,
    teams,
    team_membership: filterRowsByTeamId(snapshot.team_membership, teamIds),
    team_guardia_today: filterRowsByTeamId(snapshot.team_guardia_today, teamIds),
    patient_team_assignment: filterRowsByTeamId(snapshot.patient_team_assignment, teamIds),
    teams_archived: filterRowsByTeamId(snapshot.teams_archived, teamIds),
    team_membership_removals: filterRowsByTeamId(snapshot.team_membership_removals, teamIds),
    team_membership_rejoins: filterRowsByTeamId(snapshot.team_membership_rejoins, teamIds),
    clinical_users,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} [sala] — when set, only teams/membership for that sala
 */
export function exportClinicalOpsSnapshotForSala(db, sala) {
  const full = exportClinicalOpsSnapshot(db);
  const target = String(sala || '').trim();
  if (!target) return full;
  return filterClinicalOpsSnapshotForSala(db, full, target);
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function exportClinicalOpsSnapshot(db) {
  const rotationNuevaAt =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_ROTATION_NUEVA_AT)?.value ??
    null;
  const deletedIds = new Set(getDeletedUserIds(db));
  const team_membership = db.prepare(`SELECT * FROM team_membership`).all();
  const teams = db.prepare(`SELECT * FROM teams ORDER BY name`).all();
  const team_guardia_today = db.prepare(`SELECT * FROM team_guardia_today`).all();

  const clinical_users = db
    .prepare(
      `SELECT user_id, username, rank, clinical_name, sala, is_program_admin, created_at, last_activity_at
       FROM users ORDER BY username`
    )
    .all()
    .filter((row) => shouldExportClinicalUserForLan(row, deletedIds));

  const refs = collectMembershipReferencedUserIds(db, {
    team_membership,
    teams,
    team_guardia_today,
  });
  appendMembershipReferencedUsers(db, clinical_users, deletedIds, refs);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rotationNuevaAt,
    clinical_users_deleted: [...deletedIds],
    teams_archived: getArchivedTeamsMeta(db),
    rotation_cycles: db.prepare(`SELECT * FROM rotation_cycles ORDER BY created_at`).all(),
    patient_team_assignment: db
      .prepare(`SELECT * FROM patient_team_assignment ORDER BY created_at`)
      .all(),
    team_guardia_today,
    teams,
    team_membership,
    clinical_users,
    team_membership_removals: getMembershipRemovals(db),
    team_membership_rejoins: getMembershipRejoins(db),
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} iso
 */
export function stampRotationNuevaAt(db, iso) {
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_ROTATION_NUEVA_AT, iso);
}
