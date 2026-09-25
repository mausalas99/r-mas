import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medAdminScheduleForItem } from './med-admin-schedule.mjs';

test('CADA 24 HORAS -> una toma', () => {
  const r = medAdminScheduleForItem({ frecuenciaRaw: 'CADA 24 HORAS' });
  assert.deepEqual(r, { kind: 'scheduled', defaultTimes: ['06:00'] });
});

test('CADA 12 HORAS -> dos tomas', () => {
  const r = medAdminScheduleForItem({ frecuenciaRaw: 'CADA 12 HORAS' });
  assert.deepEqual(r, { kind: 'scheduled', defaultTimes: ['06:00', '18:00'] });
});

test('CADA 8 HORAS -> tres tomas', () => {
  const r = medAdminScheduleForItem({ frecuenciaRaw: 'CADA 8 HORAS' });
  assert.deepEqual(r, { kind: 'scheduled', defaultTimes: ['06:00', '14:00', '22:00'] });
});

test('CADA 6 HRS (abreviado) -> cuatro tomas', () => {
  const r = medAdminScheduleForItem({ frecuenciaRaw: 'CADA 6 HRS' });
  assert.deepEqual(r, { kind: 'scheduled', defaultTimes: ['06:00', '12:00', '18:00', '00:00'] });
});

test('POR TURNO -> se trata como cada 8 horas', () => {
  const r = medAdminScheduleForItem({ frecuenciaRaw: 'POR TURNO' });
  assert.deepEqual(r, { kind: 'scheduled', defaultTimes: ['06:00', '14:00', '22:00'] });
});

test('UNICA VEZ -> una sola toma, no recurrente', () => {
  const r = medAdminScheduleForItem({ frecuenciaRaw: 'UNICA VEZ' });
  assert.deepEqual(r, { kind: 'once', defaultTimes: ['08:00'] });
});

test('PRN por frecuenciaRaw -> sin horario fijo', () => {
  const r = medAdminScheduleForItem({ frecuenciaRaw: 'PRN' });
  assert.deepEqual(r, { kind: 'prn', defaultTimes: [] });
});

test('PRN detectado por CRITERIO PRN en dosisRaw', () => {
  const r = medAdminScheduleForItem({
    frecuenciaRaw: 'CADA 8 HORAS',
    dosisRaw: '75 MCG // CRITERIO PRN: EN CASO DE DOLOR SEVERO, CADA 8 HRS',
  });
  assert.equal(r.kind, 'prn');
});

test('frecuencia vacía/desconocida -> fallback una toma', () => {
  assert.equal(medAdminScheduleForItem(null).kind, 'unscheduled');
  assert.equal(medAdminScheduleForItem({ frecuenciaRaw: '' }).kind, 'unscheduled');
  assert.equal(medAdminScheduleForItem({ frecuenciaRaw: 'OTRO' }).kind, 'unscheduled');
});
