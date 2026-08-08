import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCachedRoomRevision, setCachedRoomRevision } from './kv-revision-cache.mjs';

function createKvStore() {
  /** @type {Map<string, string>} */
  const data = new Map();
  return {
    async get(key) {
      return data.get(key) ?? null;
    },
    async put(key, value) {
      data.set(key, value);
    },
  };
}

describe('kv-revision-cache', () => {
  it('stores and reads revision hints', async () => {
    const kv = createKvStore();
    await setCachedRoomRevision(kv, 'room-1', 42);
    assert.equal(await getCachedRoomRevision(kv, 'room-1'), 42);
    assert.equal(await getCachedRoomRevision(kv, 'missing'), null);
  });

  it('ignores invalid revisions', async () => {
    const kv = createKvStore();
    await setCachedRoomRevision(kv, 'room-1', 0);
    assert.equal(await getCachedRoomRevision(kv, 'room-1'), null);
  });
});
