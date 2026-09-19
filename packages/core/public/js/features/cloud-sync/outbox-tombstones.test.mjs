import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CLOUD_TOMBSTONES_MUTATION_ID } from './constants.mjs';
import {
  buildCloudTombstoneOp,
  coalesceTombstoneOps,
  coalesceTombstoneOutboxRows,
  isTombstoneOutboxMutationId,
  withTombstoneCoalesce,
} from './outbox-tombstones.mjs';

describe('outbox-tombstones', () => {
  it('isTombstoneOutboxMutationId matches legacy and batch ids', () => {
    assert.equal(isTombstoneOutboxMutationId(CLOUD_TOMBSTONES_MUTATION_ID), true);
    assert.equal(isTombstoneOutboxMutationId('tombstones/p1'), true);
    assert.equal(isTombstoneOutboxMutationId('labSidecars/p1'), false);
  });

  it('buildCloudTombstoneOp omits empty registro', () => {
    const slim = buildCloudTombstoneOp('p1', {
      registro: '  ',
      actorId: 'u1',
      updatedAt: '2026-08-09T12:00:00.000Z',
    });
    assert.equal(slim.path, 'tombstones/p1');
    assert.equal(slim.value.deletedAt, '2026-08-09T12:00:00.000Z');
    assert.equal(slim.value.registro, undefined);
    assert.ok(JSON.stringify(slim).length < 160);

    const withReg = buildCloudTombstoneOp('p2', {
      registro: '2166042-4',
      actorId: 'u1',
      updatedAt: '2026-08-09T12:00:00.000Z',
    });
    assert.equal(withReg.value.registro, '2166042-4');
  });

  it('coalesceTombstoneOps keeps latest op per path', () => {
    const ops = coalesceTombstoneOps([
      {
        path: 'tombstones/p1',
        value: { deletedAt: 'a' },
        updatedAt: 'a',
        actorId: 'u',
      },
      {
        path: 'entries/p1/fields',
        value: {},
        updatedAt: 'a',
        actorId: 'u',
      },
      {
        path: 'tombstones/p1',
        value: { deletedAt: 'b', registro: '1' },
        updatedAt: 'b',
        actorId: 'u',
      },
      {
        path: 'tombstones/p2',
        value: { deletedAt: 'c' },
        updatedAt: 'c',
        actorId: 'u',
      },
    ]);
    assert.equal(ops.length, 2);
    assert.equal(ops[0].path, 'tombstones/p1');
    assert.equal(ops[0].value.deletedAt, 'b');
    assert.equal(ops[1].path, 'tombstones/p2');
  });

  it('coalesceTombstoneOutboxRows merges legacy per-id rows into one push', () => {
    const result = coalesceTombstoneOutboxRows([
      {
        clientMutationId: 'tombstones/msm8rhkvyjcjyi13k7l',
        ops: [
          {
            path: 'tombstones/msm8rhkvyjcjyi13k7l',
            value: { deletedAt: 't1' },
            updatedAt: 't1',
            actorId: 'u',
          },
        ],
        enqueuedAt: 10,
        baseRevision: 3314,
      },
      {
        clientMutationId: 'tombstones/msm8rggk2kn2ipcn0jl',
        ops: [
          {
            path: 'tombstones/msm8rggk2kn2ipcn0jl',
            value: { deletedAt: 't2' },
            updatedAt: 't2',
            actorId: 'u',
          },
        ],
        enqueuedAt: 20,
        baseRevision: 3314,
      },
      {
        clientMutationId: 'labSidecars/p1',
        ops: [{ path: 'labSidecars/p1/a', value: {} }],
        enqueuedAt: 5,
      },
    ]);
    assert.equal(result.merged, 2);
    assert.equal(result.rows.length, 2);
    const batch = result.rows.find(
      (row) => row.clientMutationId === CLOUD_TOMBSTONES_MUTATION_ID
    );
    assert.ok(batch);
    assert.equal(batch.ops.length, 2);
    assert.equal(batch.enqueuedAt, 10);
    assert.equal(batch.baseRevision, 3314);
    assert.equal(result.rows[0].clientMutationId, 'labSidecars/p1');
  });

  it('withTombstoneCoalesce folds legacy rows on list()', () => {
    const mem = {
      rows: [
        {
          clientMutationId: 'tombstones/a',
          ops: [{ path: 'tombstones/a', value: { deletedAt: 't1' } }],
          enqueuedAt: 1,
        },
        {
          clientMutationId: 'tombstones/b',
          ops: [{ path: 'tombstones/b', value: { deletedAt: 't2' } }],
          enqueuedAt: 2,
        },
      ],
      list() {
        return this.rows.slice();
      },
      replaceAll(next) {
        this.rows = Array.isArray(next) ? next.slice() : [];
      },
    };
    const wrapped = withTombstoneCoalesce(mem);
    const listed = wrapped.list();
    assert.equal(listed.length, 1);
    assert.equal(listed[0].clientMutationId, CLOUD_TOMBSTONES_MUTATION_ID);
    assert.equal(listed[0].ops.length, 2);
  });
});
