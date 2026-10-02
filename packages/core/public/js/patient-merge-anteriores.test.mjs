import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAnteriores, withMergedAnteriores, mergePatientDocuments, editAnterior, deleteAnterior, liveAnteriores } from './patient-merge.mjs';

const snap = (fecha, guardada, evolucion = '') => ({ fecha, guardada, evolucion });

test('union on fecha, newest guardada wins per fecha, newest first', () => {
  const a = [snap('02/10/2026', '2026-10-02T10:00:00.000Z', 'A-viejo'), snap('01/10/2026', '2026-10-01T09:00:00.000Z')];
  const b = [snap('02/10/2026', '2026-10-02T12:00:00.000Z', 'B-nuevo'), snap('30/09/2026', '2026-09-30T08:00:00.000Z')];
  const out = mergeAnteriores(a, b);
  assert.deepEqual(out.map((s) => s.fecha), ['02/10/2026', '01/10/2026', '30/09/2026']);
  assert.equal(out[0].evolucion, 'B-nuevo');
});

test('caps at 30 and keeps the newest', () => {
  const many = Array.from({ length: 40 }, (_, i) =>
    snap(`d${i}`, new Date(Date.UTC(2026, 0, 1 + i)).toISOString())
  );
  const out = mergeAnteriores(many.slice(0, 20), many.slice(20));
  assert.equal(out.length, 30);
  assert.equal(out[0].fecha, 'd39');
  assert.equal(out[29].fecha, 'd10');
});

test('a snapshot without fecha is keyed by the day of guardada', () => {
  const out = mergeAnteriores([snap('', '2026-10-02T10:00:00.000Z', 'x')], [snap('', '2026-10-02T11:00:00.000Z', 'y')]);
  assert.equal(out.length, 1);
  assert.equal(out[0].evolucion, 'y');
});

test('partial or older payload never erases local anteriores', () => {
  const local = { updatedAt: '2026-10-02T12:00:00.000Z', anteriores: [snap('02/10/2026', '2026-10-02T12:00:00.000Z')] };
  assert.equal(withMergedAnteriores(local, { updatedAt: '2026-10-01T00:00:00.000Z' }).anteriores.length, 1);
  assert.equal(withMergedAnteriores(local, { updatedAt: '2026-10-03T00:00:00.000Z', anteriores: [] }).anteriores.length, 1);
  assert.equal(withMergedAnteriores(local, null).anteriores.length, 1);
});

test('incoming winner keeps copies only the local side has', () => {
  const local = { updatedAt: '2026-10-01T00:00:00.000Z', evolucion: 'local', anteriores: [snap('01/10/2026', '2026-10-01T00:00:00.000Z')] };
  const incoming = { updatedAt: '2026-10-03T00:00:00.000Z', evolucion: 'remoto', anteriores: [snap('03/10/2026', '2026-10-03T00:00:00.000Z')] };
  const out = withMergedAnteriores(incoming, local);
  assert.equal(out.evolucion, 'remoto');
  assert.deepEqual(out.anteriores.map((s) => s.fecha), ['03/10/2026', '01/10/2026']);
});

test('no anteriores on either side adds none (no key churn)', () => {
  const doc = { updatedAt: 'x', evolucion: 'a' };
  assert.equal(withMergedAnteriores(doc, { evolucion: 'b' }), doc);
});

test('patient merge keeps anteriores from both nota copies', () => {
  const a = { note: { updatedAt: '2026-10-01T00:00:00.000Z', anteriores: [snap('01/10/2026', '2026-10-01T00:00:00.000Z')] }, indicaciones: {} };
  const b = { note: { updatedAt: '2026-10-03T00:00:00.000Z', anteriores: [snap('03/10/2026', '2026-10-03T00:00:00.000Z')] }, indicaciones: {} };
  const out = mergePatientDocuments(a, b);
  assert.deepEqual(out.note.anteriores.map((s) => s.fecha), ['03/10/2026', '01/10/2026']);
});

test('edit keeps fecha, moves guardada forward, and beats the other device\'s older copy', () => {
  const old = snap('02/10/2026', '2026-10-02T10:00:00.000Z', 'viejo');
  const doc = { anteriores: [old] };
  assert.equal(editAnterior(doc, '02/10/2026', { evolucion: 'corregido' }), true);
  assert.equal(doc.anteriores[0].evolucion, 'corregido');
  assert.equal(doc.anteriores[0].fecha, '02/10/2026');
  assert.ok(doc.anteriores[0].guardada > old.guardada);
  const merged = mergeAnteriores(doc.anteriores, [old]);
  assert.equal(merged[0].evolucion, 'corregido');
});

test('delete leaves a tombstone: hidden here, and the other device\'s older copy stays dead after a union', () => {
  const old = snap('02/10/2026', '2026-10-02T10:00:00.000Z', 'x');
  const doc = { anteriores: [old, snap('01/10/2026', '2026-10-01T10:00:00.000Z')] };
  assert.equal(deleteAnterior(doc, '02/10/2026'), true);
  assert.deepEqual(liveAnteriores(doc).map((s) => s.fecha), ['01/10/2026']);
  const merged = { anteriores: mergeAnteriores(doc.anteriores, [old]) };
  assert.deepEqual(liveAnteriores(merged).map((s) => s.fecha), ['01/10/2026']);
});

test('a new export on a deleted day brings the copy back', () => {
  const doc = { anteriores: [snap('02/10/2026', '2026-10-02T10:00:00.000Z')] };
  deleteAnterior(doc, '02/10/2026');
  const fresh = snap('02/10/2026', new Date(Date.now() + 5000).toISOString(), 'nuevo');
  doc.anteriores = mergeAnteriores([fresh], doc.anteriores);
  assert.equal(liveAnteriores(doc)[0].evolucion, 'nuevo');
});

test('edit or delete of an unknown key changes nothing', () => {
  const doc = { anteriores: [snap('02/10/2026', '2026-10-02T10:00:00.000Z')] };
  assert.equal(editAnterior(doc, 'nope', { evolucion: 'x' }), false);
  assert.equal(deleteAnterior(doc, 'nope'), false);
  assert.equal(liveAnteriores({}).length, 0);
});
