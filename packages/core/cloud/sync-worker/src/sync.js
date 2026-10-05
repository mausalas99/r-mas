import { ADMIN_ROLES } from './admin-roles.js';
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
  PULL_REVISION_GAP,
  shouldReturnSnapshotPull,
} from './pull-strategy.js';
import { QUOTAS } from './quotas.js';
import {
  checkMutationPushRateLimit,
  tryLegacyBulkLabBackfillAck,
  tryNoopMutationAck,
  validateMutationRequest,
} from './mutation-guard.mjs';
import { joinCoreState, planShardWrites } from './room-state-shard.js';
import { notifyRoomRevision } from './room-sync-notify.js';
import { sha256Hex } from './session.js';
import {
  filterRoomStateLabSidecarsForMobile,
  isLabSetWithinMobileHistoryWindow,
} from './mobile-lab-window.js';

/** Concurrent pushes race on (room_id, revision); retry with fresh revision. */
const MUTATION_COMMIT_ATTEMPTS = 5;

/**
 * A room member may push/pull their own room. An admin may push/pull ANY
 * room without a `room_members` row — same "admin sees every room" rule
 * already applied to reads in admin.js's handleRoomDetail/handleRoomMutations,
 * extended to writes so the Red tab's archive/delete actions (and any other
 * cross-sala admin action) work without first joining each sala.
 * @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request
 */
export async function requireMember(db, request, roomId, t = null) {
  const stmt = await memberStatement(db, request, roomId);
  const row = stmt ? await stmt.first() : null;
  t?.lap('auth');
  return memberFromRow(row);
}

/** Session, user, room and membership in one statement; null without a Bearer token. */
async function memberStatement(db, request, roomId) {
  // Same session rule as userFromAuthHeader.
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  return m
    ? db
        .prepare(
          `SELECT u.id, u.username, u.display_name, u.role, u.disabled, u.active_room_id,
                  r.id AS room_id, r.revision AS room_revision, r.storage_bytes AS room_storage_bytes,
                  EXISTS (SELECT 1 FROM room_members rm WHERE rm.room_id = r.id AND rm.user_id = u.id) AS is_member
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN rooms r ON r.id = ?
           WHERE s.token_hash = ? AND s.expires_at > ?`
        )
        .bind(roomId, await sha256Hex(m[1].trim()), new Date().toISOString())
    : null;
}

/** Same member/admin rule as before. */
function memberFromRow(row) {
  if (!row) {
    throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  }
  const { room_id, room_revision, room_storage_bytes, is_member, ...user } = row;
  if (room_id && (is_member || ADMIN_ROLES.has(user.role))) {
    return { user, room: { id: room_id, revision: room_revision, storage_bytes: room_storage_bytes } };
  }
  throw new SyncError('not_member', 'No eres miembro de esta sala.');
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
 * Core blob carries `patientsSharded`: rebuild the flat state from the
 * per-patient rows (schema 013). Without the marker these rows are ignored.
 */
async function joinPatientShards(env, db, roomId, core, results) {
  const shards = new Map();
  // What is stored right now, so a commit can write only shards whose JSON changed.
  const baseline = { coreJson: JSON.stringify(core), shardJson: new Map(), shardBytes: new Map() };
  for (const r of results ?? []) {
    const shard = await decodeRoomState(env, r.ciphertext, r.iv);
    shards.set(r.patient_id, shard);
    baseline.shardJson.set(r.patient_id, JSON.stringify(shard));
    baseline.shardBytes.set(r.patient_id, toUint8Array(r.ciphertext).length);
  }
  return { state: joinCoreState(core, shards), baseline };
}

/** D1 caps bound params at 100 per statement; patient-id IN lists stay under it. */
const LAB_FILTER_MAX_IDS = 90;

/**
 * Assemble the full RoomSyncState from the core row + per-patient legacy lab
 * shards + per-set lab shards. Callers never see the split — same flat shape
 * as before sharding.
 * @param {{ WORKER_DATA_KEY?: string }} env @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId
 * @param {{ skipLabShards?: boolean, labPatientIds?: string[], labsSince?: number, labsHave?: Set<string> }} [opts]
 *   `labsSince` + `labsHave`: catch-up snapshot read (see below).
 *   `labPatientIds`: read lab shards for these patients only (reported as
 *   `labsSkipped`, so callers take the lab total from rooms.storage_bytes).
 *   `skipLabShards`: skip the two shard
 *   tables entirely (no D1 read, no per-row AES-GCM decrypt) — for callers that
 *   only need `entries`/`entityVersions`/`clinicalOps` and never read
 *   `state.labSidecars`. `state.labSidecars` is left as whatever legacy data
 *   (if any) was embedded in the core blob, not the full sharded set.
 */
export async function loadRoomState(env, db, roomId, opts = {}) {
  const skipLabShards = !!opts.skipLabShards;
  // Core row and patient rows in ONE statement = one snapshot. Two separate
  // reads let a commit land between them (old core listing a patient whose row
  // is already the new tombstone): "Falta el paciente ..." 500s under a bulk
  // delete, seen on staging 2026-09-28.
  const { results: stateRows } = await db
    .prepare(
      `SELECT 'core' AS kind, '' AS patient_id, ciphertext, iv FROM room_state WHERE room_id = ?
       UNION ALL
       SELECT 'patient', patient_id, ciphertext, iv FROM room_state_patients WHERE room_id = ?`
    )
    .bind(roomId, roomId)
    .all();
  const row = (stateRows ?? []).find((r) => r.kind === 'core');
  const patientRows = (stateRows ?? []).filter((r) => r.kind === 'patient');
  if (!row) {
    throw new SyncError('not_found', 'Estado de sala no encontrado.');
  }
  let state = await decodeRoomState(env, row.ciphertext, row.iv);
  // Bytes held outside the lab shards at load time (core + patient rows).
  let coreBytesAtLoad = toUint8Array(row.ciphertext).length;
  /** @type {{ coreJson: string, shardJson: Map<string, string>, shardBytes: Map<string, number> } | null} */
  let shardBaseline = null;
  if (state?.patientsSharded) {
    const joined = await joinPatientShards(env, db, roomId, state, patientRows);
    state = joined.state;
    shardBaseline = joined.baseline;
    for (const bytes of joined.baseline.shardBytes.values()) coreBytesAtLoad += bytes;
  }
  // Legacy pre-shard rows still carry labSidecars embedded in the core blob.
  const legacyLabSidecars =
    state?.labSidecars && typeof state.labSidecars === 'object' ? state.labSidecars : {};
  state.labSidecars = { ...legacyLabSidecars };

  /** @type {Map<string, number>} stored byte length per legacy whole-patient row */
  const legacyShardBytes = new Map();
  /** @type {Map<string, Map<string, number>>} stored byte length per (patientId -> setId -> bytes) */
  const labSetBytes = new Map();

  if (skipLabShards) {
    return { state, legacyShardBytes, labSetBytes, coreBytesAtLoad, labsSkipped: true, shardBaseline };
  }

  // Push path: only the patients its ops touch. Reading every lab set of a big
  // room (~950 rows, 1.5 s) on every lab push overloaded D1 on 2026-10-05.
  let labIds = Array.isArray(opts.labPatientIds) ? opts.labPatientIds : null;
  let patientFilter = labIds ? ` AND patient_id IN (${labIds.map(() => '?').join(',')})` : '';
  let setFilter = patientFilter;
  let labBinds = labIds ? [roomId, ...labIds] : [roomId];
  let setBinds = labBinds;

  // Catch-up snapshot for a client at `labsSince` that already holds the
  // patients in `labsHave`: their sets written after `labsSince` (0 = written
  // before schema 014 went live, always sent), plus every set of the patients
  // it lacks. The client merges lab sets and never drops one it holds.
  const missing =
    opts.labsHave instanceof Set && Number(opts.labsSince) > 0
      ? (state.entries || []).map((e) => String(e?.id || '')).filter((id) => id && !opts.labsHave.has(id))
      : null;
  if (!labIds && missing && missing.length <= LAB_FILTER_MAX_IDS) {
    labIds = missing;
    const inList = `patient_id IN (${missing.map(() => '?').join(',')})`;
    patientFilter = ` AND ${inList}`;
    setFilter = ` AND (revision > ? OR revision = 0${missing.length ? ` OR ${inList}` : ''})`;
    labBinds = [roomId, ...missing];
    setBinds = [roomId, Number(opts.labsSince), ...missing];
  }

  // Whole-patient legacy shard rows (schema 008). Frozen: read here as a base
  // layer, never rewritten — a patient migrates one set at a time into
  // room_state_lab_sets below, only when that set is next touched.
  const { results: legacyRows } =
    labIds && !labIds.length
      ? { results: [] }
      : await db
          .prepare(`SELECT patient_id, ciphertext, iv FROM room_state_labs WHERE room_id = ?${patientFilter}`)
          .bind(...labBinds)
          .all();
  for (const shardRow of legacyRows ?? []) {
    state.labSidecars[shardRow.patient_id] = await decodeRoomState(
      env,
      shardRow.ciphertext,
      shardRow.iv
    );
    legacyShardBytes.set(shardRow.patient_id, toUint8Array(shardRow.ciphertext).length);
  }

  // Per-set shard rows (schema 010). One row per lab set — always bounded by
  // labMutationMaxBytes, never approaches the D1 row cap regardless of how
  // long a patient's history grows. Overrides legacy values for the same set.
  const { results: setRows } = await db
    .prepare(
      `SELECT patient_id, set_id, ciphertext, iv FROM room_state_lab_sets WHERE room_id = ?${setFilter}`
    )
    .bind(...setBinds)
    .all();
  for (const setRow of setRows ?? []) {
    const pid = setRow.patient_id;
    const sid = setRow.set_id;
    if (!state.labSidecars[pid] || typeof state.labSidecars[pid] !== 'object') {
      state.labSidecars[pid] = {};
    }
    state.labSidecars[pid][sid] = await decodeRoomState(env, setRow.ciphertext, setRow.iv);
    if (!labSetBytes.has(pid)) labSetBytes.set(pid, new Map());
    labSetBytes.get(pid).set(sid, toUint8Array(setRow.ciphertext).length);
  }

  return { state, legacyShardBytes, labSetBytes, coreBytesAtLoad, labsSkipped: !!labIds, shardBaseline };
}

/** @param {unknown[]} ops @returns {Array<{ patientId: string, setId: string }>} lab-sidecar ops */
function labSetOpsTouched(ops) {
  const touched = [];
  for (const op of ops || []) {
    const path = String(/** @type {{ path?: unknown }} */ (op)?.path || '');
    const m = /^labSidecars\/([^/]+)\/([^/]+)$/.exec(path);
    if (m) touched.push({ patientId: m[1], setId: m[2] });
  }
  return touched;
}

/** @param {unknown[]} ops @returns {Set<string>} patient ids fully removed (e.g. tombstone) */
function tombstonedPatientIds(ops) {
  const ids = new Set();
  for (const op of ops || []) {
    const path = String(/** @type {{ path?: unknown }} */ (op)?.path || '');
    const m = /^tombstones\/([^/]+)$/.exec(path);
    if (m) ids.add(m[1]);
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
    legacyShardBytes,
    labSetBytes,
    priorLabBytes,
    shardBaseline,
  } = opts;

  const { labSidecars: nextLabSidecars, ...coreState } = nextState;
  // Per-patient rows (schema 013) only when the flag is on. Off = the fat core
  // as before, without the `patientsSharded` marker, so the reader ignores any
  // shard rows left over from an earlier run (this is also the rollback path).
  const plan = env?.PATIENT_SHARD_WRITE === '1' ? planShardWrites(coreState, shardBaseline) : null;
  const { ciphertext, iv, storageBytes: coreBytes } = await encodeRoomState(
    env,
    plan ? plan.core : coreState
  );
  /** @type {Array<{ patientId: string, ciphertext: Uint8Array, iv: Uint8Array, storageBytes: number }>} */
  const patientWrites = [];
  let patientBytesTotal = 0;
  if (plan) {
    for (const [patientId, shard] of plan.shards) {
      if (plan.changed.has(patientId)) {
        const encoded = await encodeRoomState(env, shard);
        patientWrites.push({ patientId, ...encoded });
        patientBytesTotal += encoded.storageBytes;
      } else {
        patientBytesTotal += shardBaseline?.shardBytes?.get(patientId) || 0;
      }
    }
  }

  // Callers that pass real load-time byte maps (the production handleMutations
  // path, via loadRoomState) get accurate accounting. Callers that don't
  // (tests, interno flows that never touch labs) default to empty — safe,
  // since those callers also never touch labSidecars ops.
  const legacyBytes = legacyShardBytes instanceof Map ? legacyShardBytes : new Map();
  const setBytes = labSetBytes instanceof Map ? labSetBytes : new Map();

  // The exact ops the client sent ARE the exact write set — no need to guess
  // which patients changed by diffing whole blobs. Each op already names one
  // (patientId, setId) pair, so writes are always this small and bounded,
  // never a whole patient's history in one row.
  const tombPatientIds = tombstonedPatientIds(applied);
  const touchedSets = labSetOpsTouched(applied).filter((t) => !tombPatientIds.has(t.patientId));

  /** @type {Array<{ patientId: string, setId: string, ciphertext: Uint8Array, iv: Uint8Array, storageBytes: number }>} */
  const setWrites = [];
  let labBytesDelta = 0;
  for (const { patientId, setId } of touchedSets) {
    const value = nextLabSidecars?.[patientId]?.[setId];
    if (value === undefined) continue;
    const encoded = await encodeRoomState(env, value);
    if (encoded.storageBytes > QUOTAS.labShardMaxBytes) {
      throw new SyncError(
        'payload_too_large',
        `El resultado de labs superó el límite de tamaño (${QUOTAS.labShardMaxBytes} bytes).`
      );
    }
    setWrites.push({ patientId, setId, ...encoded });
    labBytesDelta += encoded.storageBytes - (setBytes.get(patientId)?.get(setId) || 0);
  }

  // Full-patient wipes (tombstone): drop the legacy row's cached bytes plus
  // every known set row's bytes for that patient from the running total.
  for (const patientId of tombPatientIds) {
    labBytesDelta -= legacyBytes.get(patientId) || 0;
    const perSet = setBytes.get(patientId);
    if (perSet) for (const bytes of perSet.values()) labBytesDelta -= bytes;
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
  for (const w of setWrites) batchRawBytes += w.storageBytes;
  for (const w of patientWrites) batchRawBytes += w.storageBytes;
  if (batchRawBytes > QUOTAS.batchRawBytes) {
    throw new SyncError(
      'payload_too_large',
      `El cambio es demasiado grande para enviarse en un solo paso (${QUOTAS.batchRawBytes} bytes).`
    );
  }

  let labTotalBytesAtLoad = 0;
  for (const bytes of legacyBytes.values()) labTotalBytesAtLoad += bytes;
  for (const perSet of setBytes.values()) {
    for (const bytes of perSet.values()) labTotalBytesAtLoad += bytes;
  }
  // Pushes without lab ops skip the lab shards, so the maps are empty and the
  // total would drop to core-only. The caller passes the lab bytes it derived
  // from rooms.storage_bytes instead.
  if (Number.isFinite(priorLabBytes)) labTotalBytesAtLoad = priorLabBytes;
  const storageBytes = coreBytes + patientBytesTotal + labTotalBytesAtLoad + labBytesDelta;
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
    ];
    if (!plan || plan.coreChanged) {
      statements.push(
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
          )
      );
    }
    if (plan?.firstSplit) {
      statements.push(
        db
          .prepare(
            `DELETE FROM room_state_patients WHERE room_id = ?
             AND EXISTS (
               SELECT 1 FROM mutations
               WHERE room_id = ? AND client_mutation_id = ? AND revision = ?
             )`
          )
          .bind(roomId, roomId, clientMutationId, nextRevision)
      );
    }
    for (const w of patientWrites) {
      statements.push(
        db
          .prepare(
            `INSERT OR REPLACE INTO room_state_patients (room_id, patient_id, ciphertext, iv, updated_at)
             SELECT ?, ?, ?, ?, ?
             FROM mutations WHERE room_id = ? AND client_mutation_id = ? AND revision = ?`
          )
          .bind(roomId, w.patientId, w.ciphertext, w.iv, now, roomId, clientMutationId, nextRevision)
      );
    }
    for (const patientId of plan?.removed ?? []) {
      statements.push(
        db
          .prepare(
            `DELETE FROM room_state_patients WHERE room_id = ? AND patient_id = ?
             AND EXISTS (
               SELECT 1 FROM mutations
               WHERE room_id = ? AND client_mutation_id = ? AND revision = ?
             )`
          )
          .bind(roomId, patientId, roomId, clientMutationId, nextRevision)
      );
    }
    for (const w of setWrites) {
      statements.push(
        db
          .prepare(
            `INSERT OR REPLACE INTO room_state_lab_sets (room_id, patient_id, set_id, ciphertext, iv, updated_at, revision)
             SELECT ?, ?, ?, ?, ?, ?, ?
             FROM mutations WHERE room_id = ? AND client_mutation_id = ? AND revision = ?`
          )
          .bind(
            roomId,
            w.patientId,
            w.setId,
            w.ciphertext,
            w.iv,
            now,
            nextRevision,
            roomId,
            clientMutationId,
            nextRevision
          )
      );
    }
    for (const patientId of tombPatientIds) {
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
      statements.push(
        db
          .prepare(
            `DELETE FROM room_state_lab_sets WHERE room_id = ? AND patient_id = ?
             AND EXISTS (
               SELECT 1 FROM mutations
               WHERE room_id = ? AND client_mutation_id = ? AND revision = ?
             )`
          )
          .bind(roomId, patientId, roomId, clientMutationId, nextRevision)
      );
    }
    // Drop ops history outside the incremental window — unbounded mutations OOMs D1 pull.
    // In the batch (no extra round trip), gated like the lab deletes: only when
    // this commit's own mutation row went in.
    const pruneAt = mutationPruneCeiling(nextRevision);
    if (pruneAt > 0) {
      statements.push(
        db
          .prepare(
            `DELETE FROM mutations WHERE room_id = ? AND revision <= ?
             AND EXISTS (
               SELECT 1 FROM mutations
               WHERE room_id = ? AND client_mutation_id = ? AND revision = ?
             )`
          )
          .bind(roomId, pruneAt, roomId, clientMutationId, nextRevision)
      );
    }
    const results = await db.batch(statements);
    opts.t?.lap('commit');
    const inserted = Number(results?.[0]?.meta?.changes ?? 0);
    const bumped = Number(results?.[1]?.meta?.changes ?? 0);
    if (inserted !== 1 || bumped !== 1) return { ok: false, reason: 'stale' };
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
export async function handleSync(request, env, roomId, sub, ctx) {
  const t = stepTimer(env);
  const res = await handleSyncRoute(request, env, roomId, sub, t, ctx);
  if (t) res.headers.set('Server-Timing', t.header());
  return res;
}

// perf (temporary, scripts/perf/sync-timing.mjs): SYNC_TIMING=1 in .dev.vars
// adds a Server-Timing header with per-step ms. Remove after the speed work.
function stepTimer(env) {
  if (String(env?.SYNC_TIMING || '') !== '1') return null;
  const t0 = performance.now();
  let last = t0;
  const parts = [];
  return {
    lap(name) {
      const now = performance.now();
      parts.push(`${name};dur=${(now - last).toFixed(2)}`);
      last = now;
    },
    header: () => [...parts, `total;dur=${(performance.now() - t0).toFixed(2)}`].join(', '),
  };
}

async function handleSyncRoute(request, env, roomId, sub, t, ctx) {
  const db = env.DB;
  if (!db) {
    throw new SyncError('error', 'Base de datos no configurada.');
  }

  if (sub === 'mutations') {
    if (request.method !== 'POST') {
      throw new SyncError('not_found', 'Método no permitido.');
    }
    return handleMutations(request, env, db, roomId, t, ctx);
  }

  if (sub === 'pull') {
    if (request.method !== 'GET') {
      throw new SyncError('not_found', 'Método no permitido.');
    }
    return handlePull(request, env, db, roomId, t);
  }

  throw new SyncError('not_found', 'Ruta de sync no encontrada.');
}

/** @param {Request} request @param {{ WORKER_DATA_KEY?: string }} env @param {import('@cloudflare/workers-types').D1Database} db @param {string} roomId */
async function handleMutations(request, env, db, roomId, t = null, ctx = undefined) {
  checkMutationPushRateLimit(roomId);
  const { user, room } = await requireMember(db, request, roomId, t);
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

  let lastApplied = [];
  let lastRejected = [];
  let lastNeedPull = baseRevision < Number(room.revision);

  // Pure over the client-sent ops, same on every retry attempt — hoisted out
  // of the loop. Most pushes (signos/eventualidades/notes) touch no lab data
  // at all, so skip the room's full lab-ciphertext fetch for them: reading
  // every patient's lab history on every push does not scale past a handful
  // of patients, and once the room's total ciphertext gets big enough D1's
  // own RPC (BLOBs go over the wire as JSON digit-lists) fails outright with
  // a "Failed to parse body as JSON" error whose message IS that huge dump.
  const { lwwOps, sidecarOps } = partitionSyncOps(ops);
  const hasLabSidecarOps = lwwOps.some((op) => String(op?.path || '').startsWith('labSidecars/'));
  // Lab bytes per patient the commit diffs: touched sets + tombstoned patients.
  const labPatientIds = [
    ...new Set([
      ...labSetOpsTouched(lwwOps).map((s) => s.patientId),
      ...tombstonedPatientIds(lwwOps),
    ]),
  ];
  // A bigger bulk push falls back to the full read (D1 bound-param cap).
  const labLoadOpts = {
    skipLabShards: !hasLabSidecarOps,
    labPatientIds: labPatientIds.length <= LAB_FILTER_MAX_IDS ? labPatientIds : undefined,
  };

  // Replay of a committed clientMutationId (lost ack): no upfront read. The
  // UNIQUE (room_id, client_mutation_id) index fails the commit batch as
  // 'duplicate_client', answered below from the prior row. Two paths never
  // reach a commit, so they still look first: sidecar ops (written before
  // the commit) and a push whose ops are all no-ops now.
  const replayResponse = async (roomRevision) => {
    const prior = await loadPriorMutation(db, roomId, clientMutationId);
    return prior ? priorMutationResponse(env, prior, roomRevision, baseRevision) : null;
  };
  if (sidecarOps.length) {
    const replay = await replayResponse(Number(room.revision));
    if (replay) return replay;
  }

  for (let attempt = 0; attempt < MUTATION_COMMIT_ATTEMPTS; attempt++) {
    // First attempt reuses the row requireMember just read. If it is stale the
    // gated commit fails and the next attempt re-reads.
    const roomRow =
      attempt === 0
        ? room
        : await db
            .prepare('SELECT revision, storage_bytes FROM rooms WHERE id = ?')
            .bind(roomId)
            .first();
    if (!roomRow) {
      throw new SyncError('not_found', 'Sala no encontrada.');
    }
    const expectedRevision = Number(roomRow.revision);
    lastNeedPull = baseRevision < expectedRevision;
    const { state, legacyShardBytes, labSetBytes, coreBytesAtLoad, labsSkipped, shardBaseline } =
      await loadRoomState(env, db, roomId, labLoadOpts);
    t?.lap('load');
    // Lab shards were not read (or only some patients): their size is whatever
    // the last total held beyond the old core blob.
    const priorLabBytes = labsSkipped
      ? Math.max(0, Number(roomRow.storage_bytes || 0) - coreBytesAtLoad)
      : undefined;
    const appliedResult = applyOps(state, lwwOps);
    /** @type {unknown[]} */
    const sidecarApplied = [];
    for (let i = 0; i < sidecarOps.length; i += 1) {
      sidecarApplied.push(await applyInternoAccessUpsert(db, roomId, sidecarOps[i]));
    }
    lastApplied = [...appliedResult.applied, ...sidecarApplied];
    lastRejected = appliedResult.rejected;
    t?.lap('apply');
    const noopAck = tryNoopMutationAck(
      lastApplied,
      lastRejected,
      expectedRevision,
      baseRevision
    );
    if (noopAck) return (await replayResponse(expectedRevision)) || noopAck;
    const nextRevision = expectedRevision + 1;
    const committed = await commitMutationBatch(env, db, {
      roomId,
      expectedRevision,
      nextRevision,
      userId: user.id,
      clientMutationId,
      applied: lastApplied,
      nextState: appliedResult.state,
      legacyShardBytes,
      labSetBytes,
      priorLabBytes,
      shardBaseline,
      t,
    });
    if (committed.ok) {
      // appliedResult.applied only — not sidecarApplied (internoAccessUpsert rows
      // aren't {path,value} LWW ops the client's ops-apply path understands).
      // Off the response path when the runtime gives a ctx: the commit is
      // already durable and the ack does not depend on the broadcast.
      await notifyRoomRevision(env, roomId, committed.revision, appliedResult.applied, ctx);
      t?.lap('notify');
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
        // Committed before our room read = a replay: answer at that revision,
        // as the old upfront check did. Otherwise a concurrent twin won.
        const at = Number(raced.revision) <= expectedRevision ? expectedRevision : nextRevision;
        return priorMutationResponse(env, raced, at, baseRevision);
      }
    }
  }

  throw new SyncError(
    'revision_stale',
    'Otro dispositivo actualizó la sala al mismo tiempo. Reintenta tras sincronizar.'
  );
}

/**
 * Rollback tool for the per-patient split (schema 013): write the room back as
 * one fat core blob without the `patientsSharded` marker and drop its patient
 * rows. Set PATIENT_SHARD_WRITE=0 first, or the next push splits it again.
 * Gated on the revision it read, so a push that lands in between makes this
 * retry instead of overwriting it. Rooms that were never split are left alone.
 * @returns {Promise<{ changed: boolean }>}
 */
export async function refattenRoomCore(env, db, roomId) {
  for (let attempt = 0; attempt < MUTATION_COMMIT_ATTEMPTS; attempt += 1) {
    const roomRow = await db
      .prepare('SELECT revision, storage_bytes FROM rooms WHERE id = ?')
      .bind(roomId)
      .first();
    if (!roomRow) throw new SyncError('not_found', 'Sala no encontrada.');
    const revision = Number(roomRow.revision);
    const { state, coreBytesAtLoad, shardBaseline } = await loadRoomState(env, db, roomId, {
      skipLabShards: true,
    });
    if (!shardBaseline) return { changed: false };
    const { labSidecars: _labs, ...coreState } = state;
    const { ciphertext, iv, storageBytes } = await encodeRoomState(env, coreState);
    if (storageBytes > QUOTAS.batchRawBytes) {
      throw new SyncError(
        'payload_too_large',
        `La sala es demasiado grande para volver a un solo bloque (${QUOTAS.batchRawBytes} bytes).`
      );
    }
    const labBytes = Math.max(0, Number(roomRow.storage_bytes || 0) - coreBytesAtLoad);
    const now = new Date().toISOString();
    const gate = 'EXISTS (SELECT 1 FROM rooms WHERE id = ? AND revision = ?)';
    const results = await db.batch([
      db
        .prepare(
          `UPDATE room_state SET ciphertext = ?, iv = ?, updated_at = ? WHERE room_id = ? AND ${gate}`
        )
        .bind(ciphertext, iv, now, roomId, roomId, revision),
      db
        .prepare(`DELETE FROM room_state_patients WHERE room_id = ? AND ${gate}`)
        .bind(roomId, roomId, revision),
      db
        .prepare('UPDATE rooms SET storage_bytes = ? WHERE id = ? AND revision = ?')
        .bind(storageBytes + labBytes, roomId, revision),
    ]);
    if (Number(results?.[0]?.meta?.changes ?? 0) === 1) return { changed: true };
  }
  throw new SyncError(
    'revision_stale',
    'Otro dispositivo actualizó la sala al mismo tiempo. Reintenta.'
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
async function handlePull(request, env, db, roomId, t = null) {
  const url = new URL(request.url);
  const since = Number(url.searchParams.get('since') ?? 0);
  const mobileLabWindow = isMobileLabPullRequest(url);
  // Newer clients list the patient ids they hold; a catch-up snapshot then
  // sends only lab sets written after `since` plus all labs of the patients
  // they lack. Old clients (no param) keep the full snapshot.
  const labsHaveParam = url.searchParams.get('labsHave');
  const snapshotOpts =
    labsHaveParam !== null && since > 0
      ? { labsSince: since, labsHave: new Set(labsHaveParam.split(',').filter(Boolean)) }
      : {};
  const authStmt = await memberStatement(db, request, roomId);
  if (!authStmt) memberFromRow(null);
  // The mutations select rides in the auth batch: one trip, one snapshot.
  // Nothing from it is used unless auth passes. It stops at the revision the
  // batch sees and returns nothing past the snapshot gap, so a big gap never
  // loads a big history into the D1 isolate.
  const [authRes, mutationsRes] = await db.batch([
    authStmt,
    db
      .prepare(
        `SELECT revision, ops_json, ciphertext, iv FROM mutations
         WHERE room_id = ? AND revision > ?
           AND revision <= (SELECT revision FROM rooms WHERE id = ?)
           AND (SELECT revision FROM rooms WHERE id = ?) - ? <= ?
         ORDER BY revision ASC`
      )
      .bind(roomId, since, roomId, roomId, since, PULL_REVISION_GAP),
  ]);
  t?.lap('auth');
  const { room } = memberFromRow(authRes?.results?.[0] ?? null);

  const revision = Number(room.revision);
  if (since >= revision) {
    return Response.json({ revision, ops: [] });
  }

  const gap = revision - since;
  // CRITICAL: check gap BEFORE selecting mutations. Loading 1000+ ops_json rows
  // (tens of MB) into the D1 isolate exceeds memory and resets the DB.
  if (shouldReturnSnapshotPull(gap)) {
    const { state } = await loadRoomState(env, db, roomId, snapshotOpts);
    const payload = mobileLabWindow ? filterRoomStateLabSidecarsForMobile(state) : state;
    return Response.json({
      revision,
      needSnapshot: true,
      state: payload,
    });
  }

  const rows = mutationsRes?.results ?? [];
  let cumulativeBytes = 0;
  /** @type {unknown[]} */
  const ops = [];
  for (const row of rows) {
    cumulativeBytes += row.ciphertext
      ? toUint8Array(row.ciphertext).length
      : new TextEncoder().encode(String(row.ops_json || '[]')).length;
    if (shouldReturnSnapshotPull(gap, cumulativeBytes)) {
      const { state } = await loadRoomState(env, db, roomId, snapshotOpts);
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
    const { state } = await loadRoomState(env, db, roomId, snapshotOpts);
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
