import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v26 teams.succeeds_team_id', () => {
  it('adds the column and bumps SCHEMA_VERSION to 26', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 26);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), 26);

    const cols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    assert.ok(cols.includes('succeeds_team_id'));
    db.close();
  });

  it('re-running the v26 step on an already-migrated DB is a no-op (idempotent)', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    db.prepare(
      `INSERT INTO teams (team_id, name, service, on_call_day_index, sala, rotation_active)
       VALUES ('t1', 'Equipo A', 'Sala', 0, 'Sala 2', 1)`
    ).run();

    // Simulate re-entering the v26 step from an older stamped version.
    db.prepare(
      "INSERT INTO app_meta (key, value) VALUES ('schema_version', '25') ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run();
    applyMigrations(db);

    const cols = db.prepare('PRAGMA table_info(teams)').all().map((c) => c.name);
    assert.equal(cols.filter((c) => c === 'succeeds_team_id').length, 1);
    const row = db.prepare('SELECT name, succeeds_team_id FROM teams WHERE team_id = ?').get('t1');
    assert.equal(row.name, 'Equipo A');
    assert.equal(row.succeeds_team_id, null);
    db.close();
  });
});
