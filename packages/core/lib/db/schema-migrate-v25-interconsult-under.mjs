import { tableExists } from './schema-primitives.mjs';

const OLD_CHECK = /CHECK\s*\(\s*interconsult_type\s+IN\s*\([^)]*\)\s*\)/i;
const NEW_CHECK = "CHECK(interconsult_type IN ('Ephemeral_VPO', 'Follow-up', 'None', 'Under'))";

/**
 * Widen patients.interconsult_type CHECK to add 'Under'.
 * SQLite can't ALTER a CHECK constraint, so rebuild the table — but `patients` is a wide
 * table grown via incremental ALTER TABLE ADD COLUMN (not one static CREATE TABLE), so the
 * rebuild reuses its ACTUAL sqlite_master DDL (every real column/type/CHECK/DEFAULT) and only
 * text-replaces the one CHECK clause we're widening. Do not hand-list columns here — a prior
 * version of this migration hardcoded a handful of columns and would have dropped every other
 * patient field (name, room, clinical blobs, everything) on first run.
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV25InterconsultUnder(db) {
  if (tableExists(db, 'patients')) {
    const cols = db.prepare('PRAGMA table_info(patients)').all().map((c) => c.name);
    if (cols.includes('interconsult_type')) {
      const { sql: originalSql } = db
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='patients'")
        .get();
      if (!OLD_CHECK.test(originalSql)) {
        throw new Error(
          'migrateToV25InterconsultUnder: could not find interconsult_type CHECK in patients DDL, aborting to avoid dropping columns'
        );
      }
      const widenedSql = originalSql
        .replace(OLD_CHECK, NEW_CHECK)
        .replace(/CREATE TABLE\s+"?patients\b"?/i, 'CREATE TABLE patients_v25');
      db.exec(`
        ${widenedSql};
        INSERT INTO patients_v25 SELECT * FROM patients;
        DROP TABLE patients;
        ALTER TABLE patients_v25 RENAME TO patients;
      `);
    }
  }
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '25');
}
