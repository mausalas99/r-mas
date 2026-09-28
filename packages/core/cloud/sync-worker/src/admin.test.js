/* global Request -- Node 18+ has the Fetch API; the Worker tests build real Requests. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SyncError } from './errors.js';
import {
  assertAdmin,
  buildDeleteUserStatements,
  buildPurgeRoomStatements,
  handleRotateCode,
  timingSafeEqual,
} from './admin.js';

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
    // 8 room purge stmts + sessions + members + user
    assert.equal(stmts.length, 11);
    assert.ok(db.sqlLog.some((s) => s.includes('DELETE FROM rooms')));
    assert.ok(db.sqlLog.some((s) => s.includes('DELETE FROM mutations')));
    assert.ok(db.sqlLog.some((s) => s.includes('active_room_id = NULL')));
  });
});

describe('buildPurgeRoomStatements', () => {
  it('clears active_room_id before deleting the room row', () => {
    const db = fakeDbForDeleteUser();
    const stmts = buildPurgeRoomStatements(db, 'room-fork');
    assert.equal(stmts.length, 8);
    assert.match(db.sqlLog[0], /active_room_id = NULL/);
    assert.ok(db.sqlLog.some((s) => s.includes('DELETE FROM rooms')));
  });
});

/** One-room D1 stub for rotate-code: applies the UPDATE the way SQLite would. */
function fakeRoomDb(room, { takenCodes = [] } = {}) {
  const state = { ...room };
  return {
    state,
    prepare(sql) {
      const s = String(sql);
      return {
        bind(...args) {
          return {
            async first() {
              if (s.startsWith('SELECT id, wrapped_dek_ct FROM rooms')) return args[0] === state.id ? { id: state.id, wrapped_dek_ct: state.wrapped_dek_ct } : null;
              if (s.includes('WHERE code = ?')) return takenCodes.includes(String(args[0]).toUpperCase()) ? { id: 'other' } : null;
              return null;
            },
            async run() {
              if (s.includes('wrapped_dek_ct = ?, wrapped_dek_iv')) {
                const [code, ct, iv, salt, , id, oldCt] = args;
                if (takenCodes.includes(code)) throw new Error('D1_ERROR: UNIQUE constraint failed: rooms.code');
                if (id !== state.id || state.wrapped_dek_ct !== oldCt) return { meta: { changes: 0 } };
                Object.assign(state, { code, wrapped_dek_ct: ct, wrapped_dek_iv: iv, wrapped_dek_salt: salt });
                return { meta: { changes: 1 } };
              }
              if (s.includes('WHERE id = ? AND wrapped_dek_ct IS NULL')) {
                const [code, , id] = args;
                if (id !== state.id || state.wrapped_dek_ct) return { meta: { changes: 0 } };
                state.code = code;
                return { meta: { changes: 1 } };
              }
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
  };
}

const rotateReq = (body) =>
  new Request('https://x/api/sync/v1/admin/rooms/r1/rotate-code', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const WRAP = { ct: 'NEWCT', iv: 'NEWIV', salt: 'NEWSALT' };

describe('handleRotateCode (admin «Cambiar código»)', () => {
  it('a sala with a key: new code and re-locked key land together', async () => {
    const db = fakeRoomDb({ id: 'r1', code: 'OLD111', wrapped_dek_ct: 'OLDCT' });
    const res = await handleRotateCode(db, rotateReq({ code: 'new222', dek: WRAP }), 'r1');
    const data = await res.json();
    assert.deepEqual(data, { ok: true, code: 'NEW222', relocked: true });
    assert.equal(db.state.code, 'NEW222');
    assert.equal(db.state.wrapped_dek_ct, 'NEWCT');
    assert.equal(db.state.wrapped_dek_salt, 'NEWSALT');
  });

  it('a sala with a key refuses a code change without the re-locked key (older apps send {})', async () => {
    const db = fakeRoomDb({ id: 'r1', code: 'OLD111', wrapped_dek_ct: 'OLDCT' });
    await assert.rejects(() => handleRotateCode(db, rotateReq({}), 'r1'), (err) => err instanceof SyncError && err.code === 'dek_rewrap_required');
    assert.equal(db.state.code, 'OLD111', 'nothing changed');
  });

  it('a key re-locked meanwhile makes the update a conflict, not a half change', async () => {
    const db = fakeRoomDb({ id: 'r1', code: 'OLD111', wrapped_dek_ct: 'OLDCT' });
    const realFirst = db.prepare;
    db.prepare = (sql) => {
      const stmt = realFirst(sql);
      // Another device re-locks the key between our read and our write.
      if (String(sql).startsWith('UPDATE rooms')) db.state.wrapped_dek_ct = 'CHANGED';
      return stmt;
    };
    await assert.rejects(() => handleRotateCode(db, rotateReq({ code: 'NEW222', dek: WRAP }), 'r1'), (err) => err.code === 'conflict');
    assert.equal(db.state.code, 'OLD111');
  });

  it('a proposed code already in use is a conflict', async () => {
    const db = fakeRoomDb({ id: 'r1', code: 'OLD111', wrapped_dek_ct: 'OLDCT' }, { takenCodes: ['NEW222'] });
    await assert.rejects(() => handleRotateCode(db, rotateReq({ code: 'NEW222', dek: WRAP }), 'r1'), (err) => err.code === 'conflict');
  });

  it('rejects a malformed code or an incomplete key', async () => {
    const db = fakeRoomDb({ id: 'r1', code: 'OLD111', wrapped_dek_ct: 'OLDCT' });
    await assert.rejects(() => handleRotateCode(db, rotateReq({ code: 'no', dek: WRAP }), 'r1'), (err) => err.code === 'invalid_request');
    await assert.rejects(() => handleRotateCode(db, rotateReq({ code: 'NEW222', dek: { ct: 'x' } }), 'r1'), (err) => err.code === 'invalid_request');
  });

  it('a sala with no key just gets a new code, with or without a body', async () => {
    const db = fakeRoomDb({ id: 'r1', code: 'OLD111', wrapped_dek_ct: null });
    const res = await handleRotateCode(db, rotateReq(), 'r1');
    const data = await res.json();
    assert.equal(data.relocked, false);
    assert.match(data.code, /^[A-Z2-9]{6}$/);
    assert.equal(db.state.code, data.code);
  });

  it('unknown sala → not_found', async () => {
    const db = fakeRoomDb({ id: 'r1', code: 'OLD111', wrapped_dek_ct: null });
    await assert.rejects(() => handleRotateCode(db, rotateReq({}), 'nope'), (err) => err.code === 'not_found');
  });
});
