import { membershipPairKey } from './clinical-ops-sync-merge-utils.mjs';
import { normalizeUsername } from './clinical-username.mjs';
import { removeTeamMember } from './clinical-access-teams-membership.mjs';

/** @param {object[]} incomingClinicalUsers */
function incomingClinicalUsersById(incomingClinicalUsers) {
  const map = new Map();
  for (const row of incomingClinicalUsers || []) {
    const id = String(row?.user_id || '').trim();
    if (id) map.set(id, row);
  }
  return map;
}

/**
 * Directorio LAN assigns members with the host's user_id. Remap to this Mac's canonical
 * row when the same @username already exists under a different user_id.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} incomingUserId
 * @param {Map<string, object>} incomingUsersById
 */
export function resolveLocalUserIdForLanMembership(db, incomingUserId, incomingUsersById) {
  const uid = String(incomingUserId || '').trim();
  if (!uid) return uid;

  const incomingRow = incomingUsersById.get(uid);
  const handle = normalizeUsername(incomingRow?.username || '');
  if (handle) {
    const local = db
      .prepare(`SELECT user_id FROM users WHERE username = ? COLLATE NOCASE`)
      .get(handle);
    const localId = local?.user_id ? String(local.user_id) : '';
    if (localId && localId !== uid) return localId;
  }

  if (db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid)) return uid;
  return uid;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object[]} rows
 * @param {object[]} incomingClinicalUsers
 */
export function remapIncomingTeamMembershipUserIds(db, rows, incomingClinicalUsers) {
  const byId = incomingClinicalUsersById(incomingClinicalUsers);
  return (rows || []).map((row) => {
    const incomingId = String(row?.user_id || '').trim();
    const localId = resolveLocalUserIdForLanMembership(db, incomingId, byId);
    if (!localId || localId === incomingId) return row;
    return { ...row, user_id: localId };
  });
}

export function filterIncomingTeamMembership(rows, deletedSet, removalKeys, archivedTeamIds) {
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

/**
 * Admin assigns on another Mac cannot tombstone memberships on teams that only exist
 * locally (e.g. resident self-created "DR AIRON"). When incoming membership names the
 * canonical team(s) for a user, drop other local memberships for that user.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object[]} incomingMembershipRows — remapped incoming team_membership
 * @returns {number} memberships removed
 */
/** @param {object[]} incomingMembershipRows */
function incomingTeamIdsByUser(incomingMembershipRows) {
  const incomingByUser = new Map();
  for (const row of incomingMembershipRows || []) {
    const uid = String(row?.user_id || '').trim();
    const tid = String(row?.team_id || '').trim();
    if (!uid || !tid) continue;
    if (!incomingByUser.has(uid)) incomingByUser.set(uid, new Set());
    incomingByUser.get(uid).add(tid);
  }
  return incomingByUser;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} uid
 * @param {Set<string>} teamIds
 */
function removeNonCanonicalMemberships(db, uid, teamIds) {
  const localRows = db.prepare(`SELECT team_id FROM team_membership WHERE user_id = ?`).all(uid);
  let removed = 0;
  for (const row of localRows) {
    const localTeamId = String(row?.team_id || '').trim();
    if (!localTeamId || teamIds.has(localTeamId)) continue;
    removeTeamMember(db, localTeamId, uid);
    removed += 1;
  }
  return removed;
}

export function reconcileExclusiveMembershipFromIncoming(db, incomingMembershipRows) {
  const incomingByUser = incomingTeamIdsByUser(incomingMembershipRows);
  let removed = 0;
  for (const [uid, teamIds] of incomingByUser) {
    if (!teamIds.size) continue;
    removed += removeNonCanonicalMemberships(db, uid, teamIds);
  }
  return removed;
}

export function mergeTeamMembership(db, incomingRows) {
  const existsStmt = db.prepare(
    `SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`
  );
  const stmt = db.prepare(
    `INSERT INTO team_membership (team_id, user_id, sub_area_fraction) VALUES (?, ?, ?)
     ON CONFLICT(team_id, user_id) DO UPDATE SET
       sub_area_fraction = COALESCE(excluded.sub_area_fraction, team_membership.sub_area_fraction)`
  );
  let inserted = 0;
  for (const row of incomingRows) {
    if (!row?.team_id || !row?.user_id) continue;
    const teamId = String(row.team_id);
    const userId = String(row.user_id);
    const hadRow = !!existsStmt.get(teamId, userId);
    try {
      stmt.run(
        teamId,
        userId,
        row.sub_area_fraction != null ? String(row.sub_area_fraction) : null
      );
      if (!hadRow) inserted += 1;
    } catch {
      /* skip rows whose user_id still cannot be satisfied */
    }
  }
  return inserted;
}

/**
 * Drop leave tombstones that can no longer apply (deleted/missing users or teams).
 * @param {import('better-sqlite3').Database} db
 * @param {object[]} removals
 * @param {Set<string>} deletedSet
 */
export function pruneStaleMembershipRemovals(db, removals, deletedSet) {
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

/**
 * Keep leave tombstones unless a rejoin is newer. Do NOT drop an incoming leave
 * just because this Mac still has the membership row — that is exactly how
 * admin reassignments (move off team A → team B) propagate to peers.
 */
export function reconcileMergedMembershipRemovals(_local, mergedRemovals, mergedRejoins) {
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
    const rejoin = rejoinByKey.get(key);
    const removedAt = String(row.removed_at || '');
    const joinedAt = String(rejoin?.joined_at || '');
    // Strictly newer rejoin wins. Equal clocks prefer the leave so an admin
    // reassignment in the same millisecond as the peer's old join still applies.
    if (rejoin && joinedAt && removedAt && joinedAt > removedAt) return false;
    return true;
  });
}
