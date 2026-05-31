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
import { VANCO_LOAD_MAX_MG, VANCO_MAINT_MAX_MG } from './clinical-safety.mjs';

test('calcVancoDose 80 kg 25 mg/kg', () => {
  var r = calcVancoDose({ weightKg: 80, mgPerKg: 25 });
  assert.equal(r.totalMg, 2000);
  assert.equal(r.volumeCc, 400);
  assert.match(r.copyLine, /2000.*400.*GLUCOSADO/i);
});

test('calcVancoDose caps load at 3000 mg for obese patient', () => {
  var r = calcVancoDose({ weightKg: 160, mgPerKg: 25, maxMg: VANCO_LOAD_MAX_MG });
  assert.equal(r.totalMg, 3000);
  assert.match(r.copyLine, /tope 3000 mg/i);
});

test('calcVancoDose caps maintenance at 2250 mg', () => {
  var r = calcVancoDose({ weightKg: 160, mgPerKg: 17.5, maxMg: VANCO_MAINT_MAX_MG });
  assert.equal(r.totalMg, 2250);
});

test('calcVancoDose invalid weight returns null', () => {
  assert.equal(calcVancoDose({ weightKg: '', mgPerKg: 25 }), null);
  assert.equal(calcVancoDose({ weightKg: 70, mgPerKg: 0 }), null);
});

test('calcBicHuBalanceada bic px 10', () => {
  var r = calcBicHuBalanceada({ weightKg: 70, bicPx: 10 });
  assert.equal(r.meqTotal, Math.round((24 - 10) * 70 * 0.3));
  assert.equal(r.ampoules8_4Pct, Math.ceil(((24 - 10) * 70 * 0.3) / 50));
  assert.equal(r.thirds.length, 3);
});

test('calcBicHuBalanceada rejects bic at or above target', () => {
  assert.equal(calcBicHuBalanceada({ weightKg: 70, bicPx: 24 }), null);
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
