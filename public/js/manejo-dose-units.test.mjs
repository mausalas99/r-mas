import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcMcgMinFromPerKg,
  getDoseUnitMode,
  resolveProtocolWithDoseMode,
} from './manejo-dose-units.mjs';

test('calcMcgMinFromPerKg convierte rango por peso', () => {
  var r = calcMcgMinFromPerKg(80, 0.05, 0.1);
  assert.equal(r.mcgMinLow, 4);
  assert.equal(r.mcgMinHigh, 8);
  assert.match(r.copyLine, /4–8 mcg\/min/i);
});

test('resolveProtocolWithDoseMode aplica variante HU vs estándar', () => {
  var entry = {
    id: 'test',
    title: 'NORE',
    doseUnitSwitch: {
      perKgRange: [0.05, 0.1],
      hu: {
        copyTemplate: 'NORE HU 5 MCG/MIN',
        someFields: { infusionRateMlHr: '5 MCG/MIN' },
      },
      standard: {
        copyTemplate: 'NORE STD 0.05–0.1 MCG/KG/MIN',
        someFields: { infusionRateMlHr: '0.05–0.1 MCG/KG/MIN' },
      },
    },
  };
  assert.match(
    resolveProtocolWithDoseMode(entry, 'hu', 80).copyTemplate,
    /HU 5 MCG\/MIN/
  );
  var std = resolveProtocolWithDoseMode(entry, 'standard', 80);
  assert.match(std.copyTemplate, /0\.05–0\.1 MCG\/KG\/MIN/);
  assert.ok((std.notes || []).some(function (n) { return /4–8 mcg\/min/i.test(n); }));
});

test('getDoseUnitMode default es hu', () => {
  assert.equal(getDoseUnitMode(), 'hu');
});
