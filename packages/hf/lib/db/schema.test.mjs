import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { CLINICAL_SALA_VALUES } from '../clinical-salas.mjs';
import {
  applyMigrations,
  migrateToV15LanHostTables,
  migrateToV17UserActivityBackfill,
  SCHEMA_VERSION,
} from './schema.mjs';
import { enqueueLanSyncOutbox } from './legacy-sync-outbox.mjs';

describe('schema', () => {
  it('creates tables at current version', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(v.value, String(SCHEMA_VERSION));
    const createdAt = db.prepare("SELECT value FROM app_meta WHERE key = 'created_at'").get();
    assert.ok(createdAt?.value);
    assert.doesNotThrow(() => new Date(createdAt.value));
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map((r) => r.name);
    assert.ok(tables.includes('clinical_blob'));
    assert.ok(tables.includes('forensic_audit_chain'));
    assert.ok(tables.includes('lan_host_state'));
    assert.ok(tables.includes('lan_sync_outbox'));
    assert.ok(tables.includes('users'));
    assert.ok(tables.includes('teams'));
    assert.ok(tables.includes('team_membership'));
    assert.ok(!tables.includes('active_guardias'));
    assert.ok(!tables.includes('entrega_template_user'));
    assert.ok(!tables.includes('entrega_template_team'));
    db.close();
  });

  it('applyMigrations is idempotent at current version', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const createdAtBefore = db.prepare("SELECT value FROM app_meta WHERE key = 'created_at'").get().value;
    applyMigrations(db);
    const createdAtAfter = db.prepare("SELECT value FROM app_meta WHERE key = 'created_at'").get().value;
    assert.equal(createdAtAfter, createdAtBefore);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(v.value, String(SCHEMA_VERSION));
    db.close();
  });

  it('includes expected columns in patients table', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const patientCols = db.prepare("PRAGMA table_info(patients)").all().map(c => c.name);
    assert.ok(patientCols.includes('interconsult_type'));
    assert.ok(patientCols.includes('interconsult_status'));
    assert.ok(patientCols.includes('prognosis_classification'));
    assert.ok(patientCols.includes('negativa_maniobras_firmada'));
    db.close();
  });

  it('collapses users.rank and teams.service to the v24 shape', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.doesNotThrow(() => {
      db.prepare(
        `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
         VALUES ('u-admin', 'dr_admin', 'x', 'Admin', 'pk', 'epk', 'Dr. Admin', NULL)`
      ).run();
      db.prepare(
        `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
         VALUES ('u-team', 'dr_team', 'x', 'Team', 'pk', 'epk', 'Dr. Team', NULL)`
      ).run();
    });
    assert.throws(() => {
      db.prepare(
        `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key)
         VALUES ('u-r1', 'dr_r1', 'x', 'R1', 'pk', 'epk')`
      ).run();
    });
    db.prepare(
      `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by)
       VALUES ('t-hf', 'Equipo', 'HF', 0, 'u-admin')`
    ).run();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by)
         VALUES ('t-sala', 'Equipo Sala', 'Sala', 0, 'u-admin')`
      ).run();
    });
    db.close();
  });

  it('migrates legacy schema v1 without clinical tables to current', () => {
    const db = new Database(':memory:');
    for (const sql of [
      `CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
      `CREATE TABLE clinical_blob (
        namespace TEXT NOT NULL DEFAULT 'desktop',
        blob_key TEXT NOT NULL,
        json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (namespace, blob_key)
      )`,
    ]) {
      db.exec(sql);
    }
    db.prepare(
      'INSERT INTO app_meta (key, value) VALUES (?, ?)'
    ).run('schema_version', '1');
    applyMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    assert.ok(tables.includes('teams'));
    assert.ok(tables.includes('rotation_cycles'));
    assert.equal(
      db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get().value,
      String(SCHEMA_VERSION)
    );
    assert.ok(tables.includes('sala_interno_access'));
    // V3 columns
    const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    assert.ok(userCols.includes('clinical_name'), 'users.clinical_name missing');
    assert.ok(userCols.includes('sala'), 'users.sala missing');
    const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    assert.ok(teamCols.includes('team_leader_name'), 'teams.team_leader_name missing');
    db.close();
  });
});

describe('schema migrations', () => {
  it('includes V3 rotation, assignment tables and new columns', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    for (const t of ['rotation_cycles', 'patient_team_assignment', 'team_guardia_today']) {
      assert.ok(tables.includes(t), `missing ${t}`);
    }
    const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    assert.ok(teamCols.includes('archived_at'));
    assert.ok(teamCols.includes('sala'), 'teams.sala missing');
    assert.ok(teamCols.includes('team_leader_name'), 'teams.team_leader_name missing');
    const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    assert.ok(userCols.includes('clinical_name'), 'users.clinical_name missing');
    assert.ok(userCols.includes('sala'), 'users.sala missing');
    assert.ok(userCols.includes('last_activity_at'), 'users.last_activity_at missing');
    assert.ok(teamCols.includes('updated_at'), 'teams.updated_at missing');
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), SCHEMA_VERSION);
    db.close();
  });

  it('includes V4 columns in teams table', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    assert.ok(teamCols.includes('leader_user_id'), 'teams.leader_user_id missing');
    assert.ok(teamCols.includes('rotation_active'), 'teams.rotation_active missing');
    db.close();
  });

  it('includes V5 is_program_admin on users', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    assert.ok(userCols.includes('is_program_admin'));
    db.close();
  });

  it('includes V6 sub_area_fraction on team_membership', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const cols = db.prepare('PRAGMA table_info(team_membership)').all().map((c) => c.name);
    assert.ok(cols.includes('sub_area_fraction'));
    db.close();
  });

  it('includes V7 sala_interno_access table', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    assert.ok(tables.includes('sala_interno_access'));
    const count = db.prepare('SELECT COUNT(*) AS c FROM sala_interno_access').get().c;
    assert.equal(count, CLINICAL_SALA_VALUES.length);
    db.close();
  });

  it('migrateToV11 upgrades v10 DB with teams and memberships', () => {
    // Build the pre-v11 table shape by hand (legacy rank/service CHECK, no
    // sala CHECK yet) so this exercises a genuine old-version upgrade path
    // instead of rewinding an already-v24-shaped table's version number.
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE users (
        user_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rank TEXT NOT NULL CHECK(rank IN ('R1', 'R2', 'R3', 'R4', 'Admin')),
        public_key TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        clinical_name TEXT,
        sala TEXT,
        is_program_admin INTEGER NOT NULL DEFAULT 0,
        last_activity_at TEXT
      );
      CREATE TABLE teams (
        team_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        service TEXT NOT NULL CHECK(service IN ('Sala', 'Torre HU', 'Eme', 'UX', 'Interconsultas', 'Área A/Pensionistas')),
        sub_area_fraction TEXT,
        on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6),
        created_by TEXT,
        sala TEXT,
        team_leader_name TEXT,
        leader_user_id TEXT REFERENCES users(user_id),
        rotation_active INTEGER NOT NULL DEFAULT 1 CHECK(rotation_active IN (0, 1)),
        archived_at TEXT,
        updated_at TEXT,
        FOREIGN KEY(created_by) REFERENCES users(user_id)
      );
      CREATE TABLE team_membership (
        team_id TEXT,
        user_id TEXT,
        PRIMARY KEY(team_id, user_id),
        FOREIGN KEY(team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);
    db.prepare("INSERT INTO app_meta (key, value) VALUES ('schema_version', '10')").run();
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
       VALUES ('u1', 'test', 'x', 'R1', 'pk', 'epk', 'Test', 'Sala 1')`
    ).run();
    db.prepare(
      `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, created_by, sala)
       VALUES ('t1', 'Team', 'Sala', 'A', 0, 'u1', 'Sala 1')`
    ).run();
    db.prepare(`INSERT INTO team_membership (team_id, user_id) VALUES ('t1', 'u1')`).run();
    applyMigrations(db);
    assert.equal(
      db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get().value,
      String(SCHEMA_VERSION)
    );
    const user = db.prepare('SELECT rank FROM users WHERE user_id = ?').get('u1');
    assert.equal(user.rank, 'Team');
    const team = db.prepare('SELECT service FROM teams WHERE team_id = ?').get('t1');
    assert.equal(team.service, 'HF');
    db.close();
  });

  it('CLINICAL_SALA_VALUES on a fresh (post-v25) DB only accepts the single R+ HF unit', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.deepEqual(CLINICAL_SALA_VALUES, ['Unidad IC']);
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
       VALUES ('u-ic', 'dr_ic', 'x', 'Team', 'pk', 'epk', 'Dr. IC', 'Unidad IC')`
    ).run();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
         VALUES ('u-torre', 'dr_torre', 'x', 'Team', 'pk', 'epk', 'Dr. Torre', 'Torre HU')`
      ).run();
    }, /CHECK constraint failed/);
    db.close();
  });

  it('migrateToV9 creates lan_sync_outbox table and index', () => {
    const db = new Database(':memory:');
    for (const sql of [
      `CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
      `CREATE TABLE entrega_template_user (
        template_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    ]) {
      db.exec(sql);
    }
    db.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)').run('schema_version', '8');
    applyMigrations(db);
    assert.equal(
      db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get().value,
      String(SCHEMA_VERSION)
    );
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    assert.ok(tables.includes('lan_sync_outbox'));
    const cols = db.prepare('PRAGMA table_info(lan_sync_outbox)').all().map((c) => c.name);
    for (const name of [
      'id',
      'room_id',
      'kind',
      'payload_json',
      'enqueued_at',
      'attempts',
      'last_error',
    ]) {
      assert.ok(cols.includes(name), `lan_sync_outbox.${name} missing`);
    }
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='lan_sync_outbox'")
      .all()
      .map((r) => r.name);
    assert.ok(indexes.includes('idx_lan_outbox_room'));
    db.close();
  });

  it('migrateToV15 creates normalized LAN host tables without lan_lab_sets secondary indexes', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    for (const t of [
      'lan_host_meta',
      'lan_room_bundles',
      'lan_bundle_entries',
      'lan_lab_sets',
      'lan_lab_set_order',
    ]) {
      assert.ok(tables.includes(t), `missing ${t}`);
    }
    const labIndexes = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type='index' AND tbl_name='lan_lab_sets'
           AND name NOT LIKE 'sqlite_autoindex_%'`
      )
      .all();
    assert.equal(labIndexes.length, 0, 'lan_lab_sets must have no secondary indexes');
    migrateToV15LanHostTables(db);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(v.value, '15');
    db.close();
  });

  it('migrateToV16 adds users.last_activity_at', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    assert.ok(cols.includes('last_activity_at'));
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), SCHEMA_VERSION);
    db.close();
  });

  it('migrateToV17 backfills last_activity_at from created_at', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, created_at, last_activity_at)
       VALUES ('u1', 'legacy1', '', 'Team', '', '', '2026-05-01 10:00:00', NULL)`
    ).run();
    migrateToV17UserActivityBackfill(db);
    const row = db.prepare('SELECT last_activity_at FROM users WHERE user_id = ?').get('u1');
    assert.equal(row.last_activity_at, '2026-05-01 10:00:00');
    db.close();
  });

  it('migrateToV14 adds typed outbox kinds to CHECK constraint', async () => {
    const db = new Database(':memory:');
    applyMigrations(db);

    const newKinds = ['lab_history_upsert', 'nota_replace', 'indicaciones_replace', 'patient_fields'];
    for (const kind of newKinds) {
      assert.doesNotThrow(
        () => enqueueLanSyncOutbox(db, {
          roomId: 'r1',
          kind,
          payload: { test: true },
        }),
        `kind ${kind} should be accepted after v14 migration`
      );
    }

    for (const kind of ['bundle', 'patch', 'clinical_ops', 'delta', 'command']) {
      assert.doesNotThrow(
        () => enqueueLanSyncOutbox(db, { roomId: 'r1', kind, payload: { test: true } }),
        `legacy kind ${kind} must still be accepted`
      );
    }
    db.close();
  });
});
