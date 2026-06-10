import { createRequire } from 'node:module';
import {
  archiveRotationAndTeams,
  upsertActiveGuardia,
  setTeamGuardiaToday,
  getLanDeletedUserIds,
  getLanArchivedTeams,
  getLanMembershipRemovals,
  getLanMembershipRejoins,
  applyLanDeletedUsersFromSnapshot,
  applyLanResolvedGuardiasFromSnapshot,
  getLanResolvedGuardias,
  applyLanMembershipRemovals,
  persistLanMembershipRemovals,
  persistLanMembershipRejoins,
  persistLanArchivedTeams,
  ensureClinicalPatientRow,
  touchClinicalUserActivity,
} from './clinical-access-db.mjs';
import {
  isLanDirectoryPendingUsername,
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from './clinical-username.mjs';

const require = createRequire(import.meta.url);
const { mergeClinicalOpsFromSourcesData, mergeClinicalUsersData } = require('./clinical-ops-bundle-merge.cjs');

const META_ROTATION_NUEVA_AT = 'rotation_nueva_at';

function collectMembershipReferencedUserIds(db, rows) {
  const needed = new Set();
  const add = (uid) => {
    const id = String(uid || '').trim();
    if (id) needed.add(id);
  };
  for (const row of rows?.team_membership || []) add(row?.user_id);
  for (const row of rows?.teams || []) {
    add(row?.created_by);
    add(row?.leader_user_id);
  }
  for (const row of rows?.team_guardia_today || []) add(row?.user_id);
  for (const row of rows?.active_guardias || []) add(row?.covering_user_id);
  for (const row of rows?.entrega_template_user || []) add(row?.user_id);
  for (const row of rows?.entrega_template_team || []) add(row?.created_by);
  return needed;
}

/** Export for LAN directorio: valid @usuario, or registered profile (nombre + sala). */
function shouldExportClinicalUserForLan(row, deletedIds) {
  const uid = String(row?.user_id || '').trim();
  if (!uid || deletedIds.has(uid)) return false;
  const handle = normalizeUsername(row?.username || '');
  if (isValidUsernameFormat(handle) && !isLanDirectoryPendingUsername(handle)) return true;
  const clinicalName = String(row?.clinical_name || '').trim();
  const sala = String(row?.sala || '').trim();
  if (!clinicalName || !sala) return false;
  if (isLegacyMachineUsername(handle, uid)) return true;
  return isLanDirectoryPendingUsername(handle);
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

/**
 * @param {import('better-sqlite3').Database} db
 */
export function exportClinicalOpsSnapshot(db) {
  const rotationNuevaAt =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_ROTATION_NUEVA_AT)?.value ??
    null;
  const deletedIds = new Set(getLanDeletedUserIds(db));
  const team_membership = db.prepare(`SELECT * FROM team_membership`).all();
  const teams = db.prepare(`SELECT * FROM teams ORDER BY name`).all();
  const team_guardia_today = db.prepare(`SELECT * FROM team_guardia_today`).all();
  const active_guardias = db
    .prepare(`SELECT * FROM active_guardias WHERE status = 'Active' ORDER BY assigned_at`)
    .all();
  const entrega_template_user = db
    .prepare(`SELECT * FROM entrega_template_user ORDER BY created_at`)
    .all();
  const entrega_template_team = db
    .prepare(`SELECT * FROM entrega_template_team ORDER BY created_at`)
    .all();

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
    active_guardias,
    entrega_template_user,
    entrega_template_team,
  });
  appendMembershipReferencedUsers(db, clinical_users, deletedIds, refs);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rotationNuevaAt,
    clinical_users_deleted: [...deletedIds],
    teams_archived: getLanArchivedTeams(db),
    rotation_cycles: db.prepare(`SELECT * FROM rotation_cycles ORDER BY created_at`).all(),
    patient_team_assignment: db
      .prepare(`SELECT * FROM patient_team_assignment ORDER BY created_at`)
      .all(),
    team_guardia_today,
    teams,
    team_membership,
    active_guardias,
    active_guardias_resolved: getLanResolvedGuardias(db),
    clinical_users,
    team_membership_removals: getLanMembershipRemovals(db),
    team_membership_rejoins: getLanMembershipRejoins(db),
    entrega_template_user,
    entrega_template_team,
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

/**
 * Merge V2 clinical ops tables from a LAN / save-all snapshot.
 *
 * Strategy (see lan-sync.mjs header comment):
 * - team_guardia_today, teams metadata: last-write per row
 * - rotation.nueva: newer rotationNuevaAt triggers archive on peer
 * - patient_team_assignment, team_membership: union (no silent deletes)
 * - active_guardias: last-write per patient by assigned_at
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 * @param {object} [localSnapshot]
 */
export function mergeClinicalOpsSnapshot(db, incoming, localSnapshot = null) {
  if (!incoming || typeof incoming !== 'object') return { merged: false };

  const stats = {
    incomingUsers: Array.isArray(incoming.clinical_users) ? incoming.clinical_users.length : 0,
    usersInserted: 0,
    usersUpdated: 0,
    usersUpgradedFromStub: 0,
    stubsCreated: 0,
    usersPurgedByTombstone: 0,
    usersResurrectedFromTombstone: 0,
    assignmentsInserted: 0,
    membershipRemovalsApplied: 0,
  };

  const local =
    localSnapshot && typeof localSnapshot === 'object'
      ? localSnapshot
      : exportClinicalOpsSnapshot(db);

  const remoteNueva = incoming.rotationNuevaAt ? String(incoming.rotationNuevaAt) : '';
  const localNueva = local.rotationNuevaAt ? String(local.rotationNuevaAt) : '';
  let localGuardias = local.active_guardias || [];
  let localTeamGuardia = local.team_guardia_today || [];
  if (remoteNueva && (!localNueva || remoteNueva > localNueva)) {
    archiveRotationAndTeams(db);
    stampRotationNuevaAt(db, remoteNueva);
    localGuardias = [];
    localTeamGuardia = [];
  }

  const tombstoneStats = applyLanDeletedUsersFromSnapshot(db, incoming, local);
  stats.usersPurgedByTombstone = tombstoneStats.purged;
  stats.usersResurrectedFromTombstone = tombstoneStats.resurrected;

  const deletedSet = new Set(getLanDeletedUserIds(db));
  const mergedUsers = mergeClinicalUsersData(local.clinical_users || [], incoming.clinical_users || []);
  const userMergeStats = mergeClinicalUsers(
    db,
    mergedUsers.filter((row) => !deletedSet.has(String(row?.user_id || '')))
  );
  stats.usersInserted = userMergeStats.inserted;
  stats.usersUpdated = userMergeStats.updated;
  stats.usersUpgradedFromStub = userMergeStats.upgradedFromStub;
  stats.stubsCreated = ensureStubLanUsersReferenced(db, incoming, deletedSet);
  const mergedRejoins = mergeMembershipRejoinsRows(
    local.team_membership_rejoins || getLanMembershipRejoins(db),
    incoming.team_membership_rejoins || []
  );
  persistLanMembershipRejoins(db, mergedRejoins);
  let mergedRemovals = mergeMembershipRemovalsRows(
    local.team_membership_removals || getLanMembershipRemovals(db),
    incoming.team_membership_removals || []
  );
  mergedRemovals = reconcileMergedMembershipRemovals(
    local,
    mergedRemovals,
    mergedRejoins
  );
  mergedRemovals = pruneStaleMembershipRemovals(db, mergedRemovals, deletedSet);
  persistLanMembershipRemovals(db, mergedRemovals);
  const removalKeys = new Set(
    mergedRemovals.map((row) => `${row.team_id}\0${row.user_id}`)
  );
  const mergedTeamArchives = mergeTeamsArchivedRows(
    local.teams_archived || getLanArchivedTeams(db),
    incoming.teams_archived || []
  );
  persistLanArchivedTeams(db, mergedTeamArchives);
  mergeTeams(db, local.teams || [], incoming.teams || []);
  applyLanArchivedTeamsToDb(db, mergedTeamArchives);
  const archivedTeamIds = new Set(
    db
      .prepare(`SELECT team_id FROM teams WHERE archived_at IS NOT NULL`)
      .all()
      .map((row) => String(row.team_id || '').trim())
      .filter(Boolean)
  );
  mergeEntregaTemplateUser(db, local.entrega_template_user || [], incoming.entrega_template_user || []);
  mergeEntregaTemplateTeam(db, local.entrega_template_team || [], incoming.entrega_template_team || []);
  mergeTeamMembership(
    db,
    filterIncomingTeamMembership(
      incoming.team_membership || [],
      deletedSet,
      removalKeys,
      archivedTeamIds
    )
  );
  stats.membershipRemovalsApplied = mergedRemovals.length;
  applyLanMembershipRemovals(db, mergedRemovals);
  stats.assignmentsInserted = mergePatientTeamAssignments(db, incoming.patient_team_assignment || []);
  mergeTeamGuardiaToday(db, localTeamGuardia, incoming.team_guardia_today || []);
  applyLanResolvedGuardiasFromSnapshot(db, incoming, local);
  const refreshedLocalGuardias = db
    .prepare(`SELECT * FROM active_guardias WHERE status = 'Active' ORDER BY assigned_at`)
    .all();
  mergeActiveGuardias(db, refreshedLocalGuardias, incoming.active_guardias || []);

  return { merged: true, stats };
}

/**
 * Pick the newer of two LAN bundle clinicalOps payloads by exportedAt.
 * @param {object[]} sources
 */
export function pickNewerClinicalOpsSnapshot(sources) {
  return mergeClinicalOpsFromSourcesData(sources);
}

function mergeRotationCycles(db, localRows, incomingRows) {
  const upsert = db.prepare(
    `INSERT INTO rotation_cycles
       (cycle_id, month_end_at, preview_days, preview_start_at, effective_at, archived_at, created_by, created_at)
     VALUES (@cycle_id, @month_end_at, @preview_days, @preview_start_at, @effective_at, @archived_at, @created_by, @created_at)
     ON CONFLICT(cycle_id) DO UPDATE SET
       archived_at = COALESCE(excluded.archived_at, rotation_cycles.archived_at),
       month_end_at = excluded.month_end_at,
       preview_days = excluded.preview_days,
       preview_start_at = excluded.preview_start_at,
       effective_at = excluded.effective_at`
  );
  const byId = new Map();
  for (const row of localRows) {
    if (row && row.cycle_id) byId.set(String(row.cycle_id), row);
  }
  for (const row of incomingRows) {
    if (row && row.cycle_id) byId.set(String(row.cycle_id), row);
  }
  for (const row of byId.values()) upsert.run(row);
}

function mergeTeams(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'team_id');
  const incomingById = indexBy(incomingRows, 'team_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  for (const teamId of allIds) {
    const localRow = localById.get(teamId);
    const incomingRow = incomingById.get(teamId);
    const winner = pickTeamMergeWinner(localRow, incomingRow);
    if (!winner) continue;

    const createdBy = resolveMergeUserFk(db, winner.created_by);
    const leaderUserId = resolveMergeUserFk(db, winner.leader_user_id);
    const existing = db.prepare(`SELECT team_id FROM teams WHERE team_id = ?`).get(teamId);
    if (existing) {
      try {
        db.prepare(
          `UPDATE teams SET name = ?, service = ?, sub_area_fraction = ?, on_call_day_index = ?,
           created_by = ?, archived_at = ?, sala = ?, team_leader_name = ?, leader_user_id = ?, rotation_active = ?, updated_at = ?
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
          winner.updated_at ?? null,
          teamId
        );
      } catch (_err) {
        /* skip team row when service check or FK still cannot be satisfied */
      }
    } else {
      try {
        db.prepare(
          `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          winner.updated_at ?? null
        );
      } catch (_err) {
        /* skip team row when service check or FK still cannot be satisfied */
      }
    }
  }
}

function mergeTeamsArchivedRows(localRows, incomingRows) {
  const map = new Map();
  for (const row of [...(localRows || []), ...(incomingRows || [])]) {
    const teamId = String(row?.team_id || '').trim();
    const archivedAt = String(row?.archived_at || '').trim();
    if (!teamId || !archivedAt) continue;
    const prev = map.get(teamId);
    if (!prev || archivedAt >= String(prev.archived_at || '')) {
      map.set(teamId, { team_id: teamId, archived_at: archivedAt });
    }
  }
  return [...map.values()];
}

/** @param {import('better-sqlite3').Database} db @param {object[]} tombstones */
function applyLanArchivedTeamsToDb(db, tombstones) {
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

function isLanStubUsername(raw) {
  const handle = normalizeUsername(raw || '');
  return /^peer_[a-z0-9_]+$/.test(handle);
}

function mergeClinicalUsers(db, incomingRows) {
  const stats = { inserted: 0, updated: 0, upgradedFromStub: 0 };
  for (const row of incomingRows || []) {
    const uid = String(row?.user_id || '');
    if (!uid) continue;
    let handle = normalizeUsername(row?.username || '');
    const clinicalName = String(row?.clinical_name || '').trim();
    if (!handle || !isValidUsernameFormat(handle)) {
      if (!clinicalName) continue;
      const existingRow = db
        .prepare(`SELECT user_id, username FROM users WHERE user_id = ?`)
        .get(uid);
      if (existingRow) {
        const existingHandle = normalizeUsername(existingRow.username || '');
        handle =
          isValidUsernameFormat(existingHandle) || isLanStubUsername(existingHandle)
            ? existingHandle
            : stubUsernameForLanUserId(db, uid);
      } else {
        handle = stubUsernameForLanUserId(db, uid);
      }
    }

    const byHandle = db
      .prepare(`SELECT user_id FROM users WHERE username = ? COLLATE NOCASE`)
      .get(handle);
    if (byHandle && String(byHandle.user_id) !== uid) {
      db.prepare(
        `UPDATE users SET rank = ?, clinical_name = ?, sala = ?,
         is_program_admin = COALESCE(?, is_program_admin)
         WHERE user_id = ?`
      ).run(
        String(row.rank || 'R1'),
        row.clinical_name ?? null,
        row.sala ?? null,
        row.is_program_admin != null ? Number(row.is_program_admin) : null,
        String(byHandle.user_id)
      );
      if (row.last_activity_at) {
        touchClinicalUserActivity(db, String(byHandle.user_id), String(row.last_activity_at));
      }
      stats.updated += 1;
      continue;
    }

    const existing = db
      .prepare(`SELECT user_id, username FROM users WHERE user_id = ?`)
      .get(uid);
    if (existing) {
      const wasStub = isLanStubUsername(existing.username);
      db.prepare(
        `UPDATE users SET username = ?, rank = ?, clinical_name = ?, sala = ?,
         is_program_admin = COALESCE(?, is_program_admin)
         WHERE user_id = ?`
      ).run(
        handle,
        String(row.rank || 'R1'),
        row.clinical_name ?? null,
        row.sala ?? null,
        row.is_program_admin != null ? Number(row.is_program_admin) : null,
        uid
      );
      if (row.last_activity_at) {
        touchClinicalUserActivity(db, uid, String(row.last_activity_at));
      }
      stats.updated += 1;
      if (wasStub) stats.upgradedFromStub += 1;
      continue;
    }

    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala, is_program_admin, last_activity_at)
       VALUES (?, ?, '', ?, '', '', ?, ?, ?, ?)`
    ).run(
      uid,
      handle,
      String(row.rank || 'R1'),
      row.clinical_name ?? null,
      row.sala ?? null,
      row.is_program_admin != null ? Number(row.is_program_admin) : 0,
      row.last_activity_at ? String(row.last_activity_at) : null
    );
    stats.inserted += 1;
  }
  return stats;
}

/** @param {import('better-sqlite3').Database} db @param {string} userId */
function stubUsernameForLanUserId(db, userId) {
  const uid = String(userId || '').trim();
  const compact = uid.replace(/-/g, '').toLowerCase();
  let base = ('peer_' + compact.slice(0, 20)).replace(/[^a-z0-9_]/g, 'x');
  if (!isValidUsernameFormat(base)) base = 'peer_' + compact.slice(0, 8).replace(/[^a-z0-9]/g, 'x') || 'peer_user';
  let candidate = base;
  let n = 2;
  while (
    db.prepare(`SELECT 1 AS ok FROM users WHERE username = ? COLLATE NOCASE AND user_id <> ?`).get(
      candidate,
      uid
    )
  ) {
    candidate = base.slice(0, 28) + '_' + String(n);
    n += 1;
  }
  return candidate;
}

/**
 * 6.5.6 peers export teams/membership but not clinical_users — stub missing user_ids
 * so FK team_membership → users does not abort the whole LAN merge.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 */
/**
 * @returns {number} stubs created
 */
function filterIncomingTeamMembership(rows, deletedSet, removalKeys, archivedTeamIds) {
  return (rows || []).filter((row) => {
    const teamId = String(row?.team_id || '').trim();
    const userId = String(row?.user_id || '').trim();
    if (!teamId || !userId) return false;
    if (archivedTeamIds?.has(teamId)) return false;
    if (deletedSet.has(userId)) return false;
    if (removalKeys.has(`${teamId}\0${userId}`)) return false;
    return true;
  });
}

function ensureStubLanUsersReferenced(db, incoming, deletedSet = null) {
  const tombstones = deletedSet || new Set(getLanDeletedUserIds(db));
  const needed = new Set();
  for (const row of incoming?.team_membership || []) {
    const uid = String(row?.user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.teams || []) {
    for (const key of ['created_by', 'leader_user_id']) {
      const uid = String(row?.[key] || '').trim();
      if (uid) needed.add(uid);
    }
  }
  for (const row of incoming?.team_guardia_today || []) {
    const uid = String(row?.user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.active_guardias || []) {
    const uid = String(row?.covering_user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.entrega_template_user || []) {
    const uid = String(row?.user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.entrega_template_team || []) {
    const uid = String(row?.created_by || '').trim();
    if (uid) needed.add(uid);
  }
  if (!needed.size) return 0;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala, is_program_admin)
     VALUES (?, ?, '', 'R1', '', '', NULL, NULL, 0)`
  );

  let created = 0;
  for (const uid of needed) {
    if (tombstones.has(uid)) continue;
    const exists = db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid);
    if (exists) continue;
    insert.run(uid, stubUsernameForLanUserId(db, uid));
    created += 1;
  }
  return created;
}

function mergeEntregaTemplateUser(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'template_id');
  const incomingById = indexBy(incomingRows, 'template_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  for (const templateId of allIds) {
    const winner = pickLastWriteRow(localById.get(templateId), incomingById.get(templateId), 'created_at');
    if (!winner?.user_id) continue;

    const existing = db
      .prepare(`SELECT template_id FROM entrega_template_user WHERE template_id = ?`)
      .get(templateId);
    if (existing) {
      db.prepare(
        `UPDATE entrega_template_user SET user_id = ?, name = ?, payload_json = ? WHERE template_id = ?`
      ).run(String(winner.user_id), winner.name, winner.payload_json, templateId);
    } else {
      try {
        db.prepare(
          `INSERT INTO entrega_template_user (template_id, user_id, name, payload_json, created_at)
           VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))`
        ).run(
          templateId,
          String(winner.user_id),
          winner.name,
          winner.payload_json,
          winner.created_at ? String(winner.created_at) : null
        );
      } catch (_err) {
        /* skip rows whose user_id still cannot be satisfied */
      }
    }
  }
}

function mergeEntregaTemplateTeam(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'template_id');
  const incomingById = indexBy(incomingRows, 'template_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  for (const templateId of allIds) {
    const winner = pickLastWriteRow(localById.get(templateId), incomingById.get(templateId), 'created_at');
    if (!winner?.team_id) continue;

    const existing = db
      .prepare(`SELECT template_id FROM entrega_template_team WHERE template_id = ?`)
      .get(templateId);
    if (existing) {
      db.prepare(
        `UPDATE entrega_template_team
         SET team_id = ?, name = ?, payload_json = ?, created_by = ?
         WHERE template_id = ?`
      ).run(
        String(winner.team_id),
        winner.name,
        winner.payload_json,
        winner.created_by ?? null,
        templateId
      );
    } else {
      try {
        db.prepare(
          `INSERT INTO entrega_template_team
             (template_id, team_id, name, payload_json, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
        ).run(
          templateId,
          String(winner.team_id),
          winner.name,
          winner.payload_json,
          winner.created_by ?? null,
          winner.created_at ? String(winner.created_at) : null
        );
      } catch (_err) {
        /* skip rows whose team_id still cannot be satisfied */
      }
    }
  }
}

function mergeTeamMembership(db, incomingRows) {
  const stmt = db.prepare(
    `INSERT INTO team_membership (team_id, user_id, sub_area_fraction) VALUES (?, ?, ?)
     ON CONFLICT(team_id, user_id) DO UPDATE SET
       sub_area_fraction = COALESCE(excluded.sub_area_fraction, team_membership.sub_area_fraction)`
  );
  for (const row of incomingRows) {
    if (!row?.team_id || !row?.user_id) continue;
    try {
      stmt.run(
        String(row.team_id),
        String(row.user_id),
        row.sub_area_fraction != null ? String(row.sub_area_fraction) : null
      );
    } catch (_err) {
      /* skip rows whose user_id still cannot be satisfied */
    }
  }
}

function mergePatientTeamAssignments(db, incomingRows) {
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
    } catch (_err) {
      /* skip rows whose patient_id / team_id still cannot be satisfied on this peer */
    }
  }
  return inserted;
}

function membershipPairKey(row) {
  const teamId = String(row?.team_id || '').trim();
  const userId = String(row?.user_id || '').trim();
  if (!teamId || !userId) return '';
  return `${teamId}\0${userId}`;
}

function buildMembershipPairKeySet(rows) {
  const keys = new Set();
  for (const row of rows || []) {
    const key = membershipPairKey(row);
    if (key) keys.add(key);
  }
  return keys;
}

function mergeMembershipRemovalsRows(localRows, incomingRows) {
  const map = new Map();
  for (const row of [...(localRows || []), ...(incomingRows || [])]) {
    const teamId = String(row?.team_id || '').trim();
    const userId = String(row?.user_id || '').trim();
    const removedAt = String(row?.removed_at || '').trim();
    if (!teamId || !userId || !removedAt) continue;
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || removedAt >= String(prev.removed_at || '')) {
      map.set(key, { team_id: teamId, user_id: userId, removed_at: removedAt });
    }
  }
  return [...map.values()];
}

function mergeMembershipRejoinsRows(localRows, incomingRows) {
  const map = new Map();
  for (const row of [...(localRows || []), ...(incomingRows || [])]) {
    const teamId = String(row?.team_id || '').trim();
    const userId = String(row?.user_id || '').trim();
    const joinedAt = String(row?.joined_at || '').trim();
    if (!teamId || !userId || !joinedAt) continue;
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || joinedAt >= String(prev.joined_at || '')) {
      map.set(key, { team_id: teamId, user_id: userId, joined_at: joinedAt });
    }
  }
  return [...map.values()];
}

/**
 * Drop stale leave tombstones when this peer or a fresher LAN join supersedes them.
 * @param {object} local
 * @param {object[]} mergedRemovals
 * @param {object[]} mergedRejoins
 */
/**
 * Drop leave tombstones that can no longer apply (deleted/missing users or teams).
 * @param {import('better-sqlite3').Database} db
 * @param {object[]} removals
 * @param {Set<string>} deletedSet
 */
function pruneStaleMembershipRemovals(db, removals, deletedSet) {
  const userExists = db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`);
  const teamExists = db.prepare(`SELECT 1 AS ok FROM teams WHERE team_id = ?`);
  return (removals || []).filter((row) => {
    const teamId = String(row?.team_id || '').trim();
    const userId = String(row?.user_id || '').trim();
    if (!teamId || !userId) return false;
    if (deletedSet.has(userId)) return false;
    if (!userExists.get(userId)) return false;
    if (!teamExists.get(teamId)) return false;
    return true;
  });
}

function reconcileMergedMembershipRemovals(local, mergedRemovals, mergedRejoins) {
  const localMembershipKeys = buildMembershipPairKeySet(local.team_membership);
  const localRemovalKeys = buildMembershipPairKeySet(local.team_membership_removals);
  const rejoinByKey = new Map();
  for (const row of mergedRejoins || []) {
    const key = membershipPairKey(row);
    if (!key) continue;
    const joinedAt = String(row.joined_at || '');
    const prev = rejoinByKey.get(key);
    if (!prev || joinedAt >= String(prev.joined_at || '')) {
      rejoinByKey.set(key, row);
    }
  }

  return (mergedRemovals || []).filter((row) => {
    const key = membershipPairKey(row);
    if (!key) return false;
    if (localMembershipKeys.has(key) && !localRemovalKeys.has(key)) return false;
    const rejoin = rejoinByKey.get(key);
    const removedAt = String(row.removed_at || '');
    const joinedAt = String(rejoin?.joined_at || '');
    if (rejoin && joinedAt && removedAt && joinedAt >= removedAt) return false;
    return true;
  });
}

function mergeTeamGuardiaToday(db, localRows, incomingRows) {
  const localByTeam = indexBy(localRows, 'team_id');
  const incomingByTeam = indexBy(incomingRows, 'team_id');
  const allTeams = new Set([...localByTeam.keys(), ...incomingByTeam.keys()]);

  for (const teamId of allTeams) {
    const winner = pickLastWriteRow(localByTeam.get(teamId), incomingByTeam.get(teamId), 'declared_at');
    if (!winner?.user_id) continue;
    try {
      setTeamGuardiaToday(db, teamId, String(winner.user_id));
    } catch (_err) {
      /* skip rows whose user_id / team_id still cannot be satisfied */
    }
  }
}

function mergeActiveGuardias(db, localRows, incomingRows) {
  const localByPatient = indexBy(localRows, 'patient_id');
  const incomingByPatient = indexBy(incomingRows, 'patient_id');
  const allPatients = new Set([...localByPatient.keys(), ...incomingByPatient.keys()]);

  for (const patientId of allPatients) {
    const winner = pickLastWriteRow(
      localByPatient.get(patientId),
      incomingByPatient.get(patientId),
      'assigned_at'
    );
    if (!winner) continue;
    try {
      upsertActiveGuardia(db, {
        patientId,
        coveringUserId: String(winner.covering_user_id || ''),
        sourceTeamId: String(winner.source_team_id || ''),
        guardiaId: winner.guardia_id ? String(winner.guardia_id) : undefined,
        isCritical: winner.is_critical,
        pendientesJson: winner.pendientes_json,
        vitalsFrequency: winner.vitals_frequency,
        lastVitalsCheck: winner.last_vitals_check ? String(winner.last_vitals_check) : undefined,
      });
    } catch (_err) {
      /* skip incomplete guardia rows from peer/host snapshots */
    }
  }
}

/** Null user FK when the referenced row is absent (tombstone / not yet merged). */
function resolveMergeUserFk(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return null;
  return db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid) ? uid : null;
}

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    if (row && row[key] != null) map.set(String(row[key]), row);
  }
  return map;
}

function pickLastWriteRow(localRow, incomingRow, tsField) {
  if (!localRow) return incomingRow || null;
  if (!incomingRow) return localRow;
  const a = String(localRow[tsField] || '');
  const b = String(incomingRow[tsField] || '');
  return b >= a ? incomingRow : localRow;
}

function teamRowVersion(row) {
  if (!row) return '';
  const stamps = [row.archived_at, row.updated_at, row.created_at]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return stamps.sort().pop() || '';
}

function pickTeamMergeWinner(localRow, incomingRow) {
  if (!localRow) return incomingRow || null;
  if (!incomingRow) return localRow;
  const a = teamRowVersion(localRow);
  const b = teamRowVersion(incomingRow);
  return b >= a ? incomingRow : localRow;
}
