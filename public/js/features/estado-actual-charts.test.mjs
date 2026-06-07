import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEaChartsLayoutKey,
  buildEaChartsSignature,
  buildEaChartsSummary,
  buildGluSeries,
  buildIoChartData,
  buildVitalsSeries,
  updateEstadoActualChartsInPlace,
} from './estado-actual-charts.mjs';

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
  assert.deepEqual(s.values, [190, 280, 221, 136, 159]);
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

test('buildVitalsSeries collects numeric points with altered flags', () => {
  const hist = [
    { recordedAt: '2026-05-26T08:00:00.000Z', vitals: { fc: 82 } },
    { recordedAt: '2026-05-26T12:00:00.000Z', vitals: { fc: 120 }, alteredAt: { fc: '11:40' } },
  ];
  const s = buildVitalsSeries(hist, 'fc');
  assert.equal(s.values.length, 2);
  assert.equal(s.values[1], 120);
  assert.equal(s.alteredFlags[0], false);
  assert.equal(s.alteredFlags[1], true);
});

test('updateEstadoActualChartsInPlace patches datasets without remount', () => {
  const hist = [
    { recordedAt: '2026-05-26T06:00:00.000Z', vitals: { fc: 70 } },
    { recordedAt: '2026-05-26T12:00:00.000Z', vitals: { fc: 88 } },
  ];
  const monitoreo = { historial: hist };
  const layoutKey = buildEaChartsLayoutKey(monitoreo);
  const updates = [];
  const chart = {
    data: {
      labels: ['a', 'b'],
      datasets: [{ data: [70, 80], borderColor: '#000' }],
    },
    update(mode) {
      updates.push(mode);
    },
  };
  const mountEl = {
    _eaCharts: [chart],
    _eaChartSlotIds: ['vital:hemo'],
    _eaChartsLayoutKey: layoutKey,
    _eaChartsSig: 'stale',
  };
  hist[1].vitals.fc = 95;
  const ok = updateEstadoActualChartsInPlace(mountEl, monitoreo);
  assert.equal(ok, true);
  assert.equal(chart.data.datasets[0].data[1], 95);
  assert.deepEqual(updates, ['none']);
  assert.notEqual(buildEaChartsSignature(monitoreo), 'stale');
});
