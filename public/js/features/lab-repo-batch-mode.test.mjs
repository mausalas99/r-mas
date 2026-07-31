import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveActivePatientBatchRow,
  activePatientMissingRegistroMessage,
} from './lab-repo-batch-mode.mjs';

describe('lab-repo-batch-mode', () => {
  it('resolveActivePatientBatchRow requiere registro', () => {
    assert.equal(resolveActivePatientBatchRow({ getActivePatient: function () { return null; } }), null);
    assert.equal(
      resolveActivePatientBatchRow({
        getActivePatient: function () {
          return { id: '1', nombre: 'A', registro: '' };
        },
      }),
      null
    );
    var row = resolveActivePatientBatchRow({
      getActivePatient: function () {
        return { id: '1', nombre: 'Ana', registro: '123' };
      },
    });
    assert.equal(row.id, '1');
    assert.equal(row.registro, '123');
    assert.equal(row.selected, true);
  });

  it('activePatientMissingRegistroMessage', () => {
    assert.equal(
      activePatientMissingRegistroMessage({
        getActivePatient: function () {
          return { id: '1', registro: '' };
        },
      }),
      'El paciente no tiene registro para consultar el repositorio'
    );
    assert.equal(
      activePatientMissingRegistroMessage({
        getActivePatient: function () {
          return { id: '1', registro: '99' };
        },
      }),
      null
    );
  });
});
