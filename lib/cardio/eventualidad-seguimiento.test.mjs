import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyEventualidadSeguimientoEntry,
  upsertEventualidadEntry,
  findEventualidadEntry,
  ensureEventualidadEntryForDate,
  listEventualidadDatesDesc,
} from './eventualidad-seguimiento.mjs';

test('emptyEventualidadSeguimientoEntry has the repeatable clinical sections, no intake-only fields', () => {
  const e = emptyEventualidadSeguimientoEntry();
  assert.equal(e.date, '');
  assert.deepEqual(Object.keys(e.exploracion).sort(), [
    'ascitisHepatomegalia', 'edemaMi', 'estertores', 'estertoresNota', 'fc', 'llenadoCapilar',
    'pvy', 'satO2', 'soplo', 'soploNota', 'ta', 'temperaturaExtremidades',
  ].sort());
  assert.equal(e.usPulmonar.campos.length, 8);
  assert.equal('motivoConsulta' in e, false);
  assert.equal('medicamentosPrevios' in e, false);
  assert.equal('tratamientoPrevio' in e, false);
});

test('upsertEventualidadEntry replaces same-date entry and sorts by date', () => {
  let list = [];
  list = upsertEventualidadEntry(list, { date: '2026-03-14', impresionDiagnostica: 'estable' });
  list = upsertEventualidadEntry(list, { date: '2026-01-10', impresionDiagnostica: 'descompensado' });
  list = upsertEventualidadEntry(list, { date: '2026-03-14', impresionDiagnostica: 'mejora' });
  assert.equal(list.length, 2);
  assert.equal(list[0].date, '2026-01-10');
  assert.equal(list[1].date, '2026-03-14');
  assert.equal(list[1].impresionDiagnostica, 'mejora');
});

test('upsertEventualidadEntry preserves sub-object fields omitted from update', () => {
  let list = [];
  list = upsertEventualidadEntry(list, { date: '2026-03-14', exploracion: { ta: '120/80', fc: 80 } });
  list = upsertEventualidadEntry(list, { date: '2026-03-14', exploracion: { fc: 90 } });
  assert.equal(list[0].exploracion.ta, '120/80');
  assert.equal(list[0].exploracion.fc, 90);
});

test('upsertEventualidadEntry preserves usPulmonar campos by index across partial updates', () => {
  let list = [];
  list = upsertEventualidadEntry(list, {
    date: '2026-03-14',
    usPulmonar: { campos: [{ lineasB: '1-2', derrame: true, consolidacion: false }] },
  });
  list = upsertEventualidadEntry(list, { date: '2026-03-14', usPulmonar: { nota: 'sin cambios' } });
  assert.equal(list[0].usPulmonar.campos[0].lineasB, '1-2');
  assert.equal(list[0].usPulmonar.nota, 'sin cambios');
  assert.equal(list[0].usPulmonar.campos.length, 8);
});

test('findEventualidadEntry / ensureEventualidadEntryForDate get-or-create, no seeding', () => {
  const patient = { cardio: { eventualidadesSeguimiento: [] } };
  assert.equal(findEventualidadEntry(patient.cardio, '2026-03-14'), null);
  const entry = ensureEventualidadEntryForDate(patient, '2026-03-14');
  assert.equal(entry.date, '2026-03-14');
  assert.equal(entry.impresionDiagnostica, '');
  assert.equal(ensureEventualidadEntryForDate(patient, '2026-03-14'), findEventualidadEntry(patient.cardio, '2026-03-14'));
});

test('listEventualidadDatesDesc sorts descending', () => {
  const cardio = { eventualidadesSeguimiento: [{ date: '2026-01-10' }, { date: '2026-03-14' }, { date: '2026-02-01' }] };
  assert.deepEqual(listEventualidadDatesDesc(cardio), ['2026-03-14', '2026-02-01', '2026-01-10']);
});
