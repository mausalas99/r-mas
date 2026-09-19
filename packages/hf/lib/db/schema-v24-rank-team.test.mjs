import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v24 rank/team collapse', () => {
  it('fresh DB only accepts Admin/Team rank and HF service', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 27);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    assert.ok(!tables.includes('active_guardias'));
    assert.ok(!tables.includes('entrega_template_user'));
    assert.ok(!tables.includes('entrega_template_team'));

    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key)
       VALUES ('u-admin', 'dr_admin', 'x', 'Admin', 'pk', 'epk')`
    ).run();
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key)
       VALUES ('u-team', 'dr_team', 'x', 'Team', 'pk', 'epk')`
    ).run();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key)
         VALUES ('u-r2', 'dr_r2', 'x', 'R2', 'pk', 'epk')`
      ).run();
    }, /CHECK constraint failed/);

    db.prepare(
      `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by)
       VALUES ('t-hf', 'Equipo HF', 'HF', 0, 'u-admin')`
    ).run();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by)
         VALUES ('t-sala', 'Equipo Sala', 'Sala', 0, 'u-admin')`
      ).run();
    }, /CHECK constraint failed/);

    db.close();
  });

  it('migrates an old-shaped DB with R1-R4 users, non-HF teams, and active_guardias rows', () => {
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
        PRIMARY KEY(team_id, user_id)
      );
      CREATE TABLE active_guardias (
        guardia_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        covering_user_id TEXT NOT NULL,
        source_team_id TEXT NOT NULL,
        is_critical INTEGER DEFAULT 0,
        pendientes_json TEXT,
        vitals_frequency TEXT DEFAULT 'None',
        last_vitals_check DATETIME DEFAULT CURRENT_TIMESTAMP,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Active'
      );
      CREATE TABLE entrega_template_user (
        template_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE entrega_template_team (
        template_id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    db.prepare("INSERT INTO app_meta (key, value) VALUES ('schema_version', '20')").run();
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
       VALUES ('u-admin', 'dr_admin', 'x', 'Admin', 'pk', 'epk', 'Dr. Admin', 'Sala 1')`
    ).run();
    for (const [id, rank] of [
      ['u-r1', 'R1'],
      ['u-r2', 'R2'],
      ['u-r3', 'R3'],
      ['u-r4', 'R4'],
    ]) {
      db.prepare(
        `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
         VALUES (?, ?, 'x', ?, 'pk', 'epk', ?, 'Sala 1')`
      ).run(id, id, rank, id);
    }
    db.prepare(
      `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, created_by, sala)
       VALUES ('t1', 'Equipo Sala', 'Sala', 'A', 0, 'u-admin', 'Sala 1')`
    ).run();
    db.prepare(`INSERT INTO team_membership (team_id, user_id) VALUES ('t1', 'u-r1')`).run();
    db.prepare(
      `INSERT INTO active_guardias (guardia_id, patient_id, covering_user_id, source_team_id)
       VALUES ('g1', 'p1', 'u-r1', 't1')`
    ).run();
    db.prepare(
      `INSERT INTO entrega_template_user (template_id, user_id, name, payload_json, created_at)
       VALUES ('tpl-u1', 'u-r1', 'Plantilla', '{}', '2026-01-01')`
    ).run();
    db.prepare(
      `INSERT INTO entrega_template_team (template_id, team_id, name, payload_json, created_at)
       VALUES ('tpl-t1', 't1', 'Plantilla equipo', '{}', '2026-01-01')`
    ).run();

    applyMigrations(db);

    assert.equal(
      db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get().value,
      String(SCHEMA_VERSION)
    );

    const ranks = db
      .prepare('SELECT user_id, rank FROM users ORDER BY user_id')
      .all()
      .reduce((acc, r) => ({ ...acc, [r.user_id]: r.rank }), {});
    assert.equal(ranks['u-admin'], 'Admin');
    assert.equal(ranks['u-r1'], 'Team');
    assert.equal(ranks['u-r2'], 'Team');
    assert.equal(ranks['u-r3'], 'Team');
    assert.equal(ranks['u-r4'], 'Team');

    const team = db.prepare("SELECT service FROM teams WHERE team_id = 't1'").get();
    assert.equal(team.service, 'HF');

    // Surviving tables keep their non-rank/service data intact.
    const membership = db
      .prepare(`SELECT user_id FROM team_membership WHERE team_id = 't1'`)
      .get();
    assert.equal(membership.user_id, 'u-r1');

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((r) => r.name);
    assert.ok(!tables.includes('active_guardias'));
    assert.ok(!tables.includes('entrega_template_user'));
    assert.ok(!tables.includes('entrega_template_team'));

    db.close();
  });

  it('is idempotent when re-applied at the current version', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.doesNotThrow(() => applyMigrations(db));
    assert.equal(
      db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get().value,
      String(SCHEMA_VERSION)
    );
    db.close();
  });
});
