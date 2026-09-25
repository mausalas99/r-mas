/* global URL, Headers, Response */
/** Desktop renderer (app://rplus) and the legacy localhost shell. */
const DESKTOP_ORIGINS = new Set(['app://rplus', 'http://localhost:3738']);

/**
 * Same rule as sync-worker/src/cors.js: own pages, desktop app, loopback dev.
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
    headers.set('Access-Control-Allow-Origin', '*');
  } else if (isAllowedOrigin(rawOrigin, req)) {
    headers.set('Access-Control-Allow-Origin', rawOrigin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Equipos-Token, X-Equipos-Admin-Key'
  );
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** @param {Request} req */
export function corsPreflight(req) {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { status: 204 });
}
