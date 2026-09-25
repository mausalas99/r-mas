import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  chunkCloudOps,
  drainCloudOps,
  MAX_LAB_OPS_PER_CHUNK,
  MAX_OPS_PER_CHUNK,
  pushCloudOpsDirect,
} from './cloud-push-direct.mjs';
import { createDrainPacer } from './cloud-sync-timing.mjs';
import { getCloudSyncDiagnostics, clearCloudSyncErrors } from './cloud-sync-diagnostics.mjs';
import { clearCloudSyncEchoGuard } from './cloud-sync-echo-guard.mjs';

function labOp(i) {
  return {
    path: `labSidecars/p1/set-${i}`,
    value: { id: `set-${i}`, resLabs: [`BH\tHb ${i}`] },
    updatedAt: 't',
    actorId: 'a',
  };
}

function fieldOp(i) {
  return {
    path: `entries/p${i}/fields`,
    value: { nombre: `P${i}` },
    updatedAt: 't',
    actorId: 'a',
  };
}

describe('chunkCloudOps', () => {
  it('splits lab sidecars into batches of at most MAX_LAB_OPS_PER_CHUNK', () => {
    const ops = Array.from({ length: 21 }, (_, i) => labOp(i));
    const chunks = chunkCloudOps(ops);
    assert.equal(chunks.length, Math.ceil(21 / MAX_LAB_OPS_PER_CHUNK));
    chunks.forEach((chunk) => {
      const labCount = chunk.filter((op) => String(op.path).startsWith('labSidecars/')).length;
      assert.ok(labCount <= MAX_LAB_OPS_PER_CHUNK);
    });
    assert.equal(chunks.flat().length, 21);
  });

  it('keeps small non-lab batches together under op + byte caps', () => {
    const ops = [
      { path: 'entries/p1/fields', value: { nombre: 'A' }, updatedAt: 't', actorId: 'a' },
      labOp(1),
      labOp(2),
    ];
    const chunks = chunkCloudOps(ops);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].length, 3);
  });

  it('splits census-style batches at Worker maxOpsPerMutation (16)', () => {
    const ops = Array.from({ length: 44 }, (_, i) => fieldOp(i));
    const chunks = chunkCloudOps(ops);
    assert.equal(chunks.length, Math.ceil(44 / MAX_OPS_PER_CHUNK));
    chunks.forEach((chunk) => {
      assert.ok(chunk.length <= MAX_OPS_PER_CHUNK);
    });
    assert.equal(chunks.flat().length, 44);
    assert.equal(MAX_OPS_PER_CHUNK, 16);
  });

  it('accepts a smaller maxOps — the AIMD pacer shrinking the window', () => {
    const ops = Array.from({ length: 10 }, (_, i) => fieldOp(i));
    const chunks = chunkCloudOps(ops, 4);
    assert.equal(chunks.length, 3);
    chunks.forEach((chunk) => assert.ok(chunk.length <= 4));
  });
});

describe('drainCloudOps', () => {
  function noDelay() {
    return Promise.resolve();
  }

  it('sends everything in one chunk when nothing is congested', async () => {
    const sent = [];
    const result = await drainCloudOps({
      ops: [1, 2, 3],
      pacer: createDrainPacer(),
      delay: noDelay,
      sendChunk: async (chunk, attempt) => {
        sent.push({ chunk, attempt });
        return { ok: true };
      },
    });
    assert.deepEqual(sent, [{ chunk: [1, 2, 3], attempt: 1 }]);
    assert.deepEqual(result, { ok: true });
  });

  it('on a backoff-class error, re-cuts the remaining ops smaller and keeps draining', async () => {
    const pacer = createDrainPacer({ random: () => 0 });
    const gaps = [];
    const attempts = [];
    let calls = 0;
    await drainCloudOps({
      ops: Array.from({ length: 16 }, (_, i) => i),
      pacer,
      delay: async (ms) => {
        gaps.push(ms);
      },
      sendChunk: async (chunk, attempt) => {
        calls += 1;
        attempts.push({ len: chunk.length, attempt });
        if (calls === 1) {
          const err = new Error('overloaded');
          err.status = 503;
          throw err;
        }
        return { ok: true };
      },
    });
    // First attempt at the full 16-op window fails; every attempt after the
    // congestion event is capped at the halved window (8), never 16 again.
    assert.equal(attempts[0].len, 16);
    assert.ok(
      attempts.slice(1).every((a) => a.len <= 8),
      'every attempt after congestion stays within the halved window'
    );
    // attempt numbers are a running count across the whole drain, unique per call.
    assert.deepEqual(attempts.map((a) => a.attempt), attempts.map((_, i) => i + 1));
    // All 16 ops eventually got sent across the (possibly several) successful chunks.
    const sentTotal = attempts.slice(1).reduce((sum, a) => sum + a.len, 0);
    assert.equal(sentTotal, 16);
    assert.ok(calls >= 2, 'at least the failed attempt plus one successful retry');
    assert.ok(gaps.length >= 1, 'at least the one congestion gap before the retry');
  });

  it('throws immediately on a permanent error — no retry, no gap', async () => {
    let calls = 0;
    let delayed = false;
    await assert.rejects(
      drainCloudOps({
        ops: [1],
        pacer: createDrainPacer(),
        delay: async () => {
          delayed = true;
        },
        sendChunk: async () => {
          calls += 1;
          const err = new Error('bad request');
          err.status = 400;
          throw err;
        },
      }),
      /bad request/
    );
    assert.equal(calls, 1);
    assert.equal(delayed, false);
  });

  it('gives up after CLOUD_DRAIN_MAX_CONGESTION_EVENTS and throws the last error', async () => {
    let calls = 0;
    await assert.rejects(
      drainCloudOps({
        ops: [1],
        pacer: createDrainPacer(),
        delay: noDelay,
        sendChunk: async () => {
          calls += 1;
          const err = new Error('still overloaded');
          err.status = 503;
          throw err;
        },
      }),
      /still overloaded/
    );
    assert.equal(calls, 7, '1 initial attempt + 6 congestion retries, then give up');
  });

  it('acks and advances past a chunk once it succeeds, then moves to the next', async () => {
    const acked = [];
    await drainCloudOps({
      ops: [1, 2, 3],
      pacer: createDrainPacer(),
      delay: noDelay,
      sendChunk: async (chunk) => ({ chunk }),
      onChunkAcked: (chunk) => {
        acked.push(chunk);
      },
    });
    assert.deepEqual(acked, [[1, 2, 3]]);
  });
});

describe('pushCloudOpsDirect — unique wire ids per attempt', () => {
  it('gives a re-cut chunk after congestion a different clientMutationId than the failed attempt', async () => {
    const ids = [];
    let calls = 0;
    const api = {
      push: async (_roomId, body) => {
        calls += 1;
        ids.push(body.clientMutationId);
        if (calls === 1) {
          const err = new Error('overloaded');
          err.status = 503;
          throw err;
        }
        return { revision: 1, applied: [], rejected: [] };
      },
    };
    await pushCloudOpsDirect(
      api,
      'room1',
      [{ path: 'entries/p1/fields', value: {}, updatedAt: 't', actorId: 'a' }],
      () => 0,
      () => {}
    );
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1], 'a retried attempt must not reuse the first wire id');
    assert.match(ids[0], /:a1:\d+-\d+$/);
    assert.match(ids[1], /:a2:\d+-\d+$/);
  });
});

describe('pushCloudOpsDirect — stale rejections', () => {
  it('does not count ops the Worker rejected as stale as applied, and records a diagnostic', async () => {
    clearCloudSyncErrors();
    clearCloudSyncEchoGuard();
    const api = {
      push: async () => ({
        revision: 5,
        applied: [],
        rejected: [{ op: { path: 'clinicalOps' }, reason: 'stale' }],
      }),
    };
    let revision = 4;
    const result = await pushCloudOpsDirect(
      api,
      'room1',
      [{ path: 'clinicalOps', value: {}, updatedAt: 't', actorId: 'a' }],
      () => revision,
      (next) => {
        revision = next;
      }
    );
    assert.equal(result.appliedOps, 0);
    assert.equal(result.staleRejected, 1);
    const diag = getCloudSyncDiagnostics();
    assert.ok(
      diag.lastErrors.some((e) => e.code === 'stale_rejected'),
      'a stale rejection must be recorded for the Conexión diagnostics panel'
    );
  });

  it('counts a fully-applied push as applied, with no diagnostic recorded', async () => {
    clearCloudSyncErrors();
    clearCloudSyncEchoGuard();
    const api = {
      push: async () => ({
        revision: 6,
        applied: [{ path: 'clinicalOps' }],
        rejected: [],
      }),
    };
    let revision = 5;
    const result = await pushCloudOpsDirect(
      api,
      'room1',
      [{ path: 'clinicalOps', value: {}, updatedAt: 't', actorId: 'a' }],
      () => revision,
      (next) => {
        revision = next;
      }
    );
    assert.equal(result.appliedOps, 1);
    assert.equal(result.staleRejected, 0);
    const diag = getCloudSyncDiagnostics();
    assert.ok(!diag.lastErrors.some((e) => e.code === 'stale_rejected'));
  });

  it('records a quota_exceeded diagnostic for non-stale rejections', async () => {
    clearCloudSyncErrors();
    const api = {
      push: async () => ({
        revision: 2,
        applied: [],
        rejected: [{ op: { path: 'entries/p9/fields' }, reason: 'quota_exceeded' }],
      }),
    };
    let revision = 1;
    await pushCloudOpsDirect(
      api,
      'room1',
      [{ path: 'entries/p9/fields', value: {}, updatedAt: 't', actorId: 'a' }],
      () => revision,
      (next) => {
        revision = next;
      }
    );
    const diag = getCloudSyncDiagnostics();
    assert.ok(
      diag.lastErrors.some((e) => e.code === 'quota_exceeded'),
      'a quota_exceeded rejection must be recorded for the Conexión diagnostics panel'
    );
  });
});
