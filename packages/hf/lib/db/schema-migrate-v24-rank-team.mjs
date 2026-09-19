import { clinicalSalaSqlCheck } from '../clinical-salas.mjs';
import { tableExists } from './schema-primitives.mjs';

/** @param {import('better-sqlite3').Database} db */
function rebuildUsersTableV24(db) {
  if (!tableExists(db, 'users')) return;
  const salaCheck = clinicalSalaSqlCheck({ allowNull: true });
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  const lastActivityCol = cols.includes('last_activity_at') ? ', last_activity_at TEXT' : '';
  const lastActivityList = cols.includes('last_activity_at') ? ', last_activity_at' : '';
  // Normalize rank inline via CASE while copying rows: the source table still
  // enforces the OLD rank CHECK, so `UPDATE users SET rank = 'Team' ...` here
  // would itself violate that still-live constraint. Only the destination
  // table (the new CHECK) sees the collapsed value.
  db.exec(`
    CREATE TABLE users_v24 (
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
    INSERT INTO users_v24 (
      user_id, username, password_hash, rank, public_key, encrypted_private_key,
      created_at, clinical_name, sala, is_program_admin${lastActivityList}
    )
    SELECT
      user_id, username, password_hash,
      CASE WHEN rank = 'Admin' THEN 'Admin' ELSE 'Team' END,
      public_key, encrypted_private_key,
      created_at, clinical_name, sala, is_program_admin${lastActivityList}
    FROM users;
    DROP TABLE users;
    ALTER TABLE users_v24 RENAME TO users;
  `);
}

/** @param {import('better-sqlite3').Database} db */
function rebuildTeamsTableV24(db) {
  if (!tableExists(db, 'teams')) return;
  const salaCheck = clinicalSalaSqlCheck({ allowNull: true });
  const cols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  const updatedAtCol = cols.includes('updated_at') ? ', updated_at TEXT' : '';
  const updatedAtList = cols.includes('updated_at') ? ', updated_at' : '';
  db.exec(`
    CREATE TABLE teams_v24 (
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
    INSERT INTO teams_v24 (
      team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
      sala, team_leader_name, leader_user_id, rotation_active, archived_at${updatedAtList}
    )
    SELECT
      team_id, name, 'HF', sub_area_fraction, on_call_day_index, created_by,
      sala, team_leader_name, leader_user_id, rotation_active, archived_at${updatedAtList}
    FROM teams;
    DROP TABLE teams;
    ALTER TABLE teams_v24 RENAME TO teams;
  `);
}

/**
 * v24: collapse users.rank to Admin/Team and teams.service to a single HF
 * value (no more on-call rank ladder, no more ward/service concept), and
 * drop the on-call coverage + Entrega template tables (Guardia/Entrega/
 * Interno board are fully removed as of this migration).
 *
 * @param {import('better-sqlite3').Database} db
 */
export function migrateToV24RankTeam(db) {
  rebuildUsersTableV24(db);
  rebuildTeamsTableV24(db);
  db.exec(`
    DROP TABLE IF EXISTS active_guardias;
    DROP TABLE IF EXISTS entrega_template_user;
    DROP TABLE IF EXISTS entrega_template_team;
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '24');
}
