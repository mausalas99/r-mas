import test from 'node:test';
import assert from 'node:assert/strict';
import { sweepDeadLocalStorageKeys, DEAD_LOCAL_STORAGE_KEYS } from './legacy-ls-sweep.mjs';

test('removes every dead key and keeps the rest', () => {
  const store = new Map([...DEAD_LOCAL_STORAGE_KEYS, 'theme', 'rpc-audit-log'].map((k) => [k, 'x']));
  sweepDeadLocalStorageKeys({ removeItem: (k) => store.delete(k) });
  assert.deepEqual([...store.keys()], ['theme', 'rpc-audit-log']);
});

test('keeps going when one removal throws, and when storage is missing', () => {
  const seen = [];
  sweepDeadLocalStorageKeys({
    removeItem: (k) => {
      seen.push(k);
      throw new Error('denied');
    },
  });
  assert.equal(seen.length, DEAD_LOCAL_STORAGE_KEYS.length);
  assert.doesNotThrow(() => sweepDeadLocalStorageKeys(undefined));
});
