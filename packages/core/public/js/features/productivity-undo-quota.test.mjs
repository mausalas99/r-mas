import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { saveUndoStack } from './productivity.mjs';

// The undo stack lives in IndexedDB (not localStorage) so a full-census
// snapshot can't exhaust the small quota localStorage shares with cloud sync
// and the audit log. IndexedDB isn't available under `test:one`'s headless
// Electron-as-node runner, so these run for real only inside the app.
async function readStoredUndoStack() {
  var db = await new Promise((resolve, reject) => {
    var req = indexedDB.open('rplus-undo', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return new Promise((resolve, reject) => {
    var r = db.transaction('stack', 'readonly').objectStore('stack').get('current');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

describe('productivity undo stack (IndexedDB)', () => {
  it('saveUndoStack writes to IndexedDB, not localStorage', async () => {
    if (typeof indexedDB === 'undefined') return;
    var prevLs = globalThis.localStorage;
    globalThis.localStorage = {
      getItem() { return null; },
      setItem() { throw new Error('saveUndoStack must not touch localStorage'); },
      removeItem() {},
    };
    try {
      await saveUndoStack([{ label: 'op1', data: { patients: [] } }]);
      var stored = await readStoredUndoStack();
      assert.equal(stored.length, 1);
      assert.equal(stored[0].label, 'op1');
    } finally {
      globalThis.localStorage = prevLs;
    }
  });

  it('saving an empty stack clears the IndexedDB entry', async () => {
    if (typeof indexedDB === 'undefined') return;
    await saveUndoStack([{ label: 'stale', data: {} }]);
    await saveUndoStack([]);
    var stored = await readStoredUndoStack();
    assert.equal(stored, undefined);
  });
});
