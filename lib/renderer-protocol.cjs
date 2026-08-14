'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const SCHEME = 'app';
const HOST = 'rplus';

const TEXT_CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * Charset for text files served over app://rplus.
 * Without this, Chromium may decode CSS as Latin-1, so UTF-8 `·` (C2 B7) shows as `Â·`.
 * @param {string} filePath
 * @returns {string|null}
 */
function contentTypeForPublicPath(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  return TEXT_CONTENT_TYPES[ext] || null;
}

/**
 * Register privileged scheme before app.ready (required for fetch / workers).
 * @param {{ protocol: Electron.Protocol }} electron
 */
function registerRendererProtocolSchemes(electron) {
  electron.protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

/**
 * Serve public/ over app://rplus/… so the desktop UI does not depend on :3738.
 * @param {{ protocol: Electron.Protocol }} electron
 * @param {string} publicDir absolute path to public/
 */
function attachRendererProtocolHandler(electron, publicDir) {
  const root = path.resolve(publicDir);
  electron.protocol.handle(SCHEME, async (request) => {
    try {
      const u = new URL(request.url);
      if (u.hostname !== HOST) {
        return new Response('Not found', { status: 404 });
      }
      let rel = decodeURIComponent(u.pathname || '/');
      if (rel === '/' || rel === '') rel = '/index.html';
      // Prevent path escape
      const abs = path.normalize(path.join(root, rel.replace(/^\/+/, '')));
      if (!abs.startsWith(root)) {
        return new Response('Forbidden', { status: 403 });
      }
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return new Response('Not found', { status: 404 });
      }
      const res = await electron.net.fetch(pathToFileURL(abs).href);
      const contentType = contentTypeForPublicPath(abs);
      if (!contentType) return res;
      const headers = new Headers(res.headers);
      headers.set('Content-Type', contentType);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    } catch (err) {
      return new Response(String(err && err.message ? err.message : err), { status: 500 });
    }
  });
}

/** @returns {string} */
function rendererAppIndexUrl() {
  return `${SCHEME}://${HOST}/index.html`;
}

/**
 * @returns {boolean} true when env forces legacy http://localhost:3738 UI host.
 * Default remains app://rplus so Electron localStorage (Recuérdame, rpc-settings,
 * cutover flags) survives updates — flipping origin would look like a wipe.
 * Nube HTTP uses IPC (`cloud-sync-fetch`) and does not need localhost.
 */
function shouldUseLegacyHttpRenderer() {
  return String(process.env.R_PLUS_RENDERER_HTTP || '').trim() === '1';
}

module.exports = {
  SCHEME,
  HOST,
  registerRendererProtocolSchemes,
  attachRendererProtocolHandler,
  rendererAppIndexUrl,
  shouldUseLegacyHttpRenderer,
  contentTypeForPublicPath,
};
