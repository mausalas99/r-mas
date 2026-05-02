const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Reducir uso de GPU — elimina proceso GPU en idle (~50-100 MB RAM)
// Llamar ANTES de app.whenReady()
app.disableHardwareAcceleration();

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

let server;
let mainWindow;

// Cache update state so renderer can receive it even if events fired before page loaded
let pendingUpdate = null;

function serializeReleaseNotes(info) {
  if (info == null) return '';
  const n = info.releaseNotes;
  if (n == null) return '';
  if (typeof n === 'string') return n;
  if (Array.isArray(n)) {
    return n
      .map((x) => (typeof x === 'string' ? x : x && x.note ? String(x.note) : ''))
      .filter(Boolean)
      .join('\n');
  }
  return String(n);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 700,
    title: 'R+',
    show: false, // mostrar solo cuando esté listo (sin flash blanco)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: true, // throttle renderer cuando window no está en foco
      spellcheck: false,          // deshabilitar corrector ortográfico (innecesario)
    },
  });

  mainWindow.loadURL('http://localhost:3738');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
    }
  }, 5000);

  mainWindow.once('ready-to-show', () => {
    clearTimeout(showFallback);
    mainWindow.show();
  });

  // Wait for renderer JS to fully load before checking for updates
  mainWindow.webContents.once('did-finish-load', () => {
    try {
      // Replay any update events that fired before the renderer was ready
      if (pendingUpdate) {
        if (pendingUpdate.type === 'available')
          mainWindow.webContents.send('update-available', {
            version: pendingUpdate.version,
            releaseNotes: pendingUpdate.releaseNotes || '',
          });
        else if (pendingUpdate.type === 'progress')
          mainWindow.webContents.send('update-progress', {
            percent: pendingUpdate.percent,
            transferred: pendingUpdate.transferred,
            total: pendingUpdate.total,
            bytesPerSecond: pendingUpdate.bytesPerSecond,
          });
        else if (pendingUpdate.type === 'ready')
          mainWindow.webContents.send('update-ready', { version: pendingUpdate.version });
      }
    } catch (e) {
      console.error('did-finish-load replay error:', e && e.message);
    }
    // Small delay to ensure renderer IPC listeners are registered
    setTimeout(() => {
      try { autoUpdater.checkForUpdates().catch(() => {}); } catch (_e) { /* noop */ }
    }, 1500);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Auto-updater events ───────────────────────────────────────────
function safeSendToRenderer(channel, payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  } catch (e) {
    console.error('safeSendToRenderer error for', channel, ':', e && e.message);
  }
}

autoUpdater.on('update-available', (info) => {
  try {
    const releaseNotes = serializeReleaseNotes(info);
    const version = info && info.version ? info.version : '';
    pendingUpdate = { type: 'available', version, releaseNotes };
    safeSendToRenderer('update-available', { version, releaseNotes });
  } catch (e) {
    console.error('update-available handler error:', e && e.message);
  }
});

autoUpdater.on('download-progress', (p) => {
  try {
    const payload = {
      percent: Math.round((p && p.percent) || 0),
      transferred: p && p.transferred,
      total: p && p.total,
      bytesPerSecond: p && p.bytesPerSecond,
    };
    pendingUpdate = { type: 'progress', ...payload };
    safeSendToRenderer('update-progress', payload);
  } catch (e) {
    console.error('download-progress handler error:', e && e.message);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  try {
    const version = info && info.version ? info.version : '';
    pendingUpdate = { type: 'ready', version };
    safeSendToRenderer('update-ready', { version });
  } catch (e) {
    console.error('update-downloaded handler error:', e && e.message);
  }
});

autoUpdater.on('update-not-available', () => {
  try {
    safeSendToRenderer('update-not-available');
  } catch (e) {
    console.error('update-not-available handler error:', e && e.message);
  }
});

autoUpdater.on('error', (err) => {
  try {
    const baseMsg = (err && err.message) ? err.message : String(err || 'Error desconocido');
    console.error('AutoUpdater error:', baseMsg);
    let msg = baseMsg;
    if (process.platform === 'darwin' && /Code signature|did not pass validation/i.test(msg)) {
      msg +=
        ' En macOS, la actualización automática exige la misma firma e identificador de app que la instalación actual; si cambió el build, descarga el DMG desde GitHub e instálalo manualmente.';
    }
    safeSendToRenderer('update-error', msg);
  } catch (e) {
    console.error('updater error handler crashed:', e && e.message);
  }
});

ipcMain.on('install-update', () => autoUpdater.quitAndInstall());

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.on('relaunch-app', () => {
  try {
    app.relaunch();
  } catch (_e) {
    // ignore — fallback to exit
  }
  app.exit(0);
});

// Canal de actualización (beta | estable). El renderer lo persiste en localStorage
// y lo informa por IPC al iniciar y al cambiarlo en Ajustes.
ipcMain.on('set-update-channel', (_e, channel) => {
  const isBeta = String(channel || '').toLowerCase() === 'beta';
  autoUpdater.allowPrerelease = isBeta;
});

ipcMain.handle('get-platform', () => process.platform);

ipcMain.handle('open-external', async (_e, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

ipcMain.handle('open-user-data-folder', async () => {
  const p = app.getPath('userData');
  const err = await shell.openPath(p);
  return { ok: !err, path: p, error: err || null };
});

ipcMain.handle('select-output-dir', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return undefined;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Elegir carpeta para documentos',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return undefined;
  return result.filePaths[0];
});

// ── App menu ──────────────────────────────────────────────────────
function buildMenu() {
  const version = app.getVersion();
  const isMac = process.platform === 'darwin';
  const checkUpdate = () => autoUpdater.checkForUpdates().catch(() => {});

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: `R+ v${version}`, enabled: false },
        { type: 'separator' },
        { label: 'Buscar actualizaciones…', click: checkUpdate },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' },
      ],
    }] : []),
    { role: 'editMenu' },
    {
      label: 'Ver',
      submenu: [
        { role: 'toggleDevTools', label: 'Herramientas de desarrollador' },
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar recarga' },
      ],
    },
    {
      label: 'Aplicación',
      submenu: [
        ...(!isMac ? [
          { label: `R+ v${version}`, enabled: false },
          { type: 'separator' },
          { label: 'Buscar actualizaciones…', click: checkUpdate },
          { type: 'separator' },
        ] : []),
        ...(!isMac ? [
          { type: 'separator' },
          { role: 'quit', label: 'Salir' },
        ] : []),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Startup ───────────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    server = await require('./server');
  } catch (e) {
    const detail = e && e.message ? e.message : String(e);
    dialog.showErrorBox(
      'R+ no pudo iniciar',
      detail
    );
    app.quit();
    return;
  }
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (server && server.close) server.close();
});
