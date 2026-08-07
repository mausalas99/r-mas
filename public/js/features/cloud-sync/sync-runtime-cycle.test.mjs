import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSyncRuntimeCycle,
  humanizeCloudSyncErrorMessage,
  isCloudRevisionStaleError,
} from './sync-runtime-cycle.mjs';

function makeOutbox(rows = []) {
  let list = rows.slice();
  return {
    list: () => list.slice(),
    remove(id) {
      list = list.filter((r) => r.clientMutationId !== id);
    },
  };
}

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

  it('truncates oversized lab sourceText before push and reaches idle', async () => {
    const pushed = [];
    const outbox = makeOutbox([
      {
        clientMutationId: 'm-fat',
        ops: [
          {
            path: 'labSidecars/p1/1785683680719-1-0',
            value: { id: '1785683680719-1-0', resLabs: ['BH\tHb 8'], sourceText: 'Z'.repeat(600_000) },
            updatedAt: 't',
            actorId: 'a',
          },
        ],
        baseRevision: 0,
        enqueuedAt: 1,
      },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1 }),
        push: async (_roomId, body) => {
          pushed.push(body);
          return { revision: 1 };
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus() {},
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.equal(pushed.length, 1);
    const text = String(pushed[0].ops[0].value.sourceText || '');
    assert.ok(text.length > 0);
    assert.ok(text.length < 600_000);
    assert.equal(outbox.list().length, 0);
  });

  it('does not regress revision on duplicate clinicalOps push response', async () => {
    let revision = 779;
    const revisions = [];
    const outbox = makeOutbox([
      {
        clientMutationId: 'clinicalOps',
        ops: [{ path: 'clinicalOps', value: { teams: [] } }],
        baseRevision: 541,
        enqueuedAt: 1,
      },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 779, ops: [] }),
        push: async () => ({ revision: 541, needPull: false }),
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => revision,
      setRevision(next) {
        revision = Number(next);
        revisions.push(revision);
      },
      onStatus() {},
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.equal(revision, 779);
    assert.ok(!revisions.includes(541));
    assert.equal(outbox.list().length, 0);
  });

  it('stamps clinicalOps wire mutation id with enqueuedAt', async () => {
    /** @type {string[]} */
    const mutationIds = [];
    const outbox = makeOutbox([
      {
        clientMutationId: 'clinicalOps',
        ops: [{ path: 'clinicalOps', value: { teams: [] } }],
        baseRevision: 0,
        enqueuedAt: 12345,
      },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async (_room, body) => {
          mutationIds.push(String(body.clientMutationId || ''));
          return { revision: 2 };
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus() {},
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.deepEqual(mutationIds, ['clinicalOps:12345']);
  });

  it('pulls before push when outbox is empty', async () => {
    const order = [];
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => {
          order.push('pull');
          return { revision: 1, ops: [] };
        },
        push: async () => {
          order.push('push');
          return { revision: 1 };
        },
      },
      outbox: makeOutbox(),
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus() {},
    });

    await runtime.syncCycle();
    runtime.stop();

    assert.deepEqual(order, ['pull']);
  });

  it('exposes noteLocalMutation and listens for window focus', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./sync-runtime-cycle.mjs', import.meta.url), 'utf8')
    );
    assert.match(src, /noteLocalMutation/);
    assert.match(src, /addEventListener\('focus'/);
    assert.match(src, /void syncCycle\(\);\s*scheduler\.armNextTimer/);
  });

  it('while hidden still flushes outbox and keeps polling armed', async () => {
    const hadDocument = typeof globalThis.document !== 'undefined';
    const prevDocument = globalThis.document;
    globalThis.document = {
      visibilityState: 'hidden',
      addEventListener() {},
      removeEventListener() {},
    };

    let pulls = 0;
    let pushes = 0;
    const outbox = makeOutbox([
      { clientMutationId: 'm1', ops: [{ path: 'a', value: 1 }], baseRevision: 0, enqueuedAt: 1 },
      { clientMutationId: 'm2', ops: [{ path: 'b', value: 2 }], baseRevision: 0, enqueuedAt: 2 },
    ]);
    try {
      const runtime = createSyncRuntimeCycle({
        api: {
          pull: async () => {
            pulls += 1;
            return { revision: 1, ops: [] };
          },
          push: async () => {
            pushes += 1;
            return { revision: 1 };
          },
        },
        outbox,
        getRoomId: () => 'room-1',
        getRevision: () => 0,
        setRevision: () => {},
        onStatus() {},
      });

      // Constructor kicks an immediate cycle (hidden → push-only, no pull).
      await new Promise((r) => setTimeout(r, 0));
      assert.ok(pushes >= 1);
      assert.equal(pulls, 0);
      // Remaining outbox item still flushes while hidden.
      await runtime.syncCycle();
      assert.equal(outbox.list().length, 0);
      assert.equal(pulls, 0);
      runtime.stop();
    } finally {
      if (hadDocument) globalThis.document = prevDocument;
      else delete globalThis.document;
    }
  });
});
