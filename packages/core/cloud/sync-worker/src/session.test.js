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
                const [version, now, tokenHash, nowCheck, versionCheck, staleBefore] = args;
                const session = sessionsByHash.get(tokenHash);
                if (!session || session.expiresAt <= nowCheck) return { meta: { changes: 0 } };
                const user = usersById.get(session.userId);
                if (!user) return { meta: { changes: 0 } };
                // mirrors the SQL guard: version differs (NULL-safe) OR stamp missing/older than the cutoff
                const due =
                  user.app_version !== versionCheck ||
                  user.app_version_at == null ||
                  user.app_version_at < staleBefore;
                if (!due) return { meta: { changes: 0 } };
                user.app_version = version;
                user.app_version_at = now;
                return { meta: { changes: 1 } };
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

  it('skips the write inside the hour, rewrites on a new version or after the hour', async () => {
    const db = makeDb();
    const token = 'c'.repeat(64);
    db.sessionsByHash.set(await sha256Hex(token), { userId: 'u1', expiresAt: '2999-01-01T00:00:00.000Z' });
    db.usersById.set('u1', { app_version: null, app_version_at: null });
    const r = (v) => req({ Authorization: `Bearer ${token}`, 'X-App-Version': v });
    const user = db.usersById.get('u1');

    await stampAppVersionFromRequest(db, r('8.2.0'));
    assert.equal(user.app_version, '8.2.0');
    const firstAt = user.app_version_at;

    await stampAppVersionFromRequest(db, r('8.2.0')); // same version, inside the hour
    assert.equal(user.app_version_at, firstAt);

    await stampAppVersionFromRequest(db, r('8.3.0')); // new version
    assert.equal(user.app_version, '8.3.0');

    user.app_version_at = new Date(Date.now() - 61 * 60 * 1000).toISOString(); // stamp over an hour old
    const oldAt = user.app_version_at;
    await stampAppVersionFromRequest(db, r('8.3.0'));
    assert.notEqual(user.app_version_at, oldAt);
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
