import { SyncError } from './errors.js';
import { userFromRequest } from './session.js';

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {Request} request
 * @param {string} roomId
 */
async function requireRoomMember(db, request, roomId) {
  const user = await userFromRequest(db, request);
  if (!user) {
    throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  }
  const row = await db
    .prepare(
      `SELECT r.id, r.revision
       FROM room_members rm
       JOIN rooms r ON r.id = rm.room_id
       WHERE rm.room_id = ? AND rm.user_id = ?`
    )
    .bind(roomId, user.id)
    .first();
  if (!row) {
    throw new SyncError('not_member', 'No eres miembro de esta sala.');
  }
  return { user, room: row };
}

/**
 * WebSocket upgrade → room Durable Object (revision hints only).
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database, ROOM_SYNC_HUB?: import('@cloudflare/workers-types').DurableObjectNamespace }} env
 * @param {string} roomId
 */
export async function handleRoomLive(request, env, roomId) {
  if (request.method !== 'GET') {
    throw new SyncError('not_found', 'Método no permitido.');
  }
  if (request.headers.get('Upgrade') !== 'websocket') {
    throw new SyncError('invalid_request', 'Se requiere conexión WebSocket.');
  }
  const db = env.DB;
  if (!db) {
    throw new SyncError('error', 'Base de datos no configurada.');
  }
  if (!env.ROOM_SYNC_HUB) {
    throw new SyncError('error', 'Live sync no configurado en el Worker.');
  }

  const { room } = await requireRoomMember(db, request, roomId);
  const revision = Number(room.revision) || 0;
  const stub = env.ROOM_SYNC_HUB.get(env.ROOM_SYNC_HUB.idFromName(roomId));
  const headers = new Headers(request.headers);
  headers.set('X-Room-Revision', String(revision));
  const forwardReq = new Request(request.url, {
    method: request.method,
    headers,
  });
  return stub.fetch(forwardReq);
}
