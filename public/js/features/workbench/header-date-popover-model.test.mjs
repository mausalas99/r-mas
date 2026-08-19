import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLabDaysForCalendar, dayKeyToIsoDate, isoDateKeyLocal } from './header-date-popover-model.mjs';

function set(id, fecha, hora, resLabs) {
  return { id, fecha, hora, resLabs };
}

describe('dayKeyToIsoDate', () => {
  it('zero-pads a lab-history day key into the calendar ISO form', () => {
    assert.equal(dayKeyToIsoDate('2026-8-5'), '2026-08-05');
    assert.equal(dayKeyToIsoDate('2026-12-31'), '2026-12-31');
  });

  it('returns null for the non-dated buckets', () => {
    assert.equal(dayKeyToIsoDate('Anterior'), null);
    assert.equal(dayKeyToIsoDate('unknown'), null);
  });
});

describe('isoDateKeyLocal', () => {
  it('formats a Date using local (not UTC) fields', () => {
    assert.equal(isoDateKeyLocal(new Date(2026, 7, 5)), '2026-08-05');
  });
});

describe('buildLabDaysForCalendar', () => {
  it('groups newest-first, labels "Hoy" for today, and counts altered chips per day', () => {
    const sets = [
      set('a', '17/08/2026', '07:00', ['BH\tHb 8.2* Hto 36', 'QS\tCr 1.1']),
      set('b', '16/08/2026', '07:00', ['BH\tHb 8.0*']),
      set('c', '15/08/2026', '07:00', ['BH\tHb 12.0']),
    ];
    const { labDays, loadedRangeLabel } = buildLabDaysForCalendar({ sets, todayIso: '2026-08-17' });

    assert.equal(labDays.length, 3);
    assert.equal(labDays[0].dayKey, '2026-8-17');
    assert.match(labDays[0].label, /^Hoy/);
    assert.equal(labDays[0].meta, '1 alterado');
    assert.equal(labDays[1].label.startsWith('Hoy'), false);
    assert.equal(labDays[1].meta, '1 alterado');
    assert.equal(labDays[2].meta, 'sin alterados');
    assert.equal(labDays[0].rawFecha, '17/08/2026');
    assert.match(loadedRangeLabel, /–/);
  });

  it('hasData() answers true only for ISO dates with lab data', () => {
    const sets = [set('a', '17/08/2026', '07:00', ['BH\tHb 8.2*'])];
    const { hasData } = buildLabDaysForCalendar({ sets, todayIso: '2026-08-17' });
    assert.equal(hasData('2026-08-17'), true);
    assert.equal(hasData('2026-08-16'), false);
  });

  it('returns an empty model when there are no lab sets', () => {
    const { labDays, loadedRangeLabel, hasData } = buildLabDaysForCalendar({ sets: [], todayIso: '2026-08-17' });
    assert.deepEqual(labDays, []);
    assert.equal(loadedRangeLabel, '');
    assert.equal(hasData('2026-08-17'), false);
  });

  it('excludes the "Anterior" bucket from the quick-nav rows', () => {
    const sets = [set('a', 'Anterior', '', ['BH\tHb 8.2*'])];
    const { labDays } = buildLabDaysForCalendar({ sets, todayIso: '2026-08-17' });
    assert.deepEqual(labDays, []);
  });
});
