import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setEaFormOpenPatientId,
  getEaFormOpenPatientId,
  isEaRegistroFormOpenForPatient,
  findPatientById,
} from './estado-actual-panel-core.mjs';
import { getPatients } from '../app-state.mjs';

function setupBackdrop(isOpen) {
  if (typeof document === 'undefined') return null;
  var backdrop = document.getElementById('ea-registro-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'ea-registro-backdrop';
    document.body.appendChild(backdrop);
  }
  backdrop.classList.toggle('open', !!isOpen);
  return backdrop;
}

test('setEaFormOpenPatientId / getEaFormOpenPatientId — captures and clears', () => {
  setEaFormOpenPatientId('p1');
  assert.equal(getEaFormOpenPatientId(), 'p1');
  setEaFormOpenPatientId(null);
  assert.equal(getEaFormOpenPatientId(), null);
});

test('isEaRegistroFormOpenForPatient — true only when modal open and id matches captured id', () => {
  if (typeof document === 'undefined') return;
  setupBackdrop(true);
  setEaFormOpenPatientId('p1');
  assert.equal(isEaRegistroFormOpenForPatient('p1'), true);
  assert.equal(isEaRegistroFormOpenForPatient('p2'), false);

  setupBackdrop(false);
  assert.equal(isEaRegistroFormOpenForPatient('p1'), false);

  setEaFormOpenPatientId(null);
});

test('findPatientById — looks up by id regardless of active patient', () => {
  getPatients().length = 0;
  getPatients().push({ id: 'p1', nombre: 'Uno' }, { id: 'p2', nombre: 'Dos' });
  assert.equal(findPatientById('p2').nombre, 'Dos');
  assert.equal(findPatientById('missing'), null);
  assert.equal(findPatientById(null), null);
});
