import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerNotaEvolucionRuntime,
  buildRenderModel,
  openNotaEvolucionPanel,
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
  assert.deepEqual(model.objetivo, { zones: [] });
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
