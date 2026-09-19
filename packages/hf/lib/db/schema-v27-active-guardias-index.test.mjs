import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

// active_guardias was dropped in v24 (IM-only guardia coverage tracking, not used in
// cardio) — the migration guards on tableExists, so only the team_membership /
// team_guardia_today indexes apply here.
describe('schema v27 active_guardias index', () => {
  it('adds hot-path indexes and bumps SCHEMA_VERSION to 27', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 27);
    const v = db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
    assert.equal(Number(v.value), 27);

    const indexNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((r) => r.name);
    for (const name of ['idx_team_membership_user', 'idx_team_guardia_today_user']) {
      assert.ok(indexNames.includes(name), `missing index ${name}`);
    }
    db.close();
  });

  it('WHERE user_id = ? on team_membership uses the new index', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const plan = db
      .prepare("EXPLAIN QUERY PLAN SELECT * FROM team_membership WHERE user_id = 'u1'")
      .all();
    const usesIndex = plan.some((row) => /idx_team_membership_user/.test(row.detail));
    assert.ok(usesIndex, `expected index scan, got: ${JSON.stringify(plan)}`);
    db.close();
  });
});
