import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sha256Hex, stampAppVersionFromRequest } from './session.js';

/** Minimal in-memory D1 fake covering exactly what stampAppVersionFromRequest touches. */
function makeDb() {
  /** @type {Map<string, { userId: string, expiresAt: string }>} */
  const sessionsByHash = new Map();
  /** @type {Map<string, { app_version: string|null, app_version_at: string|null }>} */
  const usersById = new Map();
  let updateCalls = 0;

  return {
    sessionsByHash,
    usersById,
    updateCalls: () => updateCalls,
    prepare(sql) {
      const q = String(sql);
      return {
        bind(...args) {
          return {
            async run() {
              if (q.includes('UPDATE users SET app_version')) {
                updateCalls += 1;
                const [version, now, tokenHash, nowCheck] = args;
                const session = sessionsByHash.get(tokenHash);
                if (!session || session.expiresAt <= nowCheck) return;
                const user = usersById.get(session.userId);
                if (user) {
                  user.app_version = version;
                  user.app_version_at = now;
                }
                return;
              }
              throw new Error(`unexpected query: ${q}`);
            },
          };
        },
      };
    },
  };
}

function req(headers) {
  return new Request('https://x/api/sync/v1/rooms', { headers });
}

describe('stampAppVersionFromRequest', () => {
  it('stamps app_version for a valid session when X-App-Version is present', async () => {
    const db = makeDb();
    const token = 'a'.repeat(64);
    const tokenHash = await sha256Hex(token);
    db.sessionsByHash.set(tokenHash, { userId: 'u1', expiresAt: '2999-01-01T00:00:00.000Z' });
    db.usersById.set('u1', { app_version: null, app_version_at: null });

    await stampAppVersionFromRequest(db, req({ Authorization: `Bearer ${token}`, 'X-App-Version': '8.2.0' }));

    assert.equal(db.usersById.get('u1').app_version, '8.2.0');
    assert.ok(db.usersById.get('u1').app_version_at);
  });

  it('does nothing when X-App-Version is missing (old client)', async () => {
    const db = makeDb();
    const token = 'b'.repeat(64);
    const tokenHash = await sha256Hex(token);
    db.sessionsByHash.set(tokenHash, { userId: 'u1', expiresAt: '2999-01-01T00:00:00.000Z' });
    db.usersById.set('u1', { app_version: null, app_version_at: null });

    await stampAppVersionFromRequest(db, req({ Authorization: `Bearer ${token}` }));

    assert.equal(db.updateCalls(), 0);
  });

  it('does nothing when there is no Authorization header', async () => {
    const db = makeDb();
    await stampAppVersionFromRequest(db, req({ 'X-App-Version': '8.2.0' }));
    assert.equal(db.updateCalls(), 0);
  });

  it('never throws, even if the DB write fails', async () => {
    const db = {
      prepare() {
        throw new Error('db down');
      },
    };
    await assert.doesNotReject(() =>
      stampAppVersionFromRequest(db, req({ Authorization: 'Bearer x', 'X-App-Version': '8.2.0' }))
    );
  });
});
