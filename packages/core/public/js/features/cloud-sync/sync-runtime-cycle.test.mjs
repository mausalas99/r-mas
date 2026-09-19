import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSyncFailCycle,
  createSyncRuntimeCycle,
  isCloudRevisionStaleError,
} from './sync-runtime-cycle.mjs';
import { humanizeCloudSyncErrorMessage } from './cloud-sync-error-text.mjs';
import { makeOutbox } from './sync-runtime-cycle-test-helpers.mjs';
import { noteCloudSyncPush } from './cloud-sync-diagnostics.mjs';

describe('createSyncRuntimeCycle status', () => {
  let prevOnline;
  before(() => {
    prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
  });
  after(() => {
    if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
  });

  it('humanizeCloudSyncErrorMessage maps Failed to fetch', () => {
    assert.match(humanizeCloudSyncErrorMessage('Failed to fetch'), /Wi|red|Nube/i);
    assert.equal(humanizeCloudSyncErrorMessage('Revisión conflictiva'), 'Revisión conflictiva');
  });

  it('isCloudRevisionStaleError detects Worker 409 codes', () => {
    assert.equal(
      isCloudRevisionStaleError({ status: 409, data: { error: 'revision_stale' } }),
      true
    );
    assert.equal(isCloudRevisionStaleError({ status: 409, data: { error: 'conflict' } }), true);
    assert.equal(isCloudRevisionStaleError({ status: 500, data: { error: 'error' } }), false);
  });

  it('retries push after transient 503 then reaches idle', async () => {
    const statuses = [];
    let pushes = 0;
    const outbox = makeOutbox([
      { clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], baseRevision: 0, enqueuedAt: 1 },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async () => {
          pushes += 1;
          if (pushes === 1) {
            const err = new Error('saturated');
            err.status = 503;
            throw err;
          }
          return { revision: 2, needPull: false };
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus(status) {
        statuses.push(status);
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.ok(pushes >= 2);
    assert.equal(outbox.list().length, 0);
    assert.equal(statuses[statuses.length - 1], 'idle');
  });

  it('downgrades local revision when pull returns empty ops and since is ahead', async () => {
    let revision = 3266;
    const outbox = makeOutbox([]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 3264, ops: [] }),
        push: async () => ({ revision: 3265 }),
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => revision,
      setRevision(next) {
        revision = next;
      },
      onStatus() {},
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.equal(revision, 3264);
  });

  it('retries push after revision_stale then reaches idle', async () => {
    const statuses = [];
    let pushes = 0;
    const outbox = makeOutbox([
      { clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], baseRevision: 0, enqueuedAt: 1 },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 2 }),
        push: async () => {
          pushes += 1;
          if (pushes === 1) {
            const err = new Error('stale');
            err.status = 409;
            err.data = { error: 'revision_stale', message: 'Otro dispositivo actualizó la sala.' };
            throw err;
          }
          return { revision: 3, needPull: false };
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 1,
      setRevision: () => {},
      onStatus(status) {
        statuses.push(status);
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.equal(pushes, 2);
    assert.equal(outbox.list().length, 0);
    assert.equal(statuses[statuses.length - 1], 'idle');
  });

  it('keeps error after failed push (does not flip to pending)', async () => {
    const statuses = [];
    const outbox = makeOutbox([
      { clientMutationId: 'm1', ops: [{ t: 1 }], baseRevision: 0, enqueuedAt: 1 },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1 }),
        push: async () => {
          const err = new Error('push_failed');
          err.data = { message: 'Revisión conflictiva' };
          throw err;
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus(status, detail) {
        statuses.push({ status, detail });
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    const last = statuses[statuses.length - 1];
    assert.equal(last.status, 'error');
    assert.match(String(last.detail || ''), /Revisión conflictiva/);
    const errorIdx = statuses.findIndex((s) => s.status === 'error');
    assert.ok(errorIdx >= 0);
    assert.ok(!statuses.slice(errorIdx + 1).some((s) => s.status === 'pending'));
  });

  it('does not block other patients when one outbox row keeps failing', async () => {
    const statuses = [];
    const outbox = makeOutbox([
      {
        clientMutationId: 'labSidecars/p1',
        ops: [{ path: 'labSidecars/p1/set-1', value: {}, updatedAt: 't1' }],
        baseRevision: 0,
        enqueuedAt: 1,
      },
      {
        clientMutationId: 'labSidecars/p2',
        ops: [{ path: 'labSidecars/p2/set-1', value: {}, updatedAt: 't2' }],
        baseRevision: 0,
        enqueuedAt: 2,
      },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1 }),
        push: async (roomId, body) => {
          if (String(body.clientMutationId).startsWith('labSidecars/p1')) {
            const err = new Error('push_failed');
            err.data = { error: 'payload_too_large', message: 'El cambio es demasiado grande.' };
            throw err;
          }
          return { revision: 2, needPull: false };
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus(status, detail) {
        statuses.push({ status, detail });
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    const remaining = outbox.list().map((r) => r.clientMutationId);
    assert.deepEqual(remaining, ['labSidecars/p1']);
    assert.equal(statuses[statuses.length - 1].status, 'error');
  });

  it('reports configured-client error when api.push is missing', async () => {
    const statuses = [];
    const outbox = makeOutbox([
      { clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], baseRevision: 0, enqueuedAt: 1 },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: { pull: async () => ({ revision: 1 }) },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus(status, detail) {
        statuses.push({ status, detail });
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    const last = statuses[statuses.length - 1];
    assert.equal(last.status, 'error');
    assert.match(String(last.detail || ''), /cliente de nube no está listo para enviar|enlace con nube no está listo/i);
  });

  it('reports the pending op count as status detail before any cycle has run', () => {
    const statuses = [];
    const outbox = makeOutbox([
      {
        clientMutationId: 'm1',
        ops: [{ path: 'a', value: 1 }, { path: 'b', value: 2 }],
        baseRevision: 0,
        enqueuedAt: 1,
      },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: { pull: async () => ({ revision: 1 }), push: async () => ({ revision: 1 }) },
      outbox,
      getRoomId: () => '', // no room yet — boot never reaches a real cycle
      getRevision: () => 0,
      setRevision: () => {},
      onStatus(status, detail) {
        statuses.push({ status, detail });
      },
    });
    runtime.stop();

    const last = statuses[statuses.length - 1];
    assert.equal(last.status, 'pending');
    assert.match(last.detail, /^2 cambios sin enviar/);
  });

  it('appends "último envío hace X min" once the last push is stale', () => {
    noteCloudSyncPush();
    const realNow = Date.now;
    Date.now = () => realNow() + 3 * 60_000;
    try {
      const statuses = [];
      const outbox = makeOutbox([
        { clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], baseRevision: 0, enqueuedAt: 1 },
      ]);
      const runtime = createSyncRuntimeCycle({
        api: { pull: async () => ({ revision: 1 }), push: async () => ({ revision: 1 }) },
        outbox,
        getRoomId: () => '',
        getRevision: () => 0,
        setRevision: () => {},
        onStatus(status, detail) {
          statuses.push({ status, detail });
        },
      });
      runtime.stop();

      const last = statuses[statuses.length - 1];
      assert.equal(last.status, 'pending');
      assert.match(last.detail, /1 cambios sin enviar · último envío hace 3 min/);
    } finally {
      Date.now = realNow;
    }
  });

  it('reaches idle when pull succeeds and outbox empty', async () => {
    const statuses = [];
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 2 }),
        push: async () => ({ revision: 2 }),
      },
      outbox: makeOutbox(),
      getRoomId: () => 'room-1',
      getRevision: () => 1,
      setRevision: () => {},
      onStatus(status) {
        statuses.push(status);
      },
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.equal(statuses[statuses.length - 1], 'idle');
  });

  it('an instant WS ops message applies via applyPullResult and bumps local revision (Part C)', async () => {
    const original = globalThis.WebSocket;
    const applied = [];
    let revision = 5;
    const ops = [{ path: 'entries/p1/note', value: { text: 'estable' } }];
    globalThis.WebSocket = class MockWs {
      constructor() {
        setTimeout(() => {
          if (this.onopen) this.onopen();
          if (this.onmessage) this.onmessage({ data: JSON.stringify({ type: 'revision', revision: 6, ops }) });
        }, 0);
      }
      close() {}
    };

    const runtime = createSyncRuntimeCycle({
      api: { pull: async () => ({ revision, ops: [] }), push: async () => ({ revision }) },
      outbox: makeOutbox(),
      getRoomId: () => 'room-1',
      getRevision: () => revision,
      setRevision: (next) => { revision = next; },
      applyPullResult: async (result) => { applied.push(result); },
      liveRoomWs: { getBaseUrl: () => 'https://sync.example.com', getToken: () => 't' },
      deferBootCycle: true,
      onStatus() {},
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    runtime.stop();
    globalThis.WebSocket = original;

    assert.deepEqual(applied, [{ ops, revision: 6 }]);
    assert.equal(revision, 6);
  });

  it('a bare-revision WS message (no ops) never calls applyPullResult — the debounced pull is the safety net', async () => {
    const original = globalThis.WebSocket;
    const applied = [];
    let revision = 5;
    let pulls = 0;
    globalThis.WebSocket = class MockWs {
      constructor() {
        setTimeout(() => {
          if (this.onopen) this.onopen();
          if (this.onmessage) this.onmessage({ data: JSON.stringify({ type: 'revision', revision: 9 }) });
        }, 0);
      }
      close() {}
    };

    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => { pulls += 1; return { revision: 9, ops: [] }; },
        push: async () => ({ revision }),
      },
      outbox: makeOutbox(),
      getRoomId: () => 'room-1',
      getRevision: () => revision,
      setRevision: (next) => { revision = next; },
      applyPullResult: async (result) => { applied.push(result); },
      liveRoomWs: { getBaseUrl: () => 'https://sync.example.com', getToken: () => 't' },
      deferBootCycle: true,
      onStatus() {},
    });

    // Debounce is 300ms — wait past it so the fallback pull has a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 500));
    runtime.stop();
    globalThis.WebSocket = original;

    assert.ok(pulls >= 1); // the debounced revision hint still triggered a real pull
    // applyPullResult was reached only via that real pull (api.pull's {ops:[]} shape),
    // never via the direct WS-ops path — this message never carried ops to begin with.
    assert.ok(applied.every((r) => Array.isArray(r?.ops) && r.ops.length === 0));
  });
});

describe('createSyncFailCycle — backoff-class errors with pending ops', () => {
  function fakeScheduler() {
    const calls = [];
    return { calls, isRateLimitedError: () => false, noteFailure: (err) => calls.push(err) };
  }

  it('goes to pending (not error) when the outbox still has ops', () => {
    const statuses = [];
    const scheduler = fakeScheduler();
    const failCycle = createSyncFailCycle(() => scheduler, (status, detail) => statuses.push({ status, detail }), () => 1);
    const err = new Error('overloaded');
    err.status = 503;
    failCycle(err);
    const last = statuses[statuses.length - 1];
    assert.equal(last.status, 'pending');
    assert.match(last.detail, /Servidor Nube saturado/);
    assert.equal(scheduler.calls.length, 1, 'still notifies the poll scheduler');
  });

  it('goes to idle for the same error once the outbox is empty', () => {
    const statuses = [];
    const scheduler = fakeScheduler();
    const failCycle = createSyncFailCycle(() => scheduler, (status, detail) => statuses.push({ status, detail }), () => 0);
    const err = new Error('overloaded');
    err.status = 503;
    failCycle(err);
    assert.equal(statuses[statuses.length - 1].status, 'idle');
  });

  it('a permanent error still reports error even with pending ops', () => {
    const statuses = [];
    const scheduler = fakeScheduler();
    const failCycle = createSyncFailCycle(() => scheduler, (status, detail) => statuses.push({ status, detail }), () => 3);
    const err = new Error('bad request');
    err.status = 400;
    failCycle(err);
    assert.equal(statuses[statuses.length - 1].status, 'error');
  });
});
