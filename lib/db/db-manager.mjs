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
  fs.writeFileSync(clinicalUnlockMetaPath(userDataPath), JSON.stringify(data));
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
    applyMigrations(conn);
    assertCipherReadable(conn);
    db = conn;
    state = 'unlocked';
  }

  async function unlockWithPassphrase(passphrase, { remember } = {}) {
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

    const bootstrap = readUnlockMeta(userDataPath);
    let saltBuf = null;

    if (bootstrap.kdf_salt) {
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
      await unlockWithKeyHex(keyHex);
    } catch (e) {
      recordUnlockFail();
      const err = new Error('Invalid passphrase');
      err.code = 'DB_UNLOCK_FAILED';
      err.cause = e;
      throw err;
    }

    const saltB64 = saltBuf.toString('base64');
    const nextBootstrap = { ...bootstrap, kdf_salt: saltB64 };

    let rememberPersisted = false;
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
