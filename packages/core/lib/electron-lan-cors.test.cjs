'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldInjectLanCors,
  shouldInjectCloudSyncCors,
  isPrivateLanHost,
  isTrustedRendererOrigin,
} = require('./electron-lan-cors.cjs');

describe('electron-lan-cors', () => {
  it('isPrivateLanHost accepts ward subnets and loopback', () => {
    assert.equal(isPrivateLanHost('10.0.57.52'), true);
    assert.equal(isPrivateLanHost('192.168.1.4'), true);
    assert.equal(isPrivateLanHost('localhost'), true);
    assert.equal(isPrivateLanHost('8.8.8.8'), false);
  });

  it('shouldInjectLanCors matches private LAN API URLs on 3738', () => {
    assert.equal(
      shouldInjectLanCors('http://10.0.57.52:3738/api/lan/v1/rooms/sala-2/sync-bundle'),
      true
    );
    assert.equal(shouldInjectLanCors('http://10.0.57.52:3738/health'), false);
    assert.equal(shouldInjectLanCors('http://8.8.8.8:3738/api/lan/v1/ping'), false);
  });

  it('shouldInjectCloudSyncCors matches Nube worker sync API', () => {
    assert.equal(
      shouldInjectCloudSyncCors(
        'https://rplus-sync.rmas-workersdev.workers.dev/api/sync/v1/rooms/x/pull?since=0'
      ),
      true
    );
    assert.equal(
      shouldInjectCloudSyncCors(
        'wss://rplus-sync.rmas-workersdev.workers.dev/api/sync/v1/rooms/x/live'
      ),
      true
    );
    assert.equal(shouldInjectCloudSyncCors('https://example.com/api/sync/v1/ping'), true);
    assert.equal(shouldInjectCloudSyncCors('https://example.com/health'), false);
  });

  it('shouldInjectCloudSyncCors refuses clear-text sync to remote hosts', () => {
    assert.equal(shouldInjectCloudSyncCors('http://example.com/api/sync/v1/ping'), false);
    assert.equal(shouldInjectCloudSyncCors('ws://example.com/api/sync/v1/rooms/x/live'), false);
    assert.equal(shouldInjectCloudSyncCors('http://127.0.0.1:8787/api/sync/v1/ping'), true);
    assert.equal(shouldInjectCloudSyncCors('ws://localhost:8787/api/sync/v1/rooms/x/live'), true);
  });

  it('isTrustedRendererOrigin accepts only the app renderer', () => {
    assert.equal(isTrustedRendererOrigin('app://rplus'), true);
    assert.equal(isTrustedRendererOrigin('http://localhost:3738'), true);
    assert.equal(isTrustedRendererOrigin('https://evil.example'), false);
    assert.equal(isTrustedRendererOrigin('null'), false);
    assert.equal(isTrustedRendererOrigin(undefined), false);
  });
});
