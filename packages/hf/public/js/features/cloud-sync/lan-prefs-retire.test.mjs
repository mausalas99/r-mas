import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAN_PREFS_RETIRE_FLAG,
  runLanPrefsRetireIfNeeded,
  LAN_PREFS_RETIRE_KEYS,
} from './lan-prefs-retire.mjs';

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

describe('lan-prefs-retire', () => {
  let storage;

  beforeEach(() => {
    storage = createMockStorage({
      'rpc-lan-shift-pin': '123456',
      'rpc-lan-ui-role': 'host',
      'rpc-lan-hide-disconnect-banner': '1',
      'rpc-lan-lww-overwrite-toast': '0',
      'rpc-room-membership': '{"roomId":"keep"}',
    });
  });

  it('exports the prefs keys to clear', () => {
    assert.deepEqual(
      [...LAN_PREFS_RETIRE_KEYS].sort(),
      [
        'rpc-lan-hide-disconnect-banner',
        'rpc-lan-lww-overwrite-toast',
        'rpc-lan-shift-pin',
        'rpc-lan-ui-role',
      ].sort(),
    );
  });

  it('clears retired LAN prefs once and leaves unrelated keys', () => {
    const result = runLanPrefsRetireIfNeeded({
      storage,
      now: () => 1_700_000_000_100,
    });

    assert.equal(result.didRun, true);
    assert.equal(storage.getItem('rpc-lan-shift-pin'), null);
    assert.equal(storage.getItem('rpc-lan-ui-role'), null);
    assert.equal(storage.getItem('rpc-lan-hide-disconnect-banner'), null);
    assert.equal(storage.getItem('rpc-lan-lww-overwrite-toast'), null);
    assert.equal(storage.getItem('rpc-room-membership'), '{"roomId":"keep"}');
    assert.equal(storage.getItem(LAN_PREFS_RETIRE_FLAG), '1700000000100');

    const second = runLanPrefsRetireIfNeeded({ storage });
    assert.equal(second.didRun, false);
  });
});
