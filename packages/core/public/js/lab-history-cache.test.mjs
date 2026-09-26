import test from 'node:test';
import assert from 'node:assert/strict';
import { downsampleTrendChartSeries } from './lab-history-cache.mjs';

test('downsampleTrendChartSeries — 180 days to ≤100 points keeps the one extreme day, ends and order', () => {
  const labels = Array.from({ length: 180 }, (_, i) => 'd' + i);
  const values = labels.map((_, i) => 12 + (i % 3) * 0.1);
  values[77] = 3.1;
  values[133] = 19.9;
  const out = downsampleTrendChartSeries(labels, values, 100);
  assert.ok(out.labels.length <= 100, String(out.labels.length));
  assert.ok(out.labels.includes('d77') && out.labels.includes('d133'));
  assert.equal(out.labels[0], 'd0');
  assert.equal(out.labels.at(-1), 'd179');
  const idx = out.labels.map((l) => Number(l.slice(1)));
  assert.deepEqual(idx, idx.slice().sort((a, b) => a - b));
  assert.equal(out.values[out.labels.indexOf('d77')], 3.1);
});

test('downsampleTrendChartSeries — short series unchanged', () => {
  const out = downsampleTrendChartSeries(['a', 'b'], [1, 2], 100);
  assert.deepEqual(out, { labels: ['a', 'b'], values: [1, 2] });
});
