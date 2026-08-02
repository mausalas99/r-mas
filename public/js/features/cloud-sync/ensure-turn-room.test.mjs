import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTurnRoom } from './ensure-turn-room.mjs';
import { setCloudRoomConnected } from './lan-override.mjs';

describe('ensure-turn-room', () => {
  beforeEach(() => {
    setCloudRoomConnected(false);
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
      getSala: () => 'UX',
      getToken: () => 'token',
      setCloudSyncRoomId: () => {},
      setCloudSyncRevision: () => {},
    });
    assert.equal(result, null);
    assert.equal(called, false);
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
});
