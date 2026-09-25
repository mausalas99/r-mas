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

  it('module-manifest.json resolves with application/json content type', async () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '{"package":"@rplus/core"}' });
    const res = await handleRequest(new Request('https://updates.example/module-manifest.json'));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/json');
    assert.equal(await res.text(), '{"package":"@rplus/core"}');
  });

  it('module-bundle.zip resolves with application/zip content type', async () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer;
    globalThis.fetch = async () => ({ ok: true, status: 200, arrayBuffer: async () => zipBytes });
    const res = await handleRequest(new Request('https://updates.example/module-bundle.zip'));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/zip');
  });

  it('502s a module feed route when both origins fail', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => 'no', arrayBuffer: async () => new ArrayBuffer(0) });
    const res = await handleRequest(new Request('https://updates.example/module-manifest.json'));
    assert.equal(res.status, 502);
  });

  it('/telemetry stores only version, result and platform, and ignores extra fields', async () => {
    const points = [];
    const env = { UPDATE_EVENTS: { writeDataPoint: (p) => points.push(p) } };
    const res = await handleRequest(
      new Request('https://updates.example/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain', 'CF-Connecting-IP': '203.0.113.9' },
        body: JSON.stringify({ version: '8.4.1', result: 'success', platform: 'darwin', patient: 'x' }),
      }),
      env
    );
    assert.equal(res.status, 204);
    assert.deepEqual(points, [{ blobs: ['8.4.1', 'success', 'darwin'], indexes: ['8.4.1'] }]);
  });

  it('/telemetry rejects bad input without writing', async () => {
    const points = [];
    const env = { UPDATE_EVENTS: { writeDataPoint: (p) => points.push(p) } };
    const post = (body) =>
      handleRequest(new Request('https://updates.example/telemetry', { method: 'POST', body }), env);
    assert.equal((await post('not json')).status, 400);
    assert.equal((await post(JSON.stringify({ version: '8.4.1', result: 'ok', platform: 'darwin' }))).status, 400);
    assert.equal((await post(JSON.stringify({ version: '8.4.1', result: 'fail', platform: 'haiku' }))).status, 400);
    assert.equal((await post(JSON.stringify({ version: 'x'.repeat(40), result: 'fail', platform: 'win32' }))).status, 400);
    assert.equal((await post('x'.repeat(600))).status, 413);
    assert.equal(points.length, 0);
  });

  it('/telemetry still answers 204 when the dataset binding is missing', async () => {
    const res = await handleRequest(
      new Request('https://updates.example/telemetry', {
        method: 'POST',
        body: JSON.stringify({ version: '8.4.1', result: 'fail', platform: 'win32' }),
      }),
      {}
    );
    assert.equal(res.status, 204);
  });

  it('GET /telemetry is not a route', async () => {
    const res = await handleRequest(new Request('https://updates.example/telemetry'), {});
    assert.equal(res.status, 404);
  });
});
