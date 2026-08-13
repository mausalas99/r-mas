import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { migrateGranularInner } from '../expediente-tabs.mjs';
import { t } from './chrome.mjs';

const SALA = { appMode: 'sala' };
const INTER = { appMode: 'interconsulta' };

/** Mirrors selectPatientCore tab policy when patientChanged is true. */
function innerAfterPatientSwitch(prevInner, settings) {
  return migrateGranularInner(prevInner || 'resumen', settings);
}

describe('patient switch preserves expediente tab', () => {
  it('keeps estadoActual in sala when switching patients', () => {
    assert.equal(innerAfterPatientSwitch('estadoActual', SALA), 'estadoActual');
  });

  it('keeps tendencias when switching patients', () => {
    assert.equal(innerAfterPatientSwitch('tend', SALA), 'tend');
    assert.equal(innerAfterPatientSwitch('cult', INTER), 'cult');
  });

  it('keeps resumen when switching patients', () => {
    assert.equal(innerAfterPatientSwitch('resumen', SALA), 'resumen');
  });

  it('keeps estadoActual in interconsulta when switching patients', () => {
    assert.equal(innerAfterPatientSwitch('estadoActual', INTER), 'estadoActual');
  });

  it('only migrates invalid tabs for the current mode', () => {
    assert.equal(innerAfterPatientSwitch('notas', SALA), 'estadoActual');
  });

  it('does not map a normal Paciente landing to lab', () => {
    assert.equal(innerAfterPatientSwitch('resumen', SALA), 'resumen');
  });

  it('lands on resumen when Paciente inner is empty', () => {
    assert.equal(innerAfterPatientSwitch(null, SALA), 'resumen');
    assert.equal(t('appTab.nota'), 'Paciente');
  });
});

describe('chrome tab-order copy', () => {
  it('density hint lists Paciente before Laboratorio (strip order)', () => {
    const hint = t('settings.uiDensityHint');
    const pac = hint.indexOf('Paciente');
    const lab = hint.indexOf('Laboratorio');
    assert.ok(pac >= 0 && lab > pac, hint);
  });
});

