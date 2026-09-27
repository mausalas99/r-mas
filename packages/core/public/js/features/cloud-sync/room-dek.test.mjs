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
  markRoomUnprotected,
  planRoomCodeChange,
  rotateRoomCodeAtomically,
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

  it('markRoomUnprotected flags a room whose pull came back with unreadable ciphertext', async () => {
    assert.equal(isRoomUnprotected('room-1'), false);
    markRoomUnprotected('room-1');
    assert.equal(isRoomUnprotected('room-1'), true);

    const api = makeFakeApi();
    await ensureRoomDek(api, 'room-1', 'ABCD-1234');
    clearRoomDekCache();
    markRoomUnprotected('room-1');
    await retryRoomDekIfUnprotected(api, 'room-1', 'ABCD-1234');
    assert.equal(isRoomUnprotected('room-1'), false);
    assert.equal(!!getCachedRoomDek('room-1'), true);
  });
});

describe('rewrapRoomDekForNewCode (admin rotates the room code)', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('re-wraps the cached DEK under the new code; old code no longer unwraps', async () => {
    const api = makeFakeApi();
    const dek = await ensureRoomDek(api, 'room-1', 'OLD-CODE');

    assert.equal(await rewrapRoomDekForNewCode(api, 'room-1', 'NEW-CODE'), true);

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
    assert.equal(await rewrapRoomDekForNewCode(api, 'room-1', 'NEW-CODE'), false);
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
    assert.equal(await rewrapRoomDekForNewCode(api, 'room-1', 'NEW-CODE'), false, 'reports the failure');
  });
});

/** Fake Worker for admin «Cambiar código»: the atomic endpoint plus the admin detail. */
function makeAdminApi(api, codes, { legacy = false, conflictsFirst = 0 } = {}) {
  let conflicts = conflictsFirst;
  return Object.assign(api, {
    async adminRoom(roomId) {
      const room = { id: roomId, code: codes.get(roomId) };
      if (!legacy) room.dek = api.store.get(roomId) || null;
      return { room };
    },
    async adminRotateCode(roomId, body) {
      const locked = api.store.has(roomId);
      if (locked && !body?.dek) {
        throw Object.assign(new Error('Esta sala está cifrada'), { data: { error: 'dek_rewrap_required' } });
      }
      if (conflicts > 0) {
        conflicts -= 1;
        throw Object.assign(new Error('Ese código ya existe.'), { data: { error: 'conflict' } });
      }
      const code = body?.code || 'SRV234';
      codes.set(roomId, code);
      if (locked) api.store.set(roomId, body.dek);
      return { ok: true, code, relocked: locked };
    },
  });
}

describe('admin «Cambiar código» with the atomic Worker endpoint', () => {
  beforeEach(() => {
    clearRoomDekCache();
  });

  it('plans «none» for a sala with no key and just changes the code', async () => {
    const codes = new Map([['room-1', 'OLD111']]);
    const api = makeAdminApi(makeFakeApi(), codes);
    const plan = await planRoomCodeChange(api, 'room-1');
    assert.equal(plan.kind, 'none');
    const res = await rotateRoomCodeAtomically(api, 'room-1', plan);
    assert.deepEqual(res, { code: 'SRV234', relocked: false });
  });

  it('an admin NOT in the sala opens the key with the current code, and the new code opens it after', async () => {
    const codes = new Map([['room-1', 'OLD111']]);
    const api = makeAdminApi(makeFakeApi(), codes);
    const dek = await ensureRoomDek(api, 'room-1', 'OLD111');
    clearRoomDekCache(); // this admin device never had it
    const plan = await planRoomCodeChange(api, 'room-1');
    assert.equal(plan.kind, 'key');
    assert.equal(getCachedRoomDek('room-1'), null, 'another sala’s key is not kept on this device');
    const { code, relocked } = await rotateRoomCodeAtomically(api, 'room-1', plan);
    assert.equal(relocked, true);
    assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    assert.equal(codes.get('room-1'), code);
    assert.equal(await loadRoomDek(api, 'room-1', 'OLD111'), null, 'old code no longer opens it');
    clearRoomDekCache();
    const reopened = await loadRoomDek(api, 'room-1', code);
    const value = { dx: 'NAC CURB-65 2' };
    assert.deepEqual(await decryptValue(reopened, await encryptValue(dek, value)), value);
  });

  it('retries with a fresh code on a conflict, gives up after three', async () => {
    const codes = new Map([['room-1', 'OLD111']]);
    const api = makeAdminApi(makeFakeApi(), codes, { conflictsFirst: 2 });
    await ensureRoomDek(api, 'room-1', 'OLD111');
    const res = await rotateRoomCodeAtomically(api, 'room-1', await planRoomCodeChange(api, 'room-1'));
    assert.equal(res.relocked, true);
    const api2 = makeAdminApi(makeFakeApi(), new Map([['room-2', 'OLD222']]), { conflictsFirst: 3 });
    await ensureRoomDek(api2, 'room-2', 'OLD222');
    const plan = await planRoomCodeChange(api2, 'room-2');
    await assert.rejects(() => rotateRoomCodeAtomically(api2, 'room-2', plan), (err) => err.data.error === 'conflict');
    assert.equal(api2.store.size, 1);
  });

  it('refuses when the key cannot be opened with the current code', async () => {
    const codes = new Map([['room-1', 'WRONG9']]);
    const api = makeAdminApi(makeFakeApi(), codes);
    await ensureRoomDek(api, 'room-1', 'OLD111');
    clearRoomDekCache();
    assert.equal((await planRoomCodeChange(api, 'room-1')).kind, 'refused');
  });

  it('a Worker without the atomic endpoint is detected as «legacy»', async () => {
    const api = makeAdminApi(makeFakeApi(), new Map([['room-1', 'OLD111']]), { legacy: true });
    assert.equal((await planRoomCodeChange(api, 'room-1')).kind, 'legacy');
  });
});
