import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { CLINICAL_LS_KEYS } from '../db-storage-bridge.mjs';
import { sweepLegacyClinicalLocalStorage } from './db-unlock-migration.mjs';

describe('sweepLegacyClinicalLocalStorage', () => {
  let mem;
  let prevLocalStorage;

  beforeEach(() => {
    mem = new Map();
    prevLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => {
        mem.set(k, v);
      },
      removeItem: (k) => {
        mem.delete(k);
      },
    };
  });

  afterEach(() => {
    globalThis.localStorage = prevLocalStorage;
  });

  it('clears every legacy clinical key when the DB has patients', () => {
    for (const key of CLINICAL_LS_KEYS) mem.set(key, '"stale"');
    sweepLegacyClinicalLocalStorage({ patients: '[{"id":"p1"}]' });
    for (const key of CLINICAL_LS_KEYS) assert.equal(mem.has(key), false);
  });

  it('refuses to clear when the DB has 0 patients but localStorage has some', () => {
    mem.set('rpc-patients', '[{"id":"p1"}]');
    mem.set('rpc-notes', '"stale"');
    sweepLegacyClinicalLocalStorage({ patients: '[]' });
    assert.equal(mem.get('rpc-patients'), '[{"id":"p1"}]');
    assert.equal(mem.get('rpc-notes'), '"stale"');
  });

  it('is a no-op with no blob cache (hydrate did not run)', () => {
    mem.set('rpc-patients', '[{"id":"p1"}]');
    sweepLegacyClinicalLocalStorage(null);
    assert.equal(mem.get('rpc-patients'), '[{"id":"p1"}]');
  });
});
