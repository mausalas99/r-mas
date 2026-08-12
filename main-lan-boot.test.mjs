/**
 * Static checks for main-process boot: clinical DB unlock before window;
 * ward server :3738 only when R_PLUS_DEV_WARD_SERVER=1.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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

test('main boot: clinical DB unlock finishes before createWindow', () => {
  const body = whenReadyBody(MAIN_SRC);
  const createIdx = body.indexOf('createWindow()');
  assert.ok(createIdx >= 0, 'createWindow in whenReady');
  assert.ok(MAIN_SRC.includes('unlockClinicalDbAtStartup'), 'clinical DB unlock helper defined');
  assert.ok(
    MAIN_SRC.includes('await dbManager.ensureUnlocked'),
    'ensureUnlocked invoked from startup helper'
  );
  assert.ok(body.includes('unlockClinicalDbAtStartup(dbManager)'), 'helper used in whenReady');
  const awaitUnlock = body.indexOf('await unlockPromise');
  assert.ok(awaitUnlock >= 0 && awaitUnlock < createIdx, 'await unlockPromise before createWindow');
});

test('main boot: production skips ward server listener on :3738', () => {
  const body = whenReadyBody(MAIN_SRC);
  const createIdx = body.indexOf('createWindow()');
  assert.ok(createIdx >= 0, 'createWindow in whenReady');
  assert.ok(
    !/\bawait\s+require\s*\(\s*['"]\.\/server['"]\s*\)/.test(body),
    'bare await require("./server") removed'
  );
  assert.ok(
    !body.includes('setOnInternoHostSync'),
    'interno host sync forward removed from boot (vitals via cloud pull)'
  );
  assert.ok(MAIN_SRC.includes('isDevWardServerEnabled'), 'isDevWardServerEnabled helper defined');
  const guardIdx = body.indexOf('isDevWardServerEnabled()');
  assert.ok(guardIdx >= 0, 'dev ward server guard in whenReady');
  assert.ok(guardIdx < createIdx, 'ward server guard before createWindow');
  const startIdx = body.indexOf('startLanServer');
  assert.ok(startIdx >= 0, 'startLanServer still available for dev mode');
  assert.ok(startIdx > guardIdx, 'startLanServer only inside dev ward server guard');
  assert.ok(startIdx < createIdx, 'startLanServer before createWindow when enabled');
});

test('main boot: lan-ensure-server-ready IPC registered', () => {
  assert.ok(
    MAIN_SRC.includes("ipcMain.handle('lan-ensure-server-ready'"),
    'lan-ensure-server-ready handler'
  );
});

test('main boot: lan-ensure-server-ready no-op in production', () => {
  const handlerStart = MAIN_SRC.indexOf("ipcMain.handle('lan-ensure-server-ready'");
  assert.ok(handlerStart >= 0, 'lan-ensure-server-ready handler');
  const handlerSlice = MAIN_SRC.slice(handlerStart, handlerStart + 420);
  assert.match(handlerSlice, /isDevWardServerEnabled\(\)/, 'guarded by dev ward flag');
  assert.match(handlerSlice, /return\s*\{\s*ok:\s*true/, 'returns success without binding');
});

test('preload: ensureLanServerReady no-op without dev ward flag', () => {
  const fnStart = PRELOAD_SRC.indexOf('ensureLanServerReady:');
  assert.ok(fnStart >= 0, 'ensureLanServerReady exposed');
  const fnSlice = PRELOAD_SRC.slice(fnStart, fnStart + 320);
  assert.match(fnSlice, /R_PLUS_DEV_WARD_SERVER/, 'checks dev ward flag');
  assert.match(fnSlice, /Promise\.resolve/, 'short-circuits without IPC');
  assert.match(fnSlice, /ok:\s*true/, 'returns success');
});

test('main boot: production quit skips ward server teardown', () => {
  const quitStart = MAIN_SRC.indexOf("app.on('before-quit'");
  assert.ok(quitStart >= 0, 'before-quit handler');
  const quitBlock = MAIN_SRC.slice(quitStart, quitStart + 1200);
  assert.ok(quitBlock.includes('isDevWardServerEnabled()'), 'quit guarded by dev ward flag');
  assert.ok(
    !quitBlock.includes('lanNetworkWatch'),
    'LAN network watch removed from quit path'
  );
  assert.ok(quitBlock.includes('flushRendererStorageAndDestroyWindows'), 'flushes Local Storage on quit');
  assert.ok(MAIN_SRC.includes('flushStorageData'), 'calls session.flushStorageData');
});

test('main window.open uses http(s) allowlist', () => {
  assert.ok(MAIN_SRC.includes('isAllowedExternalUrl'), 'window-open policy helper');
  assert.ok(MAIN_SRC.includes('setWindowOpenHandler'), 'setWindowOpenHandler present');
  const handlerStart = MAIN_SRC.indexOf('setWindowOpenHandler');
  const handlerSlice = MAIN_SRC.slice(handlerStart, handlerStart + 280);
  assert.ok(handlerSlice.includes('isAllowedExternalUrl(url)'), 'handler gates on allowlist');
});

test('main quit: destroy windows before LAN server stop (dev ward only)', () => {
  const quitStart = MAIN_SRC.indexOf("app.on('before-quit'");
  assert.ok(quitStart >= 0, 'before-quit handler');
  const quitBlock = MAIN_SRC.slice(quitStart, quitStart + 1600);
  assert.ok(quitBlock.includes('isDevWardServerEnabled()'), 'quit guarded by dev ward flag');
  const flushIdx = quitBlock.indexOf('flushRendererStorageAndDestroyWindows');
  const stopIdx = quitBlock.indexOf('stopLanServer');
  assert.ok(flushIdx >= 0, 'flush+destroy in quit path');
  assert.ok(stopIdx > flushIdx, 'flush/destroy windows before stopLanServer when dev ward enabled');
  assert.ok(quitBlock.includes('app.exit(0)'), 'hard exit after dev ward shutdown');
});

test('main boot: single-instance lock protects userData Recuérdame', () => {
  assert.ok(MAIN_SRC.includes('requestSingleInstanceLock'), 'single instance lock');
  assert.ok(MAIN_SRC.includes('cloud-sync-remember-get-sync'), 'durable remember IPC');
  assert.ok(MAIN_SRC.includes('cloud-sync-remember-store.cjs'), 'remember store module');
});
