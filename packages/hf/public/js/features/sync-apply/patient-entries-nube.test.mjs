import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPatients, getLabHistory } from '../../app-state.mjs';
import {
  getLabHistoryRevision,
  resetLabHistoryCacheForTests,
} from '../../lab-history-cache.mjs';
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
    resetLabHistoryCacheForTests();
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

  it('does not let older remote diagnoses overwrite newer local ones', () => {
    getPatients().push({
      id: 'p-dx',
      nombre: 'CYNTHIA',
      registro: '7',
      diagnosticosList: ['CHOQUE SÉPTICO', ''],
      diagnosticosText: '1. CHOQUE SÉPTICO',
      lanUpdatedAt: '2026-08-14T18:00:00.000Z',
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-dx',
            nombre: 'CYNTHIA',
            registro: '7',
            diagnosticosList: ['NAC', ''],
            diagnosticosText: '1. NAC',
            lanUpdatedAt: '2026-08-14T10:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.deepEqual(
      (getPatients()[0].diagnosticosList || []).filter(Boolean),
      ['CHOQUE SÉPTICO']
    );
  });

  it('takes remote diagnoses when the remote clock is newer', () => {
    getPatients().push({
      id: 'p-dx',
      nombre: 'CYNTHIA',
      registro: '7',
      diagnosticosList: ['CHOQUE SÉPTICO', ''],
      diagnosticosText: '1. CHOQUE SÉPTICO',
      lanUpdatedAt: '2026-08-14T10:00:00.000Z',
    });
    applyLanPatientEntries(
      [
        {
          patient: {
            id: 'p-dx',
            nombre: 'CYNTHIA',
            registro: '7',
            diagnosticosList: ['NAC', ''],
            diagnosticosText: '1. NAC',
            lanUpdatedAt: '2026-08-14T18:00:00.000Z',
          },
          note: {},
          indicaciones: {},
          labHistory: [],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.deepEqual((getPatients()[0].diagnosticosList || []).filter(Boolean), ['NAC']);
  });

  it('bumps lab history revision when Nube labs land on an existing patient', () => {
    resetLabHistoryCacheForTests();
    getPatients().push({
      id: 'p-labs',
      nombre: 'HIPOLITO',
      registro: '9',
    });
    getLabHistory()['p-labs'] = [];
    const before = getLabHistoryRevision('p-labs');
    applyLanPatientEntries(
      [
        {
          patient: { id: 'p-labs', nombre: 'HIPOLITO', registro: '9' },
          note: {},
          indicaciones: {},
          labHistory: [
            {
              id: 's1',
              fecha: '13/08/2026',
              hora: '08:00',
              resLabs: ['QS\tK 3.1*'],
            },
          ],
        },
      ],
      { skipTeamScopeFilter: true }
    );
    assert.ok(getLabHistoryRevision('p-labs') > before);
    assert.equal(getLabHistory()['p-labs'].length, 1);
  });
});

describe('applyLanPatientEntries UI persist', () => {
  it('debounces SQLCipher persist and does not remount lab/EA panels', () => {
    const text = readFileSync(fileURLToPath(new URL('./patient-entries.mjs', import.meta.url)), 'utf8');
    const applyStart = text.indexOf('export function applyLanPatientEntries');
    const applyFn = text.slice(applyStart, applyStart + 900);
    assert.match(applyFn, /persistClinicalState\(\{ domains: \['patients'\] \}\)/);
    assert.match(applyFn, /scheduleIdleClinicalPersist/);
    assert.doesNotMatch(applyFn, /persistClinicalState\(\{ immediate: true \}\)/);
    const refreshStart = text.indexOf('function refreshLanPatientUiAfterApply');
    const refreshEnd = text.indexOf('export function applyLanPatientEntries');
    const refresh = text.slice(refreshStart, refreshEnd);
    assert.match(refresh, /renderPatientListLanSilent/);
    assert.doesNotMatch(refresh, /renderLabHistoryPanel/);
    assert.doesNotMatch(refresh, /syncHeavy/);
  });
});
