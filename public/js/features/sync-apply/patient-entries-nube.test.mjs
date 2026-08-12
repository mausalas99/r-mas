import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getPatients } from '../../app-state.mjs';
import {
  applyLanPatientEntries,
  isPlaceholderPatientName,
  configurePatientEntries,
} from './patient-entries.mjs';

describe('applyLanPatientEntries on Nube path', () => {
  /** @type {typeof patients} */
  let patientsBefore;

  beforeEach(() => {
    patientsBefore = getPatients().slice();
    getPatients().length = 0;
    configurePatientEntries({
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
    getPatients().length = 0;
    getPatients().push(...patientsBefore);
  });

  it('applies cloud census without configurePatientEntries wiring', () => {
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
    assert.equal(getPatients().length, 1);
    assert.equal(getPatients()[0].nombre, 'PACIENTE NUBE');
  });

  it('isPlaceholderPatientName detects default admit labels', () => {
    assert.equal(isPlaceholderPatientName('PACIENTE SIN NOMBRE'), true);
    assert.equal(isPlaceholderPatientName('cynthia'), false);
    assert.equal(isPlaceholderPatientName(''), true);
  });

  it('does not let PACIENTE SIN NOMBRE overwrite CYNTHIA when remote clock is newer', () => {
    getPatients().push({
      id: 'p-cynthia',
      nombre: 'CYNTHIA',
      registro: '1',
      lanUpdatedAt: '2026-08-06T10:00:00.000Z',
    });
    const result = applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-cynthia',
            nombre: 'PACIENTE SIN NOMBRE',
            registro: '1',
            lanUpdatedAt: '2026-08-06T18:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.equal(result.updated, 1);
    assert.equal(getPatients()[0].nombre, 'CYNTHIA');
  });

  it('accepts a real remote name when local is still the placeholder', () => {
    getPatients().push({
      id: 'p-cynthia',
      nombre: 'PACIENTE SIN NOMBRE',
      registro: '1',
      lanUpdatedAt: '2026-08-06T18:00:00.000Z',
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-cynthia',
            nombre: 'CYNTHIA LOPEZ',
            registro: '1',
            lanUpdatedAt: '2026-08-06T10:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.equal(getPatients()[0].nombre, 'CYNTHIA LOPEZ');
  });
});
