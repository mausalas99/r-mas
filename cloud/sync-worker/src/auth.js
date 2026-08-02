import { SyncError } from './errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { createSession, revokeSession, userFromAuthHeader } from './session.js';

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/i;
const MIN_PASSWORD_LEN = 10;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** @type {Map<string, { count: number, resetAt: number }>} */
const failureCounts = new Map();

/** @param {string} u */
export function normalizeUsername(u) {
  return String(u ?? '').trim().toLowerCase();
}

/** @param {string} username */
export function validateUsername(username) {
  if (!USERNAME_RE.test(username)) {
    throw new SyncError(
      'invalid_request',
      'Usuario inválido: 3–32 caracteres, letras, números, . _ -'
    );
  }
}

/** @param {string} password */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
    throw new SyncError('invalid_request', `Contraseña debe tener al menos ${MIN_PASSWORD_LEN} caracteres.`);
  }
}

/** @param {string} key */
function checkRateLimit(key) {
  const now = Date.now();
  const entry = failureCounts.get(key);
  if (!entry || now >= entry.resetAt) {
    failureCounts.delete(key);
    return;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    throw new SyncError('invalid_credentials', 'Demasiados intentos. Esperá unos minutos.');
  }
}

/** @param {string} key */
function recordFailure(key) {
  const now = Date.now();
  const entry = failureCounts.get(key);
  if (!entry || now >= entry.resetAt) {
    failureCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

/** @param {string} key */
function clearFailures(key) {
  failureCounts.delete(key);
}

/** @param {unknown} val */
function dbBlobToHex(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  const bytes = val instanceof ArrayBuffer ? new Uint8Array(val) : /** @type {Uint8Array} */ (val);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {{ id: string, username: string, display_name: string }} row */
function userPayload(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? '',
  };
}

/** @param {Request} request */
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
}

/** @param {Request} request @param {string} ip */
function rateLimitKey(request, ip, username) {
  return `${normalizeUsername(username)}|${ip}`;
}

/** @param {Request} request */
function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} ip */
async function handleRegister(db, request, ip) {
  const body = await parseJsonBody(request);
  const username = normalizeUsername(body?.username);
  const password = body?.password ?? '';
  const displayName = String(body?.displayName ?? '').trim();

  validateUsername(username);
  validatePassword(password);

  const rlKey = rateLimitKey(request, ip, username);
  checkRateLimit(rlKey);

  const existing = await db
    .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
    .bind(username)
    .first();
  if (existing) {
    recordFailure(rlKey);
    throw new SyncError('conflict', 'Ese usuario ya existe.');
  }

  const { salt, hash } = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO users (id, username, password_salt, password_hash, display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, username, salt, hash, displayName, now, now)
      .run();
  } catch (err) {
    if (String(err?.message || '').includes('UNIQUE')) {
      recordFailure(rlKey);
      throw new SyncError('conflict', 'Ese usuario ya existe.');
    }
    throw err;
  }

  clearFailures(rlKey);
  const session = await createSession(db, id);
  return Response.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id, username, displayName },
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} ip */
async function handleLogin(db, request, ip) {
  const body = await parseJsonBody(request);
  const username = normalizeUsername(body?.username);
  const password = body?.password ?? '';

  if (!username || !password) {
    throw new SyncError('invalid_request', 'Usuario y contraseña requeridos.');
  }

  const rlKey = rateLimitKey(request, ip, username);
  checkRateLimit(rlKey);

  const row = await db
    .prepare('SELECT id, username, display_name, password_salt, password_hash FROM users WHERE username = ? COLLATE NOCASE')
    .bind(username)
    .first();

  if (!row) {
    recordFailure(rlKey);
    throw new SyncError('invalid_credentials', 'Usuario o contraseña incorrectos.');
  }

  const saltHex = dbBlobToHex(row.password_salt);
  const hashHex = dbBlobToHex(row.password_hash);
  const ok = await verifyPassword(password, saltHex, hashHex);
  if (!ok) {
    recordFailure(rlKey);
    throw new SyncError('invalid_credentials', 'Usuario o contraseña incorrectos.');
  }

  clearFailures(rlKey);
  const session = await createSession(db, row.id);
  return Response.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: userPayload(row),
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function handleLogout(db, request) {
  const user = await userFromAuthHeader(db, request);
  if (!user) {
    throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  }
  await revokeSession(db, request);
  return Response.json({ ok: true });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function handleMe(db, request) {
  const user = await userFromAuthHeader(db, request);
  if (!user) {
    throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  }
  return Response.json({ user: userPayload(user) });
}

/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database }} env
 * @param {string} subpath e.g. "/register"
 */
export async function handleAuth(request, env, subpath) {
  const db = env.DB;
  if (!db) {
    throw new SyncError('error', 'Base de datos no configurada.');
  }

  const ip = clientIp(request);
  const method = request.method;

  if (subpath === '/register' && method === 'POST') {
    return handleRegister(db, request, ip);
  }
  if (subpath === '/login' && method === 'POST') {
    return handleLogin(db, request, ip);
  }
  if (subpath === '/logout' && method === 'POST') {
    return handleLogout(db, request);
  }
  if (subpath === '/me' && method === 'GET') {
    return handleMe(db, request);
  }

  throw new SyncError('not_found', 'Ruta de auth no encontrada.');
}
