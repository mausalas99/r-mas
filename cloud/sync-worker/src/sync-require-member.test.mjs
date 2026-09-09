import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireMember } from './sync.js';

const NOW = new Date().toISOString();

/** Minimal D1 fake backing `sessions`+`users` (auth) and `rooms`/`room_members`. */
function fakeDb({ user, memberships = [], rooms = [] }) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('FROM sessions')) {
                return user || null;
              }
              if (sql.includes('FROM room_members')) {
                const [roomId, userId] = args;
                const isMember = memberships.some((m) => m.roomId === roomId && m.userId === userId);
                if (!isMember) return null;
                return rooms.find((r) => r.id === roomId) || null;
              }
              if (sql.includes('SELECT id, revision, storage_bytes FROM rooms')) {
                const [roomId] = args;
                return rooms.find((r) => r.id === roomId) || null;
              }
              return null;
            },
          };
        },
      };
    },
  };
}

function authedRequest() {
  return new Request('https://x/rooms/room-1/pull', { headers: { Authorization: 'Bearer t' } });
}

describe('requireMember', () => {
  it('lets an actual room member through', async () => {
    const user = { id: 'u1', role: 'member' };
    const db = fakeDb({
      user,
      memberships: [{ roomId: 'room-1', userId: 'u1' }],
      rooms: [{ id: 'room-1', revision: 3, storage_bytes: 0 }],
    });
    const { room } = await requireMember(db, authedRequest(), 'room-1');
    assert.equal(room.id, 'room-1');
  });

  it('rejects a non-member, non-admin user', async () => {
    const user = { id: 'u2', role: 'member' };
    const db = fakeDb({ user, rooms: [{ id: 'room-1', revision: 3, storage_bytes: 0 }] });
    await assert.rejects(() => requireMember(db, authedRequest(), 'room-1'), /not_member|No eres miembro/);
  });

  it('lets an admin through on a room they never joined', async () => {
    const user = { id: 'u3', role: 'admin' };
    const db = fakeDb({ user, rooms: [{ id: 'room-1', revision: 3, storage_bytes: 0 }] });
    const { room } = await requireMember(db, authedRequest(), 'room-1');
    assert.equal(room.id, 'room-1');
  });

  it('lets program_admin through the same way', async () => {
    const user = { id: 'u4', role: 'program_admin' };
    const db = fakeDb({ user, rooms: [{ id: 'room-1', revision: 3, storage_bytes: 0 }] });
    const { room } = await requireMember(db, authedRequest(), 'room-1');
    assert.equal(room.id, 'room-1');
  });

  it('still rejects an admin on a room that does not exist', async () => {
    const user = { id: 'u5', role: 'admin' };
    const db = fakeDb({ user, rooms: [] });
    await assert.rejects(() => requireMember(db, authedRequest(), 'ghost-room'), /not_member|No eres miembro/);
  });
});
