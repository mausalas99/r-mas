/** EA panel shell render + incremental patch. */
import { persistClinicalState, getMedRecetaByPatient, getMedNotaSelectionByPatient } from '../app-state.mjs';
import { classifyMedicationSoapCategory } from '../med-receta-core.mjs';
import { isModeSala } from '../mode-features.mjs';
import {
  ensureMonitoreo,
  migratePatientMonitoreo,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  buildEaMonitoreoRevision,
} from './estado-actual-data.mjs';
import { syncMonitoreoInsulinPumpFromReceta } from './estado-actual-insulin-pump.mjs';
import {
  applyDietProposalFromRecetaBlock,
  syncRecetaProposalsFromSoapSelection,
} from './estado-actual-meds.mjs';
import {
  buildEaHistorialChartsRevision,
  renderEaChartsSummarySection,
} from './estado-actual-charts.mjs';
import { syncEaCopyFab } from './estado-actual-panel-actions.mjs';
import {
  renderEstadoClinicoSection,
  wireEstadoClinicoInteractions,
  captureEaPanelUiState,
  restoreEaPanelUiState,
} from './estado-actual-panel-clinico.mjs';
import { _eaPanelCache, findActivePatient, invalidateEaPanelCache } from './estado-actual-panel-core.mjs';
import { formatEaSavedLabel } from './estado-actual-panel-format.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';
import { renderSnapshotSection, renderHistorialSection } from './estado-actual-panel-snapshot.mjs';

/**
 * Botones de la barra de acciones del panel Estado actual.
 * Sala: solo registro manual. Interconsulta: registro + enviar a nota.
 * @param {Record<string, unknown> | null | undefined} settings
 */
export function buildEaActionBarButtons(settings) {
  var html =
    '<button type="button" class="ea-btn" onclick="openEstadoActualRegistroModal()">Registro manual</button>';
  if (!isModeSala(settings)) {
    html +=
      '<button type="button" class="ea-btn ea-btn--success" onclick="estadoActualEnviarANota()">Enviar a nota</button>';
  }
  return html;
}

export function buildEaShellKey(activeId, monitoreo) {
  return String(activeId || '') + '|' + buildEaMonitoreoRevision(monitoreo, activeId, getMedRecetaByPatient());
}

export function buildEaDataKey(monitoreo, activeId) {
  return buildEaMonitoreoRevision(monitoreo, activeId, getMedRecetaByPatient());
}

export function renderEaEmptyPanel(mount, onReady) {
  syncEaCopyFab(false);
  invalidateEaPanelCache();
  mount.innerHTML =
    '<div class="estado-actual-panel ea-empty">' +
    '<div class="empty-state empty-state--compact" role="status">' +
    '<h3 class="empty-state-title">Selecciona un paciente para monitoreo</h3>' +
    '<p class="empty-state-lead">Elige uno en el censo de la izquierda. Ahí podrás registrar signos, balance hídrico y dieta.</p>' +
    '</div>' +
    '</div>';
  if (onReady) onReady();
}

/**
 * @param {ReturnType<typeof import('./estado-actual-panel-core.mjs').findActivePatient>} patient
 * @param {string | null} activeId
 * @param {Record<string, unknown>} monitoreo
 */
export function syncEaRecetaProposals(patient, activeId, monitoreo) {
  var changed = false;
  if (
    applyDietProposalFromRecetaBlock(
      monitoreo,
      activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null
    )
  ) {
    changed = true;
  }
  if (
    syncRecetaProposalsFromSoapSelection(
      activeId,
      monitoreo,
      getMedRecetaByPatient(),
      getMedNotaSelectionByPatient(),
      classifyMedicationSoapCategory
    )
  ) {
    changed = true;
  }
  if (
    syncMonitoreoInsulinPumpFromReceta(
      monitoreo,
      activeId && getMedRecetaByPatient() ? getMedRecetaByPatient()[activeId] : null
    )
  ) {
    changed = true;
  }
  if (changed) persistClinicalState();
}

/**
 * @param {HTMLElement} mount
 * @param {ReturnType<typeof import('./estado-actual-panel-core.mjs').findActivePatient>} patient
 * @param {Record<string, unknown>} monitoreo
 * @param {{ refreshClinico?: boolean, skipChartsSummary?: boolean }} patchOpts
 */
export function patchEaPanelDynamicSections(mount, patient, monitoreo, patchOpts) {
  patchOpts = patchOpts || {};
  var snapshot = deriveSnapshot(monitoreo);
  var balTurno = balanceTurno(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);
  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);

  if (patchOpts.refreshClinico) {
    var clinicoDet = mount.querySelector('.ea-estado-clinico');
    if (clinicoDet) {
      clinicoDet.outerHTML = renderEstadoClinicoSection(monitoreo, getEaPanelRuntime().getActiveId(), patient);
      wireEstadoClinicoInteractions(mount, patient);
    }
  }

  var snapEl = mount.querySelector('#ea-snapshot');
  if (snapEl) snapEl.outerHTML = renderSnapshotSection(snapshot, balTurno, balGlobal);

  var histEl = mount.querySelector('#ea-historial');
  if (histEl) {
    var histWasOpen = histEl.open;
    histEl.outerHTML = renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []);
    if (histWasOpen) {
      var newHist = mount.querySelector('#ea-historial');
      if (newHist) newHist.open = true;
    }
  }

  var meta = mount.querySelector('#ea-meta-guardado');
  if (meta) meta.textContent = savedLabel;

  if (!patchOpts.skipChartsSummary) {
    var chartsSummary = mount.querySelector('#ea-charts-summary');
    if (chartsSummary) {
      var chartsRev = buildEaHistorialChartsRevision(monitoreo);
      if (mount._eaChartsSummaryRev !== chartsRev) {
        mount._eaChartsSummaryRev = chartsRev;
        chartsSummary.outerHTML = renderEaChartsSummarySection(monitoreo);
      }
    }
  }
}

/**
 * @param {HTMLElement} mount
 * @param {ReturnType<typeof import('./estado-actual-panel-core.mjs').findActivePatient>} patient
 * @param {Record<string, unknown>} monitoreo
 * @param {string | null} activeId
 * @param {string} savedLabel
 */
export function renderEaFullPanelShell(mount, patient, monitoreo, activeId, savedLabel) {
  var eaUiState = captureEaPanelUiState(mount);
  var snapshot = deriveSnapshot(monitoreo);
  var balTurno = balanceTurno(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);

  mount.innerHTML =
    '<div class="estado-actual-panel">' +
    '<div class="ea-action-bar">' +
    '<div class="ea-action-bar__cluster" role="group" aria-label="Acciones de monitoreo">' +
    buildEaActionBarButtons(getEaPanelRuntime().getSettings()) +
    '</div>' +
    '<span id="ea-meta-guardado" class="ea-meta-guardado">' +
    savedLabel +
    '</span>' +
    '</div>' +
    renderSnapshotSection(snapshot, balTurno, balGlobal) +
    renderEstadoClinicoSection(monitoreo, activeId, patient) +
    renderHistorialSection(Array.isArray(monitoreo.historial) ? monitoreo.historial : []) +
    renderEaChartsSummarySection(monitoreo) +
    '</div>';

  restoreEaPanelUiState(mount, eaUiState);
  wireEstadoClinicoInteractions(mount, patient);
}

/**
 * @param {HTMLElement} mount
 * @param {string} shellKey
 * @param {string} dataKey
 * @param {{ dataOnly?: boolean, force?: boolean }} opts
 */
export function shouldSkipEaPanelRender(mount, shellKey, dataKey, opts) {
  opts = opts || {};
  return !!(
    mount.querySelector('.estado-actual-panel') &&
    _eaPanelCache.shellKey === shellKey &&
    _eaPanelCache.dataKey === dataKey &&
    !opts.force
  );
}

/**
 * @param {HTMLElement} mount
 * @param {ReturnType<typeof import('./estado-actual-panel-core.mjs').findActivePatient>} patient
 * @param {Record<string, unknown>} monitoreo
 * @param {string} shellKey
 * @param {string} dataKey
 * @param {{ dataOnly?: boolean, refreshClinico?: boolean, skipChartsSummary?: boolean }} opts
 * @param {(() => void) | null} onReady
 * @returns {boolean} true when incremental patch handled the render
 */
export function tryPatchEaPanel(mount, patient, monitoreo, shellKey, dataKey, opts, onReady) {
  opts = opts || {};
  if (
    !mount.querySelector('.estado-actual-panel') ||
    _eaPanelCache.shellKey !== shellKey ||
    !(opts.dataOnly || _eaPanelCache.dataKey !== dataKey)
  ) {
    return false;
  }
  if (_eaPanelCache.dataKey === dataKey && !opts.dataOnly) {
    syncEaCopyFab(true);
    if (onReady) onReady();
    return true;
  }
  patchEaPanelDynamicSections(mount, patient, monitoreo, {
    refreshClinico: !!opts.refreshClinico,
    skipChartsSummary: !!opts.skipChartsSummary,
  });
  _eaPanelCache.dataKey = dataKey;
  syncEaCopyFab(true);
  if (onReady) onReady();
  return true;
}

export function renderEstadoActualPanel(opts) {
  opts = opts || {};
  var onReady = typeof opts.onReady === 'function' ? opts.onReady : null;
  var mount = document.getElementById('exp-pane-estado-actual');
  if (!mount) {
    if (onReady) onReady();
    return;
  }

  var patient = findActivePatient();
  if (!patient) {
    renderEaEmptyPanel(mount, onReady);
    return;
  }

  migratePatientMonitoreo(patient);
  ensureMonitoreo(patient);
  var monitoreo = patient.monitoreo;
  var activeId = getEaPanelRuntime().getActiveId();
  syncEaRecetaProposals(patient, activeId, monitoreo);

  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);
  var shellKey = buildEaShellKey(activeId, monitoreo);
  var dataKey = buildEaDataKey(monitoreo, activeId);

  if (tryPatchEaPanel(mount, patient, monitoreo, shellKey, dataKey, opts, onReady)) return;
  if (shouldSkipEaPanelRender(mount, shellKey, dataKey, opts)) {
    syncEaCopyFab(true);
    if (onReady) onReady();
    return;
  }

  renderEaFullPanelShell(mount, patient, monitoreo, activeId, savedLabel);
  _eaPanelCache.shellKey = shellKey;
  _eaPanelCache.dataKey = dataKey;
  syncEaCopyFab(true);
  if (onReady) onReady();
}

export function navigateToEstadoActualPanel() {
  if (typeof getEaPanelRuntime().switchInnerTab === 'function') {
    getEaPanelRuntime().switchInnerTab('estadoActual');
    return;
  }
  getEaPanelRuntime().switchConsolidatedTab('clinico');
}
