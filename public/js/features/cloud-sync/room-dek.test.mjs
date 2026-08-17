import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheSessionPassword,
  clearRoomDekCache,
  ensureRoomDek,
  loadRoomDek,
  getCachedRoomDek,
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
