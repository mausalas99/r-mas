import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCloudIdentityUsername } from './identity-bridge.mjs';

describe('identity-bridge', () => {
  it('normalizes cloud usernames like LAN @usuario', () => {
    assert.equal(normalizeCloudIdentityUsername('@DrMendoza'), 'drmendoza');
    assert.equal(normalizeCloudIdentityUsername('  R4_Garcia '), 'r4_garcia');
  });

  it('does not stamp isProgramAdmin:false onto the profile upsert (would wipe existing admins)', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./identity-bridge.mjs', import.meta.url), 'utf8')
    );
    assert.doesNotMatch(src, /isProgramAdmin:\s*false/);
  });
});
