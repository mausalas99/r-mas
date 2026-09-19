import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyScoreEntry, upsertScoreEntry, latestTwoScores } from './hf-scores.mjs';

test('emptyScoreEntry has all score fields null/empty', () => {
  const e = emptyScoreEntry();
  assert.equal(e.date, '');
  assert.equal(e.nyha, '');
  assert.equal(e.mlwhfq, null);
  assert.equal(e.kccq, null);
  assert.equal(e.sixMwtMeters, null);
  assert.equal(e.maggic, null);
  assert.equal(e.shfm, null);
  assert.equal(e.hfss, null);
});

test('upsertScoreEntry replaces same-day entry and sorts by date', () => {
  let list = [];
  list = upsertScoreEntry(list, { date: '2026-03-14', nyha: 'II', kccq: 60 });
  list = upsertScoreEntry(list, { date: '2026-01-10', nyha: 'III', kccq: 40 });
  list = upsertScoreEntry(list, { date: '2026-03-14', nyha: 'I', kccq: 80 });
  assert.equal(list.length, 2);
  assert.equal(list[0].date, '2026-01-10');
  assert.equal(list[1].date, '2026-03-14');
  assert.equal(list[1].nyha, 'I');
  assert.equal(list[1].kccq, 80);
});

test('upsertScoreEntry preserves fields omitted from update record', () => {
  let list = [];
  list = upsertScoreEntry(list, { date: '2026-03-14', nyha: 'II', maggic: 15 });
  list = upsertScoreEntry(list, { date: '2026-03-14', kccq: 55 });
  assert.equal(list[0].nyha, 'II');
  assert.equal(list[0].maggic, 15);
  assert.equal(list[0].kccq, 55);
});

test('latestTwoScores returns null previo when fewer than two entries', () => {
  assert.deepEqual(latestTwoScores([]), { actual: null, previo: null });
  const one = upsertScoreEntry([], { date: '2026-03-14', nyha: 'II' });
  const result = latestTwoScores(one);
  assert.equal(result.actual.date, '2026-03-14');
  assert.equal(result.previo, null);
});

test('latestTwoScores returns most recent two by date', () => {
  let list = [];
  list = upsertScoreEntry(list, { date: '2026-01-10', nyha: 'III' });
  list = upsertScoreEntry(list, { date: '2026-03-14', nyha: 'II' });
  list = upsertScoreEntry(list, { date: '2026-02-01', nyha: 'IV' });
  const { previo, actual } = latestTwoScores(list);
  assert.equal(actual.date, '2026-03-14');
  assert.equal(previo.date, '2026-02-01');
});
