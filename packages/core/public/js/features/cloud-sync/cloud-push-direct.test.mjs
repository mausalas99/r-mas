import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { drainCloudOps } from './cloud-push-direct.mjs';
import { createDrainPacer, CLOUD_MIN_PUSH_INTERVAL_MS } from './cloud-sync-timing.mjs';

// Ways the bigger-chunk drain can fail:
// 1. still cuts 16-op chunks (no speed gain);
// 2. still sleeps 125-250 ms between clean chunks;
// 3. one device pushes faster than the Worker's 120 pushes/min room limit;
// 4. loses its backoff gap after a 429/overload (gap*2 of 0 is 0);
// 5. an old Worker (max 16) answers 400 to a 64-op push and the drain
//    treats it as permanent, so the outbox never drains;
// 6. a 400 that is not about op count gets retried forever.

const ops = (n) => Array.from({ length: n }, (_, i) => ({ path: `entries/p${i}/fields`, value: i }));
const oldWorker400 = (n) =>
  Object.assign(new Error(`Demasiadas operaciones en un push (${n}; máx. 16). Actualiza R+.`), {
    status: 400,
    data: { error: 'invalid_request', message: `Demasiadas operaciones en un push (${n}; máx. 16). Actualiza R+.` },
  });

describe('createDrainPacer', () => {
  it('starts at 64 ops and no gap beyond the rate floor', () => {
    const pacer = createDrainPacer({ random: () => 1 });
    assert.equal(pacer.chunkOps(), 64);
    assert.equal(pacer.gapMs(CLOUD_MIN_PUSH_INTERVAL_MS + 10), 0);
  });

  it('keeps pushes at least 500 ms apart (120 pushes/min room limit)', () => {
    assert.equal(CLOUD_MIN_PUSH_INTERVAL_MS, 500);
    const pacer = createDrainPacer({ random: () => 1 });
    assert.equal(pacer.gapMs(100), 400);
  });

  it('backs off after congestion and returns to no gap once clean', () => {
    const pacer = createDrainPacer({ random: () => 1 });
    pacer.onCongested({ status: 503 });
    assert.equal(pacer.chunkOps(), 32);
    assert.ok(pacer.gapMs(10_000) >= 250);
    pacer.onClean();
    assert.equal(pacer.gapMs(10_000), 0);
  });

  it('capOps lowers the ceiling for the rest of the session', () => {
    const pacer = createDrainPacer();
    pacer.capOps(16);
    assert.equal(pacer.chunkOps(), 16);
    for (let i = 0; i < 100; i += 1) pacer.onClean();
    assert.equal(pacer.chunkOps(), 16);
  });
});

describe('drainCloudOps', () => {
  it('sends 128 ops in two 64-op chunks with no clean-chunk sleep', async () => {
    const sizes = [];
    const delays = [];
    await drainCloudOps({
      ops: ops(128),
      pacer: createDrainPacer(),
      sendChunk: async (chunk) => {
        sizes.push(chunk.length);
        return {};
      },
      delay: async (ms) => {
        delays.push(ms);
      },
    });
    assert.deepEqual(sizes, [64, 64]);
    assert.ok(delays.every((ms) => ms <= CLOUD_MIN_PUSH_INTERVAL_MS), String(delays));
  });

  it('falls back to 16-op chunks when an old Worker rejects the op count', async () => {
    const pacer = createDrainPacer();
    const sent = [];
    await drainCloudOps({
      ops: ops(40),
      pacer,
      sendChunk: async (chunk) => {
        if (chunk.length > 16) throw oldWorker400(chunk.length);
        sent.push(chunk.length);
        return {};
      },
      delay: async () => {},
    });
    assert.deepEqual(sent, [16, 16, 8]);
    assert.equal(pacer.chunkOps(), 16);
  });

  it('throws other 400s at once', async () => {
    const bad = Object.assign(new Error('x'), { status: 400, data: { error: 'invalid_request', message: 'x' } });
    let calls = 0;
    await assert.rejects(
      drainCloudOps({
        ops: ops(4),
        pacer: createDrainPacer(),
        sendChunk: async () => {
          calls += 1;
          throw bad;
        },
        delay: async () => {},
      }),
      (err) => err === bad
    );
    assert.equal(calls, 1);
  });

  it('throws an op-count 400 when the chunk is already under the cap', async () => {
    let calls = 0;
    await assert.rejects(
      drainCloudOps({
        ops: ops(4),
        pacer: createDrainPacer(),
        sendChunk: async (chunk) => {
          calls += 1;
          throw oldWorker400(chunk.length);
        },
        delay: async () => {},
      }),
      (err) => err.status === 400
    );
    assert.equal(calls, 1);
  });
});
