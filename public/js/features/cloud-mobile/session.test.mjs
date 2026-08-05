import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_MOBILE_PAIRING_KEY,
  persistCloudMobilePairing,
  readCloudMobilePairing,
  restoreCloudMobilePairingFromStorage,
  applyCloudMobileInviteSearch,
  getCloudSyncToken,
  getCloudSyncRoomId,
  clearCloudSyncSession,
  clearCloudMobilePairing,
} from './session.mjs';

function mockStorage() {
  const store = new Map();
  const api = {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    },
    removeItem(k) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
  };
  globalThis.localStorage = api;
  globalThis.sessionStorage = {
    getItem(k) {
      return api.getItem('s:' + k);
    },
    setItem(k, v) {
      api.setItem('s:' + k, v);
    },
    removeItem(k) {
      api.removeItem('s:' + k);
    },
  };
  return store;
}

describe('cloud-mobile pairing persistence', () => {
  beforeEach(() => {
    mockStorage();
    clearCloudMobilePairing();
    clearCloudSyncSession();
  });

  it('persist + read round-trip', () => {
    assert.equal(
      persistCloudMobilePairing({
        auth: 'tok',
        room: 'AB12',
        roomId: 'rid-1',
        sala: 'Sala 1',
        user: 'ana',
      }),
      true
    );
    const p = readCloudMobilePairing();
    assert.equal(p?.auth, 'tok');
    assert.equal(p?.room, 'AB12');
    assert.equal(p?.roomId, 'rid-1');
    assert.ok(localStorage.getItem(CLOUD_MOBILE_PAIRING_KEY));
  });

  it('apply invite writes durable pairing', () => {
    const out = applyCloudMobileInviteSearch('?room=ZZ&auth=secret&user=bob');
    assert.equal(out.appliedAuth, true);
    assert.equal(getCloudSyncToken(), 'secret');
    assert.equal(readCloudMobilePairing()?.room, 'ZZ');
    assert.equal(readCloudMobilePairing()?.auth, 'secret');
  });

  it('restore after wipe of session keys recovers auth + roomId', () => {
    persistCloudMobilePairing({
      auth: 'home-tok',
      room: 'RM1',
      roomId: 'id-9',
      sala: 'Sala 1',
      user: 'ana',
    });
    clearCloudSyncSession();
    sessionStorage.removeItem('rpc-cloud-mobile-join-code');
    assert.equal(getCloudSyncToken(), '');
    assert.equal(restoreCloudMobilePairingFromStorage(), true);
    assert.equal(getCloudSyncToken(), 'home-tok');
    assert.equal(getCloudSyncRoomId(), 'id-9');
  });
});
