import { decodeRoomState, encodeRoomState, toUint8Array } from './crypto-at-rest.js';
import { d1UniqueConstraintTarget, isD1UniqueConstraintError } from './d1-errors.js';
import { SyncError } from './errors.js';
import {
  applyInternoAccessUpsert,
  isInternoAccessUpsertOp,
  partitionSyncOps,
} from './interno-access-sidecar.js';
import { applyOps } from './lww.js';
import {
  mutationPruneCeiling,
  shouldReturnSnapshotPull,
} from './pull-strategy.js';
import { QUOTAS } from './quotas.js';
import {
  checkMutationPushRateLimit,
  tryLegacyBulkLabBackfillAck,
  tryNoopMutationAck,
  validateMutationRequest,
} from './mutation-guard.mjs';
import { notifyRoomRevision } from './room-sync-notify.js';
import { userFromAuthHeader } from './session.js';
import {
  filterRoomStateLabSidecarsForMobile,
  isLabSetWithinMobileHistoryWindow,
} from './mobile-lab-window.js';

/** Concurrent pushes race on (room_id, revision); retry with fresh revision. */
const MUTATION_COMMIT_ATTEMPTS = 5;

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
export function validateOpsSize(ops) {
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new SyncError('invalid_request', 'Se requiere al menos una operación.');
  }
  for (const op of ops) {
    const path = String(op?.path || '');
    const isSidecar = isInternoAccessUpsertOp(op);
    const payload = isSidecar ? JSON.stringify(op) : JSON.stringify(op?.value ?? null);
    const bytes = new TextEncoder().encode(payload).length;
    const isLab = path.startsWith('labSidecars/');
    const max = isLab ? QUOTAS.labMutationMaxBytes : QUOTAS.noteMaxBytes;
    if (bytes > max) {
      throw new SyncError(
        'payload_too_large',
        `Operación demasiado grande para ${isSidecar ? 'internoAccessUpsert' : path} (máx. ${max} bytes).`
      );
    }
  }
}

/**
 * Assemble the full RoomSyncState from the core row + per-patient lab shards.
 * Callers never see the split — same flat shape as before sharding.
 * @param {{ WORKER_DATA_KEY?: string }} env @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId
 */
export async function loadRoomState(env, db, roomId) {
  const row = await db
    .prepare('SELECT ciphertext, iv FROM room_state WHERE room_id = ?')
    .bind(roomId)
    .first();
  if (!row) {
    throw new SyncError('not_found', 'Estado de sala no encontrado.');
  }
  const state = await decodeRoomState(env, row.ciphertext, row.iv);
  // Legacy pre-shard rows still carry labSidecars embedded in the core blob.
  const legacyLabSidecars =
    state?.labSidecars && typeof state.labSidecars === 'object' ? state.labSidecars : {};
  state.labSidecars = { ...legacyLabSidecars };

  const { results } = await db
    .prepare('SELECT patient_id, ciphertext, iv FROM room_state_labs WHERE room_id = ?')
    .bind(roomId)
    .all();
  /** @type {Set<string>} patient ids that already have their own shard row */
  const shardedPatientIds = new Set();
  /** @type {Map<string, number>} stored ciphertext byte length per sharded patient */
  const shardStorageBytes = new Map();
  for (const shardRow of results ?? []) {
    state.labSidecars[shardRow.patient_id] = await decodeRoomState(
      env,
      shardRow.ciphertext,
      shardRow.iv
    );
    shardedPatientIds.add(shardRow.patient_id);
    shardStorageBytes.set(shardRow.patient_id, toUint8Array(shardRow.ciphertext).length);
  }
  return { state, shardedPatientIds, shardStorageBytes };
}

/** @param {unknown[]} applied patient ids whose lab data this mutation's ops actually touch */
function patientIdsTouchedByOps(applied) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const op of applied || []) {
    const path = String(/** @type {{ path?: unknown }} */ (op)?.path || '');
    const lab = /^labSidecars\/([^/]+)\//.exec(path);
    if (lab) {
      ids.add(lab[1]);
      continue;
    }
    const tomb = /^tombstones\/([^/]+)$/.exec(path);
    if (tomb) ids.add(tomb[1]);
  }
  return ids;
}

/**
 * Atomically bump revision + append mutation + persist room snapshot (JSON on Free).
 * Every write is gated on `rooms.revision = expected` so a lost race leaves no partial commit
 * (INSERT/UPDATE with 0 changes — not a UNIQUE blast that only sometimes rolls back).
 * @returns {Promise<{ ok: true, revision: number } | { ok: false, reason: 'stale' | 'duplicate_client' }>}
 */
export async function commitMutationBatch(env, db, opts) {
  const {
    roomId,
    expectedRevision,
    nextRevision,
    userId,
    clientMutationId,
    applied,
    nextState,
    previousLabSidecars,
    shardedPatientIds,
    shardStorageBytes,
  } = opts;

  const { labSidecars: nextLabSidecars, ...coreState } = nextState;
  const { ciphertext, iv, storageBytes: coreBytes } = await encodeRoomState(env, coreState);

  // Callers that already know which patients have their own shard row (the
  // real handleMutations path, via loadRoomState) let us rewrite ONLY the
  // shards this mutation actually touched. Callers that don't (tests, or a
  // room not yet self-migrated) fall back to the old full-union behavior.
  const hasShardInfo = shardedPatientIds !== undefined;
  const knownShardIds =
    shardedPatientIds instanceof Set ? shardedPatientIds : new Set(shardedPatientIds || []);
  const storedShardBytes =
    shardStorageBytes instanceof Map
      ? shardStorageBytes
      : new Map(Object.entries(shardStorageBytes || {}));

  const candidateIds = hasShardInfo
    ? new Set([
        ...patientIdsTouchedByOps(applied),
        ...Object.keys(nextLabSidecars || {}).filter((pid) => !knownShardIds.has(pid)),
      ])
    : new Set([
        ...Object.keys(nextLabSidecars || {}),
        ...Object.keys(previousLabSidecars || {}),
      ]);

  /** @type {Map<string, { ciphertext: Uint8Array, iv: Uint8Array, storageBytes: number }>} */
  const labShards = new Map();
  /** @type {Set<string>} */
  const labShardDeletes = new Set();
  for (const patientId of candidateIds) {
    const sets = nextLabSidecars?.[patientId];
    if (!sets || typeof sets !== 'object' || Object.keys(sets).length === 0) {
      labShardDeletes.add(patientId);
      continue;
    }
    const shard = await encodeRoomState(env, sets);
    if (shard.storageBytes > QUOTAS.labShardMaxBytes) {
      throw new SyncError(
        'payload_too_large',
        `El historial de labs del paciente superó el límite por sala (${QUOTAS.labShardMaxBytes} bytes).`
      );
    }
    labShards.set(patientId, shard);
  }

  const now = new Date().toISOString();
  const { ciphertext: opsCiphertext, iv: opsIv, storageBytes: opsBytes } = await encodeRoomState(
    env,
    applied
  );

  // Guard the actual db.batch() payload — D1 sends BLOB params over Workers
  // RPC as a JSON digit-list, not raw bytes, so 32MiB of serialized RPC
  // corresponds to a much smaller raw-byte budget. Checking coreBytes +
  // written shards + ops here (not storageHardBytes, which covers the
  // whole room) is what actually protects this call.
  let batchRawBytes = coreBytes + opsBytes;
  for (const shard of labShards.values()) batchRawBytes += shard.storageBytes;
  if (batchRawBytes > QUOTAS.batchRawBytes) {
    throw new SyncError(
      'payload_too_large',
      `El cambio es demasiado grande para enviarse en un solo paso (${QUOTAS.batchRawBytes} bytes).`
    );
  }

  const allShardIds = hasShardInfo
    ? new Set([...knownShardIds, ...labShards.keys()])
    : new Set(labShards.keys());
  let labTotalBytes = 0;
  for (const patientId of allShardIds) {
    if (labShardDeletes.has(patientId)) continue;
    const shard = labShards.get(patientId);
    labTotalBytes += shard ? shard.storageBytes : storedShardBytes.get(patientId) ?? 0;
  }
  const storageBytes = coreBytes + labTotalBytes;
  if (storageBytes > QUOTAS.storageHardBytes) {
    throw new SyncError(
      'payload_too_large',
      `La sala superó el límite de almacenamiento (${QUOTAS.storageHardBytes} bytes).`
    );
  }

  try {
    const statements = [
      db
        .prepare(
          `INSERT INTO mutations (room_id, revision, client_mutation_id, actor_id, ops_json, ciphertext, iv, created_at)
           SELECT ?, ?, ?, ?, ?, ?, ?, ?
           FROM rooms WHERE id = ? AND revision = ?`
        )
        .bind(
          roomId,
          nextRevision,
          clientMutationId,
          userId,
          '',
          opsCiphertext,
          opsIv,
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
          ciphertext,
          iv,
          now,
          roomId,
          roomId,
          clientMutationId,
          nextRevision
        ),
    ];
    for (const [patientId, shard] of labShards) {
      statements.push(
        db
          .prepare(
            `INSERT OR REPLACE INTO room_state_labs (room_id, patient_id, ciphertext, iv, updated_at)
             SELECT ?, ?, ?, ?, ?
             FROM mutations WHERE room_id = ? AND client_mutation_id = ? AND revision = ?`
          )
          .bind(
            roomId,
            patientId,
            shard.ciphertext,
            shard.iv,
            now,
            roomId,
            clientMutationId,
            nextRevision
          )
      );
    }
    for (const patientId of labShardDeletes) {
      statements.push(
        db
          .prepare(
            `DELETE FROM room_state_labs WHERE room_id = ? AND patient_id = ?
             AND EXISTS (
               SELECT 1 FROM mutations
               WHERE room_id = ? AND client_mutation_id = ? AND revision = ?
             )`
          )
          .bind(roomId, patientId, roomId, clientMutationId, nextRevision)
      );
    }
    const results = await db.batch(statements);
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
      `SELECT revision, ops_json, ciphertext, iv FROM mutations
       WHERE room_id = ? AND client_mutation_id = ?`
    )
    .bind(roomId, clientMutationId)
    .first();
}

/**
 * mutations rows written before schema 009 kept ops as plaintext ops_json.
 * Rows written after have empty ops_json and real ops in ciphertext/iv.
 * @param {{ WORKER_DATA_KEY?: string }} env @param {{ ops_json?: unknown, ciphertext?: unknown, iv?: unknown }} row
 */
async function decodeMutationOps(env, row) {
  if (row?.ciphertext) return decodeRoomState(env, row.ciphertext, row.iv);
  return JSON.parse(String(row?.ops_json || '[]'));
}

/** @param {{ WORKER_DATA_KEY?: string }} env @param {unknown} prior @param {number} roomRevision @param {number} baseRevision */
async function priorMutationResponse(env, prior, roomRevision, baseRevision) {
  const priorOps = await decodeMutationOps(env, prior);
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
  checkMutationPushRateLimit(roomId);
  const { user, room } = await requireMember(db, request, roomId);
  const bodyText = await request.text();
  const bodyBytes = new TextEncoder().encode(bodyText).length;
  /** @type {Record<string, unknown>} */
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
  const clientMutationId = String(body?.clientMutationId || '').trim();
  const baseRevision = Number(body?.baseRevision ?? 0);
  const ops = body?.ops;

  if (!clientMutationId) {
    throw new SyncError('invalid_request', 'clientMutationId requerido.');
  }

  const legacyAck = tryLegacyBulkLabBackfillAck(
    clientMutationId,
    ops,
    Number(room.revision),
    baseRevision
  );
  if (legacyAck) return legacyAck;

  validateMutationRequest(body, bodyBytes);
  validateOpsSize(ops);

  const prior = await loadPriorMutation(db, roomId, clientMutationId);
  if (prior) {
    return priorMutationResponse(env, prior, Number(room.revision), baseRevision);
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
    const { state, shardedPatientIds, shardStorageBytes } = await loadRoomState(env, db, roomId);
    const { lwwOps, sidecarOps } = partitionSyncOps(ops);
    const appliedResult = applyOps(state, lwwOps);
    /** @type {unknown[]} */
    const sidecarApplied = [];
    for (let i = 0; i < sidecarOps.length; i += 1) {
      sidecarApplied.push(await applyInternoAccessUpsert(db, roomId, sidecarOps[i]));
    }
    lastApplied = [...appliedResult.applied, ...sidecarApplied];
    lastRejected = appliedResult.rejected;
    const noopAck = tryNoopMutationAck(
      lastApplied,
      lastRejected,
      expectedRevision,
      baseRevision
    );
    if (noopAck) return noopAck;
    const nextRevision = expectedRevision + 1;
    const committed = await commitMutationBatch(env, db, {
      roomId,
      expectedRevision,
      nextRevision,
      userId: user.id,
      clientMutationId,
      applied: lastApplied,
      nextState: appliedResult.state,
      previousLabSidecars: state.labSidecars,
      shardedPatientIds,
      shardStorageBytes,
    });
    if (committed.ok) {
      await notifyRoomRevision(env, roomId, committed.revision);
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
        return priorMutationResponse(env, raced, nextRevision, baseRevision);
      }
    }
  }

  throw new SyncError(
    'revision_stale',
    'Otro dispositivo actualizó la sala al mismo tiempo. Reintenta tras sincronizar.'
  );
}

/** @param {URL} url */
function isMobileLabPullRequest(url) {
  return url.searchParams.get('mobile') === '1';
}

/** @param {unknown[]} ops @param {Date} now */
function filterPullOpsForMobileLabWindow(ops, now) {
  if (!Array.isArray(ops)) return ops;
  return ops.filter((op) => {
    const path = String(op?.path || '');
    if (!path.startsWith('labSidecars/')) return true;
    return isLabSetWithinMobileHistoryWindow(op?.value, now);
  });
}

/** @param {Request} request @param {{ WORKER_DATA_KEY?: string }} env @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function handlePull(request, env, db, roomId) {
  await requireMember(db, request, roomId);
  const url = new URL(request.url);
  const since = Number(url.searchParams.get('since') ?? 0);
  const mobileLabWindow = isMobileLabPullRequest(url);

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
    const payload = mobileLabWindow ? filterRoomStateLabSidecarsForMobile(state) : state;
    return Response.json({
      revision,
      needSnapshot: true,
      state: payload,
    });
  }

  const { results } = await db
    .prepare(
      `SELECT revision, ops_json, ciphertext, iv FROM mutations
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
    cumulativeBytes += row.ciphertext
      ? toUint8Array(row.ciphertext).length
      : new TextEncoder().encode(String(row.ops_json || '[]')).length;
    if (shouldReturnSnapshotPull(gap, cumulativeBytes)) {
      const { state } = await loadRoomState(env, db, roomId);
      const payload = mobileLabWindow ? filterRoomStateLabSidecarsForMobile(state) : state;
      return Response.json({
        revision,
        needSnapshot: true,
        state: payload,
      });
    }
    const parsed = await decodeMutationOps(env, row);
    if (Array.isArray(parsed)) ops.push(...parsed);
  }

  if (!ops.length && since < revision) {
    const { state } = await loadRoomState(env, db, roomId);
    const payload = mobileLabWindow ? filterRoomStateLabSidecarsForMobile(state) : state;
    return Response.json({
      revision,
      needSnapshot: true,
      state: payload,
    });
  }

  const outOps = mobileLabWindow ? filterPullOpsForMobileLabWindow(ops) : ops;
  return Response.json({ revision, ops: outOps });
}
