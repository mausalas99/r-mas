import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyEchoStudy, upsertEchoStudy, latestTwoEchoStudies } from './hf-echo.mjs';

test('emptyEchoStudy has all measurement fields defaulted', () => {
  const e = emptyEchoStudy();
  assert.equal(e.date, '');
  assert.equal(e.fevi, null);
  assert.equal(e.vexus, '');
  assert.equal(e.tapse, null);
  assert.equal(e.nota, '');
});

test('upsertEchoStudy replaces same-day entry and sorts by date', () => {
  let list = [];
  list = upsertEchoStudy(list, { date: '2026-03-14', fevi: 35, vexus: '2' });
  list = upsertEchoStudy(list, { date: '2026-01-10', fevi: 30, vexus: '1' });
  list = upsertEchoStudy(list, { date: '2026-03-14', fevi: 40, vexus: '0' });
  assert.equal(list.length, 2);
  assert.equal(list[0].date, '2026-01-10');
  assert.equal(list[1].date, '2026-03-14');
  assert.equal(list[1].fevi, 40);
  assert.equal(list[1].vexus, '0');
});

test('upsertEchoStudy preserves fields omitted from update record', () => {
  let list = [];
  list = upsertEchoStudy(list, { date: '2026-03-14', fevi: 35, tapse: 1.8, nota: 'inicial' });
  list = upsertEchoStudy(list, { date: '2026-03-14', fevi: 38 });
  assert.equal(list[0].fevi, 38);
  assert.equal(list[0].tapse, 1.8);
  assert.equal(list[0].nota, 'inicial');
});

test('latestTwoEchoStudies returns most recent two by date', () => {
  let list = [];
  list = upsertEchoStudy(list, { date: '2026-01-10', fevi: 30 });
  list = upsertEchoStudy(list, { date: '2026-03-14', fevi: 40 });
  list = upsertEchoStudy(list, { date: '2026-02-01', fevi: 35 });
  const { previo, actual } = latestTwoEchoStudies(list);
  assert.equal(actual.date, '2026-03-14');
  assert.equal(previo.date, '2026-02-01');
});

test('latestTwoEchoStudies handles fewer than two entries', () => {
  assert.deepEqual(latestTwoEchoStudies([]), { actual: null, previo: null });
  const one = upsertEchoStudy([], { date: '2026-03-14', fevi: 40 });
  const result = latestTwoEchoStudies(one);
  assert.equal(result.actual.date, '2026-03-14');
  assert.equal(result.previo, null);
});
