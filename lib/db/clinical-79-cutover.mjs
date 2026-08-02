/**
 * 7.9 pilot cutover: purge all clinical users + memberships.
 * Keeps teams rows and patient_team_assignment (FK-safe) and patient blobs.
 */
import { purgeClinicalUserFromDb } from './clinical-access-lan.mjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @returns {{ purgedUserIds: string[], count: number }}
 */
export function wipeClinicalUsersFor79Cutover(db) {
  const rows = db.prepare(`SELECT user_id FROM users`).all();
  const purgedUserIds = [];
  for (const row of rows) {
    const uid = String(row?.user_id || '').trim();
    if (!uid) continue;
    purgeClinicalUserFromDb(db, uid);
    purgedUserIds.push(uid);
  }
  // Clear membership leftovers (paranoia)
  db.prepare(`DELETE FROM team_membership`).run();
  db.prepare(`DELETE FROM team_guardia_today`).run();
  return { purgedUserIds, count: purgedUserIds.length };
}
