import { SyncError } from './errors.js';
import { QUOTAS } from './quotas.js';

/** Per-room push budget — stops one sala (or old clients) from hammering D1. */
const MUTATION_PUSH_WINDOW_MS = 60_000;
/** Guardia: several Macs + labs + deletes; was 36 then 48 and still tripped mid-turno. */
const MUTATION_PUSH_MAX_PER_ROOM = 120;

/** Legacy desktop clients enqueue all lab sidecars under one id. */
export const LEGACY_BULK_LAB_MUTATION_ID = 'cloud-lab-backfill';

/** @type {Map<string, { count: number, resetAt: number }>} */
const roomPushBudget = new Map();

/**
 * @param {string} roomId
 */
export function checkMutationPushRateLimit(roomId) {
  const id = String(roomId || '').trim();
  if (!id) return;
  const now = Date.now();
  const entry = roomPushBudget.get(id);
  if (!entry || now >= entry.resetAt) {
    roomPushBudget.set(id, { count: 1, resetAt: now + MUTATION_PUSH_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MUTATION_PUSH_MAX_PER_ROOM) {
    throw new SyncError(
      'rate_limited',
      'Demasiados envíos a esta sala. Espera un minuto e actualiza R+ si persiste.'
    );
  }
}

/**
 * @param {unknown} body
 * @param {number} bodyBytes
 */
export function validateMutationRequest(body, bodyBytes) {
  const bytes = Number(bodyBytes) || 0;
  if (bytes > QUOTAS.maxMutationBodyBytes) {
    throw new SyncError(
      'payload_too_large',
      `Push demasiado grande (${bytes} bytes; máx. ${QUOTAS.maxMutationBodyBytes}). Divide el lote o actualiza R+.`
    );
  }
  const ops = body?.ops;
  if (!Array.isArray(ops) || !ops.length) {
    throw new SyncError('invalid_request', 'Se requiere al menos una operación.');
  }
  if (ops.length > QUOTAS.maxOpsPerMutation) {
    throw new SyncError(
      'invalid_request',
      `Demasiadas operaciones en un push (${ops.length}; máx. ${QUOTAS.maxOpsPerMutation}). Actualiza R+.`
    );
  }
}

/**
 * Summarize ops_json for admin / debugging (who pushed what size).
 * @param {string} opsJson
 */
export function summarizeMutationOpsJson(opsJson) {
  try {
    const ops = JSON.parse(String(opsJson || '[]'));
    if (!Array.isArray(ops)) return null;
    let totalBytes = 0;
    let maxOpBytes = 0;
    let maxOpPath = '';
    /** @type {string[]} */
    const paths = [];
    for (let i = 0; i < ops.length; i += 1) {
      const op = ops[i];
      const path = String(op?.path || '');
      paths.push(path);
      const chunk = JSON.stringify(op ?? null);
      const bytes = new TextEncoder().encode(chunk).length;
      totalBytes += bytes;
      if (bytes > maxOpBytes) {
        maxOpBytes = bytes;
        maxOpPath = path;
      }
    }
    return {
      opCount: ops.length,
      totalBytes,
      maxOpBytes,
      maxOpPath,
      paths: paths.slice(0, 24),
    };
  } catch {
    return null;
  }
}

/**
 * Obsolete desktop clients enqueue all lab sidecars under one id.
 * Ack without applying so old R+ drains outbox (no infinite 400 retries).
 * @param {string} clientMutationId
 * @param {unknown[]} ops
 * @param {number} roomRevision
 * @param {number} baseRevision
 * @returns {Response | null}
 */
export function tryLegacyBulkLabBackfillAck(clientMutationId, ops, roomRevision, baseRevision) {
  const id = String(clientMutationId || '').trim();
  if (id !== LEGACY_BULK_LAB_MUTATION_ID) return null;
  const list = Array.isArray(ops) ? ops : [];
  if (list.length <= 1) return null;
  const revision = Number(roomRevision) || 0;
  const needPull = Number(baseRevision) < revision;
  return Response.json({
    revision,
    applied: [],
    rejected: list.map(function (op) {
      return {
        path: String(op?.path || ''),
        reason: 'legacy_bulk_skipped',
      };
    }),
    needPull,
    legacyBulkAck: true,
  });
}
