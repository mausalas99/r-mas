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

export {
  assembleLabHistoryFromSidecars,
  cloudEntryToLanEntry,
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  opFoldToLanEntries,
  opsToLanEntries,
} from './pull-apply-state.mjs';

/** @param {Record<string, unknown>} todosMap @param {Record<string, string>} [idMap] @returns {string[]} */
function applyCloudTodosMap(todosMap, idMap) {
  const byPatient = {};
  const map = idMap && typeof idMap === 'object' ? idMap : {};
  for (const todo of Object.values(todosMap || {})) {
    if (!todo || typeof todo !== 'object') continue;
    const row = todo;
    const remotePid = String(row.patientId || '').trim();
    const id = String(row.id || '').trim();
    if (!remotePid || !id) continue;
    const registro = String(row.registro || '').trim();
    const pid = resolveCloudTodoLocalPatientId(remotePid, registro, patients, map);
    if (!pid) continue;
    if (!byPatient[pid]) byPatient[pid] = storage.getTodos(pid).slice();
    const idx = byPatient[pid].findIndex(function (t) {
      return t && String(t.id) === id;
    });
    if (row._deleted) {
      if (idx >= 0) byPatient[pid].splice(idx, 1);
      continue;
    }
    const stored = { ...row, patientId: pid };
    if (idx >= 0) byPatient[pid][idx] = stored;
    else byPatient[pid].push(stored);
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
  await applyClinicalOpsSnapshot(state.clinicalOps);
  const entries = cloudStateToLanEntries(state);
  const idMap = buildLiveSyncPatientIdMap(entries, patients, {});
  const patientSync = entries.length
    ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts())
    : { added: 0, updated: 0 };

  let todoPatients = [];
  if (!opts?.skipTodos && state.todos) todoPatients = applyCloudTodosMap(state.todos, idMap);
  if (Array.isArray(state.agenda)) {
    applyCloudAgendaMap(
      Object.fromEntries(
        state.agenda
          .filter((item) => item && item.id)
          .map((item) => [String(item.id), item])
      ),
      idMap
    );
  }
  const removed = applyCloudTombstones(state.tombstones || {});
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);

  if (patientSync.added || patientSync.updated || removed) {
    saveState({ immediate: true });
  }
  return { ...patientSync, removed };
}

/** @param {unknown[]} ops */
export async function applyCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return { added: 0, updated: 0, removed: false };
  const fold = createOpFold();
  for (let i = 0; i < ops.length; i += 1) {
    foldCloudOp(fold, ops[i]);
  }
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

  if (patientSync.added || patientSync.updated || removed) {
    saveState({ immediate: true });
  }
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
