// settings/{userId} through the real push/pull handlers on SQLite.
// Owner write applies, other users never see it in pull, stale write is rejected.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleSync } from './sync.js';
import { sqliteD1, seedUser } from './test-sqlite-d1.mjs';

const KEY = 'ef'.repeat(32);
let roomSeq = 0;

async function setup() {
  const d1 = sqliteD1();
  const roomId = `room-us-${++roomSeq}`;
  const env = { DB: d1, WORKER_DATA_KEY: KEY };
  await seedUser(d1, { env, id: 'u1', token: 'tok-u1', roomId });
  await seedUser(d1, { env, id: 'u2', token: 'tok-u2', roomId });
  return { d1, roomId, env };
}

const authOf = (u) => ({ Authorization: `Bearer tok-${u}`, 'Content-Type': 'application/json' });
const settingsOp = (userId, doctorName, at) => ({
  path: `settings/${userId}`,
  value: { updatedAt: at, doctorName },
  updatedAt: at,
  actorId: `ios:${userId}`,
});

async function push(ctx, user, body) {
  const req = new Request(`https://x/api/sync/v1/rooms/${ctx.roomId}/mutations`, {
    method: 'POST',
    headers: authOf(user),
    body: JSON.stringify(body),
  });
  return (await handleSync(req, ctx.env, ctx.roomId, 'mutations')).json();
}
async function pull(ctx, user, since) {
  const req = new Request(`https://x/api/sync/v1/rooms/${ctx.roomId}/pull?since=${since}`, { headers: authOf(user) });
  return (await handleSync(req, ctx.env, ctx.roomId, 'pull')).json();
}

describe('settings/{userId} round trip', () => {
  it('owner write is pulled by owner only; other member gets no settings', async () => {
    const ctx = await setup();
    const at = '2026-11-01T10:00:00.000Z';
    const pushed = await push(ctx, 'u1', { clientMutationId: 's1', baseRevision: 0, ops: [settingsOp('u1', 'Dr A', at)] });
    assert.equal(pushed.revision, 1);

    const own = await pull(ctx, 'u1', 0);
    assert.equal(own.userSettings.u1.doctorName, 'Dr A');
    assert.equal(own.ops.some((o) => String(o.path).startsWith('settings/')), false);

    const other = await pull(ctx, 'u2', 0);
    assert.deepEqual(other.userSettings, {});
    assert.equal(other.ops.some((o) => String(o.path).startsWith('settings/')), false);
  });

  it('write to another user settings path is rejected, nothing stored', async () => {
    const ctx = await setup();
    const at = '2026-11-01T10:00:00.000Z';
    const res = await push(ctx, 'u2', { clientMutationId: 's2', baseRevision: 0, ops: [settingsOp('u1', 'intruso', at)] });
    assert.ok(JSON.stringify(res.rejected || []).includes('forbidden_path'));
    const own = await pull(ctx, 'u1', 0);
    assert.deepEqual(own.userSettings, {});
  });

  it('stale owner write is rejected; newer one wins', async () => {
    const ctx = await setup();
    await push(ctx, 'u1', { clientMutationId: 's3', baseRevision: 0, ops: [settingsOp('u1', 'nuevo', '2026-11-01T12:00:00.000Z')] });
    const stale = await push(ctx, 'u1', { clientMutationId: 's4', baseRevision: 1, ops: [settingsOp('u1', 'viejo', '2026-11-01T09:00:00.000Z')] });
    assert.ok(JSON.stringify(stale.rejected || []).includes('stale'));
    const own = await pull(ctx, 'u1', 0);
    assert.equal(own.userSettings.u1.doctorName, 'nuevo');
  });
});
