import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAbx_ } from './med-receta-soap.mjs';

test('classifyAbx_ reconoce nombres completos que solo calzan por raíz truncada', () => {
  assert.equal(classifyAbx_('CEFTRIAXONA 1 G SOL INY 10 ML'), true);
  assert.equal(classifyAbx_('CEFTAZIDIMA 1 G'), true);
  assert.equal(classifyAbx_('CEFUROXIMA 750 MG'), true);
  assert.equal(classifyAbx_('CEFOTAXIMA 1 G'), true);
  assert.equal(classifyAbx_('LEVOFLOXACINO 750 MG'), true);
  assert.equal(classifyAbx_('CIPROFLOXACINO 400 MG'), true);
  assert.equal(classifyAbx_('MOXIFLOXACINO 400 MG'), true);
});

test('classifyAbx_ reconoce nombres exactos', () => {
  assert.equal(classifyAbx_('VANCOMICINA 1 G'), true);
  assert.equal(classifyAbx_('MEROPENEM 1 G'), true);
});

test('classifyAbx_ false para no antibióticos', () => {
  assert.equal(classifyAbx_('LOSARTAN 50 MG'), false);
  assert.equal(classifyAbx_('ATORVASTATINA 40 MG'), false);
});
