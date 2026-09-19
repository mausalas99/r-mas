import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openKvDb, idbGet, idbPut, idbDelete } from './idb-kv.mjs';

// IndexedDB isn't available under `test:one`'s headless Electron-as-node
// runner, so this runs for real only inside the app.
describe('idb-kv', () => {
  it('put/get/delete round-trip through one object store', async () => {
    if (typeof indexedDB === 'undefined') return;
    var db = await openKvDb('idb-kv-test-db', 'kv');
    await idbPut(db, 'kv', 'a', { x: 1 });
    assert.deepEqual(await idbGet(db, 'kv', 'a'), { x: 1 });
    await idbDelete(db, 'kv', 'a');
    assert.equal(await idbGet(db, 'kv', 'a'), undefined);
  });
});
