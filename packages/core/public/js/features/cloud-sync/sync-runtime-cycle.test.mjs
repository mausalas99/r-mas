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
