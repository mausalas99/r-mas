import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isVitalAltered, buildAlteredAtDefaults } from './estado-actual-ranges.mjs';

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
