import { test } from 'node:test';
import assert from 'node:assert/strict';
import { yScaleBoundsForDatasets } from './tend-group-chart-helpers.mjs';

test('yScaleBoundsForDatasets extends the max past a threshold above the data range', () => {
  var datasets = [
    {
      data: [43, 34, 18, 25, 40],
      thresholds: [{ value: 50, label: 'Biopsias' }],
    },
  ];
  var bounds = yScaleBoundsForDatasets(datasets, 'absolute');
  assert.ok(bounds.max > 50, 'max should clear the threshold value, got ' + bounds.max);
});

test('yScaleBoundsForDatasets ignores thresholds when data already covers them', () => {
  var datasets = [
    {
      data: [10, 60, 30],
      thresholds: [{ value: 50, label: 'Biopsias' }],
    },
  ];
  var bounds = yScaleBoundsForDatasets(datasets, 'absolute');
  assert.ok(bounds.max >= 60, 'max should still cover the data max, got ' + bounds.max);
});
