const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateProgress: function(cb) {
    ipcRenderer.on('update-progress', function(_e, pct) { cb(pct); });
  },
  onUpdateReady: function(cb) {
    ipcRenderer.on('update-ready', function(_e, version) { cb(version); });
  },
  installUpdate: function() {
    ipcRenderer.send('install-update');
  },
});
