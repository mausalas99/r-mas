import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyNotaEvolucion,
  ensureNotaEvolucion,
  addPlanItem,
  removePlanItem,
  cyclePlanItemMark,
  editPlanItemText,
  planZonesForRender,
  objetivoInputFromPatient,
  objetivoPreviewForPatient,
  confirmObjetivoForPatient,
  defaultObjetivoNarrativesForPatient,
  setObjetivoNarrative,
  objetivoZonesForRender,
  signNoteForPatient,
  dayOfStayForPatient,
} from './nota-evolucion-state.mjs';
import { nextPlanMark } from './nota-evolucion-html.mjs';
import * as appState from '../../app-state.mjs';

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

test('addPlanItem appends a new item marked nuevo and ignores blank text', () => {
  const state = emptyNotaEvolucion();
  const item = addPlanItem(state, 'HD', '  Suspender furosemida  ');
  assert.equal(item.text, 'Suspender furosemida');
  assert.equal(item.mark, 'nuevo');
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
  assert.equal(item.mark, 'nuevo');
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

test('confirmObjetivoForPatient with no real data yields non-fabricated (empty-item) zones', () => {
  const patient = {};
  const snapshot = confirmObjetivoForPatient(patient);
  assert.equal(snapshot.zones.length, 5);
  assert.ok(snapshot.zones.every((z) => z.items.length === 0));
  assert.equal(snapshot.text, '');
});

/** DD/MM/YYYY for the real current day — labHistory day-matching runs off the real clock (see dayKeyFromLabSet). */
function todayFechaLab() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

test('objetivoInputFromPatient wires today\'s real altered lab values (paste-parsed "*" convention), never in-range ones by name', () => {
  const patient = { id: 'nota-lab-patient-1', monitoreo: {} };
  appState.setLabHistory({
    'nota-lab-patient-1': [
      { id: 'set-1', fecha: todayFechaLab(), hora: '08:00', resLabs: ['QS\tGlucosa 142* K 3.1*', 'BH\tHb 12.1'] },
    ],
  });
  try {
    const input = objetivoInputFromPatient(patient);
    const glucosa = input.labs.find((l) => /glucosa/i.test(l.label));
    assert.ok(glucosa, 'altered Glucosa lab should be wired in');
    assert.equal(glucosa.altered, true);
    assert.equal(glucosa.value, '142');
    assert.equal(input.labs.some((l) => /^hb$/i.test(l.label)), false, 'in-range Hb has no label to itemize, so it must not appear');
  } finally {
    appState.setLabHistory({});
  }
});

test('objetivoInputFromPatient labs-wiring makes the Objetivo zone actually populate (no more forced empty state)', () => {
  const patient = { id: 'nota-lab-patient-2', monitoreo: {} };
  appState.setLabHistory({
    'nota-lab-patient-2': [{ id: 'set-1', fecha: todayFechaLab(), hora: '08:00', resLabs: ['QS\tK 2.9*'] }],
  });
  try {
    const preview = objetivoPreviewForPatient(patient);
    const nm = preview.zones.find((z) => z.id === 'NM');
    assert.ok(nm, 'NM zone should populate from the altered K lab alone, with zero vitals');
    assert.equal(nm.items[0].altered, true);
  } finally {
    appState.setLabHistory({});
  }
});

test('objetivoPreviewForPatient is a pure live read — never mutates or persists state', () => {
  const patient = { monitoreo: { historial: [{ id: '1', recordedAt: new Date().toISOString(), vitals: { fc: 120 } }] } };
  const preview = objetivoPreviewForPatient(patient);
  assert.ok(preview.zones.some((z) => z.id === 'HD'));
  assert.equal(patient.monitoreo.notaEvolucion, undefined, 'preview must not create/write notaEvolucion state');
});

test('signNoteForPatient snapshots the live Objetivo and stamps signedAt', () => {
  const fixed = new Date('2026-08-18T09:00:00.000Z');
  const patient = { monitoreo: { historial: [{ id: '1', recordedAt: '2026-08-18T08:00:00.000Z', vitals: { fc: 130 } }] } };
  const state = signNoteForPatient(patient, { now: () => fixed });
  assert.equal(state.signedAt, fixed.toISOString());
  assert.ok(state.objetivo.zones.some((z) => z.id === 'HD'));
});

test('editPlanItemText edits an existing item in place and never fabricates a missing one', () => {
  const state = emptyNotaEvolucion();
  const item = addPlanItem(state, 'HD', 'Continuar furosemida');
  assert.equal(editPlanItemText(state, 'HD', item.id, 'Suspender furosemida'), true);
  assert.equal(state.planZones.HD[0].text, 'Suspender furosemida');
  assert.equal(editPlanItemText(state, 'HD', 'missing', 'x'), false);
});

test('defaultObjetivoNarrativesForPatient returns one string per zone (N/V/HD/HI/NM), never fabricating for a patient with no monitoreo', () => {
  const empty = defaultObjetivoNarrativesForPatient({});
  assert.deepEqual(Object.keys(empty).sort(), ['HD', 'HI', 'N', 'NM', 'V']);
  assert.ok(Object.values(empty).every((v) => v === ''));
});

test('defaultObjetivoNarrativesForPatient reuses the real Estado Actual clause-builders for a patient with monitoreo', () => {
  const patient = { monitoreo: { estadoClinico: { four: 15, esferas: 3 } } };
  const narratives = defaultObjetivoNarrativesForPatient(patient);
  // N's default comes from the same FOUR-score clause Estado Actual builds
  // (assembleSoapLines), not hand-typed copy.
  assert.match(narratives.N, /FOUR 15\/16/);
  assert.doesNotMatch(narratives.N, /^N:/, 'the leading "ZONE: " prefix must be stripped — the zone id already renders as the card label');
});

test('setObjetivoNarrative persists an edit; objetivoZonesForRender prefers it over the recomputed default', () => {
  const patient = { monitoreo: {} };
  const state = ensureNotaEvolucion(patient);
  const before = objetivoZonesForRender(state, patient);
  const nBefore = before.find((z) => z.id === 'N');
  assert.equal(typeof nBefore.narrative, 'string');

  setObjetivoNarrative(state, 'N', 'Texto editado por el residente.');
  const after = objetivoZonesForRender(state, patient);
  assert.equal(after.find((z) => z.id === 'N').narrative, 'Texto editado por el residente.');
});

test('objetivoZonesForRender always includes all 5 zones with a narrative field, even with zero vitals/labs', () => {
  const patient = { monitoreo: {} };
  const state = ensureNotaEvolucion(patient);
  const zones = objetivoZonesForRender(state, patient);
  assert.deepEqual(
    zones.map((z) => z.id),
    ['N', 'V', 'HD', 'HI', 'NM']
  );
  assert.ok(zones.every((z) => typeof z.narrative === 'string'));
});

test('dayOfStayForPatient computes from the real admission date, and is null without one (never fabricated)', () => {
  assert.equal(dayOfStayForPatient({}), null);
  // Noon UTC keeps this unambiguous across any real machine timezone.
  const now = new Date('2026-08-19T12:00:00.000Z');
  const admittedThreeDaysAgo = { registeredAt: '2026-08-17T12:00:00.000Z' };
  assert.equal(dayOfStayForPatient(admittedThreeDaysAgo, { now: () => now }), 3);
  const admittedToday = { registeredAt: '2026-08-19T12:00:00.000Z' };
  assert.equal(dayOfStayForPatient(admittedToday, { now: () => now }), 1);
});
