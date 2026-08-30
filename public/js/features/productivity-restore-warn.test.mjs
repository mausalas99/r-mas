import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { undoLastOperation } from './productivity.mjs';

function memoryStorageThrowingOn(key) {
  const data = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      if (k === key) {
        const err = new Error('quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      }
      data[k] = String(v);
    },
    removeItem(k) {
      delete data[k];
    },
  };
}

describe('productivity.mjs undoLastOperation quota warning', () => {
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

  it('warns instead of silently swallowing when restoring rpc-scheduled-procedures hits quota', async () => {
    if (typeof document === 'undefined') return;
    globalThis.localStorage = memoryStorageThrowingOn('rpc-scheduled-procedures');
    localStorage.setItem(
      'rpc-undo-stack',
      JSON.stringify([{ label: 'op', data: { scheduledProcedures: [{ id: 'p1' }] } }])
    );

    const p = undoLastOperation();
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    document.querySelector('[data-wb-confirm-ok]').click();
    await p;

    assert.equal(warnCalls.length, 1, 'expected exactly one console.warn for the quota failure');
    assert.match(warnCalls[0].join(' '), /rpc-scheduled-procedures/);
  });
});
