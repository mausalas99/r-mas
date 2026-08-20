import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerNotaEvolucionRuntime,
  buildRenderModel,
  openNotaEvolucionPanel,
  mountNotaEvolucionPanel,
} from './nota-evolucion-panel.mjs';

test('registerNotaEvolucionRuntime merges the supplied context', () => {
  let toasted = null;
  registerNotaEvolucionRuntime({
    getActiveId: () => 'p1',
    getPatients: () => [{ id: 'p1' }],
    showToast: (msg, kind) => (toasted = { msg, kind }),
  });
  registerNotaEvolucionRuntime(null); // must not clobber the previous registration
  openNotaEvolucionPanel(); // no DOM backdrop present under the Electron test runner → no-op past the id check
  assert.equal(toasted, null); // an active id exists, so it should not have shown the "select a patient" toast
});

test('openNotaEvolucionPanel warns via showToast when no patient is active', () => {
  let toasted = null;
  registerNotaEvolucionRuntime({
    getActiveId: () => null,
    getPatients: () => [],
    showToast: (msg, kind) => (toasted = { msg, kind }),
  });
  openNotaEvolucionPanel();
  assert.deepEqual(toasted, { msg: 'Selecciona un paciente primero', kind: 'error' });
});

test('buildRenderModel exposes S/O/A/P derived from the patient state', () => {
  registerNotaEvolucionRuntime({ getActiveId: () => 'p1', getPatients: () => [], showToast: () => {} });
  const patient = { monitoreo: { notaEvolucion: { subjetivo: 'Refiere mejoría', analisis: 'Estable' } } };
  const model = buildRenderModel(patient);
  assert.equal(model.subjetivo, 'Refiere mejoría');
  assert.equal(model.analisis, 'Estable');
  assert.equal(model.objetivo.zones.length, 5); // N, V, HD, HI, NM always present (problem 3a)
  assert.ok(model.objetivo.zones.every((z) => typeof z.narrative === 'string')); // problem 3b
  assert.equal(model.plan.length, 5); // N, V, HD, HI, NM
});

test('buildRenderModel header: draft status before signing, "firmada" after', () => {
  registerNotaEvolucionRuntime({ getActiveId: () => 'p1', getPatients: () => [], showToast: () => {} });
  const patient = { nombre: 'Pérez García, Juan M.', cuarto: '214-B', monitoreo: {} };
  const draftModel = buildRenderModel(patient);
  assert.equal(draftModel.header.signed, false);
  assert.match(draftModel.header.context, /Pérez García/);
  assert.match(draftModel.header.metadata, /borrador/);

  const state = patient.monitoreo.notaEvolucion;
  const signedAt = '2026-08-19T08:11:00.000Z';
  state.signedAt = signedAt;
  const d = new Date(signedAt);
  const pad = (n) => String(n).padStart(2, '0');
  const expectedHHMM = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const signedModel = buildRenderModel(patient);
  assert.equal(signedModel.header.signed, true);
  assert.equal(signedModel.header.metadata, `firmada ${expectedHHMM}`);
});

/**
 * DOM-level regression coverage for `wireHeaderActions`'s sign flow — this
 * was previously ZERO (see Phase 5 correction notes): the screen shipped
 * with the sign button silently not doing what a resident expects to see
 * twice despite a passing screenshot check, because nothing asserted the
 * actual click → state → re-render chain. Mounts the real DOM the panel
 * builds and dispatches a real click, the way a resident would.
 */
test('clicking "Firmar y cerrar" (data-wb-primary) signs the note, toasts, and re-renders the header as firmada', () => {
  if (typeof document === 'undefined') return;
  const patient = { id: 'p1', nombre: 'Pérez García, Juan M.', cuarto: '214-B', monitoreo: {} };
  const toasts = [];
  registerNotaEvolucionRuntime({
    getActiveId: () => 'p1',
    getPatients: () => [patient],
    showToast: (msg, kind) => toasts.push({ msg, kind }),
  });
  const mount = document.createElement('div');
  mountNotaEvolucionPanel(mount);

  const signBtn = mount.querySelector('[data-wb-primary]');
  assert.ok(signBtn, 'the primary "Firmar y cerrar" button must be present in the mounted DOM');
  assert.equal(mount.querySelectorAll('[data-wb-primary]').length, 1, 'exactly one primary button');

  signBtn.click();

  assert.deepEqual(toasts, [{ msg: 'Nota firmada ✓', kind: 'success' }]);
  assert.equal(patient.monitoreo.notaEvolucion.signedAt != null, true, 'signNoteForPatient must have stamped signedAt');
  const metaAfter = mount.querySelector('.wb-mode-frame-meta');
  assert.ok(metaAfter && /^firmada \d{2}:\d{2}$/.test(metaAfter.textContent || ''), 'header must re-render to "firmada HH:MM"');
});

test('editing a Plan item\'s text in place persists it without needing add/remove (problem 4)', () => {
  if (typeof document === 'undefined') return;
  const patient = {
    id: 'p2',
    monitoreo: { notaEvolucion: { planZones: { HD: [{ id: 'x1', text: 'Continuar furosemida', mark: 'sin cambio' }] } } },
  };
  registerNotaEvolucionRuntime({ getActiveId: () => 'p2', getPatients: () => [patient], showToast: () => {} });
  const mount = document.createElement('div');
  mountNotaEvolucionPanel(mount);

  const editInput = mount.querySelector('[data-ne-plan-edit="x1"]');
  assert.ok(editInput, 'existing plan item text must render as an editable input, not a locked span');
  editInput.value = 'Suspender furosemida';
  editInput.dispatchEvent(new Event('input', { bubbles: true }));

  assert.equal(patient.monitoreo.notaEvolucion.planZones.HD[0].text, 'Suspender furosemida');
});

test('editing an Objetivo zone narrative persists the edit so the next render does not overwrite it (problem 3b)', () => {
  if (typeof document === 'undefined') return;
  const patient = { id: 'p3', monitoreo: {} };
  registerNotaEvolucionRuntime({ getActiveId: () => 'p3', getPatients: () => [patient], showToast: () => {} });
  const mount = document.createElement('div');
  mountNotaEvolucionPanel(mount);

  const narrativeEl = mount.querySelector('[data-ne-objetivo-narrative="N"]');
  assert.ok(narrativeEl, 'every zone, including one with no numeric vitals/labs, must still render its narrative field');
  narrativeEl.value = 'Alerta, orientado, sin foco neurológico nuevo.';
  narrativeEl.dispatchEvent(new Event('input', { bubbles: true }));

  assert.equal(patient.monitoreo.notaEvolucion.objetivoNarrativas.N, 'Alerta, orientado, sin foco neurológico nuevo.');

  // Re-render (as a Plan edit elsewhere would trigger) must not clobber the edit.
  const model = buildRenderModel(patient);
  const nZone = model.objetivo.zones.find((z) => z.id === 'N');
  assert.equal(nZone.narrative, 'Alerta, orientado, sin foco neurológico nuevo.');
});
