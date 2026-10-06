import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

/** Rebuild a table with the rotation values removed from its CHECKs (the v29 shape). */
function downgradeTable(db, table) {
  const { sql } = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table);
  const old = sql.replace(/^CREATE TABLE\s+("?)\w+\1/i, `CREATE TABLE ${table}_old`).replace(/, '(?:UCI|PostQx|Subespecialidad|Rotación)'/g, '');
  db.exec(`${old};
    INSERT INTO ${table}_old SELECT * FROM ${table};
    DROP TABLE ${table};
    ALTER TABLE ${table}_old RENAME TO ${table};`);
}

const insertUser = `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
  VALUES (?, ?, 'x', 'R1', 'pk', 'epk', 'Dr. Synthetic', ?)`;
const insertTeam = `INSERT INTO teams (team_id, name, service, on_call_day_index, created_by, sala, succeeds_team_id)
  VALUES (?, ?, ?, 0, ?, ?, ?)`;

describe('schema v30 rotation salas', () => {
  it('fresh DB accepts the three rotation salas and the Rotación service', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 31);
    db.prepare(insertUser).run('u1', 'dr_rot', 'UCI');
    db.prepare(insertUser).run('u2', 'dr_pq', 'PostQx');
    db.prepare(insertTeam).run('t1', 'UCI', 'Rotación', 'u1', 'UCI', null);
    db.prepare(insertTeam).run('t2', 'Sub', 'Rotación', 'u2', 'Subespecialidad', null);
    assert.equal(db.prepare('SELECT service FROM teams').get().service, 'Rotación');
    assert.throws(() => db.prepare(insertUser).run('u9', 'dr_bare', 'Rotación'), /CHECK/);
    db.close();
  });

  it('upgrades a v29 DB, keeps rows, columns, FKs and indexes', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    db.pragma('foreign_keys = OFF');
    downgradeTable(db, 'users');
    downgradeTable(db, 'teams');
    db.pragma('foreign_keys = ON');
    db.prepare("UPDATE app_meta SET value = '29' WHERE key = 'schema_version'").run();
    assert.throws(() => db.prepare(insertUser).run('bad', 'dr_bad', 'UCI'), /CHECK/);

    db.prepare(insertUser).run('u1', 'dr_a', 'Sala 1');
    db.prepare(insertUser).run('u2', 'dr_b', 'Torre HU');
    db.prepare(insertTeam).run('t1', 'Equipo A', 'Sala', 'u1', 'Sala 1', null);
    db.prepare(insertTeam).run('t2', 'Equipo B', 'Torre HU', 'u2', 'Torre HU', 't1');
    db.prepare('INSERT INTO team_membership (team_id, user_id) VALUES (?, ?)').run('t1', 'u1');
    db.prepare('INSERT INTO team_membership (team_id, user_id) VALUES (?, ?)').run('t2', 'u2');
    db.exec('CREATE INDEX idx_teams_sala_test ON teams(sala)');
    const colsBefore = ['users', 'teams'].map((t) => db.prepare(`PRAGMA table_info(${t})`).all());

    applyMigrations(db);

    assert.equal(db.prepare("SELECT value FROM app_meta WHERE key='schema_version'").get().value, '31');
    assert.deepEqual(['users', 'teams'].map((t) => db.prepare(`PRAGMA table_info(${t})`).all()), colsBefore);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2);
    assert.equal(db.prepare("SELECT succeeds_team_id FROM teams WHERE team_id='t2'").get().succeeds_team_id, 't1');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM team_membership').get().n, 2);
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name='idx_teams_sala_test'").get());
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);

    db.prepare(insertUser).run('u3', 'dr_rot', 'UCI');
    db.prepare(insertTeam).run('t3', 'UCI', 'Rotación', 'u3', 'PostQx', null);
    db.prepare("UPDATE users SET sala = 'Subespecialidad' WHERE user_id = 'u1'").run();
    assert.throws(() => db.prepare(insertUser).run('u4', 'dr_bare', 'Rotación'), /CHECK/);
    assert.throws(() => db.prepare(insertTeam).run('t4', 'X', 'Nope', 'u3', null, null), /CHECK/);
    db.close();
  });
});
