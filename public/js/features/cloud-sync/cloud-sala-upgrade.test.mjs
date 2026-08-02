import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  maybeMarkCloudSalaUpgrade,
  isCloudSalaUpgradePending,
  clearCloudSalaUpgradePending,
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
  it('marks pending when moving from UX to Sala', () => {
    assert.equal(maybeMarkCloudSalaUpgrade('UX', 'Sala 2'), true);
    assert.equal(isCloudSalaUpgradePending(), true);
    clearCloudSalaUpgradePending();
    assert.equal(isCloudSalaUpgradePending(), false);
  });

  it('ignores same-tier moves', () => {
    assert.equal(maybeMarkCloudSalaUpgrade('Sala', 'Torre HU'), false);
    assert.equal(maybeMarkCloudSalaUpgrade('UX', 'Eme'), false);
  });
});
