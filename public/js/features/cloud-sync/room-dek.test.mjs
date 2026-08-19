import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheSessionPassword,
  clearRoomDekCache,
  ensureRoomDek,
  loadRoomDek,
  getCachedRoomDek,
  exportCachedDeksForPersistence,
  hydrateRoomDeksFromPersistence,
  rewrapCachedRoomDeks,
} from './room-dek.mjs';
import { encryptValue, decryptValue } from './crypto.mjs';

/** Fake server: stores exactly what setRoomDek sends, serves it back from getRoomDek. */
function makeFakeApi() {
  const store = new Map();
  return {
    store,
    async setRoomDek(roomId, wrapped) {
      store.set(roomId, wrapped);
      return { ok: true };
    },
    async getRoomDek(roomId) {
      return { dek: store.get(roomId) || null };
    },
  };
}

describe('room-dek lifecycle', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('ensureRoomDek does nothing without a cached password', async () => {
    const api = makeFakeApi();
    const dek = await ensureRoomDek(api, 'room-1');
    assert.equal(dek, null);
    assert.equal(api.store.size, 0);
  });

  it('ensureRoomDek generates, wraps, and stores a DEK; caches it locally', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('hunter2-medico');
    const dek = await ensureRoomDek(api, 'room-1');
    assert.ok(dek);
    assert.ok(api.store.get('room-1'));
    assert.equal(getCachedRoomDek('room-1'), dek);
  });

  it('loadRoomDek returns the already-cached DEK without calling the server again', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('hunter2-medico');
    const created = await ensureRoomDek(api, 'room-1');
    api.getRoomDek = async () => {
      throw new Error('should not be called — DEK already cached');
    };
    const loaded = await loadRoomDek(api, 'room-1');
    assert.equal(loaded, created);
  });

  it('a second device unwraps the same DEK with the same password', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('hunter2-medico');
    const created = await ensureRoomDek(api, 'room-1');
    const value = { indicaciones: 'paracetamol 500mg VO c/8h' };
    const envelope = await encryptValue(created, value);

    clearRoomDekCache(); // simulate a second device: fresh in-memory state
    cacheSessionPassword('hunter2-medico');
    const loaded = await loadRoomDek(api, 'room-1');
    assert.ok(loaded);
    assert.deepEqual(await decryptValue(loaded, envelope), value);
  });

  it('loadRoomDek returns null for a room with no DEK set (plaintext room, unchanged)', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('hunter2-medico');
    const loaded = await loadRoomDek(api, 'room-never-encrypted');
    assert.equal(loaded, null);
  });

  it('loadRoomDek returns null without a cached password even if the server has a DEK', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('hunter2-medico');
    await ensureRoomDek(api, 'room-1');
    clearRoomDekCache();
    const loaded = await loadRoomDek(api, 'room-1');
    assert.equal(loaded, null);
  });

  it('wrong password fails to unwrap', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('right-password');
    await ensureRoomDek(api, 'room-1');
    clearRoomDekCache();
    cacheSessionPassword('wrong-password');
    const loaded = await loadRoomDek(api, 'room-1');
    assert.equal(loaded, null);
  });
});

describe('room-dek persistence (app restart, no password needed)', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('exports and re-imports a cached DEK across a simulated restart', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('hunter2-medico');
    const dek = await ensureRoomDek(api, 'room-1');
    const value = { nota: 'estable, sin cambios' };
    const envelope = await encryptValue(dek, value);

    const persisted = await exportCachedDeksForPersistence();
    assert.ok(persisted['room-1']);

    clearRoomDekCache(); // simulate app restart: no password, cache empty
    assert.equal(getCachedRoomDek('room-1'), null);

    await hydrateRoomDeksFromPersistence(persisted);
    const restored = getCachedRoomDek('room-1');
    assert.ok(restored);
    assert.deepEqual(await decryptValue(restored, envelope), value);
  });

  it('hydrateRoomDeksFromPersistence does not clobber an already-cached DEK', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('hunter2-medico');
    const live = await ensureRoomDek(api, 'room-1');
    await hydrateRoomDeksFromPersistence({ 'room-1': 'bm90LXRoZS1yZWFsLWRlaw==' });
    assert.equal(getCachedRoomDek('room-1'), live);
  });

  it('drops a corrupt persisted entry instead of throwing', async () => {
    await hydrateRoomDeksFromPersistence({ 'room-1': 'not-valid-base64-key-material' });
    assert.equal(getCachedRoomDek('room-1'), null);
  });
});

describe('rewrapCachedRoomDeks (password recovery)', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('re-wraps every cached DEK under the new password; old password no longer unwraps', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('old-password');
    const dek = await ensureRoomDek(api, 'room-1');

    await rewrapCachedRoomDeks(api, 'new-password');

    clearRoomDekCache();
    cacheSessionPassword('old-password');
    assert.equal(await loadRoomDek(api, 'room-1'), null);

    clearRoomDekCache();
    cacheSessionPassword('new-password');
    const reloaded = await loadRoomDek(api, 'room-1');
    assert.ok(reloaded);
    const value = { indicaciones: 'omeprazol 20mg VO c/24h' };
    assert.deepEqual(await decryptValue(reloaded, await encryptValue(dek, value)), value);
  });

  it('is a no-op with no cached DEKs', async () => {
    const api = makeFakeApi();
    await rewrapCachedRoomDeks(api, 'new-password');
    assert.equal(api.store.size, 0);
  });

  it('is a no-op with an empty new password', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('old-password');
    await ensureRoomDek(api, 'room-1');
    const before = api.store.get('room-1');
    await rewrapCachedRoomDeks(api, '');
    assert.equal(api.store.get('room-1'), before);
  });

  it('skips a room the caller cannot rewrap (e.g. not the owner) without throwing', async () => {
    const api = makeFakeApi();
    cacheSessionPassword('old-password');
    await ensureRoomDek(api, 'room-1');
    await ensureRoomDek(api, 'room-2');
    const realSet = api.setRoomDek.bind(api);
    api.setRoomDek = async (roomId, wrapped) => {
      if (roomId === 'room-1') throw new Error('403 not room owner');
      return realSet(roomId, wrapped);
    };
    await assert.doesNotReject(() => rewrapCachedRoomDeks(api, 'new-password'));
  });
});
