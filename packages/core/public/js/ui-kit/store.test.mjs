import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from './store.mjs';

test('get, set and subscribe: listeners fire on change only, unsubscribe stops them', () => {
  const s = createStore(1);
  const seen = [];
  const off = s.subscribe((v) => seen.push(v));
  s.set(2);
  s.set(2);
  s.set((n) => n + 1);
  off();
  s.set(9);
  assert.deepEqual(seen, [2, 3]);
  assert.equal(s.get(), 9);
});
