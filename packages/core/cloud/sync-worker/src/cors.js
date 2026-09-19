/** @param {Request} req @param {Response} res */
export function applyCors(req, res) {
  const rawOrigin = req.headers.get('Origin');
  // Token-gated API; Electron desktop may send null or file:// — allow *.
  const allow = rawOrigin || '*';
  const headers = new Headers(res.headers);
  headers.set('Access-Control-Allow-Origin', allow);
  if (allow !== '*') headers.set('Vary', 'Origin');
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
