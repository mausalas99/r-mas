import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { applyClinicalOpsSnapshot } from '../clinical-ops-sync.mjs';
import { applyClinicalDbUnlockCompletion } from './db-unlock-completion.mjs';

describe('db-unlock-completion', () => {
  let prevWindow;
  let prevDocument;

  beforeEach(() => {
    prevWindow = globalThis.window;
    prevDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.window = prevWindow;
    globalThis.document = prevDocument;
  });

  it('retries a clinicalOps merge deferred earlier by DB_LOCKED on the next unlock', async () => {
    let mergeCalls = 0;
    const api = {
      dbClinicalLoadAll: () => {},
      dbClinicalOpsMerge: async () => {
        mergeCalls += 1;
        return mergeCalls === 1 ? { code: 'DB_LOCKED' } : { ok: true, mergeStats: { usersInserted: 1 } };
      },
    };
    globalThis.window = { electronAPI: api, rplusDb: api };
    globalThis.document = { dispatchEvent() {} };

    const deferred = await applyClinicalOpsSnapshot({ clinical_users: [{ user_id: 'u1' }] });
    assert.equal(deferred.deferred, true);
    assert.equal(mergeCalls, 1, 'first merge attempt deferred, not applied');

    await applyClinicalDbUnlockCompletion({ refreshOnboarding: false });

    assert.equal(mergeCalls, 2, 'unlock completion retried the deferred snapshot');
  });
});
