import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleApiRoute, API_PREFIX } from './routes.js';

function roomsRequest(headers = {}) {
  return new Request(`https://x${API_PREFIX}/rooms`, { headers });
}

describe('handleApiRoute — /rooms app-version gate', () => {
  const gateOn = { NUBE_VERSION_GATE_ENABLED: true };

  it('rejects a request with no X-App-Version header (pre-8.2.0 client) before touching the DB', async () => {
    const res = await handleApiRoute(roomsRequest(), gateOn);
    assert.equal(res.status, 426);
    const data = await res.json();
    assert.equal(data.error, 'update_required');
  });

  it('rejects an old X-App-Version value the same way', async () => {
    const res = await handleApiRoute(roomsRequest({ 'X-App-Version': '8.1.9' }), gateOn);
    assert.equal(res.status, 426);
  });

  it('lets a current version pass the gate through to the room handler', async () => {
    const res = await handleApiRoute(roomsRequest({ 'X-App-Version': '8.2.1' }), gateOn);
    // No DB configured — proves the version gate passed and a *different*
    // failure (not update_required) came from inside handleRooms.
    assert.notEqual(res.status, 426);
  });

  it('does not gate /auth routes (login/register already have their own check)', async () => {
    const req = new Request(`https://x${API_PREFIX}/auth/login`, { method: 'POST', body: '{}' });
    const res = await handleApiRoute(req, gateOn);
    assert.notEqual(res.status, 426);
  });

  it('does not block a pre-8.2.0 client when the gate is off (default, before 8.2.0 ships)', async () => {
    const res = await handleApiRoute(roomsRequest(), {});
    assert.notEqual(res.status, 426);
  });
});
