import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildMetaPayload } from './meta.js';
import { CLOUD_SALAS } from './sala-allowlist.js';

describe('buildMetaPayload', () => {
  it('returns salas and feature flags', () => {
    const payload = buildMetaPayload({});
    assert.equal(payload.ok, true);
    assert.equal(payload.service, 'rplus-sync');
    assert.deepEqual(payload.salas, [...CLOUD_SALAS]);
    assert.equal(payload.features.revisionWs, false);
  });

  it('reports revision WS when DO binding exists', () => {
    const payload = buildMetaPayload({ ROOM_SYNC_HUB: {} });
    assert.equal(payload.features.revisionWs, true);
  });
});
