import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidUsernameFormat, normalizeUsername } from './clinical-username.mjs';

describe('clinical-username (renderer)', () => {
  it('matches db validation rules', () => {
    assert.equal(isValidUsernameFormat('mgarcia'), true);
    assert.equal(normalizeUsername(' MGarcia '), 'mgarcia');
  });
});
