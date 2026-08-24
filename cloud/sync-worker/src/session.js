/** @param {string} s */
export async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId @param {number} [ttlDays] */
export async function createSession(db, userId, ttlDays = 14) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = [...tokenBytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays * 864e5);
  await db
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
    )
    .bind(tokenHash, userId, now.toISOString(), expires.toISOString())
    .run();
  return { token, expiresAt: expires.toISOString() };
}

/** Bearer header or `access_token` query (WebSocket clients). */
export async function userFromRequest(db, request) {
  const url = new URL(request.url);
  const q = String(url.searchParams.get('access_token') || '').trim();
  if (q) {
    return userFromAuthHeader(
      db,
      new Request(request.url, { headers: { Authorization: `Bearer ${q}` } })
    );
  }
  return userFromAuthHeader(db, request);
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
export async function userFromAuthHeader(db, request) {
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const tokenHash = await sha256Hex(m[1].trim());
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role, u.disabled, u.active_room_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .bind(tokenHash, new Date().toISOString())
    .first();
  return row || null;
}

/**
 * Best-effort: stamp app_version from the X-App-Version header on every
 * authenticated request, not just login — sessions last 14 days, so
 * login-only stamping leaves fleet-adoption data stale for weeks. Never
 * throws; a stamp failure must not block the actual request.
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request
 */
export async function stampAppVersionFromRequest(db, request) {
  const version = String(request.headers.get('X-App-Version') ?? '').trim().slice(0, 32);
  if (!version) return;
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return;
  try {
    const tokenHash = await sha256Hex(m[1].trim());
    const now = new Date().toISOString();
    await db
      .prepare(
        `UPDATE users SET app_version = ?, app_version_at = ?
         WHERE id = (SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?)`
      )
      .bind(version, now, tokenHash, now)
      .run();
  } catch {
    // best-effort only — never block the request over a stamp failure
  }
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
export async function revokeSession(db, request) {
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return false;
  const tokenHash = await sha256Hex(m[1].trim());
  const result = await db
    .prepare('DELETE FROM sessions WHERE token_hash = ?')
    .bind(tokenHash)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
