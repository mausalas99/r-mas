import { createRequire } from 'node:module';
import { appendAuditInTransaction } from './forensic-audit.mjs';
import { createDbAuthMethods } from './db-manager-auth.mjs';

const require = createRequire(import.meta.url);
const { createWriteQueue } = require('../write-queue.js');

/**
 * @param {{
 *   queue: ReturnType<typeof createWriteQueue>,
 *   getDb: () => import('better-sqlite3').Database | null,
 *   assertUnlocked: () => void,
 *   getClientId: () => string,
 * }} deps
 */
function createTransactionHelpers({ queue, getDb, assertUnlocked, getClientId }) {
  function withTransaction(fn) {
    assertUnlocked();
    const db = getDb();
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

  return { withTransaction, auditOnly };
}

/**
 * @param {{
 *   getState: () => 'locked' | 'unlocked',
 *   getDb: () => import('better-sqlite3').Database | null,
 *   ensureUnlocked: () => Promise<{ ok: boolean }>,
 * }} deps
 */
function createEnsureUnlockedShared({ getState, getDb, ensureUnlocked }) {
  let inFlightUnlock = null;
  return function ensureUnlockedShared() {
    if (getState() === 'unlocked' && getDb()) return Promise.resolve({ ok: true });
    if (!inFlightUnlock) {
      inFlightUnlock = Promise.resolve()
        .then(() => ensureUnlocked())
        .finally(() => { inFlightUnlock = null; });
    }
    return inFlightUnlock;
  };
}

/**
 * @param {{ userDataPath: string, safeStorage: object, getClientId: () => string }} opts
 */
export function createDbManager({ userDataPath, safeStorage, getClientId }) {
  const queue = createWriteQueue();
  /** @type {import('better-sqlite3').Database | null} */
  let db = null;
  /** @type {'locked' | 'unlocked'} */
  let state = 'locked';
  /** @type {string | null} SQLCipher key hex for the open session (main process only). */
  let activeKeyHex = null;

  const auth = createDbAuthMethods({
    userDataPath,
    safeStorage,
    getClientId,
    getDb: () => db,
    getState: () => state,
    setDb: (next) => {
      db = next;
    },
    setState: (next) => {
      state = next;
    },
    getActiveKeyHex: () => activeKeyHex,
    setActiveKeyHex: (hex) => {
      activeKeyHex = hex;
    },
    schedulePendingAudit: () => {},
  });

  function assertUnlocked() {
    if (state !== 'unlocked' || !db) {
      const err = new Error('Database locked');
      err.code = 'DB_LOCKED';
      throw err;
    }
  }

  const { withTransaction, auditOnly } = createTransactionHelpers({
    queue,
    getDb: () => db,
    assertUnlocked,
    getClientId,
  });

  async function changePassphrase(opts) {
    assertUnlocked();
    return queue.enqueue(() => auth.changePassphrase(opts));
  }

  const ensureUnlockedShared = createEnsureUnlockedShared({
    getState: () => state,
    getDb: () => db,
    ensureUnlocked: () => auth.ensureUnlocked(),
  });

  return {
    getState: () => state,
    isUnlocked: () => state === 'unlocked',
    unlockWithPassphrase: auth.unlockWithPassphrase,
    unlockWithRecoveryCode: auth.unlockWithRecoveryCode,
    changePassphrase,
    tryUnlockRemembered: auth.tryUnlockRemembered,
    ensureUnlocked: ensureUnlockedShared,
    unlockPlain: auth.unlockPlain,
    unlockWithKeyHex: auth.unlockWithKeyHex,
    lock: auth.lock,
    withTransaction,
    auditOnly,
    schedulePendingAudit: auth.schedulePendingAudit,
    getDb: () => (state === 'unlocked' ? db : null),
    isRateLimited: auth.isRateLimited,
    recordUnlockFail: auth.recordUnlockFail,
  };
}
