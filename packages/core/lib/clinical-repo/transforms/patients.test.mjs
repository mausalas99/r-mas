import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyPatientUpsert, applyPatientDelete } from './patients.mjs';

describe('clinical-repo patient transforms', () => {
  it('upsert inserts a new patient by id', () => {
    const res = applyPatientUpsert([{ id: 'p1', name: 'A' }], {
      patient: { id: 'p2', name: 'B' },
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.patients, [
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ]);
  });

  it('upsert replaces existing patient row by id', () => {
    const res = applyPatientUpsert([{ id: 'p1', name: 'A', bed: '1' }], {
      patient: { id: 'p1', name: 'A2', room: '2' },
    });
    assert.equal(res.ok, true);
    assert.deepEqual(res.patients, [{ id: 'p1', name: 'A2', room: '2' }]);
  });

  it('upsert rejects missing patient id', () => {
    const res = applyPatientUpsert([], { patient: { name: 'X' } });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'invalid_patient');
  });

  it('delete removes patient by id without cascading', () => {
    const res = applyPatientDelete(
      [
        { id: 'p1', name: 'A' },
        { id: 'p2', name: 'B' },
      ],
      { patientId: 'p1' }
    );
    assert.equal(res.ok, true);
    assert.deepEqual(res.patients, [{ id: 'p2', name: 'B' }]);
  });

  it('delete is a no-op when patient id is missing from array', () => {
    const res = applyPatientDelete([{ id: 'p1' }], { patientId: 'missing' });
    assert.equal(res.ok, true);
    assert.deepEqual(res.patients, [{ id: 'p1' }]);
  });

  it('delete rejects empty patientId', () => {
    const res = applyPatientDelete([{ id: 'p1' }], { patientId: '  ' });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'invalid_patient_id');
  });
});
