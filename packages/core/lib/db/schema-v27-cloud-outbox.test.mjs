import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v27 cloud_outbox', () => {
  it('creates the table and bumps SCHEMA_VERSION to 27', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 28);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), 28);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cloud_outbox'")
      .all();
    assert.equal(tables.length, 1);
    db.close();
  });

  it('re-running the v27 step on an already-migrated DB is a no-op (idempotent)', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    db.prepare(
      'INSERT INTO cloud_outbox (client_mutation_id, ops, base_revision, enqueued_at) VALUES (?, ?, ?, ?)'
    ).run('m1', '[]', null, 1);

    db.prepare(
      "INSERT INTO app_meta (key, value) VALUES ('schema_version', '26') ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run();
    applyMigrations(db);

    const row = db.prepare('SELECT client_mutation_id FROM cloud_outbox WHERE client_mutation_id = ?').get('m1');
    assert.equal(row.client_mutation_id, 'm1');
    db.close();
  });
});
