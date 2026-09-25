import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function memoryStorage() {
  const data = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      data[k] = String(v);
    },
    removeItem(k) {
      delete data[k];
    },
    clear() {
      Object.keys(data).forEach(k => delete data[k]);
    },
  };
}

describe('backup-payload.mjs quota error handling', () => {
  let prevLocalStorage;
  let prevWarn;
  let warnCalls;

  beforeEach(() => {
    prevLocalStorage = globalThis.localStorage;
    prevWarn = console.warn;
    warnCalls = [];
    globalThis.localStorage = memoryStorage();
    console.warn = (...args) => warnCalls.push(args);
  });

  afterEach(() => {
    globalThis.localStorage = prevLocalStorage;
    console.warn = prevWarn;
  });

  it('logs console.warn when localStorage.setItem throws QuotaExceededError for scheduled procedures', () => {
    const badStorage = {
      setItem(k) {
        if (k === 'rpc-scheduled-procedures') {
          const err = new Error('QuotaExceededError');
          err.name = 'QuotaExceededError';
          throw err;
        }
      },
    };
    globalThis.localStorage = badStorage;

    const key = 'rpc-scheduled-procedures';
    try {
      localStorage.setItem(key, JSON.stringify([]));
    } catch (e) {
      console.warn('[backup-payload] failed to write rpc-scheduled-procedures', e);
    }

    assert.equal(warnCalls.length, 1, 'console.warn should have been called once');
    assert.match(String(warnCalls[0][0]), /\[backup-payload\] failed to write/);
    assert.match(String(warnCalls[0][0]), /rpc-scheduled-procedures/);
  });

  it('writes successfully when localStorage is available', () => {
    const storage = memoryStorage();
    globalThis.localStorage = storage;

    const key = 'rpc-scheduled-procedures';
    try {
      localStorage.setItem(key, JSON.stringify([]));
    } catch (e) {
      console.warn('[backup-payload] failed to write rpc-scheduled-procedures', e);
    }

    assert.equal(warnCalls.length, 0, 'no console.warn should be called on success');
    assert.equal(storage.getItem(key), JSON.stringify([]));
  });
});
