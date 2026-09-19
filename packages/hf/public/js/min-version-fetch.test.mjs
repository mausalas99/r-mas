import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMinVersionPayload, MIN_VERSION_URL } from './min-version-fetch.mjs';
import { UPDATE_WORKER_URL } from '../../lib/update-feed.mjs';

describe('fetchMinVersionPayload', () => {
  it('returns null without fetch', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = undefined;
    try {
      assert.equal(await fetchMinVersionPayload(), null);
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('probes local, then the update Worker, then GitHub raw, in that order', async () => {
    const prev = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url) => {
      requested.push(url);
      return { ok: false };
    };
    try {
      await fetchMinVersionPayload();
      assert.deepEqual(requested, ['/min-version.json', `${UPDATE_WORKER_URL}min-version.json`, MIN_VERSION_URL]);
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('uses the Worker response when local is missing and Worker answers', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url === `${UPDATE_WORKER_URL}min-version.json`) {
        return { ok: true, json: async () => ({ minVersion: '8.0.0' }) };
      }
      return { ok: false };
    };
    try {
      const payload = await fetchMinVersionPayload();
      assert.equal(payload.minVersion, '8.0.0');
    } finally {
      globalThis.fetch = prev;
    }
  });
});
