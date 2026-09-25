import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveActiveRoomForUser } from './rooms.js';

function sortMemberships(rows) {
  return rows.slice().sort(function (a, b) {
    const rev = Number(b.revision || 0) - Number(a.revision || 0);
    if (rev !== 0) return rev;
    const bytes = Number(b.storage_bytes || 0) - Number(a.storage_bytes || 0);
    if (bytes !== 0) return bytes;
    return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
  });
}

function makeDb({ memberships = [] }) {
  return {
    prepare(sql) {
      const q = String(sql);
      return {
        bind(...args) {
          return {
            async first() {
              return null;
            },
            async all() {
              if (q.includes('ORDER BY r.revision DESC')) {
                const userId = args[0];
                const results = sortMemberships(
                  memberships
                    .filter((m) => m.userId === userId)
                    .map((m) => ({ role: m.role, ...m.room }))
                );
                return { results };
              }
              return { results: [] };
            },
            async run() {
              return {};
            },
          };
        },
      };
    },
  };
}

describe('resolveActiveRoomForUser', () => {
  it('prefers active_room_id when it has revision', async () => {
    const db = makeDb({
      memberships: [
        {
          userId: 'u1',
          role: 'member',
          room: {
            id: 'r-old',
            code: 'OLD111',
            name: 'Old',
            sala: 'Sala 1',
            owner_user_id: 'o1',
            revision: 1,
            storage_bytes: 0,
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
        {
          userId: 'u1',
          role: 'member',
          room: {
            id: 'r-new',
            code: 'NEW222',
            name: 'New',
            sala: 'Sala 1',
            owner_user_id: 'o1',
            revision: 2,
            storage_bytes: 0,
            created_at: '2026-01-02',
            updated_at: '2026-01-03',
          },
        },
      ],
    });
    const room = await resolveActiveRoomForUser(db, { id: 'u1', active_room_id: 'r-old' });
    assert.equal(room?.code, 'OLD111');
  });

  it('skips empty active room for higher revision membership', async () => {
    const db = makeDb({
      memberships: [
        {
          userId: 'u1',
          role: 'member',
          room: {
            id: 'r-empty',
            code: 'EMPTY1',
            name: 'Empty',
            sala: 'Sala 1',
            owner_user_id: 'o1',
            revision: 0,
            storage_bytes: 134,
            created_at: '2026-01-03',
            updated_at: '2026-01-03',
          },
        },
        {
          userId: 'u1',
          role: 'member',
          room: {
            id: 'r-live',
            code: 'LIVE99',
            name: 'Live',
            sala: 'Sala 1',
            owner_user_id: 'o2',
            revision: 2,
            storage_bytes: 900,
            created_at: '2026-01-02',
            updated_at: '2026-01-04',
          },
        },
      ],
    });
    const room = await resolveActiveRoomForUser(db, { id: 'u1', active_room_id: 'r-empty' });
    assert.equal(room?.code, 'LIVE99');
  });

  it('falls back to latest membership when active pointer missing', async () => {
    const db = makeDb({
      memberships: [
        {
          userId: 'u1',
          role: 'member',
          room: {
            id: 'r1',
            code: 'AAA111',
            name: 'A',
            sala: 'Sala 1',
            owner_user_id: 'o1',
            revision: 1,
            storage_bytes: 0,
            created_at: '2026-01-01',
            updated_at: '2026-01-02',
          },
        },
      ],
    });
    const room = await resolveActiveRoomForUser(db, { id: 'u1', active_room_id: null });
    assert.equal(room?.code, 'AAA111');
  });
});
