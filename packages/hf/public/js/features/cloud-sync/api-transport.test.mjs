import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cloudSyncHttpFetch } from './api-transport.mjs';

describe('cloudSyncHttpFetch', () => {
  beforeEach(() => {
    globalThis.window = {};
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it('uses electron IPC when cloudSyncFetch is available', async () => {
    let called = false;
    window.electronAPI = {
      cloudSyncFetch: async (payload) => {
        called = true;
        assert.equal(payload.url, 'https://example.com/api/sync/v1/ping');
        return { ok: true, status: 200, statusText: 'OK', data: { ok: true } };
      },
    };
    const res = await cloudSyncHttpFetch('https://example.com/api/sync/v1/ping');
    assert.equal(called, true);
    assert.equal(res.ok, true);
    assert.deepEqual(await res.json(), { ok: true });
  });
});
