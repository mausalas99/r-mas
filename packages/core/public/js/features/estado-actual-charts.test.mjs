import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEaChartsSummary,
  buildGluSeries,
  buildIoChartData,
  stripMonitoreoChartRuntimeCache,
} from './estado-actual-charts.mjs';
import {
  buildAlignedVitalSeries,
  buildDailyBalanceSeries,
  buildEaAxisTicks,
} from './estado-actual-charts-series.mjs';

function gluHistRow(glucometrias) {
  return {
    recordedAt: new Date(2026, 5, 20, 0, 0, 0).toISOString(),
    glucometrias,
  };
}

test('buildGluSeries labels use actual reading datetime, not recordedAt midnight', () => {
  var hist = [
    {
      recordedAt: new Date(2026, 5, 20, 0, 0, 0).toISOString(),
      glucometrias: [
        { value: 171, time: '08:00' },
        { value: 243, time: '00:00' },
        { value: 110, time: '04:00' },
      ],
    },
  ];
  var s = buildGluSeries(hist, new Date(2026, 5, 20, 13, 25, 0), { forCharts: true });
  assert.match(s.labels[0], /^19\/06 08:00$/);
  assert.match(s.labels[1], /^20\/06 00:00$/);
  assert.match(s.labels[2], /^20\/06 04:00$/);
  assert.doesNotMatch(s.labels.join('|'), / · | - \d/);
});

test('stripMonitoreoChartRuntimeCache drops persisted chart caches', () => {
  /** @type {any} */
  var monitoreo = { historial: [], _eaChartBundle: {}, _eaChartBundleRev: 'x', _eaChartsSummary: {}, _eaChartsSummaryRev: 'x' };
  stripMonitoreoChartRuntimeCache(monitoreo);
  assert.deepEqual(Object.keys(monitoreo), ['historial']);
});

test('buildGluSeries includes all glucometrias when forCharts is true', () => {
  var now = new Date(2026, 5, 20, 13, 25, 0);
  var hist = [
    gluHistRow([
      { value: 171, time: '08:00' },
      { value: 125, time: '16:00' },
      { value: 243, time: '00:00' },
      { value: 110, time: '04:00' },
    ]),
  ];
  var s = buildGluSeries(hist, now, { forCharts: true });
  assert.deepEqual(s.values, [171, 125, 243, 110]);
});

test('buildGluSeries only plots glucometrias from yesterday 08:00 through today 00:00', () => {
  var now = new Date(2026, 4, 28, 8, 39, 0);
  var hist = [
    {
      recordedAt: new Date(2026, 4, 27, 17, 20, 0).toISOString(),
      glucometrias: [
        { value: 190, time: '08:00' },
        { value: 280, time: '10:00' },
        { value: 221, time: '16:00' },
        { value: 136, time: '20:00' },
      ],
    },
    {
      recordedAt: new Date(2026, 4, 28, 0, 0, 0).toISOString(),
      glucometrias: [
        { value: 159, time: '00:00' },
        { value: 135, time: '08:00' },
        { value: 191, time: '12:00' },
        { value: 194, time: '16:00' },
      ],
    },
  ];
  var s = buildGluSeries(hist, now);
  assert.deepEqual(s.values, [190, 135, 280, 221, 194, 136, 159]);
});

test('buildGluSeries registro window includes 08/16 from turn-close row after gluPointMs fix', () => {
  var now = new Date(2026, 5, 20, 13, 25, 0);
  var hist = [
    gluHistRow([
      { value: 171, time: '08:00' },
      { value: 125, time: '16:00' },
      { value: 243, time: '00:00' },
    ]),
  ];
  var s = buildGluSeries(hist, now);
  assert.deepEqual(s.values, [171, 125, 243]);
});

test('buildGluSeries includes glucometrias even when bombaInsulina is present', () => {
  var now = new Date(2026, 4, 28, 8, 39, 0);
  var hist = [
    {
      recordedAt: new Date(2026, 4, 27, 17, 20, 0).toISOString(),
      glucometrias: [
        { value: 190, time: '08:00' },
        { value: 136, time: '20:00' },
      ],
      bombaInsulina: [{ value: 175, time: '14:00', units: 2 }],
    },
  ];
  var s = buildGluSeries(hist, now);
  assert.deepEqual(s.values, [190, 175, 136]);
});

test('buildEaChartsSummary flags ready series with enough points', () => {
  const hist = [
    { recordedAt: '2026-05-26T06:00:00.000Z', vitals: { fc: 70, tas: 110 }, io: { ing: 500, egr: 300 } },
    { recordedAt: '2026-05-26T12:00:00.000Z', vitals: { fc: 88, tas: 118 }, io: { ing: 600, egr: 450 } },
  ];
  const summary = buildEaChartsSummary({ historial: hist });
  assert.equal(summary.measurementCount, 2);
  assert.equal(summary.vitalsReady, true);
  assert.equal(summary.ioReady, true);
});

test('buildIoChartData produces turn balance and global line', () => {
  const hist = [
    { recordedAt: '2026-05-26T06:00:00.000Z', io: { ing: 500, egr: 300 } },
    { recordedAt: '2026-05-26T14:00:00.000Z', io: { ing: 600, egr: 450 } },
  ];
  const d = buildIoChartData(hist);
  assert.equal(d.turnBalance[0], 200);
  assert.equal(d.globalBalance[1], 350);
});

test('buildAlignedVitalSeries keeps rows index-aligned with altered flags', () => {
  const rows = [
    { recordedAt: '2026-05-26T08:00:00.000Z', vitals: { fc: 82 } },
    { recordedAt: '2026-05-26T10:00:00.000Z', vitals: { tas: 120 } },
    { recordedAt: '2026-05-26T12:00:00.000Z', vitals: { fc: 120 }, alteredAt: { fc: '11:40' } },
  ];
  const s = buildAlignedVitalSeries(rows, 'fc');
  assert.deepEqual(s.values, [82, null, 120]);
  assert.deepEqual(s.altered, [false, false, true]);
});

test('buildAlignedVitalSeries out-of-range count uses the real clinical RANGES, not made-up thresholds', () => {
  const rows = [
    { recordedAt: '2026-05-26T08:00:00.000Z', vitals: { tas: 145 } }, // RANGES.tas.max = 140
    { recordedAt: '2026-05-26T10:00:00.000Z', vitals: { tas: 120 } }, // in range
    { recordedAt: '2026-05-26T12:00:00.000Z', vitals: { tas: 88 } }, // RANGES.tas.min = 90
  ];
  const s = buildAlignedVitalSeries(rows, 'tas');
  assert.deepEqual(s.altered, [true, false, true]);
  assert.equal(s.altered.filter(Boolean).length, 2);
});

test('buildEaAxisTicks writes each day once and the hour only on busy days', () => {
  const ticks = buildEaAxisTicks(['23/09 06:00', '23/09 14:00', '24/09 08:00', '25/09 08:00']);
  assert.deepEqual(ticks, [
    { day: '23/09', hour: '06:00' },
    { day: '', hour: '14:00' },
    { day: '24/09', hour: '' },
    { day: '25/09', hour: '' },
  ]);
});

test('buildDailyBalanceSeries sums per day and keeps a running total', () => {
  const hist = [
    { recordedAt: new Date(2026, 8, 23, 8).toISOString(), io: { ing: 1000, egr: 600 } },
    { recordedAt: new Date(2026, 8, 23, 20).toISOString(), io: { ing: 500, egr: 700 } },
    { recordedAt: new Date(2026, 8, 24, 8).toISOString(), io: { ing: 900, egr: 1200 } },
  ];
  const d = buildDailyBalanceSeries(hist);
  assert.deepEqual(d.days, ['23/09', '24/09']);
  assert.deepEqual(d.ing, [1500, 900]);
  assert.deepEqual(d.net, [200, -300]);
  assert.deepEqual(d.cumulative, [200, -100]);
});
