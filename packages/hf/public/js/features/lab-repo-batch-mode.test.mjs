import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveActivePatientBatchRow,
  resolveBatchOpenMode,
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

  it('resolveBatchOpenMode: 2+ equipo → checkboxes aunque haya activo', () => {
    var active = { id: '1', nombre: 'Ana', registro: '111', hasRegistro: true, selected: true, hint: '' };
    var team = [
      active,
      { id: '2', nombre: 'Bob', registro: '222', hasRegistro: true, selected: true, hint: '' },
    ];
    var mode = resolveBatchOpenMode(team, active);
    assert.equal(mode.singlePatientMode, false);
    assert.equal(mode.rows.length, 2);
  });

  it('resolveBatchOpenMode: solo activo / un equipo → fechas', () => {
    var active = { id: '1', nombre: 'Ana', registro: '111', hasRegistro: true, selected: true, hint: '' };
    assert.equal(resolveBatchOpenMode([active], active).singlePatientMode, true);
    assert.equal(resolveBatchOpenMode([], active).singlePatientMode, true);
    assert.equal(resolveBatchOpenMode([], active).rows[0].id, '1');
  });

  it('activePatientMissingRegistroMessage solo si no hay equipo con registro', () => {
    var rt = {
      getActivePatient: function () {
        return { id: '1', registro: '' };
      },
    };
    assert.equal(activePatientMissingRegistroMessage(rt, 0), 'El paciente no tiene registro para consultar el repositorio');
    assert.equal(activePatientMissingRegistroMessage(rt, 2), null);
    assert.equal(
      activePatientMissingRegistroMessage(
        {
          getActivePatient: function () {
            return { id: '1', registro: '99' };
          },
        },
        0
      ),
      null
    );
  });
});
