import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  maybeMarkCloudSalaUpgrade,
  isCloudSalaUpgradePending,
  clearCloudSalaUpgradePending,
  setCloudSalaUpgradePending,
} from './cloud-sala-upgrade.mjs';

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
