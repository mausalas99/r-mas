import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withEdgeCache } from './cache-api.mjs';

describe('withEdgeCache', () => {
  it('stores successful responses in Cache API', async () => {
    const cacheStore = new Map();
    const cachesMock = {
      open: async () => ({
        match: async (req) => cacheStore.get(req.url) || undefined,
        put: async (req, res) => {
          cacheStore.set(req.url, res);
        },
      }),
    };
    const previous = globalThis.caches;
    globalThis.caches = cachesMock;
    try {
      const req = new Request('http://localhost/api/sync/v1/ping');
      let builds = 0;
      const first = await withEdgeCache(req, async () => {
        builds += 1;
        return Response.json({ ok: true });
      }, 60);
      const second = await withEdgeCache(req, async () => {
        builds += 1;
        return Response.json({ ok: true });
      }, 60);
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal(builds, 1);
      assert.ok(cacheStore.size >= 1);
    } finally {
      globalThis.caches = previous;
    }
  });
});
