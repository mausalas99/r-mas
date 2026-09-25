import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findPatientsByExactNames } from './patient-name-cleanup-once.mjs';

describe('findPatientsByExactNames', () => {
  const patients = [
    { id: 'p1', nombre: 'melissa denis segura guerrero' },
    { id: 'p2', nombre: 'MODELO SIMULADO GENERICO CASOAD' },
    { id: 'p3', nombre: 'GENERICO CASOBL' },
  ];

  it('matches names case- and whitespace-insensitively', () => {
    const found = findPatientsByExactNames(patients, ['MELISSA DENIS SEGURA GUERRERO']);
    assert.deepEqual(found.map((p) => p.id), ['p1']);
  });

  it('matches every name in the list', () => {
    const found = findPatientsByExactNames(patients, [
      'MELISSA DENIS SEGURA GUERRERO',
      'MODELO SIMULADO GENERICO CASOAD',
    ]);
    assert.deepEqual(found.map((p) => p.id).sort(), ['p1', 'p2']);
  });

  it('returns nothing when no patient matches', () => {
    assert.deepEqual(findPatientsByExactNames(patients, ['NOBODY HERE']), []);
  });

  it('does not touch a patient with a different name', () => {
    const found = findPatientsByExactNames(patients, ['MELISSA DENIS SEGURA GUERRERO']);
    assert.ok(!found.some((p) => p.id === 'p3'));
  });
});
