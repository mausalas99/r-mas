import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localRoomFromSession } from './panel-conexion-bootstrap.mjs';

describe('localRoomFromSession', () => {
  it('returns null without token or room', () => {
    assert.equal(
      localRoomFromSession(
        { getCloudSyncRoomId: () => '', getCloudSyncToken: () => 't' },
        'Sala 1'
      ),
      null
    );
    assert.equal(
      localRoomFromSession(
        { getCloudSyncRoomId: () => 'r1', getCloudSyncToken: () => '' },
        'Sala 1'
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
          sala: 'Sala 1',
          turnKey: '2026-08',
          name: 'Sala 1 2026-08',
        }),
      },
      'Sala'
    );
    assert.deepEqual(room, {
      id: 'room-1',
      revision: 3,
      sala: 'Sala 1',
      code: 'ABC123',
      turnKey: '2026-08',
      name: 'Sala 1 2026-08',
    });
  });

  it('re-renders when snapshot code is missing', () => {
    const src = readFileSync(
      new URL('./panel-conexion-bootstrap.mjs', import.meta.url),
      'utf8'
    );
    assert.match(src, /!snapCode/);
    assert.match(src, /roomCode/);
  });
});
