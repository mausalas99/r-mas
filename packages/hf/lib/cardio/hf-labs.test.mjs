import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyLabSnapshot,
  upsertLabSnapshot,
  latestTwoSnapshots,
  prefillFromImportedLabs,
} from './hf-labs.mjs';

test('emptyLabSnapshot has all values null-defaulted', () => {
  const s = emptyLabSnapshot();
  assert.equal(s.date, '');
  assert.equal(s.values.cr, null);
  assert.equal(s.values.ntProBnp, null);
  assert.equal(s.values.troponina, null);
  assert.equal(Object.keys(s.values).length, 23);
});

test('upsertLabSnapshot replaces same-day entry and sorts by date', () => {
  let list = [];
  list = upsertLabSnapshot(list, { date: '2026-03-14', values: { cr: 1.2, k: 4.1 } });
  list = upsertLabSnapshot(list, { date: '2026-01-10', values: { cr: 1.5 } });
  list = upsertLabSnapshot(list, { date: '2026-03-14', values: { cr: 1.1 } });
  assert.equal(list.length, 2);
  assert.equal(list[0].date, '2026-01-10');
  assert.equal(list[1].date, '2026-03-14');
  assert.equal(list[1].values.cr, 1.1);
});

test('upsertLabSnapshot preserves values omitted from update record', () => {
  let list = [];
  list = upsertLabSnapshot(list, { date: '2026-03-14', values: { cr: 1.2, k: 4.1 } });
  list = upsertLabSnapshot(list, { date: '2026-03-14', values: { cr: 1.0 } });
  assert.equal(list[0].values.cr, 1.0);
  assert.equal(list[0].values.k, 4.1);
});

test('latestTwoSnapshots returns most recent two by date', () => {
  let list = [];
  list = upsertLabSnapshot(list, { date: '2026-01-10', values: {} });
  list = upsertLabSnapshot(list, { date: '2026-03-14', values: {} });
  list = upsertLabSnapshot(list, { date: '2026-02-01', values: {} });
  const { previo, actual } = latestTwoSnapshots(list);
  assert.equal(actual.date, '2026-03-14');
  assert.equal(previo.date, '2026-02-01');
});

test('latestTwoSnapshots handles fewer than two entries', () => {
  assert.deepEqual(latestTwoSnapshots([]), { actual: null, previo: null });
});

test('prefillFromImportedLabs maps NT-proBNP from a direct label key', () => {
  const out = prefillFromImportedLabs({ valuesByKey: { 'NT-PROBNP': '4500*' } });
  assert.equal(out.ntProBnp, '4500*');
});

test('prefillFromImportedLabs maps NT-proBNP from a section|label key', () => {
  const out = prefillFromImportedLabs({ valuesByKey: { 'CARD|NT PROBNP': '1200' } });
  assert.equal(out.ntProBnp, '1200');
});

test('prefillFromImportedLabs leaves ntProBnp null when absent, no other guesses', () => {
  const out = prefillFromImportedLabs({ valuesByKey: { CREATININA: '1.2' } });
  assert.equal(out.ntProBnp, null);
  assert.equal(Object.keys(out).length, 1);
});

test('prefillFromImportedLabs handles missing labHistory', () => {
  assert.deepEqual(prefillFromImportedLabs(null), { ntProBnp: null });
  assert.deepEqual(prefillFromImportedLabs(undefined), { ntProBnp: null });
});
