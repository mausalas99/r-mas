'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createCommitBarrier } = require('./commit-barrier.js');

describe('commit-barrier', () => {
  it('coalesces schedules into one flush after COMMIT_COALESCE_MS', async () => {
    let flushes = 0;
    const barrier = createCommitBarrier({ coalesceMs: 50 });
    const p1 = barrier.scheduleFlush(async () => {
      flushes += 1;
    });
    const p2 = barrier.scheduleFlush(async () => {
      flushes += 1;
    });
    assert.strictEqual(flushes, 0);
    await Promise.all([p1, p2]);
    assert.strictEqual(flushes, 1);
  });

  it('flushNow runs immediately and resolves all waiters', async () => {
    let flushes = 0;
    const barrier = createCommitBarrier({ coalesceMs: 60_000 });
    const p1 = barrier.scheduleFlush(async () => {
      flushes += 1;
    });
    const p2 = barrier.scheduleFlush(async () => {
      flushes += 1;
    });
    await barrier.flushNow(async () => {
      flushes += 1;
    });
    await Promise.all([p1, p2]);
    assert.strictEqual(flushes, 1);
  });

  it('rejects all waiters when flush throws', async () => {
    const barrier = createCommitBarrier({ coalesceMs: 10 });
    const p = barrier.scheduleFlush(async () => {
      throw new Error('disk');
    });
    await assert.rejects(p, /disk/);
  });

  it('runs follow-up flush after in-flight flush completes', async () => {
    let flushes = 0;
    const barrier = createCommitBarrier({ coalesceMs: 60_000 });
    let unblock;
    const gate = new Promise((r) => {
      unblock = r;
    });
    const slow = barrier.flushNow(async () => {
      flushes += 1;
      await gate;
    });
    await new Promise((r) => setTimeout(r, 5));
    const fast = barrier.scheduleFlush(async () => {
      flushes += 1;
    });
    unblock();
    await slow;
    await fast;
    assert.strictEqual(flushes, 2);
  });
});
