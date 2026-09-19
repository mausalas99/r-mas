import { CLINICAL_SALA_VALUES, clinicalSalaSqlCheck } from '../clinical-salas.mjs';
import { tableExists } from './schema-primitives.mjs';

/** R+ HF has one team/unit — collapse to the single value, remapping any legacy IM sala. */
const SINGLE_SALA = CLINICAL_SALA_VALUES[0];

/** @param {import('better-sqlite3').Database} db */
function rebuildUsersTableV25(db) {
  if (!tableExists(db, 'users')) return;
  const salaCheck = clinicalSalaSqlCheck({ allowNull: true });
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const lastActivityCol = cols.includes('last_activity_at') ? ', last_activity_at TEXT' : '';
  const lastActivityList = cols.includes('last_activity_at') ? ', last_activity_at' : '';
  db.exec(`
    CREATE TABLE users_v25 (
      user_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rank TEXT NOT NULL CHECK(rank IN ('Admin', 'Team')),
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      clinical_name TEXT,
      sala TEXT ${salaCheck},
      is_program_admin INTEGER NOT NULL DEFAULT 0${lastActivityCol}
    );
    INSERT INTO users_v25 (
      user_id, username, password_hash, rank, public_key, encrypted_private_key,
      created_at, clinical_name, sala, is_program_admin${lastActivityList}
    )
    SELECT
      user_id, username, password_hash, rank, public_key, encrypted_private_key,
      created_at, clinical_name,
      CASE WHEN sala IS NULL THEN NULL ELSE '${SINGLE_SALA}' END,
      is_program_admin${lastActivityList}
    FROM users;
    DROP TABLE users;
    ALTER TABLE users_v25 RENAME TO users;
  `);
}

/** @param {import('better-sqlite3').Database} db */
function rebuildTeamsTableV25(db) {
  if (!tableExists(db, 'teams')) return;
  const salaCheck = clinicalSalaSqlCheck({ allowNull: true });
  const cols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  const updatedAtCol = cols.includes('updated_at') ? ', updated_at TEXT' : '';
  const updatedAtList = cols.includes('updated_at') ? ', updated_at' : '';
  db.exec(`
    CREATE TABLE teams_v25 (
      team_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service TEXT NOT NULL CHECK(service = 'HF'),
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
    INSERT INTO teams_v25 (
      team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
      sala, team_leader_name, leader_user_id, rotation_active, archived_at${updatedAtList}
    )
    SELECT
      team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
      CASE WHEN sala IS NULL THEN NULL ELSE '${SINGLE_SALA}' END,
      team_leader_name, leader_user_id, rotation_active, archived_at${updatedAtList}
    FROM teams;
    DROP TABLE teams;
    ALTER TABLE teams_v25 RENAME TO teams;
  `);
}

/**
 * sala_interno_access PK is `sala`, NOT NULL — collapsing 8 values to 1 means
 * several old rows would collide on the new PK. Keep at most one row (prefer
 * active, then most recently rotated) so an existing access token survives.
 * @param {import('better-sqlite3').Database} db
 */
function rebuildSalaInternoAccessV25(db) {
  if (!tableExists(db, 'sala_interno_access')) return;
  const salaCheckNotNull = clinicalSalaSqlCheck({ values: CLINICAL_SALA_VALUES, allowNull: false });
  db.exec(`
    CREATE TABLE sala_interno_access_v25 (
      sala TEXT PRIMARY KEY ${salaCheckNotNull},
      access_token TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      rotated_at TEXT,
      rotated_by TEXT,
      FOREIGN KEY(rotated_by) REFERENCES users(user_id)
    );
    INSERT OR IGNORE INTO sala_interno_access_v25 (sala, access_token, is_active, rotated_at, rotated_by)
    SELECT '${SINGLE_SALA}', access_token, is_active, rotated_at, rotated_by
    FROM sala_interno_access
    ORDER BY is_active DESC, rotated_at DESC;
    DROP TABLE sala_interno_access;
    ALTER TABLE sala_interno_access_v25 RENAME TO sala_interno_access;
  `);
}

/**
 * v25: collapse CLINICAL_SALA_VALUES from the 8 IM wards to R+ HF's single
 * unit ('Unidad IC'). Rebuilds the three CHECK-constrained tables and remaps
 * any legacy sala value on existing rows instead of dropping it.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV25SingleSala(db) {
  rebuildUsersTableV25(db);
  rebuildTeamsTableV25(db);
  rebuildSalaInternoAccessV25(db);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '25');
}
