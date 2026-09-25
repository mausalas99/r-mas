import { tableExists } from './schema-primitives.mjs';

/** @param {import('better-sqlite3').Database} db @param {string} table @param {string} column */
function addTextColumn(db, table, column) {
  if (!tableExists(db, table)) return;
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
}

/**
 * Write clocks for rows that two devices edit and Nube merges:
 * - team_membership.cycle_set_at — when the member's cycle letter was set, so a
 *   resident's «Mi ciclo» change is not reverted by a peer's older copy.
 * - active_guardias.updated_at — when the handoff was last edited. assigned_at
 *   never moves on an edit, so the R1's changes lost to the R2's older copy.
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV28SyncWriteClocks(db) {
  addTextColumn(db, 'team_membership', 'cycle_set_at');
  addTextColumn(db, 'active_guardias', 'updated_at');
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '28');
}
