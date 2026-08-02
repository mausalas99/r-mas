import { encryptJson } from './crypto-at-rest.js';
import { SyncError } from './errors.js';
import { QUOTAS } from './quotas.js';
import { isCloudSala, normalizeCloudSala } from './sala-allowlist.js';
import { handleSync } from './sync.js';
import { userFromAuthHeader } from './session.js';

/** Unambiguous uppercase alphanumeric (no 0/O, 1/I/L). */
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** @returns {Record<string, unknown>} */
export function emptyRoomState() {
  return {
    revision: 0,
    entries: [],
    entityVersions: {},
    todos: {},
    agenda: [],
    clinicalOps: null,
    labSidecars: {},
  };
}

/** @param {number} [len] */
export function randomRoomCode(len = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let code = '';
  for (let i = 0; i < len; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

/** @param {string} hex */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** @param {Request} request */
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function requireUser(db, request) {
  const user = await userFromAuthHeader(db, request);
  if (!user) {
    throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  }
  return user;
}

/** @param {{ WORKER_DATA_KEY?: string }} env */
function requireDataKey(env) {
  const hex = env.WORKER_DATA_KEY;
  if (!hex || hex.length !== 64) {
    throw new SyncError(
      'error',
      'WORKER_DATA_KEY no configurada. Agregá una clave de 64 hex en .dev.vars para desarrollo local.'
    );
  }
}

/** @param {{ id: string, code: string, name: string, sala: string, owner_user_id: string, revision: number, storage_bytes: number, created_at: string, updated_at: string, role?: string }} row */
function roomPayload(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    sala: row.sala,
    ownerUserId: row.owner_user_id,
    revision: row.revision,
    storageBytes: row.storage_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.role ? { role: row.role } : {}),
  };
}

/** @param {import('@cloudflare/workers-types').D1Database} db */
async function generateUniqueRoomCode(db) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomRoomCode(6);
    const existing = await db
      .prepare('SELECT id FROM rooms WHERE code = ? COLLATE NOCASE')
      .bind(code)
      .first();
    if (!existing) return code;
  }
  throw new SyncError('error', 'No se pudo generar un código de sala único.');
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId */
async function countOwnedRooms(db, userId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM rooms WHERE owner_user_id = ?')
    .bind(userId)
    .first();
  return Number(row?.n ?? 0);
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function countRoomMembers(db, roomId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM room_members WHERE room_id = ?')
    .bind(roomId)
    .first();
  return Number(row?.n ?? 0);
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId @param {string} userId */
async function getMembership(db, roomId, userId) {
  return db
    .prepare(
      `SELECT rm.role, r.id, r.code, r.name, r.sala, r.owner_user_id, r.revision,
              r.storage_bytes, r.created_at, r.updated_at
       FROM room_members rm
       JOIN rooms r ON r.id = rm.room_id
       WHERE rm.room_id = ? AND rm.user_id = ?`
    )
    .bind(roomId, userId)
    .first();
}

/** @param {{ WORKER_DATA_KEY?: string }} env @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function handleCreateRoom(env, db, request) {
  const user = await requireUser(db, request);
  requireDataKey(env);

  const owned = await countOwnedRooms(db, user.id);
  if (owned >= QUOTAS.maxRoomsCreatedPerUser) {
    throw new SyncError(
      'quota_exceeded',
      `Límite de salas creadas (${QUOTAS.maxRoomsCreatedPerUser}).`
    );
  }

  const body = await parseJsonBody(request);
  const name = String(body?.name ?? '').trim();
  const salaRaw = body?.sala;

  if (!salaRaw || !isCloudSala(salaRaw)) {
    throw new SyncError(
      'invalid_request',
      'Sala no disponible en la nube. Solo Sala y Torre HU.'
    );
  }

  const sala = normalizeCloudSala(salaRaw);
  const id = crypto.randomUUID();
  const code = await generateUniqueRoomCode(db);
  const now = new Date().toISOString();
  const state = emptyRoomState();
  const { ciphertext, iv } = await encryptJson(env, state);
  const storageBytes = ciphertext.length / 2 + iv.length / 2;

  await db.batch([
    db
      .prepare(
        `INSERT INTO rooms (id, code, name, sala, owner_user_id, revision, storage_bytes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`
      )
      .bind(id, code, name, sala, user.id, storageBytes, now, now),
    db
      .prepare(
        `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`
      )
      .bind(id, user.id, now),
    db
      .prepare(
        `INSERT INTO room_state (room_id, ciphertext, iv, updated_at) VALUES (?, ?, ?, ?)`
      )
      .bind(id, hexToBytes(ciphertext), hexToBytes(iv), now),
  ]);

  return Response.json({
    room: roomPayload({
      id,
      code,
      name,
      sala,
      owner_user_id: user.id,
      revision: 0,
      storage_bytes: storageBytes,
      created_at: now,
      updated_at: now,
      role: 'owner',
    }),
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function handleJoinRoom(db, request) {
  const user = await requireUser(db, request);
  const body = await parseJsonBody(request);
  const code = String(body?.code ?? '').trim().toUpperCase();

  if (!code) {
    throw new SyncError('invalid_request', 'Código de sala requerido.');
  }

  const room = await db
    .prepare(
      `SELECT id, code, name, sala, owner_user_id, revision, storage_bytes, created_at, updated_at
       FROM rooms WHERE code = ? COLLATE NOCASE`
    )
    .bind(code)
    .first();

  if (!room) {
    throw new SyncError('not_found', 'Sala no encontrada.');
  }

  const existing = await db
    .prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(room.id, user.id)
    .first();

  if (existing) {
    return Response.json({
      room: roomPayload({ ...room, role: existing.role }),
      alreadyMember: true,
    });
  }

  const members = await countRoomMembers(db, room.id);
  if (members >= QUOTAS.maxMembers) {
    throw new SyncError('quota_exceeded', `La sala está llena (máx. ${QUOTAS.maxMembers} miembros).`);
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`
    )
    .bind(room.id, user.id, now)
    .run();

  return Response.json({
    room: roomPayload({ ...room, role: 'member' }),
    alreadyMember: false,
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId */
async function handleLeaveRoom(db, request, roomId) {
  const user = await requireUser(db, request);

  const membership = await db
    .prepare('SELECT role FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(roomId, user.id)
    .first();

  if (!membership) {
    throw new SyncError('not_member', 'No sos miembro de esta sala.');
  }

  await db
    .prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?')
    .bind(roomId, user.id)
    .run();

  return Response.json({ ok: true });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function handleListRooms(db, request) {
  const user = await requireUser(db, request);

  const { results } = await db
    .prepare(
      `SELECT r.id, r.code, r.name, r.sala, r.owner_user_id, r.revision,
              r.storage_bytes, r.created_at, r.updated_at, rm.role
       FROM room_members rm
       JOIN rooms r ON r.id = rm.room_id
       WHERE rm.user_id = ?
       ORDER BY r.updated_at DESC`
    )
    .bind(user.id)
    .all();

  const rooms = (results ?? []).map((row) => roomPayload(row));
  return Response.json({ rooms });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} roomId */
async function handleGetRoom(db, request, roomId) {
  const user = await requireUser(db, request);
  const row = await getMembership(db, roomId, user.id);

  if (!row) {
    throw new SyncError('not_member', 'No sos miembro de esta sala.');
  }

  return Response.json({
    room: roomPayload(row),
  });
}

/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database, WORKER_DATA_KEY?: string }} env
 * @param {string} subpath e.g. "/" or "/join" or "/:id/leave"
 */
export async function handleRooms(request, env, subpath) {
  const db = env.DB;
  if (!db) {
    throw new SyncError('error', 'Base de datos no configurada.');
  }

  const method = request.method;

  if (subpath === '/' || subpath === '') {
    if (method === 'POST') return handleCreateRoom(env, db, request);
    if (method === 'GET') return handleListRooms(db, request);
    throw new SyncError('not_found', 'Método no permitido.');
  }

  if (subpath === '/join') {
    if (method === 'POST') return handleJoinRoom(db, request);
    throw new SyncError('not_found', 'Método no permitido.');
  }

  const syncMatch = /^\/([^/]+)\/(mutations|pull)$/.exec(subpath);
  if (syncMatch) {
    return handleSync(request, env, syncMatch[1], syncMatch[2]);
  }

  const leaveMatch = /^\/([^/]+)\/leave$/.exec(subpath);
  if (leaveMatch) {
    if (method === 'POST') return handleLeaveRoom(db, request, leaveMatch[1]);
    throw new SyncError('not_found', 'Método no permitido.');
  }

  const roomMatch = /^\/([^/]+)$/.exec(subpath);
  if (roomMatch) {
    if (method === 'GET') return handleGetRoom(db, request, roomMatch[1]);
    throw new SyncError('not_found', 'Método no permitido.');
  }

  throw new SyncError('not_found', 'Ruta de sala no encontrada.');
}
