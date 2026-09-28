import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutbox } from './outbox.mjs';
import { createPullPush } from './sync-runtime-pull-push.mjs';
import { cloudPullProgress } from '../../clinical-session-context.mjs';
import { ensureRoomDek, clearRoomDekCache } from './room-dek.mjs';

// Node's navigator has no onLine; the flush skips while offline.
Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });

/**
 * Device at revision 5 pushes one op. `pushResult` is what the Worker answers;
 * the pull answers with whatever other devices wrote meanwhile.
 */
let seq = 0;
function setup(pushResult) {
  seq += 1; // distinct op per test: the echo guard drops an op it already sent
  const mem = [];
  const outbox = createOutbox({ load: () => mem.slice(), save: (rows) => mem.splice(0, mem.length, ...rows) });
  outbox.enqueue({ clientMutationId: 'm1', ops: [{ path: `entries/p${seq}/note`, value: { texto: 'b' }, updatedAt: '2026-09-27T08:00:00.000Z', actorId: 'b' }] });
  let revision = 5;
  const pulls = [];
  const applied = [];
  const api = {
    push: async () => pushResult,
    pull: async (_roomId, since) => {
      pulls.push(since);
      return { revision: 9, ops: [{ path: 'entries/p2/fields', value: { nombre: 'DEMO' } }] };
    },
  };
  const { flushOutbox } = createPullPush(
    {
      api,
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => revision,
      setRevision: (r) => { revision = r; },
      applyPullResult: async (res) => { applied.push(...(res?.ops || [])); },
    },
    () => {},
    { pendingCount: () => outbox.list().length, refreshIdleStatus() {} },
    { markLocalWrite() {} },
  );
  return { flushOutbox, pulls, applied, getRevision: () => revision };
}

test('push answered with needPull: the pull starts from the old revision, so other devices\' ops arrive', async () => {
  const s = setup({ revision: 9, applied: [], rejected: [], needPull: true });
  await s.flushOutbox();
  assert.deepEqual(s.pulls, [5]);
  assert.deepEqual(s.applied.map((o) => o.path), ['entries/p2/fields']);
  assert.equal(s.getRevision(), 9);
});

test('push with nothing new on the server: jump to the post-push revision, no extra pull', async () => {
  const s = setup({ revision: 6, applied: [], rejected: [], needPull: false });
  await s.flushOutbox();
  assert.deepEqual(s.pulls, []);
  assert.equal(s.getRevision(), 6);
});

/** Outbox rows pushed through flushOutbox against `push`; returns the POSTed op paths and what is left. */
async function flushRows(rows, push) {
  const mem = [];
  const outbox = createOutbox({ load: () => mem.slice(), save: (next) => mem.splice(0, mem.length, ...next) });
  for (const row of rows) outbox.enqueue(row);
  const pushed = [];
  const { flushOutbox } = createPullPush(
    {
      api: {
        push: async (roomId, body) => {
          const paths = body.ops.map((op) => op.path);
          pushed.push(paths);
          return push(paths);
        },
        pull: async () => ({ revision: 1, ops: [] }),
      },
      outbox,
      getRoomId: () => 'room-1',
      getRevision: () => 0,
      setRevision() {},
      applyPullResult: async () => {},
    },
    () => {},
    { pendingCount: () => outbox.list().length, refreshIdleStatus() {} },
    { markLocalWrite() {} },
  );
  // A row still stuck after the retries is reported by throwing (the cycle turns it into status).
  const error = await flushOutbox().then(() => null, (err) => err);
  return { pushed, left: outbox.list().map((r) => r.clientMutationId), error };
}

test('small outbox rows go out together in one POST', async () => {
  seq += 1;
  const { pushed, left } = await flushRows(
    [
      { clientMutationId: 'm1', ops: [{ path: `a${seq}`, value: 1, updatedAt: '2026-09-27T08:00:01.000Z' }] },
      { clientMutationId: 'm2', ops: [{ path: `b${seq}`, value: 2, updatedAt: '2026-09-27T08:00:02.000Z' }] },
    ],
    async () => ({ revision: 1 }),
  );
  assert.deepEqual(pushed, [[`a${seq}`, `b${seq}`]]);
  assert.deepEqual(left, []);
});

test('a failed grouped POST retries rows one by one, so the good row still goes out', async () => {
  seq += 1;
  const bad = `x${seq}`;
  const good = `y${seq}`;
  const { pushed, left, error } = await flushRows(
    [
      { clientMutationId: 'bad', ops: [{ path: bad, value: 1, updatedAt: '2026-09-27T08:00:01.000Z' }] },
      { clientMutationId: 'good', ops: [{ path: good, value: 2, updatedAt: '2026-09-27T08:00:02.000Z' }] },
    ],
    async (paths) => {
      if (paths.includes(bad)) throw Object.assign(new Error('bad request'), { status: 400 });
      return { revision: 1 };
    },
  );
  assert.deepEqual(pushed, [[bad, good], [bad], [good]]);
  assert.deepEqual(left, ['bad']);
  assert.equal(error?.status, 400);
});

/** Pull-only harness: no outbox, revision from the caller. */
function pullPushHarness(api, getRevision, setRevision = () => {}) {
  return createPullPush(
    {
      api,
      outbox: {},
      getRoomId: () => 'room1',
      getRevision,
      setRevision,
      applyPullResult: async () => {},
      pollMobile: false,
    },
    () => {},
    { pendingCount: () => 0, refreshIdleStatus: () => {} },
    { markLocalWrite: () => {} }
  );
}

describe('one full re-pull per keyed sala (recovers the 8.4.1 onboarding drop)', () => {
  function memStorage() {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  }
  async function keyRoom1() {
    await ensureRoomDek({ setRoomDek: async () => ({ ok: true }) }, 'room1', 'CODE23');
  }

  it('with the key: pulls from 0 once, then incremental; remembered across runs', async () => {
    const prev = globalThis.localStorage;
    globalThis.localStorage = memStorage();
    clearRoomDekCache();
    try {
      await keyRoom1();
      const seen = [];
      const api = { pull: async (_id, since) => { seen.push(since); return { revision: 9, ops: [] }; } };
      await pullPushHarness(api, () => 7).pullLatest();
      await pullPushHarness(api, () => 7).pullLatest();
      assert.deepEqual(seen, [0, 7]);
    } finally {
      clearRoomDekCache();
      globalThis.localStorage = prev;
    }
  });

  it('without the key: nothing locked to recover, plain incremental pull', async () => {
    const prev = globalThis.localStorage;
    globalThis.localStorage = memStorage();
    clearRoomDekCache();
    try {
      const seen = [];
      const api = { pull: async (_id, since) => { seen.push(since); return { revision: 9, ops: [] }; } };
      await pullPushHarness(api, () => 7).pullLatest();
      assert.deepEqual(seen, [7]);
    } finally {
      globalThis.localStorage = prev;
    }
  });

  it('a pull that comes back locked is not marked done and runs again', async () => {
    const prev = globalThis.localStorage;
    globalThis.localStorage = memStorage();
    clearRoomDekCache();
    try {
      await keyRoom1();
      const seen = [];
      let locked = true;
      const api = { pull: async (_id, since) => { seen.push(since); return { revision: 9, ops: [], locked }; } };
      await pullPushHarness(api, () => 7).pullLatest();
      locked = false;
      await pullPushHarness(api, () => 7).pullLatest();
      await pullPushHarness(api, () => 7).pullLatest();
      assert.deepEqual(seen, [0, 0, 7]);
    } finally {
      clearRoomDekCache();
      globalThis.localStorage = prev;
    }
  });
});

describe('runPullLatest fresh-join progress flag', () => {
  it('sets cloudPullProgress.freshInFlight during a since=0 pull, clears it after', async () => {
    let flagDuringFetch;
    const { pullLatest } = pullPushHarness(
      {
        pull: async () => {
          flagDuringFetch = cloudPullProgress.freshInFlight;
          return { revision: 1, ops: [] };
        },
      },
      () => 0
    );
    assert.equal(cloudPullProgress.freshInFlight, false);
    await pullLatest();
    assert.equal(flagDuringFetch, true, 'flag is up while the fresh pull is in flight');
    assert.equal(cloudPullProgress.freshInFlight, false, 'flag clears once the pull settles');
  });

  it('leaves the flag alone for an incremental pull (since > 0)', async () => {
    let flagDuringFetch;
    const { pullLatest } = pullPushHarness(
      {
        pull: async () => {
          flagDuringFetch = cloudPullProgress.freshInFlight;
          return { revision: 6, ops: [] };
        },
      },
      () => 5
    );
    await pullLatest();
    assert.equal(flagDuringFetch, false);
    assert.equal(cloudPullProgress.freshInFlight, false);
  });

  it('clears the flag even when the pull rejects', async () => {
    const { pullLatest } = pullPushHarness(
      { pull: async () => { throw new Error('boom'); } },
      () => 0
    );
    await assert.rejects(pullLatest);
    assert.equal(cloudPullProgress.freshInFlight, false);
  });
});

describe('pull never overwrites a newer unsent write', () => {
  // Device B processed a new receta at 10:05; its push is still in the outbox.
  // A pull lands first, carrying device A's 10:00 receta for the same patient,
  // plus unrelated changes that must still apply.
  const pendingRow = {
    clientMutationId: 'batch',
    ops: [{ path: 'entries/p1/medReceta', value: { items: ['nuevo'] }, updatedAt: '2026-09-26T10:05:00.000Z' }],
  };

  function harness(pullResult) {
    const applied = [];
    const pp = createPullPush(
      {
        api: { pull: async () => structuredClone(pullResult) },
        outbox: { list: () => [pendingRow] },
        getRoomId: () => 'room1',
        getRevision: () => 5,
        setRevision: () => {},
        applyPullResult: async (r) => applied.push(r),
        pollMobile: false,
      },
      () => {},
      { pendingCount: () => 1, refreshIdleStatus: () => {} },
      { markLocalWrite: () => {} }
    );
    return { pullLatest: pp.pullLatest, applied };
  }

  it('drops the older op for the pending path and keeps the rest (incremental pull)', async () => {
    const { pullLatest, applied } = harness({
      revision: 9,
      ops: [
        { path: 'entries/p1/medReceta', value: { items: ['viejo'] }, updatedAt: '2026-09-26T10:00:00.000Z' },
        { path: 'entries/p2/medReceta', value: { items: ['otro'] }, updatedAt: '2026-09-26T10:00:00.000Z' },
        { path: 'entries/p1/fields', value: { cama: '12' }, updatedAt: '2026-09-26T09:00:00.000Z' },
      ],
    });
    await pullLatest();
    assert.deepEqual(applied[0].ops.map((op) => op.path), ['entries/p2/medReceta', 'entries/p1/fields']);
  });

  it('applies a room value newer than the pending write (our push will lose)', async () => {
    const { pullLatest, applied } = harness({
      revision: 9,
      ops: [{ path: 'entries/p1/medReceta', value: { items: ['más nuevo'] }, updatedAt: '2026-09-26T10:06:00.000Z' }],
    });
    await pullLatest();
    assert.equal(applied[0].ops.length, 1);
  });

  it('strips the older field from a snapshot so pull-apply leaves local alone', async () => {
    const { pullLatest, applied } = harness({
      revision: 40,
      needSnapshot: true,
      state: {
        entries: [
          { id: 'p1', medReceta: { items: ['viejo'] }, fields: { cama: '12' } },
          { id: 'p2', medReceta: { items: ['otro'] } },
        ],
        entityVersions: {
          'entries/p1/medReceta': { updatedAt: '2026-09-26T10:00:00.000Z' },
          'entries/p2/medReceta': { updatedAt: '2026-09-26T10:00:00.000Z' },
        },
      },
    });
    await pullLatest();
    const [p1, p2] = applied[0].state.entries;
    assert.equal(Object.hasOwn(p1, 'medReceta'), false);
    assert.deepEqual(p1.fields, { cama: '12' });
    assert.deepEqual(p2.medReceta, { items: ['otro'] });
  });
});

describe('runPullLatest revision gate on a locked pull', () => {
  it('advances the revision for a readable pull', async () => {
    const seen = [];
    const { pullLatest } = pullPushHarness(
      { pull: async () => ({ revision: 9, ops: [{ path: 'entries/p1/note', value: 'ok' }] }) },
      () => 5,
      (rev) => seen.push(rev)
    );
    await pullLatest();
    assert.deepEqual(seen, [9]);
  });

  it('holds the revision back when the result is flagged locked', async () => {
    const seen = [];
    const { pullLatest } = pullPushHarness(
      {
        pull: async () => ({
          revision: 9,
          locked: true,
          ops: [{ path: 'entries/p1/note', value: { enc: 1, iv: 'i', ct: 'c' } }],
        }),
      },
      () => 5,
      (rev) => seen.push(rev)
    );
    await pullLatest();
    assert.deepEqual(seen, [], 'a locked pull must leave `since` where it was');
  });
});
