// cloud/sync-worker/src/recovery-code.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRecoveryCode,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyRecoveryCode,
} from './recovery-code.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

describe('generateRecoveryCode', () => {
  it('matches R+XXXX-XXXX-XXXX with unambiguous alphabet', () => {
    for (let i = 0; i < 30; i++) {
      const code = generateRecoveryCode();
      assert.match(code, /^R\+[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      const body = code.slice(2).replace(/-/g, '');
      for (const ch of body) assert.ok(ALPHABET.includes(ch), ch);
    }
  });
});

describe('normalizeRecoveryCode', () => {
  it('uppercases and strips spaces', () => {
    assert.equal(normalizeRecoveryCode('  r+ab3k-7nmp-q2wx  '), 'R+AB3K-7NMP-Q2WX');
  });

  it('returns empty for garbage', () => {
    assert.equal(normalizeRecoveryCode('nope'), '');
    assert.equal(normalizeRecoveryCode(''), '');
  });

  it('rejects ambiguous characters I, O, 0, 1', () => {
    assert.equal(normalizeRecoveryCode('R+ABIK-7NOP-Q201'), '');
  });
});

describe('hashRecoveryCode + verifyRecoveryCode', () => {
  it('round-trips a generated code', async () => {
    const code = generateRecoveryCode();
    const { salt, hash } = await hashRecoveryCode(code);
    assert.equal(await verifyRecoveryCode(code, salt, hash), true);
  });

  it('fails verification for wrong code', async () => {
    const code = generateRecoveryCode();
    const wrong = generateRecoveryCode();
    const { salt, hash } = await hashRecoveryCode(code);
    assert.equal(await verifyRecoveryCode(wrong, salt, hash), false);
  });

  it('throws when hashing invalid code', async () => {
    await assert.rejects(() => hashRecoveryCode('not-a-code'), /invalid_recovery_code/);
  });
});
