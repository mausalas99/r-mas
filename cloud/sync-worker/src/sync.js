import { decryptJson, encryptJson } from './crypto-at-rest.js';
import { d1UniqueConstraintTarget, isD1UniqueConstraintError } from './d1-errors.js';
import { SyncError } from './errors.js';
import { applyOps } from './lww.js';
import {
  mutationPruneCeiling,
  shouldReturnSnapshotPull,
} from './pull-strategy.js';
import { QUOTAS } from './quotas.js';
import { userFromAuthHeader } from './session.js';

/** Concurrent pushes race on (room_id, revision); retry with fresh revision. */
const MUTATION_COMMIT_ATTEMPTS = 5;

/** @param {Uint8Array | ArrayBuffer | null | undefined} bytes */
function bytesToHex(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {string} hex */
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
async function requireMember(db, request, roomId) {
  const user = await userFromAuthHeader(db, request);
  if (!user) {
    throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  }
  const row = await db
    .prepare(
      `SELECT r.id, r.revision, r.storage_bytes
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

/** @param {Request} request */
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
}

/** @param {unknown} ops */
function validateOpsSize(ops) {
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new SyncError('invalid_request', 'Se requiere al menos una operación.');
  }
  for (const op of ops) {
    const path = String(op?.path || '');
    const payload = JSON.stringify(op?.value ?? null);
    const bytes = new TextEncoder().encode(payload).length;
    const isLab = path.startsWith('labSidecars/');
    const max = isLab ? QUOTAS.labMutationMaxBytes : QUOTAS.noteMaxBytes;
    if (bytes > max) {
      throw new SyncError(
        'payload_too_large',
        `Operación demasiado grande para ${path} (máx. ${max} bytes).`
      );
    }
  }
}

/** @param {{ WORKER_DATA_KEY?: string }} env @param {string} roomId */
async function loadRoomState(env, db, roomId) {
  const row = await db
    .prepare('SELECT ciphertext, iv FROM room_state WHERE room_id = ?')
    .bind(roomId)
    .first();
  if (!row) {
    throw new SyncError('not_found', 'Estado de sala no encontrado.');
  }
  const ciphertextHex = bytesToHex(row.ciphertext);
  const ivHex = bytesToHex(row.iv);
  const state = await decryptJson(env, ciphertextHex, ivHex);
  return { state, ciphertextHex, ivHex };
}

/**
 * Atomically bump revision + append mutation + persist encrypted state.
 * Every write is gated on `rooms.revision = expected` so a lost race leaves no partial commit
 * (INSERT/UPDATE with 0 changes — not a UNIQUE blast that only sometimes rolls back).
 * @returns {Promise<{ ok: true, revision: number } | { ok: false, reason: 'stale' | 'duplicate_client' }>}
 */
async function commitMutationBatch(env, db, opts) {
  const {
    roomId,
    expectedRevision,
    nextRevision,
    userId,
    clientMutationId,
    applied,
    nextState,
  } = opts;
  const { ciphertext, iv } = await encryptJson(env, nextState);
  const storageBytes = ciphertext.length / 2 + iv.length / 2;
  if (storageBytes > QUOTAS.storageHardBytes) {
    throw new SyncError(
      'payload_too_large',
      `La sala superó el límite de almacenamiento (${QUOTAS.storageHardBytes} bytes).`
    );
  }
  const now = new Date().toISOString();
  const opsJson = JSON.stringify(applied);
  try {
    const results = await db.batch([
      db
        .prepare(
          `INSERT INTO mutations (room_id, revision, client_mutation_id, actor_id, ops_json, created_at)
           SELECT ?, ?, ?, ?, ?, ?
           FROM rooms WHERE id = ? AND revision = ?`
        )
        .bind(
          roomId,
          nextRevision,
          clientMutationId,
          userId,
          opsJson,
          now,
          roomId,
          expectedRevision
        ),
      db
        .prepare(
          `UPDATE rooms SET revision = ?, storage_bytes = ?, updated_at = ?
           WHERE id = ? AND revision = ?`
        )
        .bind(nextRevision, storageBytes, now, roomId, expectedRevision),
      db
        .prepare(
          `UPDATE room_state SET ciphertext = ?, iv = ?, updated_at = ?
           WHERE room_id = ?
             AND EXISTS (
               SELECT 1 FROM mutations
               WHERE room_id = ? AND client_mutation_id = ? AND revision = ?
             )`
        )
        .bind(
          hexToBytes(ciphertext),
          hexToBytes(iv),
          now,
          roomId,
          roomId,
          clientMutationId,
          nextRevision
        ),
    ]);
    const inserted = Number(results?.[0]?.meta?.changes ?? 0);
    const bumped = Number(results?.[1]?.meta?.changes ?? 0);
    if (inserted !== 1 || bumped !== 1) return { ok: false, reason: 'stale' };
    // Drop ops history outside the incremental window — unbounded mutations OOMs D1 pull.
    const pruneAt = mutationPruneCeiling(nextRevision);
    if (pruneAt > 0) {
      await db
        .prepare('DELETE FROM mutations WHERE room_id = ? AND revision <= ?')
        .bind(roomId, pruneAt)
        .run();
    }
    return { ok: true, revision: nextRevision };
  } catch (err) {
    if (!isD1UniqueConstraintError(err)) throw err;
    const target = d1UniqueConstraintTarget(err);
    if (target === 'client_mutation_id') return { ok: false, reason: 'duplicate_client' };
    return { ok: false, reason: 'stale' };
  }
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId @param {string} clientMutationId */
async function loadPriorMutation(db, roomId, clientMutationId) {
  return db
    .prepare(
      `SELECT revision, ops_json FROM mutations
       WHERE room_id = ? AND client_mutation_id = ?`
    )
    .bind(roomId, clientMutationId)
    .first();
}

/** @param {unknown} prior @param {number} roomRevision @param {number} baseRevision */
function priorMutationResponse(prior, roomRevision, baseRevision) {
  const priorOps = JSON.parse(String(prior.ops_json || '[]'));
  return Response.json({
    revision: Number(prior.revision),
    applied: priorOps,
    rejected: [],
    needPull: baseRevision < roomRevision,
  });
}

/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database, WORKER_DATA_KEY?: string }} env
 * @param {string} roomId
 * @param {'mutations' | 'pull'} sub
 */
export async function handleSync(request, env, roomId, sub) {
  const db = env.DB;
  if (!db) {
    throw new SyncError('error', 'Base de datos no configurada.');
  }

  if (sub === 'mutations') {
    if (request.method !== 'POST') {
      throw new SyncError('not_found', 'Método no permitido.');
    }
    return handleMutations(request, env, db, roomId);
  }

  if (sub === 'pull') {
    if (request.method !== 'GET') {
      throw new SyncError('not_found', 'Método no permitido.');
    }
    return handlePull(request, env, db, roomId);
  }

  throw new SyncError('not_found', 'Ruta de sync no encontrada.');
}

/** @param {Request} request @param {{ WORKER_DATA_KEY?: string }} env @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function handleMutations(request, env, db, roomId) {
  const { user, room } = await requireMember(db, request, roomId);
  const body = await parseJsonBody(request);
  const clientMutationId = String(body?.clientMutationId || '').trim();
  const baseRevision = Number(body?.baseRevision ?? 0);
  const ops = body?.ops;

  if (!clientMutationId) {
    throw new SyncError('invalid_request', 'clientMutationId requerido.');
  }
  validateOpsSize(ops);

  const prior = await loadPriorMutation(db, roomId, clientMutationId);
  if (prior) {
    return priorMutationResponse(prior, Number(room.revision), baseRevision);
  }

  let lastApplied = [];
  let lastRejected = [];
  let lastNeedPull = baseRevision < Number(room.revision);

  for (let attempt = 0; attempt < MUTATION_COMMIT_ATTEMPTS; attempt++) {
    const roomRow = await db
      .prepare('SELECT revision FROM rooms WHERE id = ?')
      .bind(roomId)
      .first();
    if (!roomRow) {
      throw new SyncError('not_found', 'Sala no encontrada.');
    }
    const expectedRevision = Number(roomRow.revision);
    lastNeedPull = baseRevision < expectedRevision;
    const { state } = await loadRoomState(env, db, roomId);
    const appliedResult = applyOps(state, ops);
    lastApplied = appliedResult.applied;
    lastRejected = appliedResult.rejected;
    const nextRevision = expectedRevision + 1;
    const committed = await commitMutationBatch(env, db, {
      roomId,
      expectedRevision,
      nextRevision,
      userId: user.id,
      clientMutationId,
      applied: lastApplied,
      nextState: appliedResult.state,
    });
    if (committed.ok) {
      return Response.json({
        revision: committed.revision,
        applied: lastApplied,
        rejected: lastRejected,
        needPull: lastNeedPull,
      });
    }
    if (committed.reason === 'duplicate_client') {
      const raced = await loadPriorMutation(db, roomId, clientMutationId);
      if (raced) {
        return priorMutationResponse(raced, nextRevision, baseRevision);
      }
    }
  }

  throw new SyncError(
    'revision_stale',
    'Otro dispositivo actualizó la sala al mismo tiempo. Reintenta tras sincronizar.'
  );
}

/** @param {Request} request @param {{ WORKER_DATA_KEY?: string }} env @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function handlePull(request, env, db, roomId) {
  await requireMember(db, request, roomId);
  const url = new URL(request.url);
  const since = Number(url.searchParams.get('since') ?? 0);

  const room = await db
    .prepare('SELECT revision FROM rooms WHERE id = ?')
    .bind(roomId)
    .first();
  if (!room) {
    throw new SyncError('not_found', 'Sala no encontrada.');
  }

  const revision = Number(room.revision);
  if (since >= revision) {
    return Response.json({ revision, ops: [] });
  }

  const gap = revision - since;
  // CRITICAL: check gap BEFORE selecting mutations. Loading 1000+ ops_json rows
  // (tens of MB) into the D1 isolate exceeds memory and resets the DB.
  if (shouldReturnSnapshotPull(gap)) {
    const { state } = await loadRoomState(env, db, roomId);
    return Response.json({
      revision,
      needSnapshot: true,
      state,
    });
  }

  const { results } = await db
    .prepare(
      `SELECT revision, ops_json FROM mutations
       WHERE room_id = ? AND revision > ?
       ORDER BY revision ASC`
    )
    .bind(roomId, since)
    .all();

  const rows = results ?? [];
  let cumulativeBytes = 0;
  /** @type {unknown[]} */
  const ops = [];
  for (const row of rows) {
    const chunk = String(row.ops_json || '[]');
    cumulativeBytes += new TextEncoder().encode(chunk).length;
    if (shouldReturnSnapshotPull(gap, cumulativeBytes)) {
      const { state } = await loadRoomState(env, db, roomId);
      return Response.json({
        revision,
        needSnapshot: true,
        state,
      });
    }
    const parsed = JSON.parse(chunk);
    if (Array.isArray(parsed)) ops.push(...parsed);
  }

  if (!ops.length && since < revision) {
    const { state } = await loadRoomState(env, db, roomId);
    return Response.json({
      revision,
      needSnapshot: true,
      state,
    });
  }

  return Response.json({ revision, ops });
}
