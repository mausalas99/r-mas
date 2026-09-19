import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reselectIfActivePatientHidden } from './patients-scope.mjs';
import { registerPatientsRuntime, rt } from './patients-runtime-state.mjs';
import { setEaFormOpenPatientId } from './estado-actual-panel-core.mjs';

function setupBackdrop(isOpen) {
  if (typeof document === 'undefined') return;
  document.body.innerHTML = '<div id="ea-registro-backdrop"></div>';
  var backdrop = document.getElementById('ea-registro-backdrop');
  backdrop.classList.toggle('open', !!isOpen);
}

test('reselectIfActivePatientHidden — does not force-switch away from a patient with an open estado actual form', () => {
  if (typeof document === 'undefined') return;
  setupBackdrop(true);
  setEaFormOpenPatientId('p1');
  registerPatientsRuntime({
    getActiveId() {
      return 'p1';
    },
    setActiveId() {},
  });

  // p1 briefly not in the recomputed visible list (e.g. a background sync render).
  var switched = reselectIfActivePatientHidden([{ id: 'p2' }]);

  assert.equal(switched, false, 'no debe forzar cambio de paciente mientras el formulario sigue abierto');
  setEaFormOpenPatientId(null);
});

test('reselectIfActivePatientHidden — still reselects when no estado actual form is open', () => {
  if (typeof document === 'undefined') return;
  setupBackdrop(false);
  setEaFormOpenPatientId(null);
  var selectedId = null;
  registerPatientsRuntime({
    getActiveId() {
      return 'p1';
    },
    setActiveId(id) {
      selectedId = id;
    },
  });

  var switched = reselectIfActivePatientHidden([{ id: 'p2' }]);

  assert.equal(switched, true, 'debe reseleccionar cuando no hay formulario abierto');
});
