import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadNativeDatabase } from './native-load.mjs';
import { applyMigrations } from './schema.mjs';

/**
 * Open a temp-file SQLCipher database for tests.
 * @param {string} keyHex 64-char hex SQLCipher key
 * @param {{ after?: (registerCleanup: (fn: () => void) => void) => void }} [opts]
 */
export function openTestDb(keyHex, opts = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-db-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const Database = loadNativeDatabase();
  const db = new Database(dbPath);
  db.pragma(`key = "x'${keyHex}'"`);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applyMigrations(db);

  const cleanups = [];
  const registerCleanup = (fn) => {
    cleanups.push(fn);
  };
  if (opts.after) opts.after(registerCleanup);

  function close() {
    for (let i = cleanups.length - 1; i >= 0; i -= 1) {
      cleanups[i]();
    }
    if (db.open) db.close();
    try {
      fs.unlinkSync(dbPath);
    } catch {
      /* ignore */
    }
    try {
      fs.rmdirSync(tmpDir);
    } catch {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  return { db, dbPath, tmpDir, close };
}
