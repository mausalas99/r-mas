import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from './index.mjs';

describe('handleRequest', () => {
  let originalFetch;
  before(() => {
    originalFetch = globalThis.fetch;
  });
  after(() => {
    globalThis.fetch = originalFetch;
  });

  it('502s a yml route when both origins fail', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => 'no' });
    const res = await handleRequest(new Request('https://updates.example/latest-mac.yml'));
    assert.equal(res.status, 502);
  });

  it('404s an unknown route', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => 'no' });
    const res = await handleRequest(new Request('https://updates.example/nope'));
    assert.equal(res.status, 404);
  });

  it('/health returns json shape', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => 'version: 8.1.4' });
    const res = await handleRequest(new Request('https://updates.example/health'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.github, 'ok');
    assert.equal(body.using, 'github');
  });

  it('JSON feed routes carry Access-Control-Allow-Origin so the renderer origin can fetch them', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '{"minVersion":"8.0.0"}' });
    const res = await handleRequest(new Request('https://updates.example/min-version.json'));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  });
});
