/**
 * Bulk lab-repo update for mi equipo: sequential IPC + sidebar job queue.
 */
import { refreshRpcDateFields } from '../rpc-date-picker.mjs';
import { esc } from '../dom-escape.mjs';
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../clinical-access-runtime.mjs';
import { isPatientAssignedToJoinedTeam } from '../mobile-team-patient-scope.mjs';
import { patientsVisibleInSidebar } from './patients-scope.mjs';
import { registerLabPanelRuntime, rt } from './lab-panel-runtime-state.mjs';
import { buildBulkLabPreview, LAB_BULK_PATIENT_SEPARATOR } from '../lab-bulk-paste.mjs';
import { labRepoFetchRangeFromDateInputs } from './lab-repo-import.mjs';
import {
  buildLabRepoPreviewBlocks,
  buildLabRepoBulkText,
  shouldSilentImportLabRepo,
} from './lab-repo-import-gate.mjs';
import { openLabBulkPreviewModal } from './lab-bulk-preview-modal.mjs';
import { finalizeBulkLabPaste } from './lab-panel-workbench.mjs';
import {
  buildLabRepoBatchRows,
  selectedLabRepoBatchRows,
  setAllSelectableLabRepoBatchRows,
  setLabRepoBatchRowSelected,
  formatLabRepoBatchSummaryToast,
  classifyLabRepoBatchFetch,
  buildLabRepoBatchJobs,
  setLabRepoBatchJobStatus,
  abortPendingLabRepoBatchJobs,
  labRepoBatchJobStatusLabel,
  jobStatusFromFetchKind,
} from './lab-repo-batch-model.mjs';

/** @type {import('./lab-repo-batch-model.mjs').LabRepoBatchRow[]} */
var batchRows = [];
/** @type {import('./lab-repo-batch-model.mjs').LabRepoBatchJob[]} */
var batchJobs = [];
var batchBusy = false;
var batchAbort = false;
/** @type {ReturnType<typeof setTimeout> | null} */
var queueAutoDismissTimer = null;
var QUEUE_AUTO_DISMISS_MS = 1600;

function clearQueueAutoDismiss() {
  if (queueAutoDismissTimer == null) return;
  clearTimeout(queueAutoDismissTimer);
  queueAutoDismissTimer = null;
}

function scheduleQueueAutoDismiss() {
  clearQueueAutoDismiss();
  queueAutoDismissTimer = setTimeout(function () {
    queueAutoDismissTimer = null;
    if (batchBusy) return;
    batchJobs = [];
    renderSidebarQueue();
  }, QUEUE_AUTO_DISMISS_MS);
}

function defaultDateRange() {
  var hasta = new Date();
  hasta.setHours(0, 0, 0, 0);
  var desde = new Date(hasta);
  desde.setDate(desde.getDate() - 2);
  return { desde: desde, hasta: hasta };
}

function toDateInputValue(d) {
  var pad = function (n) {
    return String(n).padStart(2, '0');
  };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function syncLabRepoDateField(input) {
  if (!input) return;
  input.dispatchEvent(new Event('rpc-date-refresh'));
}

function teamPatients() {
  if (typeof rt.getLabRepoBatchTeamPatients === 'function') {
    return rt.getLabRepoBatchTeamPatients() || [];
  }
  var user = clinicalSessionContext.user;
  var scope = getClinicalScopeContextForEvaluate();
  if (!user || !user.user_id) return [];
  var userId = String(user.user_id);
  var census =
    typeof rt.getLabRepoBatchCensusPatients === 'function'
      ? rt.getLabRepoBatchCensusPatients() || []
      : patientsVisibleInSidebar() || [];
  return census.filter(function (p) {
    return p && isPatientAssignedToJoinedTeam(String(p.id), scope, userId);
  });
}

function renderBatchList() {
  var list = document.getElementById('lab-repo-batch-list');
  if (!list) return;
  if (!batchRows.length) {
    list.innerHTML =
      '<p class="lab-repo-batch-empty">No hay pacientes en tu equipo (o aún no hay asignaciones).</p>';
    return;
  }
  list.innerHTML = batchRows
    .map(function (r) {
      var disabled = !r.hasRegistro || batchBusy;
      var meta = r.hasRegistro
        ? 'Reg. ' + esc(r.registro) + (r.hint ? ' · ' + esc(r.hint) : '')
        : 'Sin registro — se omite';
      return (
        '<label class="lab-repo-batch-row' +
        (r.hasRegistro ? '' : ' lab-repo-batch-row--disabled') +
        '">' +
        '<input type="checkbox" class="lab-repo-batch-check" data-patient-id="' +
        esc(r.id) +
        '"' +
        (r.selected ? ' checked' : '') +
        (disabled ? ' disabled' : '') +
        ' />' +
        '<span class="lab-repo-batch-row-text">' +
        '<span class="lab-repo-batch-row-name">' +
        esc(r.nombre) +
        '</span>' +
        '<span class="lab-repo-batch-row-meta">' +
        meta +
        '</span>' +
        '</span>' +
        '</label>'
      );
    })
    .join('');
}

function syncBatchCount() {
  var el = document.getElementById('lab-repo-batch-count');
  if (!el) return;
  var selected = selectedLabRepoBatchRows(batchRows).length;
  var noReg = batchRows.filter(function (r) {
    return r && !r.hasRegistro;
  }).length;
  var parts = [selected + ' seleccionado' + (selected === 1 ? '' : 's')];
  if (noReg) parts.push(noReg + ' sin registro');
  el.textContent = parts.join(' · ');
}

function setBatchProgress(text, visible) {
  var el = document.getElementById('lab-repo-batch-progress');
  if (!el) return;
  el.hidden = !visible;
  el.textContent = text || '';
}

function jobStatusClass(status) {
  if (status === 'ok') return 'lab-repo-batch-job--ok';
  if (status === 'empty') return 'lab-repo-batch-job--empty';
  if (status === 'error') return 'lab-repo-batch-job--error';
  if (status === 'running') return 'lab-repo-batch-job--running';
  if (status === 'aborted') return 'lab-repo-batch-job--aborted';
  return 'lab-repo-batch-job--pending';
}

function renderSidebarQueue() {
  var root = document.getElementById('lab-repo-batch-queue');
  var list = document.getElementById('lab-repo-batch-queue-list');
  var meta = document.getElementById('lab-repo-batch-queue-meta');
  var stopBtn = document.getElementById('lab-repo-batch-queue-stop');
  if (!root || !list) return;

  if (!batchJobs.length) {
    root.hidden = true;
    return;
  }

  root.hidden = false;
  var done = batchJobs.filter(function (j) {
    return j.status !== 'pending' && j.status !== 'running';
  }).length;
  if (meta) {
    meta.textContent = done + '/' + batchJobs.length;
  }
  if (stopBtn) {
    stopBtn.hidden = !batchBusy;
    stopBtn.disabled = !batchBusy;
  }

  list.innerHTML = batchJobs
    .map(function (j) {
      return (
        '<li class="lab-repo-batch-job ' +
        jobStatusClass(j.status) +
        '">' +
        '<span class="lab-repo-batch-job-name">' +
        esc(j.nombre) +
        '</span>' +
        '<span class="lab-repo-batch-job-status">' +
        esc(labRepoBatchJobStatusLabel(j.status)) +
        '</span>' +
        '</li>'
      );
    })
    .join('');
}

function showSidebarQueue(jobs) {
  batchJobs = jobs || [];
  renderSidebarQueue();
}

function updateJobStatus(patientId, status) {
  batchJobs = setLabRepoBatchJobStatus(batchJobs, patientId, status);
  renderSidebarQueue();
}

function setBatchBusy(busy) {
  batchBusy = !!busy;
  var btn = document.getElementById('lab-repo-batch-confirm');
  var cancel = document.getElementById('lab-repo-batch-cancel');
  var selectAll = document.getElementById('lab-repo-batch-select-all');
  var selectNone = document.getElementById('lab-repo-batch-select-none');
  if (btn) {
    btn.disabled = busy;
    btn.setAttribute('aria-disabled', busy ? 'true' : 'false');
    btn.textContent = busy ? 'Actualizando…' : 'Actualizar';
  }
  if (cancel) {
    cancel.textContent = busy ? 'Detener' : 'Cancelar';
  }
  if (selectAll) selectAll.disabled = busy;
  if (selectNone) selectNone.disabled = busy;
  renderBatchList();
  renderSidebarQueue();
}

function onBatchListClick(e) {
  var t = e.target;
  if (!t || !t.classList || !t.classList.contains('lab-repo-batch-check')) return;
  if (batchBusy) return;
  var id = t.getAttribute('data-patient-id');
  batchRows = setLabRepoBatchRowSelected(batchRows, id, !!t.checked);
  syncBatchCount();
}

function wireBatchModalOnce() {
  var list = document.getElementById('lab-repo-batch-list');
  if (list && !list.dataset.wired) {
    list.dataset.wired = '1';
    list.addEventListener('change', onBatchListClick);
  }
  var dismiss = document.getElementById('lab-repo-batch-queue-dismiss');
  if (dismiss && !dismiss.dataset.wired) {
    dismiss.dataset.wired = '1';
    dismiss.addEventListener('click', dismissLabRepoBatchQueue);
  }
  var stopBtn = document.getElementById('lab-repo-batch-queue-stop');
  if (stopBtn && !stopBtn.dataset.wired) {
    stopBtn.dataset.wired = '1';
    stopBtn.addEventListener('click', function () {
      if (!batchBusy) return;
      batchAbort = true;
      rt.showToast('Deteniendo actualización…', 'info');
    });
  }
}

export function registerLabRepoBatchImportRuntime(ctx) {
  registerLabPanelRuntime(ctx);
}

export function dismissLabRepoBatchQueue() {
  if (batchBusy) {
    rt.showToast('Espera a que termine o pulsa Detener', 'info');
    return;
  }
  clearQueueAutoDismiss();
  batchJobs = [];
  renderSidebarQueue();
}

export function openLabRepoBatchModal() {
  var modal = document.getElementById('lab-repo-batch-modal');
  if (!modal) return;
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== 'function') {
    rt.showToast('Actualización masiva solo en la app de escritorio', 'warn');
    return;
  }
  if (batchBusy) {
    rt.showToast('Ya hay una actualización en curso — mira la cola en la barra lateral', 'info');
    return;
  }

  wireBatchModalOnce();
  batchAbort = false;

  var range = defaultDateRange();
  var desdeEl = document.getElementById('lab-repo-batch-desde');
  var hastaEl = document.getElementById('lab-repo-batch-hasta');
  refreshRpcDateFields(modal);
  if (desdeEl && hastaEl) {
    desdeEl.value = toDateInputValue(range.desde);
    hastaEl.value = toDateInputValue(range.hasta);
    syncLabRepoDateField(desdeEl);
    syncLabRepoDateField(hastaEl);
  }

  batchRows = buildLabRepoBatchRows(teamPatients(), { defaultSelectWithRegistro: true });
  setBatchProgress('', false);
  setBatchBusy(false);
  syncBatchCount();

  modal.hidden = false;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

export function closeLabRepoBatchModal() {
  if (batchBusy) {
    batchAbort = true;
    rt.showToast('Deteniendo actualización…', 'info');
    return;
  }
  hideBatchModal();
}

function hideBatchModal() {
  var modal = document.getElementById('lab-repo-batch-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.hidden = true;
  setBatchProgress('', false);
}

export function labRepoBatchSelectAll() {
  if (batchBusy) return;
  batchRows = setAllSelectableLabRepoBatchRows(batchRows, true);
  renderBatchList();
  syncBatchCount();
}

export function labRepoBatchSelectNone() {
  if (batchBusy) return;
  batchRows = setAllSelectableLabRepoBatchRows(batchRows, false);
  renderBatchList();
  syncBatchCount();
}

function readBatchDateRange() {
  var desdeEl = document.getElementById('lab-repo-batch-desde');
  var hastaEl = document.getElementById('lab-repo-batch-hasta');
  if (!desdeEl || !hastaEl) return null;
  return labRepoFetchRangeFromDateInputs(desdeEl.value, hastaEl.value);
}

function countBlocksOkAndPatients(blocks) {
  var totalOk = 0;
  var patientIds = new Set();
  (blocks || []).forEach(function (b) {
    totalOk += b && b.okReportCount ? b.okReportCount : 0;
    if (b && b.canProcess && b.patient && b.patient.id) {
      patientIds.add(String(b.patient.id));
    }
  });
  return { totalOk: totalOk, patientCount: patientIds.size };
}

function joinPatientBulkTexts(texts) {
  return (texts || [])
    .map(function (t) {
      return String(t || '').trim();
    })
    .filter(Boolean)
    .join('\n\n' + LAB_BULK_PATIENT_SEPARATOR + '\n\n');
}

function previewBlocksFromBulkText(text) {
  if (typeof rt.rebuildBulkLabPreviewBlocks === 'function') {
    return rt.rebuildBulkLabPreviewBlocks(text);
  }
  return buildBulkLabPreview(text, { findPatientByRegistro: rt.findPatientByRegistro });
}

function finalizeJoinedBulkTexts(texts) {
  var text = joinPatientBulkTexts(texts);
  if (!text) return { importedPatients: 0, totalOk: 0 };
  var blocks = previewBlocksFromBulkText(text);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { importedPatients: 0, totalOk: 0 };
  finalizeBulkLabPaste(text, blocks, counts.totalOk);
  return { importedPatients: counts.patientCount, totalOk: counts.totalOk };
}

/**
 * @param {{ row: { id: string, registro: string }, studies: unknown[], errors: unknown[] }} g
 * @returns {{ text: string, silent: boolean, patientCount: number } | null}
 */
function classifyPatientStudyGroup(g) {
  if (!g || !g.studies || !g.studies.length) return null;
  var text = buildLabRepoBulkText(g.studies);
  if (!text) return null;
  var blocks = buildLabRepoPreviewBlocks(g.studies, rt.findPatientByRegistro);
  var counts = countBlocksOkAndPatients(blocks);
  if (!counts.totalOk) return { text: text, silent: false, patientCount: 0 };
  var registro = g.row && g.row.registro ? String(g.row.registro) : '';
  var gate = shouldSilentImportLabRepo({
    blocks: blocks,
    // Folio/PDF noise must not force review when usable labs already exist.
    fetchErrors: [],
    requestedRegistro: registro,
    activePatientRegistro: registro,
    activePatientId: g.row && g.row.id ? String(g.row.id) : null,
  });
  return {
    text: text,
    silent: !!gate.silent,
    patientCount: counts.patientCount || 1,
  };
}

function openBatchReviewPreview(reviewTexts) {
  var reviewText = joinPatientBulkTexts(reviewTexts);
  var reviewBlocks = previewBlocksFromBulkText(reviewText);
  openLabBulkPreviewModal({
    blocks: reviewBlocks,
    sourceText: reviewText,
    onConfirm: function () {
      finalizeBulkLabPaste(
        reviewText,
        reviewBlocks,
        countBlocksOkAndPatients(reviewBlocks).totalOk
      );
    },
  });
}

/**
 * Apply each patient's studies separately so mixed expedientes across the team
 * never collapse into one "Varios expedientes" block.
 * @param {{ row: { id: string, registro: string }, studies: unknown[], errors: unknown[] }[]} groups
 */
function applyBatchStudyGroups(groups) {
  var silentTexts = [];
  var reviewTexts = [];
  var importedPatients = 0;

  (groups || []).forEach(function (g) {
    var outcome = classifyPatientStudyGroup(g);
    if (!outcome) return;
    if (outcome.silent) {
      silentTexts.push(outcome.text);
      importedPatients += outcome.patientCount;
      return;
    }
    reviewTexts.push(outcome.text);
  });

  if (silentTexts.length) finalizeJoinedBulkTexts(silentTexts);
  if (!reviewTexts.length) {
    return { needsReview: false, importedPatients: importedPatients };
  }
  openBatchReviewPreview(reviewTexts);
  return { needsReview: true, importedPatients: importedPatients };
}

function validateBatchImportStart() {
  if (batchBusy) return null;
  var selected = selectedLabRepoBatchRows(batchRows);
  if (!selected.length) {
    rt.showToast('Selecciona al menos un paciente con registro', 'error');
    return null;
  }
  var range = readBatchDateRange();
  if (!range) {
    rt.showToast('Revisa el rango de fechas (Desde no puede ser posterior a Hasta)', 'error');
    return null;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== 'function') {
    rt.showToast('Actualización masiva solo en la app de escritorio', 'warn');
    return null;
  }
  return { selected: selected, range: range };
}

function applyFetchKindToTotals(kind, studies, errors, totals, row) {
  if (kind === 'connection') {
    totals.failed += 1;
    rt.showToast('No se pudo conectar al repositorio de laboratorio (revisa red hospital)', 'error');
    batchAbort = true;
    return;
  }
  if (kind === 'empty') {
    totals.empty += 1;
    return;
  }
  if (kind === 'error') {
    totals.failed += 1;
    return;
  }
  totals.groups.push({ row: row, studies: studies || [], errors: errors || [] });
}

async function fetchOneBatchPatient(row, range) {
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: row.registro,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString(),
    });
    var studies = (res && res.studies) || [];
    var errors = (res && res.errors) || [];
    return {
      kind: classifyLabRepoBatchFetch(studies, errors),
      studies: studies,
      errors: errors,
    };
  } catch (_unused) {
    void _unused;
    return { kind: 'throw', studies: [], errors: [] };
  }
}

async function runBatchFetches(selected, range) {
  var totals = { groups: [], empty: 0, failed: 0 };
  for (var i = 0; i < selected.length; i++) {
    if (batchAbort) break;
    var row = selected[i];
    updateJobStatus(row.id, 'running');
    setBatchProgress(
      'Consultando ' + row.nombre + ' (' + (i + 1) + '/' + selected.length + ')…',
      true
    );
    var one = await fetchOneBatchPatient(row, range);
    if (one.kind === 'throw') {
      totals.failed += 1;
      updateJobStatus(row.id, 'error');
      rt.showToast('Error al consultar el repositorio', 'error');
      batchAbort = true;
      break;
    }
    updateJobStatus(row.id, jobStatusFromFetchKind(one.kind));
    applyFetchKindToTotals(one.kind, one.studies, one.errors, totals, row);
  }
  if (batchAbort) {
    batchJobs = abortPendingLabRepoBatchJobs(batchJobs);
    renderSidebarQueue();
  }
  return totals;
}

function finishBatchRun(selected, totals, applied) {
  var skippedNoRegistro = batchRows.filter(function (r) {
    return r && !r.hasRegistro;
  }).length;
  var summary = formatLabRepoBatchSummaryToast({
    attempted: selected.length,
    importedPatients: applied.importedPatients,
    empty: totals.empty,
    skippedNoRegistro: skippedNoRegistro,
    failed: totals.failed,
    needsReview: applied.needsReview ? 1 : 0,
    aborted: batchAbort,
  });
  rt.showToast(summary, totals.failed || batchAbort ? 'warn' : 'ok');
}

export async function confirmLabRepoBatchImport() {
  var start = validateBatchImportStart();
  if (!start) return;

  clearQueueAutoDismiss();
  batchAbort = false;
  showSidebarQueue(buildLabRepoBatchJobs(start.selected));
  hideBatchModal();
  setBatchBusy(true);
  try {
    var totals = await runBatchFetches(start.selected, start.range);
    var applied = { needsReview: false, importedPatients: 0 };
    if (totals.groups.length) {
      setBatchProgress('Procesando resultados…', true);
      applied = applyBatchStudyGroups(totals.groups);
    }
    finishBatchRun(start.selected, totals, applied);
  } finally {
    batchBusy = false;
    batchAbort = false;
    setBatchBusy(false);
    setBatchProgress('', false);
    renderSidebarQueue();
    scheduleQueueAutoDismiss();
  }
}
