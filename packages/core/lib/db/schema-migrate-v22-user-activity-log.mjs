import { tableExists } from './schema-primitives.mjs';

/** @param {import('better-sqlite3').Database} db */
function ensureUserActivityLogTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      at_iso TEXT NOT NULL,
      source TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_at
      ON user_activity_log(user_id, at_iso DESC);
  `);
}

/**
 * @param {import('better-sqlite3').Statement} insert
 * @param {import('better-sqlite3').Statement} exists
 * @param {{ user_id: string, created_at?: string, last_activity_at?: string }} user
 * @param {{ hasCreated: boolean, hasLast: boolean }} cols
 */
function seedUserActivityFromRow(insert, exists, user, { hasCreated, hasLast }) {
  const uid = String(user.user_id || '').trim();
  if (!uid) return;
  const created = hasCreated ? normalizeActivityIso(user.created_at) : '';
  const last = hasLast ? normalizeActivityIso(user.last_activity_at) : '';
  if (created && !exists.get(uid, created)) {
    insert.run(uid, created, 'seed_created');
  }
  if (last && last !== created && !exists.get(uid, last)) {
    insert.run(uid, last, 'seed_last');
  }
}

/** @param {import('better-sqlite3').Database} db */
function backfillUserActivityLogFromUsers(db) {
  if (!tableExists(db, 'users')) return;
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const hasCreated = cols.includes('created_at');
  const hasLast = cols.includes('last_activity_at');
  if (!hasCreated && !hasLast) return;

  const selectCols = ['user_id'];
  if (hasCreated) selectCols.push('created_at');
  if (hasLast) selectCols.push('last_activity_at');
  const users = db.prepare(`SELECT ${selectCols.join(', ')} FROM users`).all();
  const insert = db.prepare(
    `INSERT INTO user_activity_log (user_id, at_iso, source) VALUES (?, ?, ?)`
  );
  const exists = db.prepare(
    `SELECT 1 AS ok FROM user_activity_log WHERE user_id = ? AND at_iso = ? LIMIT 1`
  );
  const colFlags = { hasCreated, hasLast };
  for (const user of users) {
    seedUserActivityFromRow(insert, exists, user, colFlags);
  }
}

/**
 * Persist per-user activity history (not only last_activity_at).
 * Seeds from users.created_at + users.last_activity_at so Equipos can show histórico.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV22UserActivityLog(db) {
  ensureUserActivityLogTable(db);
  backfillUserActivityLogFromUsers(db);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '22');
}

/** @param {unknown} raw */
function normalizeActivityIso(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const ms = Date.parse(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  if (!Number.isFinite(ms)) {
    const loose = Date.parse(s);
    if (!Number.isFinite(loose)) return s;
    return new Date(loose).toISOString();
  }
  return new Date(ms).toISOString();
}
