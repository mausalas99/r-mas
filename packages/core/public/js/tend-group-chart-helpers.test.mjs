import test from 'node:test';
import assert from 'node:assert/strict';
import { relativeToRange, spreadEndLabels, yScaleBoundsForDatasets } from './tend-group-chart-helpers.mjs';

test('relativeToRange: 0 = low limit, 100 = high limit, nulls kept', () => {
  assert.deepEqual(relativeToRange([12, 15, 18, null], [12, 18]), [0, 50, 100, null]);
});

test('relativeToRange: no usable range gives null', () => {
  assert.equal(relativeToRange([1, 2], null), null);
  assert.equal(relativeToRange([1, 2], [5, 5]), null);
  assert.equal(relativeToRange([1, 2], [9, 3]), null);
  assert.equal(relativeToRange([1, 2], [NaN, 3]), null);
});

test('relativeToRange: below low is negative, above high is over 100', () => {
  var out = relativeToRange([6, 24], [12, 18]);
  assert.equal(out[0], -100);
  assert.equal(out[1], 200);
});

test('spreadEndLabels: keeps order and min gap', () => {
  var ys = [100, 102, 101, 300];
  var out = spreadEndLabels(ys, 16);
  var order = [0, 2, 1, 3]; // ascending by input y
  for (var k = 1; k < order.length; k++) assert.ok(out[order[k]] - out[order[k - 1]] >= 16);
  assert.equal(out[3], 300);
  assert.equal(out[0], 100);
});

test('spreadEndLabels: bottom bound shifts the stack up, gap kept', () => {
  var out = spreadEndLabels([190, 195, 200], 16, 0, 200);
  assert.deepEqual(out, [168, 184, 200]);
});

test('spreadEndLabels: empty input', () => {
  assert.deepEqual(spreadEndLabels([], 16), []);
});

test('relative y bounds always include 0 and 100', () => {
  var b = yScaleBoundsForDatasets([{ data: [40, 60] }], 'relative');
  assert.ok(b.min <= 0 && b.max >= 100);
});
