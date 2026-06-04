/**
 * Lazy feature routes (BN-10) — boot hubs must not statically import index shells.
 */

import { isMobileWeb } from './mobile-web.mjs';

let settingsHelpPromise = null;
let platformPromise = null;
let settingsHelpModule = null;
let platformModule = null;

export const BOOT_LAZY_ONLY_SUFFIXES = [
  'features/settings-help/index.mjs',
  'features/platform/index.mjs',
  'features/settings-help.mjs',
  'features/platform.mjs',
];

/**
 * @returns {Promise<typeof import('./features/settings-help/index.mjs')>}
 */
export function ensureSettingsHelpLoaded() {
  if (settingsHelpModule) return Promise.resolve(settingsHelpModule);
  if (!settingsHelpPromise) {
    settingsHelpPromise = import('./features/settings-help/index.mjs').then(function (mod) {
      settingsHelpModule = mod;
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
      return mod;
    });
  }
  return platformPromise;
}

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
    startTourModule: 'startTourModule',
    startHelpTourInterconsulta: 'startHelpTourInterconsulta',
    resetAndStartOnboarding: 'resetAndStartOnboarding',
    insertLabTourSecondPatientExample: 'insertLabTourSecondPatientExample',
    closeLabBulkTourHintModal: 'closeLabBulkTourHintModal',
    resumeGuidedTourFromProgress: 'resumeGuidedTourFromProgress',
    startNeoCompanionTour: 'startNeoCompanionTour',
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
