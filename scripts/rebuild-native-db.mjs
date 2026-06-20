import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeNativeBinary } from './lib/native-binary-format.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const probeScript = path.join(root, 'scripts', 'electron-sqlcipher-probe.cjs');
const sqlcipherRel =
  'node_modules/better-sqlite3-multiple-ciphers/build/Release/better_sqlite3.node';
const electronBin =
  process.platform === 'win32'
    ? path.join(root, 'node_modules', '.bin', 'electron.cmd')
    : path.join(root, 'node_modules', '.bin', 'electron');

function electronSqlcipherLoads() {
  if (!fs.existsSync(electronBin)) return false;
  const r = spawnSync(electronBin, [probeScript], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    timeout: 12_000,
    env: process.env,
  });
  return r.status === 0;
}

function runElectronRebuild(force) {
  const forceFlag = force ? ' -f' : '';
  execSync(`npx @electron/rebuild${forceFlag} -w better-sqlite3-multiple-ciphers`, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    timeout: 180_000,
  });
}

function tryFetchElectronPrebuild() {
  if (process.platform !== 'darwin' && process.platform !== 'win32') return;
  execSync('node scripts/fetch-sqlite-electron.mjs', {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    timeout: 120_000,
  });
}

const strict = process.env.R_PLUS_STRICT_NATIVE === '1';
const sqlAbs = path.join(root, sqlcipherRel);
const expectPlatform = process.platform === 'win32' ? 'win32' : 'darwin';
const format = describeNativeBinary(sqlAbs, expectPlatform);
const needsRebuild = !format.ok || !electronSqlcipherLoads();

if (!needsRebuild) {
  process.exit(0);
}

try {
  runElectronRebuild(true);
} catch (e) {
  if (strict) {
    console.error('[rebuild-native-db] electron rebuild failed:', e.message);
    process.exit(1);
  }
  console.warn('[rebuild-native-db] electron rebuild failed (ok in CI without electron):', e.message);
  process.exit(0);
}

if (!electronSqlcipherLoads()) {
  try {
    tryFetchElectronPrebuild();
    runElectronRebuild(true);
  } catch (e) {
    if (strict) {
      console.error('[rebuild-native-db] recovery after fetch-sqlite-electron failed:', e.message);
      process.exit(1);
    }
    console.warn('[rebuild-native-db] recovery failed:', e.message);
    process.exit(0);
  }
}

if (!electronSqlcipherLoads()) {
  const msg =
    '[rebuild-native-db] SQLCipher still does not load under Electron. Run: node scripts/fetch-sqlite-electron.mjs && npm run rebuild:db-native';
  if (strict) {
    console.error(msg);
    process.exit(1);
  }
  console.warn(msg);
  process.exit(0);
}
