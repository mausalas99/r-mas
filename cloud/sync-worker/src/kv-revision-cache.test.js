import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCachedRoomRevision,
  isKvPutQuotaError,
  isKvWriteBlocked,
  setCachedRoomRevision,
} from './kv-revision-cache.mjs';

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

  it('skips put when revision unchanged', async () => {
    let puts = 0;
    const kv = {
      async get(key) {
        return key === 'rev:room-1' ? '42' : null;
      },
      async put() {
        puts += 1;
      },
    };
    await setCachedRoomRevision(kv, 'room-1', 42);
    assert.equal(puts, 0);
  });

  it('detects KV quota errors', () => {
    assert.equal(isKvPutQuotaError(new Error('KV put() limit exceeded for the day.')), true);
    assert.equal(isKvPutQuotaError(new Error('network')), false);
  });

  it('pivots to D1 path after quota error (blocks further puts)', async () => {
    let puts = 0;
    const kv = {
      async get() {
        return null;
      },
      async put() {
        puts += 1;
        throw new Error('KV put() limit exceeded for the day.');
      },
    };
    await setCachedRoomRevision(kv, 'room-1', 3);
    assert.equal(puts, 1);
    assert.equal(isKvWriteBlocked(), true);
    await setCachedRoomRevision(kv, 'room-1', 4);
    assert.equal(puts, 1);
  });

  it('get returns null when KV read fails', async () => {
    const kv = {
      async get() {
        throw new Error('kv down');
      },
    };
    assert.equal(await getCachedRoomRevision(kv, 'room-1'), null);
  });
});
