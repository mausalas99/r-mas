import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_PERSIST_BLOB_KEYS,
  pickPersistSnapshot,
  clinicalCommandIpcResult,
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

  it('clinicalCommandIpcResult omits census blobs when echoSnapshot is false', () => {
    const result = {
      ok: true,
      changedKeys: ['patients'],
      changeId: 'chg_1',
      patients: [{ id: 'p1', nombre: 'Ana' }],
    };
    assert.deepEqual(clinicalCommandIpcResult(result, { echoSnapshot: false }), {
      ok: true,
      changedKeys: ['patients'],
      changeId: 'chg_1',
    });
    const echoed = clinicalCommandIpcResult(result, { source: 'ui' });
    assert.equal(echoed.ok, true);
    assert.equal(echoed.patients.length, 1);
    assert.equal(echoed.patients[0].id, 'p1');
  });
});
