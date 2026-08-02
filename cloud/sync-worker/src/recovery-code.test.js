// cloud/sync-worker/src/recovery-code.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateRecoveryCode, normalizeRecoveryCode } from './recovery-code.js';

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
});
