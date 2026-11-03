import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDoubtfulVital } from './vitals-doubt.mjs';

test('isDoubtfulVital — valores imposibles marcan dudoso', () => {
  assert.equal(isDoubtfulVital('fc', 2100), true);
  assert.equal(isDoubtfulVital('temp', 370), true);
  assert.equal(isDoubtfulVital('sat', 1200), true);
});

test('isDoubtfulVital — valores razonables y vacíos no marcan', () => {
  assert.equal(isDoubtfulVital('fc', 88), false);
  assert.equal(isDoubtfulVital('temp', '36.5'), false);
  assert.equal(isDoubtfulVital('tas', ''), false);
  assert.equal(isDoubtfulVital('tas', 'abc'), false);
});
