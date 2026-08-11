const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // true cuando main.js desactivó la aceleración por hardware (performance.json):
  // el renderer degrada efectos caros en software (glass blur → no-blur).
  isSoftwareRender: process.argv.includes('--rplus-sw-render'),
  onUpdateAvailable: function(cb) {
    ipcRenderer.on('update-available', function(_e, payload) { cb(payload); });
  },
  onUpdateProgress: function(cb) {
    ipcRenderer.on('update-progress', function(_e, payload) { cb(payload); });
  },
  onUpdateReady: function(cb) {
    ipcRenderer.on('update-ready', function(_e, payload) { cb(payload); });
  },
  onUpdateNotAvailable: function(cb) {
    ipcRenderer.on('update-not-available', function(_e, payload) { cb(payload); });
  },
  onUpdateError: function(cb) {
    ipcRenderer.on('update-error', function(_e, msg) { cb(msg); });
  },
  installUpdate: function() {
    ipcRenderer.send('install-update');
  },
  openExternal: function(url) {
    return ipcRenderer.invoke('open-external', url);
  },
  checkForUpdates: function() {
    ipcRenderer.send('check-for-updates');
  },
  reinstallCurrentRelease: function() {
    ipcRenderer.send('reinstall-current-release');
  },
  downgradeToStable: function(version) {
    ipcRenderer.send('downgrade-to-stable', version);
  },
  resetUpdateFeed: function() {
    ipcRenderer.send('reset-update-feed');
  },
  onDowngradeFailed: function(cb) {
    ipcRenderer.on('downgrade-failed', function(_e, payload) { cb(payload); });
  },
  openDowngradeInstaller: function(version) {
    return ipcRenderer.invoke('open-downgrade-installer', version);
  },
  getAppVersion: function() {
    return ipcRenderer.invoke('get-app-version');
  },
  getNativeRuntimeStatus: function() {
    return ipcRenderer.invoke('get-native-runtime-status');
  },
  getUserDataPath: function() {
    return ipcRenderer.invoke('get-user-data-path');
  },
  openUserDataFolder: function() {
    return ipcRenderer.invoke('open-user-data-folder');
  },
  selectOutputDir: function() {
    return ipcRenderer.invoke('select-output-dir');
  },
  setApprovedOutputDir: function(dir) {
    return ipcRenderer.invoke('set-approved-output-dir', dir);
  },
  saveExportedDocument: function(opts) {
    return ipcRenderer.invoke('save-exported-document', opts);
  },
  generateDocument: function(opts) {
    return ipcRenderer.invoke('generate-document', opts);
  },
  labRepoFetch: function(payload) {
    return ipcRenderer.invoke('lab-repo-fetch', payload);
  },
  cloudSyncFetch: function(payload) {
    return ipcRenderer.invoke('cloud-sync-fetch', payload);
  },
  setUpdateChannel: function(channel) {
    ipcRenderer.send('set-update-channel', channel);
  },
  getPlatform: function() {
    return ipcRenderer.invoke('get-platform');
  },
  /** Información síncrona del chrome de ventana (sin IPC). */
  getWindowChromeFlags: function() {
    return {
      macTitleBarInset: process.platform === 'darwin',
      isWindows: process.platform === 'win32',
    };
  },
  /** Dev-only ward server (`R_PLUS_DEV_WARD_SERVER=1`). Production Nube builds never bind :3738. */
  ensureLanServerReady: function() {
    if (process.env.R_PLUS_DEV_WARD_SERVER !== '1') {
      return Promise.resolve({ ok: true, peer: false, wardServer: false });
    }
    return ipcRenderer.invoke('lan-ensure-server-ready');
  },
  writeClipboardText: function(text) {
    return ipcRenderer.invoke('clipboard-write-text', text);
  },
  relaunchApp: function() {
    ipcRenderer.send('relaunch-app');
  },
  getPerformancePrefs: function() {
    return ipcRenderer.invoke('get-performance-prefs');
  },
  setHardwareAcceleration: function(enabled) {
    return ipcRenderer.invoke('set-hardware-acceleration', !!enabled);
  },
  dbStatus: function() {
    return ipcRenderer.invoke('db:status');
  },
  dbMigrationProbe: function(opts) {
    return ipcRenderer.invoke('db:migration-probe', opts);
  },
  dbUnlock: function(opts) {
    return ipcRenderer.invoke('db:unlock', opts);
  },
  dbAutoUnlock: function(opts) {
    return ipcRenderer.invoke('db:auto-unlock', opts);
  },
  dbUnlockRecovery: function(opts) {
    return ipcRenderer.invoke('db:unlock-recovery', opts);
  },
  dbLock: function() {
    return ipcRenderer.invoke('db:lock');
  },
  dbClinicalLoadAll: function() {
    return ipcRenderer.invoke('db:clinical-load-all');
  },
  dbClinicalSaveAll: function(payload) {
    return ipcRenderer.invoke('db:clinical-save-all', payload);
  },
  dbClinicalCommand: function(payload) {
    return ipcRenderer.invoke('db:clinical-command', payload);
  },
  dbAuditVerify: function(opts) {
    return ipcRenderer.invoke('db:audit-verify', opts);
  },
  dbAuditExport: function(opts) {
    return ipcRenderer.invoke('db:audit-export', opts);
  },
  dbBackupExportJson: function() {
    return ipcRenderer.invoke('db:backup-export-json');
  },
  dbRecoverCensusRangeExport: function() {
    return ipcRenderer.invoke('db:recover-census-range-export');
  },
  dbBackupExportDb: function() {
    return ipcRenderer.invoke('db:backup-export-db');
  },
  dbChangePassphrase: function(opts) {
    return ipcRenderer.invoke('db:change-passphrase', opts);
  },
  dbClinicalAccessBootstrap: function(opts) {
    return ipcRenderer.invoke('db:clinical-access-bootstrap', opts);
  },
  dbClinicalScopeContext: function(opts) {
    return ipcRenderer.invoke('db:clinical-scope-context', opts);
  },
  dbPatientActiveTeamId: function(opts) {
    return ipcRenderer.invoke('db:patient-active-team-id', opts);
  },
  dbGuardiaCensus: function(opts) {
    return ipcRenderer.invoke('db:guardia-census', opts);
  },
  dbGuardiaResolve: function(opts) {
    return ipcRenderer.invoke('db:guardia-resolve', opts);
  },
  dbGuardiaUpsert: function(opts) {
    return ipcRenderer.invoke('db:guardia-upsert', opts);
  },
  dbEntregaTemplateList: function(opts) {
    return ipcRenderer.invoke('db:entrega-template-list', opts);
  },
  dbEntregaTemplateSaveUser: function(opts) {
    return ipcRenderer.invoke('db:entrega-template-save-user', opts);
  },
  dbEntregaTemplateSaveTeam: function(opts) {
    return ipcRenderer.invoke('db:entrega-template-save-team', opts);
  },
  dbEntregaTemplateDelete: function(opts) {
    return ipcRenderer.invoke('db:entrega-template-delete', opts);
  },
  dbRotationCycleGet: function() {
    return ipcRenderer.invoke('db:rotation-cycle-get');
  },
  dbRotationCycleUpsert: function(opts) {
    return ipcRenderer.invoke('db:rotation-cycle-upsert', opts);
  },
  dbRotationNueva: function(opts) {
    return ipcRenderer.invoke('db:rotation-nueva', opts);
  },
  dbRotationIncomingAssignments: function() {
    return ipcRenderer.invoke('db:rotation-incoming-assignments');
  },
  dbClinicalTeamsList: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-list', opts || {});
  },
  dbClinicalTeamsListBySala: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-list-by-sala', opts);
  },
  dbClinicalTeamsJoin: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-join', opts);
  },
  dbClinicalTeamsCreate: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-create', opts);
  },
  dbClinicalTeamsUpdate: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-update', opts);
  },
  dbClinicalTeamsArchive: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-archive', opts);
  },
  dbClinicalTeamsMemberAdd: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-member-add', opts);
  },
  dbClinicalUserLookup: function(opts) {
    return ipcRenderer.invoke('db:clinical-user-lookup', opts);
  },
  dbClinicalUserProvisionCloud: function(opts) {
    return ipcRenderer.invoke('db:clinical-user-provision-cloud', opts);
  },
  dbClinicalUserAdminProfile: function(opts) {
    return ipcRenderer.invoke('db:clinical-user-admin-profile', opts);
  },
  dbClinicalUsersList: function(opts) {
    return ipcRenderer.invoke('db:clinical-users-list', opts);
  },
  dbClinicalUserDelete: function(opts) {
    return ipcRenderer.invoke('db:clinical-user-delete', opts);
  },
  dbClinical79CutoverWipe: function() {
    return ipcRenderer.invoke('db:clinical-79-cutover-wipe');
  },
  dbClinicalTeamResolveCode: function(opts) {
    return ipcRenderer.invoke('db:clinical-team-resolve-code', opts);
  },
  dbClinicalTeamsMemberRemove: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-member-remove', opts);
  },
  dbClinicalTeamsGuardiaSet: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-guardia-set', opts);
  },
  dbClinicalTeamsGuardiaClear: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-guardia-clear', opts);
  },
  dbClinicalTeamsGuardiaGet: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-guardia-get', opts);
  },
  dbClinicalTeamsPromoteLeader: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-promote-leader', opts);
  },
  dbClinicalTeamGetById: function(opts) {
    return ipcRenderer.invoke('db:clinical-team-get-by-id', opts);
  },
  dbClinicalFindUserTeam: function(opts) {
    return ipcRenderer.invoke('db:clinical-find-user-team', opts);
  },
  dbClinicalAssignPatientToTeam: function(opts) {
    return ipcRenderer.invoke('db:clinical-assign-patient-to-team', opts);
  },
  dbClinicalOpsExport: function(opts) {
    return ipcRenderer.invoke('db:clinical-ops-export', opts || {});
  },
  dbClinicalOpsMerge: function(opts) {
    return ipcRenderer.invoke('db:clinical-ops-merge', opts);
  },
  dbSignClinicalChange: function(opts) {
    return ipcRenderer.invoke('db:sign-clinical-change', opts);
  },
  dbVerifyClinicalChange: function(opts) {
    return ipcRenderer.invoke('db:verify-clinical-change', opts);
  },
  dbClinicalProfileUpsert: function(opts) {
    return ipcRenderer.invoke('db:clinical-profile-upsert', opts);
  },
  dbClinicalUserTouch: function(opts) {
    return ipcRenderer.invoke('db:clinical-user-touch', opts);
  },
  dbClinicalUsernameClaim: function(opts) {
    return ipcRenderer.invoke('db:clinical-username-claim', opts);
  },
  dbClinicalIdentityResume: function(opts) {
    return ipcRenderer.invoke('db:clinical-identity-resume', opts);
  },
  dbClinicalMembershipMigrate: function(opts) {
    return ipcRenderer.invoke('db:clinical-membership-migrate', opts);
  },
  dbClinicalProfileGet: function(opts) {
    return ipcRenderer.invoke('db:clinical-profile-get', opts);
  },
  dbInternoAccessList: function(opts) {
    return ipcRenderer.invoke('db:interno-access-list', opts);
  },
  dbInternoAccessRotate: function(opts) {
    return ipcRenderer.invoke('db:interno-access-rotate', opts);
  },
  dbInternoAccessSetActive: function(opts) {
    return ipcRenderer.invoke('db:interno-access-set-active', opts);
  },
  dbEquiposAccessGet: function() {
    return ipcRenderer.invoke('db:equipos-access-get');
  },
  dbEquiposAccessRotate: function(opts) {
    return ipcRenderer.invoke('db:equipos-access-rotate', opts);
  },
  dbEquiposAccessSetActive: function(opts) {
    return ipcRenderer.invoke('db:equipos-access-set-active', opts);
  },
  dbEquiposBoard: function() {
    return ipcRenderer.invoke('db:equipos-board');
  },
  dbEquiposReports: function(opts) {
    return ipcRenderer.invoke('db:equipos-reports', opts);
  },
  dbEquiposPurgeQueue: function(opts) {
    return ipcRenderer.invoke('db:equipos-purge-queue', opts);
  },
  dbEquiposPromoteTemporaryHost: function(opts) {
    return ipcRenderer.invoke('db:equipos-promote-temporary-host', opts);
  },
  dbEquiposExportMergeSnapshot: function() {
    return ipcRenderer.invoke('db:equipos-export-merge-snapshot');
  },
  dbEquiposMergeSnapshot: function(opts) {
    return ipcRenderer.invoke('db:equipos-merge-snapshot', opts);
  },
});
