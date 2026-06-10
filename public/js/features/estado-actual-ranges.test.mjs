import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isVitalAltered,
  buildAlteredAtDefaults,
  isGluAltered,
  isGlucometriaMarkedAltered,
} from './estado-actual-ranges.mjs';

test('isVitalAltered flags out-of-range FR', () => {
  assert.equal(isVitalAltered('fr', 28), true);
  assert.equal(isVitalAltered('fr', 16), false);
});

test('isVitalAltered ignores empty values', () => {
  assert.equal(isVitalAltered('tas', ''), false);
  assert.equal(isVitalAltered('fc', null), false);
  assert.equal(isVitalAltered('sat', '   '), false);
});

test('isVitalAltered evaluates TA components separately', () => {
  assert.equal(isVitalAltered('tas', 88), true);
  assert.equal(isVitalAltered('tad', 52), true);
});

test('buildAlteredAtDefaults only includes altered keys', () => {
  const altered = buildAlteredAtDefaults({ fr: 28, fc: 80 }, '11:40');
  assert.equal(altered.fr, '11:40');
  assert.equal(altered.fc, undefined);
});

test('isGluAltered flags hypo and hyper', () => {
  assert.equal(isGluAltered(65), true);
  assert.equal(isGluAltered(200), true);
  assert.equal(isGluAltered(110), false);
});

test('isGlucometriaMarkedAltered respects manual flag', () => {
  assert.equal(isGlucometriaMarkedAltered({ value: 110, altered: true }), true);
  assert.equal(isGlucometriaMarkedAltered({ value: 110 }), false);
});
