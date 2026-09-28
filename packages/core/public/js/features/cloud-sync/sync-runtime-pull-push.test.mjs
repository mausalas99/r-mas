import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPullPush } from './sync-runtime-pull-push.mjs';
import { cloudPullProgress } from '../../clinical-session-context.mjs';

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
