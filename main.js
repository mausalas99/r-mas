// Dev-only: Electron CSP warning (unsafe-eval from bundled renderer); packaged builds omit it.
if (process.env.NODE_ENV !== 'production' && !process.env.ELECTRON_DISABLE_SECURITY_WARNINGS) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

const { app, BrowserWindow, Menu, shell, dialog, ipcMain, clipboard, safeStorage } = require('electron');
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

// Reducir uso de GPU — elimina proceso GPU en idle (~50-100 MB RAM)
// Llamar ANTES de app.whenReady()
app.disableHardwareAcceleration();

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
  } catch (_e) {}
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
    },
  };
  // Barra de título integrada con el HTML (macOS); semáforos en el área de cliente
  if (process.platform === 'darwin') {
    winOpts.titleBarStyle = 'hiddenInset';
    winOpts.trafficLightPosition = { x: 14, y: 17 };
  }
  mainWindow = new BrowserWindow(winOpts);

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
      autoUpdater.checkForUpdates().catch(function () {});
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

// Canal de actualización (pre-releases "beta" | estable). Persistido en userData y en localStorage del renderer.
ipcMain.on('set-update-channel', (_e, channel) => {
  const normalized = writeUpdateChannelToDisk(channel);
  applyUpdateChannel(normalized);
});

ipcMain.handle('get-platform', () => process.platform);

ipcMain.handle('open-external', async (_e, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('sesion-ingreso-send', async (_e, payload) => {
  try {
    const json = JSON.stringify(payload || {});
    if (json.length > 8000) {
      const file = path.join(app.getPath('userData'), 'sesion-ingreso-pending.json');
      await fs.promises.writeFile(file, json, 'utf8');
      await shell.openExternal(`sesion-ingreso://import?file=${encodeURIComponent(file)}`);
    } else {
      await shell.openExternal(`sesion-ingreso://import?payload=${encodeURIComponent(json)}`);
    }
    return true;
  } catch (_e) {
    return false;
  }
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
    const dbManager = globalThis.__rplusDbManager;
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

const docExport = require('./lib/doc-export-service.js');
const { logDocExport } = require('./lib/doc-export-audit.js');

ipcMain.handle('generate-document', async (_e, { kind, payload }) => {
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
      case 'receta-hu':
        return await docExport.exportRecetaHuPdf(payload || {}, paths);
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

ipcMain.handle('lan-host-write-team-code', (_e, plain) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'lan-team-code.txt');
    fs.writeFileSync(filePath, String(plain || '').trim(), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

/** Borra el estado del host LAN (salas/pacientes en ese JSON). Útil tras error HTTP 500 por cambio de código. */
ipcMain.handle('lan-reset-squad-host-state', () => {
  try {
    const filePath = path.join(app.getPath('userData'), 'lan-squad-host-state.json');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle('lan-get-effective-team-code', () => {
  try {
    const { readLanTeamCodeFile } = require('./lan-squad/effective-team-code.js');
    return readLanTeamCodeFile({ userDataPath: app.getPath('userData') });
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

const { createLanMdnsService, buildTeamHashSync } = require('./lan-squad/lan-mdns-service.js');
const { createUdpBeacon } = require('./lan-squad/lan-udp-beacon.js');
const crypto = require('node:crypto');

let _lanMdnsService = null;
let _udpBeacon = null;

function ensureLanMdnsClientId(userDataPath) {
  const idPath = path.join(String(userDataPath || ''), 'lan-mdns-client-id.txt');
  try {
    const existing = fs.readFileSync(idPath, 'utf8').trim();
    if (existing) return existing;
  } catch (_e) {}
  const id = `lc_main_${crypto.randomBytes(6).toString('hex')}`;
  try {
    fs.writeFileSync(idPath, id + '\n', 'utf8');
  } catch (_e) {}
  return id;
}

function startLanMdnsIfHosting() {
  try {
    const userData = app.getPath('userData');
    const { readLanTeamCodeFile } = require('./lan-squad/effective-team-code.js');
    const teamResult = readLanTeamCodeFile({ userDataPath: userData });
    if (!teamResult?.ok || !teamResult.code) return;
    const { readHostClinicalMeta } = require('./lan-squad/host-clinical-meta.js');
    const meta = readHostClinicalMeta(userData) || {};
    const clientId = ensureLanMdnsClientId(userData);
    const startedAt = meta.startedAt || Date.now();
    const rank = meta.rank || 'R1';
    const teamHash = buildTeamHashSync(teamResult.code);
    if (_lanMdnsService) _lanMdnsService.stop();
    _lanMdnsService = createLanMdnsService({ clientId, startedAt, rank, teamHash }, (peers) => {
      safeSendToRenderer('lan:mdns-peers', peers);
    });
    _lanMdnsService.start();
  } catch (_e) {
    // Non-critical — mDNS unavailable (e.g. firewall, no network)
  }
}

function startUdpBeaconIfHosting() {
  try {
    const userData = app.getPath('userData');
    const { readLanTeamCodeFile } = require('./lan-squad/effective-team-code.js');
    const teamResult = readLanTeamCodeFile({ userDataPath: userData });
    if (!teamResult?.ok || !teamResult.code) return;
    const { readHostClinicalMeta } = require('./lan-squad/host-clinical-meta.js');
    const meta = readHostClinicalMeta(userData) || {};
    const clientId = ensureLanMdnsClientId(userData);
    const startedAt = meta.startedAt || Date.now();
    const rank = meta.rank || 'R1';
    const teamHash = buildTeamHashSync(teamResult.code);
    if (_udpBeacon) _udpBeacon.stop();
    _udpBeacon = createUdpBeacon({ clientId, startedAt, rank, teamHash, port: 3739 });
    _udpBeacon.startListening().catch(() => {});
  } catch (_e) {
    // Non-critical — UDP beacon unavailable
  }
}

/** Persist guest Bearer from auth/exchange into userData for auto-reconnect (Electron guest only). */
ipcMain.handle('lan-ensure-server-ready', async () => {
  const lanServer = require('./server');
  const peerMode = process.env.R_PLUS_LAN_PEER === '1';
  try {
    await lanServer.startLanServer();
  } catch (lanErr) {
    const portBusy =
      (lanErr && lanErr.code === 'EADDRINUSE') ||
      (lanErr && lanErr.message && String(lanErr.message).includes('3738'));
    if (!(peerMode && portBusy)) throw lanErr;
  }
  if (!peerMode) {
    try {
      const { ensureHostStartedAt } = require('./lan-squad/host-clinical-meta.js');
      ensureHostStartedAt(app.getPath('userData'));
    } catch (_e) {
      // non-fatal — renderer may sync meta later
    }
    startLanMdnsIfHosting();
    startUdpBeaconIfHosting();
  }
  return { ok: true, peer: peerMode };
});

ipcMain.handle('lan-udp-discover', async () => {
  if (!_udpBeacon) return [];
  return _udpBeacon.discover(500);
});

/** Dev peer window (npm run dev:lan-peer-app): seed LAN client config toward local host. */
ipcMain.handle('lan-dev-peer-seed-config', () => {
  if (process.env.R_PLUS_LAN_PEER !== '1') return { ok: false };
  const hostUrl = String(process.env.R_PLUS_LAN_DEV_PEER_HOST || 'http://127.0.0.1:3738').trim();
  const teamCode = String(process.env.R_PLUS_LAN_DEV_PEER_CODE || '').trim();
  if (!hostUrl || teamCode.length < 32) return { ok: false };
  return { ok: true, hostUrl, teamCode };
});

ipcMain.handle('lan-sync-host-clinical-meta', (_e, payload) => {
  try {
    const { writeHostClinicalMeta } = require('./lan-squad/host-clinical-meta.js');
    const body = writeHostClinicalMeta(app.getPath('userData'), payload || {});
    return { ok: true, meta: body };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

ipcMain.handle('lan-guest-write-bearer', (_e, payload) => {
  const token = String(payload?.token || '').trim();
  if (!token || token.length < 32) return { ok: false, error: 'invalid_token' };
  try {
    const filePath = path.join(app.getPath('userData'), 'lan-team-code.txt');
    fs.writeFileSync(filePath, token + '\n', 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});

const {
  pickLanCandidateBaseUrl,
  listPrivateIpv4SubnetPrefixes,
} = require('./lan-squad/lan-candidate-url.js');
const { createLanNetworkWatch } = require('./lan-squad/lan-network-watch.js');

ipcMain.handle('get-lan-candidate-base-url', () => pickLanCandidateBaseUrl());

ipcMain.handle('get-lan-subnet-prefixes', () => listPrivateIpv4SubnetPrefixes());

const lanNetworkWatch = createLanNetworkWatch((payload) => {
  safeSendToRenderer('lan-network-changed', payload);
  if (_lanMdnsService) {
    if (payload.candidateBaseUrl) {
      _lanMdnsService.restart(payload.candidateBaseUrl);
    } else {
      _lanMdnsService.stop();
    }
  }
});

ipcMain.handle('clipboard-write-text', (_e, text) => {
  try {
    clipboard.writeText(String(text == null ? '' : text));
    return true;
  } catch (_err) {
    return false;
  }
});
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
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
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
  try {
    process.env.R_PLUS_USER_DATA = app.getPath('userData');
    applyUpdateChannel(readUpdateChannelFromDisk());
    captureDefaultUpdaterFeed();

    const { loadNativeDatabase } = await import('./lib/db/native-load.mjs');
    try {
      loadNativeDatabase();
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
    globalThis.__rplusDbManager = dbManager;

    const { registerDbIpcHandlers } = await import('./lib/db/ipc-handlers.mjs');
    registerDbIpcHandlers({
      ipcMain,
      dbManager,
      app,
      dialog,
      safeStorage,
      getClientId: () => 'desktop-host',
    });

    unlockPromise = unlockClinicalDbAtStartup(dbManager);

    const lanServer = require('./server');
    try {
      server = await lanServer.startLanServer();
    } catch (lanErr) {
      const peerMode = process.env.R_PLUS_LAN_PEER === '1';
      const portBusy =
        (lanErr && lanErr.code === 'EADDRINUSE') ||
        (lanErr && lanErr.message && String(lanErr.message).includes('3738'));
      if (peerMode && portBusy) {
        console.warn(
          '[R+ LAN peer mode] Puerto 3738 en uso — esta ventana usará el servidor LAN del anfitrión ya abierto.'
        );
      } else {
        throw lanErr;
      }
    }
    if (unlockPromise) await unlockPromise;
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
  lanNetworkWatch.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  lanNetworkWatch.stop();
  const lanServer = require('./server');
  void lanServer.stopLanServer();
});
