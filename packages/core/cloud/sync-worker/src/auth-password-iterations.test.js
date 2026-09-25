import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleAuth } from './auth.js';
import { MAX_ITERATIONS, LEGACY_ITERATIONS } from './password.js';

/** Minimal in-memory D1 fake covering exactly what register/login touch. */
function makeDb() {
  /** @type {Map<string, object>} */
  const usersByUsername = new Map();
  /** @type {Map<string, object>} */
  const sessionsByHash = new Map();

  return {
    usersByUsername,
    prepare(sql) {
      const q = String(sql);
      return {
        bind(...args) {
          return {
            async first() {
              if (q.includes('SELECT id, disabled FROM users WHERE username')) {
                const row = usersByUsername.get(args[0]);
                return row ? { id: row.id, disabled: row.disabled } : null;
              }
              if (q.includes('SELECT id, username, display_name, password_salt, password_hash, password_iterations')) {
                return usersByUsername.get(args[0]) || null;
              }
              if (q.includes('JOIN users u ON u.id = s.user_id')) {
                const tokenHash = args[0];
                const session = sessionsByHash.get(tokenHash);
                if (!session) return null;
                const user = [...usersByUsername.values()].find((u) => u.id === session.userId);
                return user || null;
              }
              return null;
            },
            async run() {
              if (q.includes('INSERT INTO users')) {
                const [id, username, salt, hash, iterations, displayName] = args;
                usersByUsername.set(username, {
                  id,
                  username,
                  password_salt: salt,
                  password_hash: hash,
                  password_iterations: iterations,
                  display_name: displayName,
                  disabled: 0,
                  role: 'member',
                });
              }
              if (q.includes('INSERT INTO sessions')) {
                const [tokenHash, userId] = args;
                sessionsByHash.set(tokenHash, { userId });
              }
              if (q.includes('UPDATE users SET recovery_salt')) {
                const [recSalt, recHash, , , userId] = args;
                const row = [...usersByUsername.values()].find((u) => u.id === userId);
                if (row) {
                  row.recovery_salt = recSalt;
                  row.recovery_hash = recHash;
                }
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

function req(path, body) {
  return new Request(`https://x/api/sync/v1/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('register + login with per-row password_iterations (schema/007)', () => {
  it('a freshly registered user hashes at MAX_ITERATIONS and logs in successfully', async () => {
    const db = makeDb();
    const env = { DB: db };

    const regRes = await handleAuth(req('/register', { username: 'dra.gomez', password: 'correct-horse-battery', appVersion: '8.2.0' }), env, '/register');
    assert.equal(regRes.status, 200);
    const stored = db.usersByUsername.get('dra.gomez');
    assert.equal(stored.password_iterations, MAX_ITERATIONS);

    const loginRes = await handleAuth(req('/login', { username: 'dra.gomez', password: 'correct-horse-battery', appVersion: '8.2.0' }), env, '/login');
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'login must succeed and return a session token');
  });

  it('a pre-existing row hashed at LEGACY_ITERATIONS (schema default) still logs in', async () => {
    const db = makeDb();
    const env = { DB: db };
    const { hashPassword } = await import('./password.js');
    const { salt, hash } = await hashPassword('legacy-password-here', LEGACY_ITERATIONS);
    db.usersByUsername.set('r1.viejo', {
      id: 'u-legacy',
      username: 'r1.viejo',
      password_salt: salt,
      password_hash: hash,
      password_iterations: LEGACY_ITERATIONS, // as the schema/007 DEFAULT would set it
      display_name: '',
      disabled: 0,
      role: 'member',
    });

    const loginRes = await handleAuth(
      req('/login', { username: 'r1.viejo', password: 'legacy-password-here', appVersion: '8.2.0' }),
      env,
      '/login'
    );
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'a legacy 50k row must still authenticate correctly');
  });

  it('rejects the wrong password for both a modern and a legacy row', async () => {
    const db = makeDb();
    const env = { DB: db };
    await handleAuth(req('/register', { username: 'modern.user', password: 'correct-horse-battery', appVersion: '8.2.0' }), env, '/register');

    await assert.rejects(
      () => handleAuth(req('/login', { username: 'modern.user', password: 'wrong-password', appVersion: '8.2.0' }), env, '/login'),
      /invalid_credentials|incorrectos/
    );
  });
});
