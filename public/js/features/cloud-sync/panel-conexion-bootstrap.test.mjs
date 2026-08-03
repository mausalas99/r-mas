import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { localRoomFromSession } from './panel-conexion-bootstrap.mjs';

describe('localRoomFromSession', () => {
  it('returns null without token or room', () => {
    assert.equal(
      localRoomFromSession(
        { getCloudSyncRoomId: () => '', getCloudSyncToken: () => 't' },
        'Sala'
      ),
      null
    );
    assert.equal(
      localRoomFromSession(
        { getCloudSyncRoomId: () => 'r1', getCloudSyncToken: () => '' },
        'Sala'
      ),
      null
    );
  });

  it('builds optimistic room from local snapshot', () => {
    const room = localRoomFromSession(
      {
        getCloudSyncRoomId: () => 'room-1',
        getCloudSyncToken: () => 'tok',
        getCloudSyncRevision: () => 3,
        getCloudSyncRoomSnapshot: () => ({
          id: 'room-1',
          code: 'ABC123',
          sala: 'Sala',
          turnKey: '2026-08-03',
          name: 'Sala 2026-08-03',
        }),
      },
      'Sala'
    );
    assert.deepEqual(room, {
      id: 'room-1',
      revision: 3,
      sala: 'Sala',
      code: 'ABC123',
      turnKey: '2026-08-03',
      name: 'Sala 2026-08-03',
    });
  });
});
