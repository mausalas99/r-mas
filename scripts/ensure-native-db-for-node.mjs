/**
 * Rebuild better-sqlite3-multiple-ciphers for the current Node ABI when needed.
 * postinstall targets Electron; npm test uses system Node — they cannot share one .node binary.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
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

try {
  execSync('npm rebuild better-sqlite3-multiple-ciphers', {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
} catch (e) {
  console.error('[ensure-native-db-for-node] npm rebuild failed:', e.message);
  process.exit(1);
}

const after = nativeLoadError();
if (after) {
  console.error('[ensure-native-db-for-node] Still cannot load native module after rebuild:\n', after);
  process.exit(1);
}

console.log('[ensure-native-db-for-node] OK for Node', process.version);
