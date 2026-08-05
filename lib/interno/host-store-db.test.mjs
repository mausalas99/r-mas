import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createInternoHostStoreFromDb,
  createInternoStorePreferDb,
} = require('./host-store-db.cjs');

describe('createInternoHostStoreFromDb', () => {
  it('returns empty patients when db unavailable', () => {
    const store = createInternoHostStoreFromDb(() => null);
    assert.deepEqual(store.getState(), { patients: [] });
  });

  it('reads patients json from clinical_blob', () => {
    const patients = [{ id: 'p1', nombre: 'Ana' }];
    const store = createInternoHostStoreFromDb(() => ({
      prepare(sql) {
        assert.match(sql, /clinical_blob/);
        return {
          get() {
            return { json: JSON.stringify(patients) };
          },
        };
      },
    }));
    assert.deepEqual(store.getState(), { patients });
  });
});

describe('createInternoStorePreferDb', () => {
  it('uses db when it has patients', () => {
    const store = createInternoStorePreferDb(
      { getState: () => ({ patients: [{ id: 'db' }] }) },
      { getState: () => ({ patients: [{ id: 'lan' }] }) }
    );
    assert.equal(store.getState().patients[0].id, 'db');
  });

  it('falls back to lan when db empty', () => {
    const store = createInternoStorePreferDb(
      { getState: () => ({ patients: [] }) },
      { getState: () => ({ patients: [{ id: 'lan' }] }) }
    );
    assert.equal(store.getState().patients[0].id, 'lan');
  });
});
