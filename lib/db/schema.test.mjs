import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

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
    assert.ok(tables.includes('users'));
    assert.ok(tables.includes('teams'));
    assert.ok(tables.includes('team_membership'));
    assert.ok(tables.includes('active_guardias'));
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

  it('includes expected columns in active_guardias table', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const guardiaCols = db.prepare("PRAGMA table_info(active_guardias)").all().map(c => c.name);
    assert.ok(guardiaCols.includes('vitals_frequency'));
    assert.ok(guardiaCols.includes('assigned_at'));
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
      '5'
    );
    // V3 columns
    const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    assert.ok(userCols.includes('clinical_name'), 'users.clinical_name missing');
    assert.ok(userCols.includes('sala'), 'users.sala missing');
    const teamCols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    assert.ok(teamCols.includes('team_leader_name'), 'teams.team_leader_name missing');
    db.close();
  });

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
    assert.equal(SCHEMA_VERSION, 5);
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
});
