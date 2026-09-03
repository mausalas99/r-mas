import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPatients } from '../app-state.mjs';
import { registerEstadoActualPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { buildRegistroFormMarkup } from './estado-actual-panel-registro.mjs';
import { registrarEstadoActualMedicion } from './estado-actual-panel-actions.mjs';
import { setEaFormOpenPatientId } from './estado-actual-panel-core.mjs';
import { editarEstadoActualMedicion, getEaRegistroEditId } from './estado-actual-panel-registro-edit.mjs';

test('getEaRegistroEditId — sin formulario no hay edición', () => {
  assert.equal(getEaRegistroEditId(null), '');
});

test('editarEstadoActualMedicion precarga la fila y registrar la reemplaza en sitio', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML =
    '<div id="ea-registro-backdrop"><div id="ea-registro-modal-body"></div></div>';
  document.getElementById('ea-registro-modal-body').innerHTML = buildRegistroFormMarkup();
  getPatients().length = 0;
  getPatients().push({
    id: 'p4',
    monitoreo: {
      historial: [
        {
          id: 'row-1',
          recordedAt: '2026-09-02T06:00:00.000Z',
          savedAt: '2026-09-02T07:00:00.000Z',
          vitals: { tas: 120 },
          vitalSeries: { tas: [{ value: 120 }] },
        },
      ],
      textoGuardado: { text: '', savedAt: null },
    },
  });
  registerEstadoActualPanelRuntime({
    getActiveId() {
      return 'p4';
    },
    showToast() {},
    getSettings() {
      return {};
    },
  });

  editarEstadoActualMedicion('row-1');
  var form = document.getElementById('ea-form');
  assert.equal(getEaRegistroEditId(form), 'row-1');
  var tas = document.querySelector('[data-ea-vital="tas"]');
  assert.equal(tas.value, '120');
  tas.value = '135';

  registrarEstadoActualMedicion();
  var hist = getPatients()[0].monitoreo.historial;
  assert.equal(hist.length, 1, 'editar no debe agregar una fila nueva');
  assert.equal(hist[0].id, 'row-1');
  assert.equal(hist[0].vitals.tas, 135);
  assert.equal(getEaRegistroEditId(form), '');
  setEaFormOpenPatientId(null);
});
