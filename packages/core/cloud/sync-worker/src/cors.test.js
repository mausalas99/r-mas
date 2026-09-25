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

  it('reflects only allowed origins', () => {
    const at = (origin) =>
      applyCors(
        new Request('https://rplus-sync.example.workers.dev/api/sync/v1/ping', { headers: { Origin: origin } }),
        Response.json({ ok: true })
      ).headers.get('Access-Control-Allow-Origin');
    assert.equal(at('app://rplus'), 'app://rplus');
    assert.equal(at('http://localhost:3738'), 'http://localhost:3738');
    assert.equal(at('https://rplus-sync.example.workers.dev'), 'https://rplus-sync.example.workers.dev');
    assert.equal(at('http://127.0.0.1:5173'), 'http://127.0.0.1:5173');
    assert.equal(at('https://evil.example'), null);
    assert.equal(at('null'), null);
    assert.equal(at('http://evil.example'), null);
  });
});
