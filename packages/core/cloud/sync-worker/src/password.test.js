import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, LEGACY_ITERATIONS, MAX_ITERATIONS } from './password.js';

describe('password', () => {
  it('round-trips PBKDF2 verify at the hash iteration count', async () => {
    const { salt, hash, iterations } = await hashPassword('correct-horse-battery');
    assert.equal(iterations, MAX_ITERATIONS);
    assert.equal(await verifyPassword('correct-horse-battery', salt, hash, iterations), true);
    assert.equal(await verifyPassword('wrong', salt, hash, iterations), false);
  });

  it('new hashes default to MAX_ITERATIONS (the Cloudflare platform cap)', async () => {
    const { iterations } = await hashPassword('any-password');
    assert.equal(iterations, 100_000);
  });

  it('a legacy row (hashed at 50k, no explicit iterations) still verifies against LEGACY_ITERATIONS', async () => {
    const { salt, hash } = await hashPassword('legacy-user-password', LEGACY_ITERATIONS);
    // Caller passes no iterations — simulates an old row with password_iterations
    // defaulted by the schema migration, same behavior as before this change.
    assert.equal(await verifyPassword('legacy-user-password', salt, hash), true);
  });

  it('verifying with the wrong iteration count fails — this is exactly the 2026-08-14 bug', async () => {
    const { salt, hash } = await hashPassword('some-password', MAX_ITERATIONS);
    // Simulates the historical incident: hash computed at one iteration count,
    // verified at a different hardcoded one — must fail, not silently succeed.
    assert.equal(await verifyPassword('some-password', salt, hash, LEGACY_ITERATIONS), false);
  });

  it('a room can mix iteration counts across users without breaking either login', async () => {
    const legacy = await hashPassword('user-a-pass', LEGACY_ITERATIONS);
    const modern = await hashPassword('user-b-pass', MAX_ITERATIONS);
    assert.equal(await verifyPassword('user-a-pass', legacy.salt, legacy.hash, legacy.iterations), true);
    assert.equal(await verifyPassword('user-b-pass', modern.salt, modern.hash, modern.iterations), true);
  });
});
