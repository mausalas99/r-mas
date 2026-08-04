/**
 * Sidebar bulk-select chrome (toggle + inset bottom action dock).
 */
import {
  exitPatientBulkSelectMode,
  getPatientBulkSelectedCount,
  isPatientBulkSelectMode,
  togglePatientBulkSelectMode,
} from './patients-bulk-select.mjs';
import { patientsBridge } from './patients-bridge.mjs';

export function syncPatientBulkBar() {
  var bar = document.getElementById('patient-bulk-bar');
  var countEl = document.getElementById('patient-bulk-bar-count');
  var toggleBtn = document.getElementById('btn-patient-bulk-select');
  var on = isPatientBulkSelectMode();
  var n = getPatientBulkSelectedCount();
  if (bar) bar.hidden = !on;
  if (countEl) {
    countEl.textContent =
      n === 1 ? '1 seleccionado' : n + ' seleccionados';
  }
  if (toggleBtn) {
    var label = on ? 'Terminar selección' : 'Seleccionar varios pacientes';
    toggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.setAttribute('title', label);
    toggleBtn.classList.toggle('btn-patient-bulk-select--on', on);
  }
  document.documentElement.classList.toggle('patient-bulk-select-mode', on);
}

export function togglePatientBulkSelect() {
  togglePatientBulkSelectMode();
  patientsBridge.renderPatientList();
  syncPatientBulkBar();
}

export function cancelPatientBulkSelect() {
  exitPatientBulkSelectMode();
  patientsBridge.renderPatientList();
  syncPatientBulkBar();
}
