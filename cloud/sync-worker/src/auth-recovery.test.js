import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import { hashPassword } from './password.js';
import { generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } from './recovery-code.js';
import { createSession } from './session.js';
import {
  mintRecoveryForUser,
  userNeedsRecoveryMint,
  handleRecover,
  handleRegenerateRecovery,
} from './auth-recovery.js';

/** @typedef {{ id: string, username: string, display_name?: string, password_salt?: string, password_hash?: string, recovery_salt?: string, recovery_hash?: string, recovery_updated_at?: string, disabled?: number, updated_at?: string }} FakeUser */
/** @typedef {{ token_hash: string, user_id: string, created_at: string, expires_at: string }} FakeSession */

/**
 * @param {FakeUser[]} users
 * @param {FakeSession[]} [sessions]
 */
function createFakeDb(users, sessions = []) {
  return {
    prepare(sql) {
      const s = String(sql).replace(/\s+/g, ' ').trim();
      return {
        bind(...args) {
          return {
            async first() {
              if (s.includes('FROM users') && s.includes('username = ?')) {
                const username = String(args[0]).toLowerCase();
                return users.find((u) => u.username.toLowerCase() === username) ?? null;
              }
              if (s.includes('FROM sessions s') && s.includes('token_hash = ?')) {
                const tokenHash = args[0];
                const now = args[1];
                const row = sessions.find(
                  (sess) => sess.token_hash === tokenHash && sess.expires_at > now
                );
                if (!row) return null;
                const user = users.find((u) => u.id === row.user_id);
                if (!user) return null;
                return {
                  id: user.id,
                  username: user.username,
                  display_name: user.display_name ?? '',
                  role: 'member',
                  disabled: user.disabled ?? 0,
                };
              }
              return null;
            },
            async run() {
              if (s.startsWith('UPDATE users SET recovery_salt')) {
                const [salt, hash, recoveryUpdatedAt, updatedAt, userId] = args;
                const user = users.find((u) => u.id === userId);
                if (!user) return { meta: { changes: 0 } };
                user.recovery_salt = salt;
                user.recovery_hash = hash;
                user.recovery_updated_at = recoveryUpdatedAt;
                user.updated_at = updatedAt;
                return { meta: { changes: 1 } };
              }
              if (s.startsWith('UPDATE users SET password_salt')) {
                const [salt, hash, updatedAt, userId] = args;
                const user = users.find((u) => u.id === userId);
                if (!user) return { meta: { changes: 0 } };
                user.password_salt = salt;
                user.password_hash = hash;
                user.updated_at = updatedAt;
                return { meta: { changes: 1 } };
              }
              if (s.startsWith('DELETE FROM sessions WHERE user_id')) {
                const userId = args[0];
                const before = sessions.length;
                for (let i = sessions.length - 1; i >= 0; i--) {
                  if (sessions[i].user_id === userId) sessions.splice(i, 1);
                }
                return { meta: { changes: before - sessions.length } };
              }
              if (s.startsWith('INSERT INTO sessions')) {
                const [tokenHash, userId, createdAt, expiresAt] = args;
                sessions.push({
                  token_hash: tokenHash,
                  user_id: userId,
                  created_at: createdAt,
                  expires_at: expiresAt,
                });
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            },
            async all() {
              return { results: [] };
            },
          };
        },
      };
    },
    async batch(stmts) {
      for (const st of stmts) await st;
    },
  };
}

/** @param {FakeUser[]} users */
async function seedUser(users, { username = 'demo', password = 'old-password-1', recoveryCode } = {}) {
  const id = crypto.randomUUID();
  const { salt, hash } = await hashPassword(password);
  const user = {
    id,
    username,
    display_name: 'Demo User',
    password_salt: salt,
    password_hash: hash,
    disabled: 0,
    updated_at: new Date().toISOString(),
  };
  if (recoveryCode) {
    const rec = await hashRecoveryCode(recoveryCode);
    user.recovery_salt = rec.salt;
    user.recovery_hash = rec.hash;
    user.recovery_updated_at = new Date().toISOString();
  }
  users.push(user);
  return { user, recoveryCode };
}

function jsonRequest(body, headers = {}) {
  return new Request('https://sync.test/api/sync/v1/auth/recover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('userNeedsRecoveryMint', () => {
  it('is true when recovery_hash missing', () => {
    assert.equal(userNeedsRecoveryMint({}), true);
    assert.equal(userNeedsRecoveryMint({ recovery_hash: null }), true);
    assert.equal(userNeedsRecoveryMint({ recovery_hash: 'abc' }), false);
  });
});

describe('mintRecoveryForUser', () => {
  it('persists hash and verifies the minted code', async () => {
    const users = [];
    const { user } = await seedUser(users);
    const db = createFakeDb(users);

    const code = await mintRecoveryForUser(db, user.id);
    assert.match(code, /^R\+[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.ok(user.recovery_hash);
    assert.equal(
      await verifyRecoveryCode(code, user.recovery_salt, user.recovery_hash),
      true
    );
  });

  it('rotate invalidates the previous code', async () => {
    const users = [];
    const oldCode = generateRecoveryCode();
    const { user } = await seedUser(users, { recoveryCode: oldCode });
    const db = createFakeDb(users);

    const newCode = await mintRecoveryForUser(db, user.id);
    assert.notEqual(newCode, oldCode);
    assert.equal(
      await verifyRecoveryCode(oldCode, user.recovery_salt, user.recovery_hash),
      false
    );
    assert.equal(
      await verifyRecoveryCode(newCode, user.recovery_salt, user.recovery_hash),
      true
    );
  });
});

describe('handleRecover', () => {
  /** @type {FakeUser[]} */
  let users;
  /** @type {FakeSession[]} */
  let sessions;

  beforeEach(() => {
    users = [];
    sessions = [];
  });

  it('returns new session and rotates recovery code on success', async () => {
    const recoveryCode = generateRecoveryCode();
    const { user } = await seedUser(users, { recoveryCode });
    const db = createFakeDb(users, sessions);
    const oldSession = await createSession(db, user.id);
    assert.equal(sessions.length, 1);

    const res = await handleRecover(
      db,
      jsonRequest({
        username: user.username,
        recoveryCode,
        newPassword: 'new-password-9',
      }),
      '10.0.0.1'
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.ok(body.token);
    assert.ok(body.expiresAt);
    assert.deepEqual(body.user, {
      id: user.id,
      username: user.username,
      displayName: 'Demo User',
    });
    assert.match(body.recoveryCode, /^R\+/);
    assert.notEqual(body.recoveryCode, recoveryCode);
    assert.equal(sessions.length, 1);
    assert.notEqual(sessions[0].token_hash, oldSession.token);
    assert.equal(
      await verifyRecoveryCode(recoveryCode, user.recovery_salt, user.recovery_hash),
      false
    );
    assert.equal(
      await verifyRecoveryCode(body.recoveryCode, user.recovery_salt, user.recovery_hash),
      true
    );
  });

  it('rejects bad recovery code with invalid_credentials', async () => {
    const recoveryCode = generateRecoveryCode();
    const { user } = await seedUser(users, { recoveryCode });
    const db = createFakeDb(users, sessions);

    await assert.rejects(
      () =>
        handleRecover(
          db,
          jsonRequest({
            username: user.username,
            recoveryCode: generateRecoveryCode(),
            newPassword: 'new-password-9',
          }),
          '10.0.0.2'
        ),
      (err) => {
        assert.ok(err instanceof SyncError);
        assert.equal(err.code, 'invalid_credentials');
        assert.match(err.message, /incorrecto/i);
        return true;
      }
    );
  });
});

describe('handleRegenerateRecovery', () => {
  it('requires auth', async () => {
    const users = [];
    const db = createFakeDb(users);
    await assert.rejects(
      () => handleRegenerateRecovery(db, new Request('https://sync.test/')),
      (err) => {
        assert.ok(err instanceof SyncError);
        assert.equal(err.code, 'auth_required');
        return true;
      }
    );
  });

  it('mints a new code for authenticated user', async () => {
    const users = [];
    const oldCode = generateRecoveryCode();
    const { user } = await seedUser(users, { recoveryCode: oldCode });
    const db = createFakeDb(users, []);
    const session = await createSession(db, user.id);

    const res = await handleRegenerateRecovery(
      db,
      new Request('https://sync.test/', {
        headers: { Authorization: `Bearer ${session.token}` },
      })
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.match(body.recoveryCode, /^R\+/);
    assert.notEqual(body.recoveryCode, oldCode);
    assert.equal(
      await verifyRecoveryCode(oldCode, user.recovery_salt, user.recovery_hash),
      false
    );
  });
});
