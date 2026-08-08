import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runScheduledPurge } from './cron-purge.mjs';

function createDb() {
  /** @type {{ sessions: { expires_at: string }[], tombstones: { deleted_at: string }[], rooms: { id: string, revision: number }[], mutations: { room_id: string, revision: number }[] }} */
  const state = {
    sessions: [{ expires_at: '2020-01-01T00:00:00.000Z' }],
    tombstones: [{ deleted_at: '2020-01-01T00:00:00.000Z' }],
    rooms: [{ id: 'r1', revision: 150 }],
    mutations: [
      { room_id: 'r1', revision: 10 },
      { room_id: 'r1', revision: 120 },
    ],
  };
  return {
    prepare(sql) {
      const text = String(sql);
      if (text.includes('SELECT id, revision FROM rooms')) {
        return {
          async all() {
            return { results: [...state.rooms] };
          },
        };
      }
      return {
        bind(...args) {
          return {
            async run() {
              if (text.includes('DELETE FROM sessions')) {
                const before = state.sessions.length;
                state.sessions = state.sessions.filter((row) => row.expires_at > args[0]);
                return { meta: { changes: before - state.sessions.length } };
              }
              if (text.includes('DELETE FROM tombstones')) {
                const before = state.tombstones.length;
                state.tombstones = state.tombstones.filter((row) => row.deleted_at >= args[0]);
                return { meta: { changes: before - state.tombstones.length } };
              }
              if (text.includes('DELETE FROM mutations')) {
                const [roomId, ceiling] = args;
                const before = state.mutations.length;
                state.mutations = state.mutations.filter(
                  (row) => row.room_id !== roomId || row.revision > ceiling
                );
                return { meta: { changes: before - state.mutations.length } };
              }
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
  };
}

describe('runScheduledPurge', () => {
  it('purges expired sessions, tombstones, and old mutations', async () => {
    const result = await runScheduledPurge({ DB: createDb() });
    assert.equal(result.ok, true);
    assert.equal(result.sessionsDeleted, 1);
    assert.equal(result.tombstonesDeleted, 1);
    assert.ok(result.mutationsDeleted >= 1);
  });
});
