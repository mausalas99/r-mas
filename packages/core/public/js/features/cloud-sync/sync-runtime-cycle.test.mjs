import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncFailCycle, createSyncRuntimeCycle } from './sync-runtime-cycle.mjs';
import { createOutbox } from './outbox.mjs';

/** In-memory outbox holding `rows`. */
function memOutbox(rows = []) {
  const mem = [];
  const outbox = createOutbox({ load: () => mem.slice(), save: (next) => mem.splice(0, mem.length, ...next) });
  for (const row of rows) outbox.enqueue(row);
  return outbox;
}

/** Opens a mock live socket against a runtime; returns how many pushes and pulls it made. */
async function openSocket(outbox) {
  const prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
  Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
  const original = globalThis.WebSocket;
  globalThis.WebSocket = class MockWs {
    constructor() {
      setTimeout(() => { if (this.onopen) this.onopen(); }, 0);
    }
    close() {}
  };
  const seen = { pushes: 0, pulls: 0 };
  const runtime = createSyncRuntimeCycle({
    api: {
      pull: async () => { seen.pulls += 1; return { revision: 1, ops: [] }; },
      push: async () => { seen.pushes += 1; return { revision: 1 }; },
    },
    outbox,
    getRoomId: () => 'room-1',
    getRevision: () => 1,
    setRevision: () => {},
    liveRoomWs: { getBaseUrl: () => 'https://sync.example.com', getToken: () => 't' },
    deferBootCycle: true,
    onStatus() {},
  });
  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    runtime.stop();
    globalThis.WebSocket = original;
    if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
  }
  return seen;
}

describe('live socket (re)connect runs one cycle', () => {
  it('with queued ops: pushes right away, not after the error backoff', async () => {
    const outbox = memOutbox([
      { clientMutationId: 'm1', ops: [{ path: 'entries/p1/medReceta', value: {}, updatedAt: '2026-09-25T10:00:00.000Z' }] },
    ]);
    const seen = await openSocket(outbox);
    assert.equal(seen.pushes, 1);
  });

  it('with nothing queued: still pulls what it missed while disconnected', async () => {
    const seen = await openSocket(memOutbox());
    assert.equal(seen.pushes, 0);
    assert.ok(seen.pulls >= 1);
  });
});

describe('createSyncFailCycle — server unreachable with pending ops', () => {
  function fakeScheduler() {
    return { isRateLimitedError: () => false, noteFailure() {} };
  }

  it('reads «Pendiente · sin conexión», not error; a setup error is still an error', () => {
    for (const make of [
      () => Object.assign(new Error('net::ERR_CONNECTION_REFUSED'), { status: 0 }),
      () => new TypeError('Failed to fetch'),
    ]) {
      const statuses = [];
      const failCycle = createSyncFailCycle(() => fakeScheduler(), (status, detail) => statuses.push({ status, detail }), () => 1);
      failCycle(make());
      assert.equal(statuses.at(-1).status, 'pending');
      assert.match(statuses.at(-1).detail, /Sin conexión/);
    }
    const statuses = [];
    const failCycle = createSyncFailCycle(() => fakeScheduler(), (status) => statuses.push({ status }), () => 1);
    failCycle(Object.assign(new Error('URL nube no configurada'), { status: 0, data: { error: 'missing_url' } }));
    assert.equal(statuses.at(-1).status, 'error', 'a setup error is still an error');
  });
});

describe('flush that joins an in-flight cycle', () => {
  let seq = 0;
  const row = (tag) => ({ clientMutationId: `${tag}-${++seq}`, ops: [{ path: `entries/p${seq}/note`, value: 'x', updatedAt: '2026-09-30T10:00:00.000Z' }] });

  /** Runtime whose first pull waits on `gate`; returns the counters. */
  function gatedRuntime(outbox, { failPush = false } = {}) {
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
    let open;
    const gate = new Promise((resolve) => { open = resolve; });
    const seen = { pushes: 0, pulls: 0, pullStarted: null };
    let started;
    seen.pullStarted = new Promise((resolve) => { started = resolve; });
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => { seen.pulls += 1; if (seen.pulls === 1) { started(); await gate; } return { revision: 1, ops: [] }; },
        push: async () => { seen.pushes += 1; if (failPush) throw Object.assign(new Error('boom'), { status: 500 }); return { revision: 1 }; },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 1,
      setRevision: () => {},
      deferBootCycle: true,
      onStatus() {},
    });
    return { runtime, seen, open };
  }

  it('an edit queued during the pull step is pushed by the same flush, not the next timer', async () => {
    const outbox = memOutbox([row('m1')]);
    const { runtime, seen, open } = gatedRuntime(outbox);
    try {
      const first = runtime.syncCycle();
      await seen.pullStarted;
      assert.equal(seen.pushes, 1);
      outbox.enqueue(row('m2'));
      const joined = runtime.syncCycle();
      open();
      await Promise.all([first, joined]);
      assert.equal(seen.pushes, 2, 'm2 pushed before the joined flush resolves');
      assert.equal(outbox.pendingCount?.() ?? 0, 0);
    } finally { runtime.stop(); }
  });

  it('no join: runs once (no extra push or pull)', async () => {
    const outbox = memOutbox([row('m1')]);
    const { runtime, seen, open } = gatedRuntime(outbox);
    try {
      const first = runtime.syncCycle();
      open();
      await first;
      assert.equal(seen.pushes, 1);
      assert.equal(seen.pulls, 1);
    } finally { runtime.stop(); }
  });

  it('a failed cycle does not rerun (no retry loop past the backoff)', async () => {
    const outbox = memOutbox([row('m1')]);
    const { runtime, seen, open } = gatedRuntime(outbox, { failPush: true });
    try {
      const first = runtime.syncCycle();
      const joined = runtime.syncCycle();
      open();
      await Promise.all([first, joined]);
      assert.equal(seen.pushes, 1);
    } finally { runtime.stop(); }
  });
});
