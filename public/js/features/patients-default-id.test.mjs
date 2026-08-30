import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickDefaultPatientId,
  readLastSelectedPatientId,
  writeLastSelectedPatientId,
} from './patients-default-id.mjs';

const pinned = { id: 'pin-1', pinned: true, archived: false };
const other = { id: 'act-1', pinned: false, archived: false };
const archived = { id: 'arc-1', pinned: false, archived: true };

describe('pickDefaultPatientId', () => {
  it('returns null when the sidebar is empty', () => {
    assert.equal(pickDefaultPatientId([], 'x', 'pin-1'), null);
    assert.equal(pickDefaultPatientId(null, 'x', 'pin-1'), null);
  });

  it('keeps the already-active patient when still visible', () => {
    assert.equal(pickDefaultPatientId([other, pinned], 'act-1', 'pin-1'), 'act-1');
  });

  it('restores the last selected patient when still visible', () => {
    assert.equal(pickDefaultPatientId([other, pinned], null, 'pin-1'), 'pin-1');
  });

  it('falls back to the first pinned patient', () => {
    assert.equal(pickDefaultPatientId([other, pinned], null, 'gone'), 'pin-1');
  });

  it('skips archived when picking a fallback', () => {
    assert.equal(pickDefaultPatientId([archived, other], null, ''), 'act-1');
  });
});

describe('last selected patient id', () => {
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

  it('round-trips a real patient id', () => {
    writeLastSelectedPatientId('p-9');
    assert.equal(readLastSelectedPatientId(), 'p-9');
  });

  it('does not persist demo patients', () => {
    writeLastSelectedPatientId('demo-tour');
    assert.equal(readLastSelectedPatientId(), '');
  });

  it('logs console.warn when localStorage quota is exceeded', () => {
    let warned = null;
    const prevWarn = console.warn;
    console.warn = (msg, err) => { warned = { msg, err }; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      writeLastSelectedPatientId('p-123');
    } finally {
      console.warn = prevWarn;
    }
    assert.ok(warned, 'console.warn should be called on quota error');
    assert.match(warned.msg, /failed to write rpc-last-patient-id/);
  });
});
