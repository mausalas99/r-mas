import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPullPush } from './sync-runtime-pull-push.mjs';
import { cloudPullProgress } from '../../clinical-session-context.mjs';
import { ensureRoomDek, clearRoomDekCache } from './room-dek.mjs';

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
