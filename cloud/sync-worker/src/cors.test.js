import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyCors } from './cors.js';

describe('applyCors', () => {
  it('returns upstream response unchanged when webSocket is set', () => {
    const fakeWs = { tag: 'ws-client' };
    /** @type {Response} */
    const upstream = {
      status: 101,
      statusText: 'Switching Protocols',
      headers: new Headers(),
      webSocket: fakeWs,
      body: null,
    };

    const out = applyCors(new Request('https://example.com/live'), upstream);
    assert.equal(out, upstream);
  });

  it('wraps normal JSON responses', () => {
    const upstream = Response.json({ ok: true });
    const out = applyCors(new Request('https://example.com/ping'), upstream);
    assert.equal(out.status, 200);
    assert.equal(out.headers.get('Access-Control-Allow-Origin'), '*');
  });
});
