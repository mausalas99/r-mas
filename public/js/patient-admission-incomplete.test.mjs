import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPatientAdmissionIncomplete,
  patientAdmissionMissingFields,
} from './patient-admission-incomplete.mjs';

describe('patient-admission-incomplete', () => {
  it('incompleto sin cuarto/cama/servicio', () => {
    var p = { nombre: 'TEST', registro: '123', servicio: '', cuarto: '', cama: '' };
    assert.equal(isPatientAdmissionIncomplete(p, { appMode: 'sala' }), true);
    assert.deepEqual(patientAdmissionMissingFields(p, { appMode: 'sala' }), [
      'cuarto',
      'cama',
      'servicio',
    ]);
  });

  it('completo en modo sala', () => {
    var p = {
      nombre: 'TEST',
      registro: '123',
      servicio: 'CIRUGIA',
      cuarto: '440',
      cama: '05',
    };
    assert.equal(isPatientAdmissionIncomplete(p, { appMode: 'sala' }), false);
  });

  it('incompleto sin area en modo no-sala', () => {
    var p = {
      nombre: 'TEST',
      registro: '123',
      servicio: 'CIR',
      cuarto: '1',
      cama: '2',
      area: '',
    };
    assert.equal(isPatientAdmissionIncomplete(p, { appMode: 'guardia' }), true);
    assert.deepEqual(patientAdmissionMissingFields(p, { appMode: 'guardia' }), ['area']);
  });

  it('demo nunca incompleto', () => {
    assert.equal(isPatientAdmissionIncomplete({ isDemo: true, cuarto: '' }, {}), false);
  });
});
