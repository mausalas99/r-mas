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

describe('release-notes-close.mjs quota error handling', () => {
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

  it('logs console.warn when localStorage.setItem throws QuotaExceededError for release notes seen', () => {
    const badStorage = {
      setItem(k) {
        if (k.startsWith('rpc-release-notes-seen-')) {
          const err = new Error('QuotaExceededError');
          err.name = 'QuotaExceededError';
          throw err;
        }
      },
    };
    globalThis.localStorage = badStorage;

    const RELEASE_NOTES_SEEN_PREFIX = 'rpc-release-notes-seen-';
    const v = '8.2.5';
    const key = RELEASE_NOTES_SEEN_PREFIX + v;
    try {
      localStorage.setItem(key, '1');
    } catch (e) {
      console.warn('[release-notes-close] failed to write ' + RELEASE_NOTES_SEEN_PREFIX + v, e);
    }

    assert.equal(warnCalls.length, 1, 'console.warn should have been called once');
    assert.match(String(warnCalls[0][0]), /\[release-notes-close\] failed to write/);
    assert.match(String(warnCalls[0][0]), /rpc-release-notes-seen-/);
  });

  it('writes successfully when localStorage is available', () => {
    const storage = memoryStorage();
    globalThis.localStorage = storage;

    const RELEASE_NOTES_SEEN_PREFIX = 'rpc-release-notes-seen-';
    const v = '8.2.5';
    const key = RELEASE_NOTES_SEEN_PREFIX + v;
    try {
      localStorage.setItem(key, '1');
    } catch (e) {
      console.warn('[release-notes-close] failed to write ' + RELEASE_NOTES_SEEN_PREFIX + v, e);
    }

    assert.equal(warnCalls.length, 0, 'no console.warn should be called on success');
    assert.equal(storage.getItem(key), '1');
  });
});
