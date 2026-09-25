import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from '../../db/schema.mjs';
import {
  loadClinicalBlobValue,
  saveClinicalBlobValue,
  CLINICAL_PERSIST_BLOB_KEYS,
} from './blobs.mjs';

describe('clinical-repo blobs adapter', () => {
  it('loads defaults for missing blob keys', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.deepEqual(loadClinicalBlobValue(db, 'patients'), []);
    assert.deepEqual(loadClinicalBlobValue(db, 'notes'), {});
    db.close();
  });

  it('round-trips each persist blob key', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.ok(CLINICAL_PERSIST_BLOB_KEYS.includes('vpoByPatient'));
    saveClinicalBlobValue(db, 'patients', [{ id: 'p1' }]);
    saveClinicalBlobValue(db, 'notes', { p1: 'n' });
    saveClinicalBlobValue(db, 'vpoByPatient', { p1: { text: 'x' } });
    assert.deepEqual(loadClinicalBlobValue(db, 'patients'), [{ id: 'p1' }]);
    assert.deepEqual(loadClinicalBlobValue(db, 'notes'), { p1: 'n' });
    assert.deepEqual(loadClinicalBlobValue(db, 'vpoByPatient'), { p1: { text: 'x' } });
    db.close();
  });
});
