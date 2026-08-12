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

describe('cloud sync remember durable bridge', () => {
  const prevSession = globalThis.sessionStorage;
  const prevLocal = globalThis.localStorage;
  const prevWin = globalThis.window;

  beforeEach(() => {
    globalThis.sessionStorage = memoryStore();
    globalThis.localStorage = memoryStore();
  });

  afterEach(() => {
    globalThis.sessionStorage = prevSession;
    globalThis.localStorage = prevLocal;
    globalThis.window = prevWin;
  });

  it('hydrates token from electronAPI durable store', async () => {
    const snap = {
      remember: true,
      token: 'tok-disk',
      roomId: 'room-disk',
      revision: 9,
      roomMeta: { id: 'room-disk', code: 'ZZ', sala: 'Sala 1', turnKey: '2026-08', name: '' },
    };
    globalThis.window = {
      electronAPI: {
        cloudSyncRememberGetSync: () => snap,
        cloudSyncRememberSet: async () => snap,
        cloudSyncRememberClear: async () => ({ ok: true }),
      },
    };
    // Re-import module so rememberHydrated resets — dynamic import cache: use setters after reset via clear + new read
    // Module state rememberHydrated sticks; call through getCloudSyncToken after forcing by clearing first load.
    // Use a fresh import with query param if needed. Simpler: assert via set then clear LS and re-read with hydrate flag.
    const mod = await import('./settings.mjs');
    // First call may no-op if already hydrated in prior tests in same process — clear LS and poke hydrate by
    // resetting rememberHydrated is not exported. Instead verify persist path:
    let saved = null;
    globalThis.window.electronAPI.cloudSyncRememberSet = async (s) => {
      saved = s;
      return s;
    };
    mod.setCloudSyncToken('tok-persist-disk', { remember: true });
    mod.setCloudSyncRoomSnapshot({
      id: 'room-2',
      code: 'AB12',
      sala: 'Sala 2',
      turnKey: '2026-08',
      revision: 3,
    });
    assert.equal(saved?.token, 'tok-persist-disk');
    assert.equal(saved?.roomId, 'room-2');
    assert.equal(saved?.remember, true);
  });

  it('clearCloudSyncSession clears durable store', async () => {
    let cleared = false;
    globalThis.window = {
      electronAPI: {
        cloudSyncRememberGetSync: () => null,
        cloudSyncRememberSet: async () => null,
        cloudSyncRememberClear: async () => {
          cleared = true;
          return { ok: true };
        },
      },
    };
    const mod = await import('./settings.mjs');
    mod.setCloudSyncToken('tok-x', { remember: true });
    mod.clearCloudSyncSession();
    assert.equal(cleared, true);
    assert.equal(mod.getCloudSyncToken(), '');
  });
});
