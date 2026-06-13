import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const probeScript = path.join(root, 'scripts', 'electron-sqlcipher-probe.cjs');

function electronSqlcipherLoads() {
  try {
    execSync(`npx electron "${probeScript}"`, {
      cwd: root,
      stdio: 'pipe',
      timeout: 45_000,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });
    return true;
  } catch {
    return false;
  }
}

// -f when forced, or when the on-disk .node does not load under Electron (e.g. after npm test's pretest).
const force =
  process.env.R_PLUS_FORCE_NATIVE_REBUILD === '1' || !electronSqlcipherLoads() ? ' -f' : '';
try {
  execSync(`npx @electron/rebuild${force} -w better-sqlite3-multiple-ciphers`, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
} catch (e) {
  console.warn('[rebuild-native-db] electron rebuild failed (ok in CI without electron):', e.message);
  process.exit(0);
}
