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
              if (q.includes('SELECT wrapped_dek_ct, wrapped_dek_iv, wrapped_dek_salt FROM rooms')) {
                return state.room.id ? { ...state.room } : null;
              }
              if (q.includes('SELECT wrapped_dek_ct FROM rooms')) {
                return state.room.id ? { wrapped_dek_ct: state.room.wrapped_dek_ct } : null;
              }
              if (q.includes('SELECT admin_wrapped_dek_ct, admin_wrapped_dek_iv')) {
                return state.room.id ? { ...state.room } : null;
              }
              if (q.includes('SELECT admin_wrapped_dek_ct FROM rooms')) {
                return state.room.id ? { admin_wrapped_dek_ct: state.room.admin_wrapped_dek_ct || null } : null;
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
              if (q.includes('UPDATE rooms SET admin_wrapped_dek_ct')) {
                const [ct, iv, ephemeralPubKey, keyId] = args;
                state.room.admin_wrapped_dek_ct = ct;
                state.room.admin_wrapped_dek_iv = iv;
                state.room.admin_wrapped_ephemeral_pubkey = ephemeralPubKey;
                state.room.admin_key_id = keyId;
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

const AUTH = { headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' } };

describe('handleRoomDek — room wrap (GET/PUT /dek)', () => {
  it('rejects unauthenticated requests', async () => {
    const db = makeDb({ room: { id: ROOM_ID } });
    const req = new Request('https://x/dek');
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID, ''), /auth_required|Sesión/);
  });

  it('rejects a non-member', async () => {
    const user = { id: 'stranger' };
    const db = makeDb({ user, room: { id: ROOM_ID }, member: false });
    const req = new Request('https://x/dek', AUTH);
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID, ''), /not_member|miembro/);
  });

  it('returns null dek for a room with no key set yet', async () => {
    const user = { id: 'u1' };
    const db = makeDb({ user, room: { id: ROOM_ID } });
    const req = new Request('https://x/dek', AUTH);
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID, '');
    assert.deepEqual(await res.json(), { dek: null });
  });

  it('any member can set the wrap once (not owner-only)', async () => {
    const user = { id: 'u2' };
    const db = makeDb({ user, room: { id: ROOM_ID, role: 'member' } });
    const req = new Request('https://x/dek', { ...AUTH, method: 'PUT', body: JSON.stringify({ ct: 'CT', iv: 'IV', salt: 'SALT' }) });
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID, '');
    assert.equal(res.status, 200);
    assert.equal(db.state.room.wrapped_dek_ct, 'CT');
  });

  it('rejects a second plain PUT once a dek is already set', async () => {
    const user = { id: 'u1' };
    const db = makeDb({ user, room: { id: ROOM_ID, wrapped_dek_ct: 'EXISTING' } });
    const req = new Request('https://x/dek', { ...AUTH, method: 'PUT', body: JSON.stringify({ ct: 'CT', iv: 'IV', salt: 'SALT' }) });
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID, ''), /conflict|ya tiene/);
  });
});

describe('handleRoomDek — rotate (PUT /dek/rotate)', () => {
  it('replaces an existing wrap (used when the room code rotates)', async () => {
    const user = { id: 'u1' };
    const db = makeDb({ user, room: { id: ROOM_ID, wrapped_dek_ct: 'OLD', wrapped_dek_iv: 'OLD', wrapped_dek_salt: 'OLD' } });
    const req = new Request('https://x/dek/rotate', { ...AUTH, method: 'PUT', body: JSON.stringify({ ct: 'NEW', iv: 'NEW', salt: 'NEW' }) });
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID, '/rotate');
    assert.equal(res.status, 200);
    assert.equal(db.state.room.wrapped_dek_ct, 'NEW');
  });

  it('works even if no wrap exists yet (rotate before anyone ever set one)', async () => {
    const user = { id: 'u1' };
    const db = makeDb({ user, room: { id: ROOM_ID } });
    const req = new Request('https://x/dek/rotate', { ...AUTH, method: 'PUT', body: JSON.stringify({ ct: 'NEW', iv: 'NEW', salt: 'NEW' }) });
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID, '/rotate');
    assert.equal(res.status, 200);
  });

  it('rejects a non-member', async () => {
    const user = { id: 'stranger' };
    const db = makeDb({ user, room: { id: ROOM_ID }, member: false });
    const req = new Request('https://x/dek/rotate', { ...AUTH, method: 'PUT', body: JSON.stringify({ ct: 'NEW', iv: 'NEW', salt: 'NEW' }) });
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID, '/rotate'), /not_member|miembro/);
  });
});

describe('handleRoomDek — admin rescue wrap (GET/PUT /dek/admin)', () => {
  it('returns null when no rescue wrap exists yet', async () => {
    const user = { id: 'u1' };
    const db = makeDb({ user, room: { id: ROOM_ID } });
    const req = new Request('https://x/dek/admin', AUTH);
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID, '/admin');
    assert.deepEqual(await res.json(), { dek: null });
  });

  it('lets a member create the rescue copy once', async () => {
    const user = { id: 'u1' };
    const db = makeDb({ user, room: { id: ROOM_ID } });
    const req = new Request('https://x/dek/admin', {
      ...AUTH,
      method: 'PUT',
      body: JSON.stringify({ ct: 'ACT', iv: 'AIV', ephemeralPubKey: 'PUB', keyId: 'admin-1' }),
    });
    const res = await handleRoomDek(req, { DB: db }, ROOM_ID, '/admin');
    assert.equal(res.status, 200);
    assert.equal(db.state.room.admin_wrapped_dek_ct, 'ACT');
  });

  it('rejects a second PUT once the rescue copy already exists', async () => {
    const user = { id: 'u1' };
    const db = makeDb({ user, room: { id: ROOM_ID, admin_wrapped_dek_ct: 'EXISTING' } });
    const req = new Request('https://x/dek/admin', {
      ...AUTH,
      method: 'PUT',
      body: JSON.stringify({ ct: 'ACT', iv: 'AIV', ephemeralPubKey: 'PUB', keyId: 'admin-1' }),
    });
    await assert.rejects(() => handleRoomDek(req, { DB: db }, ROOM_ID, '/admin'), /conflict|rescate/);
  });
});
