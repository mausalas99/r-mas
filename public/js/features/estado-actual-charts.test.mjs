import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEaChartsLayoutKey,
  buildEaChartsSignature,
  buildIoChartData,
  buildVitalsSeries,
  updateEstadoActualChartsInPlace,
} from './estado-actual-charts.mjs';

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
