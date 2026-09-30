// Push/pull against real SQLite + the real schema: D1 round trips per request,
// idempotent replay (lost ack), prune inside the commit batch.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleSync, commitMutationBatch, loadRoomState } from './sync.js';
import { sqliteD1, seedUser } from './test-sqlite-d1.mjs';

const KEY = 'cd'.repeat(32);
let roomSeq = 0;

async function setup() {
  const d1 = sqliteD1();
  const roomId = `room-rt-${++roomSeq}`;
  const env = { DB: d1, WORKER_DATA_KEY: KEY };
  await seedUser(d1, { env, id: 'u1', token: 'tok-u1', roomId });
  return { d1, roomId, env };
}

const auth = { Authorization: 'Bearer tok-u1', 'Content-Type': 'application/json' };
const noteOp = (value, at) => ({ path: 'entries/p1/note', value, updatedAt: at, actorId: 'u1' });

async function push(ctx, body) {
  const req = new Request(`https://x/api/sync/v1/rooms/${ctx.roomId}/mutations`, { method: 'POST', headers: auth, body: JSON.stringify(body) });
  return (await handleSync(req, ctx.env, ctx.roomId, 'mutations')).json();
}
async function pull(ctx, since) {
  const req = new Request(`https://x/api/sync/v1/rooms/${ctx.roomId}/pull?since=${since}`, { headers: auth });
  return (await handleSync(req, ctx.env, ctx.roomId, 'pull')).json();
}
const roomRevision = (ctx) => ctx.d1.sqlite.prepare('SELECT revision FROM rooms WHERE id = ?').get(ctx.roomId).revision;
const mutationCount = (ctx) => ctx.d1.sqlite.prepare('SELECT COUNT(*) AS n FROM mutations WHERE room_id = ?').get(ctx.roomId).n;

describe('D1 round trips per request', () => {
  it('push = 3 (auth+member, load, commit batch incl. prune)', async () => {
    const ctx = await setup();
    ctx.d1.calls = 0;
    const res = await push(ctx, { clientMutationId: 'm1', baseRevision: 0, ops: [noteOp('a', '2026-09-30T10:00:00.000Z')] });
    assert.equal(res.revision, 1);
    assert.equal(ctx.d1.calls, 3);
  });

  it('pull incremental = 2, idle pull = 1', async () => {
    const ctx = await setup();
    await push(ctx, { clientMutationId: 'm1', baseRevision: 0, ops: [noteOp('a', '2026-09-30T10:00:00.000Z')] });
    ctx.d1.calls = 0;
    const inc = await pull(ctx, 0);
    assert.equal(inc.revision, 1);
    assert.equal(inc.ops.length, 1);
    assert.equal(ctx.d1.calls, 2);
    ctx.d1.calls = 0;
    assert.deepEqual(await pull(ctx, 1), { revision: 1, ops: [] });
    assert.equal(ctx.d1.calls, 1);
  });
});

describe('replay of a committed clientMutationId (lost ack) answers like before', () => {
  it('same body again: prior revision + prior ops, no new revision, needPull from the room revision', async () => {
    const ctx = await setup();
    const body = { clientMutationId: 'm1', baseRevision: 0, ops: [noteOp('a', '2026-09-30T10:00:00.000Z')] };
    const first = await push(ctx, body);
    ctx.d1.calls = 0;
    const again = await push(ctx, body);
    assert.deepEqual(again, { revision: 1, applied: first.applied, rejected: [], needPull: true });
    assert.equal(ctx.d1.calls, 3, 'all-no-op replay: auth, load, prior row (no commit)');
    assert.equal(roomRevision(ctx), 1);
    assert.equal(mutationCount(ctx), 1);
  });

  it('client already at the room revision: needPull stays false', async () => {
    const ctx = await setup();
    const first = await push(ctx, { clientMutationId: 'm1', baseRevision: 0, ops: [noteOp('a', '2026-09-30T10:00:00.000Z')] });
    const again = await push(ctx, { clientMutationId: 'm1', baseRevision: 1, ops: [noteOp('a', '2026-09-30T10:00:00.000Z')] });
    assert.deepEqual(again, { revision: 1, applied: first.applied, rejected: [], needPull: false });
  });

  it('replay after a newer edit to the same field: prior answer, newer value kept, no revision bump', async () => {
    const ctx = await setup();
    const m1 = { clientMutationId: 'm1', baseRevision: 0, ops: [noteOp('a', '2026-09-30T10:00:00.000Z')] };
    const first = await push(ctx, m1);
    await push(ctx, { clientMutationId: 'm2', baseRevision: 1, ops: [noteOp('b', '2026-09-30T11:00:00.000Z')] });
    ctx.d1.calls = 0;
    const again = await push(ctx, m1);
    assert.deepEqual(again, { revision: 1, applied: first.applied, rejected: [], needPull: true });
    assert.equal(roomRevision(ctx), 2);
    const { state } = await loadRoomState(ctx.env, ctx.d1, ctx.roomId);
    assert.equal(state.entries.find((e) => e.id === 'p1')?.note, 'b');
  });

  it('replay whose ops would now apply again (older write lost LWW, then re-sent): still the prior answer', async () => {
    const ctx = await setup();
    const m1 = { clientMutationId: 'm1', baseRevision: 0, ops: [noteOp('a', '2026-09-30T12:00:00.000Z')] };
    const first = await push(ctx, m1);
    // Another device writes a newer note, so m1's value would change state again if replayed.
    await push(ctx, { clientMutationId: 'm2', baseRevision: 1, ops: [noteOp('b', '2026-09-30T13:00:00.000Z')] });
    const again = await push(ctx, { ...m1, ops: [noteOp('a2', '2026-09-30T14:00:00.000Z')] });
    assert.deepEqual(again, { revision: 1, applied: first.applied, rejected: [], needPull: true });
    assert.equal(roomRevision(ctx), 2);
    const { state } = await loadRoomState(ctx.env, ctx.d1, ctx.roomId);
    assert.equal(state.entries.find((e) => e.id === 'p1')?.note, 'b', 'the replayed ops are not written');
  });
});

describe('mutation prune runs inside the commit batch', () => {
  async function paddedRoom() {
    const ctx = await setup();
    const db = ctx.d1.sqlite;
    const ins = db.prepare(`INSERT INTO mutations (room_id, revision, client_mutation_id, actor_id, ops_json, ciphertext, iv, created_at)
                            VALUES (?, ?, ?, 'u1', '[]', NULL, NULL, '2026-09-30T00:00:00.000Z')`);
    for (let r = 1; r <= 105; r += 1) ins.run(ctx.roomId, r, `pad-${r}`);
    db.prepare('UPDATE rooms SET revision = 105 WHERE id = ?').run(ctx.roomId);
    return ctx;
  }
  const minRev = (ctx) => ctx.d1.sqlite.prepare('SELECT MIN(revision) AS m FROM mutations WHERE room_id = ?').get(ctx.roomId).m;

  it('a commit drops rows outside the window in the same round trip', async () => {
    const ctx = await paddedRoom();
    ctx.d1.calls = 0;
    const res = await push(ctx, { clientMutationId: 'm1', baseRevision: 105, ops: [noteOp('a', '2026-09-30T10:00:00.000Z')] });
    assert.equal(res.revision, 106);
    assert.equal(ctx.d1.calls, 3);
    assert.equal(minRev(ctx), 7);
    assert.equal(mutationCount(ctx), 100);
  });

  it('a stale commit prunes nothing and writes nothing', async () => {
    const ctx = await paddedRoom();
    const { state } = await loadRoomState(ctx.env, ctx.d1, ctx.roomId);
    const applied = [noteOp('a', '2026-09-30T10:00:00.000Z')];
    const res = await commitMutationBatch(ctx.env, ctx.d1, {
      roomId: ctx.roomId, expectedRevision: 104, nextRevision: 105, userId: 'u1', clientMutationId: 'm-stale', applied, nextState: state,
    });
    assert.deepEqual(res, { ok: false, reason: 'stale' });
    assert.equal(minRev(ctx), 1);
    assert.equal(mutationCount(ctx), 105);
  });
});
