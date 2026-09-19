import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCardioImageId, formatImageUsage, sumImageBytes } from './cardio-images.mjs';

test('newCardioImageId returns unique ids', () => {
  var a = newCardioImageId();
  var b = newCardioImageId();
  assert.notEqual(a, b);
  assert.match(a, /^ci_/);
});

test('formatImageUsage shows KB under 1MB, MB above', () => {
  assert.equal(formatImageUsage(500 * 1024), '500 KB');
  assert.equal(formatImageUsage(2.5 * 1024 * 1024), '2.5 MB');
  assert.equal(formatImageUsage(0), '0 KB');
});

test('sumImageBytes adds sizeBytes across records, ignores missing/invalid', () => {
  assert.equal(sumImageBytes([{ sizeBytes: 100 }, { sizeBytes: 250 }, {}, null]), 350);
  assert.equal(sumImageBytes([]), 0);
  assert.equal(sumImageBytes(null), 0);
});
