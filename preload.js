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
});
