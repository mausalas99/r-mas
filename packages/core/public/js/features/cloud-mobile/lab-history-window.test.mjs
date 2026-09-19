import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOBILE_LAB_HISTORY_DAYS,
  filterLabHistorySetsForMobileReference,
  filterLabSidecarMapForMobileReference,
  isLabSetWithinMobileHistoryWindow,
  mobileLabHistoryCutoffMs,
} from './lab-history-window.mjs';

const NOW = new Date(2026, 7, 9, 14, 30, 0);

function daysAgo(n) {
  var d = new Date(NOW);
  d.setDate(d.getDate() - n);
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

describe('cloud-mobile lab-history-window', () => {
  it('keeps sets from the last 3 calendar days including today', () => {
    var sets = [
      { id: 'old', fecha: daysAgo(4) },
      { id: 'd2', fecha: daysAgo(2) },
      { id: 'today', fecha: daysAgo(0) },
    ];
    var out = filterLabHistorySetsForMobileReference(sets, { now: NOW, days: MOBILE_LAB_HISTORY_DAYS });
    assert.deepEqual(
      out.map(function (s) {
        return s.id;
      }),
      ['d2', 'today']
    );
  });

  it('keeps compound ids and sets without parseable fecha', () => {
    assert.equal(isLabSetWithinMobileHistoryWindow({ id: '1786294213340-0-1' }, NOW), true);
    assert.equal(isLabSetWithinMobileHistoryWindow({ id: 'x', resLabs: ['BH'] }, NOW), true);
    assert.equal(isLabSetWithinMobileHistoryWindow({ fecha: 'Anterior' }, NOW), false);
    assert.equal(isLabSetWithinMobileHistoryWindow({ id: 'migrated-anterior' }, NOW), false);
  });

  it('filters sidecar maps by set id', () => {
    var map = {
      keep: { id: 'keep', fecha: daysAgo(1) },
      drop: { id: 'drop', fecha: daysAgo(10) },
    };
    var out = filterLabSidecarMapForMobileReference(map, { now: NOW });
    assert.deepEqual(Object.keys(out), ['keep']);
  });

  it('mobileLabHistoryCutoffMs spans three local days', () => {
    var cutoff = mobileLabHistoryCutoffMs(NOW, 3);
    assert.equal(isLabSetWithinMobileHistoryWindow({ fecha: daysAgo(2) }, NOW), true);
    assert.equal(isLabSetWithinMobileHistoryWindow({ fecha: daysAgo(3) }, NOW), false);
    assert.ok(cutoff <= new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 2).getTime());
  });
});
