import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTurnRoom } from './ensure-turn-room.mjs';
import { setCloudRoomConnected } from './nube-sync-policy.mjs';
import { clearRoomDekCache, ensureRoomDek, getCachedRoomDek } from './room-dek.mjs';

describe('ensure-turn-room', () => {
  beforeEach(() => {
    setCloudRoomConnected(false);
    clearRoomDekCache();
  });

  it('skips when sala is not cloud-eligible', async () => {
    let called = false;
    const result = await ensureTurnRoom({
      api: {
        ensureTurn: async () => {
          called = true;
          return { room: { id: 'x' } };
        },
      },
      getSala: () => 'NotAWard',
      getToken: () => 'token',
      setCloudSyncRoomId: () => {},
      setCloudSyncRevision: () => {},
    });
    assert.equal(result, null);
    assert.equal(called, false);
  });

  it('allows former LAN-only salas (UX)', async () => {
    let called = false;
    const result = await ensureTurnRoom({
      api: {
        ensureTurn: async () => {
          called = true;
          return { room: { id: 'ux-room' } };
        },
      },
      getSala: () => 'UX',
      getToken: () => 'token',
      setCloudSyncRoomId: () => {},
      setCloudSyncRevision: () => {},
    });
    assert.equal(result?.id, 'ux-room');
    assert.equal(called, true);
  });

  it('skips when no cloud token', async () => {
    let called = false;
    const result = await ensureTurnRoom({
      api: {
        ensureTurn: async () => {
          called = true;
          return { room: { id: 'x' } };
        },
      },
      getSala: () => 'Sala 1',
      getToken: () => '',
      setCloudSyncRoomId: () => {},
      setCloudSyncRevision: () => {},
    });
    assert.equal(result, null);
    assert.equal(called, false);
  });

  it('persists room and marks connected when eligible', async () => {
    let roomId = '';
    let revision = -1;
    let connected = false;
    const result = await ensureTurnRoom({
      api: {
        ensureTurn: async ({ sala }) => ({
          room: { id: 'room-1', code: 'ABC123', revision: 5, sala },
        }),
      },
      getSala: () => 'Torre HU',
      getToken: () => 'tok',
      setCloudSyncRoomId: (id) => {
        roomId = id;
      },
      setCloudSyncRevision: (r) => {
        revision = r;
      },
      onConnected: () => {
        connected = true;
      },
    });
    assert.equal(result?.id, 'room-1');
    assert.equal(roomId, 'room-1');
    assert.equal(revision, 5);
    assert.equal(connected, true);
  });

  it('loads the room DEK on connect, so a fresh pull can decrypt right away', async () => {
    const store = new Map();
    const dekApi = {
      setRoomDek: async (roomId, wrapped) => {
        store.set(roomId, wrapped);
      },
      getRoomDek: async (roomId) => ({ dek: store.get(roomId) || null }),
    };
    await ensureRoomDek(dekApi, 'room-2', 'CODE-2'); // another device already created the DEK
    clearRoomDekCache(); // this device is fresh — nothing cached yet

    const api = {
      ensureTurn: async () => ({ room: { id: 'room-2', code: 'CODE-2' } }),
      getRoomDek: dekApi.getRoomDek,
    };
    await ensureTurnRoom({
      api,
      getSala: () => 'Sala 1',
      getToken: () => 'tok',
      setCloudSyncRoomId: () => {},
      setCloudSyncRevision: () => {},
    });
    // Real WebCrypto PBKDF2 derive/unwrap, not a mock — 20ms was too tight
    // under full-suite CPU contention (~52ms alone). Poll instead of a fixed wait.
    for (let i = 0; i < 50 && !getCachedRoomDek('room-2'); i += 1) {
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.ok(getCachedRoomDek('room-2'));
  });

  it('does not block the connect when fetching the DEK fails', async () => {
    const api = {
      ensureTurn: async () => ({ room: { id: 'room-3', code: 'CODE-3' } }),
      getRoomDek: async () => {
        throw new Error('network error');
      },
    };
    const result = await ensureTurnRoom({
      api,
      getSala: () => 'Sala 1',
      getToken: () => 'tok',
      setCloudSyncRoomId: () => {},
      setCloudSyncRevision: () => {},
    });
    assert.equal(result?.id, 'room-3');
  });
});
