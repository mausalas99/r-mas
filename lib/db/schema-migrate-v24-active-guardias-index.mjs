import { tableExists } from './schema-primitives.mjs';

/**
 * active_guardias never deletes rows (status flips Active -> Resolved), so
 * `WHERE status = 'Active'` lookups scan the whole history and get slower
 * every month. Same shape for team_membership/team_guardia_today lookups by
 * user_id, which only had composite/team-only keys.
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV24ActiveGuardiasIndex(db) {
  if (tableExists(db, 'active_guardias')) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_active_guardias_patient_status
        ON active_guardias(patient_id, status);
      CREATE INDEX IF NOT EXISTS idx_active_guardias_status_covering
        ON active_guardias(status, covering_user_id);
      CREATE INDEX IF NOT EXISTS idx_active_guardias_status_assigned
        ON active_guardias(status, assigned_at);
    `);
  }
  if (tableExists(db, 'team_membership')) {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_team_membership_user ON team_membership(user_id);`);
  }
  if (tableExists(db, 'team_guardia_today')) {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_team_guardia_today_user ON team_guardia_today(user_id);`);
  }
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '24');
}
