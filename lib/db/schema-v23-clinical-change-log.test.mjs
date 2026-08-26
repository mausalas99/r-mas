import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v23 clinical_change_log', () => {
  it('creates clinical_change_log and bumps SCHEMA_VERSION to 23', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 25);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), SCHEMA_VERSION);
    const cols = db.prepare('PRAGMA table_info(clinical_change_log)').all().map((c) => c.name);
    for (const name of [
      'id', 'change_id', 'command_type', 'blob_keys', 'patient_id', 'actor_id', 'origin', 'created_at', 'synced_at',
    ]) {
      assert.ok(cols.includes(name), `missing column ${name}`);
    }
    db.close();
  });
});
