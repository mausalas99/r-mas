'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assertAllowedCloudSyncUrl, cloudSyncNetFetch } = require('./cloud-sync-ipc-fetch.cjs');

describe('cloud-sync-ipc-fetch', () => {
  it('allows sync worker API URLs', () => {
    assert.doesNotThrow(() =>
      assertAllowedCloudSyncUrl(
        'https://rplus-sync.rmas-workersdev.workers.dev/api/sync/v1/auth/login'
      )
    );
  });

  it('blocks non-sync paths', () => {
    assert.throws(
      () => assertAllowedCloudSyncUrl('https://evil.example.com/api/other'),
      /cloud_sync_url_not_allowed/
    );
  });
});

describe('cloudSyncNetFetch — timeout', () => {
  const URL = 'https://x/api/sync/v1/admin/network-census';

  it('passes an AbortSignal to net.fetch (so a hung connection cannot wait forever)', async () => {
    let sawSignal = null;
    const net = {
      fetch: async (_url, init) => {
        sawSignal = init?.signal;
        return { ok: true, status: 200, statusText: 'OK', text: async () => '{}', headers: { get: () => null } };
      },
    };
    await cloudSyncNetFetch(net, { url: URL });
    assert.ok(sawSignal instanceof AbortSignal, 'expected an AbortSignal on the fetch init');
  });

  it('turns an aborted/timed-out fetch into a clear cloud_sync_timeout error instead of hanging', async () => {
    const net = {
      fetch: async () => {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      },
    };
    await assert.rejects(() => cloudSyncNetFetch(net, { url: URL }), /cloud_sync_timeout/);
  });

  it('does not mask a real, non-timeout fetch failure', async () => {
    const net = {
      fetch: async () => {
        throw new Error('ENOTFOUND');
      },
    };
    await assert.rejects(() => cloudSyncNetFetch(net, { url: URL }), /ENOTFOUND/);
  });
});
