// Reuse compiled bytecode across launches (V8 code cache) — faster cold start.
require('module').enableCompileCache?.();

// Dev-only: Electron CSP warning (unsafe-eval from bundled renderer); packaged builds omit it.
if (process.env.NODE_ENV !== 'production' && !process.env.ELECTRON_DISABLE_SECURITY_WARNINGS) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
}

const { app, BrowserWindow, Menu, shell, dialog, ipcMain, clipboard, safeStorage, session, protocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const { writeApprovedOutputDir } = require('../core/lib/output-dir-policy.js');
// autoUpdater loaded lazily via getAutoUpdater()
const {
  buildGenericFeedUrl,
  buildManualInstallerUrl,
  isValidDowngradeTargetVersion,
  pickMacArch,
} = require('../core/lib/update-downgrade.js');
const { UPDATE_FEED_MODE, UPDATE_WORKER_URL } = require('../core/lib/update-feed.js');
const { probeNativeRuntime } = require('../core/lib/native-runtime-probe.js');
const { isAllowedExternalUrl } = require('../core/lib/window-open-policy.cjs');
const { isReservedShellShortcutInput, hasCmdOrCtrl } = require('../core/lib/shell-shortcut-input.cjs');
const { PERF_CONFIG_FILE, normalizePerfConfig, readPerfConfig, writePerfConfig } = require('../core/lib/perf-config.js');
const { setLanDbManager, getLanDbManager } = require('../core/lib/db/lan-db-bridge.cjs');
const { installElectronLanCors } = require('../core/lib/electron-lan-cors.cjs');
const {
  registerRendererProtocolSchemes,
  attachRendererProtocolHandler,
  rendererAppIndexUrl,
  shouldUseLegacyHttpRenderer,
} = require('../core/lib/renderer-protocol.cjs');
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
  getAutoUpdater().allowPrerelease = normalized === 'beta';
  getAutoUpdater().channel = null;
  if (normalized === 'estable') getAutoUpdater().allowDowngrade = false;
  return normalized;
}

let downgradeSession = null;
let reinstallSession = null;
let defaultUpdaterFeed = null;

function clearReinstallSession() {
  if (!reinstallSession) return;
  if (reinstallSession.originalIsUpdateAvailable) {
    getAutoUpdater().isUpdateAvailable = reinstallSession.originalIsUpdateAvailable;
  }
  reinstallSession = null;
}

/** Re-descarga e instala el tag de release de la versión instalada (mismo semver en latest.yml). */
function beginReinstallCurrentVersion() {
  clearReinstallSession();
  const current = app.getVersion();
  reinstallSession = {
    version: current,
    originalIsUpdateAvailable: getAutoUpdater().isUpdateAvailable.bind(getAutoUpdater()),
  };
  const originalIsUpdateAvailable = reinstallSession.originalIsUpdateAvailable;
  getAutoUpdater().isUpdateAvailable = async function (updateInfo) {
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
  getAutoUpdater().allowDowngrade = true;
  getAutoUpdater().autoDownload = true;
  getAutoUpdater().setFeedURL({
    provider: 'generic',
    url: buildGenericFeedUrl(current),
  });
}

function captureDefaultUpdaterFeed() {
  if (defaultUpdaterFeed) return defaultUpdaterFeed;
  try {
    defaultUpdaterFeed = getAutoUpdater().getFeedURL();
  } catch (_e) {
    defaultUpdaterFeed = null;
  }
  return defaultUpdaterFeed;
}

function resetUpdaterFeedToDefault() {
  downgradeSession = null;
  clearReinstallSession();
  getAutoUpdater().allowDowngrade = false;
  applyUpdateChannel(readUpdateChannelFromDisk());
  const feed = captureDefaultUpdaterFeed();
  if (feed) {
    try {
      getAutoUpdater().setFeedURL(feed);
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
  getAutoUpdater().allowDowngrade = true;
  getAutoUpdater().autoDownload = true;
  getAutoUpdater().setFeedURL({
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
    // Verify mode parks the window off-screen; without this macOS clamps it back on.
    enableLargerThanScreen: process.env.R_PLUS_VERIFY_MODE === '1',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // R_PLUS_VERIFY_MODE: script de verificación visual (scripts/verify/) posiciona la
      // ventana fuera de pantalla para no interrumpir al usuario; sin esto Chromium la
      // trata como ocluida y pausa timers/rAF, dejando el contenido sin montar.
      backgroundThrottling: process.env.R_PLUS_VERIFY_MODE !== '1',
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

  // R_PLUS_VERIFY_MODE (E2E/verify): off-screen, no focus, no Dock icon, so a
  // test run never interrupts the user. Playwright input goes over CDP, no focus needed.
  const revealWindow = () => {
    if (process.env.R_PLUS_VERIFY_MODE === '1') {
      if (process.platform === 'darwin') app.dock?.hide();
      // Same size maximize() would give, so layout checks match a real run.
      const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;
      // An off-screen window breaks the Mission Control layout for every window.
      if (process.platform === 'darwin') mainWindow.setHiddenInMissionControl(true);
      mainWindow.showInactive();
      mainWindow.setBounds({ x: -20000, y: -20000, width, height });
      return;
    }
    mainWindow.maximize();
    mainWindow.show();
  };

  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) revealWindow();
  }, 5000);

  mainWindow.once('ready-to-show', () => {
    bootMark('ready-to-show');
    clearTimeout(showFallback);
    revealWindow();
  });

  // Wait for renderer JS to fully load before checking for updates
  mainWindow.webContents.once('did-finish-load', () => {
    bootMark('did-finish-load');
    markModuleBootSuccess();
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

  // Persistent (not .once — reused on every reload) module-rollback boot tracking.
  // A load that finishes while a staged module is active confirms that module
  // booted; a load that fails or crashes on it is a boot failure, and two
  // consecutive failures revert to the last-good module already on disk.
  mainWindow.webContents.on('did-finish-load', () => {
    markActiveModuleBootSuccess();
  });
  mainWindow.webContents.on('did-fail-load', (_e, _errorCode, _errorDescription, _validatedURL, isMainFrame) => {
    if (isMainFrame) recordActiveModuleBootFailure();
  });
  mainWindow.webContents.on('render-process-gone', () => {
    recordActiveModuleBootFailure();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Auto-updater events ───────────────────────────────────────────
// Set once in app.whenReady() by the Mac quiet-swap gate (lib/mac-quiet-swap.mjs).
// True only for an 8.2.6 install still on the old free Apple cert: it bridges
// itself to 8.2.7 (Developer ID) outside electron-updater, whose Mac path would
// otherwise try 8.2.7 and fail the Team ID check. scheduleUpdateCheck() below
// no-ops for the rest of this session when true. Inert (false) everywhere else.
let macQuietSwapActive = false;
let _autoUpdater = null;
function getAutoUpdater() {
  if (!_autoUpdater) {
    _autoUpdater = require('electron-updater').autoUpdater;
    _autoUpdater.autoDownload = true;
    _autoUpdater.autoInstallOnAppQuit = true;
    _autoUpdater.allowPrerelease = false;
    // Default feed for this build. 'worker' overrides electron-builder's baked-in
    // GitHub feed with the rmas-update-feed Worker (GitHub-first, GitLab fallback —
    // see cloud/update-worker/README.md). 'github' leaves today's behavior unchanged.
    // Downgrade/reinstall paths stay on GitHub tag folders regardless (buildGenericFeedUrl).
    if (UPDATE_FEED_MODE === 'worker') {
      try {
        _autoUpdater.setFeedURL({ provider: 'generic', url: UPDATE_WORKER_URL });
      } catch (_e) { /* noop — falls back to electron-builder's baked-in feed */ }
    }
    _autoUpdater.on('update-available', onUpdateAvailable);
    _autoUpdater.on('download-progress', onDownloadProgress);
    _autoUpdater.on('update-downloaded', onUpdateDownloaded);
    _autoUpdater.on('update-not-available', onUpdateNotAvailable);
    _autoUpdater.on('error', onUpdaterError);
  }
  return _autoUpdater;
}

// ── Signed module-bundle boot verification (Phase E) ──────────────
// Verifies the shipped renderer bundle (public/js/app.bundle.mjs + chunks/)
// against its release-time manifest + signature before anything loads it.
// A dev build (npm start) is unsigned and skips this — only a packaged
// build carries a manifest, written by scripts/sign-release-bundle.mjs
// during release:publish. A bad or missing signature fails closed: never
// load unverified renderer content.
const MODULE_ROLLBACK_STATE_FILE = 'module-rollback-state.json';
const MODULE_ROLLBACK_OVERRIDE_FILE = 'module-rollback-override.json';
const MODULE_ACTIVE_POINTER_FILE = 'module-active-pointer.json';
// Separate from MODULE_ROLLBACK_STATE_FILE above, which tracks the shell's own
// app-version boot outcomes (recovery = full-app downgrade + reinstall). This
// file tracks the ACTIVE MODULE's boot outcomes, keyed by module version;
// recovery is reverting to a module bundle already staged on disk — no
// redownload, no reinstall, no restart.
const MODULE_ACTIVE_ROLLBACK_STATE_FILE = 'module-active-rollback-state.json';

function moduleBundleDir() {
  return path.join(__dirname, '..', 'core', 'public', 'js');
}

function moduleUpdatePublicKeyPem() {
  return fs.readFileSync(path.join(__dirname, '..', 'core', 'module-update-pubkey.pem'), 'utf8');
}

function moduleActivePointerPath() {
  return path.join(app.getPath('userData'), MODULE_ACTIVE_POINTER_FILE);
}

function moduleActiveRollbackStatePath() {
  return path.join(app.getPath('userData'), MODULE_ACTIVE_ROLLBACK_STATE_FILE);
}

// module-update-fetch.mjs always stages a version at <modulesRootDir>/<version>/,
// so the directory for any module version is reconstructible from the version
// string alone — no separate on-disk index to keep in sync.
function modulesRootDir() {
  return path.join(app.getPath('userData'), 'modules');
}

function stagingDirForModuleVersion(version) {
  return path.join(modulesRootDir(), version);
}

// Set only after a staged module passes re-verification (loadActiveModuleOrClear,
// or a successful check-for-module-update). Read by attachRendererProtocolHandler's
// getActiveModuleDir callback below to serve js/app.bundle.mjs + js/chunks/*
// from a live-activated module update instead of the packaged bundle.
let activeModuleDir = null;

/** Persists (or clears) which staged module is active, on disk and in memory. */
function persistActiveModule(stagingDir) {
  if (stagingDir) {
    fs.writeFileSync(moduleActivePointerPath(), JSON.stringify({ stagingDir }));
  } else {
    fs.rmSync(moduleActivePointerPath(), { force: true });
  }
  activeModuleDir = stagingDir || null;
}

/** Reverts to the last known-good module version if it is still staged on disk, else the packaged bundle. */
function revertActiveModuleToLastGood(rollbackState) {
  const goodVersion = rollbackState && rollbackState.lastGoodVersion;
  const goodDir = goodVersion ? stagingDirForModuleVersion(goodVersion) : null;
  persistActiveModule(goodDir && fs.existsSync(goodDir) ? goodDir : null);
}

/**
 * Runs once per launch, before the renderer window is created. Re-verifies
 * any module update activated in a previous session (signature, file hashes,
 * and this build's compat range) before trusting it again — a pointer that
 * fails any check is cleared and this launch falls back to the packaged
 * bundle. Never throws: a bad or missing pointer is not a boot failure.
 *
 * Also carries the module rollback tracker forward across launches: if the
 * previous launch activated this exact version and never confirmed a
 * successful boot (crashed before did-finish-load/did-fail-load could
 * record it), that counts as a boot failure here, same as
 * verifyModuleBootOrRollback does for the shell's own version.
 */
async function loadActiveModuleOrClear() {
  const pointer = (() => {
    try {
      return JSON.parse(fs.readFileSync(moduleActivePointerPath(), 'utf8'));
    } catch {
      return null;
    }
  })();
  if (!pointer || !pointer.stagingDir) return;
  const version = path.basename(pointer.stagingDir);
  try {
    const { verifyModuleUpdate } = await import('../shared-signing/lib/verify-module-update.mjs');
    const { isCoreVersionCompatible } = await import('../core/lib/module-update-activate.mjs');
    const { loadJsonFile, saveJsonFile } = await import('../shared-signing/lib/module-boot-guard.mjs');
    const { recordBootOutcome, shouldRollback } = await import('../shared-signing/lib/rollback-tracker.mjs');

    let rollbackState = loadJsonFile(moduleActiveRollbackStatePath(), {});
    if (rollbackState.pendingVersion === version) {
      rollbackState = recordBootOutcome(rollbackState, { version, success: false });
      saveJsonFile(moduleActiveRollbackStatePath(), rollbackState);
    }
    if (shouldRollback(rollbackState, version)) {
      revertActiveModuleToLastGood(rollbackState);
      return;
    }

    const manifest = JSON.parse(
      fs.readFileSync(path.join(pointer.stagingDir, 'module-manifest.json'), 'utf8')
    );
    const signature = fs.readFileSync(path.join(pointer.stagingDir, 'module-signature.txt'), 'utf8').trim();
    const verified = verifyModuleUpdate({
      manifest,
      signature,
      publicKeyPem: moduleUpdatePublicKeyPem(),
      bundleDir: pointer.stagingDir,
    });
    if (verified.ok && isCoreVersionCompatible(app.getVersion(), manifest)) {
      activeModuleDir = pointer.stagingDir;
      rollbackState.pendingVersion = version;
      saveJsonFile(moduleActiveRollbackStatePath(), rollbackState);
      return;
    }
  } catch (_e) {
    /* falls through to the fs.rmSync cleanup below */
  }
  fs.rmSync(moduleActivePointerPath(), { force: true });
}

/** Called on every renderer load that finishes while a module is active — confirms that module boots. */
function markActiveModuleBootSuccess() {
  if (!activeModuleDir) return;
  const version = path.basename(activeModuleDir);
  import('../shared-signing/lib/module-boot-guard.mjs')
    .then(async ({ loadJsonFile, saveJsonFile }) => {
      const { recordBootOutcome } = await import('../shared-signing/lib/rollback-tracker.mjs');
      const statePath = moduleActiveRollbackStatePath();
      let state = loadJsonFile(statePath, {});
      state = recordBootOutcome(state, { version, success: true });
      state.pendingVersion = undefined;
      saveJsonFile(statePath, state);
    })
    .catch((e) => console.error('[module-rollback] no se pudo registrar el arranque exitoso del módulo:', e && e.message));
}

/**
 * Called when the renderer fails to load or its process crashes while a
 * module is active. One failure retries the same module (a reload); a
 * second consecutive failure reverts to the last-good module already
 * staged on disk (or the packaged bundle) — no redownload, no reinstall,
 * no restart.
 */
function recordActiveModuleBootFailure() {
  if (!activeModuleDir) return;
  const version = path.basename(activeModuleDir);
  Promise.all([
    import('../shared-signing/lib/module-boot-guard.mjs'),
    import('../shared-signing/lib/rollback-tracker.mjs'),
  ])
    .then(([{ loadJsonFile, saveJsonFile }, { recordBootOutcome, shouldRollback }]) => {
      const statePath = moduleActiveRollbackStatePath();
      let state = loadJsonFile(statePath, {});
      state = recordBootOutcome(state, { version, success: false });
      if (shouldRollback(state, version)) {
        revertActiveModuleToLastGood(state);
        state.pendingVersion = undefined;
      } else {
        state.pendingVersion = version;
      }
      saveJsonFile(statePath, state);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.reloadIgnoringCache();
      }
    })
    .catch((e) => console.error('[module-rollback] no se pudo registrar el fallo de arranque del módulo:', e && e.message));
}

/** Runs once per launch, before the renderer window is created. */
async function verifyModuleBootOrRollback() {
  if (!app.isPackaged) return { ok: true };
  const {
    verifyShippedBundle,
    loadRollbackState,
    saveRollbackState,
    loadRollbackOverrideVersion,
  } = await import('../shared-signing/lib/module-boot-guard.mjs');
  const { recordBootOutcome, shouldRollback } = await import('../shared-signing/lib/rollback-tracker.mjs');

  const version = app.getVersion();
  const bundleDir = moduleBundleDir();
  const statePath = path.join(app.getPath('userData'), MODULE_ROLLBACK_STATE_FILE);
  const overridePath = path.join(app.getPath('userData'), MODULE_ROLLBACK_OVERRIDE_FILE);

  let state = loadRollbackState(statePath);
  if (state.pendingVersion === version) {
    // The previous launch of this exact version never reached a successful boot.
    state = recordBootOutcome(state, { version, success: false });
  }

  const verified = verifyShippedBundle({
    bundleDir,
    manifestPath: path.join(bundleDir, 'module-manifest.json'),
    signaturePath: path.join(bundleDir, 'module-signature.txt'),
    publicKeyPem: moduleUpdatePublicKeyPem(),
  });

  if (!verified.ok) {
    state = recordBootOutcome(state, { version, success: false });
    state.pendingVersion = undefined;
    saveRollbackState(statePath, state);
    const overrideVersion = loadRollbackOverrideVersion(overridePath);
    const fallbackVersion = state.lastGoodVersion;
    const shouldFallBack =
      shouldRollback(state, version) &&
      overrideVersion !== version &&
      fallbackVersion &&
      fallbackVersion !== version;
    return { ok: false, reason: verified.reason, fallbackVersion: shouldFallBack ? fallbackVersion : null };
  }

  state.pendingVersion = version;
  saveRollbackState(statePath, state);
  return { ok: true };
}

/** Called once the renderer has actually loaded — confirms this version boots. */
function markModuleBootSuccess() {
  if (!app.isPackaged) return;
  import('../shared-signing/lib/module-boot-guard.mjs')
    .then(async ({ loadRollbackState, saveRollbackState }) => {
      const { recordBootOutcome } = await import('../shared-signing/lib/rollback-tracker.mjs');
      const statePath = path.join(app.getPath('userData'), MODULE_ROLLBACK_STATE_FILE);
      let state = loadRollbackState(statePath);
      state = recordBootOutcome(state, { version: app.getVersion(), success: true });
      state.pendingVersion = undefined;
      saveRollbackState(statePath, state);
    })
    .catch((e) => console.error('[module-boot] no se pudo registrar el arranque exitoso:', e && e.message));
}

/**
 * Fetches a module update, verifies it (Phase 2), checks its compat range
 * against this core build, and — only if both pass — activates it: persists
 * the pointer, points the renderer protocol at the staged files, and reloads
 * the window. Never loads an unverified or incompatible bundle.
 */
ipcMain.handle('check-for-module-update', async () => {
  const { fetchModuleUpdate } = await import('../core/lib/module-update-fetch.mjs');
  const { isCoreVersionCompatible } = await import('../core/lib/module-update-activate.mjs');
  const result = await fetchModuleUpdate({
    fetchFn: net.fetch.bind(net),
    feedBaseUrl: UPDATE_WORKER_URL,
    modulesRootDir: modulesRootDir(),
    publicKeyPem: moduleUpdatePublicKeyPem(),
  });
  if (!result.ok) return { ok: false, reason: result.reason };
  if (!isCoreVersionCompatible(app.getVersion(), result.manifest)) {
    fs.rmSync(result.stagingDir, { recursive: true, force: true });
    return { ok: false, reason: 'incompatible-core-version' };
  }

  persistActiveModule(result.stagingDir);
  const { loadJsonFile, saveJsonFile } = await import('../shared-signing/lib/module-boot-guard.mjs');
  const statePath = moduleActiveRollbackStatePath();
  const rollbackState = loadJsonFile(statePath, {});
  rollbackState.pendingVersion = result.version;
  saveJsonFile(statePath, rollbackState);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.reloadIgnoringCache();
  }
  return { ok: true, version: result.version };
});

/** Attempts a real, end-to-end fallback to the last known-good version via the existing downgrade/updater flow. */
function attemptAutoRollback(targetVersion) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    try {
      beginDowngradeToVersion(targetVersion);
    } catch (_e) {
      finish(false);
      return;
    }
    const updater = getAutoUpdater();
    updater.once('update-downloaded', () => finish(true));
    updater.once('error', () => finish(false));
    updater.checkForUpdates().catch(() => finish(false));
    setTimeout(() => finish(false), 60000);
  });
}

/**
 * Menu action: keep the current version even if verification/boot keeps
 * failing, instead of letting the N-failure cap fall back automatically.
 * Requires an explicit confirmation click every time — never automatic.
 */
async function confirmModuleRollbackOverride() {
  const version = app.getVersion();
  const { response } = await dialog.showMessageBox(mainWindow || undefined, {
    type: 'warning',
    buttons: ['Cancelar', 'Sí, mantener esta versión'],
    defaultId: 0,
    cancelId: 0,
    title: 'Mantener versión pese a fallos',
    message: `¿Mantener la versión ${version} aunque falle la verificación o el arranque?`,
    detail:
      'Esto desactiva la restauración automática a la última versión buena para esta versión. Solo hazlo si sabes por qué está fallando.',
  });
  if (response !== 1) return;
  const { saveRollbackOverrideVersion } = await import('../shared-signing/lib/module-boot-guard.mjs');
  const overridePath = path.join(app.getPath('userData'), MODULE_ROLLBACK_OVERRIDE_FILE);
  saveRollbackOverrideVersion(overridePath, version);
}

function safeSendToRenderer(channel, payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  } catch (e) {
    console.error('safeSendToRenderer error for', channel, ':', e && e.message);
  }
}

function onUpdateAvailable(info) {
  try {
    const releaseNotes = serializeReleaseNotes(info);
    const version = info && info.version ? info.version : '';
    const prerelease = !!(info && info.prerelease);
    pendingUpdate = { type: 'available', version, releaseNotes, prerelease };
    safeSendToRenderer('update-available', { version, releaseNotes, prerelease });
  } catch (e) {
    console.error('update-available handler error:', e && e.message);
  }
}

function onDownloadProgress(p) {
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
}

function onUpdateDownloaded(info) {
  try {
    const version = info && info.version ? info.version : '';
    pendingUpdate = { type: 'ready', version };
    safeSendToRenderer('update-ready', { version });
  } catch (e) {
    console.error('update-downloaded handler error:', e && e.message);
  }
}

function onUpdateNotAvailable() {
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
}

function onUpdaterError(err) {
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
}

ipcMain.on('install-update', () => {
  clearReinstallSession();
  getAutoUpdater().quitAndInstall();
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
  if (macQuietSwapActive) return; // this session bridges via quiet-swap instead — see lib/mac-quiet-swap.mjs
  if (updateCheckTimer) clearTimeout(updateCheckTimer);
  updateCheckTimer = setTimeout(function () {
    updateCheckTimer = null;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      getAutoUpdater().checkForUpdates().catch(function (err) {
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
    docExportModule = require('../core/lib/doc-export-service.js');
    logDocExportFn = require('../core/lib/doc-export-audit.js').logDocExport;
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

ipcMain.handle('clipboard-write-text', (_e, text) => {
  try {
    clipboard.writeText(String(text == null ? '' : text));
    return true;
  } catch (_err) {
    return false;
  }
});

ipcMain.handle('clipboard-write-html', (_e, text, html) => {
  try {
    clipboard.write({
      text: String(text == null ? '' : text),
      html: String(html == null ? '' : html),
    });
    return true;
  } catch (_err) {
    return false;
  }
});

ipcMain.handle('lab-repo-fetch', async (_e, payload) => {
  try {
    const { fetchLabRepoStudies } = await import('../core/lib/lab-repo/lab-repo-fetch.mjs');
    return await fetchLabRepoStudies(payload);
  } catch (err) {
    return {
      studies: [],
      errors: [{ folio: '', message: String(err?.message || err) }],
    };
  }
});

ipcMain.handle('lab-repo-check', async (_e, payload) => {
  try {
    const { checkLabRepoHasStudies } = await import('../core/lib/lab-repo/lab-repo-fetch.mjs');
    return await checkLabRepoHasStudies(payload);
  } catch (err) {
    return { hasStudies: null, error: String(err?.message || err) };
  }
});

ipcMain.handle('cloud-sync-fetch', async (_e, payload) => {
  try {
    const { cloudSyncNetFetch } = require('../core/lib/cloud-sync-ipc-fetch.cjs');
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
} = require('../core/lib/cloud-sync-remember-store.cjs');

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

  const debugUpdater = process.env.R_PLUS_DEBUG_UPDATER === '1';
  const rollbackOverrideItem = { label: 'Mantener versión pese a fallos…', click: () => confirmModuleRollbackOverride() };

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: `R+ v${version}`, enabled: false },
        { type: 'separator' },
        { label: 'Buscar actualizaciones…', click: checkUpdate },
        ...(debugUpdater ? [rollbackOverrideItem] : []),
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
          ...(debugUpdater ? [rollbackOverrideItem] : []),
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

// Downloads a Mac quiet-swap zip via Electron's net module: follows GitHub's 302
// redirects and sets no com.apple.quarantine xattr (unlike a browser download —
// that's the point). See lib/mac-quiet-swap.mjs.
function quietSwapDownload(url, destPath) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const request = net.request({ url, redirect: 'follow' });
    const out = fs.createWriteStream(destPath);
    out.on('error', fail);
    out.on('finish', () => { settled = true; resolve(); });
    request.on('error', fail);
    request.on('response', (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        fail(new Error(`quiet-swap: HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.on('data', (chunk) => out.write(chunk));
      response.on('end', () => out.end());
      response.on('error', fail);
    });
    request.end();
  });
}

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return;
  try {
    installElectronLanCors(session.defaultSession);
    await loadActiveModuleOrClear();
    if (!shouldUseLegacyHttpRenderer()) {
      attachRendererProtocolHandler(
        { protocol, net },
        path.join(__dirname, '..', 'core', 'public'),
        { getActiveModuleDir: () => activeModuleDir }
      );
    }
    process.env.R_PLUS_USER_DATA = app.getPath('userData');
    applyUpdateChannel(readUpdateChannelFromDisk());
    captureDefaultUpdaterFeed();
    bootMark('updater-feed');

    // Mac quiet-swap gate: only active for an 8.2.6 install still on the old free
    // Apple cert. When active, electron-updater must sit out this session (see
    // scheduleUpdateCheck) and the actual download+swap runs ~30s later, silently.
    try {
      const { checkActivation, runQuietSwap } = await import('../core/lib/mac-quiet-swap.mjs');
      const activation = await checkActivation({
        platform: process.platform,
        isPackaged: app.isPackaged,
        execPath: process.execPath,
        execFile: execFileAsync,
      });
      macQuietSwapActive = activation.active;
      if (macQuietSwapActive) {
        setTimeout(() => {
          runQuietSwap({
            appPath: activation.appPath,
            arch: process.arch,
            userDataDir: app.getPath('userData'),
            execFile: execFileAsync,
            download: quietSwapDownload,
            fs: fs.promises,
            trash: (p) => shell.trashItem(p),
            log: (...args) => console.warn(...args),
          }).catch((err) => {
            console.error('[quiet-swap] unexpected error:', err && err.message);
          });
        }, 30000);
      }
    } catch (qsErr) {
      console.error('[quiet-swap] activation check failed:', qsErr && qsErr.message);
    }
    bootMark('quiet-swap-gate');

    const { loadNativeDatabase } = await import('../core/lib/db/native-load.mjs');
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

    const { createDbManager } = await import('../core/lib/db/db-manager.mjs');
    const dbManager = createDbManager({
      userDataPath: app.getPath('userData'),
      safeStorage,
      getClientId: () => 'desktop-host',
    });
    setLanDbManager(dbManager);

    const { registerDbIpcHandlers } = await import('../core/lib/db/ipc-handlers.mjs');
    registerDbIpcHandlers({
      ipcMain,
      dbManager,
      app,
      dialog,
      safeStorage,
      getClientId: () => 'desktop-host',
    });
    bootMark('db-ipc');

    const { registerAdminRescueKeyIpcHandlers } = await import('../core/lib/admin-rescue-key-ipc.mjs');
    registerAdminRescueKeyIpcHandlers({ ipcMain, app, safeStorage });

    unlockPromise = unlockClinicalDbAtStartup(dbManager);
    unlockPromise.catch((unlockErr) => {
      // The renderer surfaces this through db:status + the unlock overlay
      // (public/js/features/db-unlock-boot.mjs). Log only — do not quit here.
      console.error('[R+ boot] clinical DB unlock failed:', unlockErr && unlockErr.message);
    });

    if (process.env.R_PLUS_RECOVER_CENSUS === '1') {
      try {
        await unlockPromise;
        const { runRecoverCensusExport } = await import('../core/lib/db/recover-census-export.mjs');
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
  } catch (e) {
    const detail = e && e.message ? e.message : String(e);
    dialog.showErrorBox(
      'R+ no pudo iniciar',
      detail
    );
    app.quit();
    return;
  }
  const moduleBoot = await verifyModuleBootOrRollback();
  if (!moduleBoot.ok) {
    let restored = false;
    if (moduleBoot.fallbackVersion) {
      restored = await attemptAutoRollback(moduleBoot.fallbackVersion);
    }
    if (restored) {
      getAutoUpdater().quitAndInstall();
      return;
    }
    dialog.showErrorBox(
      'R+ no pudo iniciar',
      moduleBoot.fallbackVersion
        ? `La verificación del paquete de la aplicación falló y no se pudo restaurar automáticamente la versión ${moduleBoot.fallbackVersion}. Reinstala desde GitHub o contacta soporte.`
        : 'La verificación del paquete de la aplicación falló. Reinstala desde GitHub o contacta soporte.'
    );
    app.quit();
    return;
  }
  bootMark('module-boot-verify');

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

  void flushRendererStorageAndDestroyWindows().finally(finishQuit);
});
