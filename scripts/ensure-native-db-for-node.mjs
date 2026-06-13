/**
 * Rebuild better-sqlite3-multiple-ciphers for the current Node ABI when needed.
 * postinstall targets Electron; npm test uses system Node — they cannot share one .node binary.
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = path.join(root, 'node_modules', 'better-sqlite3-multiple-ciphers');

const NATIVE_PROBE = [
  "const D = require('better-sqlite3-multiple-ciphers');",
  "const db = new D(':memory:');",
  'db.close();',
].join('');

/** Probe in a child process so a bad .node cannot SIGKILL this script mid-recovery. */
function nativeLoadError() {
  try {
    execSync(`node -e ${JSON.stringify(NATIVE_PROBE)}`, {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 15_000,
      env: process.env,
    });
    return null;
  } catch (e) {
    if (e.status === 137 || e.signal === 'SIGKILL') {
      return 'Native module load aborted (SIGKILL) — binary likely wrong ABI or corrupt';
    }
    const stderr = e.stderr ? String(e.stderr).trim() : '';
    return stderr || (e.message ? String(e.message) : String(e));
  }
}

const mismatch = nativeLoadError();
if (!mismatch) {
  process.exit(0);
}

console.log(
  `[ensure-native-db-for-node] Native DB module mismatch for Node ${process.version} (modules ${process.versions.modules}); rebuilding…`
);

/** Rosetta Node on Apple Silicon — compile paths need native arm64. */
function needsDarwinArm64Wrap() {
  return process.platform === 'darwin' && process.arch === 'x64';
}

function wrapDarwinArm64(cmd) {
  if (needsDarwinArm64Wrap()) {
    return `arch -arm64 ${cmd}`;
  }
  return cmd;
}

function runShell(cmd, opts = {}) {
  execSync(wrapDarwinArm64(cmd), {
    cwd: opts.cwd || root,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
    shell: true,
  });
}

function tryFetchNodePrebuild() {
  console.log('[ensure-native-db-for-node] Trying GitHub Node prebuild fetch…');
  runShell('node scripts/fetch-sqlite-node.mjs');
}

function tryPrebuildInstall() {
  console.log('[ensure-native-db-for-node] Trying prebuild-install…');
  runShell('npx --yes prebuild-install', { cwd: pkgDir });
}

function tryNpmRebuild() {
  console.log('[ensure-native-db-for-node] Trying npm rebuild (may compile from source)…');
  const rebuildCmd = needsDarwinArm64Wrap()
    ? 'arch -arm64 npm rebuild better-sqlite3-multiple-ciphers'
    : 'npm rebuild better-sqlite3-multiple-ciphers';
  runShell(rebuildCmd);
}

let lastError = null;
let fetchSucceeded = false;

try {
  tryFetchNodePrebuild();
  fetchSucceeded = true;
} catch (e) {
  lastError = e;
  const msg = e && e.message ? String(e.message) : String(e);
  console.warn('[ensure-native-db-for-node] tryFetchNodePrebuild failed:', msg);
}

if (!nativeLoadError()) {
  console.log('[ensure-native-db-for-node] OK for Node', process.version);
  process.exit(0);
}

// npm rebuild deletes build/ — never run it after a successful fetch left a binary on disk.
const destructiveSteps = fetchSucceeded ? [tryPrebuildInstall] : [tryPrebuildInstall, tryNpmRebuild];

for (const step of destructiveSteps) {
  try {
    step();
  } catch (e) {
    lastError = e;
    const msg = e && e.message ? String(e.message) : String(e);
    if (/libxcrun|need 'x86_64'|Rosetta/i.test(msg)) {
      console.warn(
        '[ensure-native-db-for-node] Compile failed (arch mismatch). ' +
          'Use a native arm64 Terminal (not Rosetta) or rely on prebuild fetch.'
      );
    } else {
      console.warn(`[ensure-native-db-for-node] ${step.name} failed:`, msg);
    }
  }
  if (!nativeLoadError()) break;
}

const after = nativeLoadError();
if (after) {
  console.error('[ensure-native-db-for-node] Still cannot load native module after rebuild:\n', after);
  if (lastError) {
    console.error('[ensure-native-db-for-node] Last error:', lastError.message || lastError);
  }
  process.exit(1);
}

console.log('[ensure-native-db-for-node] OK for Node', process.version);
