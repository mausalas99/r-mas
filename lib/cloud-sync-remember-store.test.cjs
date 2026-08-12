'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  readCloudSyncRememberStore,
  writeCloudSyncRememberStore,
  clearCloudSyncRememberStore,
  FILE_NAME,
} = require('./cloud-sync-remember-store.cjs');

describe('cloud-sync-remember-store', () => {
  /** @type {string} */
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-remember-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips token + room snapshot', () => {
    writeCloudSyncRememberStore(dir, {
      remember: true,
      token: 'tok-1',
      roomId: 'room-1',
      revision: 12,
      roomMeta: { id: 'room-1', code: 'ABC123', sala: 'Sala 1', turnKey: '2026-08', name: '' },
    });
    assert.equal(fs.existsSync(path.join(dir, FILE_NAME)), true);
    assert.deepEqual(readCloudSyncRememberStore(dir), {
      remember: true,
      token: 'tok-1',
      roomId: 'room-1',
      revision: 12,
      roomMeta: { id: 'room-1', code: 'ABC123', sala: 'Sala 1', turnKey: '2026-08', name: '' },
    });
  });

  it('clear removes file', () => {
    writeCloudSyncRememberStore(dir, { token: 'tok', remember: true });
    clearCloudSyncRememberStore(dir);
    assert.equal(readCloudSyncRememberStore(dir), null);
  });

  it('empty token clears store', () => {
    writeCloudSyncRememberStore(dir, { token: 'tok', remember: true });
    writeCloudSyncRememberStore(dir, { token: '', remember: true });
    assert.equal(readCloudSyncRememberStore(dir), null);
  });
});
