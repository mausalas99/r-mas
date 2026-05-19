import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergePatientEntry,
  mergeLanPatientEntrySources,
  mergeLabHistorySets,
  entryMatchKey,
  filterEntriesByPatientDeletes,
} from './lan-patient-merge.mjs';

test('entryMatchKey usa registro cuando existe', () => {
  assert.equal(entryMatchKey({ patient: { id: 'a', registro: '123' } }), 'reg:123');
  assert.equal(entryMatchKey({ patient: { id: 'a', registro: '' } }), 'id:a');
});

test('mergeLanPatientEntrySources une pacientes distintos sin borrar', () => {
  const merged = mergeLanPatientEntrySources([
    { entries: [{ patient: { id: 'p1', registro: 'A', nombre: 'UNO' }, note: { fecha: '01/01/2026' }, labHistory: [] }] },
    { entries: [{ patient: { id: 'p2', registro: 'B', nombre: 'DOS' }, note: { fecha: '02/01/2026' }, labHistory: [] }] },
  ]);
  assert.equal(merged.length, 2);
});

test('mergePatientEntry combina labHistory por id', () => {
  const a = {
    patient: { id: 'p1', registro: 'X', nombre: 'A' },
    note: {},
    labHistory: [{ id: '1', fecha: '01/01/2026', resLabs: ['Hb 10'] }],
  };
  const b = {
    patient: { id: 'p1', registro: 'X', nombre: 'A' },
    note: {},
    labHistory: [{ id: '2', fecha: '02/01/2026', resLabs: ['Hb 12'] }],
  };
  const m = mergePatientEntry(a, b);
  assert.equal(m.labHistory.length, 2);
});

test('mergeLabHistorySets gana el set más reciente con mismo id', () => {
  const out = mergeLabHistorySets(
    [{ id: '100', fecha: '01/01/2026', resLabs: ['viejo'] }],
    [{ id: '100', fecha: '10/01/2026', resLabs: ['nuevo'] }]
  );
  assert.equal(out.length, 1);
  assert.match(String(out[0].resLabs), /nuevo/);
});

test('mergePatientEntry fusiona pendientes por id', () => {
  const a = {
    patient: { id: 'p1', registro: 'R1' },
    todos: [{ id: 't1', text: 'viejo', updatedAt: '2026-01-01T00:00:00Z' }],
  };
  const b = {
    patient: { id: 'p1', registro: 'R1' },
    todos: [{ id: 't1', text: 'nuevo', updatedAt: '2026-01-15T00:00:00Z' }],
  };
  const m = mergePatientEntry(a, b);
  assert.equal(m.todos.length, 1);
  assert.equal(m.todos[0].text, 'nuevo');
});

test('mismo registro fusiona nota más reciente', () => {
  const merged = mergeLanPatientEntrySources([
    {
      entries: [
        {
          patient: { id: 'local', registro: 'R1', nombre: 'PAC' },
          note: { fecha: '01/01/2026', evolucion: 'vieja' },
          labHistory: [],
        },
      ],
    },
    {
      entries: [
        {
          patient: { id: 'remote', registro: 'R1', nombre: 'PAC' },
          note: { fecha: '15/01/2026', evolucion: 'nueva' },
          labHistory: [],
        },
      ],
    },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].note.evolucion, 'nueva');
});

test('filterEntriesByPatientDeletes quita entrada si delete es más reciente', () => {
  const entries = [
    {
      patient: { id: 'p1', registro: 'R1', nombre: 'PAC', lanUpdatedAt: '2026-05-16T08:00:00.000Z' },
      note: { fecha: '01/01/2026' },
      labHistory: [],
    },
  ];
  const filtered = filterEntriesByPatientDeletes(entries, [
    {
      id: 'p1',
      registro: 'R1',
      updatedAt: '2026-05-16T12:00:00.000Z',
      deleted: true,
    },
  ]);
  assert.equal(filtered.length, 0);
});
