import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterHistoryByDateRange, applyTendGroupDateRange } from './tend-group-modal-open.mjs';

const historyDesc = [
  { fecha: '24/08/2026', hora: '08:00' },
  { fecha: '19/08/2026', hora: '08:00' },
  { fecha: '16/08/2026', hora: '08:00' },
  { fecha: '12/08/2026', hora: '08:00' },
];

test('filterHistoryByDateRange returns everything with no bounds', () => {
  assert.deepEqual(filterHistoryByDateRange(historyDesc, '', ''), historyDesc);
});

test('filterHistoryByDateRange keeps sets within an inclusive from/to range', () => {
  const out = filterHistoryByDateRange(historyDesc, '2026-08-16', '2026-08-19');
  assert.deepEqual(out, [historyDesc[1], historyDesc[2]]);
});

test('applyTendGroupDateRange re-derives historyDesc/historyAsc from the unfiltered full history', () => {
  const state = { historyDescFull: historyDesc, historyDesc: historyDesc.slice(), historyAsc: [] };
  applyTendGroupDateRange(state, '2026-08-16', '2026-08-19');
  assert.equal(state.rangeFrom, '2026-08-16');
  assert.equal(state.rangeTo, '2026-08-19');
  assert.deepEqual(state.historyDesc, [historyDesc[1], historyDesc[2]]);
  assert.deepEqual(state.historyAsc, [historyDesc[2], historyDesc[1]]);
});
