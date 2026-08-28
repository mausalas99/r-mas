import {
  advanceSalaRoomRevision,
  ensureTurnRoomForSala,
  getSalaRoomCache
} from "/mobile/js/chunks/chunk-7AN6TUGS.js";
import "/mobile/js/chunks/chunk-RLSWVEU2.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-ATT36THA.js";
import "/mobile/js/chunks/chunk-O5BLBOGB.js";
import "/mobile/js/chunks/chunk-PVAHDYTI.js";
import {
  pushCloudOpsDirect
} from "/mobile/js/chunks/chunk-7GCA7ASC.js";
import "/mobile/js/chunks/chunk-VH7DMNPL.js";
import "/mobile/js/chunks/chunk-LF5B36KU.js";
import {
  getSyncablePatients,
  persistClinicalState
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import "/mobile/js/chunks/chunk-YUYECAQZ.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import {
  cloudOp,
  mapPatientEntryToCloudBundleOps,
  pushCensusFieldsOp
} from "/mobile/js/chunks/chunk-4ALI7FVW.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-QFKCJNWT.js";
import {
  resolvePatientSala,
  resolvePatientTeamIdFromAssignments,
  stampPatientClinicalSala
} from "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-7CF6AX3C.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  isCloudSala,
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncRoomSnapshot,
  getCloudSyncToken,
  getCloudSyncUrl
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/cloud-sync/cloud-census-sala-push.mjs
function getActiveCloudSala() {
  return normalizeCloudSala(getCloudSyncRoomSnapshot()?.sala || "");
}
function resolveOperationalPatientSala(patient, context) {
  const pid = String(patient?.id || "").trim();
  if (pid && context) {
    const assignments = Array.isArray(context.assignments) ? context.assignments : [];
    const teams = Array.isArray(context.teams) ? context.teams : [];
    const now = context.now || (/* @__PURE__ */ new Date()).toISOString();
    const teamId = resolvePatientTeamIdFromAssignments(pid, assignments, now);
    if (teamId) {
      const team = teams.find((t) => String(t?.team_id || "") === teamId);
      const teamSala = normalizeCloudSala(team?.sala);
      if (teamSala) return teamSala;
    }
  }
  return normalizeCloudSala(resolvePatientSala(patient));
}
function patientBelongsToActiveCloudRoom(patient, context) {
  const patientSala = resolveOperationalPatientSala(patient, context);
  if (!patientSala) return true;
  const active = getActiveCloudSala();
  return !active || patientSala === active;
}
async function pushOpsToSalaRoom(sala, ops) {
  if (!ops?.length || !isCloudSyncActive() || !getCloudSyncToken()) {
    return { ok: false, reason: "inactive" };
  }
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: "invalid_sala" };
  const room = await ensureTurnRoomForSala(normalized);
  if (!room?.id) return { ok: false, reason: "no_room" };
  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken
  });
  try {
    const pushed = await pushCloudOpsDirect(
      api,
      String(room.id),
      ops,
      () => getSalaRoomCache(normalized).revision,
      (revision) => advanceSalaRoomRevision(normalized, revision)
    );
    return { ok: true, sala: normalized, pushed };
  } catch (err) {
    return {
      ok: false,
      reason: "push_failed",
      message: err?.message || String(err)
    };
  }
}
function buildPatientAdmitOpsForCloud(patient, actorId) {
  const pid = String(patient?.id || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) return [];
  const meta = {
    actorId: String(actorId || "local"),
    updatedAt: String(patient.lanUpdatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  const ops = [];
  pushCensusFieldsOp(ops, pid, patient, meta.actorId);
  const registro = String(patient.registro || "").trim();
  if (registro) {
    ops.push(
      cloudOp({
        path: `entries/${pid}`,
        value: { id: pid, registro },
        ...meta
      })
    );
  }
  return ops;
}
async function buildPatientCensusMirrorOps(patient, actorId) {
  const ops = buildPatientAdmitOpsForCloud(patient, actorId);
  const pid = String(patient?.id || "").trim();
  if (!pid) return ops;
  const meta = {
    actorId: String(actorId || "local"),
    updatedAt: String(patient.lanUpdatedAt || (/* @__PURE__ */ new Date()).toISOString())
  };
  try {
    const { buildPatientEntry } = await import("/mobile/js/chunks/patients-modal-commit-KAWQP33K.js");
    const entry = buildPatientEntry(pid);
    if (entry) ops.push(...mapPatientEntryToCloudBundleOps(entry, meta));
  } catch {
  }
  return ops;
}
async function mirrorPatientCensusToOperationalSala(patient, opts = {}) {
  if (!patient?.id || !isCloudSyncActive()) return { ok: false, reason: "inactive" };
  const context = opts.context || null;
  if (patientBelongsToActiveCloudRoom(patient, context)) return { ok: false, reason: "active_room" };
  const sala = resolveOperationalPatientSala(patient, context);
  if (!sala || !isCloudSala(sala)) return { ok: false, reason: "no_sala" };
  const ops = await buildPatientCensusMirrorOps(patient, opts.actorId || "local");
  if (!ops.length) return { ok: false, reason: "no_ops" };
  return pushOpsToSalaRoom(sala, ops);
}
function partitionPatientEntriesByOperationalSala(entries, activeSala, context) {
  const active = [];
  const crossBySala = /* @__PURE__ */ new Map();
  const normalizedActive = normalizeCloudSala(activeSala);
  for (const entry of entries || []) {
    const sala = resolveOperationalPatientSala(entry?.patient, context);
    if (!sala || sala === normalizedActive) {
      active.push(entry);
      continue;
    }
    if (!isCloudSala(sala)) {
      active.push(entry);
      continue;
    }
    const bucket = crossBySala.get(sala) || [];
    bucket.push(entry);
    crossBySala.set(sala, bucket);
  }
  return { active, crossBySala };
}
async function repairOnePatientCensusSala(patient, rctx, clinicalOpsSalas) {
  const { teams, assignments, now, user, actorId, context } = rctx;
  const teamId = resolvePatientTeamIdFromAssignments(String(patient.id), assignments, now);
  if (!teamId) return { stamped: false, mirrored: false };
  const team = teams.find((t) => String(t?.team_id || "") === teamId);
  const prev = String(patient.sala || "").trim();
  stampPatientClinicalSala(patient, user, { team, teams });
  const stamped = String(patient.sala || "").trim() !== prev;
  const teamSala = normalizeCloudSala(team?.sala);
  if (teamSala) clinicalOpsSalas.add(teamSala);
  let mirrored = false;
  if (!patientBelongsToActiveCloudRoom(patient, context)) {
    const res = await mirrorPatientCensusToOperationalSala(patient, { actorId, context });
    mirrored = !!res?.ok;
  }
  return { stamped, mirrored };
}
async function pushClinicalOpsForRepairedSalas(clinicalOpsSalas) {
  const { pushClinicalOpsForSala } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-QBGEN6LN.js");
  for (const sala of clinicalOpsSalas) {
    await pushClinicalOpsForSala(sala).catch(() => null);
  }
}
async function scheduleCloudSyncPushAfterRepair() {
  try {
    const bridge = await import("/mobile/js/chunks/mutate-bridge-7T3WSPQH.js");
    if (typeof bridge.scheduleCloudSyncPush === "function") bridge.scheduleCloudSyncPush();
  } catch {
  }
}
async function repairAllPatientsCensusSalas(rctx, clinicalOpsSalas) {
  let stamped = 0;
  let mirrored = 0;
  for (const patient of getSyncablePatients() || []) {
    if (!patient?.id || String(patient.id).indexOf("demo-") === 0) continue;
    const result = await repairOnePatientCensusSala(patient, rctx, clinicalOpsSalas);
    if (result.stamped) stamped += 1;
    if (result.mirrored) mirrored += 1;
  }
  return { stamped, mirrored };
}
async function repairCensusSalasFromTeamAssignments(opts = {}) {
  if (!isCloudSyncActive()) return { ok: false, reason: "inactive", stamped: 0, mirrored: 0 };
  const { getClinicalScopeContextForEvaluate } = await import("/mobile/js/chunks/clinical-access-runtime-OFZ4WTIT.js");
  const { clinicalSessionContext } = await import("/mobile/js/chunks/clinical-session-context-BMMOD5CD.js");
  const context = getClinicalScopeContextForEvaluate();
  const rctx = {
    teams: Array.isArray(context.teams) ? context.teams : [],
    assignments: Array.isArray(context.assignments) ? context.assignments : [],
    now: context.now || (/* @__PURE__ */ new Date()).toISOString(),
    user: opts.user || clinicalSessionContext.user,
    actorId: String(opts.actorId || "local"),
    context
  };
  const clinicalOpsSalas = /* @__PURE__ */ new Set();
  const { stamped, mirrored } = await repairAllPatientsCensusSalas(rctx, clinicalOpsSalas);
  if (stamped > 0) persistClinicalState({ immediate: true });
  await pushClinicalOpsForRepairedSalas(clinicalOpsSalas);
  await scheduleCloudSyncPushAfterRepair();
  return { ok: true, stamped, mirrored, salas: [...clinicalOpsSalas] };
}
export {
  buildPatientAdmitOpsForCloud,
  buildPatientCensusMirrorOps,
  getActiveCloudSala,
  mirrorPatientCensusToOperationalSala,
  partitionPatientEntriesByOperationalSala,
  patientBelongsToActiveCloudRoom,
  pushOpsToSalaRoom,
  repairCensusSalasFromTeamAssignments,
  resolveOperationalPatientSala
};
//# sourceMappingURL=/js/chunks/cloud-census-sala-push-NUJHVZDI.js.map
