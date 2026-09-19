/**
 * "Hoja IC" — Salida (Hospitalización) docx export. Fills the institutional
 * seguimiento-intrahospitalario template from `buildIcExportPayload`
 * (`lib/cardio/ic-export-payload.mjs`), which was already built and tested
 * but had no docx filler/UI consumer until this module + `lib/doc-generators/
 * ic-hoja.js` (ported from the Cardionotas sibling app, same schema shape).
 */
import { escHtml } from '../dom-escape.mjs';
import { findActivePatient } from './estado-actual-panel-core.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';
import {
  exportWithOutputDirFallback,
  guardMobileDocExport,
} from '../document-export-client.mjs';
import { buildIcExportPayload } from '../../../lib/cardio/ic-export-payload.mjs';

function mount() {
  return document.getElementById('hoja-ic-container');
}

function patientMetaHtml(patient) {
  return (
    '<p class="ea-muted">' +
    escHtml(patient.nombre || '') +
    (patient.registro ? ' · Registro ' + escHtml(patient.registro) : '') +
    '</p>'
  );
}

export function renderHojaIC() {
  var root = mount();
  if (!root) return;
  var patient = findActivePatient();
  if (!patient) {
    root.innerHTML = '<p class="ea-muted">Selecciona un paciente primero.</p>';
    return;
  }
  root.innerHTML =
    '<div class="hoja-ic-root rpc-form-stack">' +
    '<div class="hoja-ic-head" style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
    '<div><h3 class="hoja-ic-title">Hoja IC — seguimiento intrahospitalario</h3>' +
    patientMetaHtml(patient) +
    '</div>' +
    '<button type="button" class="btn-generate" id="btn-hoja-ic-export" data-hoja-ic-action="export">Exportar Hoja IC</button>' +
    '</div>' +
    '<p class="ea-muted">Genera el documento .docx con fenotipo, descongestión, congestión/POCUS, medicamentos y labs del día tal como están capturados en Estado actual.</p>' +
    '</div>';
  var btn = root.querySelector('[data-hoja-ic-action="export"]');
  if (btn) btn.addEventListener('click', generateHojaIc);
}

function generateHojaIc() {
  if (guardMobileDocExport()) return;
  var patient = findActivePatient();
  var rt = getEaPanelRuntime();
  if (!patient) {
    rt.showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var btn = document.getElementById('btn-hoja-ic-export');
  if (btn) btn.disabled = true;
  exportWithOutputDirFallback({
    url: '/generate-ic-hoja',
    buildPayload: function () {
      return { patient: patient, payload: buildIcExportPayload(patient) };
    },
    defaultFileName: 'hoja-ic.docx',
    selectOutputDir: function () {
      return window.electronAPI && window.electronAPI.selectOutputDir
        ? window.electronAPI.selectOutputDir()
        : Promise.resolve(undefined);
    },
    onSuccess: function (data) {
      var name = (data && (data.fileName || data.path)) || 'hoja-ic.docx';
      rt.showToast('Hoja IC guardada: ' + name, 'success');
    },
    onPrompt: function () {
      rt.showToast('Selecciona una carpeta para guardar el documento.', 'error');
    },
    onCancel: function () {
      rt.showToast('No se guardó el documento: no se eligió carpeta.', 'error');
    },
    onError: function (msg) {
      rt.showToast('Error: ' + msg, 'error');
    },
  })
    .catch(function () {
      rt.showToast('Error de conexión', 'error');
    })
    .finally(function () {
      var b = document.getElementById('btn-hoja-ic-export');
      if (b) b.disabled = false;
    });
}

export const hojaIcWindowHandlers = {};
