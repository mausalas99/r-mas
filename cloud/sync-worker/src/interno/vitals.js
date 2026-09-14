import { applyOps } from '../lww.js';
import { commitMutationBatch, loadRoomState as loadSyncRoomState } from '../sync.js';
import { assertInternoPatientOnBoard, readInternoRelayBoard } from './board.js';
import { resolveRoomForSala } from './room-resolve.js';

const VITALS_RATE_WINDOW_MS = 60_000;
const VITALS_RATE_MAX = 60;

/** @type {Map<string, { start: number, count: number }>} */
const vitalsBuckets = new Map();

/** Visible for tests. */
export function resetVitalsRateLimitsForTests() {
  vitalsBuckets.clear();
}

/** @param {Request} request @param {string} token */
export function checkVitalsRateLimit(request, token) {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local';
  const key = `${ip}:${token}`;
  const now = Date.now();
  let bucket = vitalsBuckets.get(key);
  if (!bucket || now - bucket.start >= VITALS_RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    vitalsBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= VITALS_RATE_MAX;
}

/**
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} roomId
 * @param {import('../lww.js').SyncOp[]} ops
 * @param {string} actorId
 * @param {string} clientMutationId
 */
async function commitInternoVitalsOps(env, db, roomId, ops, actorId, clientMutationId) {
  const MUTATION_COMMIT_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MUTATION_COMMIT_ATTEMPTS; attempt += 1) {
    const roomRow = await db
      .prepare('SELECT revision FROM rooms WHERE id = ?')
      .bind(roomId)
      .first();
    if (!roomRow) return { error: 'room_not_found' };
    const expectedRevision = Number(roomRow.revision);
    const freshState = await loadSyncRoomState(env, db, roomId);
    const appliedResult = applyOps(freshState.state, ops);
    if (!appliedResult.applied.length) return { error: 'apply_failed' };
    const nextRevision = expectedRevision + 1;
    const committed = await commitMutationBatch(env, db, {
      roomId,
      expectedRevision,
      nextRevision,
      userId: actorId,
      clientMutationId,
      applied: appliedResult.applied,
      nextState: appliedResult.state,
      legacyShardBytes: freshState.legacyShardBytes,
      labSetBytes: freshState.labSetBytes,
    });
    if (committed.ok) {
      return { ok: true, version: nextRevision };
    }
    if (committed.reason === 'duplicate_client') {
      return { ok: true, version: expectedRevision };
    }
  }
  return { error: 'conflict' };
}

/**
 * The phone builds and encrypts the medición itself (it holds the Interno
 * subkey, the Worker never does) and submits the finished envelope. The Worker
 * applies it as an opaque LWW replace — cloud/sync-worker/src/lww.js already
 * treats any enc:1 monitoreo value this way, so no merge/decrypt happens here.
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 * @param {string} patientId
 * @param {{ monitoreoEnvelope?: unknown, medicionId?: string }} body
 */
export async function applyInternoVitals(env, db, sala, patientId, body) {
  const scope = await assertInternoPatientOnBoard(env, db, sala, patientId);
  if (scope.error) return scope.error;

  const monitoreoEnvelope = body?.monitoreoEnvelope;
  if (!monitoreoEnvelope || typeof monitoreoEnvelope !== 'object') {
    return Response.json({ error: 'empty_medicion' }, { status: 400 });
  }
  const medicionId = String(body?.medicionId || '').trim();
  if (!medicionId) {
    return Response.json({ error: 'medicion_id_required' }, { status: 400 });
  }

  const room = scope.room || (await resolveRoomForSala(db, sala));
  if (!room) {
    return Response.json({ error: 'room_not_found' }, { status: 503 });
  }

  const actorId = `interno:${sala}`;
  const updatedAt = new Date().toISOString();
  const ops = [
    {
      path: `entries/${patientId}/monitoreo`,
      value: monitoreoEnvelope,
      updatedAt,
      actorId,
    },
  ];
  const clientMutationId = `interno-vitals/${patientId}/${medicionId}`;

  const committed = await commitInternoVitalsOps(
    env,
    db,
    String(room.id),
    ops,
    actorId,
    clientMutationId
  );
  if (committed.error === 'room_not_found' || committed.error === 'room_state_missing') {
    return Response.json({ error: committed.error }, { status: 503 });
  }
  if (committed.error) {
    const status = committed.error === 'conflict' ? 409 : 400;
    return Response.json({ error: committed.error }, { status });
  }

  return Response.json({ ok: true, patientId, version: committed.version });
}

export { readInternoRelayBoard };
