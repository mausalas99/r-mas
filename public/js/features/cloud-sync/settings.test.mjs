import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCloudSyncRemember,
  setCloudSyncRemember,
  setCloudSyncToken,
  getCloudSyncToken,
  clearCloudSyncSession,
  setCloudSyncRoomSnapshot,
  getCloudSyncRoomSnapshot,
  getCloudSyncRoomId,
  getCloudSyncRevision,
  setCloudSyncRevision,
  advanceCloudSyncRevision,
} from './settings.mjs';

function memoryStore() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    clear() {
      map.clear();
    },
  };
}

describe('cloud sync remember me settings', () => {
  const prevSession = globalThis.sessionStorage;
  const prevLocal = globalThis.localStorage;

  beforeEach(() => {
    globalThis.sessionStorage = memoryStore();
    globalThis.localStorage = memoryStore();
  });

  afterEach(() => {
    globalThis.sessionStorage = prevSession;
    globalThis.localStorage = prevLocal;
  });

  it('persists token to localStorage when remember is on', () => {
    setCloudSyncToken('tok-abc', { remember: true });
    assert.equal(getCloudSyncRemember(), true);
    assert.equal(getCloudSyncToken(), 'tok-abc');
    assert.equal(globalThis.localStorage.getItem('rpc-cloud-sync-token'), 'tok-abc');
  });

  it('keeps token only in sessionStorage when remember is off', () => {
    setCloudSyncToken('tok-sess', { remember: false });
    assert.equal(getCloudSyncRemember(), false);
    assert.equal(getCloudSyncToken(), 'tok-sess');
    assert.equal(globalThis.localStorage.getItem('rpc-cloud-sync-token'), null);
    globalThis.sessionStorage.clear();
    assert.equal(getCloudSyncToken(), '');
  });

  it('restores token from localStorage after session cleared when remember on', () => {
    setCloudSyncToken('tok-persist', { remember: true });
    globalThis.sessionStorage.clear();
    assert.equal(getCloudSyncToken(), 'tok-persist');
  });

  it('stores room snapshot for sala identity', () => {
    setCloudSyncRemember(true);
    setCloudSyncRoomSnapshot({
      id: 'room-1',
      code: 'W8N6CW',
      sala: 'Sala 1',
      turnKey: '2026-08',
      revision: 4,
    });
    assert.equal(getCloudSyncRoomId(), 'room-1');
    assert.deepEqual(getCloudSyncRoomSnapshot(), {
      id: 'room-1',
      code: 'W8N6CW',
      sala: 'Sala 1',
      turnKey: '2026-08',
      name: '',
    });
    clearCloudSyncSession();
    assert.equal(getCloudSyncRoomId(), '');
    assert.equal(getCloudSyncRoomSnapshot(), null);
  });

  it('advanceCloudSyncRevision ignores stale lower server revisions', () => {
    setCloudSyncRevision(779);
    advanceCloudSyncRevision(541);
    assert.equal(getCloudSyncRevision(), 779);
    advanceCloudSyncRevision(800);
    assert.equal(getCloudSyncRevision(), 800);
    setCloudSyncRevision(0);
    advanceCloudSyncRevision(12);
    assert.equal(getCloudSyncRevision(), 12);
  });
});
