import { tableExists } from './schema-primitives.mjs';
import { ROTACION_SALA_SLUGS } from '../clinical-salas.mjs';

/** New values per CHECK column: three rotation salas, one 'Rotación' team service. */
const ADD = { sala: Object.keys(ROTACION_SALA_SLUGS), service: ['Rotación'] };

/**
 * Rebuild one table from its own stored CREATE SQL with every sala/service
 * CHECK list widened by the ADD values. Keeps all columns, rows, foreign keys,
 * indexes and triggers. Skips a table that already allows them.
 * @param {import('better-sqlite3').Database} db @param {string} table
 */
function widenSalaChecks(db, table) {
  if (!tableExists(db, table)) return;
  const { sql } = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table);
  const widened = sql.replace(/CHECK\((sala|service) IN \(([^)]*)\)/g, (m, col, list) => {
    const missing = ADD[col].filter((v) => !list.includes(`'${v}'`));
    return missing.length ? `CHECK(${col} IN (${list}, ${missing.map((v) => `'${v}'`).join(', ')})` : m;
  });
  if (widened === sql) return;
  const tmp = `${table}_v30`;
  const createTmp = widened.replace(/^CREATE TABLE\s+("?)\w+\1/i, `CREATE TABLE ${tmp}`);
  const extras = db
    .prepare("SELECT sql FROM sqlite_master WHERE type IN ('index', 'trigger') AND tbl_name=? AND sql IS NOT NULL")
    .all(table)
    .map((r) => r.sql);
  db.exec(`${createTmp};
    INSERT INTO ${tmp} SELECT * FROM ${table};
    DROP TABLE ${table};
    ALTER TABLE ${tmp} RENAME TO ${table};`);
  for (const extra of extras) db.exec(extra);
}

/** Add the three 'Rotación …' salas (users, teams) and the 'Rotación' team service (teams). Run with foreign_keys OFF. */
export function migrateToV30RotacionSala(db) {
  widenSalaChecks(db, 'users');
  widenSalaChecks(db, 'teams');
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '31');
}
