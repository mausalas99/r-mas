import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLabSidecarsForMobilePull,
  isLabSetWithinMobileHistoryWindow,
} from './mobile-lab-window.js';

const NOW = new Date(2026, 7, 9, 10, 0, 0);

function daysAgo(n) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

describe('mobile-lab-window worker', () => {
  it('filters patient sidecar maps to recent sets', () => {
    const out = filterLabSidecarsForMobilePull(
      {
        p1: {
          recent: { id: 'recent', fecha: daysAgo(1) },
          stale: { id: 'stale', fecha: daysAgo(8) },
        },
      },
      NOW
    );
    assert.deepEqual(Object.keys(out.p1), ['recent']);
  });

  it('keeps compound ids and unknown fechas', () => {
    assert.equal(isLabSetWithinMobileHistoryWindow({ id: '1786294213340-0-1' }, NOW), true);
    assert.equal(isLabSetWithinMobileHistoryWindow({ id: 'orphan', resLabs: ['BH'] }, NOW), true);
  });

  it('rejects Anterior buckets', () => {
    assert.equal(isLabSetWithinMobileHistoryWindow({ fecha: 'Anterior' }, NOW), false);
  });
});
