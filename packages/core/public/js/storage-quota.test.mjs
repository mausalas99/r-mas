import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateJsonBytes,
  estimateRpcPersistBytes,
  assessStoragePressure,
  STORAGE_WARN_RATIO,
  STORAGE_BLOCK_RATIO,
  FALLBACK_LOCAL_STORAGE_QUOTA,
  LOCAL_STORAGE_WARN_BYTES,
  warnIfLocalStorageNearFull,
  __resetLocalStorageWarnForTests,
} from './storage-quota.mjs';

describe('storage-quota', () => {
  it('estimateJsonBytes returns positive size for object', () => {
    assert.ok(estimateJsonBytes({ a: 1, b: 'x' }) > 0);
  });

  it('assessStoragePressure blocks near quota', () => {
    var quota = FALLBACK_LOCAL_STORAGE_QUOTA;
    var level = assessStoragePressure(quota * STORAGE_BLOCK_RATIO, { usage: 0, quota });
    assert.strictEqual(level, 'block');
  });

  it('assessStoragePressure warns before block', () => {
    var quota = FALLBACK_LOCAL_STORAGE_QUOTA;
    var level = assessStoragePressure(quota * STORAGE_WARN_RATIO, { usage: 0, quota });
    assert.strictEqual(level, 'warn');
  });

  it('estimateRpcPersistBytes sums payload parts', () => {
    var n = estimateRpcPersistBytes({
      patients: [{ id: 'p1' }],
      notes: { p1: { estudios: 'x' } },
      indicaciones: {},
      labHistory: { p1: [{ id: 's1', resLabs: ['a'] }] },
      medRecetaByPatient: {},
    });
    assert.ok(n > estimateJsonBytes([{ id: 'p1' }]));
  });
});

describe('warnIfLocalStorageNearFull', () => {
  let prevLocalStorage;
  let prevWindow;
  let prevWarn;
  let warnCalls;
  let toastCalls;

  beforeEach(() => {
    __resetLocalStorageWarnForTests();
    prevLocalStorage = globalThis.localStorage;
    prevWindow = globalThis.window;
    prevWarn = console.warn;
    warnCalls = [];
    toastCalls = [];
    console.warn = (...args) => warnCalls.push(args);
    globalThis.window = { showToast: (...args) => toastCalls.push(args) };
  });

  afterEach(() => {
    __resetLocalStorageWarnForTests();
    globalThis.localStorage = prevLocalStorage;
    globalThis.window = prevWindow;
    console.warn = prevWarn;
  });

  it('warns and toasts once when localStorage is near the threshold', () => {
    var big = 'x'.repeat(LOCAL_STORAGE_WARN_BYTES);
    globalThis.localStorage = { big: big };
    warnIfLocalStorageNearFull();
    assert.equal(warnCalls.length, 1);
    assert.equal(toastCalls.length, 1);
    assert.match(String(toastCalls[0][0]), /Almacenamiento local casi lleno/);

    warnIfLocalStorageNearFull();
    assert.equal(warnCalls.length, 1, 'should not warn twice in the same session');
    assert.equal(toastCalls.length, 1);
  });

  it('does not warn when localStorage is small', () => {
    globalThis.localStorage = { theme: 'dark' };
    warnIfLocalStorageNearFull();
    assert.equal(warnCalls.length, 0);
    assert.equal(toastCalls.length, 0);
  });
});
