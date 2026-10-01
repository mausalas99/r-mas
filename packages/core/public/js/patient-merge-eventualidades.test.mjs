import test from 'node:test';
import assert from 'node:assert/strict';
import { withLiveEventualidadEntries } from './patient-merge-eventualidades.mjs';

const ev = (id, text = id) => ({ id, text, at: '2026-09-29T10:00:00.000Z' });
const ids = (s) => s.entries.map((e) => e.id);

test('keeps a peer entry pulled into RAM while the command was in flight', () => {
  const db = { entries: [ev('a')], labsText: '', updatedAt: '2026-09-29T10:00:02.000Z' };
  const live = { entries: [ev('b')], labsText: '', updatedAt: '2026-09-29T10:00:01.000Z' };
  const out = withLiveEventualidadEntries(db, live);
  assert.deepEqual(ids(out).sort(), ['a', 'b']);
  assert.equal(out.updatedAt, db.updatedAt);
});

test('same id: DB copy wins (holds our edit)', () => {
  const out = withLiveEventualidadEntries({ entries: [ev('a', 'new')] }, { entries: [ev('a', 'old')] });
  assert.equal(out.entries[0].text, 'new');
  assert.equal(out.entries.length, 1);
});

test('does not resurrect an id deleted on either side', () => {
  const del = { a: '2026-09-29T10:00:00.000Z' };
  assert.deepEqual(ids(withLiveEventualidadEntries({ entries: [], deletedIds: del }, { entries: [ev('a')] })), []);
  assert.deepEqual(ids(withLiveEventualidadEntries({ entries: [] }, { entries: [ev('a')], deletedIds: del })), []);
});

test('no live store or no extras returns the DB store untouched', () => {
  const db = { entries: [ev('a')] };
  assert.equal(withLiveEventualidadEntries(db, undefined), db);
  assert.equal(withLiveEventualidadEntries(db, { entries: [ev('a')] }), db);
});
