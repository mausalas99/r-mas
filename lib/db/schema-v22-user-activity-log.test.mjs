import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';
import {
  listClinicalUserActivityHistoryByIds,
  listLanDirectoryUsers,
  touchClinicalUserActivity,
} from './clinical-access-db.mjs';

describe('schema v22 user_activity_log', () => {
  it('creates log table, seeds from created/last, and appends on touch', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 22);
    const v = db.prepare(`SELECT value FROM app_meta WHERE key = 'schema_version'`).get();
    assert.equal(Number(v.value), 22);

    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala, created_at, last_activity_at)
       VALUES ('u1', 'cindypsc', 'x', 'R1', 'pk', 'epk', 'Cindy', 'Sala E', '2026-06-10 08:00:00', '2026-08-07T10:21:00.000Z')`
    ).run();

    // Re-run seed path by calling migrate helper is already done at empty; seed manually via touch + history APIs.
    // Fresh insert after migrate won't auto-seed — simulate seed by calling migrate again on empty log for this user:
    db.prepare(
      `INSERT INTO user_activity_log (user_id, at_iso, source) VALUES (?, ?, ?)`
    ).run('u1', '2026-06-10T08:00:00.000Z', 'seed_created');
    db.prepare(
      `INSERT INTO user_activity_log (user_id, at_iso, source) VALUES (?, ?, ?)`
    ).run('u1', '2026-08-07T10:21:00.000Z', 'seed_last');

    touchClinicalUserActivity(db, 'u1', '2026-08-07T16:00:00.000Z', 'session');
    const hist = listClinicalUserActivityHistoryByIds(db, ['u1'], 12).get('u1') || [];
    assert.ok(hist.length >= 3);
    assert.equal(hist[0].at, '2026-08-07T16:00:00.000Z');
    assert.equal(hist[0].source, 'session');

    const listed = listLanDirectoryUsers(db);
    const cindy = listed.find((u) => u.username === 'cindypsc');
    assert.ok(cindy);
    assert.ok(Array.isArray(cindy.activity_history));
    assert.ok(cindy.activity_history.length >= 3);
    db.close();
  });

  it('seeds existing users when upgrading to v22', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    db.prepare("UPDATE app_meta SET value = '21' WHERE key = 'schema_version'").run();
    db.exec('DROP TABLE IF EXISTS user_activity_log');
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala, created_at, last_activity_at)
       VALUES ('u2', 'cindysalazar', 'x', 'R1', 'pk', 'epk', 'Cindy S', 'Área A/Pensionistas', '2026-05-01 12:00:00', '2026-08-01T09:00:00.000Z')`
    ).run();
    applyMigrations(db);
    const n = db
      .prepare(`SELECT COUNT(*) AS c FROM user_activity_log WHERE user_id = 'u2'`)
      .get().c;
    assert.ok(n >= 2);
    const v = db.prepare(`SELECT value FROM app_meta WHERE key = 'schema_version'`).get();
    assert.equal(Number(v.value), 22);
    db.close();
  });
});
