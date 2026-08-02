import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('round-trips PBKDF2 verify', async () => {
    const { salt, hash } = await hashPassword('correct-horse-battery');
    assert.equal(await verifyPassword('correct-horse-battery', salt, hash), true);
    assert.equal(await verifyPassword('wrong', salt, hash), false);
  });
});
