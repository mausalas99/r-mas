import {
  hydrateClinicalTeamsAfterCloudPull
} from "/mobile/js/chunks/chunk-3G4TBNST.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-KYGE5G3V.js";
import {
  pushCloudOpsDirect
} from "/mobile/js/chunks/chunk-VDEKDLYX.js";
import {
  resolveCloudActorId
} from "/mobile/js/chunks/chunk-P7EHNYUF.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-C4OBKXWW.js";
import {
  createOpFold,
  foldCloudOp
} from "/mobile/js/chunks/chunk-VVADIT4K.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  isCloudSala,
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  advanceCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncRoomSnapshot,
  getCloudSyncToken,
  getCloudSyncUrl
} from "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/features/cloud-sync/cloud-clinical-ops-sala.mjs
var SALA_ROOMS_KEY = "rpc-cloud-sala-rooms";
function readSalaRooms() {
  try {
    const raw = localStorage.getItem(SALA_ROOMS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeSalaRooms(rooms) {
  try {
    localStorage.setItem(SALA_ROOMS_KEY, JSON.stringify(rooms));
  } catch {
  }
}
function salaCacheKey(sala) {
  return normalizeCloudSala(sala);
}
function getSalaRoomCache(sala) {
  const key = salaCacheKey(sala);
  const entry = readSalaRooms()[key];
  if (!entry?.roomId) return { roomId: "", revision: 0 };
  return {
    roomId: String(entry.roomId),
    revision: Number(entry.revision) || 0
  };
}
function rememberSalaRoom(sala, room) {
  const key = salaCacheKey(sala);
  if (!key || !room?.id) return;
  const rooms = readSalaRooms();
  rooms[key] = {
    roomId: String(room.id),
    revision: Number(room.revision) || rooms[key]?.revision || 0,
    sala: key
  };
  writeSalaRooms(rooms);
}
function advanceSalaRoomRevision(sala, revision) {
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
    getToken: getCloudSyncToken
  });
}
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function ensureTurnRoomForSala(sala) {
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
async function collectClinicalOpsForSala(sala) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsExport !== "function") return null;
  const res = await api.dbClinicalOpsExport({ sala: normalizeCloudSala(sala) });
  if (!res || res.ok === false) return null;
  return res.snapshot && typeof res.snapshot === "object" ? res.snapshot : null;
}
async function pushClinicalOpsForSala(sala) {
  if (!isCloudSyncActive() || !getCloudSyncToken()) {
    return { ok: false, reason: "bridge_inactive" };
  }
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: "invalid_sala" };
  const room = await ensureTurnRoomForSala(normalized);
  if (!room?.id) return { ok: false, reason: "no_room" };
  const clinicalOps = await collectClinicalOpsForSala(normalized);
  if (clinicalOps == null) return { ok: false, reason: "no_snapshot" };
  const actorId = resolveCloudActorId();
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const api = createApi();
  const pushed = await pushCloudOpsDirect(
    api,
    String(room.id),
    [
      {
        path: "clinicalOps",
        value: clinicalOps,
        updatedAt,
        actorId
      }
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
function advanceRevisionFromPull(normalized, room, revision) {
  const next = Number(revision) || 0;
  advanceSalaRoomRevision(normalized, next);
  if (getCloudSyncRoomId() === String(room.id)) {
    advanceCloudSyncRevision(next);
  }
}
function foldClinicalOpsFromOps(ops) {
  const fold = createOpFold();
  for (let i = 0; i < ops.length; i += 1) foldCloudOp(fold, ops[i]);
  return fold.clinicalOps ?? null;
}
async function applyClinicalOpsSnapshot(clinicalOps) {
  const { isClinicalOpsSyncAvailable, applyClinicalOpsSnapshot: applyClinicalOpsSnapshot2 } = await import("/mobile/js/chunks/clinical-ops-sync-S3XOKAM6.js");
  if (isClinicalOpsSyncAvailable()) {
    await applyClinicalOpsSnapshot2(clinicalOps);
    return;
  }
  const { applyClinicalScopeFromOpsSnapshot } = await import("/mobile/js/chunks/clinical-access-runtime-AIZQAPAG.js");
  applyClinicalScopeFromOpsSnapshot(clinicalOps);
}
function validateSalaPull(sala) {
  if (!getCloudSyncToken()) return { ok: false, reason: "no_token" };
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: "invalid_sala" };
  return { ok: true, normalized };
}
function resolveClinicalOpsFromPull(pull) {
  const ops = Array.isArray(pull?.ops) ? pull.ops : [];
  const clinicalOps = pull?.state?.clinicalOps ?? (ops.length ? foldClinicalOpsFromOps(ops) : null);
  return { ops, clinicalOps };
}
async function pullClinicalOpsForSala(sala, opts = {}) {
  const validated = validateSalaPull(sala);
  if (!validated.ok) return validated;
  const normalized = validated.normalized;
  const room = await ensureTurnRoomForSala(normalized);
  if (!room?.id) return { ok: false, reason: "no_room" };
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
async function syncClinicalOpsForSala(sala) {
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: "invalid_sala" };
  await pullClinicalOpsForSala(normalized, { since: 0 }).catch(() => null);
  return pushClinicalOpsForSala(normalized);
}
async function pushClinicalOpsForSalas(salas) {
  const targets = [
    ...new Set(
      (salas || []).map((s) => normalizeCloudSala(s)).filter((s) => isCloudSala(s))
    )
  ];
  if (!targets.length) return { ok: false, reason: "no_salas" };
  let last = { ok: false, reason: "no_push" };
  for (const sala of targets) {
    last = await syncClinicalOpsForSala(sala);
  }
  return last;
}
async function listLocalTeamSalas() {
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsExport !== "function") return [];
  const res = await api.dbClinicalOpsExport();
  if (!res?.snapshot?.teams) return [];
  const salas = /* @__PURE__ */ new Set();
  for (const team of res.snapshot.teams) {
    const direct = normalizeCloudSala(team?.sala);
    if (isCloudSala(direct)) {
      salas.add(direct);
      continue;
    }
    const createdBy = String(team?.created_by || "").trim();
    const creator = (res.snapshot.clinical_users || []).find(
      (u) => String(u.user_id) === createdBy
    );
    const inferred = normalizeCloudSala(creator?.sala);
    if (isCloudSala(inferred)) salas.add(inferred);
  }
  return [...salas];
}
function resolveConnectHomeSala(opts) {
  return normalizeCloudSala(
    opts.homeSala || clinicalSessionContext.user?.sala || getCloudSyncRoomSnapshot()?.sala || ""
  );
}
async function pullClinicalOpsForSalas(pullTargets) {
  let pulled = 0;
  for (const sala of pullTargets) {
    const res = await pullClinicalOpsForSala(sala).catch(() => null);
    if (res?.ok) pulled += 1;
  }
  return pulled;
}
async function syncCloudClinicalOpsOnConnect(opts = {}) {
  if (!getCloudSyncToken() || !isCloudSyncActive()) {
    return { ok: false, reason: "inactive" };
  }
  const homeSala = resolveConnectHomeSala(opts);
  const pullTargets = /* @__PURE__ */ new Set();
  if (isCloudSala(homeSala)) pullTargets.add(homeSala);
  for (const sala of await listLocalTeamSalas()) pullTargets.add(sala);
  const pulled = await pullClinicalOpsForSalas(pullTargets);
  const pushTargets = await listLocalTeamSalas();
  if (!pushTargets.length) {
    return { ok: true, pulled, pushed: 0 };
  }
  const push = await pushClinicalOpsForSalas(pushTargets);
  return {
    ok: !!push?.ok,
    pulled,
    pushed: pushTargets.length,
    salas: pushTargets
  };
}

export {
  getSalaRoomCache,
  rememberSalaRoom,
  advanceSalaRoomRevision,
  ensureTurnRoomForSala,
  pushClinicalOpsForSala,
  pullClinicalOpsForSala,
  syncClinicalOpsForSala,
  pushClinicalOpsForSalas,
  listLocalTeamSalas,
  syncCloudClinicalOpsOnConnect
};
//# sourceMappingURL=/js/chunks/chunk-F7PK25AB.js.map
