import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarLabs } from '../labs.js';
import { GASO_VENOSA_SOLO } from '../labs-procesar-fixtures.mjs';
import {
  classifyGasometryKind,
  gasometryKindSupportsPafi,
  resolveVentilatorioLabContext,
} from './estado-actual-ventilatorio-labs.mjs';
import { buildVentilatorioCalcHints } from './estado-actual-ventilatorio.mjs';

test('classifyGasometryKind — arterial vs venosa', () => {
  assert.equal(classifyGasometryKind('GASOMETRIA VENOSA PARCIAL', []), 'venous');
  assert.equal(classifyGasometryKind('GASOMETRIA ARTERIAL COMPLETA', []), 'arterial');
  assert.equal(classifyGasometryKind('GASOMETRIA CAPILAR', []), 'capillary');
  assert.equal(classifyGasometryKind('', []), 'unknown');
});

test('resolveVentilatorioLabContext — última gasometría del expediente', () => {
  var parsed = procesarLabs(GASO_VENOSA_SOLO);
  var pid = 'p-vent-1';
  var map = {
    [pid]: [
      {
        id: 'gaso-1',
        fecha: '08/05/26',
        hora: '06:43',
        sourceText: GASO_VENOSA_SOLO,
        resLabs: parsed.resLabs,
      },
    ],
  };
  var ctx = resolveVentilatorioLabContext(pid, map);
  assert.equal(ctx.kind, 'venous');
  assert.equal(ctx.pO2, 60);
  assert.equal(ctx.pCO2, 35);
  assert.match(ctx.sourceLabel, /venosa/i);
  assert.equal(gasometryKindSupportsPafi(ctx.kind), false);
});

test('buildVentilatorioCalcHints — PaFi solo con gasometría arterial; SpO₂ si venosa', () => {
  var arterialHints = buildVentilatorioCalcHints(
    { soporte: 'Ventilación mecánica', soporteFio2: 50 },
    {
      fr: 22,
      sat: 94,
      lab: { kind: 'arterial', pO2: 100, pCO2: 40, sourceLabel: 'Gasometría arterial · 08/05' },
    }
  );
  assert.ok(arterialHints.some(function (h) { return h.indexOf('PaFi 200') >= 0; }));
  assert.ok(arterialHints.some(function (h) { return h.indexOf('SpO₂/FiO₂') >= 0; }));

  var venousHints = buildVentilatorioCalcHints(
    { soporte: 'Alto flujo', soporteFio2: 60, soporteFlujoLmin: 50 },
    {
      fr: 20,
      sat: 96,
      lab: { kind: 'venous', pO2: 60, pCO2: 35, sourceLabel: 'Gasometría venosa · 08/05' },
    }
  );
  assert.ok(venousHints.some(function (h) { return /venosa: PaFi no válida/i.test(h); }));
  assert.ok(!venousHints.some(function (h) { return /^PaFi \d+/.test(h); }));
  assert.ok(venousHints.some(function (h) { return h.indexOf('SpO₂/FiO₂') >= 0; }));

  var aaHints = buildVentilatorioCalcHints(
    { soporte: 'Aire ambiente' },
    {
      fr: 22,
      sat: 96,
      lab: { kind: 'venous', pO2: 60, pCO2: 35, sourceLabel: 'Gasometría venosa · 08/05' },
    }
  );
  assert.equal(aaHints.length, 0);
});
