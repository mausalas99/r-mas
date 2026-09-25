import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCorrectedCalciumValue_, computeCorrectedCalcium_ } from './labs-calcium-corrected.mjs';

test('cCa = Ca + 0.8×(4 − Alb)', () => {
  // cCa = 8 + 0.8×(4−2) = 9.6
  assert.equal(computeCorrectedCalciumValue_('8', '2'), 9.6);
  assert.equal(computeCorrectedCalcium_('8', '2'), '9.6');
});

test('cCa fuera de rango 8.5–10.5 lleva *', () => {
  // cCa = 7 + 0.8×(4−1) = 9.4 (dentro de rango, sin *)
  assert.equal(computeCorrectedCalcium_('7', '1'), '9.4');
  // cCa = 7 + 0.8×(4−4) = 7 (bajo, con *)
  assert.equal(computeCorrectedCalcium_('7', '4'), '7*');
});

test('cCa es null sin calcio o albúmina', () => {
  assert.equal(computeCorrectedCalciumValue_('---', '2'), null);
  assert.equal(computeCorrectedCalciumValue_('8', '---'), null);
  assert.equal(computeCorrectedCalcium_('8', '---'), '---');
});
