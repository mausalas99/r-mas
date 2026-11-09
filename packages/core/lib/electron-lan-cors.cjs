'use strict';

const CLOUD_SYNC_API_PATH = /\/api\/sync\/v1\//;
const DESKTOP_RENDERER_ORIGIN = 'http://localhost:3738';

/** Only the app's own renderer may get injected CORS headers. */
const TRUSTED_RENDERER_ORIGINS = new Set(['app://rplus', DESKTOP_RENDERER_ORIGIN]);

/** @param {string|undefined} origin */
function isTrustedRendererOrigin(origin) {
  return TRUSTED_RENDERER_ORIGINS.has(String(origin || ''));
}

/**
 * Nube URL is user-configurable, so no host allowlist. Bearer tokens must not
 * travel in clear text: plain http/ws only for loopback (local dev worker).
 * @param {string} url
 */
function shouldInjectCloudSyncCors(url) {
  try {
    const u = new URL(url);
    if (!CLOUD_SYNC_API_PATH.test(u.pathname)) return false;
    if (u.protocol === 'https:' || u.protocol === 'wss:') return true;
    const loopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    return loopback && (u.protocol === 'http:' || u.protocol === 'ws:');
  } catch {
    return false;
  }
}

/**
 * Reflect the renderer Origin on Nube sync responses so the renderer can fetch
 * the configured Nube host without relying on that host's CORS config.
 * @param {import('electron').Session} session
 */
function installElectronLanCors(session) {
  if (!session || !session.webRequest) return;

  /** @type {Map<number, string>} */
  const originByRequestId = new Map();

  const forget = (id) => {
    originByRequestId.delete(id);
  };

  session.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const origin = details.requestHeaders && details.requestHeaders.Origin;
    if (origin) originByRequestId.set(details.id, origin);
    callback({ requestHeaders: details.requestHeaders });
  });

  session.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const storedOrigin = originByRequestId.get(details.id);
    forget(details.id);
    if (!shouldInjectCloudSyncCors(details.url)) {
      return callback({ responseHeaders: details.responseHeaders });
    }
    if (storedOrigin && !isTrustedRendererOrigin(storedOrigin)) {
      return callback({ responseHeaders: details.responseHeaders });
    }
    const headers = Object.assign({}, details.responseHeaders || {});
    if (storedOrigin) {
      headers['Access-Control-Allow-Origin'] = [storedOrigin];
      headers.Vary = ['Origin'];
    } else {
      headers['Access-Control-Allow-Origin'] = [DESKTOP_RENDERER_ORIGIN];
    }
    headers['Access-Control-Allow-Methods'] = ['GET,PUT,POST,PATCH,DELETE,OPTIONS'];
    headers['Access-Control-Allow-Headers'] = ['Content-Type, Authorization, X-Sync-Token, X-Sync-Admin-Key, Accept'];
    callback({ responseHeaders: headers });
  });

  session.webRequest.onCompleted({ urls: ['*://*/*'] }, (details) => {
    forget(details.id);
  });
  session.webRequest.onErrorOccurred({ urls: ['*://*/*'] }, (details) => {
    forget(details.id);
  });
}

module.exports = {
  installElectronLanCors,
  shouldInjectCloudSyncCors,
  isTrustedRendererOrigin,
};
