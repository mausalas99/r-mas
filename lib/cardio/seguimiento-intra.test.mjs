import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyRondaEntry, upsertRondaEntry } from './seguimiento-intra.mjs';

test('emptyRondaEntry has all daily-round fields defaulted', () => {
  const r = emptyRondaEntry();
  assert.equal(r.date, '');
  assert.equal(r.ta, '');
  assert.equal(r.fc, null);
  assert.equal(r.diuresis6h, null);
  assert.equal(r.plan, '');
  assert.equal(r.sixMwt, null);
});

test('upsertRondaEntry replaces same-day entry and sorts by date', () => {
  let list = [];
  list = upsertRondaEntry(list, { date: '2026-03-14', ta: '120/80', fc: 80 });
  list = upsertRondaEntry(list, { date: '2026-01-10', ta: '110/70' });
  list = upsertRondaEntry(list, { date: '2026-03-14', ta: '130/85', fc: 90 });
  assert.equal(list.length, 2);
  assert.equal(list[0].date, '2026-01-10');
  assert.equal(list[1].date, '2026-03-14');
  assert.equal(list[1].ta, '130/85');
  assert.equal(list[1].fc, 90);
});

test('upsertRondaEntry preserves fields omitted from update record', () => {
  let list = [];
  list = upsertRondaEntry(list, { date: '2026-03-14', ta: '120/80', plan: 'continuar diurético' });
  list = upsertRondaEntry(list, { date: '2026-03-14', fc: 88 });
  assert.equal(list[0].ta, '120/80');
  assert.equal(list[0].plan, 'continuar diurético');
  assert.equal(list[0].fc, 88);
});
