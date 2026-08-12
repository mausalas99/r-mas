import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_PERSIST_BLOB_KEYS,
  pickPersistSnapshot,
} from './persist-snapshot.mjs';

describe('clinical-repo persist-snapshot transform', () => {
  it('exposes the saveAll clinical blob keys', () => {
    assert.deepEqual(CLINICAL_PERSIST_BLOB_KEYS, [
      'patients',
      'notes',
      'indicaciones',
      'labHistory',
      'medRecetaByPatient',
      'medPharmProfileByPatient',
      'recetaHuByPatient',
      'listadoProblemas',
      'vpoByPatient',
    ]);
  });

  it('picks only provided keys and echoes values', () => {
    const res = pickPersistSnapshot({
      notes: { p1: 'nota' },
      labHistory: { p1: [] },
      ignored: true,
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.changedKeys, ['notes', 'labHistory']);
    assert.deepEqual(res.snapshot, {
      notes: { p1: 'nota' },
      labHistory: { p1: [] },
    });
  });

  it('rejects empty payload', () => {
    const res = pickPersistSnapshot({});
    assert.equal(res.ok, false);
    assert.equal(res.error, 'empty_snapshot');
  });

  it('rejects non-array patients', () => {
    const res = pickPersistSnapshot({ patients: { id: 'p1' } });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'invalid_patients');
  });

  it('rejects non-object map blobs', () => {
    const res = pickPersistSnapshot({ notes: ['x'] });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'invalid_notes');
  });
});
