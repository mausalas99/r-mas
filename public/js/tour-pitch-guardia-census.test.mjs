import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from './storage.js';
import {
  buildPitchGuardiaCensusPatients,
  seedPitchGuardiaCensusTodos,
  extendPresentationModeWithGuardiaCensus,
} from './tour-pitch-guardia-census.mjs';
import {
  alteradosForPatient,
  patientPendientes,
  guardiaPatientStatus,
  admissionDateForPatient,
  isPatientAdmittedToday,
} from './features/guardia-census-table.mjs';

const store = {};

beforeEach(() => {
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
});

afterEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  delete globalThis.localStorage;
});

describe('buildPitchGuardiaCensusPatients', () => {
  it('builds 24 synthetic patients with unique, non-demo- ids', () => {
    const patients = buildPitchGuardiaCensusPatients(new Date('2026-08-19T10:00:00.000Z'));
    assert.equal(patients.length, 24);
    const ids = new Set(patients.map((p) => p.id));
    assert.equal(ids.size, 24);
    patients.forEach((p) => assert.equal(p.id.indexOf('demo-'), -1));
  });

  it('does not mark patients isDemo, so Modo Guardia\'s !p.isDemo census filter keeps them', () => {
    const patients = buildPitchGuardiaCensusPatients(new Date('2026-08-19T10:00:00.000Z'));
    patients.forEach((p) => assert.ok(!p.isDemo, `${p.nombre} should not be isDemo`));
  });

  it('gives every patient a bed and a vitals-capable monitoreo shape', () => {
    const patients = buildPitchGuardiaCensusPatients(new Date());
    patients.forEach((p) => {
      assert.ok(p.cama, `${p.nombre} missing cama`);
      assert.ok(Array.isArray(p.monitoreo.historial));
    });
  });

  it('includes patients across all four Guardia statuses once todos are seeded', () => {
    const today = new Date('2026-08-19T10:00:00.000Z');
    const patients = buildPitchGuardiaCensusPatients(today);
    seedPitchGuardiaCensusTodos(today);
    const statuses = new Set(
      patients.map((p) => guardiaPatientStatus(patientPendientes(p.id)))
    );
    assert.ok(statuses.has('vencido'), 'expected at least one VENCIDO patient');
    assert.ok(statuses.has('en_curso'), 'expected at least one EN CURSO patient');
    assert.ok(statuses.has('abierto'), 'expected at least one ABIERTO patient');
    assert.ok(statuses.has('listo'), 'expected at least one LISTO patient');
  });

  it('includes at least one patient with altered vitals (Guardia alert-cell coverage)', () => {
    const today = new Date('2026-08-19T10:00:00.000Z');
    const patients = buildPitchGuardiaCensusPatients(today);
    const altered = patients.filter((p) => alteradosForPatient(p).chips.length > 0);
    assert.ok(altered.length > 0);
  });

  it('includes at least one patient with no vitals taken today ("sin toma 08:00")', () => {
    const today = new Date('2026-08-19T10:00:00.000Z');
    const patients = buildPitchGuardiaCensusPatients(today);
    const noToma = patients.filter((p) => !alteradosForPatient(p).taken);
    assert.ok(noToma.length > 0);
  });

  it('marks at least 2 patients admitted today via registeredAt (D3a Ingresos)', () => {
    const now = new Date();
    const patients = buildPitchGuardiaCensusPatients(now);
    const admittedToday = patients.filter((p) => isPatientAdmittedToday(p));
    assert.ok(admittedToday.length >= 2, `expected >=2 admitted today, got ${admittedToday.length}`);
    admittedToday.forEach((p) => assert.ok(admissionDateForPatient(p)));
  });
});

describe('seedPitchGuardiaCensusTodos', () => {
  it('writes exactly one pendiente per patient that has one, readable via storage.getTodos', () => {
    const today = new Date('2026-08-19T10:00:00.000Z');
    seedPitchGuardiaCensusTodos(today);
    const overdue = storage.getTodos('pitch-gcx-01');
    assert.equal(overdue.length, 1);
    assert.equal(overdue[0].text, 'Reponer potasio y control');
    const inProgress = storage.getTodos('pitch-gcx-03');
    assert.equal(inProgress[0].inProgress, true);
  });
});

describe('extendPresentationModeWithGuardiaCensus', () => {
  it('appends the fixture on top of the existing (demo) census without duplicating', () => {
    let patients = [{ id: 'demo-pitch', nombre: 'DEMO PÉREZ', isDemo: true }];
    let demoPatients = [{ id: 'demo-pitch', nombre: 'DEMO PÉREZ', isDemo: true }];
    let persisted = false;
    let rendered = false;
    const state = {
      getPatients: () => patients,
      setPatients: (list) => {
        patients = list;
      },
      getDemoPatients: () => demoPatients,
      setDemoPatients: (list) => {
        demoPatients = list;
      },
      persistClinicalState: () => {
        persisted = true;
      },
      renderPatientList: () => {
        rendered = true;
      },
    };
    extendPresentationModeWithGuardiaCensus(state, new Date('2026-08-19T10:00:00.000Z'));
    assert.equal(patients.length, 25);
    assert.ok(patients.some((p) => p.id === 'demo-pitch'));
    assert.ok(persisted);
    assert.ok(rendered);
    // The 24 extra patients are non-demo — they must land only in the real
    // patients array, never in the demoPatients display bucket (would double
    // them up in the sidebar, since it unions demoPatients with
    // patients.filter(!isDemo)).
    assert.equal(demoPatients.length, 1);
    assert.equal(patients.filter((p) => !p.isDemo).length, 24);

    // Calling twice must not duplicate the fixture rows.
    extendPresentationModeWithGuardiaCensus(state, new Date('2026-08-19T10:00:00.000Z'));
    assert.equal(patients.length, 25);
  });
});
