import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatInsulinRescatesClause } from './estado-actual-glu-rescue.mjs';

test('formatInsulinRescatesClause sin glucometrías', () => {
  assert.equal(formatInsulinRescatesClause([]), '');
  assert.equal(formatInsulinRescatesClause(null), '');
});

test('formatInsulinRescatesClause disponibles cuando no hay rescate', () => {
  const clause = formatInsulinRescatesClause([{ value: 140, time: '08:00' }]);
  assert.match(clause, /RESCATES DE INSULINA DISPONIBLES, NO APLICADOS ACTUALMENTE/);
});

test('formatInsulinRescatesClause aplicados con unidades y hora', () => {
  const clause = formatInsulinRescatesClause([
    { value: 220, time: '14:00', altered: true, rescueUnits: 4, postRescueValue: 168 },
    { value: 130, time: '20:00' },
  ]);
  assert.match(clause, /RESCATES DE INSULINA APLICADOS/);
  assert.match(clause, /4 U DE INSULINA RÁPIDA @ 14:00, DXT POST-RESCATE 168 MG\/DL/);
  assert.doesNotMatch(clause, /NO APLICADOS/);
});
