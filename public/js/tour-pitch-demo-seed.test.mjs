import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarLabs } from './labs.js';
import {
  buildPitchMonitoreoHistorial,
  buildPitchLabHistoryEntries,
  countDistinctLocalDaysInHistorial,
  countHistorialWithCoreData,
  getPitchCultivoParseText,
  filterPatientsForPitchTour,
  setPitchPatientIsolation,
  PITCH_DEMO_PATIENT_ID,
  PITCH_DEMO_PATIENT_ID_2,
} from './tour-pitch-demo-seed.mjs';
import { PITCH_CULTIVO_PERITONEAL_SOME } from './tour-pitch-cultivos-some.mjs';

test('PITCH_CULTIVO_PERITONEAL_SOME: antibiograma con S y R en sourceText', () => {
  assert.match(PITCH_CULTIVO_PERITONEAL_SOME, /CEFTAZIDIMA\n>16\tR/);
  assert.match(PITCH_CULTIVO_PERITONEAL_SOME, /CIPROFLOXACINA\n<=1\tS/);
  const { resLabs } = procesarLabs(PITCH_CULTIVO_PERITONEAL_SOME);
  assert.match(resLabs.join('\n'), /PSEUDOMONAS/i);
});

test('getPitchCultivoParseText incluye aspirado traqueal multipaciente', () => {
  const text = getPitchCultivoParseText();
  assert.match(text, /ASPIRADO TRAQUEAL/i);
  assert.match(text, /Escherichia coli/i);
  assert.match(text, /Acinetobacter baumannii/i);
});

test('buildPitchLabHistoryEntries: cultivos con sourceText y múltiples fechas', () => {
  const entries = buildPitchLabHistoryEntries();
  const cult = entries.filter((e) => String(e.id).includes('cult'));
  assert.equal(cult.length, 5);
  cult.forEach((e) => {
    assert.ok(e.sourceText && e.sourceText.length > 100);
  });
  const fechas = new Set(cult.map((e) => e.fecha));
  assert.ok(fechas.size >= 4);
});

test('filterPatientsForPitchTour oculta pacientes reales durante el pitch', () => {
  setPitchPatientIsolation(true);
  const mixed = [
    { id: PITCH_DEMO_PATIENT_ID, nombre: 'DEMO PÉREZ' },
    { id: 'real-1', nombre: 'REAL UNO' },
    { id: PITCH_DEMO_PATIENT_ID_2, nombre: 'DEMO GARCÍA' },
  ];
  const visible = filterPatientsForPitchTour(mixed);
  assert.equal(visible.length, 2);
  assert.ok(visible.every((p) => String(p.id).startsWith('demo-pitch')));
  setPitchPatientIsolation(false);
  assert.equal(filterPatientsForPitchTour(mixed).length, 3);
});

test('buildPitchLabHistoryEntries: al menos 5 días de laboratorio', () => {
  const entries = buildPitchLabHistoryEntries();
  assert.ok(entries.length >= 5);
  const fechas = new Set(entries.map((e) => e.fecha));
  assert.ok(fechas.size >= 5);
});

test('buildPitchMonitoreoHistorial: 3 días locales y 8+ mediciones con datos', () => {
  const mon = buildPitchMonitoreoHistorial(new Date('2026-05-28T15:00:00.000Z'));
  const hist = mon.historial;
  assert.ok(Array.isArray(hist));
  assert.ok(hist.length >= 8);
  assert.equal(countDistinctLocalDaysInHistorial(hist), 3);
  assert.ok(countHistorialWithCoreData(hist) >= 8);
});
