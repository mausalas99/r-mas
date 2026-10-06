/**
 * Push patient census to the Nube room for the patient's operational sala
 * (team sala), not only the Mac's active census room.
 */
import { resolvePatientSala } from '../../clinico-access-patient.mjs';
import {
  resolvePatientTeamIdFromAssignments,
  stampPatientClinicalSala,
} from '../../clinico-access.mjs';
import { getSyncablePatients, persistClinicalState } from '../../app-state.mjs';
import { isCloudSala, normalizeCloudSala } from './sala-allowlist.mjs';
import { isCloudSyncActive } from './nube-sync-policy.mjs';
import {
  getCloudSyncRoomSnapshot,
  getCloudSyncToken,
  getCloudSyncUrl,
} from './settings.mjs';
import { createCloudSyncApi } from './api-client.mjs';
import { pushCloudOpsDirect } from './cloud-push-direct.mjs';
import {
  advanceSalaRoomRevision,
  ensureTurnRoomForSala,
  getSalaRoomCache,
} from './cloud-clinical-ops-sala.mjs';
import {
  cloudOp,
  mapPatientEntryToCloudBundleOps,
  pushCensusFieldsOp,
} from './mutate-bridge-ops.mjs';
import { cloudSyncNowIso } from './cloud-sync-clock.mjs';
import { buildDirtyLabSidecarOpsForPatient } from './cloud-lab-sidecar-index.mjs';

/** @returns {string} */
export function getActiveCloudSala() {
  return normalizeCloudSala(getCloudSyncRoomSnapshot()?.sala || '');
}

/** @param {object|null|undefined} patient @param {object|null|undefined} [context] */
export function resolveOperationalPatientSala(patient, context) {
  const pid = String(patient?.id || '').trim();
  if (pid && context) {
    const assignments = Array.isArray(context.assignments) ? context.assignments : [];
    const teams = Array.isArray(context.teams) ? context.teams : [];
    const now = context.now || new Date().toISOString();
    const teamId = resolvePatientTeamIdFromAssignments(pid, assignments, now);
    if (teamId) {
      const team = teams.find((t) => String(t?.team_id || '') === teamId);
      const teamSala = normalizeCloudSala(team?.sala);
      if (teamSala) return teamSala;
    }
  }
  return normalizeCloudSala(resolvePatientSala(patient));
}

/**
 * Whether this chart should ride the active census room outbox (same sala).
 * @param {object|null|undefined} patient
 * @param {object|null|undefined} [context]
 */
export function patientBelongsToActiveCloudRoom(patient, context) {
  const patientSala = resolveOperationalPatientSala(patient, context);
  if (!patientSala) return true;
  const active = getActiveCloudSala();
  return !active || patientSala === active;
}

/**
 * @param {string} sala
 * @param {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} ops
 */
export async function pushOpsToSalaRoom(sala, ops) {
  if (!ops?.length || !isCloudSyncActive() || !getCloudSyncToken()) {
    return { ok: false, reason: 'inactive' };
  }
  const normalized = normalizeCloudSala(sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: 'invalid_sala' };

  const room = await ensureTurnRoomForSala(normalized);
  if (!room?.id) return { ok: false, reason: 'no_room' };

  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
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
      reason: 'push_failed',
      message: err?.message || String(err),
    };
  }
}

/**
 * @param {object} patient
 * @param {string} actorId
 * @returns {import('./mutate-bridge-ops.mjs').CloudSyncOp[]}
 */
export function buildPatientAdmitOpsForCloud(patient, actorId) {
  const pid = String(patient?.id || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) return [];
  const meta = {
    actorId: String(actorId || 'local'),
    updatedAt: String(patient.lanUpdatedAt || cloudSyncNowIso()),
  };
  /** @type {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} */
  const ops = [];
  pushCensusFieldsOp(ops, pid, patient, meta.actorId);
  const registro = String(patient.registro || '').trim();
  if (registro) {
    ops.push(
      cloudOp({
        path: `entries/${pid}`,
        value: { id: pid, registro },
        ...meta,
      })
    );
  }
  return ops;
}

/**
 * Full census mirror (fields + monitoreo/eventualidades when entry exists).
 * @param {object} patient
 * @param {string} actorId
 */
export async function buildPatientCensusMirrorOps(patient, actorId) {
  const ops = buildPatientAdmitOpsForCloud(patient, actorId);
  const pid = String(patient?.id || '').trim();
  if (!pid) return ops;
  const meta = {
    actorId: String(actorId || 'local'),
    updatedAt: String(patient.lanUpdatedAt || cloudSyncNowIso()),
  };
  try {
    const { buildPatientEntry } = await import('../patients-modal-commit.mjs');
    const entry = buildPatientEntry(pid);
    if (entry) ops.push(...mapPatientEntryToCloudBundleOps(entry, meta));
  } catch {
    /* entry optional during boot */
  }
  return ops;
}

/**
 * Push patient chart to the team's sala room when it differs from the active census room.
 * @param {object} patient
 * @param {{ actorId?: string }} [opts]
 */
export async function mirrorPatientCensusToOperationalSala(patient, opts = {}) {
  if (!patient?.id || !isCloudSyncActive()) return { ok: false, reason: 'inactive' };
  const context = opts.context || null;
  if (patientBelongsToActiveCloudRoom(patient, context)) return { ok: false, reason: 'active_room' };
  const sala = resolveOperationalPatientSala(patient, context);
  if (!sala || !isCloudSala(sala)) return { ok: false, reason: 'no_sala' };
  const ops = await buildPatientCensusMirrorOps(patient, opts.actorId || 'local');
  if (!ops.length) return { ok: false, reason: 'no_ops' };
  return pushOpsToSalaRoom(sala, ops);
}

/**
 * A patient moved to another sala's team: mark it in the room it left. Census
 * fields carry the new sala, stamped now so they beat the room's old copy
 * (LWW), then the room's assignment rows are re-pushed. No delete.
 * @param {object} patient @param {string} prevSala @param {string} [actorId]
 * @param {{ syncOps?: boolean }} [opts] syncOps false: caller re-pushes the room's assignment rows itself
 */
export async function markPatientMovedInSalaRoom(patient, prevSala, actorId, { syncOps = true } = {}) {
  const from = normalizeCloudSala(prevSala);
  const to = normalizeCloudSala(patient?.sala);
  if (!patient?.id || !isCloudSala(from) || from === to) return { ok: false, reason: 'not_moved' };
  /** @type {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} */
  const ops = [];
  pushCensusFieldsOp(ops, String(patient.id), { ...patient, lanUpdatedAt: cloudSyncNowIso() }, actorId || 'local');
  const res = await pushOpsToSalaRoom(from, ops);
  console.info(`[R+] moved push room=${from} roomId=${getSalaRoomCache(from).roomId || '-'} pid=${patient.id} own=${to || '-'} → ${JSON.stringify(res)}`);
  if (!syncOps) return res;
  const { syncClinicalOpsForSala } = await import('./cloud-clinical-ops-sala.mjs');
  await syncClinicalOpsForSala(from).catch(() => null);
  return res;
}

/**
 * Team sala or the chart's own sala — never a sala guessed from servicio: an
 * Interconsultas consult often names «Sala 1» and must stay in its room.
 * @param {object} patient @param {object|null|undefined} context
 */
function hasKnownSala(patient, context) {
  if (String(patient?.sala || '').trim()) return true;
  const assignments = Array.isArray(context?.assignments) ? context.assignments : [];
  const now = context?.now || new Date().toISOString();
  return !!resolvePatientTeamIdFromAssignments(String(patient?.id || ''), assignments, now);
}

/**
 * The patient's own cloud sala when the room copy is stale (other sala than the
 * room and than the copy's fields.sala); else '' plus the skip reason.
 * @param {object} patient @param {string} copySala @param {string} roomSala @param {object|null|undefined} ctx
 * @returns {{ own: string, reason?: string }}
 */
function staleCopyOwnSala(patient, copySala, roomSala, ctx) {
  if (!hasKnownSala(patient, ctx)) return { own: '', reason: 'no_known_sala' };
  const own = resolveOperationalPatientSala(patient, ctx);
  if (!isCloudSala(own)) return { own: '', reason: 'own_not_cloud' };
  if (own === roomSala) return { own: '', reason: 'belongs_here' };
  if (normalizeCloudSala(copySala) === own) return { own: '', reason: 'already_marked' };
  return { own };
}

/** Logged so a live run shows each heal decision. Ids and sala names only, never registro. */
function logHeal(roomSala, entryPid, localPid, copySala, own, verdict) {
  const ids = localPid && localPid !== entryPid ? `entry=${entryPid} local=${localPid} (same registro)` : `pid=${entryPid}`;
  console.info(`[R+] heal room=${roomSala} ${ids} copy=${copySala || '-'} own=${own || '-'} → ${verdict}`);
}

/** `${roomSala}|${entryPid}` already healed this session — one try per copy, no push loop. */
const healedRoomCopies = new Set();

/** Local charts by id and by registro: a room entry can carry another id for the same patient. */
function indexLocalPatients() {
  const byId = new Map();
  const byRegistro = new Map();
  for (const p of getSyncablePatients() || []) {
    byId.set(String(p?.id || ''), p);
    const registro = String(p?.registro || '').trim();
    if (registro && !byRegistro.has(registro)) byRegistro.set(registro, p);
  }
  return { byId, byRegistro };
}

/**
 * @param {string} entryPid @param {{ sala: string, registro: string }} copy
 * @param {{ byId: Map<string, object>, byRegistro: Map<string, object> }} local
 * @param {string} roomSala @param {object|null|undefined} ctx
 * @returns {{ patient: object|null, own: string, reason?: string }}
 */
function healDecision(entryPid, copy, local, roomSala, ctx) {
  const patient = local.byId.get(entryPid) || (copy.registro ? local.byRegistro.get(copy.registro) : null) || null;
  if (!patient) return { patient: null, own: '', reason: 'not_held' };
  return { patient, ...staleCopyOwnSala(patient, copy.sala, roomSala, ctx) };
}

/**
 * Self-heal for copies left in the active room before moves were marked: a
 * room entry whose fields.sala differs from the local patient's operational
 * sala gets the local sala, stamped now (LWW), on the room entry's own id
 * (matched by id, else registro). No delete. Patients not held locally are
 * skipped. Assignment rows are not added: any peer's clinicalOps push replaces
 * the room copy whole, so fields.sala is the durable signal.
 * @param {Map<string, { sala: string, registro: string }>} roomCopies from roomCopySalasFromPull
 * @param {string} [actorId]
 */
export async function markStaleRoomCopiesMoved(roomCopies, actorId) {
  const roomSala = getActiveCloudSala();
  if (!roomCopies?.size || !isCloudSala(roomSala)) return { ok: false, reason: 'nothing' };
  const { getClinicalScopeContextForEvaluate } = await import('../../clinical-access-runtime.mjs');
  const actor = actorId || (await import('./mutate-bridge.mjs')).resolveCloudActorId?.() || 'local';
  const { ops, keys } = collectHealOps(roomCopies, roomSala, getClinicalScopeContextForEvaluate(), actor);
  if (!ops.length) return { ok: true, healed: 0 };
  const res = await pushOpsToSalaRoom(roomSala, ops);
  const roomId = getSalaRoomCache(roomSala).roomId || String(getCloudSyncRoomSnapshot()?.id || '');
  console.info(`[R+] heal push room=${roomSala} roomId=${roomId} ops=${ops.length} → ${JSON.stringify(res)}`);
  // A failed push may try again on the next pull.
  if (!res?.ok || res.pushed?.staleRejected) keys.forEach((k) => healedRoomCopies.delete(k));
  return { ...res, healed: ops.length };
}

/**
 * @param {Map<string, { sala: string, registro: string }>} roomCopies
 * @param {string} roomSala @param {object|null|undefined} ctx @param {string} actor
 */
function collectHealOps(roomCopies, roomSala, ctx, actor) {
  const local = indexLocalPatients();
  const at = cloudSyncNowIso();
  /** @type {import('./mutate-bridge-ops.mjs').CloudSyncOp[]} */
  const ops = [];
  const keys = [];
  for (const [entryPid, copy] of roomCopies) {
    const key = `${roomSala}|${entryPid}`;
    if (healedRoomCopies.has(key)) continue;
    const { patient, own, reason } = healDecision(entryPid, copy, local, roomSala, ctx);
    if (!patient) continue; // not held here: no log, the room holds other devices' charts
    const localPid = String(patient.id || '');
    if (!own) {
      logHeal(roomSala, entryPid, localPid, copy.sala, resolveOperationalPatientSala(patient, ctx), `skip(${reason})`);
      continue;
    }
    logHeal(roomSala, entryPid, localPid, copy.sala, own, 'push');
    healedRoomCopies.add(key);
    keys.push(key);
    pushCensusFieldsOp(ops, entryPid, { ...patient, sala: own, lanUpdatedAt: at }, actor);
  }
  return { ops, keys };
}

/** Room ids whose full state was already checked this session. */
const fullHealDoneForRoom = new Set();

/**
 * Incremental pulls carry only changed entries, so an old stale copy never
 * shows up in one. Once per session per active room (or when forced from the
 * repair button): pull the whole room from revision 0 — decrypted by the api,
 * main cursor untouched — and heal from it.
 * @param {{ force?: boolean }} [opts]
 */
export async function healActiveRoomStaleCopies(opts = {}) {
  const room = getCloudSyncRoomSnapshot();
  const roomId = String(room?.id || '');
  if (!roomId || !isCloudSyncActive() || !getCloudSyncToken()) return { ok: false, reason: 'inactive' };
  if (!opts.force && fullHealDoneForRoom.has(roomId)) return { ok: true, reason: 'done' };
  fullHealDoneForRoom.add(roomId);
  try {
    const api = createCloudSyncApi({ getBaseUrl: getCloudSyncUrl, getToken: getCloudSyncToken });
    const pull = await api.pull(roomId, 0);
    const { roomCopySalasFromPull } = await import('./pull-apply.mjs');
    const copies = roomCopySalasFromPull(pull);
    console.info(`[R+] heal room=${getActiveCloudSala()} full pull: ${copies.size} entries with readable fields`);
    return await markStaleRoomCopiesMoved(copies);
  } catch (err) {
    fullHealDoneForRoom.delete(roomId);
    console.warn('[R+] heal full pull failed:', err?.message || err);
    return { ok: false, reason: 'pull_failed' };
  }
}

/**
 * Ops that bring back a patient whose delete was undone locally. The room's
 * delete tombstone wiped the chart and its labs, and it only clears for an
 * identity op newer than `deletedAt`, while every entityVersion from before the
 * delete still beats the chart's own old clocks. So: whole chart plus every lab
 * set (fingerprint skip off), all stamped `at`.
 * @param {object} patient @param {unknown[]} labs @param {string} actorId @param {string} at
 */
export async function buildRestoredPatientOps(patient, labs, actorId, at) {
  const pid = String(patient?.id || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) return [];
  const ops = [
    ...(await buildPatientCensusMirrorOps({ ...patient, lanUpdatedAt: at }, actorId)),
    ...buildDirtyLabSidecarOpsForPatient(pid, Array.isArray(labs) ? labs : [], { actorId, updatedAt: at }, {}),
  ];
  return ops.map((op) => ({ ...op, updatedAt: at }));
}

/**
 * Push a restored patient to its sala room now (direct, not the outbox: undo
 * reloads the app right after).
 * ponytail: offline undo → push fails, team stays without the patient; outbox
 * retry if that shows up.
 * @param {object} patient @param {unknown[]} labs @param {{ actorId: string, context?: object|null }} opts
 */
export async function pushRestoredPatientToCloud(patient, labs, opts) {
  if (!isCloudSyncActive()) return { ok: false, reason: 'inactive' };
  const own = resolveOperationalPatientSala(patient, opts.context || null);
  const sala = isCloudSala(own) ? own : getActiveCloudSala();
  const ops = await buildRestoredPatientOps(patient, labs, opts.actorId, cloudSyncNowIso());
  if (!ops.length) return { ok: false, reason: 'no_ops' };
  return pushOpsToSalaRoom(sala, ops);
}

/**
 * @param {object[]} entries
 * @param {string} activeSala
 * @param {object|null|undefined} [context]
 * @returns {{ active: object[], crossBySala: Map<string, object[]> }}
 */
export function partitionPatientEntriesByOperationalSala(entries, activeSala, context) {
  const active = [];
  /** @type {Map<string, object[]>} */
  const crossBySala = new Map();
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

/**
 * @param {object} patient
 * @param {{ teams: object[], assignments: object[], now: string, user: object, actorId: string, context: object }} rctx
 * @param {Set<string>} clinicalOpsSalas
 * @returns {Promise<{ stamped: boolean, mirrored: boolean, moved?: boolean }>}
 */
async function repairOnePatientCensusSala(patient, rctx, clinicalOpsSalas) {
  const { teams, assignments, now, user, actorId, context } = rctx;
  const teamId = resolvePatientTeamIdFromAssignments(String(patient.id), assignments, now);
  let stamped = false;
  // No team: keep the chart's own sala (a patient added while on another sala).
  if (teamId) {
    const team = teams.find((t) => String(t?.team_id || '') === teamId);
    const prev = String(patient.sala || '').trim();
    stampPatientClinicalSala(patient, user, { team, teams });
    stamped = String(patient.sala || '').trim() !== prev;
    const teamSala = normalizeCloudSala(team?.sala);
    if (teamSala) clinicalOpsSalas.add(teamSala);
  }

  let mirrored = false;
  let moved = false;
  if (!patientBelongsToActiveCloudRoom(patient, context)) {
    const res = await mirrorPatientCensusToOperationalSala(patient, { actorId, context });
    mirrored = !!res?.ok;
    // A copy left in the active room from before moves were marked: mark it now.
    const active = getActiveCloudSala();
    const markRes = hasKnownSala(patient, context)
      ? await markPatientMovedInSalaRoom(patient, active, actorId, { syncOps: false })
      : { ok: false, reason: 'no_known_sala' };
    moved = !!markRes?.ok;
    console.info(`[R+] repair room=${active} pid=${patient.id} own=${patient.sala || '-'} → ${JSON.stringify(markRes)}`);
    if (moved) clinicalOpsSalas.add(active);
  }
  return { stamped, mirrored, moved };
}

/** @param {Iterable<string>} clinicalOpsSalas */
async function pushClinicalOpsForRepairedSalas(clinicalOpsSalas) {
  const { syncClinicalOpsForSala } = await import('./cloud-clinical-ops-sala.mjs');
  for (const sala of clinicalOpsSalas) {
    await syncClinicalOpsForSala(sala).catch(() => null);
  }
}

async function scheduleCloudSyncPushAfterRepair() {
  try {
    const bridge = await import('./mutate-bridge.mjs');
    if (typeof bridge.scheduleCloudSyncPush === 'function') bridge.scheduleCloudSyncPush();
  } catch {
    /* optional */
  }
}

/**
 * @param {{ teams: object[], assignments: object[], now: string, user: object, actorId: string, context: object }} rctx
 * @param {Set<string>} clinicalOpsSalas
 * @returns {Promise<{ stamped: number, mirrored: number, moved: number }>}
 */
async function repairAllPatientsCensusSalas(rctx, clinicalOpsSalas) {
  let stamped = 0;
  let mirrored = 0;
  let moved = 0;
  for (const patient of getSyncablePatients() || []) {
    if (!patient?.id || String(patient.id).indexOf('demo-') === 0) continue;
    const result = await repairOnePatientCensusSala(patient, rctx, clinicalOpsSalas);
    if (result.stamped) stamped += 1;
    if (result.mirrored) mirrored += 1;
    if (result.moved) moved += 1;
  }
  return { stamped, mirrored, moved };
}

/**
 * Backfill sala + Nube census for patients already assigned to teams (pre-cross-sala fix).
 * @param {{ actorId?: string, user?: object }} [opts]
 */
export async function repairCensusSalasFromTeamAssignments(opts = {}) {
  if (!isCloudSyncActive()) return { ok: false, reason: 'inactive', stamped: 0, mirrored: 0 };

  const { getClinicalScopeContextForEvaluate } = await import('../../clinical-access-runtime.mjs');
  const { clinicalSessionContext } = await import('../../clinical-session-context.mjs');
  const context = getClinicalScopeContextForEvaluate();
  const rctx = {
    teams: Array.isArray(context.teams) ? context.teams : [],
    assignments: Array.isArray(context.assignments) ? context.assignments : [],
    now: context.now || new Date().toISOString(),
    user: opts.user || clinicalSessionContext.user,
    actorId: String(opts.actorId || 'local'),
    context,
  };

  /** @type {Set<string>} */
  const clinicalOpsSalas = new Set();
  const { stamped, mirrored, moved } = await repairAllPatientsCensusSalas(rctx, clinicalOpsSalas);

  if (stamped > 0) persistClinicalState({ immediate: true });
  const healed = await healActiveRoomStaleCopies({ force: true });
  await pushClinicalOpsForRepairedSalas(clinicalOpsSalas);
  await scheduleCloudSyncPushAfterRepair();

  return { ok: true, stamped, mirrored, moved: moved + (Number(healed?.healed) || 0), salas: [...clinicalOpsSalas] };
}
