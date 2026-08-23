import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCardio, ensureCardio } from './patient-cardio.mjs';
import { FANTASTICO_CLASSES } from './med-segments.mjs';

test('emptyCardio has IC defaults and four fantásticos', () => {
  const c = emptyCardio();
  assert.equal(c.inicioDescongestion, '');
  assert.deepEqual(c.overrides, {});
  assert.deepEqual(c.pocusByDay, []);
  assert.deepEqual(c.medSegments, []);
  assert.deepEqual(c.diureticSegments, []);
  assert.deepEqual(c.medCatalog, []);
  assert.equal(c.fantasticos.length, FANTASTICO_CLASSES.length);
  assert.equal(c.fenotipo, '');
  assert.equal(c.etiologia, '');
  assert.equal(c.residente, '');
  assert.equal(c.ekg, '');
  assert.equal(c.ritmo, '');
  assert.equal(c.estrategiaControlFa, '');
});

test('emptyCardio has HF objective-form defaults (Part C Phase 1)', () => {
  const c = emptyCardio();
  assert.ok(c.workup && typeof c.workup === 'object');
  assert.ok(c.device && typeof c.device === 'object');
  assert.deepEqual(c.scores, []);
  assert.deepEqual(c.echoStudies, []);
  assert.deepEqual(c.labSnapshots, []);
  assert.deepEqual(c.consultas, []);
  assert.ok(c.evaluacionInicial && typeof c.evaluacionInicial === 'object');
  assert.equal(c.evaluacionInicial.fecha, '');
  assert.deepEqual(c.rondasByDay, []);
});

test('ensureCardio creates blob when missing', () => {
  const patient = { id: 'p1' };
  ensureCardio(patient);
  assert.ok(patient.cardio);
  assert.equal(patient.cardio.inicioDescongestion, '');
  assert.equal(patient.cardio.fantasticos.length, 4);
});

test('ensureCardio preserves existing fields and backfills missing keys', () => {
  const patient = {
    id: 'p2',
    cardio: {
      inicioDescongestion: '2026-07-01',
      medSegments: [{ id: 'ms_1' }],
    },
  };
  ensureCardio(patient);
  assert.equal(patient.cardio.inicioDescongestion, '2026-07-01');
  assert.equal(patient.cardio.medSegments.length, 1);
  assert.ok(Array.isArray(patient.cardio.pocusByDay));
  assert.ok(Array.isArray(patient.cardio.fantasticos));
  assert.deepEqual(patient.cardio.overrides, {});
  assert.equal(patient.cardio.fenotipo, '');
  assert.equal(patient.cardio.residente, '');
});

test('ensureCardio backfills new HF objective-form keys on old patient records without wiping other data', () => {
  const patient = {
    id: 'p4',
    cardio: {
      inicioDescongestion: '2026-06-01',
      fenotipo: 'HFrEF',
      medSegments: [{ id: 'ms_old' }],
    },
  };
  ensureCardio(patient);
  assert.ok(Array.isArray(patient.cardio.scores));
  assert.equal(patient.cardio.scores.length, 0);
  assert.ok(Array.isArray(patient.cardio.echoStudies));
  assert.ok(Array.isArray(patient.cardio.labSnapshots));
  assert.ok(Array.isArray(patient.cardio.consultas));
  assert.ok(Array.isArray(patient.cardio.rondasByDay));
  assert.ok(patient.cardio.workup && typeof patient.cardio.workup === 'object');
  assert.equal(patient.cardio.workup.hierro.estadoEstudio, '');
  assert.ok(patient.cardio.device && typeof patient.cardio.device === 'object');
  assert.equal(patient.cardio.device.tieneIndicacion, null);
  assert.ok(patient.cardio.evaluacionInicial && typeof patient.cardio.evaluacionInicial === 'object');
  assert.equal(patient.cardio.evaluacionInicial.fecha, '');
  // Existing data on the old patient record must survive the backfill untouched.
  assert.equal(patient.cardio.inicioDescongestion, '2026-06-01');
  assert.equal(patient.cardio.fenotipo, 'HFrEF');
  assert.equal(patient.cardio.medSegments.length, 1);
  assert.equal(patient.cardio.medSegments[0].id, 'ms_old');
});

test('ensureCardio does not overwrite existing HF objective-form data already present', () => {
  const patient = {
    id: 'p5',
    cardio: {
      scores: [{ date: '2026-01-01', nyha: 'II' }],
      evaluacionInicial: { fecha: '2026-01-02', motivoConsulta: 'disnea' },
      device: { tieneIndicacion: true, tipo: 'DAI' },
    },
  };
  ensureCardio(patient);
  assert.equal(patient.cardio.scores.length, 1);
  assert.equal(patient.cardio.scores[0].nyha, 'II');
  assert.equal(patient.cardio.evaluacionInicial.fecha, '2026-01-02');
  assert.equal(patient.cardio.evaluacionInicial.motivoConsulta, 'disnea');
  assert.equal(patient.cardio.device.tieneIndicacion, true);
  assert.equal(patient.cardio.device.tipo, 'DAI');
});

test('ensureCardio preserves existing identity fields', () => {
  const patient = {
    id: 'p3',
    cardio: {
      fenotipo: 'HFpEF',
      etiologia: 'Isquémica',
      residente: 'Dr. Pérez',
      ekg: 'Ritmo sinusal',
      ritmo: 'Sinusal',
      estrategiaControlFa: 'Control de frecuencia',
    },
  };
  ensureCardio(patient);
  assert.equal(patient.cardio.fenotipo, 'HFpEF');
  assert.equal(patient.cardio.etiologia, 'Isquémica');
  assert.equal(patient.cardio.residente, 'Dr. Pérez');
  assert.equal(patient.cardio.ekg, 'Ritmo sinusal');
  assert.equal(patient.cardio.ritmo, 'Sinusal');
  assert.equal(patient.cardio.estrategiaControlFa, 'Control de frecuencia');
});
