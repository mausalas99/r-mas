/** Generic key-value helpers over one IndexedDB object store per database. */

export function openKvDb(dbName, storeName) {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = function () {
      req.result.createObjectStore(storeName);
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error);
    };
  });
}

export function idbGet(db, storeName, key) {
  return new Promise(function (resolve, reject) {
    var req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      reject(req.error);
    };
  });
}

export function idbPut(db, storeName, key, value) {
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = function () {
      resolve();
    };
    tx.onerror = function () {
      reject(tx.error);
    };
  });
}

export function idbDelete(db, storeName, key) {
  return new Promise(function (resolve, reject) {
    var tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = function () {
      resolve();
    };
    tx.onerror = function () {
      reject(tx.error);
    };
  });
}
