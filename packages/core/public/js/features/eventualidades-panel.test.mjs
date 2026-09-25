import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendEventualidad,
  updateEventualidad,
  removeEventualidad,
  findEventualidadEntry,
  sortEntriesDesc,
  dayKeyFromIso,
  formatDayLabel,
  formatDaySubLabel,
  groupEntriesByDay,
  toEventualidadDateValue,
  eventualidadDateToIso,
  normalizeEventualidadText,
  getEventualidadesLabsText,
  setEventualidadesLabsText,
  mergeEventualidadesLabsText,
} from './eventualidades-panel.mjs';

test('normalizeEventualidadText uppercases clinical text', () => {
  assert.equal(normalizeEventualidadText('  náusea leve  '), 'NÁUSEA LEVE');
});

test('appendEventualidad adds id and ISO at', () => {
  const base = { entries: [] };
  const next = appendEventualidad(base, 'Caída en baño', 'client-1');
  assert.equal(next.entries.length, 1);
  assert.match(next.entries[0].id, /^ev_/);
  assert.ok(next.entries[0].at);
  assert.equal(next.entries[0].text, 'CAÍDA EN BAÑO');
  assert.equal(next.entries[0].clientId, 'client-1');
});

test('save path helpers: merge/set labsText never appends clinical entries', () => {
  const base = { entries: [{ id: 'ev_1', at: '2026-08-01T10:00:00.000Z', text: 'NOTA' }], labsText: '' };
  const set = setEventualidadesLabsText(base, 'EN LA BIOMETRÍA SE APRECIA ANEMIA');
  assert.equal(set.entries.length, 1);
  assert.equal(set.entries[0].id, 'ev_1');
  assert.match(set.labsText, /BIOMETRÍA/);
  const merged = mergeEventualidadesLabsText(set, 'QS GLUC 120');
  assert.equal(merged.entries.length, 1);
  assert.match(merged.labsText, /QS GLUC 120/);
});

test('appendEventualidad does not clear labsText', () => {
  const base = { entries: [], labsText: 'BH HB 9' };
  const next = appendEventualidad(base, 'Caída', 'c1');
  assert.equal(next.labsText, 'BH HB 9');
  assert.equal(next.entries.length, 1);
});

test('labsText helpers set / merge / preserve on append', () => {
  const base = { entries: [], labsText: 'BH Hb 9' };
  assert.equal(getEventualidadesLabsText(base), 'BH HB 9');
  const set = setEventualidadesLabsText(base, 'qs gluc 120');
  assert.equal(set.labsText, 'QS GLUC 120');
  assert.equal(set.entries.length, 0);
  const merged = mergeEventualidadesLabsText(set, 'BH Hb 9');
  assert.equal(merged.changed, true);
  assert.match(merged.labsText, /QS GLUC 120/);
  assert.match(merged.labsText, /BH HB 9/);
  const dup = mergeEventualidadesLabsText(merged, 'BH Hb 9');
  assert.equal(dup.changed, false);
  const withEntry = appendEventualidad(merged, 'Caída', 'c1');
  assert.equal(withEntry.labsText, merged.labsText);
  assert.equal(withEntry.entries.length, 1);
});

test('appendEventualidad accepts custom at', () => {
  const at = '2026-05-20T14:00:00.000Z';
  const next = appendEventualidad({ entries: [] }, 'Evento pasado', '', at);
  assert.equal(next.entries[0].at, at);
});

test('updateEventualidad changes text and date', () => {
  const base = {
    entries: [{ id: 'ev_x', at: '2026-05-20T10:00:00.000Z', text: 'antes' }],
  };
  const next = updateEventualidad(base, 'ev_x', {
    text: 'después',
    at: '2026-05-22T16:30:00.000Z',
  });
  assert.equal(next.entries[0].text, 'DESPUÉS');
  assert.equal(next.entries[0].at, '2026-05-22T16:30:00.000Z');
});

test('removeEventualidad drops entry by id', () => {
  const base = {
    entries: [
      { id: 'ev_a', at: '2026-01-01', text: 'a' },
      { id: 'ev_b', at: '2026-01-02', text: 'b' },
    ],
  };
  const next = removeEventualidad(base, 'ev_a');
  assert.equal(next.entries.length, 1);
  assert.equal(next.entries[0].id, 'ev_b');
  assert.ok(next.deletedIds && next.deletedIds.ev_a);
  assert.ok(next.updatedAt);
});

test('findEventualidadEntry returns row by id', () => {
  const store = { entries: [{ id: 'ev_a', at: '2026-01-01', text: 'x' }] };
  assert.equal(findEventualidadEntry(store, 'ev_a').text, 'x');
  assert.equal(findEventualidadEntry(store, 'missing'), null);
});

test('eventualidadDate round-trip', () => {
  assert.equal(toEventualidadDateValue('2026-05-26T08:15:00'), '2026-05-26');
  const iso = eventualidadDateToIso('2026-05-26');
  assert.equal(toEventualidadDateValue(iso), '2026-05-26');
});

test('appendEventualidad ignores empty text', () => {
  const base = { entries: [{ id: 'ev_a', at: '2026-01-01', text: 'x' }] };
  const next = appendEventualidad(base, '   ', 'c');
  assert.equal(next.entries.length, 1);
});

test('drive import loop accumulates eventualidades on store', () => {
  let store = { entries: [] };
  const incoming = [
    { at: '2026-06-02T12:00:00.000Z', text: 'NOTA UNO' },
    { at: '2026-06-01T12:00:00.000Z', text: 'NOTA DOS' },
  ];
  for (let i = 0; i < incoming.length; i += 1) {
    store = appendEventualidad(store, incoming[i].text, '', incoming[i].at);
  }
  assert.equal(store.entries.length, 2);
  assert.equal(store.entries[0].text, 'NOTA UNO');
  assert.equal(store.entries[1].text, 'NOTA DOS');
});

test('sortEntriesDesc newest first', () => {
  const entries = [
    { id: 'a', at: '2026-01-01T00:00:00.000Z', text: 'old' },
    { id: 'b', at: '2026-06-01T00:00:00.000Z', text: 'new' },
  ];
  assert.equal(sortEntriesDesc(entries)[0].id, 'b');
});

test('dayKeyFromIso uses local calendar day', () => {
  const key = dayKeyFromIso('2026-05-31T18:30:00.000Z');
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
});

test('formatDayLabel marks today', () => {
  const now = new Date('2026-05-31T12:00:00');
  assert.equal(formatDayLabel('2026-05-31', now), 'Hoy');
});

test('formatDaySubLabel adds calendar date for Hoy and Ayer', () => {
  const now = new Date('2026-05-31T12:00:00');
  assert.match(formatDaySubLabel('2026-05-31', now), /31/);
  assert.equal(formatDaySubLabel('2026-05-15', now), '');
});

test('groupEntriesByDay groups and orders newest day first', () => {
  const groups = groupEntriesByDay(
    [
      { id: 'a', at: '2026-05-30T10:00:00.000Z', text: 'ayer' },
      { id: 'b', at: '2026-05-31T08:00:00.000Z', text: 'hoy temprano' },
      { id: 'c', at: '2026-05-31T20:00:00.000Z', text: 'hoy tarde' },
    ],
    new Date('2026-05-31T22:00:00')
  );
  assert.ok(groups.length >= 1);
  const may31 = groups.find((g) => g.day === dayKeyFromIso('2026-05-31T12:00:00.000Z'));
  if (may31) {
    assert.equal(may31.entries[0].id, 'c');
    assert.equal(may31.entries.length, 2);
  }
});
