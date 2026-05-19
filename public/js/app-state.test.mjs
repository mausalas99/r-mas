import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let store = {};
const mockStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});
globalThis.window = { localStorage: mockStorage };

const { storage } = await import('./storage.js');
const appState = await import('./app-state.mjs');

describe('app-state', () => {
  beforeEach(() => {
    store = {};
    appState.setSaveStateHooks({ before: null, after: null });
    appState.initAppState();
  });

  it('initAppState loads patients from storage', () => {
    storage.savePatients([{ id: 'p1', name: 'Ana' }]);
    appState.initAppState();
    assert.strictEqual(appState.patients.length, 1);
    assert.strictEqual(appState.patients[0].id, 'p1');
  });

  it('saveState calls storage.saveAll', () => {
    let calls = 0;
    const orig = storage.saveAll.bind(storage);
    storage.saveAll = (...args) => {
      calls += 1;
      return orig(...args);
    };
    appState.setPatients([{ id: 'p1', name: 'Test' }]);
    appState.saveState();
    assert.strictEqual(calls, 1);
    storage.saveAll = orig;
  });

  it('saveState runs after hook', () => {
    let ran = false;
    appState.setSaveStateHooks({ after() { ran = true; } });
    appState.saveState();
    assert.strictEqual(ran, true);
  });
});
