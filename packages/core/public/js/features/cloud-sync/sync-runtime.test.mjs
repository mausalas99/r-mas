import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startCloudSyncRuntime, stopCloudSyncRuntime, nudgeCloudSyncRuntime } from './sync-runtime.mjs';
import { makeOutbox } from './sync-runtime-cycle-test-helpers.mjs';

describe('nudgeCloudSyncRuntime', () => {
  let prevOnline;
  before(() => {
    prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
  });
  after(() => {
    if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
  });

  it('is a no-op when no runtime is active', () => {
    stopCloudSyncRuntime();
    assert.doesNotThrow(() => nudgeCloudSyncRuntime());
  });

  it('runs a sync cycle on the active shared runtime right away', async () => {
    let pulls = 0;
    const runtime = startCloudSyncRuntime({
      api: {
        pull: async () => {
          pulls += 1;
          return { revision: 1, ops: [] };
        },
        push: async () => ({ revision: 1, needPull: false }),
      },
      outbox: makeOutbox([]),
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
    });
    try {
      nudgeCloudSyncRuntime();
      await new Promise((r) => setTimeout(r, 20));
      assert.ok(pulls >= 1);
    } finally {
      runtime.stop();
    }
  });
});
