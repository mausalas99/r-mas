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

  it('probes the update Worker, then GitHub raw, then local last (offline fallback)', async () => {
    const prev = globalThis.fetch;
    const requested = [];
    globalThis.fetch = async (url) => {
      requested.push(url);
      return { ok: false };
    };
    try {
      await fetchMinVersionPayload();
      assert.deepEqual(requested, [`${UPDATE_WORKER_URL}min-version.json`, MIN_VERSION_URL, '/min-version.json']);
    } finally {
      globalThis.fetch = prev;
    }
  });

  it('uses the Worker response over GitHub raw and the local fallback', async () => {
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

  it('falls back to the local bundled file only when both remote checks fail (offline)', async () => {
    const prev = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (url === '/min-version.json') {
        return { ok: true, json: async () => ({ minVersion: '8.1.6' }) };
      }
      return { ok: false };
    };
    try {
      const payload = await fetchMinVersionPayload();
      assert.equal(payload.minVersion, '8.1.6');
    } finally {
      globalThis.fetch = prev;
    }
  });
});
