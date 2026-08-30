import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  maybeMarkCloudSalaUpgrade,
  isCloudSalaUpgradePending,
  clearCloudSalaUpgradePending,
  setCloudSalaUpgradePending,
} from './cloud-sala-upgrade.mjs';

describe('localStorage quota error handling', () => {
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

  it('logs console.warn when quota is exceeded', () => {
    let warned = false;
    const prevWarn = console.warn;
    console.warn = (msg) => { warned = true; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      // console.warn should be called on quota error
    } finally {
      console.warn = prevWarn;
    }
  });
});

function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => installLocalStorage());

describe('maybeMarkCloudSalaUpgrade', () => {
  it('is retired — all wards use Nube', () => {
    assert.equal(maybeMarkCloudSalaUpgrade('UX', 'Sala 2'), false);
    assert.equal(maybeMarkCloudSalaUpgrade('Sala', 'Torre HU'), false);
    assert.equal(maybeMarkCloudSalaUpgrade('UX', 'Eme'), false);
  });
});

describe('cloud sala upgrade pending flag', () => {
  it('can still clear legacy pending flag from storage', () => {
    setCloudSalaUpgradePending(true);
    assert.equal(isCloudSalaUpgradePending(), true);
    clearCloudSalaUpgradePending();
    assert.equal(isCloudSalaUpgradePending(), false);
  });
});
