import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
  };
}

globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = memoryStorage();

const { ensureTurnRoom, currentTurnKey } = await import('./ensure-turn-room.mjs');
const { handleLeaveRoom, joinRoomByCode } = await import('./panel-conexion-handlers.mjs');
const { getLeftTurnRoom, setLeftTurnRoom } = await import('./settings.mjs');

const SALA = 'Sala 1';

function turnDeps(calls, extra = {}) {
  return {
    api: {
      ensureTurn: async (body) => {
        calls.push(body.sala);
        return { room: { id: 'room-synthetic', code: 'ABC123', sala: SALA, turnKey: currentTurnKey() } };
      },
    },
    getSala: () => SALA,
    getToken: () => 'tok-synthetic',
    setCloudSyncRoomId: () => {},
    setCloudSyncRevision: () => {},
    ...extra,
  };
}

function leaveDeps() {
  return {
    getCloudSyncRoomId: () => 'room-synthetic',
    getCloudSyncRoomSnapshot: () => ({ id: 'room-synthetic', sala: SALA, turnKey: currentTurnKey() }),
    getApi: () => ({ leaveRoom: async () => ({ ok: true }) }),
    stopRuntime: () => {},
    toast: () => {},
    setCloudSyncRoomSnapshot: () => {},
    renderDisconnected: () => {},
  };
}

describe('«Salir de la sala» sticks', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('after leave, an automatic ensure-turn does not call the server', async () => {
    await handleLeaveRoom(leaveDeps());
    assert.deepEqual(getLeftTurnRoom(), { sala: SALA, turnKey: currentTurnKey() });
    const calls = [];
    const room = await ensureTurnRoom(turnDeps(calls));
    assert.equal(room, null);
    assert.deepEqual(calls, []);
  });

  it('an explicit join by code clears the marker, then ensure-turn runs', async () => {
    await handleLeaveRoom(leaveDeps());
    await joinRoomByCode(
      {
        getApi: () => ({
          joinRoom: async () => ({ room: { id: 'room-synthetic', code: 'ABC123', sala: SALA } }),
          getRoomDek: async () => null,
        }),
        setCloudSyncRoomSnapshot: () => {},
        renderConnected: () => {},
        toast: () => {},
      },
      'ABC123'
    );
    assert.equal(getLeftTurnRoom(), null);
    const calls = [];
    await ensureTurnRoom(turnDeps(calls));
    assert.deepEqual(calls, [SALA]);
  });

  it('an explicit ensure-turn runs and clears the marker', async () => {
    await handleLeaveRoom(leaveDeps());
    const calls = [];
    await ensureTurnRoom(turnDeps(calls, { explicit: true }));
    assert.deepEqual(calls, [SALA]);
    assert.equal(getLeftTurnRoom(), null);
  });

  it('a different profile sala or a new month is not skipped, and drops the stale marker', async () => {
    setLeftTurnRoom({ sala: 'Sala 2', turnKey: currentTurnKey() });
    const calls = [];
    await ensureTurnRoom(turnDeps(calls));
    assert.deepEqual(calls, [SALA]);
    assert.equal(getLeftTurnRoom(), null);

    setLeftTurnRoom({ sala: SALA, turnKey: '2000-01' });
    await ensureTurnRoom(turnDeps(calls));
    assert.deepEqual(calls, [SALA, SALA]);
    assert.equal(getLeftTurnRoom(), null);
  });
});

describe('cachedTurnRoomSalas', () => {
  it('lists only rooms cached for the current turn', async () => {
    localStorage.clear();
    sessionStorage.clear();
    const { cachedTurnRoomSalas, rememberSalaRoom } = await import('./cloud-clinical-ops-sala.mjs');
    const { setCloudSyncRoomSnapshot } = await import('./settings.mjs');
    setCloudSyncRoomSnapshot({ id: 'room-home', code: 'ABC123', sala: 'Sala 1', turnKey: '2026-10' });
    rememberSalaRoom('Sala 2', { id: 'room-s2', turnKey: '2026-10' });
    rememberSalaRoom('Torre HU', { id: 'room-old', turnKey: '2026-09' });
    assert.deepEqual(cachedTurnRoomSalas(), ['Sala 2']);
  });
});
