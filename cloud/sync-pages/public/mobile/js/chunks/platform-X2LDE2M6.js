import {
  addAuditEntry,
  applyImportEntry,
  askConflictAction,
  base64ToBytes,
  buildFullBackupPayload,
  bytesToBase64,
  changeIdleLockPin,
  checkForAppUpdates,
  checkForRepairUpdate,
  checkMinVersionGate,
  checkRpcServerHealth,
  closeWipeDataModal,
  collectSyncEntries,
  compareSemver,
  decrementPendingJobs,
  decryptSyncPayload,
  defaultAutoBackupSettings,
  downloadBlob,
  downloadJsonPayload,
  downloadTextPayload,
  encryptSyncPayload,
  exportActivePatientBackup,
  exportAuditLog,
  exportClinicalDbBackupDb,
  exportClinicalDbBackupJson,
  exportDataBackup,
  exportMedCatalogBundle,
  exportRangeBackupPrompt,
  exportRecoverCensusRangeJson,
  exportSyncBundlePrompt,
  formatDateSlug,
  getAuditLog,
  getAutoBackupIndex,
  getAutoBackupSettings,
  getPlatformRuntime,
  getUpdateChannel,
  getUpdateTelemetryEnabled,
  hideUpdateModal,
  importBundledDemoPerez,
  importEntriesWithConflicts,
  incrementPendingJobs,
  initGoalGFeatures,
  initIdleLockFeature,
  initRpcServerHealthWatch,
  initUpdateChannelAndGate,
  installUpdate,
  isRpcOffline,
  lockClinicalDatabaseNow,
  maybeRunScheduledAutoBackup,
  mergeMedCatalogStored,
  migrateUpdateChannelToStableDefault,
  onBackupFileChosen,
  onHardwareAccelerationChange,
  onIdleLockSelectChange,
  onMedCatalogFileChosen,
  onPatientBackupFileChosen,
  onRangeBackupFileChosen,
  onSyncBundleFileChosen,
  openExportPatientsModal,
  openUserDataFolderFromSettings,
  openWipeDataModal,
  parseDateDMY,
  parseDateRangePrompt,
  patientInDateRange,
  refreshDbAuditCache,
  registerPlatformRuntime,
  restartAutoBackupScheduler,
  restorePreimportBackupPrompt,
  runAutoBackupNow,
  safeExportSlug,
  saveAutoBackupIndex,
  saveAutoBackupSettings,
  setRpcOffline,
  setUpdateChannel,
  setUpdateTelemetryEnabled,
  shouldRunScheduledBackup,
  submitIdleLockPin,
  syncAutoBackupUi,
  syncHardwareAccelerationUI,
  syncIdleLockSelectUi,
  syncOfflineButtonStates,
  syncPreimportBackupUi,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  triggerImportActivePatientBackup,
  triggerImportBackup,
  triggerImportMedCatalog,
  triggerImportRangeBackup,
  triggerImportSyncBundle,
  updateAutoBackupSettingsFromUi,
  verifyForensicAuditChain,
  wipeAllConfirmed,
  wipeCacheConfirmed
} from "/mobile/js/chunks/chunk-NGYHUPLR.js";
import "/mobile/js/chunks/chunk-WKKCGK2F.js";
import "/mobile/js/chunks/chunk-NIWULNNS.js";
import {
  syncDbSecuritySectionUi
} from "/mobile/js/chunks/chunk-2EVCQOXR.js";
import "/mobile/js/chunks/chunk-KYQCLTVP.js";
import "/mobile/js/chunks/chunk-CWXF5HCJ.js";
import "/mobile/js/chunks/chunk-HUK4RQZ3.js";
import "/mobile/js/chunks/chunk-DLYFNQTQ.js";
import "/mobile/js/chunks/chunk-EQKSFX4S.js";
import "/mobile/js/chunks/chunk-WTQUTVWF.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-4SRKXA7H.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-J5DWHQ6X.js";
import "/mobile/js/chunks/chunk-TDVHJVR3.js";
import "/mobile/js/chunks/chunk-KOO75KII.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-3BAWU2QN.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-4RTTJZJK.js";
import "/mobile/js/chunks/chunk-2KZNYZG7.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-X6BDSFTA.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-ZCN4RDXQ.js";
import "/mobile/js/chunks/chunk-WIYWDVMU.js";
import "/mobile/js/chunks/chunk-CZEKXCNB.js";
import "/mobile/js/chunks/chunk-7IBNSPMB.js";
import "/mobile/js/chunks/chunk-3TVMEDT5.js";
import "/mobile/js/chunks/chunk-3MF5KBNS.js";
import "/mobile/js/chunks/chunk-ID2H6AJR.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-HT2CLYXO.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-SRMOQLQ5.js";
import "/mobile/js/chunks/chunk-RHISJ2VG.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-XKV6IPP7.js";
import "/mobile/js/chunks/chunk-TTNY5OXP.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";

// public/js/features/platform/index.mjs
var platformWindowHandlers = {
  lockClinicalDatabaseNow,
  verifyForensicAuditChain,
  exportClinicalDbBackupJson,
  exportRecoverCensusRangeJson,
  exportClinicalDbBackupDb,
  openUserDataFolderFromSettings,
  onHardwareAccelerationChange,
  onIdleLockSelectChange,
  changeIdleLockPin,
  submitIdleLockPin,
  openWipeDataModal,
  closeWipeDataModal,
  wipeCacheConfirmed,
  wipeAllConfirmed,
  checkForAppUpdates,
  checkForRepairUpdate,
  setUpdateChannel,
  setUpdateTelemetryEnabled,
  exportDataBackup,
  exportActivePatientBackup,
  exportRangeBackupPrompt,
  openExportPatientsModal,
  triggerImportRangeBackup,
  onRangeBackupFileChosen,
  updateAutoBackupSettingsFromUi,
  runAutoBackupNow,
  exportAuditLog,
  exportMedCatalogBundle,
  triggerImportMedCatalog,
  onMedCatalogFileChosen,
  exportSyncBundlePrompt,
  triggerImportSyncBundle,
  onSyncBundleFileChosen,
  triggerImportActivePatientBackup,
  triggerImportBackup,
  onPatientBackupFileChosen,
  importBundledDemoPerez,
  onBackupFileChosen,
  restorePreimportBackupPrompt,
  syncPreimportBackupUi,
  installUpdate,
  hideUpdateModal
};
export {
  addAuditEntry,
  applyImportEntry,
  askConflictAction,
  base64ToBytes,
  buildFullBackupPayload,
  bytesToBase64,
  changeIdleLockPin,
  checkForAppUpdates,
  checkForRepairUpdate,
  checkMinVersionGate,
  checkRpcServerHealth,
  closeWipeDataModal,
  collectSyncEntries,
  compareSemver,
  decrementPendingJobs,
  decryptSyncPayload,
  defaultAutoBackupSettings,
  downloadBlob,
  downloadJsonPayload,
  downloadTextPayload,
  encryptSyncPayload,
  exportActivePatientBackup,
  exportAuditLog,
  exportClinicalDbBackupDb,
  exportClinicalDbBackupJson,
  exportDataBackup,
  exportMedCatalogBundle,
  exportRangeBackupPrompt,
  exportRecoverCensusRangeJson,
  exportSyncBundlePrompt,
  formatDateSlug,
  getAuditLog,
  getAutoBackupIndex,
  getAutoBackupSettings,
  getPlatformRuntime,
  getUpdateChannel,
  getUpdateTelemetryEnabled,
  hideUpdateModal,
  importBundledDemoPerez,
  importEntriesWithConflicts,
  incrementPendingJobs,
  initGoalGFeatures,
  initIdleLockFeature,
  initRpcServerHealthWatch,
  initUpdateChannelAndGate,
  installUpdate,
  isRpcOffline,
  lockClinicalDatabaseNow,
  maybeRunScheduledAutoBackup,
  mergeMedCatalogStored,
  migrateUpdateChannelToStableDefault,
  onBackupFileChosen,
  onHardwareAccelerationChange,
  onIdleLockSelectChange,
  onMedCatalogFileChosen,
  onPatientBackupFileChosen,
  onRangeBackupFileChosen,
  onSyncBundleFileChosen,
  openExportPatientsModal,
  openUserDataFolderFromSettings,
  openWipeDataModal,
  parseDateDMY,
  parseDateRangePrompt,
  patientInDateRange,
  platformWindowHandlers,
  refreshDbAuditCache,
  registerPlatformRuntime,
  restartAutoBackupScheduler,
  restorePreimportBackupPrompt,
  runAutoBackupNow,
  safeExportSlug,
  saveAutoBackupIndex,
  saveAutoBackupSettings,
  setRpcOffline,
  setUpdateChannel,
  setUpdateTelemetryEnabled,
  shouldRunScheduledBackup,
  submitIdleLockPin,
  syncAutoBackupUi,
  syncDbSecuritySectionUi,
  syncHardwareAccelerationUI,
  syncIdleLockSelectUi,
  syncOfflineButtonStates,
  syncPreimportBackupUi,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  triggerImportActivePatientBackup,
  triggerImportBackup,
  triggerImportMedCatalog,
  triggerImportRangeBackup,
  triggerImportSyncBundle,
  updateAutoBackupSettingsFromUi,
  verifyForensicAuditChain,
  wipeAllConfirmed,
  wipeCacheConfirmed
};
//# sourceMappingURL=/js/chunks/platform-X2LDE2M6.js.map
