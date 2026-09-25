import { tableExists } from './schema-primitives.mjs';

/**
 * teams.succeeds_team_id — set on a staged (next rotation) team to point at
 * the active team it replaces. Read by archiveRotationAndTeams to carry
 * patients over automatically the moment "Iniciar nueva rotación" runs.
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV26TeamsSucceedsTeamId(db) {
  if (tableExists(db, 'teams')) {
    const cols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    if (!cols.includes('succeeds_team_id')) {
      db.exec('ALTER TABLE teams ADD COLUMN succeeds_team_id TEXT REFERENCES teams(team_id)');
    }
  }
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '26');
}
