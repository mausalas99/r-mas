import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  drainSyncedLabOpsFromOutboxRows,
  pruneLabSidecarOpsFromOutboxRows,
  splitLabBackfillOutboxRows,
} from './outbox-lab.mjs';
import { noteCloudLabSidecarOpsPushed } from './cloud-lab-sidecar-index.mjs';

describe('outbox-lab', () => {
  it('pruneLabSidecarOpsFromOutboxRows drops lab-only entries and strips lab ops from batch', () => {
    const rows = [
      {
        clientMutationId: 'labSidecars/p1',
        ops: [{ path: 'labSidecars/p1/a', value: { id: 'a' } }],
        enqueuedAt: 1,
      },
      {
        clientMutationId: 'cloud-room-push',
        ops: [
          { path: 'entries/p1/fields', value: { nombre: 'X' } },
          { path: 'labSidecars/p1/b', value: { id: 'b' } },
        ],
        enqueuedAt: 2,
      },
    ];
    const result = pruneLabSidecarOpsFromOutboxRows(rows);
    assert.equal(result.removedOps, 2);
    assert.equal(result.removedEntries, 1);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].ops.length, 1);
    assert.equal(result.rows[0].ops[0].path, 'entries/p1/fields');
  });

  it('drainSyncedLabOpsFromOutboxRows removes lab ops matching fingerprint index', () => {
    const labOp = {
      path: 'labSidecars/p1/lab-1',
      value: { id: 'lab-1', fecha: '2026-08-09', resLabs: ['Hb 12'] },
      updatedAt: '2026-08-09T12:00:00.000Z',
      actorId: 'u1',
    };
    globalThis.localStorage = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      },
    };
    try {
      noteCloudLabSidecarOpsPushed([labOp]);
      const { rows, removedOps } = drainSyncedLabOpsFromOutboxRows([
        { clientMutationId: 'cloud-room-push', ops: [labOp], enqueuedAt: 1 },
      ]);
      assert.equal(removedOps, 1);
      assert.equal(rows.length, 0);
    } finally {
      delete globalThis.localStorage;
    }
  });

  it('splitLabBackfillOutboxRows splits legacy cloud-lab-backfill into per-patient rows', () => {
    const result = splitLabBackfillOutboxRows([
      {
        clientMutationId: 'cloud-lab-backfill',
        ops: [
          { path: 'labSidecars/p1/a', value: { id: 'a' } },
          { path: 'labSidecars/p1/b', value: { id: 'b' } },
          { path: 'labSidecars/p2/c', value: { id: 'c' } },
        ],
        enqueuedAt: 1,
        baseRevision: 10,
      },
    ]);
    assert.equal(result.splitOps, 3);
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0].clientMutationId, 'labSidecars/p1');
    assert.equal(result.rows[0].ops.length, 2);
    assert.equal(result.rows[1].clientMutationId, 'labSidecars/p2');
    assert.equal(result.rows[1].ops.length, 1);
  });
});
