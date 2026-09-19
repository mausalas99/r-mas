import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAN_RETIRE_FLAG,
  runLanConfigRetireIfNeeded,
} from './nube-config-retire.mjs';

function createMockStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    _map: map,
  };
}

describe('nube-config-retire', () => {
  let storage;
  let toasts;

  beforeEach(() => {
    storage = createMockStorage({
      'rpc-lan-config': '{"host":"192.168.1.1"}',
      'lan-ui-role': 'host',
      'rpc-lan-pinned-host': 'ward-mac',
      'lan-guest-bearer': 'token',
    });
    toasts = [];
  });

  it('clears stale LAN keys, sets flag, and runs once', () => {
    const result = runLanConfigRetireIfNeeded({
      storage,
      showToast: (msg) => toasts.push(msg),
      now: () => 1_700_000_000_000,
    });

    assert.equal(result.didRun, true);
    assert.equal(storage.getItem('rpc-lan-config'), null);
    assert.equal(storage.getItem('lan-ui-role'), null);
    assert.equal(storage.getItem('rpc-lan-pinned-host'), null);
    assert.equal(storage.getItem('lan-guest-bearer'), null);
    assert.equal(storage.getItem(LAN_RETIRE_FLAG), '1700000000000');
    assert.deepEqual(toasts, ['Conexión actualizada a solo Nube.']);

    const second = runLanConfigRetireIfNeeded({
      storage,
      showToast: (msg) => toasts.push(msg),
    });
    assert.equal(second.didRun, false);
    assert.deepEqual(toasts, ['Conexión actualizada a solo Nube.']);
  });
});
