import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { notifyRoomRevision, MAX_BROADCAST_OPS_BYTES } from './room-sync-notify.js';

function envCapturingBody(onBody) {
  return {
    ROOM_SYNC_HUB: {
      idFromName: (id) => id,
      get: (id) => ({
        fetch: async (_url, opts) => {
          onBody(JSON.parse(String(opts.body)));
          return new Response(JSON.stringify({ ok: true }));
        },
      }),
    },
  };
}

describe('notifyRoomRevision', () => {
  it('no-ops without hub binding', async () => {
    await notifyRoomRevision({}, 'room-1', 5);
  });

  it('posts revision to room DO stub', async () => {
    let body = null;
    const env = envCapturingBody((b) => (body = b));
    await notifyRoomRevision(env, 'room-abc', 42);
    assert.equal(body.revision, 42);
    assert.ok(body.at);
  });

  it('carries the applied ops when small enough — instant sync payload', async () => {
    let body = null;
    const env = envCapturingBody((b) => (body = b));
    const ops = [{ path: 'entries/p1/note', value: { text: 'estable' }, updatedAt: 't1', actorId: 'a1' }];
    await notifyRoomRevision(env, 'room-abc', 42, ops);
    assert.deepEqual(body.ops, ops);
  });

  it('omits ops entirely (bare revision, poll-fallback stays the safety net) above the byte cap', async () => {
    let body = null;
    const env = envCapturingBody((b) => (body = b));
    const bigValue = 'x'.repeat(MAX_BROADCAST_OPS_BYTES + 1000);
    const ops = [{ path: 'entries/p1/note', value: { text: bigValue }, updatedAt: 't1', actorId: 'a1' }];
    await notifyRoomRevision(env, 'room-abc', 42, ops);
    assert.equal(body.ops, undefined);
    assert.equal(body.revision, 42);
  });

  it('omits ops when the ops array is empty', async () => {
    let body = null;
    const env = envCapturingBody((b) => (body = b));
    await notifyRoomRevision(env, 'room-abc', 42, []);
    assert.equal(body.ops, undefined);
  });
});
