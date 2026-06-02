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
} from './features/lab-bulk-preview-modal.mjs';
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
import {
  registerSettingsHelpRuntime,
  syncTeamSyncHeaderButton,
  closeSettingsDropdown,
} from './features/settings-help.mjs';
import { registerCensoRuntime, syncCensoExportButtonVisibility } from './censo-export.mjs';
import {
  registerPlatformRuntime,
  addAuditEntry,
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  isRpcOffline,
  syncPreimportBackupUi,
  applyImportEntry,
} from './features/platform.mjs';
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
  registerManejoRuntime,
  renderManejo,
} from './features/manejo.mjs';
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
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated,
  guidedTourAdvanceAfter,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved,
} from './features/settings-help.mjs';
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

export function registerAppRuntimeContext(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

export function registerAllFeatureRuntimes() {
  registerMedicationsRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  showToast: showToast,
  getSettings: function () {
    return rt.getSettings();
  },
  navigateToEstadoActualPanel: navigateToEstadoActualPanel,
});
registerMedPharmProfileRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  showToast: showToast,
  refreshMedPanel: function () {
    renderMedRecetaPanel();
  },
});
registerProfileRuntime({
  showToast: showToast,
  getActiveId: function () {
    return rt.getActiveId();
  },
  syncWorkContextChrome: syncWorkContextChrome,
});
registerPaseBoardRuntime({
  getActiveAppTab: function () {
    return rt.getActiveAppTab();
  },
  setActiveAppTab: function (v) {
    rt.setActiveAppTab(v);
  },
  getActiveInner: function () {
    return rt.getActiveInner();
  },
  setActiveInner: function (v) {
    rt.setActiveInner(v);
  },
  getActiveId: function () {
    return rt.getActiveId();
  },
  getSettings: function () {
    return rt.getSettings();
  },
  renderMedRecetaPanel: renderMedRecetaPanel,
  renderLabHistoryPanel: renderLabHistoryPanel,
  renderProcedureAgendaPanel: renderProcedureAgendaPanel,
  setMedTabAttention: setMedTabAttention,
  syncWorkContextChrome: syncWorkContextChrome,
  ensureParsedLabHistory: ensureParsedLabHistory,
  ensureParsedLabHistoryCached: ensureParsedLabHistoryCached,
  splitResLabsByTipo: splitResLabsByTipo,
  primaryTipoForLabSet: primaryTipoForLabSet,
  formatLabHistoryListMeta: function (set) {
    return formatLabHistoryListMeta(set, inferFechaLabSetFromId);
  },
});

registerChromeRuntime({
  switchAppTab,
  renderPatientList,
  scrollActiveRondaCardIntoView,
  renderProcedureAgendaPanel,
  getActiveAppTab: function () { return rt.getActiveAppTab(); },
  getActiveInner: function () { return rt.getActiveInner(); },
  getActiveId: function () { return rt.getActiveId(); },
  setRoundOverviewMode: setRoundOverviewMode,
  renderPaseBoard: renderPaseBoard,
  renderGuardiaBoard: function () {
    return renderGuardiaBoard(rt.getSettings());
  },
  syncLabOutputChrome: syncLabOutputChrome,
});

registerPatientsRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  setActiveId: function (id) {
    rt.setActiveId(id);
  },
  getActiveAppTab: function () {
    return rt.getActiveAppTab();
  },
  getActiveInner: function () {
    return rt.getActiveInner();
  },
  setActiveInner: function (v) {
    rt.setActiveInner(v);
  },
  getSettings: function () {
    return rt.getSettings();
  },
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
  switchAppTab: switchAppTab,
  showToast: showToast,
  renderInnerTabs: renderInnerTabs,
  invalidateInnerTabRenderCache: invalidateInnerTabRenderCache,
  refreshExpedienteAfterPatientSelect: refreshExpedienteAfterPatientSelect,
  renderEstadoActualButton: renderEstadoActualButton,
  renderNoteForm: renderNoteForm,
  renderPatientDataPane: renderPatientDataPane,
  renderIndicaForm: renderIndicaForm,
  renderListadoForm: renderListadoForm,
  refreshTendenciasOrCultivosPanel: refreshTendenciasOrCultivosPanel,
  renderLabHistoryPanel: renderLabHistoryPanel,
  renderMedRecetaPanel: renderMedRecetaPanel,
  switchInnerTab: switchInnerTab,
  syncInnerTabVisualOnly: syncInnerTabVisualOnly,
  renderTodoForm: renderTodoForm,
  limpiarReporte: limpiarReporte,
  setLabHistoryPanelCollapsed: setLabHistoryPanelCollapsed,
  syncLabHistoryCollapseUI: syncLabHistoryCollapseUI,
  syncWorkContextChrome: syncWorkContextChrome,
  rpcPrefersReducedMotion: rpcPrefersReducedMotion,
  renderProcedureAgendaPanel: renderProcedureAgendaPanel,
  refreshAllTodoUIs: refreshAllTodoUIs,
  renderManejo: renderManejo,
  renderVpo: renderVpo,
  renderRecetaHu: renderRecetaHu,
  renderPaseBoard: renderPaseBoard,
  pushUndoSnapshot: pushUndoSnapshot,
  addAuditEntry: addAuditEntry,
  applyDefaultsToNewPatient: applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones: applyDefaultsToNewIndicaciones,
  enviarLabsANota: enviarLabsANota,
  ensureParsedLabHistory: ensureParsedLabHistory,
  ensureParsedLabHistoryCached: ensureParsedLabHistoryCached,
  primaryTipoForLabSet: primaryTipoForLabSet,
  normalizeFechaLabHistory: normalizeFechaLabHistory,
});

v3MigratedThisBoot = migrateToV3(rt.getSettings());
if (v3MigratedThisBoot) storage.saveSettings(rt.getSettings());

registerLabHistoryMaintRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  renderLabHistoryPanel: renderLabHistoryPanel,
  refreshTendenciasOrCultivosPanel: refreshTendenciasOrCultivosPanel,
});
installLabHistoryAuditHook();
registerLanSaveHooks({ scheduleLabHistoryPostSaveMaintenance });

registerPlatformRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  setActiveId: function (id) {
    rt.setActiveId(id);
  },
  getSettings: function () {
    return rt.getSettings();
  },
  showToast: showToast,
  syncTeamSyncHeaderButton: syncTeamSyncHeaderButton,
  pushUndoSnapshot: pushUndoSnapshot,
});

registerTendenciasRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  ensureParsedLabHistory: ensureParsedLabHistory,
  ensureParsedLabHistoryCached: ensureParsedLabHistoryCached,
  rerenderParsedLabOutputAfterPrefsChange: rerenderParsedLabOutputAfterPrefsChange,
  rpcPrefersReducedMotion: rpcPrefersReducedMotion,
  showToast: showToast,
  buildLabSetDateLine: buildLabSetDateLine,
});

registerTodosRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  getActiveAppTab: function () {
    return rt.getActiveAppTab();
  },
  getRoundOverviewMode: getRoundOverviewMode,
  renderPaseBoard: renderPaseBoard,
});

registerManejoRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  ensureParsedLabHistory: ensureParsedLabHistory,
  ensureParsedLabHistoryCached: ensureParsedLabHistoryCached,
  saveState: saveState,
  showToast: showToast,
  emitLiveSyncTodoUpsert: emitLiveSyncTodoUpsert,
  refreshAllTodoUIs: refreshAllTodoUIs,
});

registerVpoRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  showToast: showToast,
  switchAppTab: switchAppTab,
});

registerRecetaHuRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  getActiveAppTab: function () {
    return rt.getActiveAppTab();
  },
  getActiveInner: function () {
    return rt.getActiveInner();
  },
  getSettings: function () {
    return rt.getSettings();
  },
  switchAppTab: switchAppTab,
  switchInnerTab: switchInnerTab,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
  showToast: showToast,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  syncOfflineButtonStates: syncOfflineButtonStates,
});

registerSettingsHelpRuntime({
  getSettings: function () {
    return rt.getSettings();
  },
  getActiveInner: function () {
    return rt.getActiveInner();
  },
  getActiveId: function () {
    return rt.getActiveId();
  },
  setActiveId: function (id) {
    rt.setActiveId(id);
  },
  switchInnerTab: switchInnerTab,
  renderInnerTabs: renderInnerTabs,
  renderEstadoActualButton: renderEstadoActualButton,
  renderEstadoActualBar: renderEstadoActualBar,
  switchAppTab: switchAppTab,
  showToast: showToast,
  launchConfetti: launchConfetti,
  syncPreimportBackupUi: syncPreimportBackupUi,
  syncSettingsLanHostDiskSection: syncSettingsLanHostDiskSection,
  closeProfileModal: closeProfileModal,
  openProfileModal: openProfileModal,
  renderMedRecetaPanel: renderMedRecetaPanel,
  renderListadoForm: renderListadoForm,
  openAddModalFromLabPatient: openAddModalFromLabPatient,
  refreshAllTodoUIs: refreshAllTodoUIs,
  refreshExpedienteAfterPatientSelect: refreshExpedienteAfterPatientSelect,
});

registerCensoRuntime({
  getSettings: function () {
    return rt.getSettings();
  },
  showToast: showToast,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  syncOfflineButtonStates: syncOfflineButtonStates,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
});

registerHistoriaClinicaRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  getSettings: function () {
    return rt.getSettings();
  },
  showToast: showToast,
  copyToClipboardSafe: copyToClipboardSafe,
  navigateToEstadoActualPanel: navigateToEstadoActualPanel,
});

registerEventualidadesRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  showToast: showToast,
});

registerExpedienteRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  getActiveAppTab: function () {
    return rt.getActiveAppTab();
  },
  getActiveInner: function () {
    return rt.getActiveInner();
  },
  getSettings: function () {
    return rt.getSettings();
  },
  showToast: showToast,
  renderTendencias: renderTendencias,
  renderPaseBoard: renderPaseBoard,
  splitResLabsByTipo: splitResLabsByTipo,
  buildLabSetDateLine: buildLabSetDateLine,
  ensureParsedLabHistory: ensureParsedLabHistory,
  ensureParsedLabHistoryCached: ensureParsedLabHistoryCached,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  syncOfflineButtonStates: syncOfflineButtonStates,
  copyToClipboardSafe: copyToClipboardSafe,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
});

registerNotesIndicacionesRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  getSettings: function () {
    return rt.getSettings();
  },
  showToast: showToast,
  renderRoundOverviewPanels: renderRoundOverviewPanels,
  syncOfflineButtonStates: syncOfflineButtonStates,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
  guidedTourAdvanceAfterNotaGenerated: guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated: guidedTourAdvanceAfterIndicaGenerated,
  addAuditEntry: addAuditEntry,
});

registerProcedureAgendaRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  showToast: showToast,
  renderPaseBoard: renderPaseBoard,
});

registerSoapEstadoRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  showToast: showToast,
  getSettings: function () {
    return rt.getSettings();
  },
  navigateToEstadoActualPanel: navigateToEstadoActualPanel,
});

registerEstadoActualPanelRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  showToast: showToast,
  getSettings: function () {
    return rt.getSettings();
  },
  switchConsolidatedTab: switchConsolidatedTab,
  copyToClipboardSafe: copyToClipboardSafe,
  invalidateInnerTabRenderCache: invalidateInnerTabRenderCache,
  onMedicionRegistered: function () {
    guidedTourAdvanceAfter('estado_actual_registro');
  },
});

registerDriveImportRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  getActivePatient: function () {
    var id = rt.getActiveId();
    if (!id) return null;
    return (
      patients.find(function (p) {
        return String(p.id) === String(id);
      }) || null
    );
  },
  showToast: showToast,
  pushUndoSnapshot: pushUndoSnapshot,
  switchInnerTab: switchInnerTab,
  switchAppTab: switchAppTab,
  addAuditEntry: addAuditEntry,
});

registerEstadoActualPasteModalRuntime({
  showToast: showToast,
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
});

registerEstadoActualRegistroModalRuntime({
  showToast: showToast,
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
});

registerLabPanelRuntime({
  showToast: showToast,
  copyToClipboardSafe: copyToClipboardSafe,
  getActiveId: function () {
    return rt.getActiveId();
  },
  setActiveId: function (id) {
    rt.setActiveId(id);
  },
  selectPatient: selectPatient,
  renderRoundOverviewPanels: renderRoundOverviewPanels,
  refreshTendenciasOrCultivosPanel: refreshTendenciasOrCultivosPanel,
  renderPaseBoard: renderPaseBoard,
  onboardingAdvanceAfterParse: onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend: onboardingAdvanceAfterSend,
  tourAfterBulkLabParse: tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved: tourOnBulkPreviewPatientSaved,
  findPatientByRegistro: findPatientByRegistro,
  addAuditEntry: addAuditEntry,
  openPaseSectionInNormal: openPaseSectionInNormal,
  renderDiagramas: renderDiagramas,
  pushUndoSnapshot: pushUndoSnapshot,
  setMedTabAttention: setMedTabAttention,
  switchAppTab: switchAppTab,
  closeSettingsDropdown: closeSettingsDropdown,
  extractParsedValues: extractParsedValues,
  buildParsedBySectionFromResLabs: buildParsedBySectionFromResLabs,
  ensureParsedLabHistory: ensureParsedLabHistory,
  ensureParsedLabHistoryCached: ensureParsedLabHistoryCached,
  rebuildEstudiosFromLabHistory: rebuildEstudiosFromLabHistory,
  inferFechaLabSetFromId: inferFechaLabSetFromId,
  dayKeyFromLabSet: dayKeyFromLabSet,
  labSetIsFromSome: labSetIsFromSome,
  formatLabHistoryListMeta: function (set) {
    return formatLabHistoryListMeta(set, inferFechaLabSetFromId);
  },
  primaryTipoForLabSet: primaryTipoForLabSet,
  refreshAllTodoUIs: refreshAllTodoUIs,
  emitLiveSyncTodoUpsert: emitLiveSyncTodoUpsert,
  removeAtbRisPanelsFromBody: removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels: wireAtbRisHoverPanels,
  getLabOutputPrefs: getLabOutputPrefs,
  isGasoInterpretacionResLabChunk: isGasoInterpretacionResLabChunk,
  isAscitisInterpretacionResLabChunk: isAscitisInterpretacionResLabChunk,
  ascitisInterpretacionBody_: ascitisInterpretacionBody_,
  formatBhExtendedTabLine: formatBhExtendedTabLine,
  isBhMainResLabChunk: isBhMainResLabChunk,
  isResLabChunkPureCultivo: isResLabChunkPureCultivo,
  buildCultivoOutputHtmlFragments: buildCultivoOutputHtmlFragments,
  buildLabSetDateLine: buildLabSetDateLine,
  refreshManejoPanel: renderManejo,
});

registerLabBulkPreviewModalRuntime({
  showToast,
  rebuildBulkLabPreviewBlocks: function (text) {
    return buildBulkLabPreview(text, { findPatientByRegistro });
  },
  openAddModalFromLabPatient,
  tourOnBulkPreviewPatientSaved,
});

registerProductivityRuntime({
  getActiveId: function () {
    return rt.getActiveId();
  },
  getSettings: function () {
    return rt.getSettings();
  },
  selectPatient: selectPatient,
  switchAppTab: switchAppTab,
  switchInnerTab: switchInnerTab,
  saveState: saveState,
  renderIndicaForm: renderIndicaForm,
  closeSettingsDropdown: closeSettingsDropdown,
  openAddModal: openAddModal,
  addAuditEntry: addAuditEntry,
  showToast: showToast,
  advanceRondaPatient: advanceRondaPatient,
});

registerLanRuntime({
  showToast,
  renderPatientList,
  renderNoteForm,
  renderLabHistoryPanel,
  getActiveId: function () {
    return rt.getActiveId();
  },
  setActiveId: function (id) {
    rt.setActiveId(id);
  },
  getActiveAppTab: function () {
    return rt.getActiveAppTab();
  },
  selectPatient,
  isMobileWeb,
  renderProcedureAgendaPanel,
  refreshAllTodoUIs,
  syncWorkContextChrome,
  findPatientByRegistro,
  ensureUniquePatientName,
  applyImportEntry,
  syncSettingsLanHostDiskSection,
  buildPatientEntry,
  closeSettingsDropdown,
});

}

export function runInitialFeatureBoot() {
  initChromeAppearance();
  syncLabHistoryCollapseUI();
  wireEstadoActualPasteModal();
  wireDriveImportModal();
  wireEaModalDismiss();
  syncCensoExportButtonVisibility();
}
