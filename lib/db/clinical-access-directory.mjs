import { canManageTeamRoster } from './clinical-privileges.mjs';
import {
  isDirectoryPendingUsername,
  isRegisteredClinicalUser,
  isValidUsernameFormat,
  normalizeUsername,
} from './clinical-username.mjs';
import {
  getClinicalProfile,
  listClinicalUserActivityHistoryByIds,
  listClinicalUsers,
} from './clinical-access-users.mjs';
/**
 * Users visible in the LAN directory: everyone who registered (@usuario or nombre clínico),
 * plus teammates synced from LAN who only appear via membership stubs.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function listDirectoryUsers(db) {
  const deletedIds = new Set(getDeletedUserIds(db));
  const onActiveTeam = db
    .prepare(
      `SELECT 1 AS ok FROM team_membership tm
       JOIN teams t ON t.team_id = tm.team_id
       WHERE tm.user_id = ? AND t.archived_at IS NULL
       LIMIT 1`
    )
    .pluck(true);

  /** @type {Map<string, object>} */
  const byId = new Map();

  for (const row of listClinicalUsers(db)) {
    const handle = normalizeUsername(row?.username || '');
    const uid = String(row.user_id || '');
    if (!uid || deletedIds.has(uid)) continue;

    if (isRegisteredClinicalUser(row)) {
      const claimed =
        isValidUsernameFormat(handle) && !isDirectoryPendingUsername(handle);
      byId.set(uid, {
        ...row,
        username: handle,
        lanDirectoryPending: !claimed,
      });
      continue;
    }

    const onTeam = !!onActiveTeam.get(uid);
    if (!onTeam) continue;

    byId.set(uid, {
      ...row,
      username: handle,
      lanDirectoryPending: true,
    });
  }

  const listed = [...byId.values()].sort((a, b) => {
    const ha = normalizeUsername(a.username || '');
    const hb = normalizeUsername(b.username || '');
    if (ha && hb) return ha.localeCompare(hb);
    if (ha) return -1;
    if (hb) return 1;
    return String(a.clinical_name || '').localeCompare(String(b.clinical_name || ''), 'es');
  });

  const historyById = listClinicalUserActivityHistoryByIds(
    db,
    listed.map((u) => String(u.user_id || '')),
    12
  );
  return listed.map((u) => ({
    ...u,
    activity_history: historyById.get(String(u.user_id || '')) || [],
  }));
}

const META_LAN_DELETED_USER_IDS = 'lan_clinical_users_deleted';
const META_LAN_MEMBERSHIP_REMOVALS = 'lan_team_membership_removals';
const META_LAN_MEMBERSHIP_REJOINS = 'lan_team_membership_rejoins';
const META_LAN_ARCHIVED_TEAMS = 'lan_teams_archived';

/** @param {import('better-sqlite3').Database} db */
export function getMembershipRemovals(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_MEMBERSHIP_REMOVALS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        team_id: String(row?.team_id || '').trim(),
        user_id: String(row?.user_id || '').trim(),
        removed_at: String(row?.removed_at || '').trim(),
      }))
      .filter((row) => row.team_id && row.user_id && row.removed_at);
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {object[]} rows */
export function persistMembershipRemovals(db, rows) {
  const map = new Map();
  for (const row of rows || []) {
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
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_MEMBERSHIP_REMOVALS, JSON.stringify([...map.values()]));
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function recordMembershipRemoval(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getMembershipRemovals(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  next.push({ team_id: tid, user_id: uid, removed_at: new Date().toISOString() });
  persistMembershipRemovals(db, next);
}

/** @param {import('better-sqlite3').Database} db */
export function getMembershipRejoins(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_MEMBERSHIP_REJOINS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        team_id: String(row?.team_id || '').trim(),
        user_id: String(row?.user_id || '').trim(),
        joined_at: String(row?.joined_at || '').trim(),
      }))
      .filter((row) => row.team_id && row.user_id && row.joined_at);
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {object[]} rows */
export function persistMembershipRejoins(db, rows) {
  const map = new Map();
  for (const row of rows || []) {
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
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_MEMBERSHIP_REJOINS, JSON.stringify([...map.values()]));
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function recordMembershipRejoin(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getMembershipRejoins(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  let joinedAt = new Date().toISOString();
  // Rejoin must be strictly after any leave tombstone (reconcile uses `>`).
  const priorLeave = getMembershipRemovals(db).find(
    (row) => row.team_id === tid && row.user_id === uid
  );
  const leftAt = String(priorLeave?.removed_at || '');
  if (leftAt && joinedAt <= leftAt) {
    const ms = Date.parse(leftAt);
    joinedAt = Number.isFinite(ms)
      ? new Date(ms + 1).toISOString()
      : new Date(Date.now() + 1).toISOString();
  }
  next.push({ team_id: tid, user_id: uid, joined_at: joinedAt });
  persistMembershipRejoins(db, next);
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function clearMembershipRejoin(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getMembershipRejoins(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  persistMembershipRejoins(db, next);
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function clearMembershipRemoval(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getMembershipRemovals(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  persistMembershipRemovals(db, next);
}

/** @param {import('better-sqlite3').Database} db @param {object[]} removals */
export function applyMembershipRemovals(db, removals) {
  const stmt = db.prepare(`DELETE FROM team_membership WHERE team_id = ? AND user_id = ?`);
  for (const row of removals || []) {
    const tid = String(row?.team_id || '').trim();
    const uid = String(row?.user_id || '').trim();
    if (!tid || !uid) continue;
    stmt.run(tid, uid);
  }
}

/** @param {import('better-sqlite3').Database} db */
/** @param {import('better-sqlite3').Database} db */
export function getArchivedTeamsMeta(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_ARCHIVED_TEAMS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        team_id: String(row?.team_id || '').trim(),
        archived_at: String(row?.archived_at || '').trim(),
      }))
      .filter((row) => row.team_id && row.archived_at);
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {object[]} rows */
export function persistArchivedTeamsMeta(db, rows) {
  const map = new Map();
  for (const row of rows || []) {
    const teamId = String(row?.team_id || '').trim();
    const archivedAt = String(row?.archived_at || '').trim();
    if (!teamId || !archivedAt) continue;
    const prev = map.get(teamId);
    if (!prev || archivedAt >= String(prev.archived_at || '')) {
      map.set(teamId, { team_id: teamId, archived_at: archivedAt });
    }
  }
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_ARCHIVED_TEAMS, JSON.stringify([...map.values()]));
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} [archivedAt] */
export function recordTeamArchive(db, teamId, archivedAt) {
  const tid = String(teamId || '').trim();
  if (!tid) return;
  const at = String(archivedAt || '').trim() || new Date().toISOString();
  const next = getArchivedTeamsMeta(db).filter((row) => row.team_id !== tid);
  next.push({ team_id: tid, archived_at: at });
  persistArchivedTeamsMeta(db, next);
}

export function getDeletedUserIds(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_DELETED_USER_IDS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {string[]} ids */
function persistLanDeletedUserIds(db, ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_DELETED_USER_IDS, JSON.stringify(unique));
}

/** @param {import('better-sqlite3').Database} db @param {string} userId */
function addLanDeletedUserId(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return;
  const next = getDeletedUserIds(db);
  if (!next.includes(uid)) next.push(uid);
  persistLanDeletedUserIds(db, next);
}

/**
 * Drop FK references then remove the user row (no permission checks).
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function purgeClinicalUserFromDb(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return;
  if (!db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid)) return;

  db.prepare(`DELETE FROM team_membership WHERE user_id = ?`).run(uid);
  db.prepare(`DELETE FROM team_guardia_today WHERE user_id = ?`).run(uid);
  db.prepare(`UPDATE teams SET created_by = NULL WHERE created_by = ?`).run(uid);
  db.prepare(`UPDATE teams SET leader_user_id = NULL WHERE leader_user_id = ?`).run(uid);
  db.prepare(`UPDATE rotation_cycles SET created_by = NULL WHERE created_by = ?`).run(uid);
  if (tableExists(db, 'sala_interno_access')) {
    db.prepare(`UPDATE sala_interno_access SET rotated_by = NULL WHERE rotated_by = ?`).run(uid);
  }
  db.prepare(`DELETE FROM users WHERE user_id = ?`).run(uid);
  purgeMembershipMetaForUser(db, uid);
}

/** Drop LAN leave/rejoin meta rows for a purged or deleted user. */
export function purgeMembershipMetaForUser(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return;
  const dropUser = (rows) =>
    (rows || []).filter((row) => String(row?.user_id || '').trim() !== uid);
  persistMembershipRemovals(db, dropUser(getMembershipRemovals(db)));
  persistMembershipRejoins(db, dropUser(getMembershipRejoins(db)));
}

function tableExists(db, name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
}

/**
 * Admin removes a LAN directory user on this Mac; tombstone prevents LAN merge from re-adding.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ targetUserId: string, callerUserId: string }} opts
 */
/**
 * Union LAN tombstones and purge deleted users so peers cannot re-add via merge.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 * @param {object} [localSnapshot]
 */
export function applyDeletedUsersFromSnapshot(db, incoming, localSnapshot = null) {
  const localIds = Array.isArray(localSnapshot?.clinical_users_deleted)
    ? localSnapshot.clinical_users_deleted
    : getDeletedUserIds(db);
  const incomingIds = Array.isArray(incoming?.clinical_users_deleted)
    ? incoming.clinical_users_deleted
    : [];
  const resurrected = new Set(
    (incoming?.clinical_users || [])
      .map((row) => String(row?.user_id || '').trim())
      .filter(Boolean)
  );
  const merged = [
    ...new Set(
      [...getDeletedUserIds(db), ...localIds, ...incomingIds]
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    ),
  ];
  persistLanDeletedUserIds(db, merged);
  let purged = 0;
  let resurrectedCount = 0;
  for (const uid of merged) {
    if (resurrected.has(uid)) {
      resurrectedCount += 1;
      continue;
    }
    db.prepare(`DELETE FROM team_membership WHERE user_id = ?`).run(uid);
    const had = db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid);
    purgeClinicalUserFromDb(db, uid);
    if (had) purged += 1;
  }
  return { purged, resurrected: resurrectedCount };
}

export function deleteDirectoryUser(db, { targetUserId, callerUserId }) {
  const caller = getClinicalProfile(db, String(callerUserId || ''));
  if (!canManageTeamRoster(caller)) {
    throw new Error(
      'Solo R4, Admin o usuarios con privilegios de administración pueden eliminar usuarios LAN.'
    );
  }
  const uid = String(targetUserId || '').trim();
  const callerId = String(callerUserId || '').trim();
  if (!uid) throw new Error('Usuario no indicado.');
  if (callerId && uid === callerId) {
    throw new Error('No puedes eliminar tu propio usuario clínico en esta Mac.');
  }
  if (!db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid)) {
    throw new Error('Usuario no encontrado en esta Mac.');
  }

  const memberships = db
    .prepare(`SELECT team_id FROM team_membership WHERE user_id = ?`)
    .all(uid);
  for (const row of memberships) {
    recordMembershipRemoval(db, String(row.team_id || ''), uid);
  }
  db.prepare(`DELETE FROM team_membership WHERE user_id = ?`).run(uid);

  addLanDeletedUserId(db, uid);
  purgeClinicalUserFromDb(db, uid);
  return { userId: uid, deleted: true };
}
