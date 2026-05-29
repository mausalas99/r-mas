import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeFarmacosFromMedReceta,
  getVitalsFromMonitoreo,
  duracionHoursToKey,
  duracionKeyToHours,
  syncAhaFields,
  emptyVpoState,
} from './vpo-data.mjs';

test('getVitalsFromMonitoreo usa turno más reciente y retrocede si falta', () => {
  var v = getVitalsFromMonitoreo({
    historial: [
      { recordedAt: '2026-05-28T10:00:00', vitals: { fc: '80', sat: '98' } },
      { recordedAt: '2026-05-29T08:00:00', vitals: { fc: '95' } },
    ],
  });
  assert.equal(v.fc, '95');
  assert.equal(v.sat, '98');
});

test('duracion key mapea horas ARISCAT', () => {
  assert.equal(duracionHoursToKey(1.5), 'le2');
  assert.equal(duracionHoursToKey(2.5), '2to3');
  assert.equal(duracionHoursToKey(4), 'gt3');
  assert.equal(duracionKeyToHours('2to3'), 2.5);
});

test('syncAhaFields desde ASA y procedimiento', () => {
  var s = emptyVpoState();
  s.asaKey = 'asa-iii';
  s.procedureId = 'gupta-cardiac';
  syncAhaFields(s);
  assert.equal(s.ahaClinico, 'Intermedio');
  assert.equal(s.ahaQuirurgico, 'Alto');
});

test('mergeFarmacosFromMedReceta no duplica por sourceMedId', () => {
  var s = emptyVpoState();
  var items = [{ id: 'm1', nombreRaw: 'LOSARTAN 50 MG' }];
  mergeFarmacosFromMedReceta(s, items, function () {
    return { sugerencia: 'suspender', notaEditable: 'nota' };
  });
  mergeFarmacosFromMedReceta(s, items, function () {
    return { sugerencia: 'suspender', notaEditable: 'nota' };
  });
  assert.equal(s.farmacos.length, 1);
});
