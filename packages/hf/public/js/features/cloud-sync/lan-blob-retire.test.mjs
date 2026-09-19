import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  LAN_BLOB_RETIRE_FLAG,
  runLanBlobRetireIfNeeded,
} from './lan-blob-retire.mjs';

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

describe('lan-blob-retire', () => {
  /** @type {ReturnType<typeof createMockStorage>} */
  let storage;
  /** @type {string[][]} */
  let pruned;

  beforeEach(() => {
    storage = createMockStorage({
      'rpc-lan-room-snapshots': '{"room-1":{}}',
      'rpc-lan-host-patient-map': '{"p1":"host"}',
    });
    pruned = [];
  });

  it('clears snapshot keys once and prunes DB blobs', async () => {
    const result = await runLanBlobRetireIfNeeded({
      storage,
      pruneDbBlobs: async (keys) => {
        pruned.push(keys);
      },
      now: () => 1_700_000_000_100,
    });
    assert.equal(result.didRun, true);
    assert.equal(storage.getItem('rpc-lan-room-snapshots'), null);
    assert.equal(storage.getItem('rpc-lan-host-patient-map'), null);
    assert.equal(storage.getItem(LAN_BLOB_RETIRE_FLAG), '1700000000100');
    assert.deepEqual(pruned, [['lanRoomSnapshots', 'lanHostPatientMap']]);

    const second = await runLanBlobRetireIfNeeded({
      storage,
      pruneDbBlobs: async (keys) => {
        pruned.push(keys);
      },
    });
    assert.equal(second.didRun, false);
    assert.equal(pruned.length, 1);
  });
});
