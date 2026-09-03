import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleJoinRoom } from './rooms.js';

/** Minimal D1 fake that enforces the real room_members UNIQUE(room_id, user_id) constraint. */
function makeDb() {
  const room = {
    id: 'r1',
    code: 'ABC123',
    name: 'Sala 2',
    sala: 'Sala 2',
    owner_user_id: 'owner1',
    revision: 1,
    storage_bytes: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
  const members = [];
  const users = { u1: { id: 'u1', active_room_id: null } };

  return {
    prepare(sql) {
      const q = String(sql);
      return {
        bind(...args) {
          return {
            async first() {
              if (q.includes('FROM sessions')) {
                return { id: 'u1', username: 'marco', active_room_id: null };
              }
              if (q.includes('FROM rooms WHERE code')) {
                return args[0] === room.code ? room : null;
              }
              if (q.includes('SELECT role FROM room_members')) {
                const [roomId, userId] = args;
                const row = members.find((m) => m.room_id === roomId && m.user_id === userId);
                return row ? { role: row.role } : null;
              }
              if (q.includes('COUNT(*) AS n FROM room_members')) {
                return { n: members.length };
              }
              return null;
            },
            async run() {
              if (q.startsWith('INSERT OR IGNORE INTO room_members')) {
                const [roomId, userId, role, joinedAt] = args;
                const dup = members.some((m) => m.room_id === roomId && m.user_id === userId);
                if (!dup) members.push({ room_id: roomId, user_id: userId, role, joined_at: joinedAt });
                return {};
              }
              if (q.startsWith('INSERT INTO room_members')) {
                const [roomId, userId, role, joinedAt] = args;
                const dup = members.some((m) => m.room_id === roomId && m.user_id === userId);
                if (dup) throw new Error('D1_ERROR: UNIQUE constraint failed: room_members.room_id, room_members.user_id');
                members.push({ room_id: roomId, user_id: userId, role, joined_at: joinedAt });
                return {};
              }
              if (q.startsWith('UPDATE users SET active_room_id')) {
                const [roomId, userId] = args;
                users[userId].active_room_id = roomId;
                return {};
              }
              return {};
            },
          };
        },
      };
    },
  };
}

function joinRequest() {
  return new Request('https://x/rooms/join', {
    method: 'POST',
    headers: { Authorization: 'Bearer t1' },
    body: JSON.stringify({ code: 'ABC123' }),
  });
}

describe('handleJoinRoom concurrency', () => {
  it('two concurrent joins by the same user never throw a UNIQUE constraint error', async () => {
    const db = makeDb();

    const [r1, r2] = await Promise.all([
      handleJoinRoom(db, joinRequest()),
      handleJoinRoom(db, joinRequest()),
    ]);

    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
    assert.equal(b1.room.code, 'ABC123');
    assert.equal(b2.room.code, 'ABC123');
  });
});
