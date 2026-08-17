import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleRoomDek } from './room-dek.js';

const ROOM_ID = 'room-1';

/** @param {{ user?: object, room?: object, member?: boolean }} opts */
function makeDb({ user, room, member = true }) {
  const state = { room: { ...room } };
  return {
    state,
    prepare(sql) {
      const q = String(sql);
      return {
        bind(...args) {
          return {
            async first() {
              if (q.includes('JOIN users u ON u.id = s.user_id')) {
                return user || null;
              }
              if (q.includes('FROM room_members')) {
                const [roomId] = args;
                if (roomId !== ROOM_ID || !user || !member) return null;
                return { role: state.room.role || 'member' };
              }
              if (q.includes('SELECT wrapped_dek_ct, wrapped_dek_iv, wrapped_dek_salt')) {
                return state.room.id ? { ...state.room } : null;
              }
              if (q.includes('SELECT wrapped_dek_ct FROM rooms')) {
                return state.room.id ? { wrapped_dek_ct: state.room.wrapped_dek_ct } : null;
              }
              return null;
            },
            async run() {
              if (q.includes('UPDATE rooms SET wrapped_dek_ct')) {
                const [ct, iv, salt] = args;
                state.room.wrapped_dek_ct = ct;
                state.room.wrapped_dek_iv = iv;
                state.room.wrapped_dek_salt = salt;
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

/** @param {string} token */
async function authedRequest(token, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request('https://x/api/sync/v1/rooms/room-1/dek', { ...opts, headers });
}

describe('handleRoomDek', () => {
  it('rejects unauthenticated requests', async () => {
    const db = makeDb({ room: { id: ROOM_ID } });
    const req = await authedRequest('');
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID), /auth_required|Sesión/);
  });

  it('returns null dek for a room with no key set yet', async () => {
    const user = { id: 'u1', username: 'doc1' };
    const db = makeDb({ user, room: { id: ROOM_ID, role: 'member' } });
    const token = 'tok';
    // userFromAuthHeader hashes the token; our mock ignores the hash and just returns `user`.
    const req = await authedRequest(token);
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID);
    const data = await res.json();
    assert.deepEqual(data, { dek: null });
  });

  it('owner can set the wrapped dek once', async () => {
    const user = { id: 'u1', username: 'doc1' };
    const db = makeDb({ user, room: { id: ROOM_ID, role: 'owner' } });
    const req = new Request('https://x/api/sync/v1/rooms/room-1/dek', {
      method: 'PUT',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ct: 'CT', iv: 'IV', salt: 'SALT' }),
    });
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID);
    assert.equal(res.status, 200);
    assert.equal(db.state.room.wrapped_dek_ct, 'CT');
  });

  it('rejects a second PUT once a dek is already set', async () => {
    const user = { id: 'u1', username: 'doc1' };
    const db = makeDb({
      user,
      room: { id: ROOM_ID, role: 'owner', wrapped_dek_ct: 'EXISTING' },
    });
    const req = new Request('https://x/api/sync/v1/rooms/room-1/dek', {
      method: 'PUT',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ct: 'CT', iv: 'IV', salt: 'SALT' }),
    });
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID), /conflict|ya tiene/);
  });

  it('rejects a member (non-owner) trying to set the dek', async () => {
    const user = { id: 'u2', username: 'doc2' };
    const db = makeDb({ user, room: { id: ROOM_ID, role: 'member' } });
    const req = new Request('https://x/api/sync/v1/rooms/room-1/dek', {
      method: 'PUT',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ct: 'CT', iv: 'IV', salt: 'SALT' }),
    });
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID), /forbidden|dueño/);
  });

  it('rejects a non-member fetching the dek', async () => {
    const user = { id: 'stranger' };
    const db = makeDb({ user, room: { id: ROOM_ID, role: 'member' }, member: false });
    const req = await authedRequest('tok');
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID), /not_member|miembro/);
  });
});
