import test from 'node:test';
import assert from 'node:assert/strict';
import { isBoxReady, isValueComplete, isTypedInput } from './patient-box-advance.mjs';

test('cuarto and cama ready at 2 or 3 chars', () => {
  assert.equal(isBoxReady({ key: 'cuarto', value: '4' }), false);
  assert.equal(isBoxReady({ key: 'cuarto', value: '44' }), true);
  assert.equal(isBoxReady({ key: 'cuarto', value: '4400' }), false);
  assert.equal(isBoxReady({ key: 'cama', value: '05' }), true);
});

test('registro ready only at 0000000-0', () => {
  assert.equal(isBoxReady({ isRegistro: true, value: '0000000-' }), false);
  assert.equal(isBoxReady({ isRegistro: true, value: '0000000-0' }), true);
});

test('TAS: 2 digits move only when x10 leaves the range', () => {
  assert.equal(isValueComplete('tas', '1'), false);
  assert.equal(isValueComplete('tas', '12'), false);
  assert.equal(isValueComplete('tas', '30'), false);
  assert.equal(isValueComplete('tas', '90'), true);
  assert.equal(isValueComplete('tas', '130'), true);
});

test('FC and Sat thresholds follow iOS', () => {
  assert.equal(isValueComplete('fc', '26'), true);
  assert.equal(isValueComplete('fc', '25'), false);
  assert.equal(isValueComplete('fc', '13'), false);
  assert.equal(isValueComplete('sat', '9'), false);
  assert.equal(isValueComplete('sat', '95'), true);
});

test('temp needs a decimal digit', () => {
  assert.equal(isValueComplete('temp', '36'), false);
  assert.equal(isValueComplete('temp', '36.5'), true);
});

test('deletes never count as typed input', () => {
  assert.equal(isTypedInput({ inputType: 'insertText' }), true);
  assert.equal(isTypedInput({ inputType: 'deleteContentBackward' }), false);
  assert.equal(isTypedInput({ inputType: 'insertFromPaste' }), true);
});
