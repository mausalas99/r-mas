import { SyncError } from './errors.js';
import { normalizeCloudSala } from './sala-allowlist.js';

/** @param {unknown} op */
export function isInternoAccessUpsertOp(op) {
  return String(op?.type || '') === 'internoAccessUpsert';
}

/** @param {unknown[]} ops */
export function partitionSyncOps(ops) {
  /** @type {unknown[]} */
  const lwwOps = [];
  /** @type {unknown[]} */
  const sidecarOps = [];
  for (const op of ops) {
    if (isInternoAccessUpsertOp(op)) sidecarOps.push(op);
    else lwwOps.push(op);
  }
  return { lwwOps, sidecarOps };
}

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} roomId
 * @param {unknown} op
 */
export async function applyInternoAccessUpsert(db, roomId, op) {
  const sala = normalizeCloudSala(op?.sala);
  const accessToken = String(op?.accessToken || '').trim();
  if (!sala || !accessToken) {
    throw new SyncError('invalid_request', 'internoAccessUpsert requiere sala y accessToken.');
  }

  const room = await db
    .prepare('SELECT sala FROM rooms WHERE id = ?')
    .bind(roomId)
    .first();
  if (!room) {
    throw new SyncError('not_found', 'Sala no encontrada.');
  }
  const roomSala = normalizeCloudSala(room.sala);
  if (roomSala !== sala) {
    throw new SyncError('invalid_request', 'El token interno no corresponde a esta sala nube.');
  }

  const isActive = op?.isActive === false || op?.isActive === 0 ? 0 : 1;
  const rotatedAt = op?.rotatedAt ? String(op.rotatedAt) : null;
  const rotatedBy = op?.rotatedBy ? String(op.rotatedBy) : null;

  await db
    .prepare(
      `INSERT INTO sala_interno_access (sala, access_token, is_active, rotated_at, rotated_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(sala) DO UPDATE SET
         access_token = excluded.access_token,
         is_active = excluded.is_active,
         rotated_at = excluded.rotated_at,
         rotated_by = excluded.rotated_by`
    )
    .bind(sala, accessToken, isActive, rotatedAt, rotatedBy)
    .run();

  return op;
}
