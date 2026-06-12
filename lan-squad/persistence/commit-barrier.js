'use strict';

/**
 * Coalesces durable host commits: many scheduleFlush() calls within coalesceMs
 * share one disk flush; all waiters resolve when completedGeneration reaches
 * their targetGeneration.
 */
function notifyFlushError(onError, err) {
  if (onError) onError(err);
}

function createCommitBarrier({ coalesceMs = 150, onError } = {}) {
  let timer = null;
  let flushing = false;
  /** @type {Array<{ target: number, resolve: () => void, reject: (e: Error) => void }>} */
  let waiters = [];
  /** @type {null | (() => Promise<void>)} */
  let pendingRun = null;
  let followUpQueued = false;
  let generation = 0;
  let completedGeneration = 0;

  function settleWaiters(err) {
    const staying = [];
    for (const w of waiters) {
      if (err) w.reject(err);
      else if (completedGeneration >= w.target) w.resolve();
      else staying.push(w);
    }
    waiters = staying;
  }

  function addWaiter(target) {
    return new Promise((resolve, reject) => {
      waiters.push({ target, resolve, reject });
    });
  }

  async function executeFlush() {
    if (flushing) {
      followUpQueued = true;
      return;
    }
    if (!pendingRun) return;

    flushing = true;
    const runFn = pendingRun;
    pendingRun = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    try {
      await runFn();
      generation += 1;
      completedGeneration = generation;
      settleWaiters(null);
    } catch (e) {
      settleWaiters(e);
      throw e;
    } finally {
      flushing = false;
      if (followUpQueued && pendingRun) {
        followUpQueued = false;
        await executeFlush();
      } else {
        followUpQueued = false;
      }
    }
  }

  function armTimer() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void executeFlush().catch((e) => notifyFlushError(onError, e));
    }, coalesceMs);
  }

  function scheduleFlush(runFn) {
    pendingRun = runFn;
    const target = generation + 1;
    if (flushing) {
      followUpQueued = true;
      return addWaiter(target);
    }
    armTimer();
    return addWaiter(target);
  }

  async function flushNow(runFn) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingRun = runFn;
    const target = generation + 1;
    const waiter = addWaiter(target);
    if (flushing) {
      followUpQueued = true;
      return waiter;
    }
    await executeFlush().catch((e) => notifyFlushError(onError, e));
    return waiter;
  }

  return { scheduleFlush, flushNow };
}

module.exports = { createCommitBarrier };
