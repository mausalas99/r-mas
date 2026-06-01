import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { applyMigrations } from './schema.mjs';
import { appendAuditInTransaction } from './forensic-audit.mjs';
import { clinicalDbPath, clinicalUnlockMetaPath } from './db-path.mjs';
import { loadNativeDatabase } from './native-load.mjs';
import {
  ARGON2_OPTS,
  deriveSqlcipherKeyHex,
  newSalt,
  unwrapDek,
  wrapDek,
} from './crypto.mjs';

const require = createRequire(import.meta.url);
const { createWriteQueue } = require('../../lan-squad/write-queue.js');

const MAX_UNLOCK_FAILS = 5;
const UNLOCK_FAIL_WINDOW_MS = 15 * 60 * 1000;

function readUnlockMeta(userDataPath) {
  const filePath = clinicalUnlockMetaPath(userDataPath);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeUnlockMeta(userDataPath, data) {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(clinicalUnlockMetaPath(userDataPath), JSON.stringify(serializeUnlockMeta(data)));
}

function removeClinicalDbFiles(userDataPath) {
  const base = clinicalDbPath(userDataPath);
  for (const suffix of ['', '-wal', '-shm']) {
    const filePath = suffix ? base + suffix : base;
    if (!fs.existsSync(filePath)) continue;
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* file may be locked */
    }
  }
}

function removeUnlockMetaFile(userDataPath) {
  const filePath = clinicalUnlockMetaPath(userDataPath);
  if (!fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

function serializeUnlockMeta(data) {
  const safe = { ...data };
  if (safe.wrapped_dek != null && typeof safe.wrapped_dek !== 'string') {
    if (Buffer.isBuffer(safe.wrapped_dek)) {
      safe.wrapped_dek = safe.wrapped_dek.toString('base64');
    } else {
      safe.wrapped_dek = String(safe.wrapped_dek);
    }
  }
  return safe;
}

function setAppMeta(db, key, value) {
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

function getAppMeta(db, key) {
  const row = db.prepare('SELECT value FROM app_meta WHERE key = ?').get(key);
  return row?.value ?? null;
}

function assertCipherReadable(db) {
  db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
}

/**
 * @param {{ userDataPath: string, safeStorage: object, getClientId: () => string }} opts
 */
export function createDbManager({ userDataPath, safeStorage, getClientId }) {
  const queue = createWriteQueue();
  let db = null;
  /** @type {'locked' | 'unlocked'} */
  let state = 'locked';
  /** @type {string | null} SQLCipher key hex for the open session (main process only). */
  let activeKeyHex = null;
  let unlockFailTimestamps = [];
  let pendingUnlockFailCount = 0;
  /** @type {{ eventType: string, meta: Record<string, unknown> }[]} */
  const pendingAudits = [];

  function assertUnlocked() {
    if (state !== 'unlocked' || !db) {
      const err = new Error('Database locked');
      err.code = 'DB_LOCKED';
      throw err;
    }
  }

  function isRateLimited() {
    const now = Date.now();
    unlockFailTimestamps = unlockFailTimestamps.filter((t) => now - t < UNLOCK_FAIL_WINDOW_MS);
    return unlockFailTimestamps.length >= MAX_UNLOCK_FAILS;
  }

  function recordUnlockFail() {
    unlockFailTimestamps.push(Date.now());
    pendingUnlockFailCount += 1;
  }

  function clearUnlockFails() {
    unlockFailTimestamps = [];
  }

  function flushPendingAuditsInTransaction(conn, clientId) {
    for (let i = 0; i < pendingUnlockFailCount; i += 1) {
      appendAuditInTransaction(conn, {
        clientId,
        eventType: 'auth.unlock.fail',
        meta: {},
      });
    }
    pendingUnlockFailCount = 0;
    for (const item of pendingAudits) {
      appendAuditInTransaction(conn, {
        clientId,
        eventType: item.eventType,
        meta: item.meta,
      });
    }
    pendingAudits.length = 0;
  }

  function schedulePendingAudit(eventType, meta = {}) {
    pendingAudits.push({ eventType, meta });
  }

  async function unlockWithKeyHex(keyHex) {
    if (state === 'unlocked') lock();
    const Database = loadNativeDatabase();
    fs.mkdirSync(userDataPath, { recursive: true });
    const filePath = clinicalDbPath(userDataPath);
    const conn = new Database(filePath);
    conn.pragma(`key = "x'${keyHex}'"`);
    conn.pragma('journal_mode = WAL');
    conn.pragma('foreign_keys = ON');
    try {
      applyMigrations(conn);
    } catch (migErr) {
      try {
        conn.close();
      } catch {
        /* ignore */
      }
      const err = new Error('Schema migration failed');
      err.code = 'DB_SCHEMA_MIGRATION_FAILED';
      err.cause = migErr;
      throw err;
    }
    assertCipherReadable(conn);
    db = conn;
    state = 'unlocked';
    activeKeyHex = keyHex;
  }

  function keyHexMatchesSession(candidateHex) {
    if (!activeKeyHex || !candidateHex) return false;
    const a = Buffer.from(activeKeyHex, 'utf8');
    const b = Buffer.from(candidateHex, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  async function unlockWithPassphrase(passphrase, { remember, setup } = {}) {
    try {
      loadNativeDatabase();
    } catch (nativeErr) {
      throw nativeErr;
    }
    if (isRateLimited()) {
      const err = new Error('Too many unlock attempts');
      err.code = 'AUTH_RATE_LIMITED';
      throw err;
    }
    if (!passphrase) {
      recordUnlockFail();
      const err = new Error('Passphrase required');
      err.code = 'DB_UNLOCK_FAILED';
      throw err;
    }

    let bootstrap = readUnlockMeta(userDataPath);
    let saltBuf = null;

    if (setup) {
      lock();
      saltBuf = newSalt();
      removeClinicalDbFiles(userDataPath);
      removeUnlockMetaFile(userDataPath);
      bootstrap = {};
      if (fs.existsSync(clinicalDbPath(userDataPath))) {
        recordUnlockFail();
        const err = new Error('Could not reset prior encrypted database files');
        err.code = 'DB_SETUP_RESET_FAILED';
        throw err;
      }
    } else if (bootstrap.kdf_salt) {
      saltBuf = Buffer.from(bootstrap.kdf_salt, 'base64');
    } else if (fs.existsSync(clinicalDbPath(userDataPath))) {
      recordUnlockFail();
      const err = new Error('Missing KDF salt metadata');
      err.code = 'DB_UNLOCK_METADATA_MISSING';
      throw err;
    } else {
      saltBuf = newSalt();
    }

    let keyHex;
    try {
      keyHex = await deriveSqlcipherKeyHex(passphrase, saltBuf);
    } catch (deriveErr) {
      recordUnlockFail();
      const err = new Error(setup ? 'Encrypted database setup failed' : 'Invalid passphrase');
      err.code = setup ? 'DB_SETUP_FAILED' : 'DB_UNLOCK_FAILED';
      err.cause = deriveErr;
      throw err;
    }

    try {
      await unlockWithKeyHex(keyHex);
    } catch (openErr) {
      if (
        openErr?.code === 'DB_NATIVE_ABI_MISMATCH' ||
        openErr?.code === 'DB_SCHEMA_MIGRATION_FAILED'
      ) {
        throw openErr;
      }
      const openDetail = String(openErr?.cause?.message || openErr?.message || '');
      if (/NODE_MODULE_VERSION|was compiled against a different/i.test(openDetail)) {
        const err = new Error(openErr.message || 'Native database module failed to load');
        err.code = 'DB_NATIVE_ABI_MISMATCH';
        err.cause = openErr;
        throw err;
      }
      if (setup) {
        removeClinicalDbFiles(userDataPath);
        try {
          await unlockWithKeyHex(keyHex);
        } catch (retryErr) {
          recordUnlockFail();
          const err = new Error('Encrypted database setup failed');
          err.code = 'DB_SETUP_FAILED';
          err.cause = retryErr;
          throw err;
        }
      } else {
        recordUnlockFail();
        const err = new Error('Invalid passphrase');
        err.code = 'DB_UNLOCK_FAILED';
        err.cause = openErr;
        throw err;
      }
    }

    const saltB64 = saltBuf.toString('base64');
    const nextBootstrap = { ...bootstrap, kdf_salt: saltB64 };

    let rememberPersisted = false;
    try {
      db.transaction(() => {
        flushPendingAuditsInTransaction(db, getClientId());
        setAppMeta(db, 'kdf_salt', saltB64);
        setAppMeta(db, 'kdf_params_json', JSON.stringify(ARGON2_OPTS));
        if (remember) {
          const wrapped = wrapDek(keyHex, safeStorage);
          if (wrapped) {
            setAppMeta(db, 'wrapped_dek', wrapped);
            nextBootstrap.wrapped_dek = wrapped;
            rememberPersisted = true;
          }
        } else {
          db.prepare("DELETE FROM app_meta WHERE key = 'wrapped_dek'").run();
          delete nextBootstrap.wrapped_dek;
        }
        appendAuditInTransaction(db, {
          clientId: getClientId(),
          eventType: 'auth.unlock.success',
          meta: {},
        });
        if (rememberPersisted) {
          appendAuditInTransaction(db, {
            clientId: getClientId(),
            eventType: 'auth.remember_enabled',
            meta: {},
          });
        }
      })();
    } catch (metaErr) {
      lock();
      const err = new Error('Encrypted database setup failed');
      err.code = setup ? 'DB_SETUP_FAILED' : 'DB_ERROR';
      err.cause = metaErr;
      throw err;
    }

    writeUnlockMeta(userDataPath, nextBootstrap);
    clearUnlockFails();
    return true;
  }

  async function tryUnlockRemembered() {
    if (isRateLimited()) return false;
    const bootstrap = readUnlockMeta(userDataPath);
    let wrapped = bootstrap.wrapped_dek ?? null;
    if (!wrapped && db) {
      wrapped = getAppMeta(db, 'wrapped_dek');
    }
    const dek = unwrapDek(wrapped, safeStorage);
    if (!dek) return false;
    try {
      await unlockWithKeyHex(dek);
      clearUnlockFails();
      return true;
    } catch {
      return false;
    }
  }

  function lock() {
    if (db && state === 'unlocked') {
      try {
        db.transaction(() => {
          appendAuditInTransaction(db, {
            clientId: getClientId(),
            eventType: 'auth.lock',
            meta: {},
          });
        })();
      } catch {
        /* locked db may be unusable */
      }
      db.close();
    }
    db = null;
    state = 'locked';
    activeKeyHex = null;
  }

  async function changePassphrase({ currentPassphrase, newPassphrase, remember } = {}) {
    assertUnlocked();
    if (!currentPassphrase || !newPassphrase) {
      const err = new Error('Passphrase required');
      err.code = 'DB_PASSPHRASE_INVALID';
      throw err;
    }
    if (String(newPassphrase).length < 8) {
      const err = new Error('New passphrase must be at least 8 characters');
      err.code = 'DB_PASSPHRASE_TOO_SHORT';
      throw err;
    }

    const bootstrap = readUnlockMeta(userDataPath);
    if (!bootstrap.kdf_salt) {
      const err = new Error('Missing KDF salt metadata');
      err.code = 'DB_UNLOCK_METADATA_MISSING';
      throw err;
    }

    const saltBuf = Buffer.from(bootstrap.kdf_salt, 'base64');
    const currentKeyHex = await deriveSqlcipherKeyHex(currentPassphrase, saltBuf);
    if (!keyHexMatchesSession(currentKeyHex)) {
      const err = new Error('Current passphrase incorrect');
      err.code = 'DB_PASSPHRASE_MISMATCH';
      throw err;
    }

    const newSaltBuf = newSalt();
    const newKeyHex = await deriveSqlcipherKeyHex(newPassphrase, newSaltBuf);
    const saltB64 = newSaltBuf.toString('base64');

    return queue.enqueue(() => {
      db.pragma('journal_mode = DELETE');
      db.pragma(`rekey = "x'${newKeyHex}'"`);
      db.pragma('journal_mode = WAL');
      const nextBootstrap = { ...bootstrap, kdf_salt: saltB64 };
      let rememberPersisted = false;
      db.transaction(() => {
        setAppMeta(db, 'kdf_salt', saltB64);
        setAppMeta(db, 'kdf_params_json', JSON.stringify(ARGON2_OPTS));
        if (remember) {
          const wrapped = wrapDek(newKeyHex, safeStorage);
          if (wrapped) {
            setAppMeta(db, 'wrapped_dek', wrapped);
            nextBootstrap.wrapped_dek = wrapped;
            rememberPersisted = true;
          }
        } else {
          db.prepare("DELETE FROM app_meta WHERE key = 'wrapped_dek'").run();
          delete nextBootstrap.wrapped_dek;
        }
        appendAuditInTransaction(db, {
          clientId: getClientId(),
          eventType: 'auth.passphrase.change',
          meta: { rememberPersisted },
        });
      })();
      writeUnlockMeta(userDataPath, nextBootstrap);
      activeKeyHex = newKeyHex;
      return true;
    });
  }

  function withTransaction(fn) {
    assertUnlocked();
    return queue.enqueue(() =>
      db.transaction(() =>
        fn(db, {
          audit(clientId, eventType, meta) {
            appendAuditInTransaction(db, {
              clientId: clientId ?? getClientId(),
              eventType,
              meta,
            });
          },
        })
      )()
    );
  }

  async function auditOnly(eventType, meta = {}, clientId = getClientId()) {
    return withTransaction((_conn, { audit }) => {
      audit(clientId, eventType, meta);
    });
  }

  return {
    getState: () => state,
    isUnlocked: () => state === 'unlocked',
    unlockWithPassphrase,
    changePassphrase,
    tryUnlockRemembered,
    unlockWithKeyHex,
    lock,
    withTransaction,
    auditOnly,
    schedulePendingAudit,
    getDb: () => (state === 'unlocked' ? db : null),
    isRateLimited,
    recordUnlockFail,
  };
}
