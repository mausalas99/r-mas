'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { assertAllowedCloudSyncUrl } = require('./cloud-sync-ipc-fetch.cjs');

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
