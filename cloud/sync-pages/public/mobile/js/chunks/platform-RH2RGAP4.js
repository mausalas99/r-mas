import {
  addAuditEntry,
  applyImportEntry,
  askConflictAction,
  base64ToBytes,
  buildFullBackupPayload,
  bytesToBase64,
  changeIdleLockPin,
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
  hideUpdateModal,
  importBundledDemoPerez,
  importEntriesWithConflicts,
  incrementPendingJobs,
  initGoalGFeatures,
  initIdleLockFeature,
  initRpcServerHealthWatch,
  initUpdateChannelAndGate,
  isRpcOffline,
  lockClinicalDatabaseNow,
  maybeRunScheduledAutoBackup,
  mergeMedCatalogStored,
  onBackupFileChosen,
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
  restartAutoBackupScheduler,
  restorePreimportBackupPrompt,
  runAutoBackupNow,
  safeExportSlug,
  saveAutoBackupIndex,
  saveAutoBackupSettings,
  setRpcOffline,
  shouldRunScheduledBackup,
  submitIdleLockPin,
  syncAutoBackupUi,
  syncIdleLockSelectUi,
  syncOfflineButtonStates,
  syncPreimportBackupUi,
  triggerImportActivePatientBackup,
  triggerImportBackup,
  triggerImportMedCatalog,
  triggerImportRangeBackup,
  triggerImportSyncBundle,
  updateAutoBackupSettingsFromUi,
  verifyForensicAuditChain,
  wipeAllConfirmed,
  wipeCacheConfirmed
} from "/mobile/js/chunks/chunk-TMPFUFBU.js";
import "/mobile/js/chunks/chunk-WQ5L4FZX.js";
import "/mobile/js/chunks/chunk-ONL4KPJ3.js";
import "/mobile/js/chunks/chunk-U6BZK27B.js";
import "/mobile/js/chunks/chunk-XWG2LQDN.js";
import "/mobile/js/chunks/chunk-FLRAL5YB.js";
import "/mobile/js/chunks/chunk-PWDSP7QN.js";
import "/mobile/js/chunks/chunk-VDGV3EZB.js";
import "/mobile/js/chunks/chunk-EM634A4Q.js";
import "/mobile/js/chunks/chunk-S7KMFXOR.js";
import "/mobile/js/chunks/chunk-43SWAHG6.js";
import "/mobile/js/chunks/chunk-VORZBJRG.js";
import "/mobile/js/chunks/chunk-CT2YJYKC.js";
import "/mobile/js/chunks/chunk-RSNFY6IK.js";
import "/mobile/js/chunks/chunk-DKL3XNPH.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-SZR4MTGX.js";
import "/mobile/js/chunks/chunk-YCVXJOA7.js";
import "/mobile/js/chunks/chunk-QEMMR6VK.js";
import "/mobile/js/chunks/chunk-JWTFWW4O.js";
import "/mobile/js/chunks/chunk-HVYKQKG5.js";
import "/mobile/js/chunks/chunk-UWLXNLAN.js";
import "/mobile/js/chunks/chunk-IXDNIHYC.js";
import "/mobile/js/chunks/chunk-YFJ366MU.js";
import "/mobile/js/chunks/chunk-Z7AG6BZL.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-T7RIOEVR.js";
import "/mobile/js/chunks/chunk-JTFIIC4P.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-R4TUTVRX.js";
import "/mobile/js/chunks/chunk-RMUFSCXL.js";
import "/mobile/js/chunks/chunk-HHBM77OL.js";
import "/mobile/js/chunks/chunk-CBI7THZ4.js";
import "/mobile/js/chunks/chunk-D4NKXSWN.js";
import "/mobile/js/chunks/chunk-65OLLRBJ.js";
import "/mobile/js/chunks/chunk-CX4N6SE7.js";
import "/mobile/js/chunks/chunk-AA7ORONM.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-JGESXDLG.js";
import "/mobile/js/chunks/chunk-SHV4FR3K.js";
import "/mobile/js/chunks/chunk-SOQEY2U2.js";
import "/mobile/js/chunks/chunk-IUWKNPSX.js";
import {
  checkForAppUpdates,
  checkForRepairUpdate,
  getPlatformRuntime,
  getUpdateChannel,
  getUpdateTelemetryEnabled,
  installUpdate,
  migrateUpdateChannelToStableDefault,
  onHardwareAccelerationChange,
  registerPlatformRuntime,
  setUpdateChannel,
  setUpdateTelemetryEnabled,
  syncHardwareAccelerationUI,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI
} from "/mobile/js/chunks/chunk-6P7TSNN6.js";
import "/mobile/js/chunks/chunk-JNMJGW22.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import {
  syncDbSecuritySectionUi
} from "/mobile/js/chunks/chunk-PJD3LECG.js";
import "/mobile/js/chunks/chunk-LN2N4VIO.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-4EH4XZVS.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-PLO52CII.js";
import "/mobile/js/chunks/chunk-WEOKZTSW.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-VAFCBXBV.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-B7NNRK4H.js";
import "/mobile/js/chunks/chunk-ZDAIWZ25.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-MLLRKYO6.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-K4PQIQOH.js";
import "/mobile/js/chunks/chunk-BTIFFDH4.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-HDEGXLWA.js";
import "/mobile/js/chunks/chunk-Y2YRXJMM.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-XV2TMACY.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";

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
//# sourceMappingURL=/js/chunks/platform-RH2RGAP4.js.map
