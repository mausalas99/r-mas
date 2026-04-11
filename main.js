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
    autoUpdater.checkForUpdates().catch(() => {});
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Auto-updater events ───────────────────────────────────────────
autoUpdater.on('download-progress', (p) => {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-progress', Math.round(p.percent));
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send('update-ready', info.version);
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater error:', err.message);
});

ipcMain.on('install-update', () => autoUpdater.quitAndInstall());

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
      label: 'Aplicación',
      submenu: [
        ...(!isMac ? [
          { label: `R+ v${version}`, enabled: false },
          { type: 'separator' },
          { label: 'Buscar actualizaciones…', click: checkUpdate },
          { type: 'separator' },
        ] : []),
        { role: 'reload', label: 'Recargar' },
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
  server = await require('./server');
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
