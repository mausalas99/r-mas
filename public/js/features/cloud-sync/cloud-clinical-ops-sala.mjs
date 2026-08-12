/**
 * Push/pull clinicalOps to the Nube room for a team's sala (not the user's active census room).
 */
import { createCloudSyncApi } from './api-client.mjs';
import { pushCloudOpsDirect } from './cloud-push-direct.mjs';
import { hydrateClinicalTeamsAfterCloudPull } from './clinical-ops-hydrate.mjs';
import { createOpFold, foldCloudOp } from './pull-apply-state.mjs';
import { isCloudSala, normalizeCloudSala } from './sala-allowlist.mjs';
import {
  getCloudSyncToken,
  getCloudSyncUrl,
  advanceCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncRoomSnapshot,
} from './settings.mjs';
import { isCloudSyncActive } from './nube-sync-policy.mjs';
import { resolveCloudActorId } from './mutate-bridge.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';

const SALA_ROOMS_KEY = 'rpc-cloud-sala-rooms';

/** @returns {Record<string, { roomId: string, revision: number, sala?: string }>} */
function readSalaRooms() {
  try {
    const raw = localStorage.getItem(SALA_ROOMS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, { roomId: string, revision: number, sala?: string }>} rooms */
function writeSalaRooms(rooms) {
  try {
    localStorage.setItem(SALA_ROOMS_KEY, JSON.stringify(rooms));
  } catch {
    /* ignore */
  }
}

function salaCacheKey(sala) {
  return normalizeCloudSala(sala);
}

/** @param {string} sala */
export function getSalaRoomCache(sala) {
  const key = salaCacheKey(sala);
  const entry = readSalaRooms()[key];
  if (!entry?.roomId) return { roomId: '', revision: 0 };
  return {
    roomId: String(entry.roomId),
    revision: Number(entry.revision) || 0,
  };
}

/** @param {string} sala @param {{ id: string, revision?: number }} room */
export function rememberSalaRoom(sala, room) {
  const key = salaCacheKey(sala);
  if (!key || !room?.id) return;
  const rooms = readSalaRooms();
  rooms[key] = {
    roomId: String(room.id),
    revision: Number(room.revision) || rooms[key]?.revision || 0,
    sala: key,
  };
  writeSalaRooms(rooms);
}

/** @param {string} sala @param {number} revision */
export function advanceSalaRoomRevision(sala, revision) {
  const key = salaCacheKey(sala);
  const next = Number(revision) || 0;
  if (!key || next <= 0) return;
  const rooms = readSalaRooms();
  const entry = rooms[key];
  if (!entry?.roomId) return;
  if (next > Number(entry.revision || 0)) {
    rooms[key] = { ...entry, revision: next };
    writeSalaRooms(rooms);
  }
}

function createApi() {
  return createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
  });
}

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {string} sala */
export async function ensureTurnRoomForSala(sala) {
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized) || !getCloudSyncToken()) return null;

  const cached = getSalaRoomCache(normalized);
  if (cached.roomId) {
    return { id: cached.roomId, revision: cached.revision, sala: normalized };
  }

  const api = createApi();
  const data = await api.ensureTurn({ sala: normalized });
  const room = data?.room;
  if (!room?.id) return null;
  rememberSalaRoom(normalized, room);
  return room;
}

/** @param {string} sala */
async function collectClinicalOpsForSala(sala) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsExport !== 'function') return null;
  const res = await api.dbClinicalOpsExport({ sala: normalizeCloudSala(sala) });
  if (!res || res.ok === false) return null;
  return res.snapshot && typeof res.snapshot === 'object' ? res.snapshot : null;
}

/** @param {string} sala */
export async function pushClinicalOpsForSala(sala) {
  if (!isCloudSyncActive() || !getCloudSyncToken()) {
    return { ok: false, reason: 'bridge_inactive' };
  }
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: 'invalid_sala' };

  const room = await ensureTurnRoomForSala(normalized);
  if (!room?.id) return { ok: false, reason: 'no_room' };

  const clinicalOps = await collectClinicalOpsForSala(normalized);
  if (clinicalOps == null) return { ok: false, reason: 'no_snapshot' };

  const actorId = resolveCloudActorId();
  const updatedAt = new Date().toISOString();
  const api = createApi();

  const pushed = await pushCloudOpsDirect(
    api,
    String(room.id),
    [
      {
        path: 'clinicalOps',
        value: clinicalOps,
        updatedAt,
        actorId,
      },
    ],
    () => getSalaRoomCache(normalized).revision,
    (revision) => {
      advanceSalaRoomRevision(normalized, revision);
      if (getCloudSyncRoomId() === String(room.id)) {
        advanceCloudSyncRevision(revision);
      }
    }
  );

  return { ok: true, sala: normalized, roomId: String(room.id), ...pushed };
}

/** @param {string} normalized @param {{ id: string }} room @param {number} revision */
function advanceRevisionFromPull(normalized, room, revision) {
  const next = Number(revision) || 0;
  advanceSalaRoomRevision(normalized, next);
  if (getCloudSyncRoomId() === String(room.id)) {
    advanceCloudSyncRevision(next);
  }
}

/** @param {unknown[]} ops */
function foldClinicalOpsFromOps(ops) {
  const fold = createOpFold();
  for (let i = 0; i < ops.length; i += 1) foldCloudOp(fold, ops[i]);
  return fold.clinicalOps ?? null;
}

/** @param {unknown} clinicalOps */
async function applyClinicalOpsSnapshot(clinicalOps) {
  const { isClinicalOpsSyncAvailable, applyClinicalOpsSnapshot } = await import(
    '../../clinical-ops-sync.mjs'
  );
  if (isClinicalOpsSyncAvailable()) {
    await applyClinicalOpsSnapshot(clinicalOps);
    return;
  }
  // iPad/PWA: no SQLCipher — hydrate session scope from the snapshot directly.
  const { applyClinicalScopeFromOpsSnapshot } = await import(
    '../../clinical-access-runtime.mjs'
  );
  applyClinicalScopeFromOpsSnapshot(clinicalOps);
}

/** @param {string} sala */
function validateSalaPull(sala) {
  if (!getCloudSyncToken()) return { ok: false, reason: 'no_token' };
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: 'invalid_sala' };
  return { ok: true, normalized };
}

/** @param {unknown} pull */
function resolveClinicalOpsFromPull(pull) {
  const ops = Array.isArray(pull?.ops) ? pull.ops : [];
  const clinicalOps = pull?.state?.clinicalOps ?? (ops.length ? foldClinicalOpsFromOps(ops) : null);
  return { ops, clinicalOps };
}

/** @param {string} sala @param {{ since?: number }} [opts] */
export async function pullClinicalOpsForSala(sala, opts = {}) {
  const validated = validateSalaPull(sala);
  if (!validated.ok) return validated;

  const normalized = validated.normalized;
  const room = await ensureTurnRoomForSala(normalized);
  if (!room?.id) return { ok: false, reason: 'no_room' };

  const cached = getSalaRoomCache(normalized);
  const since = opts.since != null ? Number(opts.since) || 0 : cached.revision;
  const pull = await createApi().pull(String(room.id), since);
  if (pull?.revision != null) {
    advanceRevisionFromPull(normalized, room, pull.revision);
  }

  const { ops, clinicalOps } = resolveClinicalOpsFromPull(pull);
  if (clinicalOps != null) await applyClinicalOpsSnapshot(clinicalOps);

  await hydrateClinicalTeamsAfterCloudPull();
  return { ok: true, sala: normalized, ops: ops.length };
}

/** @param {string[]} salas */
export async function pushClinicalOpsForSalas(salas) {
  const targets = [
    ...new Set(
      (salas || [])
        .map((s) => normalizeCloudSala(s))
        .filter((s) => isCloudSala(s))
    ),
  ];
  if (!targets.length) return { ok: false, reason: 'no_salas' };
  let last = { ok: false, reason: 'no_push' };
  for (const sala of targets) {
    last = await pushClinicalOpsForSala(sala);
  }
  return last;
}

/** Collect salas from local teams export (effective team sala). */
export async function listLocalTeamSalas() {
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsExport !== 'function') return [];
  const res = await api.dbClinicalOpsExport();
  if (!res?.snapshot?.teams) return [];
  const salas = new Set();
  for (const team of res.snapshot.teams) {
    const direct = normalizeCloudSala(team?.sala);
    if (isCloudSala(direct)) {
      salas.add(direct);
      continue;
    }
    const createdBy = String(team?.created_by || '').trim();
    const creator = (res.snapshot.clinical_users || []).find(
      (u) => String(u.user_id) === createdBy
    );
    const inferred = normalizeCloudSala(creator?.sala);
    if (isCloudSala(inferred)) salas.add(inferred);
  }
  return [...salas];
}

/** @param {{ homeSala?: string }} [opts] */
function resolveConnectHomeSala(opts) {
  return normalizeCloudSala(
    opts.homeSala ||
      clinicalSessionContext.user?.sala ||
      getCloudSyncRoomSnapshot()?.sala ||
      ''
  );
}

/** @param {Set<string>} pullTargets */
async function pullClinicalOpsForSalas(pullTargets) {
  let pulled = 0;
  for (const sala of pullTargets) {
    const res = await pullClinicalOpsForSala(sala).catch(() => null);
    if (res?.ok) pulled += 1;
  }
  return pulled;
}

/**
 * On Nube connect: pull team directories for home + known salas, then push local teams
 * so peers see them without waiting for a manual edit in Mi rotación.
 *
 * @param {{ homeSala?: string }} [opts]
 */
export async function syncCloudClinicalOpsOnConnect(opts = {}) {
  if (!getCloudSyncToken() || !isCloudSyncActive()) {
    return { ok: false, reason: 'inactive' };
  }

  const homeSala = resolveConnectHomeSala(opts);
  const pullTargets = new Set();
  if (isCloudSala(homeSala)) pullTargets.add(homeSala);
  for (const sala of await listLocalTeamSalas()) pullTargets.add(sala);

  const pulled = await pullClinicalOpsForSalas(pullTargets);

  // After pull, local DB may include remote teams — push all salas that now have teams.
  const pushTargets = await listLocalTeamSalas();
  if (!pushTargets.length) {
    return { ok: true, pulled, pushed: 0 };
  }
  const push = await pushClinicalOpsForSalas(pushTargets);
  return {
    ok: !!push?.ok,
    pulled,
    pushed: pushTargets.length,
    salas: pushTargets,
  };
}
