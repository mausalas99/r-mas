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
 * app.bundle.css/js are always served from the same fixed URL (no content
 * hash, unlike the esbuild chunks). Chromium's disk HTTP cache persists
 * across app restarts, so without this a rebuilt bundle can keep serving a
 * stale copy after a full quit + reopen — edits silently don't show up.
 * @param {Headers} headers
 * @returns {Headers}
 */
function withNoCacheHeaders(headers) {
  headers.set('Cache-Control', 'no-store');
  return headers;
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

const MODULE_ASSET_PREFIX = 'js/';

/**
 * Resolves a request path to an absolute file, preferring a live-activated
 * module's staged files for js/app.bundle.mjs and js/chunks/* when present,
 * else falling back to the packaged publicDir. Returns null when the request
 * would escape whichever directory it resolved against (path traversal).
 * @param {string} root absolute path to public/
 * @param {string} rel request path, e.g. "/js/app.bundle.mjs"
 * @param {string|null} [activeModuleDir] absolute path to a staged module dir
 * @returns {string|null}
 */
function resolveRequestPath(root, rel, activeModuleDir) {
  const normalizedRel = String(rel || '').replace(/^\/+/, '') || 'index.html';
  const resolvedRoot = path.resolve(root);

  if (activeModuleDir && normalizedRel.startsWith(MODULE_ASSET_PREFIX)) {
    const moduleRoot = path.resolve(activeModuleDir);
    const moduleRelative = normalizedRel.slice(MODULE_ASSET_PREFIX.length);
    const moduleCandidate = path.normalize(path.join(moduleRoot, moduleRelative));
    const withinModule =
      moduleCandidate === moduleRoot || moduleCandidate.startsWith(moduleRoot + path.sep);
    if (withinModule && fs.existsSync(moduleCandidate) && !fs.statSync(moduleCandidate).isDirectory()) {
      return moduleCandidate;
    }
  }

  const candidate = path.normalize(path.join(resolvedRoot, normalizedRel));
  const withinRoot = candidate === resolvedRoot || candidate.startsWith(resolvedRoot + path.sep);
  return withinRoot ? candidate : null;
}

/**
 * Serve public/ over app://rplus/… so the desktop UI does not depend on :3738.
 * @param {{ protocol: Electron.Protocol }} electron
 * @param {string} publicDir absolute path to public/
 * @param {{ getActiveModuleDir?: () => (string|null) }} [opts] when
 *   getActiveModuleDir returns a path, js/app.bundle.mjs and js/chunks/* are
 *   served from there first (a live-activated module update).
 */
function attachRendererProtocolHandler(electron, publicDir, opts) {
  const root = path.resolve(publicDir);
  const getActiveModuleDir = opts && typeof opts.getActiveModuleDir === 'function' ? opts.getActiveModuleDir : null;
  electron.protocol.handle(SCHEME, async (request) => {
    try {
      const u = new URL(request.url);
      if (u.hostname !== HOST) {
        return new Response('Not found', { status: 404 });
      }
      let rel = decodeURIComponent(u.pathname || '/');
      if (rel === '/' || rel === '') rel = '/index.html';
      const activeModuleDir = getActiveModuleDir ? getActiveModuleDir() : null;
      const abs = resolveRequestPath(root, rel, activeModuleDir);
      if (!abs) {
        return new Response('Forbidden', { status: 403 });
      }
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return new Response('Not found', { status: 404 });
      }
      const res = await electron.net.fetch(pathToFileURL(abs).href);
      const contentType = contentTypeForPublicPath(abs);
      const headers = withNoCacheHeaders(new Headers(res.headers));
      if (contentType) headers.set('Content-Type', contentType);
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
  resolveRequestPath,
  rendererAppIndexUrl,
  shouldUseLegacyHttpRenderer,
  contentTypeForPublicPath,
};
