import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncRuntimeCycle } from './sync-runtime-cycle.mjs';
import { makeOutbox } from './sync-runtime-cycle-test-helpers.mjs';
import { getCloudSyncDiagnostics, clearCloudSyncErrors } from './cloud-sync-diagnostics.mjs';
import { clearCloudSyncEchoGuard } from './cloud-sync-echo-guard.mjs';
import { __resetLabSidecarIndexForTests } from './cloud-lab-sidecar-index.mjs';
import { __resetMedRecetaIndexForTests } from './cloud-med-receta-index.mjs';

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
  beforeEach(() => {
    // Several tests here reuse identical (path, updatedAt) fixtures across
    // `it`s. The fingerprint/echo indexes now persist in memory for real
    // (moved off localStorage), so leftover state from one test could make
    // a later test's op look like an already-synced repeat. Start each test
    // with clean indexes, the way a real cold app start would.
    clearCloudSyncEchoGuard();
    __resetLabSidecarIndexForTests();
    __resetMedRecetaIndexForTests();
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
    assert.match(mutationIds[0], /^clinicalOps:12345:a1:\d+-\d+$/);
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

  it('an op merged into the row mid-flight survives and is resent within the same flush', async () => {
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
    const pushed = [];
    let pushCalls = 0;
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async (_room, body) => {
          pushCalls += 1;
          pushed.push(body);
          if (pushCalls === 1) {
            // A concurrent local edit lands on the same row while this push
            // is still in flight, before the Worker has responded.
            outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: 'a', value: 2, updatedAt: 't2' }] });
          }
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

    // 'b'@t1 was actually sent and acked; 'a'@t1 was overwritten by the
    // mid-flight edit before the ack, so the ack for 'a'@t1 is a no-op and
    // the newer 'a'@t2 survives the whole-row-remove trap. The outer flush
    // loop re-lists the outbox every turn, so 'a'@t2 goes out on the very
    // next turn of this same flush instead of waiting for the next cycle.
    assert.equal(pushCalls, 2);
    assert.deepEqual(
      pushed[1].ops.map((op) => `${op.path}@${op.updatedAt}`),
      ['a@t2']
    );
    assert.equal(outbox.list().length, 0);
  });

  it('a live edit behind a lab backfill reaches the Worker before the backfill drains', async () => {
    const labRows = Array.from({ length: 10 }, (_, i) => ({
      clientMutationId: `labSidecars/p${i}`,
      ops: [
        {
          path: `labSidecars/p${i}/set1`,
          value: { id: 'set1', resLabs: ['BH\tHb 8'] },
          updatedAt: 't',
          actorId: 'a',
        },
      ],
      baseRevision: 0,
      enqueuedAt: i + 1,
    }));
    const outbox = makeOutbox([
      ...labRows,
      {
        clientMutationId: 'clinicalOps',
        ops: [{ path: 'clinicalOps', value: { teams: [] }, updatedAt: 't', actorId: 'a' }],
        baseRevision: 0,
        enqueuedAt: 11,
      },
    ]);
    const pushed = [];
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async (_room, body) => {
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

    assert.ok(pushed.length > 0);
    assert.equal(pushed[0].ops[0].path, 'clinicalOps');
  });

  it('a new field op enqueued mid-flush goes out on the next push, not a second lab row', async () => {
    const outbox = makeOutbox([
      {
        clientMutationId: 'labSidecars/p0',
        ops: [{ path: 'labSidecars/p0/set1', value: { id: 'set1', resLabs: ['a'] }, updatedAt: 't', actorId: 'a' }],
        baseRevision: 0,
        enqueuedAt: 1,
      },
      {
        clientMutationId: 'labSidecars/p1',
        ops: [{ path: 'labSidecars/p1/set1', value: { id: 'set1', resLabs: ['a'] }, updatedAt: 't', actorId: 'a' }],
        baseRevision: 0,
        enqueuedAt: 2,
      },
      {
        clientMutationId: 'labSidecars/p2',
        ops: [{ path: 'labSidecars/p2/set1', value: { id: 'set1', resLabs: ['a'] }, updatedAt: 't', actorId: 'a' }],
        baseRevision: 0,
        enqueuedAt: 3,
      },
    ]);
    const pushed = [];
    let pushCalls = 0;
    const runtime = createSyncRuntimeCycle({
      api: {
        pull: async () => ({ revision: 1, ops: [] }),
        push: async (_room, body) => {
          pushCalls += 1;
          pushed.push(body);
          if (pushCalls === 1) {
            // The live edit the owner actually hits: it lands while the lab
            // backfill's first row is still in flight.
            outbox.enqueue({
              clientMutationId: 'cloud-room-push',
              ops: [{ path: 'entries/p9/fields', value: { nombre: 'P9' }, updatedAt: 't3', actorId: 'a' }],
            });
          }
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

    assert.ok(pushed.length >= 2);
    assert.equal(pushed[0].ops[0].path, 'labSidecars/p0/set1');
    assert.equal(pushed[1].ops[0].path, 'entries/p9/fields');
  });

  it('a row that always fails with a permanent error is attempted once per flush, and the error surfaces', async () => {
    clearCloudSyncErrors();
    const outbox = makeOutbox([
      {
        clientMutationId: 'm-bad',
        ops: [{ path: 'entries/p1/fields', value: { nombre: 'P1' }, updatedAt: 't1', actorId: 'a' }],
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
          const err = new Error('bad request');
          err.status = 400;
          throw err;
        },
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision: () => {},
      onStatus() {},
    });

    // The constructor already kicks an immediate cycle; drive through
    // syncCycle() (like the rest of this file) so cycleInflightRef dedupes
    // it with that boot cycle instead of running a second, independent flush.
    // syncCycle() itself swallows the error via failCycle, so the flush's own
    // throw (firstErr) is observed here as the recorded diagnostic instead.
    await runtime.syncCycle();
    runtime.stop();

    assert.equal(pushCalls, 1, 'a permanently-failing row must not be retried in the same flush');
    assert.equal(outbox.list().length, 1, 'the row stays pending for the next scheduled cycle');
    const diag = getCloudSyncDiagnostics();
    assert.ok(
      diag.lastErrors.some((e) => e.op === 'cycle'),
      'the flush error must surface, not be silently swallowed'
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
