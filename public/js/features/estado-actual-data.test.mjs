import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMonitoreo,
  emptyEstadoClinico,
  ensureMonitoreo,
  migratePatientMonitoreo,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  medicionHasCoreData,
  appendMedicion,
  resolveDietWeightKg,
  computeDietKcalTotal,
  computeDietKcalKgFromTotal,
  syncDietKcalFromWeight,
  parseIoEgresoField,
  isIoNumericValue,
} from './estado-actual-data.mjs';

test('emptyEstadoClinico incluye proteinG', () => {
  const ec = emptyEstadoClinico();
  assert.equal(ec.proteinG, '');
});

test('ensureMonitoreo backfill proteinG en pacientes legacy', () => {
  /** @type {any} */
  const patient = {
    monitoreo: {
      estadoClinico: { dieta: 'BLANDA', kcal: '1500' },
      pendienteReceta: {},
      confirmado: {},
      historial: [],
      textoGuardado: { text: '', savedAt: null },
    },
  };
  ensureMonitoreo(patient);
  assert.equal(patient.monitoreo.estadoClinico.proteinG, '');
});

test('emptyMonitoreo — stable canonical shape', () => {
  const a = emptyMonitoreo();
  const b = emptyMonitoreo();
  assert.deepEqual(a, b);
});

test('migratePatientMonitoreo mueve legacy estadoActual → textoGuardado y elimina legacy', () => {
  /** @type {any} */
  const patient = {
    estadoActual: { text: 'Texto viejo', savedAt: '2026-05-01T12:00:00.000Z' },
  };
  migratePatientMonitoreo(patient);
  assert.equal(patient.estadoActual, undefined);
  assert.ok(patient.monitoreo);
  assert.deepEqual(patient.monitoreo.textoGuardado, {
    text: 'Texto viejo',
    savedAt: '2026-05-01T12:00:00.000Z',
  });
});

test('migratePatientMonitoreo es idempotente', () => {
  /** @type {any} */
  const patient = {
    estadoActual: { text: 'X', savedAt: '2026-05-02T08:00:00.000Z' },
  };
  migratePatientMonitoreo(patient);
  const first = structuredClone(patient.monitoreo.textoGuardado);
  migratePatientMonitoreo(patient);
  assert.deepEqual(patient.monitoreo.textoGuardado, first);
  assert.equal(patient.estadoActual, undefined);
});

test('deriveSnapshot — último no-null por campo en historial', () => {
  /** @type {any} */
  const monitoreo = {
    estadoClinico: {},
    confirmado: {},
    pendienteReceta: {},
    historial: [
      {
        id: '1',
        recordedAt: '2026-05-01T08:00:00.000Z',
        vitals: { tas: 100, tad: null },
        glucometrias: [{ value: 90, time: '08:05' }],
        io: { ing: 500, egr: 300 },
      },
      {
        id: '2',
        recordedAt: '2026-05-01T10:00:00.000Z',
        vitals: { tas: null, tad: 70 },
        glucometrias: [{ value: 142, time: '10:10' }],
        io: {},
      },
    ],
    textoGuardado: { text: '', savedAt: null },
  };
  const snap = deriveSnapshot(monitoreo);
  assert.equal(snap.vitals.tas, 100);
  assert.equal(snap.vitals.tad, 70);
  assert.equal(snap.io.ing, 500);
  assert.equal(snap.io.egr, 300);
  assert.deepEqual(snap.glucometrias, [{ value: 142, time: '10:10' }]);
});

test('balanceTurno y balanceGlobalHistorico (500−300=200, 600−450=150, global 350)', () => {
  /** @type {any} */
  const monitoreo = {
    historial: [
      {
        id: 'a',
        recordedAt: '2026-05-01T07:00:00.000Z',
        vitals: {},
        glucometrias: [],
        io: { ing: 500, egr: 300 },
      },
      {
        id: 'b',
        recordedAt: '2026-05-01T09:00:00.000Z',
        vitals: {},
        glucometrias: [],
        io: { ing: 600, egr: 450 },
      },
    ],
  };
  assert.equal(balanceTurno(monitoreo), 150);
  assert.equal(balanceGlobalHistorico(monitoreo), 350);
});

test('medicionHasCoreData rechaza entrada vacía', () => {
  assert.equal(medicionHasCoreData({}), false);
  assert.equal(medicionHasCoreData(null), false);
  /** @type {any} */
  const onlyMeta = {
    id: 'x',
    recordedAt: '2026-05-01T12:00:00.000Z',
    vitals: {},
    glucometrias: [],
    io: {},
  };
  assert.equal(medicionHasCoreData(onlyMeta), false);
});

test('appendMedicion acepta medición sin datos clínicos (solo cierre de turno)', () => {
  const m = emptyMonitoreo();
  const row = {
    id: 'n',
    recordedAt: '2026-05-01T12:00:00.000Z',
    vitals: {},
    glucometrias: [],
    io: {},
  };
  const out = appendMedicion(m, row);
  assert.deepEqual(out, { ok: true });
  assert.equal(m.historial.length, 1);
  assert.equal(m.historial[0].id, 'n');
});

test('resolveDietWeightKg usa datos del paciente (no signos vitales)', () => {
  assert.equal(resolveDietWeightKg({ patientPeso: 72, pesoRef: 60 }), 72);
  assert.equal(resolveDietWeightKg({ pesoRef: 60 }), 60);
  assert.equal(resolveDietWeightKg({}), null);
});

test('computeDietKcalTotal y syncDietKcalFromWeight', () => {
  assert.equal(computeDietKcalTotal(25, 70), 1750);
  const ec = { kcalKg: '25', kcal: '' };
  assert.equal(syncDietKcalFromWeight(ec, 70), true);
  assert.equal(ec.kcal, '1750');
});

test('computeDietKcalKgFromTotal — inverso de kcal total', () => {
  assert.equal(computeDietKcalKgFromTotal(1750, 70), 25);
  assert.equal(computeDietKcalKgFromTotal('', 70), null);
});

test('parseIoEgresoField acepta NC y cc numéricos', () => {
  assert.equal(parseIoEgresoField(''), null);
  assert.equal(parseIoEgresoField('  nc  '), 'NC');
  assert.equal(parseIoEgresoField('300'), 300);
  assert.equal(isIoNumericValue('NC'), false);
  assert.equal(isIoNumericValue(300), true);
});

test('balanceTurno ignora turno con egresos NC', () => {
  /** @type {any} */
  const monitoreo = {
    historial: [
      {
        id: 'a',
        recordedAt: '2026-05-01T07:00:00.000Z',
        vitals: {},
        glucometrias: [],
        io: { ing: 500, egr: 'NC' },
      },
      {
        id: 'b',
        recordedAt: '2026-05-01T09:00:00.000Z',
        vitals: {},
        glucometrias: [],
        io: { ing: 600, egr: 450 },
      },
    ],
  };
  assert.equal(balanceTurno(monitoreo), 150);
});
