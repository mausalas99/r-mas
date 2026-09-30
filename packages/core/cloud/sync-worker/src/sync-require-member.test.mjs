import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { requireMember } from './sync.js';
import { sqliteD1, seedUser } from './test-sqlite-d1.mjs';

const env = { WORKER_DATA_KEY: 'cd'.repeat(32) };

/** Real SQLite + schema: room-1 owned by `owner`; `user` seeded per case. */
async function setup(user) {
  const d1 = sqliteD1();
  await seedUser(d1, { env, id: 'owner', token: 'tok-owner', roomId: 'room-1' });
  await seedUser(d1, { env, token: 't', ...user });
  return d1;
}

function authedRequest(token = 't') {
  return new Request('https://x/rooms/room-1/pull', { headers: { Authorization: `Bearer ${token}` } });
}

describe('requireMember (one query: session + user + room + membership)', () => {
  it('lets an actual room member through, with the room row and the user row', async () => {
    const d1 = await setup({ id: 'u1', roomId: 'room-1' });
    d1.sqlite.prepare('UPDATE rooms SET revision = 3, storage_bytes = 7').run();
    d1.calls = 0;
    const { user, room } = await requireMember(d1, authedRequest(), 'room-1');
    assert.deepEqual(room, { id: 'room-1', revision: 3, storage_bytes: 7 });
    assert.deepEqual(Object.keys(user).sort(), ['active_room_id', 'disabled', 'display_name', 'id', 'role', 'username']);
    assert.equal(user.id, 'u1');
    assert.equal(d1.calls, 1);
  });

  it('rejects a non-member, non-admin user', async () => {
    const d1 = await setup({ id: 'u2' });
    await assert.rejects(() => requireMember(d1, authedRequest(), 'room-1'), /No eres miembro/);
  });

  it('lets an admin through on a room they never joined', async () => {
    const d1 = await setup({ id: 'u3', role: 'admin' });
    const { room } = await requireMember(d1, authedRequest(), 'room-1');
    assert.equal(room.id, 'room-1');
  });

  it('lets program_admin through the same way', async () => {
    const d1 = await setup({ id: 'u4', role: 'program_admin' });
    const { room } = await requireMember(d1, authedRequest(), 'room-1');
    assert.equal(room.id, 'room-1');
  });

  it('still rejects an admin on a room that does not exist', async () => {
    const d1 = await setup({ id: 'u5', role: 'admin' });
    await assert.rejects(() => requireMember(d1, authedRequest(), 'ghost-room'), /No eres miembro/);
  });

  it('a member of another room is not a member of this one', async () => {
    const d1 = await setup({ id: 'u6', roomId: 'room-2' });
    await assert.rejects(() => requireMember(d1, authedRequest(), 'room-1'), /No eres miembro/);
  });

  it('expired session, unknown token, or no header: auth_required', async () => {
    const d1 = await setup({ id: 'u7', roomId: 'room-1', expiresAt: '2000-01-01T00:00:00.000Z' });
    await assert.rejects(() => requireMember(d1, authedRequest(), 'room-1'), /Sesión inválida/);
    await assert.rejects(() => requireMember(d1, authedRequest('nope'), 'room-1'), /Sesión inválida/);
    await assert.rejects(() => requireMember(d1, new Request('https://x/'), 'room-1'), /Sesión inválida/);
  });
});
