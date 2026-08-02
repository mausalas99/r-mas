import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import { assertAdmin, timingSafeEqual } from './admin.js';

describe('timingSafeEqual', () => {
  it('matches equal strings', () => {
    assert.equal(timingSafeEqual('abc', 'abc'), true);
    assert.equal(timingSafeEqual('', ''), true);
  });

  it('rejects different strings and lengths', () => {
    assert.equal(timingSafeEqual('abc', 'abd'), false);
    assert.equal(timingSafeEqual('abc', 'ab'), false);
    assert.equal(timingSafeEqual('abc', 'abcd'), false);
  });

  it('rejects non-strings', () => {
    assert.equal(timingSafeEqual('abc', /** @type {any} */ (null)), false);
    assert.equal(timingSafeEqual(/** @type {any} */ (123), '123'), false);
  });
});

function makeRequest(headers = {}) {
  return new Request('https://sync.test/api/sync/v1/admin/overview', {
    headers,
  });
}

describe('assertAdmin', () => {
  const env = { SYNC_ADMIN_KEY: 'bootstrap-secret-key' };

  it('allows admin role', () => {
    assert.doesNotThrow(() =>
      assertAdmin(makeRequest(), env, { role: 'admin' })
    );
  });

  it('allows program_admin role', () => {
    assert.doesNotThrow(() =>
      assertAdmin(makeRequest(), env, { role: 'program_admin' })
    );
  });

  it('allows valid X-Sync-Admin-Key without user', () => {
    assert.doesNotThrow(() =>
      assertAdmin(
        makeRequest({ 'X-Sync-Admin-Key': 'bootstrap-secret-key' }),
        env,
        null
      )
    );
  });

  it('allows valid X-Sync-Admin-Key with non-admin user (bootstrap)', () => {
    assert.doesNotThrow(() =>
      assertAdmin(
        makeRequest({ 'X-Sync-Admin-Key': 'bootstrap-secret-key' }),
        env,
        { role: 'member' }
      )
    );
  });

  it('rejects wrong admin key', () => {
    assert.throws(
      () =>
        assertAdmin(
          makeRequest({ 'X-Sync-Admin-Key': 'wrong-key' }),
          env,
          { role: 'member' }
        ),
      (err) => {
        assert.ok(err instanceof SyncError);
        assert.equal(err.code, 'forbidden');
        return true;
      }
    );
  });

  it('rejects member without admin key', () => {
    assert.throws(
      () => assertAdmin(makeRequest(), env, { role: 'member' }),
      (err) => {
        assert.ok(err instanceof SyncError);
        assert.equal(err.code, 'forbidden');
        return true;
      }
    );
  });

  it('rejects when no user and no admin key', () => {
    assert.throws(
      () => assertAdmin(makeRequest(), env, null),
      SyncError
    );
  });

  it('rejects when SYNC_ADMIN_KEY unset and user not admin', () => {
    assert.throws(
      () =>
        assertAdmin(
          makeRequest({ 'X-Sync-Admin-Key': 'any-key' }),
          {},
          { role: 'member' }
        ),
      SyncError
    );
  });
});
