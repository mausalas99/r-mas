const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Reducir uso de GPU — elimina proceso GPU en idle (~50-100 MB RAM)
// Llamar ANTES de app.whenReady()
app.disableHardwareAcceleration();

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let server;
let mainWindow;

// Cache update state so renderer can receive it even if events fired before page loaded
let pendingUpdate = null; // { type: 'available'|'progress'|'ready', version, pct }

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
    // Replay any update events that fired before the renderer was ready
    if (pendingUpdate) {
      if (pendingUpdate.type === 'available')
        mainWindow.webContents.send('update-available', pendingUpdate.version);
      else if (pendingUpdate.type === 'progress')
        mainWindow.webContents.send('update-progress', pendingUpdate.pct);
      else if (pendingUpdate.type === 'ready')
        mainWindow.webContents.send('update-ready', pendingUpdate.version);
    }
    // Small delay to ensure renderer IPC listeners are registered
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 1500);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Auto-updater events ───────────────────────────────────────────
autoUpdater.on('update-available', (info) => {
  pendingUpdate = { type: 'available', version: info.version };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-available', info.version);
});

autoUpdater.on('download-progress', (p) => {
  pendingUpdate = { type: 'progress', pct: Math.round(p.percent) };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-progress', Math.round(p.percent));
});

autoUpdater.on('update-downloaded', (info) => {
  pendingUpdate = { type: 'ready', version: info.version };
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-ready', info.version);
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-not-available');
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater error:', err.message);
  let msg = err.message;
  if (process.platform === 'darwin' && /Code signature|did not pass validation/i.test(msg)) {
    msg +=
      ' En macOS, la actualización automática exige la misma firma e identificador de app que la instalación actual; si cambió el build, descarga el DMG desde GitHub e instálalo manualmente.';
  }
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-error', msg);
});

ipcMain.on('install-update', () => autoUpdater.quitAndInstall());

ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch(() => {});
});

ipcMain.handle('get-app-version', () => app.getVersion());

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
