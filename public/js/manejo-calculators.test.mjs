import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcVancoDose,
  calcBicHuBalanceada,
  calcAlbuminParacentesis,
  calcHypertonicVolume,
  calcInsulinUnitsPerHour,
  calcLevetiracetamLoad,
} from './manejo-calculators.mjs';

test('calcVancoDose 80 kg 25 mg/kg', () => {
  var r = calcVancoDose({ weightKg: 80, mgPerKg: 25 });
  assert.equal(r.totalMg, 2000);
  assert.equal(r.volumeCc, 400);
  assert.match(r.copyLine, /2000.*400.*GLUCOSADO/i);
});

test('calcBicHuBalanceada bic px 10', () => {
  var r = calcBicHuBalanceada({ weightKg: 70, bicPx: 10 });
  assert.equal(r.meqTotal, Math.round((24 - 10) * 70 * 0.3 / 8.5));
  assert.equal(r.thirds.length, 3);
});

test('calcAlbuminParacentesis 12 L', () => {
  var r = calcAlbuminParacentesis({ litersRemoved: 12 });
  assert.equal(r.grams, 96);
  assert.equal(r.ampoules20pct, 10);
});

test('calcHypertonicVolume con peso', () => {
  assert.equal(calcHypertonicVolume({ weightKg: 70, useWeightRule: true }).volumeCc, 210);
});

test('calcInsulinUnitsPerHour 0.1 u/kg/h 60 kg', () => {
  assert.equal(calcInsulinUnitsPerHour({ weightKg: 60, unitsPerKgPerHour: 0.1 }).unitsPerHour, 6);
});

test('calcLevetiracetamLoad 70 kg', () => {
  assert.equal(calcLevetiracetamLoad({ weightKg: 70 }).totalMg, 4200);
});
