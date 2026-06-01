const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
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
    ipcRenderer.on('update-not-available', function() { cb(); });
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
  sendToSesionIngreso: function(payload) {
    return ipcRenderer.invoke('sesion-ingreso-send', payload);
  },
  checkForUpdates: function() {
    ipcRenderer.send('check-for-updates');
  },
  getAppVersion: function() {
    return ipcRenderer.invoke('get-app-version');
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
  writeLanHostTeamCode: function(plain) {
    return ipcRenderer.invoke('lan-host-write-team-code', plain);
  },
  getLanCandidateBaseUrl: function() {
    return ipcRenderer.invoke('get-lan-candidate-base-url');
  },
  resetLanSquadHostState: function() {
    return ipcRenderer.invoke('lan-reset-squad-host-state');
  },
  getLanEffectiveTeamCode: function() {
    return ipcRenderer.invoke('lan-get-effective-team-code');
  },
  lanGuestWriteBearer: function(payload) {
    return ipcRenderer.invoke('lan-guest-write-bearer', payload);
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
  dbAuditVerify: function(opts) {
    return ipcRenderer.invoke('db:audit-verify', opts);
  },
  dbAuditExport: function(opts) {
    return ipcRenderer.invoke('db:audit-export', opts);
  },
  dbBackupExportJson: function() {
    return ipcRenderer.invoke('db:backup-export-json');
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
  dbGuardiaCensus: function(opts) {
    return ipcRenderer.invoke('db:guardia-census', opts);
  },
  dbGuardiaUpsert: function(opts) {
    return ipcRenderer.invoke('db:guardia-upsert', opts);
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
  dbClinicalTeamsList: function() {
    return ipcRenderer.invoke('db:clinical-teams-list');
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
  dbClinicalTeamsMemberAdd: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-member-add', opts);
  },
  dbClinicalTeamsMemberRemove: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-member-remove', opts);
  },
  dbClinicalTeamsGuardiaSet: function(opts) {
    return ipcRenderer.invoke('db:clinical-teams-guardia-set', opts);
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
  dbClinicalOpsExport: function() {
    return ipcRenderer.invoke('db:clinical-ops-export');
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
  dbClinicalUsernameClaim: function(opts) {
    return ipcRenderer.invoke('db:clinical-username-claim', opts);
  },
  dbClinicalProfileGet: function(opts) {
    return ipcRenderer.invoke('db:clinical-profile-get', opts);
  },
});
