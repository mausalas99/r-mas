import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { safeLocalStorageSet, writeTodosMap } from './storage-core.mjs';

function quotaError() {
  const err = new Error('The quota has been exceeded.');
  err.name = 'QuotaExceededError';
  return err;
}

describe('storage-core localStorage quota logging', () => {
  let prevLocalStorage;
  let prevWarn;
  let warnCalls;

  beforeEach(() => {
    prevLocalStorage = globalThis.localStorage;
    prevWarn = console.warn;
    warnCalls = [];
    console.warn = (...args) => warnCalls.push(args);
  });

  afterEach(() => {
    globalThis.localStorage = prevLocalStorage;
    console.warn = prevWarn;
  });

  it('safeLocalStorageSet warns and returns false on quota exceeded', () => {
    globalThis.localStorage = {
      setItem() {
        throw quotaError();
      },
    };
    const ok = safeLocalStorageSet('rpc-todos', '{}');
    assert.equal(ok, false);
    assert.equal(warnCalls.length, 1);
    assert.match(warnCalls[0].join(' '), /rpc-todos/);
  });

  it('safeLocalStorageSet rethrows non-quota errors without warning', () => {
    globalThis.localStorage = {
      setItem() {
        throw new Error('boom');
      },
    };
    assert.throws(() => safeLocalStorageSet('rpc-todos', '{}'), /boom/);
    assert.equal(warnCalls.length, 0);
  });

  it('writeTodosMap routes through safeLocalStorageSet and does not throw on quota exceeded', () => {
    globalThis.localStorage = {
      setItem() {
        throw quotaError();
      },
      getItem() {
        return null;
      },
    };
    assert.doesNotThrow(() => writeTodosMap({ t1: { id: 't1' } }));
    assert.equal(warnCalls.length, 1);
    assert.match(warnCalls[0].join(' '), /rpc-todos/);
  });
});
