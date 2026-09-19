import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOBILE_LAB_HISTORY_DAYS,
  filterLabHistorySetsForMobileReference,
  inferLabSetMsFromId,
  isLabSetWithinMobileHistoryWindow,
  parseLabSetFechaToMs,
  resolveLabSetMs,
} from './lab-mobile-history-window.mjs';

const NOW = new Date(2026, 7, 9, 14, 30, 0);

function daysAgo(n) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

describe('lab-mobile-history-window', () => {
  it('parses dd/mm/yyyy, ISO, and English month fechas', () => {
    assert.ok(parseLabSetFechaToMs(daysAgo(0), ''));
    assert.ok(parseLabSetFechaToMs('2026-08-09', ''));
    assert.ok(parseLabSetFechaToMs('Aug 09 2026', ''));
  });

  it('infers ms from compound lab set ids', () => {
    const ms = inferLabSetMsFromId({ id: '1785683680719-1-0' });
    assert.equal(ms, 1785683680719);
  });

  it('keeps sets with unknown fecha (synced from cloud)', () => {
    assert.equal(isLabSetWithinMobileHistoryWindow({ id: 'x', resLabs: ['BH'] }, NOW), true);
  });

  it('keeps sets from the last 3 calendar days including today', () => {
    const sets = [
      { id: 'old', fecha: daysAgo(4) },
      { id: 'd2', fecha: daysAgo(2) },
      { id: 'today', fecha: daysAgo(0) },
      { id: '1786294213340-0-1', resLabs: ['BH'] },
    ];
    const out = filterLabHistorySetsForMobileReference(sets, {
      now: NOW,
      days: MOBILE_LAB_HISTORY_DAYS,
    });
    assert.deepEqual(
      out.map(function (s) {
        return s.id;
      }),
      ['d2', 'today', '1786294213340-0-1']
    );
  });

  it('uses updatedAt when fecha is missing', () => {
    const ms = resolveLabSetMs({
      id: 'lab-x',
      updatedAt: NOW.toISOString(),
    });
    assert.ok(ms);
    assert.equal(isLabSetWithinMobileHistoryWindow({ id: 'lab-x', updatedAt: NOW.toISOString() }, NOW), true);
  });
});
