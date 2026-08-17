import { validatePassword } from './auth.js';
import { mintRecoveryForUser } from './auth-recovery.js';
import { SyncError } from './errors.js';
import { summarizeMutationOpsJson } from './mutation-guard.mjs';
import { hashPassword } from './password.js';
import { QUOTAS } from './quotas.js';
import { randomRoomCode } from './rooms.js';
import { userFromAuthHeader } from './session.js';

const ADMIN_ROLES = new Set(['admin', 'program_admin']);
const PROMOTABLE_ROLES = new Set(['admin', 'program_admin', 'member']);
const OPS_JSON_TRUNC = 500;
const DEFAULT_MUTATIONS_LIMIT = 50;

/** @param {string} a @param {string} b */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * @param {Request} request
 * @param {{ SYNC_ADMIN_KEY?: string }} env
 * @param {{ role?: string } | null} user
 */
export function assertAdmin(request, env, user) {
  const adminKey = env.SYNC_ADMIN_KEY;
  const headerKey = request.headers.get('X-Sync-Admin-Key') ?? '';
  if (adminKey && timingSafeEqual(headerKey, adminKey)) {
    return;
  }
  const role = user?.role;
  if (role && ADMIN_ROLES.has(role)) {
    return;
  }
  throw new SyncError('forbidden', 'Se requiere rol admin o clave de administración.');
}

/** @param {Request} request */
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
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

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function requireAdminUser(db, request, env) {
  const user = await userFromAuthHeader(db, request);
  assertAdmin(request, env, user);
  return user;
}

/** @param {import('@cloudflare/workers-types').D1Database} db */
async function handleOverview(db) {
  const usersRow = await db.prepare('SELECT COUNT(*) AS n FROM users').first();
  const roomsRow = await db.prepare('SELECT COUNT(*) AS n FROM rooms').first();
  const membersRow = await db.prepare('SELECT COUNT(*) AS n FROM room_members').first();
  const storageRow = await db
    .prepare('SELECT COALESCE(SUM(storage_bytes), 0) AS n FROM rooms')
    .first();

  const users = Number(usersRow?.n ?? 0);
  const rooms = Number(roomsRow?.n ?? 0);
  const members = Number(membersRow?.n ?? 0);
  const storageBytes = Number(storageRow?.n ?? 0);

  return Response.json({
    counts: { users, rooms, members, storageBytes },
    meters: {
      storageBytes,
      storageSoftBytes: QUOTAS.storageSoftBytes,
      storageHardBytes: QUOTAS.storageHardBytes,
      maxMembersPerRoom: QUOTAS.maxMembers,
    },
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db */
async function handleListRooms(db) {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.sala, r.code, r.turn_key, r.revision, r.storage_bytes,
              COUNT(rm.user_id) AS member_count
       FROM rooms r
       LEFT JOIN room_members rm ON rm.room_id = r.id
       GROUP BY r.id
       ORDER BY r.updated_at DESC`
    )
    .all();

  const rooms = (results ?? []).map((row) => ({
    id: row.id,
    sala: row.sala,
    code: row.code,
    turnKey: row.turn_key ?? null,
    revision: row.revision,
    storageBytes: Number(row.storage_bytes) || 0,
    memberCount: Number(row.member_count ?? 0),
  }));

  return Response.json({ rooms });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function handleRoomDetail(db, roomId) {
  const room = await db
    .prepare(
      `SELECT id, code, name, sala, turn_key, owner_user_id, revision, storage_bytes, created_at, updated_at
       FROM rooms WHERE id = ?`
    )
    .bind(roomId)
    .first();

  if (!room) {
    throw new SyncError('not_found', 'Sala no encontrada.');
  }

  const { results: memberRows } = await db
    .prepare(
      `SELECT rm.user_id, rm.role, rm.joined_at, u.username, u.display_name
       FROM room_members rm
       JOIN users u ON u.id = rm.user_id
       WHERE rm.room_id = ?
       ORDER BY rm.joined_at`
    )
    .bind(roomId)
    .all();

  const members = (memberRows ?? []).map((row) => ({
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name ?? '',
    role: row.role,
    joinedAt: row.joined_at,
  }));

  return Response.json({
    room: {
      id: room.id,
      code: room.code,
      name: room.name,
      sala: room.sala,
      turnKey: room.turn_key ?? null,
      ownerUserId: room.owner_user_id,
      revision: room.revision,
      storageBytes: room.storage_bytes,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
    },
    members,
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function handleRotateCode(db, roomId) {
  const room = await db.prepare('SELECT id FROM rooms WHERE id = ?').bind(roomId).first();
  if (!room) {
    throw new SyncError('not_found', 'Sala no encontrada.');
  }

  const code = await generateUniqueRoomCode(db);
  const now = new Date().toISOString();
  await db
    .prepare('UPDATE rooms SET code = ?, updated_at = ? WHERE id = ?')
    .bind(code, now, roomId)
    .run();

  return Response.json({ ok: true, code });
}

/**
 * Clear active_room pointers before DELETE rooms (users.active_room_id FK).
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} roomId
 */
export function buildPurgeRoomStatements(db, roomId) {
  return [
    db
      .prepare('UPDATE users SET active_room_id = NULL WHERE active_room_id = ?')
      .bind(roomId),
    db.prepare('DELETE FROM room_members WHERE room_id = ?').bind(roomId),
    db.prepare('DELETE FROM mutations WHERE room_id = ?').bind(roomId),
    db.prepare('DELETE FROM room_state WHERE room_id = ?').bind(roomId),
    db.prepare('DELETE FROM tombstones WHERE room_id = ?').bind(roomId),
    db.prepare('DELETE FROM rooms WHERE id = ?').bind(roomId),
  ];
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function handlePurgeRoom(db, roomId) {
  const room = await db.prepare('SELECT id FROM rooms WHERE id = ?').bind(roomId).first();
  if (!room) {
    throw new SyncError('not_found', 'Sala no encontrada.');
  }

  await db.batch(buildPurgeRoomStatements(db, roomId));

  return Response.json({ ok: true });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId @param {number} limit */
async function handleRoomMutations(db, roomId, limit) {
  const room = await db.prepare('SELECT id FROM rooms WHERE id = ?').bind(roomId).first();
  if (!room) {
    throw new SyncError('not_found', 'Sala no encontrada.');
  }

  const { results } = await db
    .prepare(
      `SELECT revision, client_mutation_id, actor_id, ops_json, created_at
       FROM mutations
       WHERE room_id = ?
       ORDER BY revision DESC
       LIMIT ?`
    )
    .bind(roomId, limit)
    .all();

  const mutations = (results ?? []).map((row) => {
    const opsJson = String(row.ops_json ?? '');
    const truncated = opsJson.length > OPS_JSON_TRUNC;
    const summary = summarizeMutationOpsJson(opsJson);
    return {
      revision: row.revision,
      clientMutationId: row.client_mutation_id,
      actorId: row.actor_id,
      opsJson: truncated ? opsJson.slice(0, OPS_JSON_TRUNC) : opsJson,
      opsJsonTruncated: truncated,
      createdAt: row.created_at,
      opCount: summary?.opCount ?? null,
      totalBytes: summary?.totalBytes ?? null,
      maxOpBytes: summary?.maxOpBytes ?? null,
      maxOpPath: summary?.maxOpPath ?? null,
      paths: summary?.paths ?? null,
    };
  });

  return Response.json({ mutations });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} q */
async function handleSearchUsers(db, q) {
  const term = String(q ?? '').trim();
  let results;

  if (term) {
    const pattern = `%${term.replace(/[%_]/g, '')}%`;
    const out = await db
      .prepare(
        `SELECT id, username, display_name, role, disabled, created_at
         FROM users
         WHERE username LIKE ? COLLATE NOCASE OR display_name LIKE ? COLLATE NOCASE
         ORDER BY username
         LIMIT 50`
      )
      .bind(pattern, pattern)
      .all();
    results = out.results;
  } else {
    const out = await db
      .prepare(
        `SELECT id, username, display_name, role, disabled, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 50`
      )
      .all();
    results = out.results;
  }

  const users = (results ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    display_name: row.display_name ?? '',
    role: row.role ?? 'member',
    disabled: Number(row.disabled) !== 0,
    created_at: row.created_at,
  }));

  return Response.json({ users });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId */
async function handleRevokeSessions(db, userId) {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    throw new SyncError('not_found', 'Usuario no encontrado.');
  }

  const result = await db
    .prepare('DELETE FROM sessions WHERE user_id = ?')
    .bind(userId)
    .run();

  return Response.json({ ok: true, revoked: result.meta?.changes ?? 0 });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId @param {Request} request */
async function handlePromote(db, userId, request) {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    throw new SyncError('not_found', 'Usuario no encontrado.');
  }

  let role = 'admin';
  if (request.method === 'POST') {
    const body = await parseJsonBody(request);
    if (body?.role != null) {
      role = String(body.role).trim();
    }
  }

  if (!PROMOTABLE_ROLES.has(role)) {
    throw new SyncError('invalid_request', 'Rol inválido.');
  }

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
    .bind(role, now, userId)
    .run();

  return Response.json({ ok: true, role });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId */
async function handleDisableUser(db, userId) {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    throw new SyncError('not_found', 'Usuario no encontrado.');
  }

  const now = new Date().toISOString();
  await db.batch([
    db.prepare('UPDATE users SET disabled = 1, updated_at = ? WHERE id = ?').bind(now, userId),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
  ]);

  return Response.json({ ok: true });
}

/**
 * Cascade plan for DELETE user: rooms.owner_user_id FK blocks a bare delete.
 * Reassign owned rooms to another member, or purge sole-occupant rooms.
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} userId
 */
export async function buildDeleteUserStatements(db, userId) {
  const now = new Date().toISOString();
  /** @type {import('@cloudflare/workers-types').D1PreparedStatement[]} */
  const stmts = [];

  const { results: ownedRooms } = await db
    .prepare('SELECT id FROM rooms WHERE owner_user_id = ?')
    .bind(userId)
    .all();

  for (const room of ownedRooms || []) {
    const roomId = String(room.id);
    const successor = await db
      .prepare(
        `SELECT user_id FROM room_members
         WHERE room_id = ? AND user_id != ?
         ORDER BY CASE role WHEN 'owner' THEN 0 ELSE 1 END, joined_at ASC
         LIMIT 1`
      )
      .bind(roomId, userId)
      .first();

    if (successor?.user_id) {
      stmts.push(
        db
          .prepare('UPDATE rooms SET owner_user_id = ?, updated_at = ? WHERE id = ?')
          .bind(String(successor.user_id), now, roomId)
      );
    } else {
      stmts.push(...buildPurgeRoomStatements(db, roomId));
    }
  }

  stmts.push(
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM room_members WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId)
  );

  return stmts;
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId */
async function handleDeleteUser(db, userId) {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    throw new SyncError('not_found', 'Usuario no encontrado.');
  }

  const stmts = await buildDeleteUserStatements(db, userId);
  await db.batch(stmts);

  return Response.json({ ok: true });
}



/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId @param {Request} request */
async function handleResetPassword(db, userId, request) {
  const user = await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) {
    throw new SyncError('not_found', 'Usuario no encontrado.');
  }

  const body = await parseJsonBody(request);
  const temporaryPassword = body?.temporaryPassword;
  if (temporaryPassword == null || temporaryPassword === '') {
    throw new SyncError('invalid_request', 'Contraseña temporal requerida.');
  }

  validatePassword(temporaryPassword);

  const { salt, hash, iterations } = await hashPassword(temporaryPassword);
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      'UPDATE users SET password_salt = ?, password_hash = ?, password_iterations = ?, updated_at = ? WHERE id = ?'
    ).bind(salt, hash, iterations, now, userId),
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
  ]);

  const rotateRecovery = Boolean(body?.rotateRecovery);
  if (rotateRecovery) {
    const recoveryCode = await mintRecoveryForUser(db, userId);
    return Response.json({ ok: true, recoveryCode });
  }

  return Response.json({ ok: true });
}
/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database, SYNC_ADMIN_KEY?: string }} env
 * @param {string} subpath e.g. "/overview"
 */
export async function handleAdmin(request, env, subpath) {
  const db = env.DB;
  if (!db) {
    throw new SyncError('error', 'Base de datos no configurada.');
  }

  const method = request.method;
  const url = new URL(request.url);

  if (subpath === '/overview' && method === 'GET') {
    await requireAdminUser(db, request, env);
    return handleOverview(db);
  }

  if (subpath === '/rooms' && method === 'GET') {
    await requireAdminUser(db, request, env);
    return handleListRooms(db);
  }

  const roomMutationsMatch = /^\/rooms\/([^/]+)\/mutations$/.exec(subpath);
  if (roomMutationsMatch && method === 'GET') {
    await requireAdminUser(db, request, env);
    const limitRaw = url.searchParams.get('limit');
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(limitRaw ?? String(DEFAULT_MUTATIONS_LIMIT), 10) || DEFAULT_MUTATIONS_LIMIT)
    );
    return handleRoomMutations(db, roomMutationsMatch[1], limit);
  }

  const rotateMatch = /^\/rooms\/([^/]+)\/rotate-code$/.exec(subpath);
  if (rotateMatch && method === 'POST') {
    await requireAdminUser(db, request, env);
    return handleRotateCode(db, rotateMatch[1]);
  }

  const purgeMatch = /^\/rooms\/([^/]+)\/purge$/.exec(subpath);
  if (purgeMatch && method === 'POST') {
    await requireAdminUser(db, request, env);
    return handlePurgeRoom(db, purgeMatch[1]);
  }

  const roomDetailMatch = /^\/rooms\/([^/]+)$/.exec(subpath);
  if (roomDetailMatch && method === 'GET') {
    await requireAdminUser(db, request, env);
    return handleRoomDetail(db, roomDetailMatch[1]);
  }

  if (subpath === '/users' && method === 'GET') {
    await requireAdminUser(db, request, env);
    return handleSearchUsers(db, url.searchParams.get('q'));
  }

  const revokeMatch = /^\/users\/([^/]+)\/revoke-sessions$/.exec(subpath);
  if (revokeMatch && method === 'POST') {
    await requireAdminUser(db, request, env);
    return handleRevokeSessions(db, revokeMatch[1]);
  }

  const promoteMatch = /^\/users\/([^/]+)\/promote$/.exec(subpath);
  if (promoteMatch && method === 'POST') {
    const user = await userFromAuthHeader(db, request);
    assertAdmin(request, env, user);
    return handlePromote(db, promoteMatch[1], request);
  }

  const disableMatch = /^\/users\/([^/]+)\/disable$/.exec(subpath);
  if (disableMatch && method === 'POST') {
    await requireAdminUser(db, request, env);
    return handleDisableUser(db, disableMatch[1]);
  }

  const resetMatch = /^\/users\/([^/]+)\/reset-password$/.exec(subpath);
  if (resetMatch && method === 'POST') {
    await requireAdminUser(db, request, env);
    return handleResetPassword(db, resetMatch[1], request);
  }

  const userDeleteMatch = /^\/users\/([^/]+)$/.exec(subpath);
  if (userDeleteMatch && method === 'DELETE') {
    await requireAdminUser(db, request, env);
    return handleDeleteUser(db, userDeleteMatch[1]);
  }

  throw new SyncError('not_found', 'Ruta admin no encontrada.');
}
