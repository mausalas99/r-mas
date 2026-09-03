/**
 * Static checks for main-process boot: clinical DB IPC registered before window;
 * DB unlock runs in parallel; no LAN ward server.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MAIN_SRC = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
const PRELOAD_SRC = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');

function whenReadyBody(src) {
  const start = src.indexOf('app.whenReady().then(async () => {');
  assert.ok(start >= 0, 'app.whenReady block missing');
  const end = src.indexOf('app.on(\'window-all-closed\'', start);
  assert.ok(end > start, 'window-all-closed handler missing');
  return src.slice(start, end);
}

test('main boot: DB IPC registered before window; unlock runs in parallel', () => {
  const body = whenReadyBody(MAIN_SRC);
  const createIdx = body.indexOf('createWindow()');
  assert.ok(createIdx >= 0, 'createWindow in whenReady');

  const registerIdx = body.indexOf('registerDbIpcHandlers(');
  assert.ok(registerIdx >= 0 && registerIdx < createIdx,
    'db IPC handlers registered before the window can call them');

  const assignIdx = body.indexOf('unlockPromise = unlockClinicalDbAtStartup(dbManager)');
  assert.ok(assignIdx >= 0 && assignIdx < createIdx, 'unlock starts before createWindow');

  const awaitIdx = body.indexOf('await unlockPromise');
  if (awaitIdx >= 0) {
    const recoverIdx = body.indexOf("R_PLUS_RECOVER_CENSUS");
    assert.ok(recoverIdx >= 0 && awaitIdx > recoverIdx,
      'the only await on unlockPromise is inside the recover-census branch');
  }
  assert.match(body, /unlockPromise\.catch\(/,
    'unlock rejection handled — otherwise it is an unhandled rejection');
  assert.ok(MAIN_SRC.includes('await dbManager.ensureUnlocked'),
    'ensureUnlocked invoked from startup helper');
});

test('main boot: no ward server listener on :3738', () => {
  const body = whenReadyBody(MAIN_SRC);
  assert.ok(!body.includes("require('./server')"), 'whenReady does not load server.js');
  assert.ok(!MAIN_SRC.includes('isDevWardServerEnabled'), 'dev ward helper removed');
  assert.ok(!MAIN_SRC.includes('startLanServer'), 'startLanServer removed');
  assert.ok(!MAIN_SRC.includes("ipcMain.handle('lan-ensure-server-ready'"), 'lan-ensure-server-ready IPC removed');
  assert.ok(
    !body.includes('setOnInternoHostSync'),
    'interno host sync forward removed from boot (vitals via cloud pull)'
  );
});

test('preload: no ward-server or 7.9 cutover wipe bridge', () => {
  assert.ok(!PRELOAD_SRC.includes('ensureLanServerReady'), 'ensureLanServerReady removed');
  assert.ok(!PRELOAD_SRC.includes('lan-ensure-server-ready'), 'lan-ensure-server-ready invoke removed');
  assert.ok(!PRELOAD_SRC.includes('dbClinical79CutoverWipe'), 'cutover wipe bridge removed');
  assert.ok(!PRELOAD_SRC.includes('db:clinical-79-cutover-wipe'), 'cutover wipe invoke removed');
});

test('main boot: quit flushes Local Storage and exits', () => {
  const quitStart = MAIN_SRC.indexOf("app.on('before-quit'");
  assert.ok(quitStart >= 0, 'before-quit handler');
  const quitBlock = MAIN_SRC.slice(quitStart, quitStart + 1200);
  assert.ok(!quitBlock.includes('isDevWardServerEnabled()'), 'quit has no ward-server branch');
  assert.ok(!quitBlock.includes('stopLanServer'), 'quit does not stop a ward server');
  assert.ok(
    !quitBlock.includes('lanNetworkWatch'),
    'LAN network watch removed from quit path'
  );
  assert.ok(quitBlock.includes('flushRendererStorageAndDestroyWindows'), 'flushes Local Storage on quit');
  assert.ok(quitBlock.includes('app.exit(0)'), 'hard exit after flush');
  assert.ok(MAIN_SRC.includes('flushStorageData'), 'calls session.flushStorageData');
});

test('main window.open uses http(s) allowlist', () => {
  assert.ok(MAIN_SRC.includes('isAllowedExternalUrl'), 'window-open policy helper');
  assert.ok(MAIN_SRC.includes('setWindowOpenHandler'), 'setWindowOpenHandler present');
  const handlerStart = MAIN_SRC.indexOf('setWindowOpenHandler');
  const handlerSlice = MAIN_SRC.slice(handlerStart, handlerStart + 280);
  assert.ok(handlerSlice.includes('isAllowedExternalUrl(url)'), 'handler gates on allowlist');
});

test('main boot: single-instance lock protects userData Recuérdame', () => {
  assert.ok(MAIN_SRC.includes('requestSingleInstanceLock'), 'single instance lock');
  assert.ok(MAIN_SRC.includes('cloud-sync-remember-get-sync'), 'durable remember IPC');
  assert.ok(MAIN_SRC.includes('cloud-sync-remember-store.cjs'), 'remember store module');
});

test('main forwards ⌘1 / ⌘E / ⌘T to renderer (Chromium would steal them)', () => {
  assert.ok(MAIN_SRC.includes("require('./lib/shell-shortcut-input.cjs')"));
  assert.ok(MAIN_SRC.includes("on('before-input-event'"));
  assert.ok(MAIN_SRC.includes("send('shell-shortcut'"));
  assert.ok(PRELOAD_SRC.includes('onShellShortcut'));
  assert.ok(PRELOAD_SRC.includes("on('shell-shortcut'"));
  const require = createRequire(import.meta.url);
  const { isReservedShellShortcutInput } = require('./lib/shell-shortcut-input.cjs');
  assert.equal(isReservedShellShortcutInput({ type: 'keyDown', meta: true, code: 'Digit1', key: '1' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'keyDown', meta: true, code: 'KeyE', key: 'e' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'keyDown', meta: true, code: 'KeyT', key: 't' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'rawKeyDown', meta: true, code: 'Digit1', key: '1' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'rawKeyDown', meta: true, code: 'KeyE', key: 'e' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'rawKeyDown', meta: true, code: 'KeyT', key: 't' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'rawKeyDown', modifiers: ['meta'], code: 'Digit1', key: '1' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'keyDown', modifiers: ['cmd'], code: 'KeyT', key: 't' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'keyUp', meta: true, code: 'Digit1', key: '1' }), false);
  assert.equal(isReservedShellShortcutInput({ type: 'keyDown', meta: true, code: 'KeyA', key: 'a' }), false);
  assert.equal(isReservedShellShortcutInput({ type: 'keyDown', meta: true, shift: true, code: 'KeyC', key: 'c' }), true);
  assert.equal(isReservedShellShortcutInput({ type: 'keyDown', meta: true, alt: true, code: 'KeyT', key: 't' }), false);
  assert.ok(MAIN_SRC.includes("accelerator: 'CmdOrCtrl+1'"));
  assert.ok(MAIN_SRC.includes("accelerator: 'CmdOrCtrl+E'"));
  assert.ok(MAIN_SRC.includes("accelerator: 'CmdOrCtrl+T'"));
});
