import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRetiCorregidoValue_,
  classifyRetiCorregido_,
  computeRetiCorregido_,
} from './labs-reticulocito-corregido.mjs';

test('RetC = Ret × (Hto / 45)', () => {
  // RetC = 4 × (30/45) = 2.666... → 2.67
  assert.equal(computeRetiCorregidoValue_('4', '30'), 4 * (30 / 45));
  assert.equal(computeRetiCorregido_('4', '30'), '2.67 (regenerativa)');
});

test('RetC ≥ 2 es regenerativa, < 2 es arregenerativa', () => {
  assert.equal(classifyRetiCorregido_(2), 'regenerativa');
  assert.equal(classifyRetiCorregido_(1.99), 'arregenerativa');
  // RetC = 1 × (30/45) = 0.67 → arregenerativa
  assert.equal(computeRetiCorregido_('1', '30'), '0.67 (arregenerativa)');
});

test('RetC es null/--- sin reticulocitos o hematocrito', () => {
  assert.equal(computeRetiCorregidoValue_('---', '30'), null);
  assert.equal(computeRetiCorregidoValue_('4', '---'), null);
  assert.equal(classifyRetiCorregido_(null), null);
  assert.equal(computeRetiCorregido_('4', '---'), '---');
});
