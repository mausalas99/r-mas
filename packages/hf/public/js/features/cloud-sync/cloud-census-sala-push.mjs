/**
 * Push patient census to the Nube room for the patient's operational sala
 * (team sala), not only the Mac's active census room.
 */
import { resolvePatientSala } from '../../clinico-access-patient.mjs';
import {
  resolvePatientTeamIdFromAssignments,
  stampPatientClinicalSala,
} from '../../clinico-access.mjs';
import { getPatients, persistClinicalState } from '../../app-state.mjs';
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
    updatedAt: String(patient.lanUpdatedAt || new Date().toISOString()),
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
    updatedAt: String(patient.lanUpdatedAt || new Date().toISOString()),
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
 * @returns {Promise<{ stamped: boolean, mirrored: boolean }>}
 */
async function repairOnePatientCensusSala(patient, rctx, clinicalOpsSalas) {
  const { teams, assignments, now, user, actorId, context } = rctx;
  const teamId = resolvePatientTeamIdFromAssignments(String(patient.id), assignments, now);
  if (!teamId) return { stamped: false, mirrored: false };
  const team = teams.find((t) => String(t?.team_id || '') === teamId);
  const prev = String(patient.sala || '').trim();
  stampPatientClinicalSala(patient, user, { team, teams });
  const stamped = String(patient.sala || '').trim() !== prev;

  const teamSala = normalizeCloudSala(team?.sala);
  if (teamSala) clinicalOpsSalas.add(teamSala);

  let mirrored = false;
  if (!patientBelongsToActiveCloudRoom(patient, context)) {
    const res = await mirrorPatientCensusToOperationalSala(patient, { actorId, context });
    mirrored = !!res?.ok;
  }
  return { stamped, mirrored };
}

/** @param {Iterable<string>} clinicalOpsSalas */
async function pushClinicalOpsForRepairedSalas(clinicalOpsSalas) {
  const { pushClinicalOpsForSala } = await import('./cloud-clinical-ops-sala.mjs');
  for (const sala of clinicalOpsSalas) {
    await pushClinicalOpsForSala(sala).catch(() => null);
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
 * @returns {Promise<{ stamped: number, mirrored: number }>}
 */
async function repairAllPatientsCensusSalas(rctx, clinicalOpsSalas) {
  let stamped = 0;
  let mirrored = 0;
  for (const patient of getPatients() || []) {
    if (!patient?.id || String(patient.id).indexOf('demo-') === 0) continue;
    const result = await repairOnePatientCensusSala(patient, rctx, clinicalOpsSalas);
    if (result.stamped) stamped += 1;
    if (result.mirrored) mirrored += 1;
  }
  return { stamped, mirrored };
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
  const { stamped, mirrored } = await repairAllPatientsCensusSalas(rctx, clinicalOpsSalas);

  if (stamped > 0) persistClinicalState({ immediate: true });
  await pushClinicalOpsForRepairedSalas(clinicalOpsSalas);
  await scheduleCloudSyncPushAfterRepair();

  return { ok: true, stamped, mirrored, salas: [...clinicalOpsSalas] };
}
