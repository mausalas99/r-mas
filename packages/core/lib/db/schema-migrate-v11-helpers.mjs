import crypto from 'node:crypto';
import { CLINICAL_SALA_VALUES } from '../clinical-salas.mjs';
import { tableExists } from './schema-primitives.mjs';

/** SQL CASE remapping any sala value outside CLINICAL_SALA_VALUES to the first current value (NULL stays NULL). */
function salaRemapCase() {
  const salaList = CLINICAL_SALA_VALUES.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(', ');
  const fallback = String(CLINICAL_SALA_VALUES[0]).replace(/'/g, "''");
  return `CASE WHEN sala IS NULL THEN NULL WHEN sala IN (${salaList}) THEN sala ELSE '${fallback}' END`;
}

/** @param {import('better-sqlite3').Database} db @param {string} salaCheck */
export function migrateUsersTableV11(db, salaCheck) {
  if (!tableExists(db, 'users')) return;
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const lastActivityCol = userCols.includes('last_activity_at') ? ', last_activity_at TEXT' : '';
  const lastActivityList = userCols.includes('last_activity_at') ? ', last_activity_at' : '';
  db.exec(`
    CREATE TABLE users_v11 (
      user_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rank TEXT NOT NULL CHECK(rank IN ('R1', 'R2', 'R3', 'R4', 'Admin')),
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      clinical_name TEXT,
      sala TEXT ${salaCheck},
      is_program_admin INTEGER NOT NULL DEFAULT 0${lastActivityCol}
    );
    INSERT INTO users_v11 (
      user_id, username, password_hash, rank, public_key, encrypted_private_key,
      created_at, clinical_name, sala, is_program_admin${lastActivityList}
    )
    SELECT
      user_id, username, password_hash, rank, public_key, encrypted_private_key,
      created_at, clinical_name, ${salaRemapCase()}, is_program_admin${lastActivityList}
    FROM users;
    DROP TABLE users;
    ALTER TABLE users_v11 RENAME TO users;
  `);
}

/** @param {import('better-sqlite3').Database} db @param {string} salaCheck */
export function migrateTeamsTableV11(db, salaCheck) {
  if (!tableExists(db, 'teams')) return;
  const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  const updatedAtCol = teamCols.includes('updated_at') ? ', updated_at TEXT' : '';
  const updatedAtList = teamCols.includes('updated_at') ? ', updated_at' : '';
  db.exec(`
    CREATE TABLE teams_v11 (
      team_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service TEXT NOT NULL CHECK(service IN ('Sala', 'Torre HU', 'Eme', 'UX', 'Interconsultas', 'Área A/Pensionistas')),
      sub_area_fraction TEXT,
      on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6),
      created_by TEXT,
      sala TEXT ${salaCheck},
      team_leader_name TEXT,
      leader_user_id TEXT REFERENCES users(user_id),
      rotation_active INTEGER NOT NULL DEFAULT 1 CHECK(rotation_active IN (0, 1)),
      archived_at TEXT${updatedAtCol},
      FOREIGN KEY(created_by) REFERENCES users(user_id)
    );
    INSERT INTO teams_v11 (
      team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
      sala, team_leader_name, leader_user_id, rotation_active, archived_at${updatedAtList}
    )
    SELECT
      team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
      ${salaRemapCase()}, team_leader_name, leader_user_id, rotation_active, archived_at${updatedAtList}
    FROM teams;
    DROP TABLE teams;
    ALTER TABLE teams_v11 RENAME TO teams;
  `);
}

/** @param {import('better-sqlite3').Database} db @param {string} salaCheckNotNull */
export function migrateSalaInternoAccessV11(db, salaCheckNotNull) {
  if (tableExists(db, 'sala_interno_access')) {
    // Old rows may hold a sala value the current CLINICAL_SALA_VALUES no longer
    // includes (e.g. R+ HF shrank the list to a single unit). Remap those to
    // the first current value instead of failing the rebuild's new CHECK, and
    // dedupe on the PK (prefer the active, most recently rotated token).
    const salaList = CLINICAL_SALA_VALUES.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(', ');
    const fallback = String(CLINICAL_SALA_VALUES[0]).replace(/'/g, "''");
    db.exec(`
      CREATE TABLE sala_interno_access_v11 (
        sala TEXT PRIMARY KEY ${salaCheckNotNull},
        access_token TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
        rotated_at TEXT,
        rotated_by TEXT,
        FOREIGN KEY(rotated_by) REFERENCES users(user_id)
      );
      INSERT OR IGNORE INTO sala_interno_access_v11 (sala, access_token, is_active, rotated_at, rotated_by)
      SELECT
        CASE WHEN sala IN (${salaList}) THEN sala ELSE '${fallback}' END,
        access_token, is_active, rotated_at, rotated_by
      FROM sala_interno_access
      ORDER BY is_active DESC, rotated_at DESC;
      DROP TABLE sala_interno_access;
      ALTER TABLE sala_interno_access_v11 RENAME TO sala_interno_access;
    `);
    return;
  }
  db.exec(`
    CREATE TABLE sala_interno_access (
      sala TEXT PRIMARY KEY ${salaCheckNotNull},
      access_token TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      rotated_at TEXT,
      rotated_by TEXT,
      FOREIGN KEY(rotated_by) REFERENCES users(user_id)
    );
  `);
}

/** @param {import('better-sqlite3').Database} db */
export function seedSalaInternoTokensV11(db) {
  const insertInterno = db.prepare(
    `INSERT OR IGNORE INTO sala_interno_access (sala, access_token, is_active)
     VALUES (?, ?, 1)`
  );
  for (const sala of CLINICAL_SALA_VALUES) {
    insertInterno.run(sala, crypto.randomBytes(32).toString('hex'));
  }
}
