import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAlignedVitalSeries,
  buildSharedVitalRows,
  scanEaChartsSummary,
} from './estado-actual-charts-series.mjs';

function at(h, m) {
  return new Date(2026, 9, 1, h, m).toISOString();
}

test('charts: every reading of a registro is a point, not only the last one', () => {
  var hist = [
    {
      recordedAt: at(10, 0),
      vitalSeries: {
        tas: [{ value: 118 }, { value: 150, time: '12:30' }, { value: 125 }],
        tad: [{ value: 74 }, { value: 95, time: '12:30' }],
        fc: [{ value: 80 }],
      },
    },
  ];
  var rows = buildSharedVitalRows(hist);
  assert.equal(rows.length, 3);
  var tas = buildAlignedVitalSeries(rows, 'tas');
  var tad = buildAlignedVitalSeries(rows, 'tad');
  assert.deepEqual(tas.values.slice().sort(), [118, 125, 150]);
  assert.deepEqual(tad.values.filter((v) => v != null).sort(), [74, 95]);
  assert.equal(tad.values.filter((v) => v == null).length, 1);
  // the 150 reading carries its «Alterado» time and is flagged
  var i150 = tas.values.indexOf(150);
  assert.equal(tas.altered[i150], true);
  assert.equal(new Date(rows[i150].recordedAt).getHours(), 12);
});

test('charts: points sort by time across registros and old rows still show', () => {
  var hist = [
    { recordedAt: at(14, 0), vitals: { tas: 130 } },
    { recordedAt: at(9, 0), vitals: { tas: 110, tad: 70 } },
  ];
  var rows = buildSharedVitalRows(hist);
  assert.deepEqual(buildAlignedVitalSeries(rows, 'tas').values, [110, 130]);
  assert.deepEqual(buildAlignedVitalSeries(rows, 'tad').values, [70, null]);
});

test('charts summary: one registro with two readings is enough to graph', () => {
  var m = {
    historial: [{ recordedAt: at(10, 0), vitalSeries: { fc: [{ value: 80 }, { value: 92 }] } }],
  };
  assert.equal(scanEaChartsSummary(m).vitalsReady, true);
});
