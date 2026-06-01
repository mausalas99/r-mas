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
});
