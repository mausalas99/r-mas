import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPatients } from '../app-state.mjs';
import { registerEstadoActualPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { buildRegistroFormMarkup } from './estado-actual-panel-registro.mjs';
import { registrarEstadoActualMedicion, ensureEaRegistroModalForm } from './estado-actual-panel-actions.mjs';
import { setEaFormOpenPatientId, getEaFormOpenPatientId } from './estado-actual-panel-core.mjs';

function setupRegistroDom() {
  document.body.innerHTML =
    '<div id="ea-registro-backdrop"><div id="ea-registro-modal-body"></div></div>';
  document.getElementById('ea-registro-modal-body').innerHTML = buildRegistroFormMarkup();
  var tas = document.querySelector('[data-ea-vital="tas"]');
  if (tas && 'value' in tas) tas.value = '120';
}

function stubRuntime(activeId) {
  var toasts = [];
  registerEstadoActualPanelRuntime({
    getActiveId() {
      return activeId;
    },
    showToast(msg, type) {
      toasts.push({ msg, type });
    },
    getSettings() {
      return {};
    },
  });
  return toasts;
}

test('registrarEstadoActualMedicion saves against the patient the form was opened for, not the live active id', () => {
  if (typeof document === 'undefined') return;
  setupRegistroDom();
  getPatients().length = 0;
  getPatients().push({ id: 'p1', peso: 70 }, { id: 'p2', peso: 80 });

  // Form was opened while p1 was active.
  stubRuntime('p1');
  setEaFormOpenPatientId('p1');

  // Background cloud sync silently switched the "active" patient to p2
  // while the form stayed open on p1.
  stubRuntime('p2');

  registrarEstadoActualMedicion();

  var p1 = getPatients().find(function (p) { return p.id === 'p1'; });
  var p2 = getPatients().find(function (p) { return p.id === 'p2'; });
  assert.equal(p1.monitoreo.historial.length, 1, 'medición debe guardarse en el paciente donde se abrió el formulario');
  assert.equal((p2.monitoreo && p2.monitoreo.historial.length) || 0, 0, 'no debe guardarse en el paciente activo equivocado');

  setEaFormOpenPatientId(null);
});

test('ensureEaRegistroModalForm captures the active patient id at open time', () => {
  if (typeof document === 'undefined') return;
  setupRegistroDom();
  getPatients().length = 0;
  getPatients().push({ id: 'p3' });
  stubRuntime('p3');

  ensureEaRegistroModalForm();

  assert.equal(getEaFormOpenPatientId(), 'p3');
  setEaFormOpenPatientId(null);
});
