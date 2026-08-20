import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLabTrendLookup } from './lab-trend-arrows.mjs';

function set(fecha, hora, parsedBySection) {
  return { fecha, hora, parsedBySection };
}

function assertTrend(actual, trend, delta) {
  assert.ok(actual, 'expected a trend result');
  assert.equal(actual.trend, trend);
  assert.ok(Math.abs(actual.delta - delta) < 1e-9, 'delta ' + actual.delta + ' ~= ' + delta);
}

test('buildLabTrendLookup: up when current > most recent prior value', () => {
  var history = [
    set('10/08/2026', '08:00', { QS: { Cr: 1.0 } }),
    set('12/08/2026', '08:00', { QS: { Cr: 1.4 } }),
  ];
  var current = set('14/08/2026', '08:00', { QS: { Cr: 2.1 } });
  var lookup = buildLabTrendLookup(history, current);
  assertTrend(lookup('QS', 'Cr'), 'up', 0.7);
});

test('buildLabTrendLookup: down when current < most recent prior value', () => {
  var history = [set('12/08/2026', '08:00', { BH: { Hb: 12.3 } })];
  var current = set('14/08/2026', '08:00', { BH: { Hb: 8.2 } });
  var lookup = buildLabTrendLookup(history, current);
  assertTrend(lookup('BH', 'Hb'), 'down', -4.1);
});

test('buildLabTrendLookup: skips prior sets with no value for the field', () => {
  var history = [
    set('11/08/2026', '08:00', { QS: {} }),
    set('12/08/2026', '08:00', { QS: { Cr: 1.4 } }),
  ];
  var current = set('14/08/2026', '08:00', { QS: { Cr: 2.1 } });
  var lookup = buildLabTrendLookup(history, current);
  assertTrend(lookup('QS', 'Cr'), 'up', 0.7);
});

test('buildLabTrendLookup: null when value unchanged', () => {
  var history = [set('12/08/2026', '08:00', { ESC: { K: 3.5 } })];
  var current = set('14/08/2026', '08:00', { ESC: { K: 3.5 } });
  var lookup = buildLabTrendLookup(history, current);
  assert.equal(lookup('ESC', 'K'), null);
});

test('buildLabTrendLookup: null when no prior history for that field', () => {
  var current = set('14/08/2026', '08:00', { QS: { Cr: 2.1 } });
  var lookup = buildLabTrendLookup([], current);
  assert.equal(lookup('QS', 'Cr'), null);
});

test('buildLabTrendLookup: null when current has no value for the field', () => {
  var history = [set('12/08/2026', '08:00', { QS: { Cr: 1.4 } })];
  var current = set('14/08/2026', '08:00', { QS: {} });
  var lookup = buildLabTrendLookup(history, current);
  assert.equal(lookup('QS', 'Cr'), null);
});

test('buildLabTrendLookup: ignores prior sets at or after current timestamp', () => {
  var history = [
    set('14/08/2026', '08:00', { QS: { Cr: 2.1 } }), // same set as current
    set('15/08/2026', '08:00', { QS: { Cr: 5.0 } }), // future, must be ignored
    set('10/08/2026', '08:00', { QS: { Cr: 1.0 } }),
  ];
  var current = set('14/08/2026', '08:00', { QS: { Cr: 2.1 } });
  var lookup = buildLabTrendLookup(history, current);
  assertTrend(lookup('QS', 'Cr'), 'up', 1.1);
});

test('buildLabTrendLookup: skips a same-day duplicate of the live current set to find the real prior day', () => {
  var history = [
    set('12/08/2026', '08:00', { BH: { Hb: 7.46 } }),
    set('14/08/2026', '07:00', { BH: { Hb: 6.75 } }), // today's own persisted record, earlier hora
  ];
  var current = set('14/08/2026', '09:00', { BH: { Hb: 6.75 } }); // live view, same day
  var lookup = buildLabTrendLookup(history, current);
  assertTrend(lookup('BH', 'Hb'), 'down', 6.75 - 7.46);
});

test('buildLabTrendLookup: no history/current given returns a null-safe lookup', () => {
  assert.equal(buildLabTrendLookup(null, null)('QS', 'Cr'), null);
  assert.equal(buildLabTrendLookup([], { parsedBySection: null })('QS', 'Cr'), null);
});
