/* global URL, Headers, Response */
/** Desktop renderer (app://rplus) and the legacy localhost shell. */
const DESKTOP_ORIGINS = new Set(['app://rplus', 'http://localhost:3738']);

/**
 * Origins that may read API responses from a browser: this worker's own pages
 * (mobile/interno), the desktop app, and loopback dev servers. Any other site
 * gets no Access-Control-Allow-Origin, so it cannot read token-bearing replies.
 * @param {string} origin @param {Request} req
 */
export function isAllowedOrigin(origin, req) {
  if (DESKTOP_ORIGINS.has(origin)) return true;
  if (origin === new URL(req.url).origin) return true;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

/** @param {Request} req @param {Response} res */
export function applyCors(req, res) {
  const rawOrigin = req.headers.get('Origin');
  const headers = new Headers(res.headers);
  headers.set('Vary', 'Origin');
  if (!rawOrigin) {
    // No Origin → not a browser cross-origin read (desktop main process, curl).
    headers.set('Access-Control-Allow-Origin', '*');
  } else if (isAllowedOrigin(rawOrigin, req)) {
    headers.set('Access-Control-Allow-Origin', rawOrigin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Sync-Token, X-Sync-Admin-Key, Accept'
  );

  // WebSocket upgrade: never rebuild — copying body drops `webSocket` (client code 1006).
  // Cross-origin WS handshakes do not need CORS headers on the 101 response.
  if (res.webSocket) {
    return res;
  }

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** @param {Request} req */
export function corsPreflight(req) {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204 });
}
