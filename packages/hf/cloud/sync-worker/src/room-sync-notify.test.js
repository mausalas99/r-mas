import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { notifyRoomRevision } from './room-sync-notify.js';

describe('notifyRoomRevision', () => {
  it('no-ops without hub binding', async () => {
    await notifyRoomRevision({}, 'room-1', 5);
  });

  it('posts revision to room DO stub', async () => {
    let body = null;
    const env = {
      ROOM_SYNC_HUB: {
        idFromName: (id) => id,
        get: (id) => ({
          fetch: async (_url, opts) => {
            body = JSON.parse(String(opts.body));
            return new Response(JSON.stringify({ ok: true }));
          },
        }),
      },
    };
    await notifyRoomRevision(env, 'room-abc', 42);
    assert.equal(body.revision, 42);
    assert.ok(body.at);
  });
});
