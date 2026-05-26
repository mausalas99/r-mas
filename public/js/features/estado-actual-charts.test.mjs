import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIoChartData, buildVitalsSeries } from './estado-actual-charts.mjs';

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
