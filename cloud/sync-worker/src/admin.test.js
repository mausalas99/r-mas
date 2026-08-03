import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import { assertAdmin, buildDeleteUserStatements, timingSafeEqual } from './admin.js';

/** Minimal D1 stub that records SQL for delete-user cascade planning. */
function fakeDbForDeleteUser({ ownedRoomIds = [], successorsByRoom = {} } = {}) {
  /** @type {string[]} */
  const sqlLog = [];
  return {
    sqlLog,
    prepare(sql) {
      const s = String(sql);
      sqlLog.push(s);
      return {
        bind(...args) {
          return {
            async all() {
              if (s.includes('FROM rooms WHERE owner_user_id')) {
                return { results: ownedRoomIds.map((id) => ({ id })) };
              }
              return { results: [] };
            },
            async first() {
              if (s.includes('FROM room_members') && s.includes('user_id !=')) {
                const roomId = String(args[0]);
                const uid = successorsByRoom[roomId];
                return uid ? { user_id: uid } : null;
              }
              return null;
            },
            async run() {
              return { success: true };
            },
          };
        },
      };
    },
  };
}

describe('timingSafeEqual', () => {
  it('matches equal strings', () => {
    assert.equal(timingSafeEqual('abc', 'abc'), true);
    assert.equal(timingSafeEqual('', ''), true);
  });

  it('rejects different strings and lengths', () => {
    assert.equal(timingSafeEqual('abc', 'abd'), false);
    assert.equal(timingSafeEqual('abc', 'ab'), false);
    assert.equal(timingSafeEqual('abc', 'abcd'), false);
  });

  it('rejects non-strings', () => {
    assert.equal(timingSafeEqual('abc', /** @type {any} */ (null)), false);
    assert.equal(timingSafeEqual(/** @type {any} */ (123), '123'), false);
  });
});

function makeRequest(headers = {}) {
  return new Request('https://sync.test/api/sync/v1/admin/overview', {
    headers,
  });
}

describe('assertAdmin', () => {
  const env = { SYNC_ADMIN_KEY: 'bootstrap-secret-key' };

  it('allows admin role', () => {
    assert.doesNotThrow(() =>
      assertAdmin(makeRequest(), env, { role: 'admin' })
    );
  });

  it('allows program_admin role', () => {
    assert.doesNotThrow(() =>
      assertAdmin(makeRequest(), env, { role: 'program_admin' })
    );
  });

  it('allows valid X-Sync-Admin-Key without user', () => {
    assert.doesNotThrow(() =>
      assertAdmin(
        makeRequest({ 'X-Sync-Admin-Key': 'bootstrap-secret-key' }),
        env,
        null
      )
    );
  });

  it('allows valid X-Sync-Admin-Key with non-admin user (bootstrap)', () => {
    assert.doesNotThrow(() =>
      assertAdmin(
        makeRequest({ 'X-Sync-Admin-Key': 'bootstrap-secret-key' }),
        env,
        { role: 'member' }
      )
    );
  });

  it('rejects wrong admin key', () => {
    assert.throws(
      () =>
        assertAdmin(
          makeRequest({ 'X-Sync-Admin-Key': 'wrong-key' }),
          env,
          { role: 'member' }
        ),
      (err) => {
        assert.ok(err instanceof SyncError);
        assert.equal(err.code, 'forbidden');
        return true;
      }
    );
  });

  it('rejects member without admin key', () => {
    assert.throws(
      () => assertAdmin(makeRequest(), env, { role: 'member' }),
      (err) => {
        assert.ok(err instanceof SyncError);
        assert.equal(err.code, 'forbidden');
        return true;
      }
    );
  });

  it('rejects when no user and no admin key', () => {
    assert.throws(
      () => assertAdmin(makeRequest(), env, null),
      SyncError
    );
  });

  it('rejects when SYNC_ADMIN_KEY unset and user not admin', () => {
    assert.throws(
      () =>
        assertAdmin(
          makeRequest({ 'X-Sync-Admin-Key': 'any-key' }),
          {},
          { role: 'member' }
        ),
      SyncError
    );
  });
});

describe('buildDeleteUserStatements', () => {
  it('deletes sessions, memberships, and user when no owned rooms', async () => {
    const db = fakeDbForDeleteUser();
    const stmts = await buildDeleteUserStatements(db, 'u1');
    assert.equal(stmts.length, 3);
    assert.match(db.sqlLog.join('\n'), /DELETE FROM sessions/);
  });

  it('reassigns owned room when another member exists', async () => {
    const db = fakeDbForDeleteUser({
      ownedRoomIds: ['room-a'],
      successorsByRoom: { 'room-a': 'u2' },
    });
    const stmts = await buildDeleteUserStatements(db, 'u1');
    // UPDATE owner + sessions + members + user
    assert.equal(stmts.length, 4);
    assert.ok(db.sqlLog.some((s) => s.includes('UPDATE rooms SET owner_user_id')));
    assert.ok(!db.sqlLog.some((s) => s.includes('DELETE FROM rooms')));
  });

  it('purges sole-occupant owned room before deleting user', async () => {
    const db = fakeDbForDeleteUser({ ownedRoomIds: ['room-solo'] });
    const stmts = await buildDeleteUserStatements(db, 'u1');
    // 5 room purge stmts + sessions + members + user
    assert.equal(stmts.length, 8);
    assert.ok(db.sqlLog.some((s) => s.includes('DELETE FROM rooms')));
    assert.ok(db.sqlLog.some((s) => s.includes('DELETE FROM mutations')));
  });
});
