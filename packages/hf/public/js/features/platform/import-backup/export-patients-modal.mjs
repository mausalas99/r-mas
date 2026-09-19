/** Modal to pick multiple patients for JSON export (Ajustes → Exportar pacientes…). */
import { getPatients, persistClinicalState } from '../../../app-state.mjs';
import { esc } from '../../../dom-escape.mjs';
import { isTourDemoPatientId } from '../../../tour-demo-patient.mjs';
import { patientsVisibleInSidebar } from '../../patients-scope.mjs';
import { formatDateSlug, downloadJsonPayload, downloadBlob } from '../shared.mjs';
import { addAuditEntry } from '../audit.mjs';
import { getPlatformRuntime } from '../runtime.mjs';
import { hasProgramAdminPrivileges } from '../../../clinical-privileges.mjs';
import { clinicalSessionContext } from '../../../clinical-access-runtime.mjs';
import {
  buildPatientsSelectionExportPayload,
  sortPatientsForExportPicker,
} from './export-patients-selection.mjs';
import { buildIcRegistryRows } from '../../../../../lib/cardio/ic-registry-export.mjs';
import { buildIcRegistryLongRows } from '../../../../../lib/cardio/ic-registry-long-export.mjs';
import { buildXlsxWorkbook } from '../../../../../lib/cardio/xlsx-writer.mjs';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function downloadXlsx(bytes, fileName) {
  downloadBlob(new Blob([bytes], { type: XLSX_MIME }), fileName);
}

const rt = getPlatformRuntime();

/** IC registry CSV export is Admin-only (department head). */
export function canExportIcRegistryCsv() {
  return hasProgramAdminPrivileges(clinicalSessionContext.user);
}

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

function setExportButtonEnabled(btn, enabled) {
  if (!btn) return;
  btn.disabled = !enabled;
  btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  btn.style.opacity = enabled ? '' : '0.55';
  btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

function syncExportPatientsActions(backdrop) {
  var countEl = backdrop.querySelector('#export-patients-count');
  var ids = selectedPatientIdsFromBackdrop(backdrop);
  var n = ids.length;
  if (countEl) {
    countEl.textContent =
      n === 0
        ? 'Ningún paciente seleccionado'
        : n + ' paciente' + (n === 1 ? '' : 's') + ' seleccionado' + (n === 1 ? '' : 's');
  }
  setExportButtonEnabled(backdrop.querySelector('#export-patients-ok'), n > 0);
  setExportButtonEnabled(backdrop.querySelector('#export-patients-csv'), n > 0);
  setExportButtonEnabled(backdrop.querySelector('#export-patients-csv-long'), n > 0);
}

function closeExportPatientsModal(backdrop) {
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}

function buildExportPatientsListHtml(candidates, activeId) {
  return candidates
    .map(function (p) {
      var checked = p.id === activeId ? ' checked' : '';
      return (
        '<li style="margin:6px 0;">' +
        '<label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;">' +
        '<input type="checkbox" class="export-patients-cb" data-patient-id="' +
        esc(p.id) +
        '"' +
        checked +
        ' style="margin-top:3px;flex-shrink:0;" />' +
        '<span>' +
        esc(patientPickerLabel(p)) +
        '</span></label></li>'
      );
    })
    .join('');
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

async function runExportIcRegistryCsv(patientIds) {
  if (!canExportIcRegistryCsv()) {
    rt.showToast('Exportar la base IC requiere rango Admin.', 'error');
    return;
  }
  persistClinicalState();
  var idSet = new Set(patientIds);
  var patients = getPatients().filter(function (p) {
    return p && idSet.has(p.id);
  });
  if (!patients.length) {
    rt.showToast('No hay pacientes exportables en la selección.', 'error');
    return;
  }
  var built = buildIcRegistryRows(patients);
  var xlsx = await buildXlsxWorkbook([{ name: 'Registro IC', headers: built.headers, rows: built.rows }]);
  downloadXlsx(xlsx, 'R-plus-hf-registro-' + formatDateSlug(new Date()) + '.xlsx');
  addAuditEntry('ic-registry-csv-export', 'ok', patients.length, 'xlsx');
  var truncatedCount = Object.keys(built.truncatedByPatient).length;
  var msg = 'Exportados ' + patients.length + ' paciente' + (patients.length === 1 ? '' : 's');
  if (truncatedCount > 0) {
    msg += '; ' + truncatedCount + ' paciente' + (truncatedCount === 1 ? '' : 's') + ' con visitas no incluidas (excede columnas de la plantilla)';
  }
  rt.showToast(msg, 'success');
}

async function runExportIcRegistryLongCsv(patientIds) {
  if (!canExportIcRegistryCsv()) {
    rt.showToast('Exportar la base IC requiere rango Admin.', 'error');
    return;
  }
  persistClinicalState();
  var idSet = new Set(patientIds);
  var patients = getPatients().filter(function (p) {
    return p && idSet.has(p.id);
  });
  if (!patients.length) {
    rt.showToast('No hay pacientes exportables en la selección.', 'error');
    return;
  }
  var built = buildIcRegistryLongRows(patients);
  var slug = formatDateSlug(new Date());
  var xlsx = await buildXlsxWorkbook([
    { name: 'Pacientes', headers: built.pacientesHeaders, rows: built.pacientesRows },
    { name: 'Visitas', headers: built.visitasHeaders, rows: built.visitasRows },
  ]);
  downloadXlsx(xlsx, 'R-plus-hf-registro-' + slug + '.xlsx');
  addAuditEntry('ic-registry-long-csv-export', 'ok', patients.length, 'xlsx');
  rt.showToast(
    'Exportados ' + patients.length + ' paciente' + (patients.length === 1 ? '' : 's') + ' (2 hojas: Pacientes + Visitas)',
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
  backdrop.querySelector('#export-patients-csv')?.addEventListener('click', function () {
    var ids = selectedPatientIdsFromBackdrop(backdrop);
    if (!ids.length) return;
    closeExportPatientsModal(backdrop);
    void runExportIcRegistryCsv(ids);
  });
  backdrop.querySelector('#export-patients-csv-long')?.addEventListener('click', function () {
    var ids = selectedPatientIdsFromBackdrop(backdrop);
    if (!ids.length) return;
    closeExportPatientsModal(backdrop);
    void runExportIcRegistryLongCsv(ids);
  });
  backdrop.addEventListener('click', function (ev) {
    if (ev.target === backdrop) closeExportPatientsModal(backdrop);
  });
  syncExportPatientsActions(backdrop);
  if (!ordered.length) {
    setExportButtonEnabled(backdrop.querySelector('#export-patients-ok'), false);
    setExportButtonEnabled(backdrop.querySelector('#export-patients-csv'), false);
    setExportButtonEnabled(backdrop.querySelector('#export-patients-csv-long'), false);
  }
}

export function openExportPatientsModal() {
  var candidates = exportablePatientsForPicker();
  var canExportCsv = canExportIcRegistryCsv();
  var listHtml = candidates.length
    ? buildExportPatientsListHtml(candidates, rt.getActiveId())
    : '<li style="font-size:13px;color:var(--text-muted);">No hay pacientes exportables en el censo visible.</li>';
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10050;display:flex;align-items:center;justify-content:center;padding:16px;';
  backdrop.innerHTML =
    '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;">' +
    '<h3 style="margin:0 0 8px;">Exportar pacientes</h3>' +
    '<p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca los pacientes que quieres incluir. El archivo JSON se puede importar con <strong>Importar paciente…</strong> o <strong>Importar rango…</strong>.</p>' +
    '<div style="overflow-y:auto;flex:0 1 auto;max-height:42vh;padding-right:4px;">' +
    '<ul style="margin:0;padding-left:0;list-style:none;font-size:13px;">' +
    listHtml +
    '</ul></div>' +
    '<p id="export-patients-count" style="font-size:12px;color:var(--text-muted);margin:10px 0 6px;">Ningún paciente seleccionado</p>' +
    '<div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;">' +
    '<button type="button" id="export-patients-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todos</button>' +
    '<button type="button" id="export-patients-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todos</button>' +
    '<button type="button" id="export-patients-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button>' +
    (canExportCsv
      ? '<button type="button" id="export-patients-csv" disabled aria-disabled="true" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;color:var(--text);">Exportar base de datos IC (.xlsx)</button>' +
        '<button type="button" id="export-patients-csv-long" disabled aria-disabled="true" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;color:var(--text);">Exportar base de datos IC (formato largo, 2 hojas)</button>'
      : '') +
    '<button type="button" id="export-patients-ok" disabled aria-disabled="true" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Exportar JSON…</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  wireExportPatientsModal(backdrop, candidates);
}
