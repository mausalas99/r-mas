import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createIdbBackedSlot } from './idb-index-store.mjs';

// IndexedDB isn't available under `test:one`'s headless Electron-as-node runner
// (see idb-index-store.mjs's own doc comment) — these run for real only inside the app.
describe('createIdbBackedSlot', () => {
  it('clears the pre-migration localStorage key once IndexedDB takes over', async () => {
    if (typeof indexedDB === 'undefined') return;
    var prevLs = globalThis.localStorage;
    var removed = [];
    globalThis.localStorage = {
      getItem() { return null; },
      setItem() {},
      removeItem(k) { removed.push(k); },
    };
    try {
      var slot = createIdbBackedSlot('test-legacy-key', () => ({}));
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.ok(removed.includes('test-legacy-key'));
      assert.deepEqual(slot.read(), {});
    } finally {
      globalThis.localStorage = prevLs;
    }
  });

  it('read/write still round-trips through IndexedDB after the clear', async () => {
    if (typeof indexedDB === 'undefined') return;
    var slot = createIdbBackedSlot('test-roundtrip-key', () => ({}));
    slot.write({ a: 1 });
    assert.deepEqual(slot.read(), { a: 1 });
  });
});
