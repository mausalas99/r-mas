import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInternoAccessUpsertOp,
  internoAccessMutationId,
  enqueueInternoAccessUpsert,
} from './interno-access-sync.mjs';
import { configureCloudMutateBridge } from './mutate-bridge.mjs';
import { setCloudRoomConnected } from './lan-override.mjs';

const SAMPLE_ROW = {
  sala: 'Sala 1',
  access_token: 'abc123',
  is_active: 1,
  rotated_at: '2026-08-07T12:00:00.000Z',
  rotated_by: 'user-42',
};

describe('interno-access-sync', () => {
  beforeEach(() => {
    configureCloudMutateBridge(null);
    setCloudRoomConnected(false);
  });

  it('buildInternoAccessUpsertOp maps SQLCipher row to worker sidecar shape', () => {
    const op = buildInternoAccessUpsertOp(SAMPLE_ROW);
    assert.deepEqual(op, {
      type: 'internoAccessUpsert',
      sala: 'Sala 1',
      accessToken: 'abc123',
      isActive: true,
      rotatedAt: '2026-08-07T12:00:00.000Z',
      rotatedBy: 'user-42',
    });
  });

  it('internoAccessMutationId is stable for the same row (idempotent enqueue key)', () => {
    const a = internoAccessMutationId(SAMPLE_ROW);
    const b = internoAccessMutationId({ ...SAMPLE_ROW });
    assert.equal(a, b);
    assert.equal(a, 'internoAccess/Sala 1/2026-08-07T12:00:00.000Z/1');
  });

  it('internoAccessMutationId changes when rotation clock or active flag changes', () => {
    const base = internoAccessMutationId(SAMPLE_ROW);
    const rotated = internoAccessMutationId({
      ...SAMPLE_ROW,
      rotated_at: '2026-08-07T13:00:00.000Z',
    });
    const inactive = internoAccessMutationId({ ...SAMPLE_ROW, is_active: 0 });
    assert.notEqual(base, rotated);
    assert.notEqual(base, inactive);
  });

  it('enqueueInternoAccessUpsert uses stable clientMutationId per sala+rotation', () => {
    /** @type {Array<{ clientMutationId: string, ops: unknown[] }>} */
    const queued = [];
    setCloudRoomConnected(true);
    configureCloudMutateBridge({
      outbox: {
        enqueue(item) {
          queued.push(item);
        },
      },
      getRevision: () => 3,
      flush: () => {},
      getActorId: () => 'admin-1',
    });

    assert.equal(enqueueInternoAccessUpsert(SAMPLE_ROW), true);
    assert.equal(enqueueInternoAccessUpsert(SAMPLE_ROW), true);
    assert.equal(queued.length, 2);
    assert.equal(queued[0].clientMutationId, internoAccessMutationId(SAMPLE_ROW));
    assert.equal(queued[1].clientMutationId, queued[0].clientMutationId);
    assert.deepEqual(queued[0].ops[0], buildInternoAccessUpsertOp(SAMPLE_ROW));
  });
});
