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
  setUpdateChannel: function(channel) {
    ipcRenderer.send('set-update-channel', channel);
  },
  getPlatform: function() {
    return ipcRenderer.invoke('get-platform');
  },
  relaunchApp: function() {
    ipcRenderer.send('relaunch-app');
  },
  liveSyncStartHost: function(payload) {
    return ipcRenderer.invoke('live-sync-start-host', payload || {});
  },
  liveSyncJoin: function(invite) {
    return ipcRenderer.invoke('live-sync-join', invite || {});
  },
  liveSyncSend: function(message) {
    return ipcRenderer.invoke('live-sync-send', message || {});
  },
  liveSyncStop: function() {
    return ipcRenderer.invoke('live-sync-stop');
  },
  liveSyncPendingLink: function() {
    return ipcRenderer.invoke('live-sync-pending-link');
  },
  onLiveSyncMessage: function(cb) {
    ipcRenderer.on('live-sync-message', function(_e, payload) { cb(payload); });
  },
  onLiveSyncDeepLink: function(cb) {
    ipcRenderer.on('live-sync-deep-link', function(_e, payload) { cb(payload); });
  },
});
