/** EA panel shell render + incremental patch. */
import { persistClinicalState, getMedRecetaByPatient, getMedNotaSelectionByPatient } from '../app-state.mjs';
import { classifyMedicationSoapCategory } from '../med-receta-core.mjs';
import { isModeSala } from '../mode-features.mjs';
import {
  ensureMonitoreo,
  migratePatientMonitoreo,
  deriveSnapshot,
  balanceGlobalHistorico,
  buildEaMonitoreoRevision,
} from './estado-actual-data.mjs';
import { syncMonitoreoInsulinPumpFromReceta } from './estado-actual-insulin-pump.mjs';
import {
  applyDietProposalFromRecetaBlock,
  syncRecetaProposalsFromSoapSelection,
} from './estado-actual-meds.mjs';
import { buildEaHistorialChartsRevision, eaChartsCanOpen } from './estado-actual-charts.mjs';
import { syncEaCopyFab } from './estado-actual-panel-actions.mjs';
import {
  buildEstadoClinicoProps,
  fillEstadoClinicoMedGrid,
  wireEstadoClinicoInteractions,
  captureEaPanelUiState,
  restoreEaPanelUiState,
} from './estado-actual-panel-clinico.mjs';
import { _eaPanelCache, findActivePatient, invalidateEaPanelCache } from './estado-actual-panel-core.mjs';
import { formatEaSavedLabel } from './estado-actual-panel-format.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';

export function buildEaShellKey(activeId, monitoreo) {
  return String(activeId || '') + '|' + buildEaMonitoreoRevision(monitoreo, activeId, getMedRecetaByPatient());
}

export function buildEaDataKey(monitoreo, activeId) {
  return buildEaMonitoreoRevision(monitoreo, activeId, getMedRecetaByPatient());
}

/** The views load lazily; a later render must not be overwritten when an earlier import arrives. */
var eaPaintSeq = 0;

/** @type {typeof import('./estado-actual-panel-render-view.jsx') | null} */
var shellView = null;

/** Run `cb` with the view: now when it is already loaded, else once it has loaded. */
function withShellView(cb) {
  if (shellView) {
    cb(shellView);
    return;
  }
  import('./estado-actual-panel-render-view.jsx').then(function (view) {
    shellView = view;
    cb(view);
  });
}

export function renderEaEmptyPanel(mount, onReady) {
  syncEaCopyFab(false);
  invalidateEaPanelCache();
  var seq = ++eaPaintSeq;
  withShellView(function (view) {
    if (seq !== eaPaintSeq) return;
    view.renderEmptyPanel(mount);
    if (onReady) onReady();
  });
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
  var view = shellView;
  if (!view) return; // the panel was never painted
  var snapshot = deriveSnapshot(monitoreo);
  var balGlobal = balanceGlobalHistorico(monitoreo);
  var savedLabel = formatEaSavedLabel(monitoreo.textoGuardado && monitoreo.textoGuardado.savedAt);

  if (patchOpts.refreshClinico) {
    var clinicoDet = mount.querySelector('.ea-estado-clinico');
    if (clinicoDet) {
      var activeId = getEaPanelRuntime().getActiveId();
      view.replaceClinico(clinicoDet, buildEstadoClinicoProps(monitoreo, activeId, patient));
      fillEstadoClinicoMedGrid(mount, monitoreo, activeId);
      wireEstadoClinicoInteractions(mount, patient);
    }
  }

  var snapEl = mount.querySelector('#ea-snapshot');
  if (snapEl) view.replaceSnapshot(snapEl, snapshot, balGlobal);

  var histEl = mount.querySelector('#ea-historial');
  if (histEl) {
    var histWasOpen = histEl.open;
    view.replaceHistorial(histEl, Array.isArray(monitoreo.historial) ? monitoreo.historial : []);
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
        view.replaceChartsSummary(chartsSummary, eaChartsCanOpen(monitoreo));
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
 * @param {(() => void) | null} [onPainted] runs once the panel is in the DOM (the view loads lazily the first time)
 */
export function renderEaFullPanelShell(mount, patient, monitoreo, activeId, savedLabel, onPainted) {
  var seq = ++eaPaintSeq;
  var eaUiState = captureEaPanelUiState(mount);
  withShellView(function (view) {
    if (seq !== eaPaintSeq) return;
    view.paintShell(mount, {
      savedLabel: savedLabel,
      chartsCanOpen: eaChartsCanOpen(monitoreo),
      sala: isModeSala(getEaPanelRuntime().getSettings()),
      clinico: buildEstadoClinicoProps(monitoreo, activeId, patient),
      historial: Array.isArray(monitoreo.historial) ? monitoreo.historial : [],
    });
    fillEstadoClinicoMedGrid(mount, monitoreo, activeId);
    restoreEaPanelUiState(mount, eaUiState);
    wireEstadoClinicoInteractions(mount, patient);
    if (onPainted) onPainted();
  });
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

  renderEaFullPanelShell(mount, patient, monitoreo, activeId, savedLabel, function () {
    _eaPanelCache.shellKey = shellKey;
    _eaPanelCache.dataKey = dataKey;
    syncEaCopyFab(true);
    if (onReady) onReady();
  });
}

export function navigateToEstadoActualPanel() {
  if (typeof getEaPanelRuntime().switchInnerTab === 'function') {
    getEaPanelRuntime().switchInnerTab('estadoActual');
    return;
  }
  getEaPanelRuntime().switchConsolidatedTab('clinico');
}
