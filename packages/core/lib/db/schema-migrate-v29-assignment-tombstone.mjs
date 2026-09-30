import { tableExists } from './schema-primitives.mjs';

/**
 * A patient with no team is a row with team_id '' (newest effective_at wins, like any
 * assignment). The row must sync to peers, so it cannot point at teams(team_id):
 * rebuild patient_team_assignment without that foreign key. Skips a table already rebuilt.
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV29AssignmentTombstone(db) {
  if (tableExists(db, 'patient_team_assignment')) {
    const { sql } = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='patient_team_assignment'")
      .get();
    if (/REFERENCES\s+"?teams\b/i.test(sql)) {
      db.exec(`
        CREATE TABLE patient_team_assignment_v29 (
          patient_id TEXT NOT NULL,
          team_id TEXT NOT NULL,
          effective_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (patient_id, team_id, effective_at),
          FOREIGN KEY(patient_id) REFERENCES patients(id)
        );
        INSERT INTO patient_team_assignment_v29 (patient_id, team_id, effective_at, created_at)
          SELECT patient_id, team_id, effective_at, created_at FROM patient_team_assignment;
        DROP TABLE patient_team_assignment;
        ALTER TABLE patient_team_assignment_v29 RENAME TO patient_team_assignment;
      `);
    }
  }
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '29');
}
