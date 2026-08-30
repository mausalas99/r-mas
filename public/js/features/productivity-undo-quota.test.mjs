import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saveUndoStack } from './productivity.mjs';

describe('productivity undo stack quota handling', () => {
  it('drops oldest snapshots and keeps writing instead of failing silently forever', () => {
    const store = {};
    const prev = globalThis.localStorage;
    const QUOTA = 100;
    globalThis.localStorage = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        if (v.length > QUOTA) {
          const err = new Error('quota exceeded');
          err.name = 'QuotaExceededError';
          throw err;
        }
        store[k] = v;
      },
      removeItem(k) {
        delete store[k];
      },
    };
    try {
      const bigStack = [
        { label: 'newest', data: 'x'.repeat(60) },
        { label: 'older', data: 'x'.repeat(60) },
        { label: 'oldest', data: 'x'.repeat(60) },
      ];
      saveUndoStack(bigStack);
      const saved = JSON.parse(store['rpc-undo-stack']);
      assert.equal(saved.length, 1);
      assert.equal(saved[0].label, 'newest');
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });
});
