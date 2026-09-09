import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  wasCloudOpAlreadyAttempted,
  noteCloudOpsAttempted,
  clearCloudSyncEchoGuard,
} from './cloud-sync-echo-guard.mjs';

describe('cloud-sync-echo-guard', () => {
  const prev = globalThis.localStorage;

  beforeEach(() => {
    globalThis.localStorage = {
      store: {},
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      },
    };
  });

  afterEach(() => {
    if (prev) globalThis.localStorage = prev;
    else delete globalThis.localStorage;
  });

  it('has never attempted an op before it is noted', () => {
    assert.equal(wasCloudOpAlreadyAttempted({ path: 'entries/p1/fields', updatedAt: 't1' }), false);
  });

  it('skips an exact repeat of a (path, updatedAt) already noted', () => {
    noteCloudOpsAttempted([{ path: 'entries/p1/fields', updatedAt: 't1' }]);
    assert.equal(wasCloudOpAlreadyAttempted({ path: 'entries/p1/fields', updatedAt: 't1' }), true);
  });

  it('does not skip a genuinely new updatedAt on the same path (a real edit)', () => {
    noteCloudOpsAttempted([{ path: 'entries/p1/fields', updatedAt: 't1' }]);
    assert.equal(wasCloudOpAlreadyAttempted({ path: 'entries/p1/fields', updatedAt: 't2' }), false);
  });

  it('never skips an op missing a path or updatedAt', () => {
    assert.equal(wasCloudOpAlreadyAttempted({ path: '', updatedAt: 't1' }), false);
    assert.equal(wasCloudOpAlreadyAttempted({ path: 'entries/p1/fields', updatedAt: '' }), false);
  });

  it('clearCloudSyncEchoGuard forgets everything noted', () => {
    noteCloudOpsAttempted([{ path: 'entries/p1/fields', updatedAt: 't1' }]);
    clearCloudSyncEchoGuard();
    assert.equal(wasCloudOpAlreadyAttempted({ path: 'entries/p1/fields', updatedAt: 't1' }), false);
  });
});
