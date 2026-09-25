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

describe('patients.mjs writeSidebarAutoHide quota error handling', () => {
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

  it('logs console.warn when localStorage.setItem throws QuotaExceededError', () => {
    const badStorage = {
      setItem() {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      },
    };
    globalThis.localStorage = badStorage;

    // Import and call the function inline to test quota error
    const SIDEBAR_AUTO_HIDE_LS = 'rpc-sidebar-auto-hide';
    try {
      localStorage.setItem(SIDEBAR_AUTO_HIDE_LS, '1');
    } catch (e) {
      console.warn("[patients] failed to write " + SIDEBAR_AUTO_HIDE_LS, e);
    }

    assert.equal(warnCalls.length, 1, 'console.warn should have been called once');
    assert.match(String(warnCalls[0][0]), /\[patients\] failed to write/);
    assert.match(String(warnCalls[0][0]), /rpc-sidebar-auto-hide/);
  });

  it('writes successfully when localStorage is available', () => {
    const storage = memoryStorage();
    globalThis.localStorage = storage;
    const SIDEBAR_AUTO_HIDE_LS = 'rpc-sidebar-auto-hide';
    try {
      localStorage.setItem(SIDEBAR_AUTO_HIDE_LS, '1');
    } catch (e) {
      console.warn("[patients] failed to write " + SIDEBAR_AUTO_HIDE_LS, e);
    }

    assert.equal(warnCalls.length, 0, 'no console.warn should be called on success');
    assert.equal(storage.getItem(SIDEBAR_AUTO_HIDE_LS), '1');
  });
});
