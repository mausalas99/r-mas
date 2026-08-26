import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v24 active_guardias index', () => {
  it('adds hot-path indexes and bumps SCHEMA_VERSION to 24', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 25);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), 25);

    const indexNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((r) => r.name);
    for (const name of [
      'idx_active_guardias_patient_status',
      'idx_active_guardias_status_covering',
      'idx_active_guardias_status_assigned',
      'idx_team_membership_user',
      'idx_team_guardia_today_user',
    ]) {
      assert.ok(indexNames.includes(name), `missing index ${name}`);
    }
    db.close();
  });

  it('WHERE status = ? on active_guardias uses the new index', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const plan = db
      .prepare("EXPLAIN QUERY PLAN SELECT * FROM active_guardias WHERE status = 'Active' ORDER BY assigned_at")
      .all();
    const usesIndex = plan.some((row) => /idx_active_guardias_status_assigned/.test(row.detail));
    assert.ok(usesIndex, `expected index scan, got: ${JSON.stringify(plan)}`);
    db.close();
  });
});
