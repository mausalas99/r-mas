/**
 * Registro de runtimes de features (inyección de dependencias al cargar).
 */
import { storage } from './storage.js';
import { patients, saveState } from './app-state.mjs';
import { migrateToV3 } from './mode-features.mjs';
import {
  splitResLabsByTipo,
  primaryTipoForLabSet,
  buildLabSetDateLine,
  dayKeyFromLabSet,
  labSetIsFromSome,
  formatLabHistoryListMeta,
  rebuildEstudiosFromLabHistory,
  ensureParsedLabHistory,
  ensureParsedLabHistoryCached,
} from './lab-history-set.mjs';
import { normalizeFechaLabHistory } from './tend-core.mjs';
import {
  showToast,
  syncWorkContextChrome,
  setMedTabAttention,
  guardMobileDocExport,
  requestDocumentJson,
  handleDocumentGenerateResponse,
  launchConfetti,
  applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones,
  rpcPrefersReducedMotion,
} from './app-shell.mjs';
import {
  registerChromeRuntime,
  windowHandlers as chromeWindowHandlers,
} from './features/chrome.mjs';
import {
  registerLanRuntime,
  registerLanSaveHooks,
} from './features/lan-sync.mjs';
import {
  registerPatientsRuntime,
} from './features/patients.mjs';
import {
  registerLabPanelRuntime,
} from './features/lab-panel.mjs';
import {
  registerLabBulkPreviewModalRuntime,
  getBulkLabPreviewSourceText,
  isBulkLabPreviewModalOpen,
} from './features/lab-bulk-preview-modal.mjs';
import {
  registerLabHistoryBatchCopyRuntime,
} from './features/lab-history-batch-copy-modal.mjs';
import { buildBulkLabPreview } from './lab-bulk-paste.mjs';
import {
  registerTendenciasRuntime,
} from './features/tendencias.mjs';
import {
  registerTodosRuntime,
} from './features/todos.mjs';
import {
  registerPaseBoardRuntime,
} from './features/pase-board.mjs';
import {
  registerMedicationsRuntime,
  registerMedPharmProfileRuntime,
} from './features/medications.mjs';
import {
  registerProfileRuntime,
  loadSettings,
  syncHeaderAppModeChip,
  openProfileModal,
  closeProfileModal,
} from './features/profile.mjs';
import {
  registerSoapEstadoRuntime,
} from './features/soap-estado.mjs';
import {
  registerEstadoActualPanelRuntime,
  navigateToEstadoActualPanel,
  applyEstadoActualParsedToForm,
  renderEstadoActualPanel,
  ensureEaRegistroModalForm,
  resetEaRegistroForm,
  syncEaRegistroGluMode,
  toDatetimeLocalValue,
} from './features/estado-actual-panel.mjs';
import {
  registerEstadoActualPasteModalRuntime,
  wireEstadoActualPasteModal,
} from './features/estado-actual-paste-modal.mjs';
import {
  registerDriveImportRuntime,
  wireDriveImportModal,
} from './features/drive-import-modal.mjs';
import {
  registerEstadoActualRegistroModalRuntime,
  openEstadoActualRegistroModal,
  wireEaModalDismiss,
} from './features/estado-actual-registro-modal.mjs';
import {
  registerEstadoActualChartsModalRuntime,
  wireEaChartsModalDismiss,
} from './features/estado-actual-charts-modal.mjs';
import { getDefaultRegistroRecordedAt } from './features/estado-actual-registro-defaults.mjs';
import {
  registerProcedureAgendaRuntime,
} from './features/agenda.mjs';
import {
  registerExpedienteRuntime,
} from './features/expediente.mjs';
import {
  registerHistoriaClinicaRuntime,
} from './features/historia-clinica-panel.mjs';
import { registerEventualidadesRuntime } from './features/eventualidades-panel.mjs';
import {
  extractParsedValues,
  buildParsedBySectionFromResLabs,
  renderDiagramas,
} from './features/diagrams.mjs';
import {
  registerProductivityRuntime,
  pushUndoSnapshot,
} from './features/productivity.mjs';
import { registerCensoRuntime, syncCensoExportButtonVisibility } from './censo-export.mjs';
import { addAuditEntry } from './features/platform/audit.mjs';
import {
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  isRpcOffline,
} from './features/platform/offline.mjs';
import { syncPreimportBackupUi, applyImportEntry } from './features/platform/import-backup.mjs';
import {
  syncTeamSyncHeaderButton,
  closeSettingsDropdown,
} from './features/settings-help/settings-dropdown.mjs';
import {
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated,
  guidedTourAdvanceAfter,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved,
} from './features/settings-help/tour-flow.mjs';
import { registerLazyFeatureRuntimes } from './lazy-feature-routes.mjs';
import {
  registerNotesIndicacionesRuntime,
  applyProfileToNoteIfEmpty,
  renderNoteForm,
  renderIndicaForm,
} from './features/notes-indicaciones.mjs';
import {
  scheduleLabHistoryPostSaveMaintenance,
  installLabHistoryAuditHook,
  registerLabHistoryMaintRuntime,
} from './lab-history-set.mjs';
import {
  renderPatientList,
  selectPatient,
  scrollActiveRondaCardIntoView,
  renderRoundOverviewPanels,
  openAddModal,
  openAddModalFromLabPatient,
  findPatientByRegistro,
  ensureUniquePatientName,
  buildPatientEntry,
  setRoundOverviewMode,
  getRoundOverviewMode,
} from './features/patients.mjs';
import { isMobileWeb } from './mobile-web.mjs';
import {
  renderLabHistoryPanel,
  syncLabHistoryCollapseUI,
  setLabHistoryPanelCollapsed,
  getActiveLab as labPanelGetActiveLab,
  setActiveLab as labPanelSetActiveLab,
  rerenderParsedLabOutputAfterPrefsChange,
  clearLabWorkbenchMinimalDom,
  limpiarReporte,
  enviarLabsANota,
  syncLabOutputChrome,
} from './features/lab-panel.mjs';
import {
  seedTendHiddenDefaults,
  inferFechaLabSetFromId,
  getLabOutputPrefs,
  isGasoInterpretacionResLabChunk,
  isAscitisInterpretacionResLabChunk,
  ascitisInterpretacionBody_,
  isBhMainResLabChunk,
  formatBhExtendedTabLine,
  renderTendencias,
} from './features/tendencias.mjs';
import {
  refreshAllTodoUIs,
  renderTodoForm,
} from './features/todos.mjs';
import {
  registerVpoRuntime,
  renderVpo,
} from './features/vpo.mjs';
import {
  registerRecetaHuRuntime,
  renderRecetaHu,
} from './features/receta-hu.mjs';
import {
  renderPaseBoard,
  switchAppTab,
  openPaseSectionInNormal,
  switchInnerTab,
  switchConsolidatedTab,
  invalidateInnerTabRenderCache,
  refreshExpedienteAfterPatientSelect,
  warmExpedienteHeavyTabs,
  renderInnerTabs,
  syncInnerTabVisualOnly,
} from './features/pase-board.mjs';
import { renderGuardiaBoard } from './features/guardia-board.mjs';
import {
  renderMedRecetaPanel,
} from './features/medications.mjs';
import {
  renderEstadoActualBar,
  renderEstadoActualButton,
  copyToClipboardSafe,
} from './features/soap-estado.mjs';
import {
  renderProcedureAgendaPanel,
} from './features/agenda.mjs';
import {
  refreshTendenciasOrCultivosPanel,
  renderListadoForm,
  removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels,
  buildCultivoOutputHtmlFragments,
  isResLabChunkPureCultivo,
} from './features/expediente.mjs';
import {
  emitLiveSyncTodoUpsert,
  emitLiveSyncTodoDelete,
  syncSettingsLanHostDiskSection,
} from './features/lan-sync.mjs';
import {
  renderPatientDataPane,
} from './features/expediente.mjs';
import {
  advanceRondaPatient,
} from './features/patients.mjs';
import {
  initChromeAppearance,
} from './features/chrome.mjs';

const rt = {
  getActiveId() { return null; },
  setActiveId(_id) {},
  getActiveAppTab() { return 'lab'; },
  setActiveAppTab(_v) {},
  getActiveInner() { return 'todo'; },
  setActiveInner(_v) {},
  getSettings() { return {}; },
  setSettingsRef(_s) {},
};

let v3MigratedThisBoot = false;

export function wasV3MigratedThisBoot() {
  return v3MigratedThisBoot;
}

export function getAppRuntimeContext() {
  return rt;
}

export function registerAppRuntimeContext(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function installAppRuntimeContextDeps() {
  Object.assign(rt, {
    showToast,
    navigateToEstadoActualPanel,
    refreshMedPanel: function refreshMedPanel() {
      renderMedRecetaPanel();
    },
    syncWorkContextChrome,
    renderMedRecetaPanel,
    renderLabHistoryPanel,
    renderProcedureAgendaPanel,
    setMedTabAttention,
    ensureParsedLabHistory,
    ensureParsedLabHistoryCached,
    splitResLabsByTipo,
    primaryTipoForLabSet,
    formatLabHistoryListMeta: function (set) {
      return formatLabHistoryListMeta(set, inferFechaLabSetFromId);
    },
    switchAppTab,
    renderPatientList,
    scrollActiveRondaCardIntoView,
    renderGuardiaBoard: function () {
      return renderGuardiaBoard(rt.getSettings());
    },
    syncLabOutputChrome,
    setRoundOverviewMode,
    renderPaseBoard,
    getActiveLab: function () {
      return labPanelGetActiveLab();
    },
    consumeActiveLab: function () {
      var x = labPanelGetActiveLab();
      labPanelSetActiveLab(null);
      return x;
    },
    restoreActiveLab: function (x) {
      labPanelSetActiveLab(x);
    },
    clearLabOutputUi: clearLabWorkbenchMinimalDom,
    renderInnerTabs,
    invalidateInnerTabRenderCache,
    refreshExpedienteAfterPatientSelect,
    renderEstadoActualButton,
    renderPatientDataPane,
    renderNoteForm,
    renderIndicaForm,
    renderListadoForm,
    refreshTendenciasOrCultivosPanel,
    switchInnerTab,
    syncInnerTabVisualOnly,
    renderTodoForm,
    limpiarReporte,
    setLabHistoryPanelCollapsed,
    syncLabHistoryCollapseUI,
    rpcPrefersReducedMotion,
    refreshAllTodoUIs,
    renderVpo,
    renderRecetaHu,
    pushUndoSnapshot,
    addAuditEntry,
    applyDefaultsToNewPatient,
    applyDefaultsToNewIndicaciones,
    enviarLabsANota,
    normalizeFechaLabHistory,
    rerenderParsedLabOutputAfterPrefsChange,
    buildLabSetDateLine,
    getRoundOverviewMode,
    saveState,
    emitLiveSyncTodoUpsert,
    requestDocumentJson,
    handleDocumentGenerateResponse,
    guardMobileDocExport,
    isRpcOffline,
    incrementPendingJobs,
    decrementPendingJobs,
    syncOfflineButtonStates,
    syncTeamSyncHeaderButton,
    syncPreimportBackupUi,
    syncSettingsLanHostDiskSection,
    closeProfileModal,
    openProfileModal,
    openAddModalFromLabPatient,
    copyToClipboardSafe,
    renderTendencias,
    renderRoundOverviewPanels,
    switchConsolidatedTab,
    getActivePatient: function () {
      var id = rt.getActiveId();
      if (!id) return null;
      return (
        patients.find(function (p) {
          return String(p.id) === String(id);
        }) || null
      );
    },
    applyParsed: function (parsed, opts) {
      opts = opts || {};
      if (opts.fromNestedPaste) {
        applyEstadoActualParsedToForm(parsed);
        var recorded = document.getElementById('ea-recorded-at');
        if (recorded && 'value' in recorded) {
          recorded.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
        }
        return;
      }
      navigateToEstadoActualPanel();
      renderEstadoActualPanel({
        onReady: function () {
          openEstadoActualRegistroModal({ preserveForm: true });
          applyEstadoActualParsedToForm(parsed);
          var recorded = document.getElementById('ea-recorded-at');
          if (recorded && 'value' in recorded) {
            recorded.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
          }
        },
      });
    },
    ensureForm: ensureEaRegistroModalForm,
    syncGluMode: syncEaRegistroGluMode,
    resetForm: function () {
      var activeId = rt.getActiveId();
      var patient =
        activeId &&
        patients.find(function (p) {
          return p.id === activeId;
        });
      resetEaRegistroForm(patient || null);
    },
    selectPatient,
    onboardingAdvanceAfterParse,
    onboardingAdvanceAfterSend,
    tourAfterBulkLabParse,
    tourOnBulkPreviewPatientSaved,
    findPatientByRegistro,
    openPaseSectionInNormal,
    renderDiagramas,
    closeSettingsDropdown,
    extractParsedValues,
    buildParsedBySectionFromResLabs,
    rebuildEstudiosFromLabHistory,
    inferFechaLabSetFromId,
    dayKeyFromLabSet,
    labSetIsFromSome,
    removeAtbRisPanelsFromBody,
    wireAtbRisHoverPanels,
    getLabOutputPrefs,
    isGasoInterpretacionResLabChunk,
    isAscitisInterpretacionResLabChunk,
    ascitisInterpretacionBody_,
    formatBhExtendedTabLine,
    isBhMainResLabChunk,
    isResLabChunkPureCultivo,
    buildCultivoOutputHtmlFragments,
    rebuildBulkLabPreviewBlocks: function (text) {
      return buildBulkLabPreview(text, { findPatientByRegistro });
    },
    getBulkLabPreviewSourceText,
    isBulkLabPreviewModalOpen,
    openAddModal,
    advanceRondaPatient,
    isMobileWeb,
    ensureUniquePatientName,
    applyImportEntry,
    buildPatientEntry,
    onMedicionRegistered: function () {
      guidedTourAdvanceAfter('estado_actual_registro');
    },
    guidedTourAdvanceAfterNotaGenerated,
    guidedTourAdvanceAfterIndicaGenerated,
    launchConfetti,
    renderEstadoActualBar,
  });
}

export async function registerAllFeatureRuntimes() {
  installAppRuntimeContextDeps();
  var ctx = getAppRuntimeContext();

  registerMedicationsRuntime(ctx);
  registerMedPharmProfileRuntime(ctx);
  registerProfileRuntime(ctx);
  registerPaseBoardRuntime(ctx);
  registerChromeRuntime(ctx);
  registerPatientsRuntime(ctx);

  v3MigratedThisBoot = migrateToV3(rt.getSettings());
  if (v3MigratedThisBoot) storage.saveSettings(rt.getSettings());

  await registerLazyFeatureRuntimes(ctx);

  registerLabHistoryMaintRuntime(ctx);
  installLabHistoryAuditHook();
  registerLanSaveHooks({ scheduleLabHistoryPostSaveMaintenance });

  registerTendenciasRuntime(ctx);
  registerTodosRuntime(ctx);
  registerVpoRuntime(ctx);
  registerRecetaHuRuntime(ctx);
  registerCensoRuntime(ctx);
  registerHistoriaClinicaRuntime(ctx);
  registerEventualidadesRuntime(ctx);
  registerExpedienteRuntime(ctx);
  registerNotesIndicacionesRuntime(ctx);
  registerProcedureAgendaRuntime(ctx);
  registerSoapEstadoRuntime(ctx);
  registerEstadoActualPanelRuntime(ctx);
  registerDriveImportRuntime(ctx);
  registerEstadoActualPasteModalRuntime(ctx);
  registerEstadoActualRegistroModalRuntime(ctx);
  registerEstadoActualChartsModalRuntime({
    getPatient: function () {
      var id = rt.getActiveId();
      if (!id) return null;
      return (
        patients.find(function (p) {
          return p.id === id;
        }) || null
      );
    },
    showToast: showToast,
  });
  registerLabPanelRuntime(ctx);
  registerLabBulkPreviewModalRuntime(ctx);
  registerLabHistoryBatchCopyRuntime(ctx);
  registerProductivityRuntime(ctx);
  registerLanRuntime(ctx);
}

export function runInitialFeatureBoot() {
  initChromeAppearance();
  syncLabHistoryCollapseUI();
  wireEstadoActualPasteModal();
  wireDriveImportModal();
  wireEaModalDismiss();
  wireEaChartsModalDismiss();
  syncCensoExportButtonVisibility();
}
