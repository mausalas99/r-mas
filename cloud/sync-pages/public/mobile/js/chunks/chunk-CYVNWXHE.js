import {
  buildLabPanelSkeletonHtml
} from "/mobile/js/chunks/chunk-PAAJVTB4.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WD3AJTQB.js";

// public/js/lazy-feature-routes-core.mjs
function patchWindowHandlers(handlers) {
  try {
    Object.assign(window, handlers);
  } catch (err) {
    console.error("[lazy-feature-routes] patchWindowHandlers", err);
  }
}
function lazyWindowHandler(exportName, loader) {
  return function lazyHandler() {
    var args = arguments;
    void loader().then(function(mod) {
      var fn = mod[exportName];
      if (typeof fn !== "function") {
        console.error("[lazy-feature-routes] missing handler", exportName);
        return;
      }
      fn.apply(null, args);
    });
  };
}
function buildLazyWindowHandlers(nameToExport, loader) {
  var out = {};
  for (var handlerName of Object.keys(nameToExport)) {
    out[handlerName] = lazyWindowHandler(nameToExport[handlerName], loader);
  }
  return out;
}

// public/js/lazy-feature-routes-handlers.mjs
var platformHandlerNames = {
  lockClinicalDatabaseNow: "lockClinicalDatabaseNow",
  verifyForensicAuditChain: "verifyForensicAuditChain",
  exportClinicalDbBackupJson: "exportClinicalDbBackupJson",
  exportRecoverCensusRangeJson: "exportRecoverCensusRangeJson",
  exportClinicalDbBackupDb: "exportClinicalDbBackupDb",
  exportAuditLog: "exportAuditLog",
  exportMedCatalogBundle: "exportMedCatalogBundle",
  triggerImportMedCatalog: "triggerImportMedCatalog",
  onMedCatalogFileChosen: "onMedCatalogFileChosen",
  openUserDataFolderFromSettings: "openUserDataFolderFromSettings",
  onIdleLockSelectChange: "onIdleLockSelectChange",
  changeIdleLockPin: "changeIdleLockPin",
  submitIdleLockPin: "submitIdleLockPin",
  openWipeDataModal: "openWipeDataModal",
  closeWipeDataModal: "closeWipeDataModal",
  wipeCacheConfirmed: "wipeCacheConfirmed",
  wipeAllConfirmed: "wipeAllConfirmed",
  updateAutoBackupSettingsFromUi: "updateAutoBackupSettingsFromUi",
  runAutoBackupNow: "runAutoBackupNow",
  exportDataBackup: "exportDataBackup",
  exportActivePatientBackup: "exportActivePatientBackup",
  exportRangeBackupPrompt: "exportRangeBackupPrompt",
  triggerImportRangeBackup: "triggerImportRangeBackup",
  onRangeBackupFileChosen: "onRangeBackupFileChosen",
  exportSyncBundlePrompt: "exportSyncBundlePrompt",
  triggerImportSyncBundle: "triggerImportSyncBundle",
  onSyncBundleFileChosen: "onSyncBundleFileChosen",
  triggerImportActivePatientBackup: "triggerImportActivePatientBackup",
  triggerImportBackup: "triggerImportBackup",
  onPatientBackupFileChosen: "onPatientBackupFileChosen",
  importBundledDemoPerez: "importBundledDemoPerez",
  onBackupFileChosen: "onBackupFileChosen",
  restorePreimportBackupPrompt: "restorePreimportBackupPrompt",
  checkForAppUpdates: "checkForAppUpdates",
  checkForRepairUpdate: "checkForRepairUpdate",
  setUpdateChannel: "setUpdateChannel",
  setUpdateTelemetryEnabled: "setUpdateTelemetryEnabled",
  onHardwareAccelerationChange: "onHardwareAccelerationChange",
  installUpdate: "installUpdate",
  hideUpdateModal: "hideUpdateModal"
};
function buildSettingsHelpWindowHandlersLazy(ensureSettingsHelpLoaded2) {
  return buildLazyWindowHandlers(
    {
      toggleSettingsSection: "toggleSettingsSection",
      toggleSettingsDropdown: "toggleSettingsDropdown",
      closeSettingsDropdown: "closeSettingsDropdown",
      expandSettingsAccordionBackupSync: "expandSettingsAccordionBackupSync",
      syncTeamSyncHeaderButton: "syncTeamSyncHeaderButton",
      openQuickHelp: "openQuickHelp",
      closeQuickHelp: "closeQuickHelp",
      onHelpSearchInput: "onHelpSearchInput",
      onHelpSearchKeydown: "onHelpSearchKeydown",
      onHelpListKeydown: "onHelpListKeydown",
      closeReleaseNotes: "closeReleaseNotes",
      startMiniTour: "startMiniTour",
      startHelpTourMain: "startHelpTourMain",
      togglePresentationModeFromHelp: "togglePresentationModeFromHelp",
      exportCensoPdfFromHelp: "exportCensoPdfFromHelp",
      guidedTourIntroChooseSala: "guidedTourIntroChooseSala",
      guidedTourIntroChooseInterconsulta: "guidedTourIntroChooseInterconsulta",
      guidedTourIntroSkip: "guidedTourIntroSkip",
      skipGuidedTour: "skipGuidedTour",
      toggleTourDockCollapsed: "toggleTourDockCollapsed",
      onTourDockClick: "onTourDockClick",
      guidedTourClickNext: "guidedTourClickNext",
      guidedTourClickPrev: "guidedTourClickPrev",
      guidedTourPause: "guidedTourPause",
      guidedTourFinish: "finishGuidedTour",
      startTourModule: "startTourModule",
      startHelpTourInterconsulta: "startHelpTourInterconsulta",
      resetAndStartOnboarding: "resetAndStartOnboarding",
      insertLabTourSecondPatientExample: "insertLabTourSecondPatientExample",
      closeLabBulkTourHintModal: "closeLabBulkTourHintModal",
      resumeGuidedTourFromProgress: "resumeGuidedTourFromProgress",
      openLearnHub: "openLearnHub",
      closeLearnHub: "closeLearnHub",
      dismissGuardiaV7UpgradeCard: "dismissGuardiaV7UpgradeCard"
    },
    ensureSettingsHelpLoaded2
  );
}
function buildPlatformWindowHandlersLazy(ensurePlatformLoaded2) {
  return buildLazyWindowHandlers(platformHandlerNames, ensurePlatformLoaded2);
}
var commandPaletteWindowHandlersLazy = buildLazyWindowHandlers(
  {
    openCommandPalette: "openCommandPalette",
    closeCommandPalette: "closeCommandPalette"
  },
  function() {
    return import("/mobile/js/chunks/command-palette-3OITYA6T.js");
  }
);
var clinicalSyncModeSettingsHandlersLazy = buildLazyWindowHandlers(
  {
    enableClinicalLanFromSettings: "enableClinicalLanFromSettings",
    syncClinicalSyncModeSettingsUi: "syncClinicalSyncModeSettingsUi"
  },
  function() {
    return import("/mobile/js/chunks/clinical-sync-mode-settings-4KE2YMZX.js");
  }
);

// public/js/lazy-feature-routes-charts.mjs
var chartsPromise = null;
var chartsModules = null;
var chartsRuntimeCtx = null;
function ensureChartsLoaded() {
  if (chartsModules) return Promise.resolve(chartsModules);
  if (!chartsPromise) {
    chartsPromise = Promise.all([
      import("/mobile/js/chunks/tendencias-6BSBMFBS.js"),
      import("/mobile/js/chunks/estado-actual-charts-modal-N6ZYTXLG.js")
    ]).then(function(pair) {
      chartsModules = { tendencias: pair[0], eaChartsModal: pair[1] };
      registerLazyChartsRuntimes(chartsModules);
      return chartsModules;
    });
  }
  return chartsPromise;
}
function bindLazyChartsRuntimeCtx(ctx) {
  chartsRuntimeCtx = ctx;
}
function inferFechaLabSetFromIdFallback(set) {
  if (!set || set.fecha === "Anterior") return "";
  var id = String(set.id || "");
  if (!/^\d{10,}$/.test(id)) return "";
  var ms = parseInt(id, 10);
  if (id.length === 10) ms *= 1e3;
  var d = new Date(ms);
  var dd = String(d.getDate()).padStart(2, "0");
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var yyyy = d.getFullYear();
  return dd + "/" + mm + "/" + yyyy;
}
function getLabOutputPrefsFallback() {
  return {
    showBhExtendedLine: false,
    hideGasoAdvInterp: true,
    quickLabOutput: false
  };
}
function wireChartsRuntimeExports(tendMod) {
  if (!chartsRuntimeCtx) return;
  Object.assign(chartsRuntimeCtx, {
    renderTendencias: tendMod.renderTendencias,
    inferFechaLabSetFromId: tendMod.inferFechaLabSetFromId,
    getLabOutputPrefs: tendMod.getLabOutputPrefs,
    isGasoInterpretacionResLabChunk: tendMod.isGasoInterpretacionResLabChunk,
    isCitoquimInterpretacionResLabChunk: tendMod.isCitoquimInterpretacionResLabChunk,
    isAscitisInterpretacionResLabChunk: tendMod.isAscitisInterpretacionResLabChunk,
    citoquimInterpretacionBody_: tendMod.citoquimInterpretacionBody_,
    ascitisInterpretacionBody_: tendMod.ascitisInterpretacionBody_,
    formatBhExtendedTabLine: tendMod.formatBhExtendedTabLine,
    isBhMainResLabChunk: tendMod.isBhMainResLabChunk
  });
}
function registerLazyChartsRuntimes(mods) {
  var tendMod = mods.tendencias;
  var eaMod = mods.eaChartsModal;
  if (chartsRuntimeCtx) {
    tendMod.registerTendenciasRuntime(chartsRuntimeCtx);
    eaMod.registerEstadoActualChartsModalRuntime({
      getActiveId: function() {
        return typeof chartsRuntimeCtx.getActiveId === "function" ? chartsRuntimeCtx.getActiveId() : null;
      },
      getPatient: function() {
        if (typeof chartsRuntimeCtx.getActivePatient === "function") {
          return chartsRuntimeCtx.getActivePatient();
        }
        return null;
      },
      showToast: function(msg, type) {
        if (typeof chartsRuntimeCtx.showToast === "function") {
          chartsRuntimeCtx.showToast(msg, type);
        }
      }
    });
    wireChartsRuntimeExports(tendMod);
  }
  tendMod.seedTendHiddenDefaults();
  eaMod.wireEaChartsModalDismiss();
  patchWindowHandlers(tendMod.tendenciasWindowHandlers);
  patchWindowHandlers(eaMod.windowHandlers);
}
function chartsAsyncFn(exportName, fallback) {
  return function chartsAsyncProxy() {
    var args = arguments;
    if (chartsModules) {
      var fn = chartsModules.tendencias[exportName];
      if (typeof fn === "function") return fn.apply(null, args);
      return;
    }
    void ensureChartsLoaded().then(function(mods) {
      var loadedFn = mods.tendencias[exportName];
      if (typeof loadedFn === "function") loadedFn.apply(null, args);
      else if (typeof fallback === "function") fallback.apply(null, args);
    });
  };
}
function chartsSyncFn(exportName, fallback) {
  return function chartsSyncProxy() {
    var args = arguments;
    if (chartsModules) {
      var fn = chartsModules.tendencias[exportName];
      if (typeof fn === "function") return fn.apply(null, args);
    }
    return fallback.apply(null, args);
  };
}
var chartsRuntimeProxies = {
  renderTendencias: chartsAsyncFn("renderTendencias"),
  inferFechaLabSetFromId: chartsSyncFn("inferFechaLabSetFromId", inferFechaLabSetFromIdFallback),
  getLabOutputPrefs: chartsSyncFn("getLabOutputPrefs", getLabOutputPrefsFallback),
  isGasoInterpretacionResLabChunk: chartsSyncFn("isGasoInterpretacionResLabChunk", function() {
    return false;
  }),
  isCitoquimInterpretacionResLabChunk: chartsSyncFn("isCitoquimInterpretacionResLabChunk", function() {
    return false;
  }),
  isAscitisInterpretacionResLabChunk: chartsSyncFn("isAscitisInterpretacionResLabChunk", function() {
    return false;
  }),
  citoquimInterpretacionBody_: chartsSyncFn("citoquimInterpretacionBody_", function() {
    return "";
  }),
  ascitisInterpretacionBody_: chartsSyncFn("ascitisInterpretacionBody_", function() {
    return "";
  }),
  formatBhExtendedTabLine: chartsSyncFn("formatBhExtendedTabLine", function() {
    return "";
  }),
  isBhMainResLabChunk: chartsSyncFn("isBhMainResLabChunk", function() {
    return false;
  })
};
function lazyChartsClose(exportName) {
  return function lazyClose() {
    void ensureChartsLoaded().then(function(mods) {
      var fn = mods.tendencias[exportName];
      if (typeof fn === "function") fn();
    });
  };
}
var chartsShellCloseProxies = {
  closeTendDetail: lazyChartsClose("closeTendDetail"),
  closeTendGroupModal: lazyChartsClose("closeTendGroupModal"),
  closeTendHiddenModal: lazyChartsClose("closeTendHiddenModal"),
  closeLabDisplayPrefsModal: lazyChartsClose("closeLabDisplayPrefsModal"),
  isTendGroupModalOpen: function() {
    if (chartsModules) return chartsModules.tendencias.isTendGroupModalOpen();
    return false;
  }
};
var tendenciasHandlerNames = {
  closeTendDetail: "closeTendDetail",
  openTendGroupModal: "openTendGroupModal",
  openTendGasoExtendedModal: "openTendGasoExtendedModal",
  closeTendGroupModal: "closeTendGroupModal",
  setTendGroupTab: "setTendGroupTab",
  copyTendGroupTablePng: "copyTendGroupTablePng",
  copyTendGroupTableText: "copyTendGroupTableText",
  toggleTendSection: "toggleTendSection",
  toggleTendAbnormalOnlyFilter: "toggleTendAbnormalOnlyFilter",
  tendHideSeriesFromCard: "tendHideSeriesFromCard",
  tendUnhideSeries: "tendUnhideSeries",
  tendResetAllHiddenSeries: "tendResetAllHiddenSeries",
  openTendHiddenModal: "openTendHiddenModal",
  closeTendHiddenModal: "closeTendHiddenModal",
  openTendDetail: "openTendDetail",
  tendCardActivate: "tendCardActivate",
  openLabDisplayPrefsModal: "openLabDisplayPrefsModal",
  closeLabDisplayPrefsModal: "closeLabDisplayPrefsModal",
  onLabDisplayPrefsChanged: "onLabDisplayPrefsChanged"
};
var eaChartsModalHandlerNames = {
  openEstadoActualChartsModal: "openEstadoActualChartsModal",
  closeEstadoActualChartsModal: "closeEstadoActualChartsModal"
};
var chartsWindowHandlersLazy = Object.assign(
  {},
  buildLazyWindowHandlers(tendenciasHandlerNames, function() {
    return ensureChartsLoaded().then(function(mods) {
      return mods.tendencias;
    });
  }),
  buildLazyWindowHandlers(eaChartsModalHandlerNames, function() {
    return ensureChartsLoaded().then(function(mods) {
      return mods.eaChartsModal;
    });
  })
);

// public/js/lazy-feature-routes.mjs
var settingsHelpPromise = null;
var platformPromise = null;
var labsPromise = null;
var settingsHelpModule = null;
var platformModule = null;
var labsModule = null;
var labsRuntimeCtx = null;
var BOOT_LAZY_ONLY_SUFFIXES = [
  "features/settings-help/index.mjs",
  "features/platform/index.mjs",
  "features/settings-help.mjs",
  "features/platform.mjs",
  "features/lab-panel.mjs",
  "features/tendencias.mjs",
  "features/estado-actual-charts-modal.mjs",
  "features/estado-actual-vital-history-modal.mjs",
  "features/clinical-entrega.mjs",
  "features/settings-help/tour-flow.mjs",
  "features/settings-help/tour-engine.mjs",
  "features/settings-help/settings-dropdown.mjs",
  "features/platform/audit.mjs",
  "features/platform/import-backup.mjs",
  "features/platform/offline.mjs"
];
var entregaPromise = null;
var entregaModule = null;
var eaVitalHistoryPromise = null;
var eaVitalHistoryModule = null;
var eaVitalHistoryRuntimeCtx = null;
var platformRuntimeCtx = null;
var settingsRuntimeCtx = null;
function ensureSettingsHelpLoaded() {
  if (settingsHelpModule) return Promise.resolve(settingsHelpModule);
  if (!settingsHelpPromise) {
    settingsHelpPromise = import("/mobile/js/chunks/settings-help-OLT2FPJ2.js").then(function(mod) {
      settingsHelpModule = mod;
      wireSettingsRuntimeExports(mod);
      return mod;
    });
  }
  return settingsHelpPromise;
}
function ensurePlatformLoaded() {
  if (platformModule) return Promise.resolve(platformModule);
  if (!platformPromise) {
    platformPromise = import("/mobile/js/chunks/platform-HPSNP5NC.js").then(function(mod) {
      platformModule = mod;
      wirePlatformRuntimeExports(mod);
      return mod;
    });
  }
  return platformPromise;
}
function ensureEntregaLoaded() {
  if (entregaModule) return Promise.resolve(entregaModule);
  if (!entregaPromise) {
    entregaPromise = import("/mobile/js/chunks/clinical-entrega-2SRJBIYS.js").then(function(mod) {
      entregaModule = mod;
      return mod;
    });
  }
  return entregaPromise;
}
function bindLazyEaVitalHistoryRuntimeCtx(ctx) {
  eaVitalHistoryRuntimeCtx = ctx;
}
function ensureEaVitalHistoryLoaded() {
  if (eaVitalHistoryModule) return Promise.resolve(eaVitalHistoryModule);
  if (!eaVitalHistoryPromise) {
    eaVitalHistoryPromise = import("/mobile/js/chunks/estado-actual-vital-history-modal-L646BGAA.js").then(function(mod) {
      eaVitalHistoryModule = mod;
      if (eaVitalHistoryRuntimeCtx) {
        mod.registerEaVitalHistoryModalRuntime(eaVitalHistoryRuntimeCtx);
      }
      mod.wireEaVitalHistoryModalDismiss();
      return mod;
    });
  }
  return eaVitalHistoryPromise;
}
var eaVitalHistoryWindowHandlersLazy = buildLazyWindowHandlers(
  {
    openEaVitalHistoryModal: "openEaVitalHistoryModal",
    closeEaVitalHistoryModal: "closeEaVitalHistoryModal"
  },
  ensureEaVitalHistoryLoaded
);
function bindLazyPlatformRuntimeCtx(ctx) {
  platformRuntimeCtx = ctx;
}
function bindLazySettingsRuntimeCtx(ctx) {
  settingsRuntimeCtx = ctx;
}
function wirePlatformRuntimeExports(mod) {
  if (!platformRuntimeCtx) return;
  Object.assign(platformRuntimeCtx, {
    addAuditEntry: mod.addAuditEntry,
    syncPreimportBackupUi: mod.syncPreimportBackupUi,
    applyImportEntry: mod.applyImportEntry,
    incrementPendingJobs: mod.incrementPendingJobs,
    decrementPendingJobs: mod.decrementPendingJobs,
    syncOfflineButtonStates: mod.syncOfflineButtonStates,
    isRpcOffline: mod.isRpcOffline
  });
}
function wireSettingsRuntimeExports(mod) {
  if (!settingsRuntimeCtx) return;
  Object.assign(settingsRuntimeCtx, {
    guidedTourAdvanceAfterNotaGenerated: mod.guidedTourAdvanceAfterNotaGenerated,
    guidedTourAdvanceAfterIndicaGenerated: mod.guidedTourAdvanceAfterIndicaGenerated,
    guidedTourAdvanceAfter: mod.guidedTourAdvanceAfter,
    onboardingAdvanceAfterParse: mod.onboardingAdvanceAfterParse,
    onboardingAdvanceAfterSend: mod.onboardingAdvanceAfterSend,
    tourAfterBulkLabParse: mod.tourAfterBulkLabParse,
    tourOnBulkPreviewPatientSaved: mod.tourOnBulkPreviewPatientSaved,
    closeSettingsDropdown: mod.closeSettingsDropdown,
    syncTeamSyncHeaderButton: mod.syncTeamSyncHeaderButton
  });
}
function lazyRuntimeFn(exportName, loader, fallback) {
  return function lazyRuntimeProxy() {
    var args = arguments;
    void loader().then(function(mod) {
      var fn = mod[exportName];
      if (typeof fn === "function") fn.apply(null, args);
      else if (typeof fallback === "function") fallback.apply(null, args);
    });
  };
}
function lazyRuntimeSyncFn(exportName, loader, fallback) {
  return function lazyRuntimeSyncProxy() {
    var args = arguments;
    if (loader === ensurePlatformLoaded && platformModule) {
      var live = platformModule[exportName];
      if (typeof live === "function") return live.apply(null, args);
    }
    if (loader === ensureSettingsHelpLoaded && settingsHelpModule) {
      var liveSettings = settingsHelpModule[exportName];
      if (typeof liveSettings === "function") return liveSettings.apply(null, args);
    }
    return fallback.apply(null, args);
  };
}
var platformRuntimeProxies = {
  addAuditEntry: lazyRuntimeFn("addAuditEntry", ensurePlatformLoaded),
  syncPreimportBackupUi: lazyRuntimeFn("syncPreimportBackupUi", ensurePlatformLoaded),
  applyImportEntry: lazyRuntimeFn("applyImportEntry", ensurePlatformLoaded),
  incrementPendingJobs: lazyRuntimeFn("incrementPendingJobs", ensurePlatformLoaded),
  decrementPendingJobs: lazyRuntimeFn("decrementPendingJobs", ensurePlatformLoaded),
  syncOfflineButtonStates: lazyRuntimeFn("syncOfflineButtonStates", ensurePlatformLoaded),
  isRpcOffline: lazyRuntimeSyncFn("isRpcOffline", ensurePlatformLoaded, function() {
    return false;
  })
};
var settingsHelpRuntimeProxies = {
  guidedTourAdvanceAfterNotaGenerated: lazyRuntimeFn(
    "guidedTourAdvanceAfterNotaGenerated",
    ensureSettingsHelpLoaded
  ),
  guidedTourAdvanceAfterIndicaGenerated: lazyRuntimeFn(
    "guidedTourAdvanceAfterIndicaGenerated",
    ensureSettingsHelpLoaded
  ),
  guidedTourAdvanceAfter: lazyRuntimeFn("guidedTourAdvanceAfter", ensureSettingsHelpLoaded),
  onboardingAdvanceAfterParse: lazyRuntimeFn("onboardingAdvanceAfterParse", ensureSettingsHelpLoaded),
  onboardingAdvanceAfterSend: lazyRuntimeFn("onboardingAdvanceAfterSend", ensureSettingsHelpLoaded),
  tourAfterBulkLabParse: lazyRuntimeFn("tourAfterBulkLabParse", ensureSettingsHelpLoaded),
  tourOnBulkPreviewPatientSaved: lazyRuntimeFn(
    "tourOnBulkPreviewPatientSaved",
    ensureSettingsHelpLoaded
  ),
  closeSettingsDropdown: lazyRuntimeFn("closeSettingsDropdown", ensureSettingsHelpLoaded),
  syncTeamSyncHeaderButton: lazyRuntimeFn("syncTeamSyncHeaderButton", ensureSettingsHelpLoaded)
};
function shellToggleSettingsDropdown() {
  void ensureSettingsHelpLoaded().then(function(mod) {
    mod.toggleSettingsDropdown();
  });
}
function shellCloseSettingsDropdown() {
  void ensureSettingsHelpLoaded().then(function(mod) {
    mod.closeSettingsDropdown();
  });
}
function shellSyncTeamSyncHeaderButton() {
  void ensureSettingsHelpLoaded().then(function(mod) {
    mod.syncTeamSyncHeaderButton();
  });
}
function ensureLabsLoaded() {
  if (labsModule) return Promise.resolve(labsModule);
  if (!labsPromise) {
    labsPromise = import("/mobile/js/chunks/lab-panel-IGOAO262.js").then(function(mod) {
      labsModule = mod;
      registerLazyLabsRuntimes(mod);
      return mod;
    });
  }
  return labsPromise;
}
function bindLazyLabsRuntimeCtx(ctx) {
  labsRuntimeCtx = ctx;
}
function wireLabsRuntimeExports(mod) {
  if (!labsRuntimeCtx) return;
  Object.assign(labsRuntimeCtx, {
    renderLabHistoryPanel: mod.renderLabHistoryPanel,
    syncLabOutputChrome: mod.syncLabOutputChrome,
    setLabHistoryPanelCollapsed: mod.setLabHistoryPanelCollapsed,
    syncLabHistoryCollapseUI: mod.syncLabHistoryCollapseUI,
    limpiarReporte: mod.limpiarReporte,
    enviarLabsANota: mod.enviarLabsANota,
    rerenderParsedLabOutputAfterPrefsChange: mod.rerenderParsedLabOutputAfterPrefsChange,
    clearLabOutputUi: mod.clearLabWorkbenchMinimalDom,
    getActiveLab: function() {
      return mod.getActiveLab();
    },
    consumeActiveLab: function() {
      var x = mod.getActiveLab();
      mod.setActiveLab(null);
      return x;
    },
    restoreActiveLab: function(x) {
      mod.setActiveLab(x);
    }
  });
}
function registerLazyLabsRuntimes(mod) {
  if (labsRuntimeCtx) {
    mod.registerLabPanelRuntime(labsRuntimeCtx);
    wireLabsRuntimeExports(mod);
  }
  patchWindowHandlers(mod.windowHandlers);
}
function showLabPanelLoadingSkeleton() {
  if (labsModule || typeof document === "undefined") return;
  var root = document.getElementById("appcontent-lab");
  if (!root || root.classList.contains("is-lab-chunk-loading")) return;
  root.classList.add("is-lab-chunk-loading");
  root.setAttribute("aria-busy", "true");
  var scroll = root.querySelector(".lab-work-scroll");
  var el = document.getElementById("lab-panel-loading");
  if (!el) {
    var wrap = document.createElement("div");
    wrap.innerHTML = buildLabPanelSkeletonHtml();
    el = wrap.firstElementChild;
    if (el && scroll) scroll.prepend(el);
    else if (el) root.prepend(el);
  }
  if (el) el.hidden = false;
}
function hideLabPanelLoadingSkeleton() {
  if (typeof document === "undefined") return;
  var root = document.getElementById("appcontent-lab");
  if (root) {
    root.classList.remove("is-lab-chunk-loading");
    root.removeAttribute("aria-busy");
  }
  var el = document.getElementById("lab-panel-loading");
  if (el) el.remove();
}
function labsAsyncFn(exportName) {
  return function labsAsyncProxy() {
    var args = arguments;
    if (labsModule) {
      var fn = labsModule[exportName];
      if (typeof fn === "function") return fn.apply(null, args);
      return;
    }
    void ensureLabsLoaded().then(function(mod) {
      var loadedFn = mod[exportName];
      if (typeof loadedFn === "function") loadedFn.apply(null, args);
    });
  };
}
var labsRuntimeProxies = {
  renderLabHistoryPanel: labsAsyncFn("renderLabHistoryPanel"),
  syncLabOutputChrome: labsAsyncFn("syncLabOutputChrome"),
  setLabHistoryPanelCollapsed: labsAsyncFn("setLabHistoryPanelCollapsed"),
  syncLabHistoryCollapseUI: labsAsyncFn("syncLabHistoryCollapseUI"),
  limpiarReporte: labsAsyncFn("limpiarReporte"),
  enviarLabsANota: labsAsyncFn("enviarLabsANota"),
  rerenderParsedLabOutputAfterPrefsChange: labsAsyncFn("rerenderParsedLabOutputAfterPrefsChange"),
  clearLabOutputUi: labsAsyncFn("clearLabWorkbenchMinimalDom"),
  getActiveLab: function() {
    if (labsModule) return labsModule.getActiveLab();
    return null;
  },
  consumeActiveLab: function() {
    if (!labsModule) return null;
    var x = labsModule.getActiveLab();
    labsModule.setActiveLab(null);
    return x;
  },
  restoreActiveLab: function(x) {
    if (labsModule) labsModule.setActiveLab(x);
  }
};
var labPanelWindowHandlersLazy = buildLazyWindowHandlers(
  {
    procesarReporte: "procesarReporte",
    clearLabInputAfterSuccessfulParse: "clearLabInputAfterSuccessfulParse",
    limpiarReporte: "limpiarReporte",
    replayLabHistorySet: "replayLabHistorySet",
    reprocessLabHistorySet: "reprocessLabHistorySet",
    deleteLabHistorySet: "deleteLabHistorySet",
    toggleLabHistoryPanel: "toggleLabHistoryPanel",
    syncLabHistoryCollapseUI: "syncLabHistoryCollapseUI",
    setLabHistoryPanelCollapsed: "setLabHistoryPanelCollapsed",
    labHistoryPanelIsCollapsed: "labHistoryPanelIsCollapsed",
    copiarLabsAlPortapapeles: "copiarLabsAlPortapapeles",
    openLabSomeTablesModal: "openLabSomeTablesModal",
    closeLabSomeTablesModal: "closeLabSomeTablesModal",
    closeLabHistoryMoreMenu: "closeLabHistoryMoreMenu",
    openLabPatientPicker: "openLabPatientPicker",
    openLabHistoryDedupeReview: "openLabHistoryDedupeReview",
    expandLabHistoryList: "expandLabHistoryList",
    consolidateLabHistoryByDayAndTipo: "consolidateLabHistoryByDayAndTipo",
    insertLabPatientSeparator: "insertLabPatientSeparator",
    onLabHistoryDateChange: "onLabHistoryDateChange",
    reprocessSelectedLabHistorySet: "reprocessSelectedLabHistorySet",
    deleteSelectedLabHistorySet: "deleteSelectedLabHistorySet",
    deleteAllLabHistorySets: "deleteAllLabHistorySets",
    openLabRepoImportModal: "openLabRepoImportModal",
    closeLabRepoImportModal: "closeLabRepoImportModal",
    confirmLabRepoImport: "confirmLabRepoImport",
    openLabRepoBatchModal: "openLabRepoBatchModal",
    closeLabRepoBatchModal: "closeLabRepoBatchModal",
    confirmLabRepoBatchImport: "confirmLabRepoBatchImport",
    labRepoBatchSelectAll: "labRepoBatchSelectAll",
    labRepoBatchSelectActive: "labRepoBatchSelectActive",
    labRepoBatchSelectNone: "labRepoBatchSelectNone",
    dismissLabRepoBatchQueue: "dismissLabRepoBatchQueue",
    openLabManualEntryModal: "openLabManualEntryModal",
    closeLabManualEntryModal: "closeLabManualEntryModal",
    confirmLabManualEntry: "confirmLabManualEntry"
  },
  ensureLabsLoaded
);
var settingsHelpWindowHandlersLazy = buildSettingsHelpWindowHandlersLazy(
  ensureSettingsHelpLoaded
);
var platformWindowHandlersLazy = buildPlatformWindowHandlersLazy(ensurePlatformLoaded);
async function registerLazyFeatureRuntimesBody(ctx) {
  const [platformMod, settingsMod] = await Promise.all([
    ensurePlatformLoaded(),
    ensureSettingsHelpLoaded(),
    ensureEaVitalHistoryLoaded()
  ]);
  platformMod.registerPlatformRuntime(ctx);
  settingsMod.registerSettingsHelpRuntime(ctx);
  patchWindowHandlers(settingsMod.settingsHelpWindowHandlers);
  patchWindowHandlers(platformMod.platformWindowHandlers);
}
async function registerLazyFeatureRuntimes(ctx) {
  if (isMobileWeb()) {
    void registerLazyFeatureRuntimesBody(ctx);
    return;
  }
  return registerLazyFeatureRuntimesBody(ctx);
}

export {
  patchWindowHandlers,
  buildLazyWindowHandlers,
  commandPaletteWindowHandlersLazy,
  clinicalSyncModeSettingsHandlersLazy,
  ensureChartsLoaded,
  bindLazyChartsRuntimeCtx,
  chartsRuntimeProxies,
  chartsShellCloseProxies,
  chartsWindowHandlersLazy,
  BOOT_LAZY_ONLY_SUFFIXES,
  ensureSettingsHelpLoaded,
  ensurePlatformLoaded,
  ensureEntregaLoaded,
  bindLazyEaVitalHistoryRuntimeCtx,
  ensureEaVitalHistoryLoaded,
  eaVitalHistoryWindowHandlersLazy,
  bindLazyPlatformRuntimeCtx,
  bindLazySettingsRuntimeCtx,
  platformRuntimeProxies,
  settingsHelpRuntimeProxies,
  shellToggleSettingsDropdown,
  shellCloseSettingsDropdown,
  shellSyncTeamSyncHeaderButton,
  ensureLabsLoaded,
  bindLazyLabsRuntimeCtx,
  showLabPanelLoadingSkeleton,
  hideLabPanelLoadingSkeleton,
  labsRuntimeProxies,
  labPanelWindowHandlersLazy,
  settingsHelpWindowHandlersLazy,
  platformWindowHandlersLazy,
  registerLazyFeatureRuntimes
};
//# sourceMappingURL=/js/chunks/chunk-CYVNWXHE.js.map
