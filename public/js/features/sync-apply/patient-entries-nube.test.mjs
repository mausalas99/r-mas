import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { patients } from '../../app-state.mjs';
import { applyLanPatientEntries } from './patient-entries.mjs';
import { registerLanRuntime } from '../lan/orchestrator-runtime.mjs';

describe('applyLanPatientEntries on Nube path', () => {
  /** @type {typeof patients} */
  let patientsBefore;

  beforeEach(() => {
    patientsBefore = patients.slice();
    patients.length = 0;
    registerLanRuntime({
      ensureUniquePatientName(name) {
        return String(name || 'PACIENTE');
      },
      applyImportEntry(entry) {
        return String(entry?.patient?.id || 'imported-id');
      },
      findPatientByRegistro() {
        return null;
      },
    });
  });

  afterEach(() => {
    patients.length = 0;
    patients.push(...patientsBefore);
  });

  it('applies cloud census without configureLanPatientEntries wiring', () => {
    assert.doesNotThrow(function () {
      const result = applyLanPatientEntries(
        [
          {
            patient: {
              id: 'cloud-p1',
              nombre: 'PACIENTE NUBE',
              registro: '12345',
            },
            note: {},
            indicaciones: {},
            labHistory: [],
          },
        ],
        { skipTeamScopeFilter: true }
      );
      assert.equal(result.added, 1);
    });
    assert.equal(patients.length, 1);
    assert.equal(patients[0].nombre, 'PACIENTE NUBE');
  });
});
