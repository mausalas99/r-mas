import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  execSync('npx @electron/rebuild -f -w better-sqlite3-multiple-ciphers', {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
} catch (e) {
  console.warn('[rebuild-native-db] electron rebuild failed (ok in CI without electron):', e.message);
  process.exit(0);
}
