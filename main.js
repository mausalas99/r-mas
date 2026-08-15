// Dev-only: Electron CSP warning (unsafe-eval from bundled renderer); packaged builds omit it.
if (process.env.NODE_ENV !== 'production' && !process.env.ELECTRON_DISABLE_SECURITY_WARNINGS) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

const { app, BrowserWindow, Menu, shell, dialog, ipcMain, clipboard, safeStorage, session, protocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeApprovedOutputDir } = require('./lib/output-dir-policy.js');
const { autoUpdater } = require('electron-updater');
const {
  buildGenericFeedUrl,
  buildManualInstallerUrl,
  isValidDowngradeTargetVersion,
  pickMacArch,
} = require('./lib/update-downgrade.js');
const { probeNativeRuntime } = require('./lib/native-runtime-probe.js');
const { isAllowedExternalUrl } = require('./lib/window-open-policy.cjs');
const { isReservedShellShortcutInput, hasCmdOrCtrl } = require('./lib/shell-shortcut-input.cjs');
const { PERF_CONFIG_FILE, normalizePerfConfig, readPerfConfig, writePerfConfig } = require('./lib/perf-config.js');
const { setLanDbManager, getLanDbManager } = require('./lib/db/lan-db-bridge.cjs');
const { installElectronLanCors } = require('./lib/electron-lan-cors.cjs');
const {
  registerRendererProtocolSchemes,
  attachRendererProtocolHandler,
  rendererAppIndexUrl,
  shouldUseLegacyHttpRenderer,
} = require('./lib/renderer-protocol.cjs');
// Boot timing. Enable with R_PLUS_BOOT_PERF=1.
const BOOT_T0 = process.hrtime.bigint();
function bootMark(label) {
  if (process.env.R_PLUS_BOOT_PERF !== '1') return;
  const ms = Number(process.hrtime.bigint() - BOOT_T0) / 1e6;
  console.log(`[R+ boot] ${label}: ${ms.toFixed(1)}ms`);
}

// Must run before app.ready — app://rplus serves public/ without :3738.
registerRendererProtocolSchemes({ protocol });

// One writer for userData Local Storage + cloud-sync-remember.json (npm start vs R+.app).
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

// Aceleración por hardware ACTIVADA por defecto: las animaciones del premium UI
// (transform/opacity/backdrop-filter) componen en GPU; en software se ven
// entrecortadas. Opt-out para equipos con muy poca RAM (~50-100 MB del proceso GPU):
//   userData/performance.json → {"hardwareAcceleration": false}
// Decidir ANTES de app.whenReady().
let perfConfig = normalizePerfConfig(null);
try {
  perfConfig = readPerfConfig(fs, path.join(app.getPath('userData'), PERF_CONFIG_FILE));
} catch (_e) { /* ignored */ }
if (!perfConfig.hardwareAcceleration) {
  app.disableHardwareAcceleration();
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

const UPDATE_CHANNEL_FILE = 'update-channel.json';

function normalizeUpdateChannel(channel) {
  return String(channel || '').toLowerCase() === 'beta' ? 'beta' : 'estable';
}

function updateChannelFilePath() {
  return path.join(app.getPath('userData'), UPDATE_CHANNEL_FILE);
}

function readUpdateChannelFromDisk() {
  try {
    const raw = JSON.parse(fs.readFileSync(updateChannelFilePath(), 'utf8'));
    return normalizeUpdateChannel(raw.channel);
  } catch (_e) {
    return 'estable';
  }
}

function writeUpdateChannelToDisk(channel) {
  const normalized = normalizeUpdateChannel(channel);
  try {
    fs.writeFileSync(updateChannelFilePath(), JSON.stringify({ channel: normalized }), 'utf8');
  } catch (_e) { /* ignored */ }
  return normalized;
}

/** Aplica canal Estable (GitHub /releases/latest) vs Pre-releases (feed + borradores). */
function applyUpdateChannel(channel) {
  const normalized = normalizeUpdateChannel(channel);
  autoUpdater.allowPrerelease = normalized === 'beta';
  autoUpdater.channel = null;
  if (normalized === 'estable') autoUpdater.allowDowngrade = false;
  return normalized;
}

let downgradeSession = null;
let reinstallSession = null;
let defaultUpdaterFeed = null;

function clearReinstallSession() {
  if (!reinstallSession) return;
  if (reinstallSession.originalIsUpdateAvailable) {
    autoUpdater.isUpdateAvailable = reinstallSession.originalIsUpdateAvailable;
  }
  reinstallSession = null;
}

/** Re-descarga e instala el tag de release de la versión instalada (mismo semver en latest.yml). */
function beginReinstallCurrentVersion() {
  clearReinstallSession();
  const current = app.getVersion();
  reinstallSession = {
    version: current,
    originalIsUpdateAvailable: autoUpdater.isUpdateAvailable.bind(autoUpdater),
  };
  const originalIsUpdateAvailable = reinstallSession.originalIsUpdateAvailable;
  autoUpdater.isUpdateAvailable = async function (updateInfo) {
    const session = reinstallSession;
    const remote = String((updateInfo && updateInfo.version) || '').replace(/^v/i, '');
    if (session && remote && remote === session.version) {
      return true;
    }
    if (originalIsUpdateAvailable) {
      return originalIsUpdateAvailable(updateInfo);
    }
    return false;
  };
  autoUpdater.allowDowngrade = true;
  autoUpdater.autoDownload = true;
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: buildGenericFeedUrl(current),
  });
}

function captureDefaultUpdaterFeed() {
  if (defaultUpdaterFeed) return defaultUpdaterFeed;
  try {
    defaultUpdaterFeed = autoUpdater.getFeedURL();
  } catch (_e) {
    defaultUpdaterFeed = null;
  }
  return defaultUpdaterFeed;
}

function resetUpdaterFeedToDefault() {
  downgradeSession = null;
  clearReinstallSession();
  autoUpdater.allowDowngrade = false;
  applyUpdateChannel(readUpdateChannelFromDisk());
  const feed = captureDefaultUpdaterFeed();
  if (feed) {
    try {
      autoUpdater.setFeedURL(feed);
    } catch (_e) { /* noop */ }
  }
}

function beginDowngradeToVersion(version) {
  const target = String(version || '').replace(/^v/, '');
  const current = app.getVersion();
  if (!isValidDowngradeTargetVersion(target, current)) {
    throw new Error(`No se puede restaurar v${target} desde v${current}`);
  }
  downgradeSession = { version: target };
  autoUpdater.allowDowngrade = true;
  autoUpdater.autoDownload = true;
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: buildGenericFeedUrl(target),
  });
}

function sendDowngradeFailedFromSession(code, message) {
  if (!downgradeSession) return;
  const v = downgradeSession.version;
  let manualUrl = null;
  try {
    manualUrl = buildManualInstallerUrl(
      v,
      process.platform,
      process.platform === 'darwin' ? pickMacArch(process.arch) : 'x64'
    );
  } catch (_e) { /* noop */ }
  safeSendToRenderer('downgrade-failed', {
    version: v,
    code,
    message: message || '',
    manualUrl,
  });
  resetUpdaterFeedToDefault();
}

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
  const winOpts = {
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
      // El renderer decide no-blur según el modo de render real (ver preload isSoftwareRender)
      additionalArguments: perfConfig.hardwareAcceleration ? [] : ['--rplus-sw-render'],
    },
  };
  // Barra de título integrada con el HTML (macOS); semáforos en el área de cliente
  if (process.platform === 'darwin') {
    winOpts.titleBarStyle = 'hiddenInset';
    winOpts.trafficLightPosition = { x: 14, y: 17 };
  }
  mainWindow = new BrowserWindow(winOpts);

  if (shouldUseLegacyHttpRenderer()) {
    const rendererPort = Number(process.env.R_PLUS_LAN_HTTP_PORT) || 3738;
    mainWindow.loadURL(`http://localhost:${rendererPort}/?rpc-electron=1`);
  } else {
    mainWindow.loadURL(rendererAppIndexUrl());
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!isReservedShellShortcutInput(input)) return;
    event.preventDefault();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const isMac = process.platform === 'darwin';
    const cmdOrCtrl = hasCmdOrCtrl(input);
    mainWindow.webContents.send('shell-shortcut', {
      key: input.key,
      code: input.code,
      shift: !!input.shift,
      alt: !!input.alt,
      meta: isMac ? cmdOrCtrl : !!input.meta,
      control: isMac ? !!input.control : cmdOrCtrl,
    });
  });

  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.maximize();
      mainWindow.show();
    }
  }, 5000);

  mainWindow.once('ready-to-show', () => {
    bootMark('ready-to-show');
    clearTimeout(showFallback);
    mainWindow.maximize();
    mainWindow.show();
  });

  // Wait for renderer JS to fully load before checking for updates
  mainWindow.webContents.once('did-finish-load', () => {
    bootMark('did-finish-load');
    try {
      // Replay any update events that fired before the renderer was ready
      if (pendingUpdate) {
        if (pendingUpdate.type === 'available')
          mainWindow.webContents.send('update-available', {
            version: pendingUpdate.version,
            releaseNotes: pendingUpdate.releaseNotes || '',
            prerelease: !!pendingUpdate.prerelease,
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
    scheduleUpdateCheck(1500);
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
    const prerelease = !!(info && info.prerelease);
    pendingUpdate = { type: 'available', version, releaseNotes, prerelease };
    safeSendToRenderer('update-available', { version, releaseNotes, prerelease });
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
    if (downgradeSession) {
      sendDowngradeFailedFromSession(
        'not-available',
        'No se encontró la versión en el servidor de actualizaciones.'
      );
      return;
    }
    if (reinstallSession) {
      const v = reinstallSession.version;
      clearReinstallSession();
      resetUpdaterFeedToDefault();
      safeSendToRenderer('update-not-available', { reinstallFailed: true, version: v });
      return;
    }
    safeSendToRenderer('update-not-available', {});
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
    if (downgradeSession) {
      sendDowngradeFailedFromSession('updater-error', msg);
      return;
    }
    if (reinstallSession) {
      const v = reinstallSession.version;
      clearReinstallSession();
      resetUpdaterFeedToDefault();
      safeSendToRenderer('update-not-available', { reinstallFailed: true, version: v, detail: msg });
      return;
    }
    safeSendToRenderer('update-error', msg);
  } catch (e) {
    console.error('updater error handler crashed:', e && e.message);
  }
});

ipcMain.on('install-update', () => {
  clearReinstallSession();
  autoUpdater.quitAndInstall();
});

ipcMain.on('reinstall-current-release', () => {
  try {
    beginReinstallCurrentVersion();
    scheduleUpdateCheck(80);
  } catch (err) {
    clearReinstallSession();
    resetUpdaterFeedToDefault();
    safeSendToRenderer('update-error', err && err.message ? err.message : String(err));
  }
});

let updateCheckTimer = null;
function scheduleUpdateCheck(delayMs) {
  if (updateCheckTimer) clearTimeout(updateCheckTimer);
  updateCheckTimer = setTimeout(function () {
    updateCheckTimer = null;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      autoUpdater.checkForUpdates().catch(function (err) {
        // intentional: ignore if window closed or updater busy during scheduled check
        if (process.env.R_PLUS_DEBUG_UPDATER === '1') {
          console.warn('[updater] scheduled check failed:', err && err.message);
        }
      });
    } catch (_e) { /* noop */ }
  }, typeof delayMs === 'number' ? delayMs : 400);
}

ipcMain.on('check-for-updates', () => {
  scheduleUpdateCheck(80);
});

ipcMain.on('downgrade-to-stable', (_e, version) => {
  try {
    beginDowngradeToVersion(version);
    scheduleUpdateCheck(80);
  } catch (err) {
    safeSendToRenderer('downgrade-failed', {
      version: String(version || ''),
      code: 'invalid-target',
      message: err && err.message ? err.message : String(err),
      manualUrl: null,
    });
  }
});

ipcMain.on('reset-update-feed', () => {
  resetUpdaterFeedToDefault();
});

ipcMain.handle('open-downgrade-installer', async (_e, version) => {
  const v = String(version || '').replace(/^v/, '');
  const url = buildManualInstallerUrl(
    v,
    process.platform,
    process.platform === 'darwin' ? pickMacArch(process.arch) : 'x64'
  );
  if (!isAllowedExternalUrl(url)) return { ok: false, url };
  await shell.openExternal(url);
  return { ok: true, url };
});

ipcMain.on('relaunch-app', () => {
  try {
    app.relaunch();
  } catch (_e) {
    // ignore — fallback to exit
  }
  app.exit(0);
});

function perfConfigFilePath() {
  return path.join(app.getPath('userData'), PERF_CONFIG_FILE);
}

ipcMain.handle('get-performance-prefs', () => readPerfConfig(fs, perfConfigFilePath()));

ipcMain.handle('set-hardware-acceleration', (_e, enabled) => {
  perfConfig = writePerfConfig(fs, perfConfigFilePath(), { hardwareAcceleration: !!enabled });
  return perfConfig;
});

// Canal de actualización (pre-releases "beta" | estable). Persistido en userData y en localStorage del renderer.
ipcMain.on('set-update-channel', (_e, channel) => {
  const normalized = writeUpdateChannelToDisk(channel);
  applyUpdateChannel(normalized);
});

ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-arch', () => process.arch);

ipcMain.handle('open-external', async (_e, url) => {
  if (!isAllowedExternalUrl(url)) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-native-runtime-status', () => {
  const probe = probeNativeRuntime();
  const detail = (probe.failures || [])
    .map((f) => (f.module ? `${f.module}: ${f.message || ''}` : f.message || ''))
    .filter(Boolean)
    .join('\n');
  return {
    ok: probe.ok,
    userMessage: probe.userMessage,
    message: probe.userMessage,
    detail: detail || null,
    failures: probe.failures || [],
  };
});

ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

ipcMain.handle('open-user-data-folder', async () => {
  const p = app.getPath('userData');
  const err = await shell.openPath(p);
  return { ok: !err, path: p, error: err || null };
});

let approvedOutputDir = null;

function defaultDownloadsDir() {
  return app.getPath('downloads');
}

async function validateOutputDir(dir) {
  const target = dir && String(dir).trim() ? path.resolve(String(dir).trim()) : defaultDownloadsDir();
  await fs.promises.access(target, fs.constants.W_OK);
  return target;
}

ipcMain.handle('set-approved-output-dir', async (_e, dir) => {
  try {
    approvedOutputDir = await validateOutputDir(dir);
    writeApprovedOutputDir(app.getPath('userData'), approvedOutputDir);
    const dbManager = getLanDbManager();
    if (dbManager && dbManager.isUnlocked()) {
      await dbManager.auditOnly('system.output_dir.register', {
        basename: path.basename(approvedOutputDir),
      });
    }
    return { ok: true, path: approvedOutputDir };
  } catch (e) {
    approvedOutputDir = null;
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle('save-exported-document', async (_e, { fileName, buffer }) => {
  const dir = approvedOutputDir || defaultDownloadsDir();
  const safe = path.basename(String(fileName || ''));
  if (!safe || safe !== fileName) {
    throw new Error('Nombre de archivo inválido');
  }
  await fs.promises.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, safe);
  const resolvedDir = await fs.promises.realpath(dir);
  await fs.promises.writeFile(fullPath, Buffer.from(buffer));
  const resolvedFile = await fs.promises.realpath(fullPath);
  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    await fs.promises.unlink(fullPath).catch(() => {});
    throw new Error('Ruta de exportación no permitida');
  }
  return { success: true, path: resolvedFile };
});

let docExportModule = null;
let logDocExportFn = null;
function loadDocExport() {
  if (!docExportModule) {
    docExportModule = require('./lib/doc-export-service.js');
    logDocExportFn = require('./lib/doc-export-audit.js').logDocExport;
  }
  return { docExport: docExportModule, logDocExport: logDocExportFn };
}

ipcMain.handle('generate-document', async (_e, { kind, payload }) => {
  const { docExport, logDocExport } = loadDocExport();
  const paths = {
    userDataPath: app.getPath('userData'),
    downloadsPath: app.getPath('downloads'),
  };
  try {
    switch (kind) {
      case 'note': {
        const { buffer, fileName } = await docExport.exportNoteDocx(payload || {});
        logDocExport({ type: 'nota', patient: payload && payload.patient, status: 200, bytes: buffer.length });
        return { ok: true, fileName, buffer };
      }
      case 'indicaciones': {
        const { buffer, fileName } = await docExport.exportIndicacionesDocx(payload || {});
        logDocExport({ type: 'indicaciones', patient: payload && payload.patient, status: 200, bytes: buffer.length });
        return { ok: true, fileName, buffer };
      }
      case 'listado': {
        const { buffer, fileName } = await docExport.exportListadoDocx(payload || {});
        logDocExport({ type: 'listado', patient: payload && payload.patient, status: 200, bytes: buffer.length });
        return { ok: true, fileName, buffer };
      }
      case 'censo': {
        const { buffer, fileName } = await docExport.exportCensoPdf(payload || {}, paths);
        logDocExport({ type: 'censo', status: 200, bytes: buffer.length });
        return { ok: true, fileName, buffer };
      }
      case 'receta-hu': {
        const { buffer, fileName } = await docExport.exportRecetaHuPdf(payload || {});
        logDocExport({ type: 'receta-hu', patient: payload && payload.patient, status: 200, bytes: buffer.length });
        return { ok: true, fileName, buffer };
      }
      default:
        return { ok: false, error: 'Tipo de documento no soportado.' };
    }
  } catch (e) {
    return {
      ok: false,
      error: (e && e.message) || 'No se pudo generar el documento. Intenta de nuevo.',
      code: e && e.code ? e.code : undefined,
    };
  }
});

ipcMain.handle('select-output-dir', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return undefined;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Elegir carpeta para documentos',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return undefined;
  const chosen = result.filePaths[0];
  try {
    approvedOutputDir = await validateOutputDir(chosen);
    writeApprovedOutputDir(app.getPath('userData'), approvedOutputDir);
  } catch (_e) {
    /* renderer may call set-approved-output-dir after save */
  }
  return chosen;
});

function isDevWardServerEnabled() {
  return process.env.R_PLUS_DEV_WARD_SERVER === '1';
}

ipcMain.handle('lan-ensure-server-ready', async () => {
  if (!isDevWardServerEnabled()) {
    return { ok: true, peer: false, wardServer: false };
  }
  const lanServer = require('./server');
  await lanServer.startLanServer();
  return { ok: true, peer: false, wardServer: true };
});

ipcMain.handle('clipboard-write-text', (_e, text) => {
  try {
    clipboard.writeText(String(text == null ? '' : text));
    return true;
  } catch (_err) {
    return false;
  }
});

ipcMain.handle('lab-repo-fetch', async (_e, payload) => {
  try {
    const { fetchLabRepoStudies } = await import('./lib/lab-repo/lab-repo-fetch.mjs');
    return await fetchLabRepoStudies(payload);
  } catch (err) {
    return {
      studies: [],
      errors: [{ folio: '', message: String(err?.message || err) }],
    };
  }
});

ipcMain.handle('cloud-sync-fetch', async (_e, payload) => {
  try {
    const { cloudSyncNetFetch } = require('./lib/cloud-sync-ipc-fetch.cjs');
    return await cloudSyncNetFetch(net, payload || {});
  } catch (err) {
    return {
      ok: false,
      status: 0,
      statusText: String(err?.message || err),
      data: { error: String(err?.message || err) },
      retryAfterMs: null,
    };
  }
});

const {
  readCloudSyncRememberStore,
  writeCloudSyncRememberStore,
  clearCloudSyncRememberStore,
} = require('./lib/cloud-sync-remember-store.cjs');

function cloudSyncRememberUserData() {
  return app.getPath('userData');
}

ipcMain.on('cloud-sync-remember-get-sync', (event) => {
  try {
    event.returnValue = readCloudSyncRememberStore(cloudSyncRememberUserData());
  } catch {
    event.returnValue = null;
  }
});

ipcMain.handle('cloud-sync-remember-get', () => {
  return readCloudSyncRememberStore(cloudSyncRememberUserData());
});

ipcMain.handle('cloud-sync-remember-set', (_e, snapshot) => {
  return writeCloudSyncRememberStore(cloudSyncRememberUserData(), snapshot || null);
});

ipcMain.handle('cloud-sync-remember-clear', () => {
  clearCloudSyncRememberStore(cloudSyncRememberUserData());
  return { ok: true };
});
function getTargetWebContents() {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused.webContents;
  const wins = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  return wins.length ? wins[0].webContents : null;
}

/** Avoid menu `role:` handlers — they call webContents.getFocusedWebContents() and can crash if no window yet. */
function webContentsMenuAction(method) {
  return () => {
    try {
      const wc = getTargetWebContents();
      if (!wc || wc.isDestroyed()) return;
      const fn = wc[method];
      if (typeof fn === 'function') fn.call(wc);
    } catch (err) {
      console.warn('[menu]', method, err && err.message ? err.message : err);
    }
  };
}

/** Menu accelerators intercept before Chromium's own New Tab / tab-select bindings; forward as the same shell-shortcut IPC. */
function sendShellShortcutFromMenu(key, code) {
  return () => {
    const wc = getTargetWebContents();
    if (!wc || wc.isDestroyed()) return;
    const isMac = process.platform === 'darwin';
    wc.send('shell-shortcut', {
      key,
      code,
      shift: false,
      alt: false,
      meta: isMac,
      control: !isMac,
    });
  };
}

function buildMenu() {
  const version = app.getVersion();
  const isMac = process.platform === 'darwin';
  const checkUpdate = () => scheduleUpdateCheck(80);

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
    {
      label: 'Editar',
      submenu: [
        { label: 'Deshacer', accelerator: 'CmdOrCtrl+Z', click: webContentsMenuAction('undo') },
        { label: 'Rehacer', accelerator: 'Shift+CmdOrCtrl+Z', click: webContentsMenuAction('redo') },
        { type: 'separator' },
        { label: 'Cortar', accelerator: 'CmdOrCtrl+X', click: webContentsMenuAction('cut') },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', click: webContentsMenuAction('copy') },
        { label: 'Pegar', accelerator: 'CmdOrCtrl+V', click: webContentsMenuAction('paste') },
        { label: 'Seleccionar todo', accelerator: 'CmdOrCtrl+A', click: webContentsMenuAction('selectAll') },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Herramientas de desarrollador', accelerator: 'Alt+CmdOrCtrl+I', click: webContentsMenuAction('toggleDevTools') },
        { label: 'Recargar', accelerator: 'CmdOrCtrl+R', click: webContentsMenuAction('reload') },
        { label: 'Forzar recarga', accelerator: 'Shift+CmdOrCtrl+R', click: webContentsMenuAction('reloadIgnoringCache') },
      ],
    },
    {
      label: 'Atajos',
      visible: false,
      submenu: [
        { label: 'Pestaña 1', visible: false, accelerator: 'CmdOrCtrl+1', click: sendShellShortcutFromMenu('1', 'Digit1') },
        { label: 'Pestaña 2', visible: false, accelerator: 'CmdOrCtrl+2', click: sendShellShortcutFromMenu('2', 'Digit2') },
        { label: 'Pestaña 3', visible: false, accelerator: 'CmdOrCtrl+3', click: sendShellShortcutFromMenu('3', 'Digit3') },
        { label: 'Pestaña 4', visible: false, accelerator: 'CmdOrCtrl+4', click: sendShellShortcutFromMenu('4', 'Digit4') },
        { label: 'Pestaña 5', visible: false, accelerator: 'CmdOrCtrl+5', click: sendShellShortcutFromMenu('5', 'Digit5') },
        { label: 'Estado actual', visible: false, accelerator: 'CmdOrCtrl+E', click: sendShellShortcutFromMenu('e', 'KeyE') },
        { label: 'Tratamiento', visible: false, accelerator: 'CmdOrCtrl+T', click: sendShellShortcutFromMenu('t', 'KeyT') },
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
let unlockPromise;

/** @param {{ ensureUnlocked: () => Promise<unknown> }} dbManager */
async function unlockClinicalDbAtStartup(dbManager) {
  const maxAttempts = process.platform === 'win32' ? 8 : 3;
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      await dbManager.ensureUnlocked();
      return;
    } catch (unlockErr) {
      lastErr = unlockErr;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200 + attempt * 250));
      }
    }
  }
  throw lastErr || new Error('Clinical DB auto-open failed');
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;
  try {
    installElectronLanCors(session.defaultSession);
    if (!shouldUseLegacyHttpRenderer()) {
      attachRendererProtocolHandler({ protocol, net }, path.join(__dirname, 'public'));
    }
    process.env.R_PLUS_USER_DATA = app.getPath('userData');
    applyUpdateChannel(readUpdateChannelFromDisk());
    captureDefaultUpdaterFeed();
    bootMark('updater-feed');

    const { loadNativeDatabase } = await import('./lib/db/native-load.mjs');
    try {
      loadNativeDatabase();
      bootMark('native-db');
    } catch (nativeErr) {
      const detail =
        nativeErr && nativeErr.message
          ? nativeErr.message
          : 'No se pudo cargar el módulo nativo de base de datos (SQLCipher).';
      dialog.showErrorBox('R+ no pudo iniciar', detail);
      app.quit();
      return;
    }

    const { createDbManager } = await import('./lib/db/db-manager.mjs');
    const dbManager = createDbManager({
      userDataPath: app.getPath('userData'),
      safeStorage,
      getClientId: () => 'desktop-host',
    });
    setLanDbManager(dbManager);

    const { registerDbIpcHandlers } = await import('./lib/db/ipc-handlers.mjs');
    registerDbIpcHandlers({
      ipcMain,
      dbManager,
      app,
      dialog,
      safeStorage,
      getClientId: () => 'desktop-host',
    });
    bootMark('db-ipc');

    unlockPromise = unlockClinicalDbAtStartup(dbManager);

    if (isDevWardServerEnabled()) {
      const lanServer = require('./server');
      try {
        server = await lanServer.startLanServer();
      } catch (lanErr) {
        const peerMode = process.env.R_PLUS_LAN_PEER === '1';
        const portBusy =
          (lanErr && lanErr.code === 'EADDRINUSE') ||
          (lanErr && lanErr.message && /EADDRINUSE|already in use|3738|3739/.test(String(lanErr.message)));
        if (peerMode && portBusy) {
          console.warn(
            '[R+ LAN peer mode] Puerto LAN en uso — esta ventana usará el servidor del anfitrión ya abierto.'
          );
        } else {
          throw lanErr;
        }
      }
    }
    if (unlockPromise) await unlockPromise;

    if (process.env.R_PLUS_RECOVER_CENSUS === '1') {
      try {
        const { runRecoverCensusExport } = await import('./lib/db/recover-census-export.mjs');
        const result = await runRecoverCensusExport({ app, dbManager });
        dialog.showMessageBox({
          type: 'info',
          title: 'Recuperación de censo',
          message:
            'Exportados ' +
            result.count +
            ' paciente(s) a Descargas.\n\nImporta con Ajustes → Importar rango…',
        });
      } catch (recoverErr) {
        dialog.showErrorBox(
          'Recuperación de censo',
          recoverErr && recoverErr.message ? recoverErr.message : String(recoverErr)
        );
      }
      app.quit();
      return;
    }

    try {
      const userData = app.getPath('userData');
      void userData;
    } catch (_reconcileErr) {
      /* LAN host reconcile retired */
    }
  } catch (e) {
    const detail = e && e.message ? e.message : String(e);
    dialog.showErrorBox(
      'R+ no pudo iniciar',
      detail
    );
    app.quit();
    return;
  }
  bootMark('pre-window');
  createWindow();
  buildMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function destroyAllBrowserWindows() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.destroy();
  }
}

/** Flush Chromium Local Storage before destroy — otherwise Recuérdame tokens stay in-memory only. */
async function flushRendererStorageAndDestroyWindows() {
  const wins = BrowserWindow.getAllWindows().filter((w) => w && !w.isDestroyed());
  await Promise.all(
    wins.map(async (win) => {
      try {
        if (win.webContents && !win.webContents.isDestroyed()) {
          await win.webContents.session.flushStorageData();
        }
      } catch (_e) {
        /* ignore */
      }
    })
  );
  destroyAllBrowserWindows();
}

let quitting = false;
app.on('before-quit', (event) => {
  if (quitting) return;
  quitting = true;
  event.preventDefault();

  const QUIT_DEADLINE_MS = 4000;
  const forceExitTimer = setTimeout(() => app.exit(0), QUIT_DEADLINE_MS);
  if (typeof forceExitTimer.unref === 'function') forceExitTimer.unref();

  const finishQuit = () => {
    clearTimeout(forceExitTimer);
    app.exit(0);
  };

  if (!isDevWardServerEnabled()) {
    void flushRendererStorageAndDestroyWindows().finally(finishQuit);
    return;
  }
  const lanServer = require('./server');
  const flushCap = new Promise((r) => setTimeout(r, 3000));
  Promise.race([lanServer.flushHostStoreNow().catch(() => {}), flushCap])
    .then(() => flushRendererStorageAndDestroyWindows())
    .then(() => lanServer.stopLanServer())
    .finally(finishQuit);
});
