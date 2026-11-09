import { normalizeEquiposDeviceType } from './equipos-constants.mjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} deviceType
 */
export function listWaitlistRowsSync(db, deviceType) {
  const d = normalizeEquiposDeviceType(deviceType);
  if (!d) return [];
  return db
    .prepare(
      `SELECT reporter_name, rotation, position FROM equipos_waitlist
       WHERE device_type = ? ORDER BY position ASC`
    )
    .all(d);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} deviceType
 * @param {string} name
 * @param {string} rot
 */
export function listPushSubsForWaiterSync(db, deviceType, name, rot) {
  const d = normalizeEquiposDeviceType(deviceType);
  if (!d) return [];
  return db
    .prepare(
      `SELECT id, endpoint, p256dh, auth FROM equipos_push_subscriptions
       WHERE device_type = ? AND reporter_name = ? AND rotation = ?`
    )
    .all(d, name, rot);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} subId
 */
export function deletePushSubSync(db, subId) {
  db.prepare(`DELETE FROM equipos_push_subscriptions WHERE id = ?`).run(subId);
}
