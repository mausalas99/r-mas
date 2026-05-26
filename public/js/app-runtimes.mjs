/**
 * Registro de runtimes de features (inyección de dependencias al cargar).
 */
import { storage } from './storage.js';
import { saveState } from './app-state.mjs';
import { migrateToV3 } from './mode-features.mjs';
import {
  splitResLabsByTipo,
  primaryTipoForLabSet,
  buildLabSetDateLine,
  dayKeyFromLabSet,
  rebuildEstudiosFromLabHistory,
  ensureParsedLabHistory,
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
} from './features/estado-actual-panel.mjs';
import {
  registerProcedureAgendaRuntime,
} from './features/agenda.mjs';
import {
  registerExpedienteRuntime,
} from './features/expediente.mjs';
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
  renderInnerTabs,
  syncInnerTabVisualOnly,
} from './features/pase-board.mjs';
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
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
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
  splitResLabsByTipo: splitResLabsByTipo,
  primaryTipoForLabSet: primaryTipoForLabSet,
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
  renderRecetaHu: renderRecetaHu,
  renderPaseBoard: renderPaseBoard,
  pushUndoSnapshot: pushUndoSnapshot,
  addAuditEntry: addAuditEntry,
  applyDefaultsToNewPatient: applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones: applyDefaultsToNewIndicaciones,
  enviarLabsANota: enviarLabsANota,
  ensureParsedLabHistory: ensureParsedLabHistory,
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
  saveState: saveState,
  showToast: showToast,
  emitLiveSyncTodoUpsert: emitLiveSyncTodoUpsert,
  refreshAllTodoUIs: refreshAllTodoUIs,
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
  rebuildEstudiosFromLabHistory: rebuildEstudiosFromLabHistory,
  inferFechaLabSetFromId: inferFechaLabSetFromId,
  dayKeyFromLabSet: dayKeyFromLabSet,
  primaryTipoForLabSet: primaryTipoForLabSet,
  refreshAllTodoUIs: refreshAllTodoUIs,
  emitLiveSyncTodoUpsert: emitLiveSyncTodoUpsert,
  removeAtbRisPanelsFromBody: removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels: wireAtbRisHoverPanels,
  getLabOutputPrefs: getLabOutputPrefs,
  isGasoInterpretacionResLabChunk: isGasoInterpretacionResLabChunk,
  formatBhExtendedTabLine: formatBhExtendedTabLine,
  isBhMainResLabChunk: isBhMainResLabChunk,
  isResLabChunkPureCultivo: isResLabChunkPureCultivo,
  buildCultivoOutputHtmlFragments: buildCultivoOutputHtmlFragments,
  buildLabSetDateLine: buildLabSetDateLine,
  refreshManejoPanel: renderManejo,
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
}
