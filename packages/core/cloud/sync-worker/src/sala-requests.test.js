import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sqliteD1 } from './test-sqlite-d1.mjs';
import { handleApiRoute } from './routes.js';

const BASE = 'https://x.test/api/sync/v1';
const env = () => ({ DB: sqliteD1(), WORKER_DATA_KEY: 'a'.repeat(64), SYNC_ADMIN_KEY: 'adm' });

async function call(e, method, path, { body, token, admin } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (admin) headers['X-Sync-Admin-Key'] = 'adm';
  const res = await handleApiRoute(
    new Request(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined }),
    e
  );
  return { status: res.status, json: await res.json() };
}

describe('sala approval', () => {
  it('pending user is gated, then approved and can ensure-turn', async () => {
    const e = env();
    const reg = await call(e, 'POST', '/auth/register', {
      body: { username: 'dra_prueba', password: 'clave-segura-123', displayName: 'Dra Prueba', requestedSala: 'sala 1' },
    });
    assert.equal(reg.status, 200);
    assert.equal(reg.json.approval.status, 'pending');
    assert.equal(reg.json.approval.request.requestedSala, 'Sala 1');
    const token = reg.json.token;

    const gated = await call(e, 'POST', '/rooms/ensure-turn', { token, body: { sala: 'Sala 1' } });
    assert.equal(gated.status, 403);
    assert.equal(gated.json.error, 'pending_approval');

    assert.equal((await call(e, 'POST', '/sala-request', { token, body: { requestedSala: 'Sala 2' } })).status, 409);
    assert.equal((await call(e, 'GET', '/admin/sala-requests')).status, 403);

    const list = await call(e, 'GET', '/admin/sala-requests?status=pending', { admin: true });
    assert.equal(list.json.requests.length, 1);
    assert.equal(list.json.requests[0].username, 'dra_prueba');
    const id = list.json.requests[0].id;

    const ok = await call(e, 'POST', `/admin/sala-requests/${id}/approve`, { admin: true, body: { sala: 'Sala 2' } });
    assert.equal(ok.json.request.status, 'approved');
    assert.equal(ok.json.request.assignedSala, 'Sala 2');
    assert.equal((await call(e, 'POST', `/admin/sala-requests/${id}/reject`, { admin: true })).status, 409);

    const me = await call(e, 'GET', '/sala-request/me', { token });
    assert.equal(me.json.request.status, 'approved');
    const login = await call(e, 'POST', '/auth/login', { body: { username: 'dra_prueba', password: 'clave-segura-123' } });
    assert.equal(login.json.approval.status, 'approved');

    const room = await call(e, 'POST', '/rooms/ensure-turn', { token, body: { sala: 'Sala 1' } });
    assert.equal(room.status, 200);
  });

  it('rejected can re-request; plain register stays approved', async () => {
    const e = env();
    const reg = await call(e, 'POST', '/auth/register', {
      body: { username: 'dr_prueba', password: 'clave-segura-123', requestedSala: 'UCI' },
    });
    const id = reg.json.approval.request.id;
    await call(e, 'POST', `/admin/sala-requests/${id}/reject`, { admin: true, body: { reason: 'no' } });
    const again = await call(e, 'POST', '/sala-request', { token: reg.json.token, body: { requestedSala: 'UCI' } });
    assert.equal(again.json.request.status, 'pending');

    const plain = await call(e, 'POST', '/auth/register', { body: { username: 'viejo', password: 'clave-segura-123' } });
    assert.equal(plain.json.approval.status, 'approved');
    const bad = await call(e, 'POST', '/auth/register', {
      body: { username: 'malo', password: 'clave-segura-123', requestedSala: 'Nope' },
    });
    assert.equal(bad.status, 400);
  });
});
