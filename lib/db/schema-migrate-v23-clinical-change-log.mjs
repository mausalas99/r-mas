/** @param {import('better-sqlite3').Database} db */
export function migrateToV23ClinicalChangeLog(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clinical_change_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      change_id TEXT NOT NULL UNIQUE,
      command_type TEXT NOT NULL,
      blob_keys TEXT NOT NULL,
      patient_id TEXT,
      actor_id TEXT,
      created_at TEXT NOT NULL,
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_clinical_change_log_unsynced
      ON clinical_change_log(synced_at, id);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '23');
}
