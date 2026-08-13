import { getPatients, persistClinicalState } from '../app-state.mjs';
import { syncHeaderContext } from './header-context.mjs';
import { flushRecetaHuDraftIfMountedFor } from './receta-hu.mjs';
import { stashMedInputForPatient } from './medications.mjs';
import { stashMedPharmPasteForPatient } from './med-pharm-profile-panel.mjs';
import { stashVpoForPatient } from './vpo.mjs';
import { flushSaveState } from '../app-state.mjs';
import { isModeSala } from '../mode-features.mjs';
import { migrateGranularInner } from '../expediente-tabs.mjs';
import { canDeletePatientChart } from '../patient-delete-auth.mjs';
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../clinical-access-runtime.mjs';
import { evaluateClinicalScope } from '../clinico-access.mjs';
import { getUiDensity, isPaseMode } from './chrome.mjs';
import {
  commitPatientDeletes,
  formatPatientDeleteSummary,
} from './sync-apply/patient-delete-batch.mjs';
import {
  exitPatientBulkSelectMode,
  getPatientBulkSelectedIds,
  isPatientBulkSelectMode,
  togglePatientBulkSelected,
} from './patients-bulk-select.mjs';
import { rt } from './patients-runtime-state.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { patchPatientListActiveHighlight } from './patients-list.mjs';
import {
  syncRoundExpedienteLayout,
  scrollActiveRondaCardIntoView,
  setRoundOverviewMode,
} from './patients-round.mjs';
import { syncPatientBulkBar } from './patients-bulk-bar.mjs';
import { showConfirmDialog } from '../ui-approval-card.mjs';

/** @param {string} iso */
function formatIncomingEffectiveLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || '');
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * @param {string|number} id
 * @returns {boolean} true when chart open should be blocked
 */
function blockIncomingPreviewChartOpen(id) {
  if (!clinicalSessionContext.user) return false;
  const patient = getPatients().find((p) => p && String(p.id) === String(id));
  const mapped = patient
    ? {
        id: String(patient.id),
        service: String(patient.servicio || patient.area || ''),
        sub_area: String(patient.area || ''),
        interconsult_type: patient.interconsult_type,
      }
    : { id: String(id) };
  const guardia = clinicalSessionContext.guardiasMap.get(String(id)) || null;
  const scope = evaluateClinicalScope(
    clinicalSessionContext.user,
    mapped,
    guardia,
    getClinicalScopeContextForEvaluate()
  );
  if (!scope.writable && scope.incomingPreview) {
    const assignment = (getClinicalScopeContextForEvaluate().assignments || []).find(
      (a) => String(a.patient_id) === String(id)
    );
    const when = formatIncomingEffectiveLabel(
      String(assignment?.effective_at || '')
    );
    rt.showToast(`Disponible el ${when}`, 'info');
    return true;
  }
  return false;
}

/**
 * @param {string|number} id
 * @param {{ bypassIncomingBlock?: boolean }} [opts]
 */
export function selectPatient(id, opts) {
  if (id == null || id === '') return;
  opts = opts || {};
  if (isPatientBulkSelectMode()) {
    togglePatientBulkSelected(id);
    patientsBridge.renderPatientList();
    syncPatientBulkBar();
    return;
  }
  try {
    if (!opts.bypassIncomingBlock && blockIncomingPreviewChartOpen(id)) return;
    selectPatientCore(id);
  } catch (err) {
    console.error('[R+] selectPatient:', err && err.message ? err.message : err);
  }
}

function stashPatientDraftsOnChange(prevId) {
  flushRecetaHuDraftIfMountedFor(prevId);
  stashMedInputForPatient(prevId);
  stashMedPharmPasteForPatient(prevId);
  stashVpoForPatient(prevId);
  flushSaveState();
}

function showPatientViewShell() {
  var emptyState = document.getElementById('empty-state');
  var patientView = document.getElementById('patient-view');
  if (emptyState) emptyState.style.display = 'none';
  if (patientView) patientView.style.display = 'flex';
}

function switchInnerToTodo() {
  if (getUiDensity() === 'normal') {
    rt.setActiveInner('todo');
    rt.syncInnerTabVisualOnly();
  } else {
    rt.switchInnerTab('todo');
  }
}

function applyInnerTabOnSamePatient(settings, inner) {
  if (isModeSala(settings) && (inner === 'notas' || inner === 'indica' || !inner)) {
    switchInnerToTodo();
  } else if (!isModeSala(settings) && inner === 'listado') {
    switchInnerToTodo();
  }
  if (isPaseMode() && rt.getActiveAppTab() === 'nota') {
    setRoundOverviewMode(inner === 'todo' || !inner);
  }
}

function migrateInnerOnPatientChange(inner, settings) {
  var migrated = migrateGranularInner(inner || 'resumen', settings);
  if (migrated !== inner) {
    rt.setActiveInner(migrated);
    return migrated;
  }
  return inner;
}

function scrollLabOutputIntoView() {
  var labOutput = document.getElementById('lab-output-section');
  if (!labOutput || labOutput.style.display === 'none') return;
  window.setTimeout(function () {
    try {
      labOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
      labOutput.scrollIntoView(true);
    }
  }, 0);
}

function handleLabTabAfterPatientChange(wasOnLab, patientChanged) {
  if (!wasOnLab || !patientChanged) return false;
  rt.limpiarReporte();
  rt.renderLabHistoryPanel();
  if (isPaseMode()) {
    rt.syncWorkContextChrome();
    return true;
  }
  rt.switchAppTab('lab');
  scrollLabOutputIntoView();
  return true;
}

function selectPatientCore(id) {
  var prevId = rt.getActiveId();
  var wasOnLab = rt.getActiveAppTab() === 'lab';
  var appTab = rt.getActiveAppTab();
  var patientChanged = String(prevId ?? '') !== String(id);
  if (patientChanged) {
    stashPatientDraftsOnChange(prevId);
    rt.invalidateInnerTabRenderCache();
  }
  rt.setActiveId(id);
  if (!patientChanged || !patchPatientListActiveHighlight(id)) {
    patientsBridge.renderPatientList();
  }
  showPatientViewShell();
  rt.renderEstadoActualButton();
  syncHeaderContext(rt);
  var settings = rt.getSettings();
  var inner = rt.getActiveInner();
  if (patientChanged) {
    inner = migrateInnerOnPatientChange(inner, settings);
    if (isPaseMode() && rt.getActiveAppTab() === 'nota') {
      setRoundOverviewMode(inner === 'todo' || !inner);
    }
  } else {
    applyInnerTabOnSamePatient(settings, inner);
  }
  rt.syncInnerTabVisualOnly();
  rt.refreshExpedienteAfterPatientSelect({ patientChanged: patientChanged });
  if (appTab === 'lab') rt.renderLabHistoryPanel();
  if (appTab === 'med') rt.renderMedRecetaPanel();
  if (!handleLabTabAfterPatientChange(wasOnLab, patientChanged)) {
    rt.syncWorkContextChrome();
  }
  syncRoundExpedienteLayout();
  rt.refreshTendenciasOrCultivosPanel();
  if (isPaseMode()) rt.renderPaseBoard();
  if (rt.getActiveId()) {
    requestAnimationFrame(function () {
      scrollActiveRondaCardIntoView();
    });
  }
}

function showPatientDeleteConfirm(n) {
  var many = n > 1;
  return showConfirmDialog({
    id: 'patients-delete-confirm',
    title: many ? 'Eliminar ' + n + ' pacientes' : 'Eliminar paciente',
    question: many
      ? 'Se quitarán las notas de este turno. No volverán desde otros equipos.'
      : 'Se quitarán las notas de este turno. No volverá desde otros equipos.',
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
  });
}

function confirmPatientDelete(target) {
  if (target && target.archived) return Promise.resolve(true);
  return showPatientDeleteConfirm(1);
}

function showEmptyPatientShell() {
  var pv = document.getElementById('patient-view');
  var es = document.getElementById('empty-state');
  if (pv) pv.style.display = 'none';
  if (es) es.style.display = 'flex';
  rt.syncWorkContextChrome();
}

function afterPatientDeletesCommitted(summary, auditLabel) {
  persistClinicalState({ immediate: true });
  rt.addAuditEntry('patient-delete', 'ok', summary.ok || 0, auditLabel || '');
  patientsBridge.renderPatientList();
  syncPatientBulkBar();
  var msg = formatPatientDeleteSummary(summary);
  if (msg && typeof rt.showToast === 'function') {
    var kind = summary.failed ? 'warn' : 'success';
    rt.showToast(msg, kind);
  }
  if (rt.getActiveId()) patientsBridge.selectPatient(rt.getActiveId());
  else showEmptyPatientShell();
}

export async function deletePatient(e, id) {
  e.stopPropagation();
  if (isPatientBulkSelectMode()) {
    togglePatientBulkSelected(id);
    patientsBridge.renderPatientList();
    syncPatientBulkBar();
    return;
  }
  var target = getPatients().find(function (p) {
    return p.id === id;
  });
  if (!target) return;
  if (
    !canDeletePatientChart(
      clinicalSessionContext.user,
      id,
      getClinicalScopeContextForEvaluate()
    )
  ) {
    if (typeof rt.showToast === 'function') {
      rt.showToast('Solo puedes eliminar pacientes de tu equipo (Admin/R4: todos).', 'warn');
    }
    return;
  }
  if (!(await confirmPatientDelete(target))) return;
  var label = 'Eliminar ' + (target.nombre || 'paciente');
  if (typeof rt.pushUndoSnapshot === 'function') rt.pushUndoSnapshot(label);
  var summary = await commitPatientDeletes([id]);
  afterPatientDeletesCommitted(
    summary,
    target.registro || target.nombre || ''
  );
}

export async function confirmBulkDeletePatients() {
  var ids = getPatientBulkSelectedIds();
  if (!ids.length) {
    if (typeof rt.showToast === 'function') rt.showToast('Selecciona al menos un paciente', 'info');
    return;
  }
  var scope = getClinicalScopeContextForEvaluate();
  var user = clinicalSessionContext.user;
  var allowed = ids.filter(function (pid) {
    return canDeletePatientChart(user, pid, scope);
  });
  var skipped = ids.length - allowed.length;
  if (!allowed.length) {
    if (typeof rt.showToast === 'function') {
      rt.showToast('Solo puedes eliminar pacientes de tu equipo (Admin/R4: todos).', 'warn');
    }
    return;
  }
  var n = allowed.length;
  var ok = await showPatientDeleteConfirm(n);
  if (!ok) return;
  if (typeof rt.pushUndoSnapshot === 'function') {
    rt.pushUndoSnapshot('Eliminar ' + n + ' pacientes');
  }
  var summary = await commitPatientDeletes(allowed);
  exitPatientBulkSelectMode();
  afterPatientDeletesCommitted(summary, n + ' pacientes');
  if (skipped > 0 && typeof rt.showToast === 'function') {
    rt.showToast(
      skipped === 1
        ? '1 paciente de otro equipo no se eliminó.'
        : skipped + ' pacientes de otro equipo no se eliminaron.',
      'warn'
    );
  }
}
