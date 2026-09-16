/**
 * Backs a cloud-sync fingerprint/echo index with IndexedDB instead of localStorage,
 * without forcing every caller to become async. These indexes are read synchronously
 * in tight push/pull loops, so `read()` always returns the last-known in-memory value
 * immediately; `write()` updates that value immediately and persists to IndexedDB in
 * the background. Worst case on a cold-start race (read before the initial load
 * resolves) is a false miss — one extra resend of already-synced data, never a
 * wrongly-skipped push.
 *
 * `test:one` runs Electron as plain Node, which has no `indexedDB` global. There, this
 * degrades to a pure in-memory store (no persistence) so existing logic tests keep
 * running unguarded.
 */

const DB_NAME = 'rplus-cloud-sync-idx';
const STORE = 'indexes';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

/**
 * @param {string} key record key within the shared `rplus-cloud-sync-idx` database
 * @param {() => unknown} makeDefault called for the empty/not-yet-loaded value
 */
export function createIdbBackedSlot(key, makeDefault) {
  let cache = makeDefault();
  let loaded = typeof indexedDB === 'undefined'; // no indexedDB -> memory-only, already "loaded"

  if (!loaded) {
    openDb()
      .then((db) => idbGet(db, key))
      .then((v) => {
        cache = v !== undefined ? v : makeDefault();
      })
      .catch(() => {
        cache = makeDefault();
      })
      .finally(() => {
        loaded = true;
      });
  }

  return {
    read() {
      return cache;
    },
    write(value) {
      cache = value;
      loaded = true;
      if (typeof indexedDB === 'undefined') return;
      openDb()
        .then((db) => idbPut(db, key, value))
        .catch((e) => console.warn('[idb-index-store] failed to persist ' + key, e));
    },
    /** Test-only: force the in-memory state back to empty. */
    resetForTests() {
      cache = makeDefault();
      loaded = true;
    },
  };
}
