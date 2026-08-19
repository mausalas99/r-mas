import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyNotaEvolucion,
  ensureNotaEvolucion,
  addPlanItem,
  removePlanItem,
  cyclePlanItemMark,
  planZonesForRender,
  objetivoInputFromPatient,
  confirmObjetivoForPatient,
} from './nota-evolucion-state.mjs';
import { nextPlanMark } from './nota-evolucion-html.mjs';

test('ensureNotaEvolucion initializes state with one plan bucket per zone', () => {
  const patient = {};
  const state = ensureNotaEvolucion(patient);
  assert.equal(state.subjetivo, '');
  assert.equal(state.analisis, '');
  assert.deepEqual(Object.keys(state.planZones).sort(), ['HD', 'HI', 'N', 'NM', 'V']);
  assert.equal(patient.monitoreo.notaEvolucion, state);
});

test('ensureNotaEvolucion is idempotent and backfills missing zones on legacy data', () => {
  const patient = { monitoreo: { notaEvolucion: { subjetivo: 'x', planZones: { N: [{ id: 'a', text: 't', mark: 'novo' }] } } } };
  const state = ensureNotaEvolucion(patient);
  assert.equal(state.subjetivo, 'x');
  assert.equal(state.planZones.N.length, 1);
  assert.deepEqual(state.planZones.V, []);
});

test('ensureNotaEvolucion returns null for a non-object patient', () => {
  assert.equal(ensureNotaEvolucion(null), null);
});

test('addPlanItem appends a new item marked novo and ignores blank text', () => {
  const state = emptyNotaEvolucion();
  const item = addPlanItem(state, 'HD', '  Suspender furosemida  ');
  assert.equal(item.text, 'Suspender furosemida');
  assert.equal(item.mark, 'novo');
  assert.equal(state.planZones.HD.length, 1);
  assert.equal(addPlanItem(state, 'HD', '   '), null);
});

test('removePlanItem removes only the matching item', () => {
  const state = emptyNotaEvolucion();
  const a = addPlanItem(state, 'N', 'A');
  const b = addPlanItem(state, 'N', 'B');
  assert.equal(removePlanItem(state, 'N', a.id), true);
  assert.deepEqual(state.planZones.N.map((i) => i.id), [b.id]);
  assert.equal(removePlanItem(state, 'N', 'missing'), false);
});

test('cyclePlanItemMark advances the mark using the supplied cycle function', () => {
  const state = emptyNotaEvolucion();
  const item = addPlanItem(state, 'V', 'Retirar alto flujo');
  assert.equal(item.mark, 'novo');
  const next = cyclePlanItemMark(state, 'V', item.id, nextPlanMark);
  assert.equal(next, 'sin cambio');
  assert.equal(state.planZones.V[0].mark, 'sin cambio');
  assert.equal(cyclePlanItemMark(state, 'V', 'missing', nextPlanMark), null);
});

test('planZonesForRender returns every zone with a label, even when empty', () => {
  const state = emptyNotaEvolucion();
  addPlanItem(state, 'HD', 'Continuar antihipertensivo');
  const rendered = planZonesForRender(state);
  const hd = rendered.find((z) => z.id === 'HD');
  assert.equal(hd.label, 'Hemodinámico');
  assert.equal(hd.items.length, 1);
  const n = rendered.find((z) => z.id === 'N');
  assert.deepEqual(n.items, []);
});

test('objetivoInputFromPatient reads real vitals from monitoreo, never invents labs', () => {
  const patient = {
    monitoreo: {
      historial: [
        { id: '1', recordedAt: '2026-08-18T08:00:00.000Z', vitals: { fc: 110, tas: 100, tad: 60 } },
      ],
    },
  };
  const input = objetivoInputFromPatient(patient);
  assert.equal(input.vitals.fc, 110);
  assert.deepEqual(input.labs, []);
});

test('objetivoInputFromPatient tolerates a patient with no monitoreo at all', () => {
  const input = objetivoInputFromPatient({});
  assert.deepEqual(input.vitals, {});
  assert.deepEqual(input.labs, []);
});

test('confirmObjetivoForPatient derives from real vitals and persists a signed snapshot', () => {
  const fixed = new Date('2026-08-18T09:00:00.000Z');
  const patient = {
    monitoreo: {
      historial: [{ id: '1', recordedAt: '2026-08-18T08:00:00.000Z', vitals: { fc: 130 } }],
    },
  };
  const snapshot = confirmObjetivoForPatient(patient, { now: () => fixed });
  assert.equal(snapshot.confirmedAt, fixed.toISOString());
  assert.ok(snapshot.zones.some((z) => z.id === 'HD'));
  assert.equal(patient.monitoreo.notaEvolucion.objetivo, snapshot);
});

test('confirmObjetivoForPatient with no real data yields an empty, non-fabricated snapshot', () => {
  const patient = {};
  const snapshot = confirmObjetivoForPatient(patient);
  assert.deepEqual(snapshot.zones, []);
  assert.equal(snapshot.text, '');
});
