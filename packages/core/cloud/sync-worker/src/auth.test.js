import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import { normalizeUsername, validatePassword, validateUsername } from './auth.js';

describe('normalizeUsername', () => {
  it('lowercases and trims', () => {
    assert.equal(normalizeUsername('  Ab_C  '), 'ab_c');
    assert.equal(normalizeUsername('R1.Demo'), 'r1.demo');
  });

  it('handles empty', () => {
    assert.equal(normalizeUsername(''), '');
    assert.equal(normalizeUsername(null), '');
  });
});

describe('validateUsername', () => {
  it('accepts valid usernames', () => {
    assert.doesNotThrow(() => validateUsername('r1demo'));
    assert.doesNotThrow(() => validateUsername('user.name_1'));
    assert.doesNotThrow(() => validateUsername('abc'));
  });

  it('rejects too short', () => {
    assert.throws(() => validateUsername('ab'), (err) => {
      assert.ok(err instanceof SyncError);
      assert.equal(err.code, 'invalid_request');
      return true;
    });
  });

  it('rejects invalid characters', () => {
    assert.throws(() => validateUsername('user@mail'), SyncError);
    assert.throws(() => validateUsername('has space'), SyncError);
  });

  it('rejects too long', () => {
    assert.throws(() => validateUsername('a'.repeat(33)), SyncError);
  });
});

describe('validatePassword', () => {
  it('accepts passwords >= 10 chars', () => {
    assert.doesNotThrow(() => validatePassword('1234567890'));
    assert.doesNotThrow(() => validatePassword('correct-horse-battery'));
  });

  it('rejects short passwords', () => {
    assert.throws(() => validatePassword('short'), (err) => {
      assert.ok(err instanceof SyncError);
      assert.equal(err.code, 'invalid_request');
      return true;
    });
  });

  it('rejects non-strings', () => {
    assert.throws(() => validatePassword(/** @type {any} */ (123)), SyncError);
  });
});
