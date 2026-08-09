/**
 * Apply cloud pull results into local patient/note/lab state (LAN hydration paths).
 */
import { storage } from '../../storage.js';
import { saveState } from '../../app-state.mjs';
import { patients } from '../../app-state.mjs';
import { applyLanPatientEntries } from '../sync-apply/patient-entries.mjs';
import { removePatientLocally } from '../sync-apply/patient-delete.mjs';
import { shouldEnforceTeamPatientMirror } from '../../clinical-privileges.mjs';
import { isClinicalScopeReadyForLanPatientApply } from '../../clinical-access-runtime/scope-lan.mjs';
import {
  buildLiveSyncPatientIdMap,
  remapAgendaPatientIds,
  resolveCloudTodoLocalPatientId,
} from '../../livesync-patient-ids.mjs';
import {
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  opFoldToLanEntries,
} from './pull-apply-state.mjs';
import { bumpLabHistoryRevision } from '../../lab-history-cache.mjs';
import { labHistory } from '../../app-state.mjs';

/** @type {Promise<typeof import('../cloud-mobile/lab-sync-diagnostics.mjs')> | null} */
let _labSyncDiagMod = null;

function loadLabSyncDiagMod() {
  if (!_labSyncDiagMod) {
    _labSyncDiagMod = import('../cloud-mobile/lab-sync-diagnostics.mjs');
  }
  return _labSyncDiagMod;
}

/** @param {{ added?: number, updated?: number }} patientSync @param {{ patients: number, sets: number }} raw @param {{ patients: number, sets: number }} filtered */
async function recordLabPullDiagnostics(patientSync, raw, filtered) {
  try {
    const labDiag = await loadLabSyncDiagMod();
    labDiag.updateLabPullIngressFilter(filtered);
    let activePatientId = null;
    try {
      const rt = await import('../lab-panel-runtime-state.mjs');
      activePatientId = rt.rt?.getActiveId?.() || null;
    } catch {
      /* optional */
    }
    labDiag.recordLabPullApply({
      patientsUpdated: Number(patientSync?.added || 0) + Number(patientSync?.updated || 0),
      labSetsReceived: raw.sets,
      labSetsKeptAfterWindow: filtered.sets,
      activePatientId,
    });
    labDiag.refreshLabMobileSyncDiagPanel(activePatientId);
  } catch {
    /* optional */
  }
}

/** @type {Promise<typeof import('../cloud-mobile/lab-history-window.mjs')> | null} */
let _mobileLabWindowMod = null;

function loadMobileLabWindowMod() {
  if (!_mobileLabWindowMod) {
    _mobileLabWindowMod = import('../cloud-mobile/lab-history-window.mjs');
  }
  return _mobileLabWindowMod;
}

export {
  assembleLabHistoryFromSidecars,
  cloudEntryToLanEntry,
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  opFoldToLanEntries,
  opsToLanEntries,
} from './pull-apply-state.mjs';

/** @param {Record<string, unknown>} row @param {Record<string, unknown[]>} byPatient @param {Record<string, string>} map */
function mergeCloudTodoIntoMap(row, byPatient, map) {
  const remotePid = String(row.patientId || '').trim();
  const id = String(row.id || '').trim();
  if (!remotePid || !id) return;
  const registro = String(row.registro || '').trim();
  const pid = resolveCloudTodoLocalPatientId(remotePid, registro, patients, map);
  if (!pid) return;
  if (!byPatient[pid]) byPatient[pid] = storage.getTodos(pid).slice();
  const idx = byPatient[pid].findIndex(function (t) {
    return t && String(t.id) === id;
  });
  if (row._deleted) {
    if (idx >= 0) byPatient[pid].splice(idx, 1);
    return;
  }
  const stored = { ...row, patientId: pid };
  if (idx >= 0) byPatient[pid][idx] = stored;
  else byPatient[pid].push(stored);
}

/** @param {Record<string, unknown>} todosMap @param {Record<string, string>} [idMap] @returns {string[]} */
function applyCloudTodosMap(todosMap, idMap) {
  const byPatient = {};
  const map = idMap && typeof idMap === 'object' ? idMap : {};
  for (const todo of Object.values(todosMap || {})) {
    if (!todo || typeof todo !== 'object') continue;
    mergeCloudTodoIntoMap(todo, byPatient, map);
  }
  const changedPatients = [];
  for (const pid of Object.keys(byPatient)) {
    storage.saveTodos(pid, byPatient[pid]);
    changedPatients.push(pid);
  }
  return changedPatients;
}

/** @param {Record<string, unknown>} agendaMap @param {Record<string, string>} [idMap] */
function applyCloudAgendaMap(agendaMap, idMap) {
  const live = Object.values(agendaMap || {}).filter(function (item) {
    return item && typeof item === 'object' && !item._deleted;
  });
  storage.saveScheduledProcedures(remapAgendaPatientIds(live, idMap || {}));
}

/** @param {string} patientId @param {unknown} tombstoneMeta */
export function shouldApplyCloudTombstone(patientId, tombstoneMeta) {
  const pid = String(patientId || '').trim();
  if (!pid) return false;
  const reg = String(
    tombstoneMeta && typeof tombstoneMeta === 'object'
      ? /** @type {{ registro?: string }} */ (tombstoneMeta).registro || ''
      : ''
  ).trim();
  if (!reg) return true;
  return !patients.some(function (p) {
    return p && String(p.id || '') !== pid && String(p.registro || '').trim() === reg;
  });
}

/** @param {Record<string, unknown>} tombstones */
function applyCloudTombstones(tombstones) {
  let removed = false;
  for (const patientId of Object.keys(tombstones || {})) {
    if (!shouldApplyCloudTombstone(patientId, tombstones[patientId])) continue;
    if (removePatientLocally(patientId)) removed = true;
  }
  return removed;
}

async function applyClinicalOpsSnapshot(clinicalOps) {
  if (clinicalOps == null) return false;
  try {
    const { isClinicalOpsLanAvailable, applyClinicalOpsLanSnapshot, refreshClinicalOpsSnapshotCache } =
      await import('../../clinical-ops-sync.mjs');
    const { applyClinicalScopeFromLanOpsSnapshot } = await import('../../clinical-access-runtime.mjs');
    let applied = false;
    if (isClinicalOpsLanAvailable()) {
      const result = await applyClinicalOpsLanSnapshot(clinicalOps);
      if (result.ok) {
        await refreshClinicalOpsSnapshotCache();
        applied = true;
      }
    } else {
      applied = !!(await applyClinicalScopeFromLanOpsSnapshot(clinicalOps));
    }
    if (applied) {
      const { hydrateClinicalTeamsAfterCloudPull } = await import('./clinical-ops-hydrate.mjs');
      await hydrateClinicalTeamsAfterCloudPull();
    }
    return applied;
  } catch {
    return false;
  }
}

/**
 * Desktop Nube: always apply the full sala room; sidebar filters by team.
 * iPad/PWA: filter at apply only once joined teams are ready. If clinicalOps has not
 * hydrated yet, keep entries — otherwise a later clinicalOps revision never re-sends
 * census rows (revision already caught up) and the iPad stays empty forever.
 */
function shouldSkipTeamScopeFilterOnCloudPull() {
  if (!shouldEnforceTeamPatientMirror()) return true;
  return !isClinicalScopeReadyForLanPatientApply();
}

function cloudPatientEntryApplyOpts() {
  return {
    skipTodos: true,
    skipTeamScopeFilter: shouldSkipTeamScopeFilterOnCloudPull(),
  };
}

async function refreshCloudTodoUIs(patientIds) {
  const ids = Array.isArray(patientIds) ? patientIds : [];
  if (!ids.length) return;
  try {
    const mod = await import('../todos-refresh.mjs');
    if (typeof mod.refreshTodoUIsForPatients === 'function') {
      mod.refreshTodoUIsForPatients(ids);
    }
  } catch {
    /* optional */
  }
}

async function pruneStoredMobileLabHistoryAfterPull() {
  const labWin = await loadMobileLabWindowMod();
  if (!labWin.shouldApplyMobileLabHistoryWindow()) return false;
  let changed = false;
  Object.keys(labHistory || {}).forEach(function (pid) {
    const filtered = labWin.filterLabHistorySetsForMobileReference(labHistory[pid]);
    const before = Array.isArray(labHistory[pid]) ? labHistory[pid].length : 0;
    if (filtered.length === before) return;
    if (filtered.length) labHistory[pid] = filtered;
    else delete labHistory[pid];
    bumpLabHistoryRevision(pid);
    changed = true;
  });
  return changed;
}

async function finalizeCloudPullPatientScope() {
  try {
    const access = await import('../../clinical-access-runtime.mjs');
    if (shouldEnforceTeamPatientMirror()) {
      if (typeof access.finalizeMobileLanPatientCensus === 'function') {
        await access.finalizeMobileLanPatientCensus();
      }
      return;
    }
    const pruned = access.prunePatientsOutsideClinicalScope();
    if (pruned > 0 && typeof access.refreshDesktopPatientListAfterScopePrune === 'function') {
      await access.refreshDesktopPatientListAfterScopePrune();
    }
  } catch {
    /* optional */
  }
}

/**
 * @param {Record<string, unknown>} state
 * @param {{ skipTodos?: boolean }} [opts]
 */
export async function applyCloudState(state, opts) {
  if (!state) return { added: 0, updated: 0, removed: false };
  const labWin = await loadMobileLabWindowMod();
  let rawCounts = { patients: 0, sets: 0 };
  let filteredCounts = { patients: 0, sets: 0 };
  try {
    const labDiag = await loadLabSyncDiagMod();
    rawCounts = labDiag.countLabSidecarsInState(state);
  } catch {
    /* optional */
  }
  const snapshot = labWin.filterCloudStateForMobileLabWindow(state);
  try {
    const labDiag = await loadLabSyncDiagMod();
    filteredCounts = labDiag.countLabSidecarsInState(snapshot);
  } catch {
    /* optional */
  }
  await applyClinicalOpsSnapshot(snapshot.clinicalOps);
  const entries = cloudStateToLanEntries(snapshot);
  const idMap = buildLiveSyncPatientIdMap(entries, patients, {});
  const patientSync = entries.length
    ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts())
    : { added: 0, updated: 0 };

  let todoPatients = [];
  if (!opts?.skipTodos && snapshot.todos) todoPatients = applyCloudTodosMap(snapshot.todos, idMap);
  if (Array.isArray(snapshot.agenda)) {
    applyCloudAgendaMap(
      Object.fromEntries(
        snapshot.agenda
          .filter((item) => item && item.id)
          .map((item) => [String(item.id), item])
      ),
      idMap
    );
  }
  const removed = applyCloudTombstones(snapshot.tombstones || {});
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();

  if (patientSync.added || patientSync.updated || removed || prunedLabs) {
    saveState({ immediate: true });
  }
  await recordLabPullDiagnostics(patientSync, rawCounts, filteredCounts);
  return { ...patientSync, removed };
}

/** @param {unknown[]} ops */
export async function applyCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return { added: 0, updated: 0, removed: false };
  const labWin = await loadMobileLabWindowMod();
  let rawLabOps = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (String(ops[i]?.path || '').startsWith('labSidecars/')) rawLabOps += 1;
  }
  const trimmedOps = labWin.filterCloudPullOpsForMobileLabWindow(ops);
  let filteredLabOps = 0;
  for (let j = 0; j < trimmedOps.length; j += 1) {
    if (String(trimmedOps[j]?.path || '').startsWith('labSidecars/')) filteredLabOps += 1;
  }
  if (!trimmedOps.length) {
    const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();
    if (prunedLabs) saveState({ immediate: true });
    return { added: 0, updated: 0, removed: false };
  }
  const fold = createOpFold();
  for (let i = 0; i < trimmedOps.length; i += 1) {
    foldCloudOp(fold, trimmedOps[i]);
  }
  labWin.filterOpFoldLabSidecarsForMobile(fold);
  await applyClinicalOpsSnapshot(fold.clinicalOps);
  const entries = opFoldToLanEntries(fold);
  const idMap = buildLiveSyncPatientIdMap(entries, patients, {});
  const patientSync = entries.length
    ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts())
    : { added: 0, updated: 0 };
  const todoPatients = applyCloudTodosMap(fold.todos, idMap);
  applyCloudAgendaMap(fold.agenda, idMap);
  const removed = applyCloudTombstones(fold.tombstones);
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();

  if (patientSync.added || patientSync.updated || removed || prunedLabs) {
    saveState({ immediate: true });
  }
  await recordLabPullDiagnostics(
    patientSync,
    { patients: 0, sets: rawLabOps },
    { patients: 0, sets: filteredLabOps }
  );
  return { ...patientSync, removed };
}

/** @param {{ added?: number, updated?: number, removed?: boolean }} result */
async function refreshSidebarAfterCloudPull(result) {
  if (!result?.added && !result?.updated && !result?.removed) return;
  try {
    const { renderPatientList } = await import('../patients.mjs');
    renderPatientList({ silent: true });
  } catch {
    /* list optional during boot */
  }
}

/** @param {unknown} result */
export async function applyCloudPullResult(result) {
  if (!result || typeof result !== 'object') return { added: 0, updated: 0, removed: false };
  const row = result;
  let applied = { added: 0, updated: 0, removed: false };
  if (row.needSnapshot && row.state) {
    applied = await applyCloudState(row.state);
  } else if (Array.isArray(row.ops) && row.ops.length) {
    applied = await applyCloudOps(row.ops);
  }
  await refreshSidebarAfterCloudPull(applied);
  return applied;
}
