import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cloudHeaderSyncModifier } from './cloud-sync-header-chrome.mjs';

describe('cloud-sync-header-chrome', () => {
  it('cloudHeaderSyncModifier maps runtime states to header classes', () => {
    assert.equal(cloudHeaderSyncModifier('idle', 'ws'), 'live');
    assert.equal(cloudHeaderSyncModifier('idle', 'poll'), 'local');
    assert.equal(cloudHeaderSyncModifier('syncing', 'ws'), 'syncing');
    assert.equal(cloudHeaderSyncModifier('pending', 'poll'), 'degraded');
    assert.equal(cloudHeaderSyncModifier('error', 'ws'), 'degraded');
    assert.equal(cloudHeaderSyncModifier('offline', 'poll'), 'degraded');
  });
});
