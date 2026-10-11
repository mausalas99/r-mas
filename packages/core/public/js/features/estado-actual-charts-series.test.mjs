import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAlignedVitalSeries,
  buildSharedVitalRows,
  formatChartLabel,
  scanEaChartsSummary,
} from './estado-actual-charts-series.mjs';
import {
  collectGlucometriasForRegistroWindow,
  formatEaVitalStampForSnapshot,
  getOpenShiftCloseAt,
  isOpenShiftRow,
  openShiftDefaultHm,
} from './estado-actual-registro-defaults.mjs';
import { collectVitalReadingsInRegistroWindow, mergeVitalSeriesFromHistorial } from './estado-actual-vital-series.mjs';
import { validateVitalSeriesTurnLimits } from './estado-actual-panel-vitals.mjs';
import { deriveIoFromHistorial_ } from './estado-actual-data-snapshot.mjs';
import { formatHistorialWhen } from './estado-actual-panel-snapshot-html.mjs';

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

test('charts: readings group by their own time, not by position', () => {
  var hist = [
    {
      recordedAt: new Date(2026, 9, 2, 0, 0).toISOString(),
      vitalSeries: {
        tas: [{ value: 110, time: '04:00' }],
        fc: [{ value: 80, time: '12:00' }, { value: 95, time: '16:00' }],
        sat: [{ value: 90, time: '16:00' }],
      },
    },
  ];
  var rows = buildSharedVitalRows(hist, ['tas', 'fc', 'sat']);
  assert.deepEqual(
    rows.map((r) => [new Date(r.recordedAt).getHours(), Object.keys(r.vitalPoint).sort().join(',')]),
    [[4, 'tas'], [12, 'fc'], [16, 'fc,sat']]
  );
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

// iPhone «Turno en curso (hoy)»: today = 07/10, the row closes tonight (08/10 00:00).
var NOW = new Date(2026, 9, 7, 15, 0);
var TONIGHT = new Date(2026, 9, 8, 0, 0);
var TODAY_CLOSE = new Date(2026, 9, 7, 0, 0);
var NEXT_MORNING = new Date(2026, 9, 8, 9, 0);

function openRow() {
  return {
    id: 'ios-1',
    recordedAt: TONIGHT.toISOString(),
    savedAt: NOW.toISOString(),
    vitalSeries: { fc: [{ value: 80, time: '08:00' }, { value: 92, time: '12:00' }] },
    glucometrias: [{ value: 110, time: '08:00' }, { value: 140, time: '20:00' }],
    io: { ing: 500, egr: 300, ingTurnos: ['500', 'NC', 'NC'] },
  };
}

test('open row: isOpenShiftRow while the day runs, closed shift next morning', () => {
  assert.equal(isOpenShiftRow(openRow(), NOW), true);
  assert.equal(isOpenShiftRow(openRow(), NEXT_MORNING), false);
  assert.equal(isOpenShiftRow({ recordedAt: new Date(2026, 9, 8, 15, 0).toISOString() }, NOW), false);
});

test('open row labels read today, not tomorrow', () => {
  var rec = openRow().recordedAt;
  assert.equal(formatHistorialWhen(rec, NOW), 'Turno en curso (hoy)');
  assert.equal(formatChartLabel(rec, NOW), '07/10 en curso');
  assert.equal(formatEaVitalStampForSnapshot(rec, '', NOW), '07/10');
  assert.equal(formatEaVitalStampForSnapshot(rec, '12:00', NOW), '07/10 12:00');
  assert.equal(formatHistorialWhen(rec, NEXT_MORNING), '08/10 00:00');
});

test('chart points land today at the sheet hours', () => {
  var pts = buildSharedVitalRows([openRow()], ['fc']);
  assert.deepEqual(
    pts.map(function (p) { return p.ms; }),
    [new Date(2026, 9, 7, 8, 0).getTime(), new Date(2026, 9, 7, 12, 0).getTime()]
  );
});

test('window and prefill follow the chosen close', () => {
  var hist = [openRow()];
  assert.deepEqual(collectVitalReadingsInRegistroWindow(hist, 'fc', TONIGHT).map((r) => r.value), [80, 92]);
  assert.deepEqual(collectVitalReadingsInRegistroWindow(hist, 'fc', TODAY_CLOSE), []);
  assert.deepEqual(mergeVitalSeriesFromHistorial(hist, 'fc', TONIGHT).map((r) => r.value), [80, 92]);
  assert.deepEqual(mergeVitalSeriesFromHistorial(hist, 'fc', NOW), []);
  assert.deepEqual(collectGlucometriasForRegistroWindow(hist, TONIGHT).map((g) => g.value), [110, 140]);
  // Next morning the default close (today 00:00) is that row: a normal closed shift.
  assert.deepEqual(mergeVitalSeriesFromHistorial(hist, 'fc', NEXT_MORNING).map((r) => r.value), [80, 92]);
  assert.deepEqual(collectVitalReadingsInRegistroWindow(hist, 'fc', NEXT_MORNING).map((r) => r.value), [80, 92]);
});

test('04:00 is the shift day, inside the window', () => {
  var row = { recordedAt: TODAY_CLOSE.toISOString(), vitalSeries: { fc: [{ value: 70, time: '04:00' }] } };
  assert.deepEqual(collectVitalReadingsInRegistroWindow([row], 'fc', TODAY_CLOSE).map((r) => r.value), [70]);
});

test('12:00 and 20:00 readings count in the 4-per-sign limit', () => {
  var row = {
    recordedAt: TODAY_CLOSE.toISOString(),
    vitalSeries: { fc: [{ value: 80, time: '08:00' }, { value: 92, time: '12:00' }, { value: 88, time: '16:00' }, { value: 85, time: '20:00' }] },
  };
  var res = validateVitalSeriesTurnLimits([row], { fc: [{ value: 99, time: '23:00' }] }, TODAY_CLOSE);
  assert.equal(res.ok, false);
});

test('balance skips the open row until midnight', () => {
  var closed = { recordedAt: TODAY_CLOSE.toISOString(), io: { ing: 1800, egr: 1200, evac: 'SI' } };
  assert.equal(deriveIoFromHistorial_([closed, openRow()], NOW).ing, 1800);
  assert.equal(deriveIoFromHistorial_([closed, openRow()], NEXT_MORNING).ing, 500);
});

test('desktop switch: close tonight and last past sheet hour', () => {
  assert.equal(getOpenShiftCloseAt(NOW).getTime(), TONIGHT.getTime());
  assert.equal(openShiftDefaultHm(NOW), '12:00');
  assert.equal(openShiftDefaultHm(new Date(2026, 9, 7, 23, 10)), '20:00');
  assert.equal(openShiftDefaultHm(new Date(2026, 9, 7, 8, 0)), '08:00');
});
