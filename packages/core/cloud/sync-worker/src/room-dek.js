import { SyncError } from './errors.js';
import { userFromAuthHeader } from './session.js';

/**
 * The room DEK is wrapped ONCE per room, with a key derived from the room's own
 * join code (not a personal login password, and not per-member). Everyone who can
 * join the room already has what's needed to unlock it — no device-to-device
 * handoff, no per-member row. See docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md
 * Stage 0 item 1.
 *
 * The admin rescue copy (see handleGetAdminDek/handlePutAdminDek) is a SEPARATE
 * wrap, locked with the admin's public key (asymmetric), for the case where the
 * room code itself is lost and no device has the DEK cached anymore.
 */

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function requireUser(db, request) {
  const user = await userFromAuthHeader(db, request);
  if (!user) throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  return user;
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId @param {string} userId */
async function requireMembership(db, roomId, userId) {
  const membership = await db
    .prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(roomId, userId)
    .first();
  if (!membership) throw new SyncError('not_member', 'No eres miembro de esta sala.');
  return membership;
}

/** @param {Request} request */
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
}

/** @param {unknown} body */
function readWrappedFields(body) {
  const ct = String(body?.ct || '').trim();
  const iv = String(body?.iv || '').trim();
  const salt = String(body?.salt || '').trim();
  if (!ct || !iv || !salt) throw new SyncError('invalid_request', 'Llave envuelta incompleta.');
  return { ct, iv, salt };
}

/**
 * Fetch the wrapped room DEK. Any member can read it — they still need the room
 * code to derive the key that unwraps it locally. The Worker never sees the
 * unwrapped key.
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId
 */
async function handleGetRoomDek(db, request, roomId) {
  const user = await requireUser(db, request);
  await requireMembership(db, roomId, user.id);

  const row = await db
    .prepare('SELECT wrapped_dek_ct, wrapped_dek_iv, wrapped_dek_salt FROM rooms WHERE id = ?')
    .bind(roomId)
    .first();
  if (!row) throw new SyncError('not_found', 'Sala no encontrada.');
  if (!row.wrapped_dek_ct) return Response.json({ dek: null });
  return Response.json({ dek: { ct: row.wrapped_dek_ct, iv: row.wrapped_dek_iv, salt: row.wrapped_dek_salt } });
}

/**
 * Store the wrapped room DEK for the first time. Only once — after this, changing
 * the wrap goes through handlePutRoomDekRotate (paired with rotating the room code).
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId
 */
async function handlePutRoomDek(db, request, roomId) {
  const user = await requireUser(db, request);
  await requireMembership(db, roomId, user.id);

  const existing = await db.prepare('SELECT wrapped_dek_ct FROM rooms WHERE id = ?').bind(roomId).first();
  if (!existing) throw new SyncError('not_found', 'Sala no encontrada.');
  if (existing.wrapped_dek_ct) {
    throw new SyncError('conflict', 'Esta sala ya tiene una llave configurada. Usa rotate para reemplazarla.');
  }

  const { ct, iv, salt } = readWrappedFields(await parseJsonBody(request));
  await db
    .prepare('UPDATE rooms SET wrapped_dek_ct = ?, wrapped_dek_iv = ?, wrapped_dek_salt = ? WHERE id = ?')
    .bind(ct, iv, salt, roomId)
    .run();

  return Response.json({ ok: true });
}

/**
 * Replace the wrapped room DEK — used only when the room's join code rotates
 * (a device that already holds the unwrapped DEK re-wraps it under the new code
 * and pushes it here, so future joiners with the new code can unlock it).
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId
 */
async function handlePutRoomDekRotate(db, request, roomId) {
  const user = await requireUser(db, request);
  await requireMembership(db, roomId, user.id);

  const existing = await db.prepare('SELECT wrapped_dek_ct FROM rooms WHERE id = ?').bind(roomId).first();
  if (!existing) throw new SyncError('not_found', 'Sala no encontrada.');

  const { ct, iv, salt } = readWrappedFields(await parseJsonBody(request));
  await db
    .prepare('UPDATE rooms SET wrapped_dek_ct = ?, wrapped_dek_iv = ?, wrapped_dek_salt = ? WHERE id = ?')
    .bind(ct, iv, salt, roomId)
    .run();

  return Response.json({ ok: true });
}

/**
 * Admin rescue copy — one extra wrap per room, locked with the admin's public key.
 * Any member who already holds the unwrapped DEK may create it once; it is not
 * rotated by this endpoint.
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId
 */
async function handleGetAdminDek(db, request, roomId) {
  const user = await requireUser(db, request);
  await requireMembership(db, roomId, user.id);

  const row = await db
    .prepare('SELECT admin_wrapped_dek_ct, admin_wrapped_dek_iv, admin_wrapped_ephemeral_pubkey, admin_key_id FROM rooms WHERE id = ?')
    .bind(roomId)
    .first();
  if (!row) throw new SyncError('not_found', 'Sala no encontrada.');
  if (!row.admin_wrapped_dek_ct) return Response.json({ dek: null });
  return Response.json({
    dek: {
      ct: row.admin_wrapped_dek_ct,
      iv: row.admin_wrapped_dek_iv,
      ephemeralPubKey: row.admin_wrapped_ephemeral_pubkey,
      keyId: row.admin_key_id,
    },
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId */
async function handlePutAdminDek(db, request, roomId) {
  const user = await requireUser(db, request);
  await requireMembership(db, roomId, user.id);

  const existing = await db.prepare('SELECT admin_wrapped_dek_ct FROM rooms WHERE id = ?').bind(roomId).first();
  if (!existing) throw new SyncError('not_found', 'Sala no encontrada.');
  if (existing.admin_wrapped_dek_ct) {
    throw new SyncError('conflict', 'Esta sala ya tiene una llave de rescate configurada.');
  }

  const body = await parseJsonBody(request);
  const ct = String(body?.ct || '').trim();
  const iv = String(body?.iv || '').trim();
  const ephemeralPubKey = String(body?.ephemeralPubKey || '').trim();
  const keyId = String(body?.keyId || '').trim();
  if (!ct || !iv || !ephemeralPubKey || !keyId) {
    throw new SyncError('invalid_request', 'Llave de rescate incompleta.');
  }

  await db
    .prepare(
      'UPDATE rooms SET admin_wrapped_dek_ct = ?, admin_wrapped_dek_iv = ?, admin_wrapped_ephemeral_pubkey = ?, admin_key_id = ? WHERE id = ?'
    )
    .bind(ct, iv, ephemeralPubKey, keyId, roomId)
    .run();

  return Response.json({ ok: true });
}

/**
 * Routes under /rooms/:roomId/dek*
 * GET  /rooms/:id/dek         -> the room's wrapped DEK
 * PUT  /rooms/:id/dek         -> set it for the first time (write-once)
 * PUT  /rooms/:id/dek/rotate  -> replace it (paired with room-code rotation)
 * GET  /rooms/:id/dek/admin   -> read the admin rescue wrap
 * PUT  /rooms/:id/dek/admin   -> create the admin rescue wrap (write-once)
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database }} env
 * @param {string} roomId
 * @param {string} subpath everything after "/dek" — '', '/rotate', or '/admin'
 */
export async function handleRoomDek(request, env, roomId, subpath = '') {
  const db = env.DB;
  if (!db) throw new SyncError('error', 'Base de datos no configurada.');

  if (subpath === '' || subpath === '/') {
    if (request.method === 'GET') return handleGetRoomDek(db, request, roomId);
    if (request.method === 'PUT') return handlePutRoomDek(db, request, roomId);
    throw new SyncError('not_found', 'Método no permitido.');
  }
  if (subpath === '/rotate') {
    if (request.method === 'PUT') return handlePutRoomDekRotate(db, request, roomId);
    throw new SyncError('not_found', 'Método no permitido.');
  }
  if (subpath === '/admin') {
    if (request.method === 'GET') return handleGetAdminDek(db, request, roomId);
    if (request.method === 'PUT') return handlePutAdminDek(db, request, roomId);
    throw new SyncError('not_found', 'Método no permitido.');
  }
  throw new SyncError('not_found', 'Método no permitido.');
}
