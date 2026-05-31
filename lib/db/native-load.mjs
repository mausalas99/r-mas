import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function loadNativeDatabase() {
  try {
    return require('better-sqlite3-multiple-ciphers');
  } catch (e) {
    const err = new Error('Native database module failed to load');
    err.code = 'DB_NATIVE_ABI_MISMATCH';
    err.cause = e;
    throw err;
  }
}
