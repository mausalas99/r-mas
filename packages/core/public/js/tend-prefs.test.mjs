import test from 'node:test';
import assert from 'node:assert/strict';
import { toggleSpecInList } from './tend-prefs.mjs';

var hb = { sectionKey: 'BH', fieldKey: 'hb' };
var na = { sectionKey: 'ES', fieldKey: 'na' };

test('toggleSpecInList adds a missing spec at the end', () => {
  assert.deepEqual(toggleSpecInList([hb], na), [hb, na]);
});

test('toggleSpecInList removes a present spec, matching by section and field', () => {
  assert.deepEqual(toggleSpecInList([hb, na], { sectionKey: 'BH', fieldKey: 'hb', cardTitle: 'x' }), [na]);
});

test('toggleSpecInList keeps same field of another section', () => {
  var other = { sectionKey: 'GASES', fieldKey: 'hb' };
  assert.deepEqual(toggleSpecInList([hb], other), [hb, other]);
});

test('toggleSpecInList does not mutate its input', () => {
  var list = [hb];
  toggleSpecInList(list, na);
  assert.equal(list.length, 1);
});
