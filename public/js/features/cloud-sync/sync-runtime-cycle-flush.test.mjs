import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncRuntimeCycle } from './sync-runtime-cycle.mjs';
import { makeOutbox } from './sync-runtime-cycle-test-helpers.mjs';
import { getCloudSyncDiagnostics, clearCloudSyncErrors } from './cloud-sync-diagnostics.mjs';

describe('createSyncRuntimeCycle flush/push behavior', () => {
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

  it('truncates oversized resLabs before push and reaches idle', async () => {
    const pushed = [];
    const outbox = makeOutbox([
      {
        clientMutationId: 'm-fat',
        ops: [
          {
            path: 'labSidecars/p1/1785683680719-1-0',
            value: { id: '1785683680719-1-0', resLabs: ['BH\tHb 8', 'QS\t' + 'Na 140 '.repeat(90_000)] },
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
    const resLabs = pushed[0].ops[0].value.resLabs;
    assert.ok(Array.isArray(resLabs));
    assert.ok(resLabs.length >= 1);
    assert.equal(pushed[0].ops[0].value.sourceText, undefined);
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

    // Base id still carries enqueuedAt (12345); an `:a<attempt>:<ts>` suffix
    // makes every wire attempt unique so a re-cut chunk never collides with
    // the Worker's cached response for an earlier attempt (fact 4).
    assert.equal(mutationIds.length, 1);
    assert.match(mutationIds[0], /^clinicalOps:12345:a1:\d+$/);
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
    assert.match(src, /deferBootCycle/);
    assert.match(src, /if \(!opts\.deferBootCycle\)/);
  });

  it('records a quota_exceeded diagnostic instead of silently dropping a rejected op, and still removes the outbox row', async () => {
    clearCloudSyncErrors();
    const outbox = makeOutbox([
      {
        clientMutationId: 'm-quota',
        ops: [{ path: 'entries/p9/fields', value: { nombre: 'P9' }, updatedAt: 't', actorId: 'a' }],
        baseRevision: 0,
        enqueuedAt: 1,
      },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async () => ({
          revision: 2,
          applied: [],
          rejected: [{ op: { path: 'entries/p9/fields' }, reason: 'quota_exceeded' }],
        }),
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus() {},
    });

    // Full syncCycle (not just flushOutbox): the cycle ends ok and calls
    // noteCloudSyncCycle(true), which must not wipe the quota_exceeded row it
    // just recorded — that is what the owner actually sees after a sync.
    await runtime.syncCycle();
    runtime.stop();

    const diag = getCloudSyncDiagnostics();
    assert.ok(
      diag.lastErrors.some((e) => e.code === 'quota_exceeded'),
      'a quota_exceeded rejection must be recorded for the Conexión diagnostics panel'
    );
    assert.equal(outbox.list().length, 0);
  });

  it('an op merged into the row mid-flight survives — a whole-row remove would have deleted it unsent', async () => {
    const outbox = makeOutbox([
      {
        clientMutationId: 'm1',
        ops: [
          { path: 'a', value: 1, updatedAt: 't1' },
          { path: 'b', value: 1, updatedAt: 't1' },
        ],
        baseRevision: 0,
        enqueuedAt: 1,
      },
    ]);
    let pushCalls = 0;
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async () => {
          pushCalls += 1;
          // A concurrent local edit lands on the same row while this push
          // is still in flight, before the Worker has responded.
          outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 2, updatedAt: 't2' }] });
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

    assert.equal(pushCalls, 1);
    const rows = outbox.list();
    assert.equal(rows.length, 1, 'the row survives — it still holds the unsent mid-flight op');
    assert.equal(rows[0].clientMutationId, 'm1');
    // 'b'@t1 was actually sent and acked; 'a'@t1 was overwritten by the
    // mid-flight edit before the ack, so the ack for 'a'@t1 is a no-op and
    // the newer 'a'@t2 is the only op left, still unsent.
    assert.deepEqual(
      rows[0].ops.map((op) => `${op.path}@${op.updatedAt}`),
      ['a@t2']
    );
  });

  it('a permanent failure partway through a multi-chunk drain leaves only the unsent tail behind', async () => {
    const ops = Array.from({ length: 20 }, (_, i) => ({
      path: `entries/p${i}/fields`,
      value: { nombre: `P${i}` },
      updatedAt: `t${i}`,
      actorId: 'a',
    }));
    const outbox = makeOutbox([{ clientMutationId: 'm-census', ops, baseRevision: 0, enqueuedAt: 1 }]);
    let pushCalls = 0;
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async () => {
          pushCalls += 1;
          if (pushCalls === 2) {
            const err = new Error('bad request');
            err.status = 400;
            throw err;
          }
          return { revision: pushCalls + 1 };
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

    assert.equal(pushCalls, 2, 'the drain needed 2 chunks for 20 ops, and the 2nd failed');
    const rows = outbox.list();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].clientMutationId, 'm-census');
    assert.ok(rows[0].ops.length > 0 && rows[0].ops.length < 20, 'only the unsent tail remains');
    assert.ok(
      !rows[0].ops.some((op) => op.path === 'entries/p0/fields'),
      'the acked first chunk must not come back'
    );
  });

  it('a second cycle after a partial failure never reuses the failed chunk wire id', async () => {
    const ops = Array.from({ length: 20 }, (_, i) => ({
      path: `entries/p${i}/fields`,
      value: { nombre: `P${i}` },
      updatedAt: `t${i}`,
      actorId: 'a',
    }));
    const outbox = makeOutbox([{ clientMutationId: 'm-census', ops, baseRevision: 0, enqueuedAt: 1 }]);
    const ids = [];
    let pushCalls = 0;
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async (_room, body) => {
          pushCalls += 1;
          ids.push(body.clientMutationId);
          if (pushCalls === 2) {
            const err = new Error('bad request');
            err.status = 400;
            throw err;
          }
          return { revision: pushCalls + 1 };
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus() {},
    });

    await runtime.syncCycle();
    const failedId = ids[ids.length - 1];
    await new Promise((r) => setTimeout(r, 2));
    await runtime.syncCycle();
    runtime.stop();

    const retryId = ids[ids.length - 1];
    assert.notEqual(
      retryId,
      failedId,
      'a retried chunk must not reuse a wire id the Worker may have cached a response for'
    );
    assert.equal(outbox.list().length, 0, 'the tail eventually drains on the second cycle');
  });

  it('reports send progress as "syncing" detail while draining the outbox', async () => {
    const statuses = [];
    const outbox = makeOutbox([
      { clientMutationId: 'm1', ops: [{ path: 'a', value: 1, updatedAt: 't1' }], baseRevision: 0, enqueuedAt: 1 },
      { clientMutationId: 'm2', ops: [{ path: 'b', value: 2, updatedAt: 't2' }], baseRevision: 0, enqueuedAt: 2 },
    ]);
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async () => ({ revision: 1 }),
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

    const progress = statuses
      .filter((s) => s.status === 'syncing' && s.detail)
      .map((s) => s.detail);
    assert.deepEqual(progress, ['Enviando 1/2 cambios', 'Enviando 2/2 cambios']);
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
