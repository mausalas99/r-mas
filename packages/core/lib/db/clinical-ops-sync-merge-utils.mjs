import {
  indexBy,
  pickLastWriteRow,
  pickTeamMergeWinner,
  membershipPairKey,
  mergeTeamsArchivedRows as mergeTeamsArchivedRowsShared,
} from './clinical-ops-merge-primitives.cjs';

export { indexBy, pickLastWriteRow, pickTeamMergeWinner, membershipPairKey };

/** Null user FK when the referenced row is absent (tombstone / not yet merged). */
export function resolveMergeUserFk(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return null;
  return db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid) ? uid : null;
}

export function buildMembershipPairKeySet(rows) {
  const keys = new Set();
  for (const row of rows || []) {
    const key = membershipPairKey(row);
    if (key) keys.add(key);
  }
  return keys;
}

function membershipPairFromRow(row, tsField) {
  const teamId = String(row?.team_id || '').trim();
  const userId = String(row?.user_id || '').trim();
  const stampedAt = String(row?.[tsField] || '').trim();
  if (!teamId || !userId || !stampedAt) return null;
  return { teamId, userId, stampedAt, row: { team_id: teamId, user_id: userId, [tsField]: stampedAt } };
}

function mergeMembershipPairRows(localRows, incomingRows, tsField) {
  const map = new Map();
  for (const row of [...(localRows || []), ...(incomingRows || [])]) {
    const parsed = membershipPairFromRow(row, tsField);
    if (!parsed) continue;
    const key = `${parsed.teamId}\0${parsed.userId}`;
    const prev = map.get(key);
    if (!prev || parsed.stampedAt >= String(prev[tsField] || '')) {
      map.set(key, parsed.row);
    }
  }
  return [...map.values()];
}

export function mergeMembershipRemovalsRows(localRows, incomingRows) {
  return mergeMembershipPairRows(localRows, incomingRows, 'removed_at');
}

export function mergeMembershipRejoinsRows(localRows, incomingRows) {
  return mergeMembershipPairRows(localRows, incomingRows, 'joined_at');
}

export function mergeTeamsArchivedRows(localRows, incomingRows) {
  return mergeTeamsArchivedRowsShared(localRows, incomingRows);
}
