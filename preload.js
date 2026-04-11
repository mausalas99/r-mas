const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: function(cb) {
    ipcRenderer.on('update-available', function(_e, version) { cb(version); });
  },
  onUpdateProgress: function(cb) {
    ipcRenderer.on('update-progress', function(_e, pct) { cb(pct); });
  },
  onUpdateReady: function(cb) {
    ipcRenderer.on('update-ready', function(_e, version) { cb(version); });
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
});
