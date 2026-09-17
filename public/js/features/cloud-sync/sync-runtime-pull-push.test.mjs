import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPullPush } from './sync-runtime-pull-push.mjs';
import { cloudPullProgress } from '../../clinical-session-context.mjs';

function pullPushHarness(api, getRevision) {
  return createPullPush(
    {
      api,
      outbox: {},
      getRoomId: () => 'room1',
      getRevision,
      setRevision: () => {},
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
