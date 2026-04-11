const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
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
      backgroundThrottling: true, // throttle renderer cuando window no está en foco
      spellcheck: false,          // deshabilitar corrector ortográfico (innecesario)
    },
  });

  mainWindow.loadURL('http://localhost:3738');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    autoUpdater.checkForUpdates().catch(() => {});
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Auto-updater events ───────────────────────────────────────────
autoUpdater.on('update-downloaded', (info) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Actualización lista',
    message: `R+ v${info.version} descargada.`,
    detail: '¿Instalar y reiniciar ahora?',
    buttons: ['Instalar y reiniciar', 'Más tarde'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater error:', err.message);
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
