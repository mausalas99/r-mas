import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setCutoverFlag, getCutoverFlag } from './cutover-flags.mjs';

describe('cutover-flags localStorage quota handling', () => {
  let store = {};
  const prev = globalThis.localStorage;

  beforeEach(() => {
    store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
  });

  afterEach(() => {
    if (prev) globalThis.localStorage = prev;
    else delete globalThis.localStorage;
  });

  it('logs console.warn when setCutoverFlag exceeds quota', () => {
    let warned = null;
    const prevWarn = console.warn;
    console.warn = (msg, err) => { warned = { msg, err }; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      setCutoverFlag('pending');
    } finally {
      console.warn = prevWarn;
    }
    assert.ok(warned, 'console.warn should be called on quota error');
    assert.match(warned.msg, /rpc-settings/);
  });
});
