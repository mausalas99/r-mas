import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './db/schema.mjs';
import {
  verifyAdminAccessCode,
  setAdminAccessCode,
  DEFAULT_ADMIN_ACCESS_CODE,
} from './admin-access-code.mjs';

describe('admin-access-code', () => {
  /** @type {import('better-sqlite3').Database} */
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    applyMigrations(db);
  });

  it('seeds and accepts the default code on first use', () => {
    assert.equal(verifyAdminAccessCode(db, DEFAULT_ADMIN_ACCESS_CODE), true);
    assert.equal(verifyAdminAccessCode(db, '  ' + DEFAULT_ADMIN_ACCESS_CODE + '  '), true);
  });

  it('rejects wrong or empty input', () => {
    assert.equal(verifyAdminAccessCode(db, 'wrong'), false);
    assert.equal(verifyAdminAccessCode(db, ''), false);
    assert.equal(verifyAdminAccessCode(db, null), false);
  });

  it('setAdminAccessCode changes the code once the current one is verified', () => {
    assert.throws(
      () => setAdminAccessCode(db, 'wrong', 'nuevoCodigo123'),
      /actual incorrecto/
    );
    setAdminAccessCode(db, DEFAULT_ADMIN_ACCESS_CODE, 'nuevoCodigo123');
    assert.equal(verifyAdminAccessCode(db, DEFAULT_ADMIN_ACCESS_CODE), false);
    assert.equal(verifyAdminAccessCode(db, 'nuevoCodigo123'), true);
  });

  it('rejects a new code that is too short', () => {
    assert.throws(
      () => setAdminAccessCode(db, DEFAULT_ADMIN_ACCESS_CODE, 'abc'),
      /al menos 6 caracteres/
    );
  });
});
