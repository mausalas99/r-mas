/**
 * P5 gate: clinical localStorage keys are not written on desktop DB / skip path.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let store = {};
const mockStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

const CLINICAL_LS_KEYS = [
  'rpc-patients',
  'rpc-notes',
  'rpc-indicaciones',
  'rpc-labHistory',
  'rpc-medRecetaByPatient',
];

describe('storage prefs-only — clinical LS keys', () => {
  /** @type {Record<string, string>} */
  let ipcBlobs;

  beforeEach(async () => {
    store = {};
    ipcBlobs = {
      patients: JSON.stringify([]),
      notes: JSON.stringify({}),
    };
    globalThis.window = {
      localStorage: mockStorage,
      electronAPI: {
        dbStatus: async () => ({ ok: true, state: 'unlocked' }),
        dbClinicalLoadAll: async () => ({ ok: true, blobs: { ...ipcBlobs } }),
        dbClinicalSaveAll: async (payload) => {
          if (payload && payload.blobs) Object.assign(ipcBlobs, payload.blobs);
          return { ok: true };
        },
      },
    };
    const { clearBlobCacheForTests, ensureStorageHydrated } = await import('./storage.js');
    clearBlobCacheForTests();
    await ensureStorageHydrated();
  });

  afterEach(async () => {
    const { clearBlobCacheForTests } = await import('./storage.js');
    clearBlobCacheForTests();
    globalThis.window = { localStorage: mockStorage };
  });

  it('saveAll on desktop DB path does not write rpc-patients (or other clinical LS keys)', async () => {
    const { storage } = await import('./storage.js');
    const result = await storage.saveAll(
      [{ id: 'p-db', nombre: 'Repo' }],
      { 'p-db': { estudios: 'n' } },
      {},
      {},
      {}
    );
    assert.equal(result.ok, true);
    for (const key of CLINICAL_LS_KEYS) {
      assert.equal(store[key], undefined, `unexpected LS write: ${key}`);
    }
  });

  it('skipClinicalLocalPersist is true when desktop DB unlock path is active', async () => {
    const { skipClinicalLocalPersist } = await import('./storage/storage-core.mjs');
    assert.equal(skipClinicalLocalPersist(), true);
  });
});
