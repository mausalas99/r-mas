import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncEaRegistroInsulinRescateFlag } from './estado-actual-panel-registro-io.mjs';
import { registerEstadoActualPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { setEaFormOpenPatientId } from './estado-actual-panel-core.mjs';
import { getMedRecetaByPatient } from '../app-state.mjs';

test('syncEaRegistroInsulinRescateFlag — prefers the captured form-open patient id over the live active id', () => {
  if (typeof document === 'undefined') return;
  var form = document.createElement('form');

  var recetaByPatient = getMedRecetaByPatient();
  Object.keys(recetaByPatient).forEach(function (k) { delete recetaByPatient[k]; });
  recetaByPatient.p1 = {
    items: [],
    pasteRaw: 'CUIDADOS\tRESCATE DE INSULINA\t180-220 4 UI, 221-250 6 UI\tPOR TURNO\tNW',
  }; // has rescates
  recetaByPatient.p2 = { items: [], pasteRaw: '' }; // no rescates

  registerEstadoActualPanelRuntime({
    getActiveId() {
      return 'p2'; // background sync switched the "active" patient
    },
  });
  setEaFormOpenPatientId('p1'); // form still open for p1

  syncEaRegistroInsulinRescateFlag(form);

  assert.equal(
    form.classList.contains('ea-form--no-insulin-rescates'),
    false,
    'debe usar la receta del paciente donde se abrió el formulario (p1), no la del paciente activo (p2)'
  );

  setEaFormOpenPatientId(null);
});
