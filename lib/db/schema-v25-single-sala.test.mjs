import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v25 single sala (R+ HF)', () => {
  it('fresh DB only accepts Unidad IC on users/teams sala', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 27);

    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
       VALUES ('u1', 'dr_uno', 'x', 'Team', 'pk', 'epk', 'Dr. Uno', 'Unidad IC')`
    ).run();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
         VALUES ('u2', 'dr_dos', 'x', 'Team', 'pk', 'epk', 'Dr. Dos', 'Sala 1')`
      ).run();
    }, /CHECK constraint failed/);

    db.prepare(
      `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by, sala)
       VALUES ('t1', 'Equipo IC', 'HF', 0, 'u1', 'Unidad IC')`
    ).run();
    assert.throws(() => {
      db.prepare(
        `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by, sala)
         VALUES ('t2', 'Equipo Torre', 'HF', 0, 'u1', 'Torre HU')`
      ).run();
    }, /CHECK constraint failed/);

    db.close();
  });

  it('remaps legacy IM sala values on existing users/teams/sala_interno_access rows, without dropping data', () => {
    const db = new Database(':memory:');
    applyMigrations(db);

    // Simulate a pre-v25 DB shaped by the old 8-value CHECK.
    db.prepare("UPDATE app_meta SET value = '24' WHERE key = 'schema_version'").run();
    const staleCheck =
      "CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E', 'Torre HU', 'Área A/Pensionistas', 'Interconsultas', 'UX', 'Eme') OR sala IS NULL)";
    db.exec(`
      CREATE TABLE users_v24stale (
        user_id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        rank TEXT NOT NULL CHECK(rank IN ('Admin', 'Team')),
        public_key TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        clinical_name TEXT,
        sala TEXT ${staleCheck},
        is_program_admin INTEGER NOT NULL DEFAULT 0,
        last_activity_at TEXT
      );
      INSERT INTO users_v24stale SELECT * FROM users;
      DROP TABLE users;
      ALTER TABLE users_v24stale RENAME TO users;
    `);
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
       VALUES ('u-sala1', 'dr_sala1', 'x', 'Team', 'pk', 'epk', 'Dr. Sala1', 'Sala 1')`
    ).run();
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
       VALUES ('u-null', 'dr_null', 'x', 'Admin', 'pk', 'epk', 'Dr. Null', NULL)`
    ).run();

    const staleTeamsCheck =
      "CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E', 'Torre HU', 'Área A/Pensionistas', 'Interconsultas', 'UX', 'Eme') OR sala IS NULL)";
    db.exec(`
      CREATE TABLE teams_v24stale (
        team_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        service TEXT NOT NULL CHECK(service = 'HF'),
        sub_area_fraction TEXT,
        on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6),
        created_by TEXT,
        sala TEXT ${staleTeamsCheck},
        team_leader_name TEXT,
        leader_user_id TEXT REFERENCES users(user_id),
        rotation_active INTEGER NOT NULL DEFAULT 1 CHECK(rotation_active IN (0, 1)),
        archived_at TEXT,
        updated_at TEXT,
        FOREIGN KEY(created_by) REFERENCES users(user_id)
      );
      INSERT INTO teams_v24stale SELECT * FROM teams;
      DROP TABLE teams;
      ALTER TABLE teams_v24stale RENAME TO teams;
    `);
    db.prepare(
      `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by, sala)
       VALUES ('t-torre', 'Equipo Torre', 'HF', 0, 'u-sala1', 'Torre HU')`
    ).run();

    const staleInternoCheck = "CHECK(sala IN ('Sala 1', 'Sala 2', 'Sala E', 'Torre HU', 'Área A/Pensionistas', 'Interconsultas', 'UX', 'Eme'))";
    db.exec(`DELETE FROM sala_interno_access;`);
    db.exec(`
      CREATE TABLE sala_interno_access_v24stale (
        sala TEXT PRIMARY KEY ${staleInternoCheck},
        access_token TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
        rotated_at TEXT,
        rotated_by TEXT,
        FOREIGN KEY(rotated_by) REFERENCES users(user_id)
      );
      DROP TABLE sala_interno_access;
      ALTER TABLE sala_interno_access_v24stale RENAME TO sala_interno_access;
    `);
    db.prepare(
      `INSERT INTO sala_interno_access (sala, access_token, is_active, rotated_at)
       VALUES ('Sala 1', 'token-sala1', 0, '2026-01-01T00:00:00Z')`
    ).run();
    db.prepare(
      `INSERT INTO sala_interno_access (sala, access_token, is_active, rotated_at)
       VALUES ('Torre HU', 'token-torre-hu-active', 1, '2026-06-01T00:00:00Z')`
    ).run();

    applyMigrations(db);

    assert.equal(
      db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get().value,
      String(SCHEMA_VERSION)
    );

    const users = db.prepare('SELECT user_id, sala FROM users ORDER BY user_id').all();
    assert.deepEqual(
      users.map((u) => [u.user_id, u.sala]),
      [
        ['u-null', null],
        ['u-sala1', 'Unidad IC'],
      ]
    );

    const team = db.prepare("SELECT sala FROM teams WHERE team_id = 't-torre'").get();
    assert.equal(team.sala, 'Unidad IC');

    // Legacy access rows collapse onto the single PK; the active token wins over the stale one.
    const internoRows = db.prepare('SELECT sala, access_token, is_active FROM sala_interno_access').all();
    assert.equal(internoRows.length, 1);
    assert.equal(internoRows[0].sala, 'Unidad IC');
    assert.equal(internoRows[0].access_token, 'token-torre-hu-active');
    assert.equal(internoRows[0].is_active, 1);

    // New CHECK enforced on the rebuilt tables.
    assert.throws(() => {
      db.prepare(`UPDATE users SET sala = 'Sala 2' WHERE user_id = 'u-sala1'`).run();
    }, /CHECK constraint failed/);

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
