/**
 * Lazy feature routes (BN-10) — boot hubs must not statically import index shells.
 */

import { isMobileWeb } from './mobile-web.mjs';
import { buildLabPanelSkeletonHtml } from './ui-skeleton.mjs';

let settingsHelpPromise = null;
let platformPromise = null;
let labsPromise = null;
let settingsHelpModule = null;
let platformModule = null;
let labsModule = null;
/** @type {Record<string, unknown>|null} */
let labsRuntimeCtx = null;

let chartsPromise = null;
/** @type {{ tendencias: typeof import('./features/tendencias.mjs'), eaChartsModal: typeof import('./features/estado-actual-charts-modal.mjs') } | null} */
let chartsModules = null;
/** @type {Record<string, unknown>|null} */
let chartsRuntimeCtx = null;

export const BOOT_LAZY_ONLY_SUFFIXES = [
  'features/settings-help/index.mjs',
  'features/platform/index.mjs',
  'features/settings-help.mjs',
  'features/platform.mjs',
  'features/lab-panel.mjs',
  'features/tendencias.mjs',
  'features/estado-actual-charts-modal.mjs',
  'features/clinical-entrega.mjs',
  'features/settings-help/tour-flow.mjs',
  'features/settings-help/tour-engine.mjs',
  'features/settings-help/settings-dropdown.mjs',
  'features/platform/audit.mjs',
  'features/platform/import-backup.mjs',
  'features/platform/offline.mjs',
];

let entregaPromise = null;
/** @type {typeof import('./features/clinical-entrega.mjs') | null} */
let entregaModule = null;

/** @type {Record<string, unknown> | null} */
let platformRuntimeCtx = null;

/** @type {Record<string, unknown> | null} */
let settingsRuntimeCtx = null;

/**
 * @returns {Promise<typeof import('./features/settings-help/index.mjs')>}
 */
export function ensureSettingsHelpLoaded() {
  if (settingsHelpModule) return Promise.resolve(settingsHelpModule);
  if (!settingsHelpPromise) {
    settingsHelpPromise = import('./features/settings-help/index.mjs').then(function (mod) {
      settingsHelpModule = mod;
      wireSettingsRuntimeExports(mod);
      return mod;
    });
  }
  return settingsHelpPromise;
}

/**
 * @returns {Promise<typeof import('./features/platform/index.mjs')>}
 */
export function ensurePlatformLoaded() {
  if (platformModule) return Promise.resolve(platformModule);
  if (!platformPromise) {
    platformPromise = import('./features/platform/index.mjs').then(function (mod) {
      platformModule = mod;
      wirePlatformRuntimeExports(mod);
      return mod;
    });
  }
  return platformPromise;
}

/**
 * @returns {Promise<typeof import('./features/clinical-entrega.mjs')>}
 */
export function ensureEntregaLoaded() {
  if (entregaModule) return Promise.resolve(entregaModule);
  if (!entregaPromise) {
    entregaPromise = import('./features/clinical-entrega.mjs').then(function (mod) {
      entregaModule = mod;
      return mod;
    });
  }
  return entregaPromise;
}

/** @param {Record<string, unknown>} ctx */
export function bindLazyPlatformRuntimeCtx(ctx) {
  platformRuntimeCtx = ctx;
}

/** @param {Record<string, unknown>} ctx */
export function bindLazySettingsRuntimeCtx(ctx) {
  settingsRuntimeCtx = ctx;
}

/**
 * @param {typeof import('./features/platform/index.mjs')} mod
 */
function wirePlatformRuntimeExports(mod) {
  if (!platformRuntimeCtx) return;
  Object.assign(platformRuntimeCtx, {
    addAuditEntry: mod.addAuditEntry,
    syncPreimportBackupUi: mod.syncPreimportBackupUi,
    applyImportEntry: mod.applyImportEntry,
    incrementPendingJobs: mod.incrementPendingJobs,
    decrementPendingJobs: mod.decrementPendingJobs,
    syncOfflineButtonStates: mod.syncOfflineButtonStates,
    isRpcOffline: mod.isRpcOffline,
  });
}

/**
 * @param {typeof import('./features/settings-help/index.mjs')} mod
 */
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
    syncTeamSyncHeaderButton: mod.syncTeamSyncHeaderButton,
  });
}

/**
 * @param {string} exportName
 * @param {() => Promise<Record<string, unknown>>} loader
 * @param {Function} [fallback]
 */
function lazyRuntimeFn(exportName, loader, fallback) {
  return function lazyRuntimeProxy() {
    var args = arguments;
    void loader().then(function (mod) {
      var fn = mod[exportName];
      if (typeof fn === 'function') fn.apply(null, args);
      else if (typeof fallback === 'function') fallback.apply(null, args);
    });
  };
}

/**
 * @param {string} exportName
 * @param {() => Promise<Record<string, unknown>>} loader
 * @param {Function} fallback
 */
function lazyRuntimeSyncFn(exportName, loader, fallback) {
  return function lazyRuntimeSyncProxy() {
    var args = arguments;
    if (loader === ensurePlatformLoaded && platformModule) {
      var live = platformModule[exportName];
      if (typeof live === 'function') return live.apply(null, args);
    }
    if (loader === ensureSettingsHelpLoaded && settingsHelpModule) {
      var liveSettings = settingsHelpModule[exportName];
      if (typeof liveSettings === 'function') return liveSettings.apply(null, args);
    }
    return fallback.apply(null, args);
  };
}

/** Proxies until ensurePlatformLoaded wires real exports onto runtime ctx. */
export const platformRuntimeProxies = {
  addAuditEntry: lazyRuntimeFn('addAuditEntry', ensurePlatformLoaded),
  syncPreimportBackupUi: lazyRuntimeFn('syncPreimportBackupUi', ensurePlatformLoaded),
  applyImportEntry: lazyRuntimeFn('applyImportEntry', ensurePlatformLoaded),
  incrementPendingJobs: lazyRuntimeFn('incrementPendingJobs', ensurePlatformLoaded),
  decrementPendingJobs: lazyRuntimeFn('decrementPendingJobs', ensurePlatformLoaded),
  syncOfflineButtonStates: lazyRuntimeFn('syncOfflineButtonStates', ensurePlatformLoaded),
  isRpcOffline: lazyRuntimeSyncFn('isRpcOffline', ensurePlatformLoaded, function () {
    return false;
  }),
};

/** Proxies until ensureSettingsHelpLoaded wires tour/settings helpers onto runtime ctx. */
export const settingsHelpRuntimeProxies = {
  guidedTourAdvanceAfterNotaGenerated: lazyRuntimeFn(
    'guidedTourAdvanceAfterNotaGenerated',
    ensureSettingsHelpLoaded
  ),
  guidedTourAdvanceAfterIndicaGenerated: lazyRuntimeFn(
    'guidedTourAdvanceAfterIndicaGenerated',
    ensureSettingsHelpLoaded
  ),
  guidedTourAdvanceAfter: lazyRuntimeFn('guidedTourAdvanceAfter', ensureSettingsHelpLoaded),
  onboardingAdvanceAfterParse: lazyRuntimeFn('onboardingAdvanceAfterParse', ensureSettingsHelpLoaded),
  onboardingAdvanceAfterSend: lazyRuntimeFn('onboardingAdvanceAfterSend', ensureSettingsHelpLoaded),
  tourAfterBulkLabParse: lazyRuntimeFn('tourAfterBulkLabParse', ensureSettingsHelpLoaded),
  tourOnBulkPreviewPatientSaved: lazyRuntimeFn(
    'tourOnBulkPreviewPatientSaved',
    ensureSettingsHelpLoaded
  ),
  closeSettingsDropdown: lazyRuntimeFn('closeSettingsDropdown', ensureSettingsHelpLoaded),
  syncTeamSyncHeaderButton: lazyRuntimeFn('syncTeamSyncHeaderButton', ensureSettingsHelpLoaded),
};

export function shellToggleSettingsDropdown() {
  void ensureSettingsHelpLoaded().then(function (mod) {
    mod.toggleSettingsDropdown();
  });
}

export function shellCloseSettingsDropdown() {
  void ensureSettingsHelpLoaded().then(function (mod) {
    mod.closeSettingsDropdown();
  });
}

export function shellSyncTeamSyncHeaderButton() {
  void ensureSettingsHelpLoaded().then(function (mod) {
    mod.syncTeamSyncHeaderButton();
  });
}

/**
 * @returns {Promise<typeof import('./features/lab-panel.mjs')>}
 */
export function ensureLabsLoaded() {
  if (labsModule) return Promise.resolve(labsModule);
  if (!labsPromise) {
    labsPromise = import('./features/lab-panel.mjs').then(function (mod) {
      labsModule = mod;
      registerLazyLabsRuntimes(mod);
      return mod;
    });
  }
  return labsPromise;
}

/** @param {Record<string, unknown>} ctx */
export function bindLazyLabsRuntimeCtx(ctx) {
  labsRuntimeCtx = ctx;
}

/**
 * @param {typeof import('./features/lab-panel.mjs')} mod
 */
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
    getActiveLab: function () {
      return mod.getActiveLab();
    },
    consumeActiveLab: function () {
      var x = mod.getActiveLab();
      mod.setActiveLab(null);
      return x;
    },
    restoreActiveLab: function (x) {
      mod.setActiveLab(x);
    },
  });
}

/**
 * @param {typeof import('./features/lab-panel.mjs')} mod
 */
function registerLazyLabsRuntimes(mod) {
  if (labsRuntimeCtx) {
    mod.registerLabPanelRuntime(labsRuntimeCtx);
    wireLabsRuntimeExports(mod);
  }
  patchWindowHandlers(mod.windowHandlers);
}

export function showLabPanelLoadingSkeleton() {
  if (labsModule || typeof document === 'undefined') return;
  var root = document.getElementById('appcontent-lab');
  if (!root || root.classList.contains('is-lab-chunk-loading')) return;
  root.classList.add('is-lab-chunk-loading');
  root.setAttribute('aria-busy', 'true');
  var scroll = root.querySelector('.lab-work-scroll');
  var el = document.getElementById('lab-panel-loading');
  if (!el) {
    var wrap = document.createElement('div');
    wrap.innerHTML = buildLabPanelSkeletonHtml();
    el = wrap.firstElementChild;
    if (el && scroll) scroll.prepend(el);
    else if (el) root.prepend(el);
  }
  if (el) el.hidden = false;
}

export function hideLabPanelLoadingSkeleton() {
  if (typeof document === 'undefined') return;
  var root = document.getElementById('appcontent-lab');
  if (root) {
    root.classList.remove('is-lab-chunk-loading');
    root.removeAttribute('aria-busy');
  }
  var el = document.getElementById('lab-panel-loading');
  if (el) el.remove();
}

/**
 * @param {string} exportName
 */
function labsAsyncFn(exportName) {
  return function labsAsyncProxy() {
    var args = arguments;
    if (labsModule) {
      var fn = labsModule[exportName];
      if (typeof fn === 'function') return fn.apply(null, args);
      return;
    }
    void ensureLabsLoaded().then(function (mod) {
      var loadedFn = mod[exportName];
      if (typeof loadedFn === 'function') loadedFn.apply(null, args);
    });
  };
}

/** Proxies until ensureLabsLoaded wires real exports onto runtime ctx. */
export const labsRuntimeProxies = {
  renderLabHistoryPanel: labsAsyncFn('renderLabHistoryPanel'),
  syncLabOutputChrome: labsAsyncFn('syncLabOutputChrome'),
  setLabHistoryPanelCollapsed: labsAsyncFn('setLabHistoryPanelCollapsed'),
  syncLabHistoryCollapseUI: labsAsyncFn('syncLabHistoryCollapseUI'),
  limpiarReporte: labsAsyncFn('limpiarReporte'),
  enviarLabsANota: labsAsyncFn('enviarLabsANota'),
  rerenderParsedLabOutputAfterPrefsChange: labsAsyncFn('rerenderParsedLabOutputAfterPrefsChange'),
  clearLabOutputUi: labsAsyncFn('clearLabWorkbenchMinimalDom'),
  getActiveLab: function () {
    if (labsModule) return labsModule.getActiveLab();
    return null;
  },
  consumeActiveLab: function () {
    if (!labsModule) return null;
    var x = labsModule.getActiveLab();
    labsModule.setActiveLab(null);
    return x;
  },
  restoreActiveLab: function (x) {
    if (labsModule) labsModule.setActiveLab(x);
  },
};

export const labPanelWindowHandlersLazy = buildLazyWindowHandlers(
  {
    procesarReporte: 'procesarReporte',
    clearLabInputAfterSuccessfulParse: 'clearLabInputAfterSuccessfulParse',
    limpiarReporte: 'limpiarReporte',
    replayLabHistorySet: 'replayLabHistorySet',
    reprocessLabHistorySet: 'reprocessLabHistorySet',
    deleteLabHistorySet: 'deleteLabHistorySet',
    toggleLabHistoryPanel: 'toggleLabHistoryPanel',
    syncLabHistoryCollapseUI: 'syncLabHistoryCollapseUI',
    setLabHistoryPanelCollapsed: 'setLabHistoryPanelCollapsed',
    labHistoryPanelIsCollapsed: 'labHistoryPanelIsCollapsed',
    copiarLabsAlPortapapeles: 'copiarLabsAlPortapapeles',
    openLabSomeTablesModal: 'openLabSomeTablesModal',
    closeLabSomeTablesModal: 'closeLabSomeTablesModal',
    openSesionIngresoSendModal: 'openSesionIngresoSendModal',
    closeSesionIngresoSendModal: 'closeSesionIngresoSendModal',
    closeLabHistoryMoreMenu: 'closeLabHistoryMoreMenu',
    openLabPatientPicker: 'openLabPatientPicker',
    openLabHistoryDedupeReview: 'openLabHistoryDedupeReview',
    expandLabHistoryList: 'expandLabHistoryList',
    consolidateLabHistoryByDayAndTipo: 'consolidateLabHistoryByDayAndTipo',
    insertLabPatientSeparator: 'insertLabPatientSeparator',
    onLabHistoryDateChange: 'onLabHistoryDateChange',
    reprocessSelectedLabHistorySet: 'reprocessSelectedLabHistorySet',
    deleteSelectedLabHistorySet: 'deleteSelectedLabHistorySet',
  },
  ensureLabsLoaded
);

/**
 * @returns {Promise<{ tendencias: typeof import('./features/tendencias.mjs'), eaChartsModal: typeof import('./features/estado-actual-charts-modal.mjs') }>}
 */
export function ensureChartsLoaded() {
  if (chartsModules) return Promise.resolve(chartsModules);
  if (!chartsPromise) {
    chartsPromise = Promise.all([
      import('./features/tendencias.mjs'),
      import('./features/estado-actual-charts-modal.mjs'),
    ]).then(function (pair) {
      chartsModules = { tendencias: pair[0], eaChartsModal: pair[1] };
      registerLazyChartsRuntimes(chartsModules);
      return chartsModules;
    });
  }
  return chartsPromise;
}

/** @param {Record<string, unknown>} ctx */
export function bindLazyChartsRuntimeCtx(ctx) {
  chartsRuntimeCtx = ctx;
}

function inferFechaLabSetFromIdFallback(set) {
  if (!set || set.fecha === 'Anterior') return '';
  var id = String(set.id || '');
  if (!/^\d{10,}$/.test(id)) return '';
  var ms = parseInt(id, 10);
  if (id.length === 10) ms *= 1000;
  var d = new Date(ms);
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yyyy = d.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

function getLabOutputPrefsFallback() {
  return {
    showBhExtendedLine: false,
    hideGasoAdvInterp: true,
    quickLabOutput: false,
  };
}

/**
 * @param {typeof import('./features/tendencias.mjs')} tendMod
 */
function wireChartsRuntimeExports(tendMod) {
  if (!chartsRuntimeCtx) return;
  Object.assign(chartsRuntimeCtx, {
    renderTendencias: tendMod.renderTendencias,
    inferFechaLabSetFromId: tendMod.inferFechaLabSetFromId,
    getLabOutputPrefs: tendMod.getLabOutputPrefs,
    isGasoInterpretacionResLabChunk: tendMod.isGasoInterpretacionResLabChunk,
    isAscitisInterpretacionResLabChunk: tendMod.isAscitisInterpretacionResLabChunk,
    ascitisInterpretacionBody_: tendMod.ascitisInterpretacionBody_,
    formatBhExtendedTabLine: tendMod.formatBhExtendedTabLine,
    isBhMainResLabChunk: tendMod.isBhMainResLabChunk,
  });
}

/**
 * @param {{ tendencias: typeof import('./features/tendencias.mjs'), eaChartsModal: typeof import('./features/estado-actual-charts-modal.mjs') }} mods
 */
function registerLazyChartsRuntimes(mods) {
  var tendMod = mods.tendencias;
  var eaMod = mods.eaChartsModal;
  if (chartsRuntimeCtx) {
    tendMod.registerTendenciasRuntime(chartsRuntimeCtx);
    eaMod.registerEstadoActualChartsModalRuntime({
      getActiveId: function () {
        return typeof chartsRuntimeCtx.getActiveId === 'function' ? chartsRuntimeCtx.getActiveId() : null;
      },
      getPatient: function () {
        if (typeof chartsRuntimeCtx.getActivePatient === 'function') {
          return chartsRuntimeCtx.getActivePatient();
        }
        return null;
      },
      showToast: function (msg, type) {
        if (typeof chartsRuntimeCtx.showToast === 'function') {
          chartsRuntimeCtx.showToast(msg, type);
        }
      },
    });
    wireChartsRuntimeExports(tendMod);
  }
  tendMod.seedTendHiddenDefaults();
  eaMod.wireEaChartsModalDismiss();
  patchWindowHandlers(tendMod.tendenciasWindowHandlers);
  patchWindowHandlers(eaMod.windowHandlers);
}

/**
 * @param {string} exportName
 * @param {Function} [fallback]
 */
function chartsAsyncFn(exportName, fallback) {
  return function chartsAsyncProxy() {
    var args = arguments;
    if (chartsModules) {
      var fn = chartsModules.tendencias[exportName];
      if (typeof fn === 'function') return fn.apply(null, args);
      return;
    }
    void ensureChartsLoaded().then(function (mods) {
      var loadedFn = mods.tendencias[exportName];
      if (typeof loadedFn === 'function') loadedFn.apply(null, args);
      else if (typeof fallback === 'function') fallback.apply(null, args);
    });
  };
}

/**
 * @param {string} exportName
 * @param {Function} fallback
 */
function chartsSyncFn(exportName, fallback) {
  return function chartsSyncProxy() {
    var args = arguments;
    if (chartsModules) {
      var fn = chartsModules.tendencias[exportName];
      if (typeof fn === 'function') return fn.apply(null, args);
    }
    return fallback.apply(null, args);
  };
}

/** Proxies until ensureChartsLoaded wires real exports onto runtime ctx. */
export const chartsRuntimeProxies = {
  renderTendencias: chartsAsyncFn('renderTendencias'),
  inferFechaLabSetFromId: chartsSyncFn('inferFechaLabSetFromId', inferFechaLabSetFromIdFallback),
  getLabOutputPrefs: chartsSyncFn('getLabOutputPrefs', getLabOutputPrefsFallback),
  isGasoInterpretacionResLabChunk: chartsSyncFn('isGasoInterpretacionResLabChunk', function () {
    return false;
  }),
  isAscitisInterpretacionResLabChunk: chartsSyncFn('isAscitisInterpretacionResLabChunk', function () {
    return false;
  }),
  ascitisInterpretacionBody_: chartsSyncFn('ascitisInterpretacionBody_', function () {
    return '';
  }),
  formatBhExtendedTabLine: chartsSyncFn('formatBhExtendedTabLine', function () {
    return '';
  }),
  isBhMainResLabChunk: chartsSyncFn('isBhMainResLabChunk', function () {
    return false;
  }),
};

/**
 * @param {string} exportName
 */
function lazyChartsClose(exportName) {
  return function lazyClose() {
    void ensureChartsLoaded().then(function (mods) {
      var fn = mods.tendencias[exportName];
      if (typeof fn === 'function') fn();
    });
  };
}

/** Modal dismiss hooks in app-shell until charts bundle loads. */
export const chartsShellCloseProxies = {
  closeTendDetail: lazyChartsClose('closeTendDetail'),
  closeTendGroupModal: lazyChartsClose('closeTendGroupModal'),
  closeTendHiddenModal: lazyChartsClose('closeTendHiddenModal'),
  closeLabDisplayPrefsModal: lazyChartsClose('closeLabDisplayPrefsModal'),
  isTendGroupModalOpen: function () {
    if (chartsModules) return chartsModules.tendencias.isTendGroupModalOpen();
    return false;
  },
};

/** @type {Record<string, string>} */
var tendenciasHandlerNames = {
  openSesionIngresoTrendsSendModal: 'openSesionIngresoTrendsSendModal',
  closeSesionIngresoTrendsSendModal: 'closeSesionIngresoTrendsSendModal',
  closeTendDetail: 'closeTendDetail',
  openTendGroupModal: 'openTendGroupModal',
  openTendGasoExtendedModal: 'openTendGasoExtendedModal',
  closeTendGroupModal: 'closeTendGroupModal',
  setTendGroupTab: 'setTendGroupTab',
  copyTendGroupTablePng: 'copyTendGroupTablePng',
  copyTendGroupTableText: 'copyTendGroupTableText',
  toggleTendSection: 'toggleTendSection',
  toggleTendAbnormalOnlyFilter: 'toggleTendAbnormalOnlyFilter',
  tendHideSeriesFromCard: 'tendHideSeriesFromCard',
  tendUnhideSeries: 'tendUnhideSeries',
  tendResetAllHiddenSeries: 'tendResetAllHiddenSeries',
  openTendHiddenModal: 'openTendHiddenModal',
  closeTendHiddenModal: 'closeTendHiddenModal',
  openTendDetail: 'openTendDetail',
  tendCardActivate: 'tendCardActivate',
  openLabDisplayPrefsModal: 'openLabDisplayPrefsModal',
  closeLabDisplayPrefsModal: 'closeLabDisplayPrefsModal',
  onLabDisplayPrefsChanged: 'onLabDisplayPrefsChanged',
};

/** @type {Record<string, string>} */
var eaChartsModalHandlerNames = {
  openEstadoActualChartsModal: 'openEstadoActualChartsModal',
  closeEstadoActualChartsModal: 'closeEstadoActualChartsModal',
};

export const chartsWindowHandlersLazy = Object.assign(
  {},
  buildLazyWindowHandlers(tendenciasHandlerNames, function () {
    return ensureChartsLoaded().then(function (mods) {
      return mods.tendencias;
    });
  }),
  buildLazyWindowHandlers(eaChartsModalHandlerNames, function () {
    return ensureChartsLoaded().then(function (mods) {
      return mods.eaChartsModal;
    });
  })
);

/**
 * @param {Record<string, Function>} handlers
 */
export function patchWindowHandlers(handlers) {
  try {
    Object.assign(window, handlers);
  } catch (err) {
    console.error('[lazy-feature-routes] patchWindowHandlers', err);
  }
}

/**
 * @param {string} exportName
 * @param {() => Promise<Record<string, unknown>>} loader
 */
function lazyWindowHandler(exportName, loader) {
  return function lazyHandler() {
    var args = arguments;
    void loader().then(function (mod) {
      var fn = mod[exportName];
      if (typeof fn !== 'function') {
        console.error('[lazy-feature-routes] missing handler', exportName);
        return;
      }
      fn.apply(null, args);
    });
  };
}

/**
 * @param {Record<string, string>} nameToExport — window handler name → module export name
 * @param {() => Promise<Record<string, unknown>>} loader
 */
export function buildLazyWindowHandlers(nameToExport, loader) {
  /** @type {Record<string, Function>} */
  var out = {};
  for (var handlerName of Object.keys(nameToExport)) {
    out[handlerName] = lazyWindowHandler(nameToExport[handlerName], loader);
  }
  return out;
}

/** Stubs until real handlers are patched after dynamic import. */
export const settingsHelpWindowHandlersLazy = buildLazyWindowHandlers(
  {
    toggleSettingsSection: 'toggleSettingsSection',
    toggleSettingsDropdown: 'toggleSettingsDropdown',
    closeSettingsDropdown: 'closeSettingsDropdown',
    expandSettingsAccordionBackupSync: 'expandSettingsAccordionBackupSync',
    syncTeamSyncHeaderButton: 'syncTeamSyncHeaderButton',
    openQuickHelp: 'openQuickHelp',
    closeQuickHelp: 'closeQuickHelp',
    onHelpSearchInput: 'onHelpSearchInput',
    onHelpSearchKeydown: 'onHelpSearchKeydown',
    onHelpListKeydown: 'onHelpListKeydown',
    closeReleaseNotes: 'closeReleaseNotes',
    startMiniTour: 'startMiniTour',
    startHelpTourMain: 'startHelpTourMain',
    togglePresentationModeFromHelp: 'togglePresentationModeFromHelp',
    exportCensoPdfFromHelp: 'exportCensoPdfFromHelp',
    guidedTourIntroChooseSala: 'guidedTourIntroChooseSala',
    guidedTourIntroChooseInterconsulta: 'guidedTourIntroChooseInterconsulta',
    guidedTourIntroSkip: 'guidedTourIntroSkip',
    skipGuidedTour: 'skipGuidedTour',
    toggleTourDockCollapsed: 'toggleTourDockCollapsed',
    onTourDockClick: 'onTourDockClick',
    guidedTourClickNext: 'guidedTourClickNext',
    guidedTourClickPrev: 'guidedTourClickPrev',
    guidedTourPause: 'guidedTourPause',
    guidedTourFinish: 'finishGuidedTour',
    startTourModule: 'startTourModule',
    startHelpTourInterconsulta: 'startHelpTourInterconsulta',
    resetAndStartOnboarding: 'resetAndStartOnboarding',
    insertLabTourSecondPatientExample: 'insertLabTourSecondPatientExample',
    closeLabBulkTourHintModal: 'closeLabBulkTourHintModal',
    resumeGuidedTourFromProgress: 'resumeGuidedTourFromProgress',
    startNeoCompanionTour: 'startNeoCompanionTour',
    openLearnHub: 'openLearnHub',
    closeLearnHub: 'closeLearnHub',
    dismissGuardiaV7UpgradeCard: 'dismissGuardiaV7UpgradeCard',
  },
  ensureSettingsHelpLoaded
);

/** @type {Record<string, Function>} */
var platformHandlerNames = {
  lockClinicalDatabaseNow: 'lockClinicalDatabaseNow',
  verifyForensicAuditChain: 'verifyForensicAuditChain',
  exportClinicalDbBackupJson: 'exportClinicalDbBackupJson',
  exportClinicalDbBackupDb: 'exportClinicalDbBackupDb',
  exportAuditLog: 'exportAuditLog',
  exportMedCatalogBundle: 'exportMedCatalogBundle',
  triggerImportMedCatalog: 'triggerImportMedCatalog',
  onMedCatalogFileChosen: 'onMedCatalogFileChosen',
  openUserDataFolderFromSettings: 'openUserDataFolderFromSettings',
  onIdleLockSelectChange: 'onIdleLockSelectChange',
  changeIdleLockPin: 'changeIdleLockPin',
  submitIdleLockPin: 'submitIdleLockPin',
  openWipeDataModal: 'openWipeDataModal',
  closeWipeDataModal: 'closeWipeDataModal',
  wipeCacheConfirmed: 'wipeCacheConfirmed',
  wipeAllConfirmed: 'wipeAllConfirmed',
  updateAutoBackupSettingsFromUi: 'updateAutoBackupSettingsFromUi',
  runAutoBackupNow: 'runAutoBackupNow',
  exportDataBackup: 'exportDataBackup',
  exportActivePatientBackup: 'exportActivePatientBackup',
  exportRangeBackupPrompt: 'exportRangeBackupPrompt',
  triggerImportRangeBackup: 'triggerImportRangeBackup',
  onRangeBackupFileChosen: 'onRangeBackupFileChosen',
  exportSyncBundlePrompt: 'exportSyncBundlePrompt',
  triggerImportSyncBundle: 'triggerImportSyncBundle',
  onSyncBundleFileChosen: 'onSyncBundleFileChosen',
  triggerImportActivePatientBackup: 'triggerImportActivePatientBackup',
  triggerImportBackup: 'triggerImportBackup',
  onPatientBackupFileChosen: 'onPatientBackupFileChosen',
  importBundledDemoPerez: 'importBundledDemoPerez',
  onBackupFileChosen: 'onBackupFileChosen',
  restorePreimportBackupPrompt: 'restorePreimportBackupPrompt',
  checkForAppUpdates: 'checkForAppUpdates',
  checkForRepairUpdate: 'checkForRepairUpdate',
  setUpdateChannel: 'setUpdateChannel',
  setUpdateTelemetryEnabled: 'setUpdateTelemetryEnabled',
  onHardwareAccelerationChange: 'onHardwareAccelerationChange',
  installUpdate: 'installUpdate',
  hideUpdateModal: 'hideUpdateModal',
};

export const platformWindowHandlersLazy = buildLazyWindowHandlers(
  platformHandlerNames,
  ensurePlatformLoaded
);

export const commandPaletteWindowHandlersLazy = buildLazyWindowHandlers(
  {
    openCommandPalette: 'openCommandPalette',
    closeCommandPalette: 'closeCommandPalette',
  },
  function () {
    return import('./features/command-palette.mjs');
  }
);

export const clinicalSyncModeSettingsHandlersLazy = buildLazyWindowHandlers(
  {
    enableClinicalLanFromSettings: 'enableClinicalLanFromSettings',
    syncClinicalSyncModeSettingsUi: 'syncClinicalSyncModeSettingsUi',
  },
  function () {
    return import('./features/clinical-sync-mode-settings.mjs');
  }
);

/**
 * Register platform + settings-help runtimes and replace lazy window stubs with real handlers.
 * @param {object} ctx
 */
async function registerLazyFeatureRuntimesBody(ctx) {
  const [platformMod, settingsMod] = await Promise.all([
    ensurePlatformLoaded(),
    ensureSettingsHelpLoaded(),
  ]);
  platformMod.registerPlatformRuntime(ctx);
  settingsMod.registerSettingsHelpRuntime(ctx);
  patchWindowHandlers(settingsMod.settingsHelpWindowHandlers);
  patchWindowHandlers(platformMod.platformWindowHandlers);
}

export async function registerLazyFeatureRuntimes(ctx) {
  if (isMobileWeb()) {
    void registerLazyFeatureRuntimesBody(ctx);
    return;
  }
  return registerLazyFeatureRuntimesBody(ctx);
}
