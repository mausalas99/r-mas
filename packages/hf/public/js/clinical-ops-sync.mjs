/**
 * Clinical ops sync helpers for V2 SQL tables (rotation, assignments, guardia).
 * Transport-agnostic naming — used by Nube and LAN callers.
 */

import {
  mergeClinicalOpsFromSourcesData,
  mergeClinicalOpsSnapshotsData,
} from './clinical-ops-bundle-merge.mjs';

const MAX_OPS_TRACE = 12;

/** @type {{ at: string, boundary: string, data: Record<string, unknown> }[]} */
const clinicalOpsTrace = [];

/**
 * @param {string} boundary
 * @param {Record<string, unknown>} [data]
 */
export function recordClinicalOpsTrace(boundary, data) {
  const row = {
    at: new Date().toISOString(),
    boundary: String(boundary || 'unknown'),
    data: data && typeof data === 'object' ? { ...data } : {},
  };
  clinicalOpsTrace.unshift(row);
  if (clinicalOpsTrace.length > MAX_OPS_TRACE) clinicalOpsTrace.length = MAX_OPS_TRACE;
}

/** @returns {{ at: string, boundary: string, data: Record<string, unknown> }[]} */
export function getClinicalOpsTrace() {
  return clinicalOpsTrace.map(function (e) {
    return { at: e.at, boundary: e.boundary, data: { ...e.data } };
  });
}

export function clearClinicalOpsTrace() {
  clinicalOpsTrace.length = 0;
}

let cachedSnapshot = null;
/** @type {object|null} */
let pendingClinicalOpsSnapshot = null;

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

export function isClinicalOpsSyncAvailable() {
  const api = dbApi();
  return !!(
    api &&
    typeof api.dbClinicalOpsExport === 'function' &&
    typeof api.dbClinicalOpsMerge === 'function'
  );
}

/** @returns {Promise<object|null>} */
export async function refreshClinicalOpsSnapshotCache() {
  cachedSnapshot = await collectClinicalOpsForSync();
  return cachedSnapshot;
}

/** Refresh export cache when sync bundles are built or clinical session starts. */
export async function prepareClinicalOpsForSync() {
  if (!isClinicalOpsSyncAvailable()) return null;
  return refreshClinicalOpsSnapshotCache();
}

/** @returns {object|null} */
export function getCachedClinicalOpsSnapshot() {
  return cachedSnapshot;
}

/** @returns {Promise<object|null>} */
export async function collectClinicalOpsForSync(opts) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsExport !== 'function') return null;
  const sala = String(opts?.sala || '').trim();
  const res = await api.dbClinicalOpsExport(sala ? { sala } : {});
  if (!res || res.ok === false) return null;
  const snap = res.snapshot && typeof res.snapshot === 'object' ? res.snapshot : null;
  if (snap) {
    recordClinicalOpsTrace('export', {
      usersExported: Array.isArray(snap.clinical_users) ? snap.clinical_users.length : 0,
      teamMembership: Array.isArray(snap.team_membership) ? snap.team_membership.length : 0,
    });
  }
  return snap;
}

// Point-in-time counts, not deltas — near-always > 0 on a normal room, so they'd
// make "did anything change" true forever if counted here (see teamsVisibleAfterMerge).
const MERGE_STATS_SNAPSHOT_KEYS = new Set(['incomingUsers', 'teamsVisibleAfterMerge']);

/** @param {object|null|undefined} mergeStats */
export function clinicalOpsMergeHadChanges(mergeStats) {
  if (!mergeStats || typeof mergeStats !== 'object') return false;
  return Object.keys(mergeStats).some((key) => {
    if (MERGE_STATS_SNAPSHOT_KEYS.has(key)) return false;
    const value = mergeStats[key];
    return typeof value === 'number' && value > 0;
  });
}

function deferClinicalOpsSnapshot(snapshot) {
  pendingClinicalOpsSnapshot = snapshot;
  recordClinicalOpsTrace('merge', {
    ok: false,
    changed: false,
    deferred: true,
    code: 'DB_LOCKED',
    incomingUsers: Array.isArray(snapshot?.clinical_users) ? snapshot.clinical_users.length : 0,
    mergeStats: null,
  });
  return { ok: false, changed: false, code: 'DB_LOCKED', deferred: true };
}

/** Apply clinical-ops snapshot queued while SQLCipher was still locked. */
export async function flushPendingClinicalOpsSnapshot() {
  if (!pendingClinicalOpsSnapshot) return { ok: true, changed: false };
  const snap = pendingClinicalOpsSnapshot;
  pendingClinicalOpsSnapshot = null;
  return applyClinicalOpsSnapshot(snap);
}

function recordClinicalOpsMergeTrace(snapshot, res, ok, changed) {
  recordClinicalOpsTrace('merge', {
    ok,
    changed,
    incomingUsers: Array.isArray(snapshot.clinical_users) ? snapshot.clinical_users.length : 0,
    mergeStats: res && res.mergeStats ? res.mergeStats : null,
    code: ok ? undefined : res?.code,
    error: ok ? undefined : res?.error,
  });
}

function dispatchClinicalOpsSynced(mergeStats) {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(
    new CustomEvent('rpc-clinical-ops-synced', { detail: { mergeStats: mergeStats || null } })
  );
}

function buildClinicalOpsMergeResult(res, ok, changed) {
  return {
    ok,
    changed,
    code: ok ? undefined : res?.code,
    error: ok ? undefined : res?.error,
  };
}

async function mergeClinicalOpsSnapshot(api, snapshot) {
  const res = await api.dbClinicalOpsMerge({ snapshot });
  if (res?.code === 'DB_LOCKED') return deferClinicalOpsSnapshot(snapshot);
  const ok = res?.ok !== false;
  const changed = ok && clinicalOpsMergeHadChanges(res?.mergeStats);
  recordClinicalOpsMergeTrace(snapshot, res, ok, changed);
  if (ok && changed) dispatchClinicalOpsSynced(res?.mergeStats);
  return buildClinicalOpsMergeResult(res, ok, changed);
}

/**
 * @param {object|null} snapshot
 * @returns {Promise<{ ok: boolean, changed: boolean, code?: string, deferred?: boolean }>}
 */
export async function applyClinicalOpsSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return { ok: false, changed: false };
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsMerge !== 'function') return { ok: false, changed: false };
  return mergeClinicalOpsSnapshot(api, snapshot);
}

/** @param {object[]} sources */
export function mergeClinicalOpsFromSources(sources) {
  return mergeClinicalOpsFromSourcesData(sources);
}

export { mergeClinicalOpsSnapshotsData };
