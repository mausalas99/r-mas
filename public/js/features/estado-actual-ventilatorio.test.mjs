import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  soporteTier,
  computePafi,
  computeSpo2Fio2,
  computeDrivingPressure,
  computeRox,
  computeVtMlKg,
  computeTobinRrs,
  classifySiraSeverity,
  formatSoporteVentilatorioClause,
  formatVentilatorioCalcClause,
  buildVentilatorioCalcHints,
} from './estado-actual-ventilatorio.mjs';
import { resolveSoporteClause } from './estado-actual-text-build.mjs';

test('soporteTier clasifica modalidades de soporte', () => {
  assert.equal(soporteTier('Puntillas nasales'), 'litros');
  assert.equal(soporteTier('Mascarilla simple'), 'litros');
  assert.equal(soporteTier('Alto flujo'), 'hfnc');
  assert.equal(soporteTier('VMNI'), 'vmni');
  assert.equal(soporteTier('VM no invasiva'), 'vmni');
  assert.equal(soporteTier('Traqueostomía'), 'tqt');
  assert.equal(soporteTier('Ventilación mecánica'), 'vm');
  assert.equal(soporteTier('Aire ambiente'), null);
});

test('cálculos ventilatorios — PaFi, driving pressure, ROX, ml/kg, Tobin', () => {
  assert.equal(computePafi(80, 50), 160);
  assert.equal(classifySiraSeverity(160), 'SIRA moderado');
  assert.equal(computeSpo2Fio2(92, 40), 230);
  assert.equal(computeDrivingPressure(28, 10), 18);
  assert.equal(computeRox(92, 40, 24), 9.6);
  assert.equal(computeVtMlKg(420, 70), 6);
  assert.equal(computeTobinRrs(24, 400), 60);
});

test('formatSoporteVentilatorioClause — parámetros en texto clínico', () => {
  assert.equal(
    formatSoporteVentilatorioClause({
      soporte: 'Puntillas nasales',
      soporteLitros: 2,
    }),
    'POR PUNTILLAS NASALES A 2 L/MIN'
  );
  assert.equal(
    formatSoporteVentilatorioClause({
      soporte: 'Alto flujo',
      soporteFlujoLmin: 60,
      soporteFio2: 50,
    }),
    'POR ALTO FLUJO 60 L/MIN FI O2 50%'
  );
  assert.equal(
    formatSoporteVentilatorioClause({
      soporte: 'VMNI',
      vmPsoporte: 10,
      vmPeep: 5,
      soporteFio2: 40,
    }),
    'CON VMNI PS 10 EPAP 5 FI O2 40%'
  );
  assert.equal(
    formatSoporteVentilatorioClause({
      soporte: 'Traqueostomía',
      soporteFio2: 35,
    }),
    'CON TRAQUEOSTOMÍA FI O2 35%'
  );
  assert.equal(
    formatSoporteVentilatorioClause({
      soporte: 'Ventilación mecánica',
      vmModo: 'VCV',
      vmVt: 420,
      vmPeep: 8,
      soporteFio2: 40,
      vmFlujo: 60,
    }),
    'CON VENTILACIÓN MECÁNICA VCV VT 420 ML PEEP 8 FI O2 40% FLUJO 60 L/MIN'
  );
});

test('buildVentilatorioCalcHints — alertas SIRA y protección pulmonar', () => {
  var hints = buildVentilatorioCalcHints(
    {
      soporte: 'Ventilación mecánica',
      soporteFio2: 60,
      vmPeep: 10,
      vmPmeseta: 32,
      vmVt: 560,
    },
    {
      fr: 22,
      sat: 94,
      pesoKg: 70,
      lab: { kind: 'arterial', pO2: 120, pCO2: 44, sourceLabel: 'Gasometría arterial · 08/05' },
    }
  );
  assert.ok(hints.some(function (h) { return h.indexOf('PaFi 200') >= 0; }));
  assert.ok(hints.some(function (h) { return h.indexOf('Driving pressure 22') >= 0; }));
  assert.ok(hints.some(function (h) { return h.indexOf('P meseta ≥30') >= 0; }));
});

test('resolveSoporteClause incluye índices calculados', () => {
  var clause = resolveSoporteClause(
    {
      soporte: 'Alto flujo',
      soporteFlujoLmin: 50,
      soporteFio2: 60,
    },
    { fr: 20, sat: 96 }
  );
  assert.match(clause, /POR ALTO FLUJO 50 L\/MIN FI O2 60%/);
  assert.match(clause, /ROX/);
});
