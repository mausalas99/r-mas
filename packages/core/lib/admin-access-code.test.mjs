import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './db/schema.mjs';
import { ensureClinicalUser } from './db/clinical-access-db.mjs';
import {
  hasAdminAccessCode,
  verifyAdminAccessCode,
  setAdminAccessCode,
} from './admin-access-code.mjs';

describe('admin-access-code', () => {
  let db;
  beforeEach(() => {
    db = new Database(':memory:');
    applyMigrations(db);
  });

  it('no code saved → nothing verifies, not even empty input', () => {
    assert.equal(hasAdminAccessCode(db), false);
    assert.equal(verifyAdminAccessCode(db, ''), false);
    assert.equal(verifyAdminAccessCode(db, null), false);
    assert.equal(verifyAdminAccessCode(db, 'any-guess'), false);
  });

  it('stores only a hash, and verifies trimmed input', () => {
    setAdminAccessCode(db, { userId: 'x', newCode: '  secret-1  ' });
    const raw = db.prepare("SELECT value FROM app_meta WHERE key = 'admin_access_code_hash'").get();
    assert.equal(raw.value.includes('secret-1'), false);
    assert.equal(verifyAdminAccessCode(db, 'secret-1'), true);
    assert.equal(verifyAdminAccessCode(db, ' secret-1 '), true);
    assert.equal(verifyAdminAccessCode(db, 'secret-2'), false);
  });

  it('rejects short codes', () => {
    assert.throws(() => setAdminAccessCode(db, { userId: 'x', newCode: '12345' }), /al menos 6/);
  });

  it('change needs the current code', () => {
    setAdminAccessCode(db, { userId: 'x', newCode: 'first-code' });
    assert.throws(
      () => setAdminAccessCode(db, { userId: 'x', currentCode: 'nope', newCode: 'second-code' }),
      /Código actual incorrecto/
    );
    setAdminAccessCode(db, { userId: 'x', currentCode: 'first-code', newCode: 'second-code' });
    assert.equal(verifyAdminAccessCode(db, 'first-code'), false);
    assert.equal(verifyAdminAccessCode(db, 'second-code'), true);
  });

  it('first code: only an existing admin may create it once an admin exists', () => {
    const admin = ensureClinicalUser(db, { clientId: 'dev-admin', rank: 'R4' });
    const other = ensureClinicalUser(db, { clientId: 'dev-other', rank: 'R1' });
    db.prepare('UPDATE users SET is_program_admin = 1 WHERE user_id = ?').run(admin.userId);
    assert.throws(
      () => setAdminAccessCode(db, { userId: other.userId, newCode: 'grab-it-1' }),
      /Solo un administrador/
    );
    setAdminAccessCode(db, { userId: admin.userId, newCode: 'owner-code' });
    assert.equal(verifyAdminAccessCode(db, 'owner-code'), true);
  });

  it('corrupt stored value never verifies', () => {
    db.prepare("INSERT INTO app_meta (key, value) VALUES ('admin_access_code_hash', 'garbage')").run();
    assert.equal(verifyAdminAccessCode(db, 'garbage'), false);
  });
});
