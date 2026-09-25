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
