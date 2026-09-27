import { describe, it, test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutbox } from './outbox.mjs';
import { createPullPush } from './sync-runtime-pull-push.mjs';
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
