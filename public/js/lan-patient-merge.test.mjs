import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergePatientEntry,
  mergeLanPatientEntrySources,
  mergeLabHistorySets,
  entryMatchKey,
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
