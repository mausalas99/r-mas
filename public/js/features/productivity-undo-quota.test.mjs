import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saveUndoStack, healUndoStackQuota } from './productivity.mjs';

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

  it('saving an empty stack clears the key without a false quota warning', () => {
    const store = { 'rpc-undo-stack': '[{"label":"stale"}]' };
    const prev = globalThis.localStorage;
    globalThis.localStorage = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
      removeItem(k) {
        delete store[k];
      },
    };
    const prevWarn = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };
    try {
      saveUndoStack([]);
      assert.equal(store['rpc-undo-stack'], undefined);
      assert.equal(warned, false);
    } finally {
      console.warn = prevWarn;
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });

  it('healUndoStackQuota shrinks an already-oversized stack left over from before this fix', () => {
    const store = {};
    const QUOTA = 100;
    store['rpc-undo-stack'] = JSON.stringify([
      { label: 'huge-1', data: 'x'.repeat(60) },
      { label: 'huge-2', data: 'x'.repeat(60) },
    ]);
    const prev = globalThis.localStorage;
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
      healUndoStackQuota();
      const saved = JSON.parse(store['rpc-undo-stack']);
      assert.equal(saved.length, 1);
      assert.equal(saved[0].label, 'huge-1');
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });

  it('healUndoStackQuota does nothing when there is no stored stack', () => {
    const store = {};
    const prev = globalThis.localStorage;
    globalThis.localStorage = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
      removeItem(k) {
        delete store[k];
      },
    };
    try {
      healUndoStackQuota();
      assert.equal(store['rpc-undo-stack'], undefined);
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });
});
