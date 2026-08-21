import { applyOps } from '../lww.js';
import { commitMutationBatch, loadRoomState as loadSyncRoomState } from '../sync.js';
import {
  assertInternoPatientOnBoard,
  entriesToPatients,
  readInternoBoard,
} from './board.js';
import { loadRoomState, resolveRoomForSala } from './room-resolve.js';
import {
  applyInternoMedicionToPatient,
  buildInternoMedicion,
} from './vitals-medicion.js';

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

/** @param {object|null|undefined} stored @param {string} patientId */
function resolveInternoVitalsPatient(stored, patientId) {
  if (stored) return { cur: stored, isNewPatient: false };
  return {
    cur: {
      id: patientId,
      monitoreo: { historial: [], estadoClinico: {}, confirmado: {} },
    },
    isNewPatient: true,
  };
}

/** @param {object} nextPatient */
function ensureInternoMonitoreoShell(nextPatient) {
  if (!nextPatient.monitoreo) {
    nextPatient.monitoreo = { historial: [], estadoClinico: {}, confirmado: {} };
  }
}

/** @param {object|null|undefined} clinicalOps @param {string} patientId */
function touchGuardiaVitalsCheck(clinicalOps, patientId) {
  if (!clinicalOps || !Array.isArray(clinicalOps.active_guardias)) return clinicalOps;
  const now = new Date().toISOString();
  const pid = String(patientId);
  let changed = false;
  const active_guardias = clinicalOps.active_guardias.map((row) => {
    if (String(row?.patient_id || '') !== pid) return row;
    if (String(row?.status || 'Active') !== 'Active') return row;
    changed = true;
    return { ...row, last_vitals_check: now };
  });
  return changed ? { ...clinicalOps, active_guardias } : clinicalOps;
}

/** @param {string} sala @param {string} patientId @param {object} built @param {object} nextPatient @param {object|null|undefined} clinicalOps @param {boolean} isNewPatient */
function buildInternoVitalsOps(sala, patientId, built, nextPatient, clinicalOps, isNewPatient) {
  const actorId = `interno:${sala}`;
  const updatedAt = String(built.medicion.recordedAt || new Date().toISOString());
  const nextClinicalOps = touchGuardiaVitalsCheck(clinicalOps, patientId);
  /** @type {import('../lww.js').SyncOp[]} */
  const ops = [
    {
      path: `entries/${patientId}/monitoreo`,
      value: nextPatient.monitoreo,
      updatedAt,
      actorId,
    },
  ];
  if (nextClinicalOps !== clinicalOps) {
    ops.push({ path: 'clinicalOps', value: nextClinicalOps, updatedAt, actorId });
  }
  if (isNewPatient) {
    ops.unshift({
      path: `entries/${patientId}`,
      value: { id: patientId, monitoreo: nextPatient.monitoreo },
      updatedAt,
      actorId,
    });
  }
  return { ops, actorId, clientMutationId: `interno-vitals/${patientId}/${built.medicion.id}` };
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
      previousLabSidecars: freshState.state.labSidecars,
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
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 * @param {string} patientId
 * @param {object} body
 */
export async function applyInternoVitals(env, db, sala, patientId, body) {
  const scope = await assertInternoPatientOnBoard(env, db, sala, patientId);
  if (scope.error) return scope.error;

  const room = scope.room || (await resolveRoomForSala(db, sala));
  if (!room) {
    return Response.json({ error: 'room_not_found' }, { status: 503 });
  }

  const built = buildInternoMedicion({
    vitals: body?.vitals,
    glucometrias: body?.glucometrias,
    reporterName: body?.reporterName,
    sala,
  });
  if (!built.ok) {
    return Response.json({ error: 'empty_medicion' }, { status: 400 });
  }

  const state = await loadRoomState(env, db, String(room.id));
  if (!state) {
    return Response.json({ error: 'room_state_missing' }, { status: 503 });
  }

  const patients = entriesToPatients(state.entries || []);
  const stored = patients.find((row) => String(row.id) === patientId);
  const { cur, isNewPatient } = resolveInternoVitalsPatient(stored, patientId);
  const nextPatient = structuredClone(cur);
  ensureInternoMonitoreoShell(nextPatient);
  const applied = applyInternoMedicionToPatient(nextPatient, built.medicion);
  if (!applied.ok) {
    return Response.json({ error: 'apply_failed' }, { status: 400 });
  }

  const { ops, actorId, clientMutationId } = buildInternoVitalsOps(
    sala,
    patientId,
    built,
    nextPatient,
    state.clinicalOps,
    isNewPatient
  );
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

  return Response.json({
    ok: true,
    patientId,
    version: committed.version,
    hasAlterations: built.hasAlterations,
  });
}

export { readInternoBoard };
