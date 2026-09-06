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
          role: 'owner',
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
      role: 'owner',
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

  it('teams-changed while connected does not remount Equipo (skeleton flash)', () => {
    const src = readFileSync(
      new URL('./panel-conexion-bootstrap.mjs', import.meta.url),
      'utf8'
    );
    const fnStart = src.indexOf('export function wireTeamsChangedListener');
    assert.ok(fnStart >= 0);
    const fnBody = src.slice(fnStart, fnStart + 900);
    assert.match(fnBody, /wireClinicalTeamsControls/);
    assert.doesNotMatch(fnBody, /mountEquipoTeamsPanel/);
  });
});

describe('bootstrapConexionState getRoom failures', () => {
  const bootSrc = readFileSync(
    new URL('./panel-conexion-bootstrap.mjs', import.meta.url),
    'utf8'
  );
  const fnStart = bootSrc.indexOf('export function bootstrapConexionState');
  const fnEnd = bootSrc.indexOf('\nexport function ', fnStart + 1);
  const fnBody = bootSrc.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 2400);

  it('source keeps Recuérdame token unless 401/403', () => {
    assert.match(fnBody, /status === 401/);
    assert.match(fnBody, /status === 403/);
    assert.match(fnBody, /tryAutoEnsureTurnRoom/);
    // Must not blanket-clear on every getRoom rejection.
    const catchIdx = fnBody.indexOf('.catch(function');
    assert.ok(catchIdx >= 0);
    const catchBody = fnBody.slice(catchIdx, catchIdx + 700);
    assert.match(catchBody, /clearCloudSyncSession/);
    assert.ok(
      catchBody.indexOf('clearCloudSyncSession') >
        catchBody.indexOf('401'),
      'clearCloudSyncSession must be gated on auth status'
    );
  });

  it('locks a room on every plain reconnect, not just a fresh login', () => {
    // Optimistic (skip-getRoom) branch.
    const optimisticIdx = fnBody.indexOf('ui.renderConnected(optimistic)');
    assert.ok(optimisticIdx >= 0);
    assert.match(
      fnBody.slice(optimisticIdx, optimisticIdx + 350),
      /void ensureRoomEncryptionBackfill\(.*optimistic\)/
    );
    // getRoom-fetched branch.
    const getRoomIdx = fnBody.indexOf('ui.renderConnected(room)');
    assert.ok(getRoomIdx >= 0);
    assert.match(
      fnBody.slice(getRoomIdx, getRoomIdx + 200),
      /void ensureRoomEncryptionBackfill\(.*\broom\b\)/
    );
  });
});
