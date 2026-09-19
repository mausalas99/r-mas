import { normalizeInternoSala } from './sala-slug.js';

/** @param {string} a @param {string} b */
function timingSafeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * @param {Request} request
 * @param {URL} url
 * @param {unknown} [body]
 */
export function readInternoAuthCredentials(request, url, body) {
  const authHeader = request.headers.get('Authorization') || '';
  const bearerMatch = /^Interno\s+(.+)$/i.exec(authHeader.trim());
  const token = String(
    bearerMatch?.[1] ||
      request.headers.get('x-interno-token') ||
      url.searchParams.get('t') ||
      body?.token ||
      ''
  ).trim();
  const salaRaw =
    url.searchParams.get('sala') ||
    request.headers.get('x-interno-sala') ||
    body?.sala;
  return { salaRaw, token };
}

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 */
export async function getSalaInternoAccess(db, sala) {
  const key = normalizeInternoSala(sala);
  if (!key) return null;
  return db
    .prepare(
      `SELECT sala, access_token, is_active, rotated_at, rotated_by
       FROM sala_interno_access WHERE sala = ?`
    )
    .bind(key)
    .first();
}

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} token
 * @param {string} sala
 */
export async function verifySalaInternoToken(db, token, sala) {
  const row = await getSalaInternoAccess(db, sala);
  if (!row || row.is_active !== 1) return false;
  const a = String(token || '').trim();
  const b = String(row.access_token || '').trim();
  if (!a || !b) return false;
  return timingSafeEqual(a, b);
}

/**
 * @param {Request} request
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {unknown} [body]
 * @returns {Promise<{ sala: string, token: string } | Response>}
 */
export async function authenticateInterno(request, db, body) {
  const url = new URL(request.url);
  const { salaRaw, token } = readInternoAuthCredentials(request, url, body);
  const sala = normalizeInternoSala(salaRaw);
  if (!sala || !token) {
    return Response.json({ error: 'auth_required' }, { status: 401 });
  }
  if (!(await verifySalaInternoToken(db, token, sala))) {
    const row = await getSalaInternoAccess(db, sala);
    if (!row || row.is_active !== 1) {
      return Response.json({ error: 'interno_inactive' }, { status: 403 });
    }
    return Response.json({ error: 'invalid_token' }, { status: 403 });
  }
  return { sala, token };
}
