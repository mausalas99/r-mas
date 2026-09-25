import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  censoColumnPercents,
  CENSO_COL_WEIGHTS,
  resolveCensoColWeights,
  censoCellHasContent,
} from './censo-table-columns.mjs';

test('censoColumnPercents suma 100 y coincide con pesos', () => {
  var cols = censoColumnPercents();
  assert.equal(cols.length, CENSO_COL_WEIGHTS.length);
  var sum = cols.reduce(function (s, c) {
    return s + c.pct;
  }, 0);
  assert.ok(Math.abs(sum - 100) < 0.01);
});

test('resolveCensoColWeights oculta accesos/cultivos/pend sin contenido', () => {
  var rows = [
    {
      pacienteNombre: 'PACIENTE A',
      labs: '09/08/2026 BH Hb 10',
      signosCol: 'TA: 120/80',
      ioCol: 'I: 500',
    },
  ];
  var cols = resolveCensoColWeights(rows);
  assert.equal(
    cols.some(function (c) {
      return c.key === 'accesos';
    }),
    false
  );
  assert.equal(
    cols.some(function (c) {
      return c.key === 'cultivos';
    }),
    false
  );
  assert.equal(
    cols.some(function (c) {
      return c.key === 'pend';
    }),
    false
  );
  var paciente = cols.find(function (c) {
    return c.key === 'paciente';
  });
  assert.ok(paciente.weight > 70);
});

test('resolveCensoColWeights conserva pend si hay pendientes', () => {
  var rows = [{ pendientes: 'Solicitar TC' }];
  var cols = resolveCensoColWeights(rows);
  assert.ok(
    cols.some(function (c) {
      return c.key === 'pend';
    })
  );
});

test('censoCellHasContent ignora guiones vacíos', () => {
  assert.equal(censoCellHasContent('—'), false);
  assert.equal(censoCellHasContent('CVC'), true);
});
