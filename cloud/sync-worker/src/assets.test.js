import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import worker from './index.js';

const PAGES_ROOT = path.join(process.cwd(), 'cloud/sync-pages/public');
const MOBILE_INDEX = path.join(PAGES_ROOT, 'mobile/index.html');

function ensureMobileIndex() {
  fs.mkdirSync(path.dirname(MOBILE_INDEX), { recursive: true });
  if (!fs.existsSync(MOBILE_INDEX)) {
    fs.writeFileSync(
      MOBILE_INDEX,
      '<!DOCTYPE html><html><body>mobile stub</body></html>'
    );
  }
}

/** @param {string} html */
function createAssetsBinding(html) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/mobile/' || url.pathname === '/mobile/index.html') {
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
      return new Response('Not found', { status: 404 });
    },
  };
}

describe('sync-worker CORS', () => {
  it('allows X-Sync-Admin-Key on preflight for Electron app:// origin', async () => {
    const res = await worker.fetch(
      new Request('http://localhost/api/sync/v1/ping', {
        method: 'OPTIONS',
        headers: {
          Origin: 'app://rplus',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,x-sync-admin-key',
        },
      }),
      {}
    );
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'app://rplus');
    const allow = String(res.headers.get('Access-Control-Allow-Headers') || '');
    assert.match(allow, /X-Sync-Admin-Key/i);
    assert.match(allow, /Authorization/i);
  });
});

describe('sync-worker ASSETS', () => {
  it('serves GET /mobile/ when mobile/index.html exists', async () => {
    ensureMobileIndex();
    const html = fs.readFileSync(MOBILE_INDEX, 'utf8');
    const env = { ASSETS: createAssetsBinding(html) };

    const res = await worker.fetch(new Request('http://localhost/mobile/'), env);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /mobile stub|R\+/);
    assert.ok(res.headers.get('Access-Control-Allow-Origin'));
  });

  it('falls back /mobile and /mobile/join to mobile/index.html', async () => {
    ensureMobileIndex();
    const html = fs.readFileSync(MOBILE_INDEX, 'utf8');
    const env = { ASSETS: createAssetsBinding(html) };

    for (const route of ['/mobile', '/mobile/join']) {
      const res = await worker.fetch(new Request(`http://localhost${route}`), env);
      assert.equal(res.status, 200, route);
      const text = await res.text();
      assert.match(text, /mobile stub|R\+/, route);
    }
  });
});
