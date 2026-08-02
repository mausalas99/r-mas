import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCloudIdentityUsername } from './identity-bridge.mjs';

describe('identity-bridge', () => {
  it('normalizes cloud usernames like LAN @usuario', () => {
    assert.equal(normalizeCloudIdentityUsername('@DrMendoza'), 'drmendoza');
    assert.equal(normalizeCloudIdentityUsername('  R4_Garcia '), 'r4_garcia');
  });
});
