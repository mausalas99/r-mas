import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearRoomDekCache,
  ensureRoomDek,
  loadRoomDek,
  getCachedRoomDek,
  exportCachedDeksForPersistence,
  hydrateRoomDeksFromPersistence,
  rewrapRoomDekForNewCode,
  isRoomUnprotected,
  retryRoomDekIfUnprotected,
} from './room-dek.mjs';
import { encryptValue, decryptValue } from './crypto.mjs';

/** Fake server: stores exactly what setRoomDek/rotateRoomDek send, serves it back from getRoomDek. */
function makeFakeApi() {
  const store = new Map();
  return {
    store,
    async setRoomDek(roomId, wrapped) {
      store.set(roomId, wrapped);
      return { ok: true };
    },
    async rotateRoomDek(roomId, wrapped) {
      store.set(roomId, wrapped);
      return { ok: true };
    },
    async getRoomDek(roomId) {
      return { dek: store.get(roomId) || null };
    },
  };
}

describe('room-dek lifecycle (room code, not login password)', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('ensureRoomDek does nothing without a room code', async () => {
    const api = makeFakeApi();
    const dek = await ensureRoomDek(api, 'room-1', '');
    assert.equal(dek, null);
    assert.equal(api.store.size, 0);
  });

  it('ensureRoomDek generates, wraps, and stores a DEK; caches it locally', async () => {
    const api = makeFakeApi();
    const dek = await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    assert.ok(dek);
    assert.ok(api.store.get('room-1'));
    assert.equal(getCachedRoomDek('room-1'), dek);
  });

  it('loadRoomDek returns the already-cached DEK without calling the server again', async () => {
    const api = makeFakeApi();
    const created = await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    api.getRoomDek = async () => {
      throw new Error('should not be called — DEK already cached');
    };
    const loaded = await loadRoomDek(api, 'room-1', 'ABCD-1234');
    assert.equal(loaded, created);
  });

  it('a second device unwraps the same DEK with the same room code', async () => {
    const api = makeFakeApi();
    const created = await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    const value = { indicaciones: 'paracetamol 500mg VO c/8h' };
    const envelope = await encryptValue(created, value);

    clearRoomDekCache(); // simulate a second device: fresh in-memory state
    const loaded = await loadRoomDek(api, 'room-1', 'ABCD-1234');
    assert.ok(loaded);
    assert.deepEqual(await decryptValue(loaded, envelope), value);
  });

  it('loadRoomDek returns null for a room with no DEK set (plaintext room, unchanged)', async () => {
    const api = makeFakeApi();
    const loaded = await loadRoomDek(api, 'room-never-encrypted', 'ABCD-1234');
    assert.equal(loaded, null);
  });

  it('loadRoomDek returns null without a room code even if the server has a DEK', async () => {
    const api = makeFakeApi();
    await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    clearRoomDekCache();
    const loaded = await loadRoomDek(api, 'room-1', '');
    assert.equal(loaded, null);
  });

  it('wrong room code fails to unwrap', async () => {
    const api = makeFakeApi();
    await ensureRoomDek(api, 'room-1', 'RIGHT-CODE');
    clearRoomDekCache();
    const loaded = await loadRoomDek(api, 'room-1', 'WRONG-CODE');
    assert.equal(loaded, null);
  });
});

describe('room-dek persistence (app restart, no code needed)', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('exports and re-imports a cached DEK across a simulated restart', async () => {
    const api = makeFakeApi();
    const dek = await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    const value = { nota: 'estable, sin cambios' };
    const envelope = await encryptValue(dek, value);

    const persisted = await exportCachedDeksForPersistence();
    assert.ok(persisted['room-1']);

    clearRoomDekCache(); // simulate app restart: no code, cache empty
    assert.equal(getCachedRoomDek('room-1'), null);

    await hydrateRoomDeksFromPersistence(persisted);
    const restored = getCachedRoomDek('room-1');
    assert.ok(restored);
    assert.deepEqual(await decryptValue(restored, envelope), value);
  });

  it('hydrateRoomDeksFromPersistence does not clobber an already-cached DEK', async () => {
    const api = makeFakeApi();
    const live = await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    await hydrateRoomDeksFromPersistence({ 'room-1': 'bm90LXRoZS1yZWFsLWRlaw==' });
    assert.equal(getCachedRoomDek('room-1'), live);
  });

  it('drops a corrupt persisted entry instead of throwing', async () => {
    await hydrateRoomDeksFromPersistence({ 'room-1': 'not-valid-base64-key-material' });
    assert.equal(getCachedRoomDek('room-1'), null);
  });
});

describe('key-fetch reliability + "sala no protegida" badge', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('is not unprotected before anything has been attempted', () => {
    assert.equal(isRoomUnprotected('room-1'), false);
  });

  it('flags the room unprotected after the fetch fails on every retry, then clears it once it succeeds', async () => {
    const api = makeFakeApi();
    let calls = 0;
    api.getRoomDek = async () => {
      calls += 1;
      throw new Error('network error');
    };
    const loaded = await loadRoomDek(api, 'room-1', 'ABCD-1234');
    assert.equal(loaded, null);
    assert.ok(calls >= 2, 'must retry, not fail on the first attempt');
    assert.equal(isRoomUnprotected('room-1'), true);

    // Network recovers — a later call succeeds and should self-heal the flag.
    api.getRoomDek = async () => ({ dek: null }); // room genuinely has no DEK
    await loadRoomDek(api, 'room-1', 'ABCD-1234');
    assert.equal(isRoomUnprotected('room-1'), false);
  });

  it('a room that genuinely has no DEK is never flagged unprotected', async () => {
    const api = makeFakeApi();
    await loadRoomDek(api, 'room-1', 'ABCD-1234');
    assert.equal(isRoomUnprotected('room-1'), false);
  });

  it('retryRoomDekIfUnprotected is a no-op when the room is not flagged', async () => {
    const api = makeFakeApi();
    api.getRoomDek = async () => {
      throw new Error('should not be called — room was never flagged unprotected');
    };
    await assert.doesNotReject(() => retryRoomDekIfUnprotected(api, 'room-1', 'ABCD-1234'));
  });

  it('retryRoomDekIfUnprotected re-fetches and clears the flag on success', async () => {
    const api = makeFakeApi();
    const dek = await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    const value = { indicaciones: 'losartan 50mg VO c/24h' };
    const envelope = await encryptValue(dek, value);
    clearRoomDekCache();
    api.getRoomDek = async () => {
      throw new Error('network error');
    };
    await loadRoomDek(api, 'room-1', 'ABCD-1234');
    assert.equal(isRoomUnprotected('room-1'), true);

    api.getRoomDek = async () => ({ dek: api.store.get('room-1') });
    await retryRoomDekIfUnprotected(api, 'room-1', 'ABCD-1234');
    assert.equal(isRoomUnprotected('room-1'), false);
    assert.deepEqual(await decryptValue(getCachedRoomDek('room-1'), envelope), value);
  });
});

describe('rewrapRoomDekForNewCode (admin rotates the room code)', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('re-wraps the cached DEK under the new code; old code no longer unwraps', async () => {
    const api = makeFakeApi();
    const dek = await ensureRoomDek(api, 'room-1', 'OLD-CODE');

    await rewrapRoomDekForNewCode(api, 'room-1', 'NEW-CODE');

    clearRoomDekCache();
    assert.equal(await loadRoomDek(api, 'room-1', 'OLD-CODE'), null);

    clearRoomDekCache();
    const reloaded = await loadRoomDek(api, 'room-1', 'NEW-CODE');
    assert.ok(reloaded);
    const value = { indicaciones: 'omeprazol 20mg VO c/24h' };
    assert.deepEqual(await decryptValue(reloaded, await encryptValue(dek, value)), value);
  });

  it('is a no-op with no cached DEK for that room', async () => {
    const api = makeFakeApi();
    await rewrapRoomDekForNewCode(api, 'room-1', 'NEW-CODE');
    assert.equal(api.store.size, 0);
  });

  it('is a no-op with an empty new code', async () => {
    const api = makeFakeApi();
    await ensureRoomDek(api, 'room-1', 'OLD-CODE');
    const before = api.store.get('room-1');
    await rewrapRoomDekForNewCode(api, 'room-1', '');
    assert.equal(api.store.get('room-1'), before);
  });

  it('swallows a server error without throwing (best-effort, next reload uses old cache)', async () => {
    const api = makeFakeApi();
    await ensureRoomDek(api, 'room-1', 'OLD-CODE');
    api.rotateRoomDek = async () => {
      throw new Error('network error');
    };
    await assert.doesNotReject(() => rewrapRoomDekForNewCode(api, 'room-1', 'NEW-CODE'));
  });
});
