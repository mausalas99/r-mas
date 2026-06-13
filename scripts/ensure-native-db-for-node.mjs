/**
 * Rebuild better-sqlite3-multiple-ciphers for the current Node ABI when needed.
 * postinstall targets Electron; npm test uses system Node — they cannot share one .node binary.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = path.join(root, 'node_modules', 'better-sqlite3-multiple-ciphers');
const require = createRequire(import.meta.url);

function nativeLoadError() {
  try {
    const Database = require('better-sqlite3-multiple-ciphers');
    const db = new Database(':memory:');
    db.close();
    return null;
  } catch (e) {
    return e && e.message ? String(e.message) : String(e);
  }
}

const mismatch = nativeLoadError();
if (!mismatch) {
  process.exit(0);
}

console.log(
  `[ensure-native-db-for-node] Native DB module mismatch for Node ${process.version} (modules ${process.versions.modules}); rebuilding…`
);

function darwinArm64Env(extra = {}) {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    return { ...process.env, ...extra };
  }
  return {
    ...process.env,
    npm_config_arch: 'arm64',
    npm_config_target_arch: 'arm64',
    ...extra,
  };
}

/** Force native arm64 on Apple Silicon — npm under Rosetta breaks xcrun/libtool. */
function wrapDarwinArm64(cmd) {
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    return `arch -arm64 ${cmd}`;
  }
  return cmd;
}

function runShell(cmd, opts = {}) {
  execSync(wrapDarwinArm64(cmd), {
    cwd: opts.cwd || root,
    stdio: 'inherit',
    env: darwinArm64Env(opts.env),
    shell: true,
  });
}

function tryPrebuildInstall() {
  console.log('[ensure-native-db-for-node] Trying prebuild-install…');
  runShell('npx prebuild-install', { cwd: pkgDir });
}

function tryFetchNodePrebuild() {
  console.log('[ensure-native-db-for-node] Trying GitHub Node prebuild fetch…');
  runShell('node scripts/fetch-sqlite-node.mjs');
}

function tryNpmRebuild() {
  console.log('[ensure-native-db-for-node] Trying npm rebuild (may compile from source)…');
  runShell('npm rebuild better-sqlite3-multiple-ciphers');
}

const steps = [tryPrebuildInstall, tryFetchNodePrebuild, tryNpmRebuild];
let lastError = null;

for (const step of steps) {
  if (!nativeLoadError()) break;
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
