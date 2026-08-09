'use strict';

const LAN_API_PATH = /\/api\/lan\/v1\//;
const CLOUD_SYNC_API_PATH = /\/api\/sync\/v1\//;
const LAN_HTTP_PORT = '3738';
const DESKTOP_RENDERER_ORIGIN = 'http://localhost:3738';

function isPrivateLanHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const a = +m[1];
  const b = +m[2];
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** @param {string} url */
function shouldInjectLanCors(url) {
  try {
    const u = new URL(url);
    if (u.port !== LAN_HTTP_PORT) return false;
    if (!LAN_API_PATH.test(u.pathname)) return false;
    return isPrivateLanHost(u.hostname);
  } catch {
    return false;
  }
}

/** @param {string} url */
function shouldInjectCloudSyncCors(url) {
  try {
    const u = new URL(url);
    if (!CLOUD_SYNC_API_PATH.test(u.pathname)) return false;
    return u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'wss:' || u.protocol === 'ws:';
  } catch {
    return false;
  }
}

/** @param {string} url */
function shouldInjectRendererCors(url) {
  return shouldInjectLanCors(url) || shouldInjectCloudSyncCors(url);
}

/** @param {string} url */
function corsAllowHeadersForUrl(url) {
  if (shouldInjectCloudSyncCors(url)) {
    return 'Content-Type, Authorization, X-Sync-Token, X-Sync-Admin-Key, Accept';
  }
  return 'Content-Type, Authorization, X-Interno-Token, X-Interno-Sala, X-Client-Token';
}

/**
 * Reflect renderer Origin on LAN API responses so Electron (localhost:3738) can
 * fetch peer hosts on the ward subnet without relying on each peer's CORS config.
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
    if (!shouldInjectRendererCors(details.url)) {
      return callback({ responseHeaders: details.responseHeaders });
    }
    const headers = Object.assign({}, details.responseHeaders || {});
    const fallbackOrigin = shouldInjectCloudSyncCors(details.url)
      ? storedOrigin || DESKTOP_RENDERER_ORIGIN
      : 'http://localhost:3738';
    if (storedOrigin) {
      headers['Access-Control-Allow-Origin'] = [storedOrigin];
      headers.Vary = ['Origin'];
    } else {
      headers['Access-Control-Allow-Origin'] = [fallbackOrigin];
    }
    headers['Access-Control-Allow-Methods'] = ['GET,PUT,POST,PATCH,DELETE,OPTIONS'];
    headers['Access-Control-Allow-Headers'] = [corsAllowHeadersForUrl(details.url)];
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
  shouldInjectLanCors,
  shouldInjectCloudSyncCors,
  shouldInjectRendererCors,
  isPrivateLanHost,
};
