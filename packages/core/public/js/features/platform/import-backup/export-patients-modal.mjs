/** Modal to pick multiple patients for JSON export (Ajustes → Exportar pacientes…). */
import { getPatients, persistClinicalState } from '../../../app-state.mjs';
import { isTourDemoPatientId } from '../../../tour-demo-patient.mjs';
import { patientsVisibleInSidebar } from '../../patients-scope.mjs';
import { formatDateSlug, downloadJsonPayload } from '../shared.mjs';
import { addAuditEntry } from '../audit.mjs';
import { getPlatformRuntime } from '../runtime.mjs';
import {
  buildPatientsSelectionExportPayload,
  sortPatientsForExportPicker,
} from './export-patients-selection.mjs';

const rt = getPlatformRuntime();

function exportablePatientsForPicker() {
  var visible = patientsVisibleInSidebar();
  var source = visible.length ? visible : getPatients();
  return sortPatientsForExportPicker(
    source.filter(function (p) {
      return p && p.id && !isTourDemoPatientId(p.id, getPatients());
    })
  );
}

function patientPickerLabel(p) {
  var bed = [p.cuarto, p.cama].filter(Boolean).join('-');
  var reg = p.registro ? ' • ' + p.registro : '';
  var archived = p.archived ? ' (archivado)' : '';
  return (bed ? bed + ' — ' : '') + (p.nombre || 'Sin nombre') + reg + archived;
}

function selectedPatientIdsFromBackdrop(backdrop) {
  var ids = [];
  backdrop.querySelectorAll('.export-patients-cb:checked').forEach(function (cb) {
    var pid = cb.getAttribute('data-patient-id');
    if (pid) ids.push(pid);
  });
  return ids;
}

function syncExportPatientsActions(backdrop) {
  var countEl = backdrop.querySelector('#export-patients-count');
  var exportBtn = backdrop.querySelector('#export-patients-ok');
  var ids = selectedPatientIdsFromBackdrop(backdrop);
  var n = ids.length;
  if (countEl) {
    countEl.textContent =
      n === 0
        ? 'Ningún paciente seleccionado'
        : n + ' paciente' + (n === 1 ? '' : 's') + ' seleccionado' + (n === 1 ? '' : 's');
  }
  if (exportBtn) {
    exportBtn.disabled = n === 0;
    exportBtn.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
    exportBtn.style.opacity = n === 0 ? '0.55' : '';
    exportBtn.style.cursor = n === 0 ? 'not-allowed' : 'pointer';
  }
}

function closeExportPatientsModal(backdrop) {
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}

function exportPatientsItems(candidates, activeId) {
  return candidates.map(function (p) {
    return { id: p.id, label: patientPickerLabel(p), checked: p.id === activeId };
  });
}

function runExportPatientsSelection(patientIds) {
  persistClinicalState();
  var payload = buildPatientsSelectionExportPayload(patientIds);
  if (!payload.entries.length) {
    rt.showToast('No hay pacientes exportables en la selección.', 'error');
    return;
  }
  downloadJsonPayload(payload, 'R-plus-pacientes-' + formatDateSlug(new Date()) + '.json');
  addAuditEntry('selection-export', 'ok', payload.entries.length, payload.to);
  rt.showToast(
    'Exportados ' + payload.entries.length + ' paciente' + (payload.entries.length === 1 ? '' : 's'),
    'success'
  );
}

function wireExportPatientsModal(backdrop, candidates) {
  var ordered = candidates;
  backdrop.querySelector('#export-patients-all')?.addEventListener('click', function () {
    backdrop.querySelectorAll('.export-patients-cb').forEach(function (cb) {
      cb.checked = true;
    });
    syncExportPatientsActions(backdrop);
  });
  backdrop.querySelector('#export-patients-none')?.addEventListener('click', function () {
    backdrop.querySelectorAll('.export-patients-cb').forEach(function (cb) {
      cb.checked = false;
    });
    syncExportPatientsActions(backdrop);
  });
  backdrop.querySelector('#export-patients-cancel')?.addEventListener('click', function () {
    closeExportPatientsModal(backdrop);
  });
  backdrop.addEventListener('change', function (ev) {
    if (ev.target && ev.target.classList && ev.target.classList.contains('export-patients-cb')) {
      syncExportPatientsActions(backdrop);
    }
  });
  backdrop.querySelector('#export-patients-ok')?.addEventListener('click', function () {
    var ids = selectedPatientIdsFromBackdrop(backdrop);
    if (!ids.length) return;
    closeExportPatientsModal(backdrop);
    runExportPatientsSelection(ids);
  });
  backdrop.addEventListener('click', function (ev) {
    if (ev.target === backdrop) closeExportPatientsModal(backdrop);
  });
  syncExportPatientsActions(backdrop);
  if (!ordered.length) {
    var exportBtn = backdrop.querySelector('#export-patients-ok');
    if (exportBtn) exportBtn.disabled = true;
  }
}

export async function openExportPatientsModal() {
  var candidates = exportablePatientsForPicker();
  var view = await import('./export-patients-modal-view.jsx');
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;';
  view.drawExportPatientsModal(backdrop, { items: exportPatientsItems(candidates, rt.getActiveId()) });
  document.body.appendChild(backdrop);
  wireExportPatientsModal(backdrop, candidates);
}
