import { SyncError } from './errors.js';
import { userFromAuthHeader } from './session.js';

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function requireUser(db, request) {
  const user = await userFromAuthHeader(db, request);
  if (!user) throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  return user;
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId @param {string} userId */
async function getMembership(db, roomId, userId) {
  return db
    .prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(roomId, userId)
    .first();
}

/** @param {Request} request */
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
}

/**
 * Fetch the wrapped room DEK. Any member can read it — they still need the room
 * password to unwrap it locally. The Worker never sees the unwrapped key.
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId
 */
async function handleGetRoomDek(db, request, roomId) {
  const user = await requireUser(db, request);
  const membership = await getMembership(db, roomId, user.id);
  if (!membership) throw new SyncError('not_member', 'No eres miembro de esta sala.');

  const row = await db
    .prepare('SELECT wrapped_dek_ct, wrapped_dek_iv, wrapped_dek_salt FROM rooms WHERE id = ?')
    .bind(roomId)
    .first();
  if (!row) throw new SyncError('not_found', 'Sala no encontrada.');
  if (!row.wrapped_dek_ct) {
    return Response.json({ dek: null });
  }
  return Response.json({
    dek: { ct: row.wrapped_dek_ct, iv: row.wrapped_dek_iv, salt: row.wrapped_dek_salt },
  });
}

/**
 * Store the wrapped room DEK. Only the room owner may set it, and only once —
 * rotation is a separate future flow, not a plain overwrite by any member.
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId
 */
async function handlePutRoomDek(db, request, roomId) {
  const user = await requireUser(db, request);
  const membership = await getMembership(db, roomId, user.id);
  if (!membership) throw new SyncError('not_member', 'No eres miembro de esta sala.');
  if (membership.role !== 'owner') {
    throw new SyncError('forbidden', 'Solo el dueño de la sala puede configurar la llave.');
  }

  const existing = await db
    .prepare('SELECT wrapped_dek_ct FROM rooms WHERE id = ?')
    .bind(roomId)
    .first();
  if (!existing) throw new SyncError('not_found', 'Sala no encontrada.');
  if (existing.wrapped_dek_ct) {
    throw new SyncError('conflict', 'Esta sala ya tiene una llave configurada.');
  }

  const body = await parseJsonBody(request);
  const ct = String(body?.ct || '').trim();
  const iv = String(body?.iv || '').trim();
  const salt = String(body?.salt || '').trim();
  if (!ct || !iv || !salt) {
    throw new SyncError('invalid_request', 'Llave envuelta incompleta.');
  }

  await db
    .prepare('UPDATE rooms SET wrapped_dek_ct = ?, wrapped_dek_iv = ?, wrapped_dek_salt = ? WHERE id = ?')
    .bind(ct, iv, salt, roomId)
    .run();

  return Response.json({ ok: true });
}

/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database }} env
 * @param {string} roomId
 */
export async function handleRoomDek(request, env, roomId) {
  const db = env.DB;
  if (!db) throw new SyncError('error', 'Base de datos no configurada.');
  if (request.method === 'GET') return handleGetRoomDek(db, request, roomId);
  if (request.method === 'PUT') return handlePutRoomDek(db, request, roomId);
  throw new SyncError('not_found', 'Método no permitido.');
}
