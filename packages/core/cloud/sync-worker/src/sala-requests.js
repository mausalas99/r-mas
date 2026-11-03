import { SyncError } from './errors.js';
import { isCloudSala, normalizeCloudSala } from './sala-allowlist.js';
import { userFromAuthHeader } from './session.js';

/** @param {unknown} raw */
export function validateSala(raw) {
  if (!raw || !isCloudSala(raw)) throw new SyncError('invalid_request', 'Sala no disponible.');
  return normalizeCloudSala(raw);
}

/** @param {Record<string, any>} r */
export function requestPayload(r) {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username ?? '',
    displayName: r.display_name ?? '',
    requestedSala: r.requested_sala,
    assignedSala: r.assigned_sala ?? null,
    status: r.status,
    createdAt: r.created_at,
    decidedAt: r.decided_at ?? null,
  };
}

const SELECT_REQUEST = `SELECT r.*, u.display_name, u.username FROM sala_requests r JOIN users u ON u.id = r.user_id`;

/** Prepared statements that create a pending request and flag the user pending. */
export function pendingRequestStatements(db, userId, salaRaw) {
  const sala = validateSala(salaRaw);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id,
    statements: [
      db
        .prepare(
          `INSERT INTO sala_requests (id, user_id, requested_sala, status, created_at) VALUES (?, ?, ?, 'pending', ?)`
        )
        .bind(id, userId, sala, now),
      db.prepare(`UPDATE users SET approval_status = 'pending' WHERE id = ?`).bind(userId),
    ],
  };
}

export async function approvalPayload(db, userId, status) {
  return { status: status ?? 'approved', request: await latestRequest(db, userId) };
}

export async function latestRequest(db, userId) {
  const row = await db
    .prepare(`${SELECT_REQUEST} WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 1`)
    .bind(userId)
    .first();
  return row ? requestPayload(row) : null;
}

/** Throws 403 pending_approval unless the account is approved. @param {{ approval_status?: string }} user */
export function assertApproved(user) {
  const s = user?.approval_status ?? 'approved';
  if (s !== 'approved') {
    throw new SyncError('pending_approval', 'Tu acceso a la sala espera aprobación.');
  }
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} subpath */
export async function handleSalaRequest(db, request, subpath) {
  const user = await userFromAuthHeader(db, request);
  if (!user) throw new SyncError('auth_required', 'Sesión inválida o expirada.');

  if (subpath === '/me' && request.method === 'GET') {
    return Response.json({ request: await latestRequest(db, user.id) });
  }
  if ((subpath === '/' || subpath === '') && request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new SyncError('invalid_request', 'JSON inválido.');
    }
    const last = await latestRequest(db, user.id);
    if (last?.status === 'pending') throw new SyncError('conflict', 'Ya hay una solicitud pendiente.');
    const { id, statements } = pendingRequestStatements(db, user.id, body?.requestedSala);
    await db.batch(statements);
    return Response.json({ request: await latestRequest(db, user.id) });
  }
  throw new SyncError('not_found', 'Ruta no encontrada.');
}

/** Admin: list/approve/reject. Caller already checked admin. */
export async function listSalaRequests(db, status) {
  const st = ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending';
  const { results } = await db
    .prepare(`${SELECT_REQUEST} WHERE r.status = ? ORDER BY r.created_at LIMIT 200`)
    .bind(st)
    .all();
  return Response.json({ requests: results.map(requestPayload) });
}

export async function decideSalaRequest(db, requestId, decision, body) {
  const row = await db.prepare(`${SELECT_REQUEST} WHERE r.id = ?`).bind(requestId).first();
  if (!row) throw new SyncError('not_found', 'Solicitud no encontrada.');
  if (row.status !== 'pending') throw new SyncError('conflict', 'La solicitud ya fue resuelta.');
  const now = new Date().toISOString();
  const approve = decision === 'approve';
  const sala = approve ? validateSala(body?.sala || row.requested_sala) : null;
  const reason = approve ? null : String(body?.reason ?? '').trim().slice(0, 500) || null;
  await db.batch([
    db
      .prepare(
        `UPDATE sala_requests SET status = ?, assigned_sala = ?, reason = ?, decided_at = ? WHERE id = ?`
      )
      .bind(approve ? 'approved' : 'rejected', sala, reason, now, requestId),
    db
      .prepare(`UPDATE users SET approval_status = ? WHERE id = ?`)
      .bind(approve ? 'approved' : 'rejected', row.user_id),
  ]);
  const updated = await db.prepare(`${SELECT_REQUEST} WHERE r.id = ?`).bind(requestId).first();
  return Response.json({ request: requestPayload(updated) });
}
