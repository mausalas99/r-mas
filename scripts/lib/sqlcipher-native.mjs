/**
 * Shared SQLCipher native helpers: Electron probe + on-disk Electron backup.
 * better-sqlite3 lazy-loads the .node on first Database() — probes must open :memory:.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SQLCIPHER_NODE_REL = 'node_modules/better-sqlite3-multiple-ciphers/build/Release/better_sqlite3.node';

const libDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.join(libDir, '..', '..');

/** @param {string} [root] */
export function sqlcipherDestAbs(root = repoRoot) {
  return path.join(root, SQLCIPHER_NODE_REL);
}

/** @param {string} [root] */
function electronCacheAbs(root = repoRoot) {
  return path.join(root, 'scripts', '.native-cache', 'better_sqlite3.electron.node');
}

/** @param {string} [root] */
export function electronBinAbs(root = repoRoot) {
  return process.platform === 'win32'
    ? path.join(root, 'node_modules', '.bin', 'electron.cmd')
    : path.join(root, 'node_modules', '.bin', 'electron');
}

/** @param {string} [root] */
export function electronSqlcipherProbeScript(root = repoRoot) {
  return path.join(root, 'scripts', 'electron-sqlcipher-probe.cjs');
}

/**
 * True when better_sqlite3.node loads under Electron (opens :memory: in child process).
 * @param {string} [root]
 */
export function electronSqlcipherLoads(root = repoRoot) {
  const electronBin = electronBinAbs(root);
  if (!fs.existsSync(electronBin)) return false;
  const probeScript = electronSqlcipherProbeScript(root);
  const r = spawnSync(electronBin, [probeScript], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 45_000,
    env: process.env,
  });
  return r.status === 0;
}

/**
 * Cache the current dest binary when it already loads under Electron.
 * @param {string} [root]
 */
export function cacheElectronBinaryIfValid(root = repoRoot) {
  const dest = sqlcipherDestAbs(root);
  if (!fs.existsSync(dest) || !electronSqlcipherLoads(root)) return false;
  const cache = electronCacheAbs(root);
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.copyFileSync(dest, cache);
  return true;
}

/**
 * Restore a previously cached Electron binary.
 * @param {string} [root]
 */
export function restoreElectronBinaryFromCache(root = repoRoot) {
  const cache = electronCacheAbs(root);
  const dest = sqlcipherDestAbs(root);
  if (!fs.existsSync(cache)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(cache, dest);
  return true;
}

/** @param {string} [root] */
export function rememberElectronBinary(root = repoRoot) {
  return cacheElectronBinaryIfValid(root);
}
