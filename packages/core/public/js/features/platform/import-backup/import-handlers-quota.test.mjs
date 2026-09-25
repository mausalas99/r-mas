import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writePreimportBackup } from './preimport.mjs';

// The pre-import backup moved to IndexedDB (same rationale as the undo stack
// in productivity.mjs) so a full-census snapshot can't exhaust the small
// quota localStorage shares with cloud sync and the audit log. IndexedDB
// isn't available under `test:one`'s headless Electron-as-node runner, so
// this runs for real only inside the app.
describe('import-handlers.mjs pre-import backup (IndexedDB)', () => {
  it('writePreimportBackup writes to IndexedDB, not localStorage', async () => {
    if (typeof indexedDB === 'undefined') return;
    var prevLs = globalThis.localStorage;
    globalThis.localStorage = {
      getItem() { return null; },
      setItem() { throw new Error('writePreimportBackup must not touch localStorage'); },
      removeItem() {},
    };
    try {
      var payload = { format: 'r-plus-backup', version: 1, data: { patients: [{ id: 'p1' }] } };
      await writePreimportBackup(payload);
      var db = await new Promise((resolve, reject) => {
        var req = indexedDB.open('rplus-undo', 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      var stored = await new Promise((resolve, reject) => {
        var r = db.transaction('stack', 'readonly').objectStore('stack').get('preimport');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      assert.equal(stored.data.patients.length, 1);
    } finally {
      globalThis.localStorage = prevLs;
    }
  });

  it('logs console.warn when the IndexedDB write fails', async () => {
    if (typeof indexedDB === 'undefined') return;
    var prevWarn = console.warn;
    var warnCalls = [];
    console.warn = (...args) => warnCalls.push(args);
    var prevIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = {
      open() {
        var req = { onupgradeneeded: null, onsuccess: null, onerror: null };
        setTimeout(() => {
          req.error = new Error('boom');
          if (req.onerror) req.onerror();
        }, 0);
        return req;
      },
    };
    try {
      await writePreimportBackup({ format: 'r-plus-backup', version: 1, data: {} });
      assert.equal(warnCalls.length, 1);
      assert.match(String(warnCalls[0][0]), /\[preimport\] failed to write/);
    } finally {
      console.warn = prevWarn;
      globalThis.indexedDB = prevIndexedDB;
    }
  });
});
