import crypto from 'node:crypto';
import { CLINICAL_SALA_VALUES, clinicalSalaSqlCheck } from '../clinical-salas.mjs';

export const SCHEMA_VERSION = 14;

const DDL_V1 = [
  `CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE clinical_blob (
  namespace TEXT NOT NULL DEFAULT 'desktop',
  blob_key TEXT NOT NULL,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (namespace, blob_key)
  )`,
  `CREATE TABLE lan_host_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  team_code_hash TEXT NOT NULL,
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE forensic_audit_chain (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  client_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL
  )`,
  `CREATE INDEX idx_audit_ts ON forensic_audit_chain(timestamp)`,
  `CREATE INDEX idx_audit_type ON forensic_audit_chain(event_type)`,
];

function tableExists(db, name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
}

/** Idempotent clinical-access tables (users, teams, guardias, patient columns). */
function ensureClinicalAccessTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rank TEXT NOT NULL CHECK(rank IN ('R1', 'R2', 'R3', 'R4', 'Admin')),
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      team_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service TEXT NOT NULL CHECK(service IN ('Sala', 'Torre HU', 'Eme', 'UX', 'Interconsultas', 'Área A/Pensionistas')),
      sub_area_fraction TEXT,
      on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6),
      created_by TEXT,
      FOREIGN KEY(created_by) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS team_membership (
      team_id TEXT,
      user_id TEXT,
      PRIMARY KEY(team_id, user_id),
      FOREIGN KEY(team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS active_guardias (
      guardia_id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      covering_user_id TEXT NOT NULL,
      source_team_id TEXT NOT NULL,
      is_critical INTEGER DEFAULT 0 CHECK(is_critical IN (0, 1)),
      pendientes_json TEXT,
      vitals_frequency TEXT DEFAULT 'None' CHECK(vitals_frequency IN ('1h', '2h', '4h', 'Shift_Once', 'None')),
      last_vitals_check DATETIME DEFAULT CURRENT_TIMESTAMP,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Resolved')),
      FOREIGN KEY(covering_user_id) REFERENCES users(user_id)
    );
  `);

  if (!tableExists(db, 'patients')) {
    db.exec(`CREATE TABLE patients (id TEXT PRIMARY KEY)`);
  }

  const patientCols = db.prepare('PRAGMA table_info(patients)').all().map((c) => c.name);
  if (!patientCols.includes('interconsult_type')) {
    db.exec(
      "ALTER TABLE patients ADD COLUMN interconsult_type TEXT DEFAULT 'None' CHECK(interconsult_type IN ('Ephemeral_VPO', 'Follow-up', 'None'))"
    );
  }
  if (!patientCols.includes('interconsult_status')) {
    db.exec(
      "ALTER TABLE patients ADD COLUMN interconsult_status TEXT DEFAULT 'Pending' CHECK(interconsult_status IN ('Pending', 'Resolved', 'Active'))"
    );
  }
  if (!patientCols.includes('prognosis_classification')) {
    db.exec("ALTER TABLE patients ADD COLUMN prognosis_classification TEXT DEFAULT 'Buen Pronóstico'");
  }
  if (!patientCols.includes('negativa_maniobras_firmada')) {
    db.exec(
      'ALTER TABLE patients ADD COLUMN negativa_maniobras_firmada INTEGER DEFAULT 0 CHECK(negativa_maniobras_firmada IN (0, 1))'
    );
  }
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV1(db) {
  const createdAt = new Date().toISOString();
  for (const sql of DDL_V1) {
    db.exec(sql);
  }

  ensureClinicalAccessTables(db);

  const upsert = db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  upsert.run('schema_version', '1');
  upsert.run('created_at', createdAt);
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV2(db) {
  // Pre–clinical-access DBs may have schema_version=1 without users/teams.
  ensureClinicalAccessTables(db);

  db.exec(`
    CREATE TABLE IF NOT EXISTS rotation_cycles (
      cycle_id TEXT PRIMARY KEY,
      month_end_at TEXT NOT NULL,
      preview_days INTEGER NOT NULL DEFAULT 2,
      preview_start_at TEXT NOT NULL,
      effective_at TEXT NOT NULL,
      archived_at TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS patient_team_assignment (
      patient_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      effective_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (patient_id, team_id, effective_at),
      FOREIGN KEY(patient_id) REFERENCES patients(id),
      FOREIGN KEY(team_id) REFERENCES teams(team_id)
    );

    CREATE TABLE IF NOT EXISTS team_guardia_today (
      team_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      declared_at TEXT NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `);

  if (tableExists(db, 'teams')) {
    const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    if (!teamCols.includes('archived_at')) {
      db.exec('ALTER TABLE teams ADD COLUMN archived_at TEXT');
    }
  }

  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', String(SCHEMA_VERSION));
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV3(db) {
  // Add clinical_name and sala to users
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userCols.includes('clinical_name')) {
    db.exec("ALTER TABLE users ADD COLUMN clinical_name TEXT");
  }
  if (!userCols.includes('sala')) {
    db.exec("ALTER TABLE users ADD COLUMN sala TEXT CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E') OR sala IS NULL)");
  }

  // Add sala and team_leader_name to teams
  const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  if (!teamCols.includes('sala')) {
    db.exec("ALTER TABLE teams ADD COLUMN sala TEXT CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E') OR sala IS NULL)");
  }
  if (!teamCols.includes('team_leader_name')) {
    db.exec("ALTER TABLE teams ADD COLUMN team_leader_name TEXT");
  }

  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '3');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV4(db) {
  // Add leader_user_id and rotation_active to teams
  const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
  if (!teamCols.includes('leader_user_id')) {
    db.exec('ALTER TABLE teams ADD COLUMN leader_user_id TEXT REFERENCES users(user_id)');
  }
  if (!teamCols.includes('rotation_active')) {
    db.exec("ALTER TABLE teams ADD COLUMN rotation_active INTEGER NOT NULL DEFAULT 1 CHECK(rotation_active IN (0, 1))");
  }

  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '4');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV5(db) {
  const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!userCols.includes('is_program_admin')) {
    db.exec('ALTER TABLE users ADD COLUMN is_program_admin INTEGER NOT NULL DEFAULT 0');
  }
  db.prepare(`UPDATE users SET is_program_admin = 1 WHERE rank = 'Admin'`).run();
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '5');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV6(db) {
  const membershipCols = db.prepare('PRAGMA table_info(team_membership)').all().map((c) => c.name);
  if (!membershipCols.includes('sub_area_fraction')) {
    db.exec('ALTER TABLE team_membership ADD COLUMN sub_area_fraction TEXT');
  }
  db.exec(`
    UPDATE team_membership
    SET sub_area_fraction = (
      SELECT t.sub_area_fraction
      FROM teams t
      JOIN users u ON u.user_id = team_membership.user_id
      WHERE t.team_id = team_membership.team_id
        AND u.rank = 'R2'
        AND t.sub_area_fraction IS NOT NULL
    )
    WHERE sub_area_fraction IS NULL
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '6');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV7(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sala_interno_access (
      sala TEXT PRIMARY KEY CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E')),
      access_token TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      rotated_at TEXT,
      rotated_by TEXT,
      FOREIGN KEY(rotated_by) REFERENCES users(user_id)
    );
  `);

  const salas = ['Sala 1', 'Sala 2', 'Sala E'];
  const insert = db.prepare(
    `INSERT OR IGNORE INTO sala_interno_access (sala, access_token, is_active)
     VALUES (?, ?, 1)`
  );
  for (const sala of salas) {
    insert.run(sala, crypto.randomBytes(32).toString('hex'));
  }

  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '7');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV8(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entrega_template_user (
      template_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
    CREATE TABLE IF NOT EXISTS entrega_template_team (
      template_id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(team_id) REFERENCES teams(team_id),
      FOREIGN KEY(created_by) REFERENCES users(user_id)
    );
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '8');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV9(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lan_sync_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('bundle', 'patch', 'clinical_ops')),
      payload_json TEXT NOT NULL,
      enqueued_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '9');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV11(db) {
  const salaCheck = clinicalSalaSqlCheck({ allowNull: true });
  const salaCheckNotNull = clinicalSalaSqlCheck({ allowNull: false });

  if (tableExists(db, 'users')) {
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
        is_program_admin INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO users_v11 (
        user_id, username, password_hash, rank, public_key, encrypted_private_key,
        created_at, clinical_name, sala, is_program_admin
      )
      SELECT
        user_id, username, password_hash, rank, public_key, encrypted_private_key,
        created_at, clinical_name, sala, is_program_admin
      FROM users;
      DROP TABLE users;
      ALTER TABLE users_v11 RENAME TO users;
    `);
  }

  if (tableExists(db, 'teams')) {
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
        archived_at TEXT,
        FOREIGN KEY(created_by) REFERENCES users(user_id)
      );
      INSERT INTO teams_v11 (
        team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
        sala, team_leader_name, leader_user_id, rotation_active, archived_at
      )
      SELECT
        team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
        sala, team_leader_name, leader_user_id, rotation_active, archived_at
      FROM teams;
      DROP TABLE teams;
      ALTER TABLE teams_v11 RENAME TO teams;
    `);
  }

  if (tableExists(db, 'sala_interno_access')) {
    db.exec(`
      CREATE TABLE sala_interno_access_v11 (
        sala TEXT PRIMARY KEY ${salaCheckNotNull},
        access_token TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
        rotated_at TEXT,
        rotated_by TEXT,
        FOREIGN KEY(rotated_by) REFERENCES users(user_id)
      );
      INSERT INTO sala_interno_access_v11 (sala, access_token, is_active, rotated_at, rotated_by)
      SELECT sala, access_token, is_active, rotated_at, rotated_by
      FROM sala_interno_access;
      DROP TABLE sala_interno_access;
      ALTER TABLE sala_interno_access_v11 RENAME TO sala_interno_access;
    `);
  } else {
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

  const insertInterno = db.prepare(
    `INSERT OR IGNORE INTO sala_interno_access (sala, access_token, is_active)
     VALUES (?, ?, 1)`
  );
  for (const sala of CLINICAL_SALA_VALUES) {
    insertInterno.run(sala, crypto.randomBytes(32).toString('hex'));
  }

  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '11');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV12(db) {
  if (!tableExists(db, 'lan_sync_outbox')) {
    db.prepare(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run('schema_version', '12');
    return;
  }
  db.exec(`
    CREATE TABLE lan_sync_outbox_v12 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('bundle', 'patch', 'clinical_ops', 'delta', 'command')),
      payload_json TEXT NOT NULL,
      enqueued_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    INSERT INTO lan_sync_outbox_v12
      (id, room_id, kind, payload_json, enqueued_at, attempts, last_error)
    SELECT id, room_id, kind, payload_json, enqueued_at, attempts, last_error
    FROM lan_sync_outbox;
    DROP TABLE lan_sync_outbox;
    ALTER TABLE lan_sync_outbox_v12 RENAME TO lan_sync_outbox;
    CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '12');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV10(db) {
  db.exec(`
    CREATE TABLE lan_sync_outbox_v10 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('bundle', 'patch', 'clinical_ops', 'delta')),
      payload_json TEXT NOT NULL,
      enqueued_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    INSERT INTO lan_sync_outbox_v10
      (id, room_id, kind, payload_json, enqueued_at, attempts, last_error)
    SELECT id, room_id, kind, payload_json, enqueued_at, attempts, last_error
    FROM lan_sync_outbox;
    DROP TABLE lan_sync_outbox;
    ALTER TABLE lan_sync_outbox_v10 RENAME TO lan_sync_outbox;
    CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '10');
}

/** @param {import('better-sqlite3').Database} db */
export function applyMigrations(db) {
  const current = readSchemaVersion(db);
  if (current === SCHEMA_VERSION) return;

  const run = db.transaction(() => {
    let version = current;
    if (version === null) {
      migrateToV1(db);
      version = 1;
    }
    if (version < 2) {
      migrateToV2(db);
    }
    if (version < 3) {
      migrateToV3(db);
    }
    if (version < 4) {
      migrateToV4(db);
    }
    if (version < 5) {
      migrateToV5(db);
    }
    if (version < 6) {
      migrateToV6(db);
    }
    if (version < 7) {
      migrateToV7(db);
    }
    if (version < 8) {
      migrateToV8(db);
    }
    if (version < 9) {
      migrateToV9(db);
    }
    if (version < 10) {
      migrateToV10(db);
    }
  });
  run();

  // v11 rebuilds FK-linked tables; PRAGMA foreign_keys=OFF is a no-op inside a transaction
  // that started with FK enabled (db-manager default).
  if (readSchemaVersion(db) < 11) {
    db.pragma('foreign_keys = OFF');
    try {
      const runV11 = db.transaction(() => {
        migrateToV11(db);
      });
      runV11();
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }
  if (readSchemaVersion(db) < 12) {
    const runV12 = db.transaction(() => {
      migrateToV12(db);
    });
    runV12();
  }
  if (readSchemaVersion(db) < 13) {
    const runV13 = db.transaction(() => {
      migrateToV13(db);
    });
    runV13();
  }
  if (readSchemaVersion(db) < 14) {
    const runV14 = db.transaction(() => {
      migrateToV14(db);
    });
    runV14();
  }
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV13(db) {
  if (tableExists(db, 'teams')) {
    const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    if (!teamCols.includes('updated_at')) {
      db.exec('ALTER TABLE teams ADD COLUMN updated_at TEXT');
      db.exec(
        `UPDATE teams SET updated_at = COALESCE(archived_at, datetime('now')) WHERE updated_at IS NULL`
      );
    }
  }
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '13');
}

/** @param {import('better-sqlite3').Database} db */
function migrateToV14(db) {
  if (!tableExists(db, 'lan_sync_outbox')) {
    db.prepare(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run('schema_version', '14');
    return;
  }
  db.exec(`
    CREATE TABLE lan_sync_outbox_v14 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN (
        'bundle', 'patch', 'clinical_ops', 'delta', 'command',
        'lab_history_upsert', 'nota_replace', 'indicaciones_replace', 'patient_fields'
      )),
      payload_json TEXT NOT NULL,
      enqueued_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
    INSERT INTO lan_sync_outbox_v14
      (id, room_id, kind, payload_json, enqueued_at, attempts, last_error)
    SELECT id, room_id, kind, payload_json, enqueued_at, attempts, last_error
    FROM lan_sync_outbox;
    DROP TABLE lan_sync_outbox;
    ALTER TABLE lan_sync_outbox_v14 RENAME TO lan_sync_outbox;
    CREATE INDEX IF NOT EXISTS idx_lan_outbox_room ON lan_sync_outbox(room_id, enqueued_at);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '14');
}

function readSchemaVersion(db) {
  const hasMeta = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'")
    .get();
  if (!hasMeta) return null;
  const row = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
  if (!row) return null;
  return Number(row.value);
}
