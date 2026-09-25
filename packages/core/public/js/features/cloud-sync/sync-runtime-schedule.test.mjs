import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudPollScheduler } from './sync-runtime-schedule.mjs';
import { createDrainPacer, CLOUD_POLL_ERROR_OVERLOAD_MAX_MS } from './cloud-sync-timing.mjs';

function makeScheduler(drainPacer) {
  return createCloudPollScheduler({
    syncCycle: () => {},
    pendingCount: () => 0,
    getLastLocalWriteAt: () => 0,
    drainPacer,
  });
}

function stubSetTimeoutCapture() {
  const originalSetTimeout = globalThis.setTimeout;
  const captured = { delay: null };
  globalThis.setTimeout = (fn, ms) => {
    captured.delay = ms;
    return originalSetTimeout(() => {}, 0); // never actually fires in this test
  };
  return {
    captured,
    restore() {
      globalThis.setTimeout = originalSetTimeout;
    },
  };
}

describe('createCloudPollScheduler — overload backoff cap', () => {
  it('a backoff-class error backs off the shared AIMD drain pacer too', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    const startingChunkOps = pacer.chunkOps();
    const scheduler = makeScheduler(pacer);
    const err = new Error('overloaded');
    err.status = 503;
    scheduler.noteFailure(err);
    assert.ok(
      pacer.chunkOps() < startingChunkOps,
      'a whole-cycle overload failure must congest the drain pacer, not just the poll timer'
    );
    scheduler.stop();
  });

  it('a permanent error does not touch the drain pacer', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    const startingChunkOps = pacer.chunkOps();
    const scheduler = makeScheduler(pacer);
    const err = new Error('bad request');
    err.status = 400;
    scheduler.noteFailure(err);
    assert.equal(pacer.chunkOps(), startingChunkOps);
    scheduler.stop();
  });
});

describe('createCloudPollScheduler — timer scheduling reflects the right cap', () => {
  it('schedules the next cycle within the 2-minute overload cap after repeated 503s', async () => {
    const { captured, restore } = stubSetTimeoutCapture();
    try {
      const scheduler = makeScheduler(createDrainPacer({ random: () => 0 }));
      for (let i = 0; i < 6; i += 1) {
        const err = new Error('overloaded');
        err.status = 503;
        scheduler.noteFailure(err);
      }
      assert.ok(captured.delay <= CLOUD_POLL_ERROR_OVERLOAD_MAX_MS);
      scheduler.stop();
    } finally {
      restore();
    }
  });

  it('schedules up to the full 5-minute cap for a permanent error, not the 2-minute overload cap', async () => {
    const { captured, restore } = stubSetTimeoutCapture();
    try {
      // random()=1 -> jitterMs returns the full exp value
      const scheduler = makeScheduler(createDrainPacer({ random: () => 1 }));
      for (let i = 0; i < 8; i += 1) {
        const err = new Error('unreachable');
        err.status = 0;
        scheduler.noteFailure(err);
      }
      // Uncapped exponential (30s * 2^4 = 480s) clamps to the 5-minute ceiling.
      assert.ok(captured.delay > CLOUD_POLL_ERROR_OVERLOAD_MAX_MS);
      assert.ok(captured.delay <= 5 * 60_000);
      scheduler.stop();
    } finally {
      restore();
    }
  });

  it('an overload cap does not stick after a success — a later permanent-error streak still reaches the 5-minute cap', async () => {
    const { captured, restore } = stubSetTimeoutCapture();
    try {
      const scheduler = makeScheduler(createDrainPacer({ random: () => 1 }));
      for (let i = 0; i < 6; i += 1) {
        const err = new Error('overloaded');
        err.status = 503;
        scheduler.noteFailure(err);
      }
      scheduler.noteSuccess();
      for (let i = 0; i < 8; i += 1) {
        const permanentErr = new Error('unreachable');
        permanentErr.status = 0;
        scheduler.noteFailure(permanentErr);
      }
      // If the 120s overload cap had stuck around from the earlier streak,
      // this could never exceed it. It does — the cap reset on success.
      assert.ok(captured.delay > CLOUD_POLL_ERROR_OVERLOAD_MAX_MS);
      assert.ok(captured.delay <= 5 * 60_000);
      scheduler.stop();
    } finally {
      restore();
    }
  });
});
