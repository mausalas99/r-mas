import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import { syncErrorStatus } from './errors.js';
import {
  checkMutationPushRateLimit,
  tryLegacyBulkLabBackfillAck,
  tryNoopMutationAck,
  summarizeMutationOpsJson,
  validateMutationRequest,
} from './mutation-guard.mjs';

describe('mutation-guard', () => {
  it('rate limits excessive pushes per room', () => {
    const roomId = 'room-rate-test';
    for (let i = 0; i < 120; i += 1) {
      checkMutationPushRateLimit(roomId);
    }
    assert.throws(
      () => checkMutationPushRateLimit(roomId),
      (err) => err instanceof SyncError && err.code === 'rate_limited'
    );
    assert.equal(syncErrorStatus(new SyncError('rate_limited', 'x')), 429);
  });

  it('rejects too many ops in one mutation', () => {
    assert.throws(
      () =>
        validateMutationRequest(
          { ops: Array.from({ length: 20 }, (_, i) => ({ path: `p/${i}`, value: 1 })) },
          100
        ),
      (err) => err instanceof SyncError && err.code === 'invalid_request'
    );
  });

  it('acks legacy cloud-lab-backfill with multiple ops without applying', async () => {
    const res = tryLegacyBulkLabBackfillAck(
      'cloud-lab-backfill',
      Array.from({ length: 5 }, (_, i) => ({ path: `labSidecars/p/${i}`, value: { id: 'x' } })),
      42,
      40
    );
    assert.ok(res instanceof Response);
    const body = await res.json();
    assert.equal(body.revision, 42);
    assert.equal(body.applied.length, 0);
    assert.equal(body.rejected.length, 5);
    assert.equal(body.legacyBulkAck, true);
    assert.equal(body.needPull, true);
    assert.equal(
      tryLegacyBulkLabBackfillAck('cloud-lab-backfill', [{ path: 'labSidecars/p1/s1', value: {} }], 1, 1),
      null
    );
    assert.equal(
      tryLegacyBulkLabBackfillAck('labSidecars/p1', [{ path: 'a', value: 1 }, { path: 'b', value: 2 }], 1, 1),
      null
    );
  });

  it('acks all-rejected mutations without a revision bump', async () => {
    const res = tryNoopMutationAck(
      [],
      [{ op: { path: 'labSidecars/p1/s1' }, reason: 'stale' }],
      6535,
      6534
    );
    assert.ok(res instanceof Response);
    const body = await res.json();
    assert.equal(body.revision, 6535);
    assert.equal(body.applied.length, 0);
    assert.equal(body.rejected.length, 1);
    assert.equal(body.needPull, true);
    assert.equal(body.noop, true);
    assert.equal(
      tryNoopMutationAck([{ path: 'entries/p1/fields' }], [], 10, 9),
      null
    );
  });

  it('summarizeMutationOpsJson reports largest op path', () => {
    const summary = summarizeMutationOpsJson(
      JSON.stringify([
        { path: 'labSidecars/p1/small', value: { id: 's' } },
        { path: 'labSidecars/p2/huge', value: { id: 'h', resLabs: ['x'.repeat(5000)] } },
      ])
    );
    assert.equal(summary?.opCount, 2);
    assert.ok(summary?.maxOpBytes > 1000);
    assert.equal(summary?.maxOpPath, 'labSidecars/p2/huge');
  });
});
