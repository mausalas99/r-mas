/**
 * Apply cloud pull results into local patient/note/lab state (LAN hydration paths).
 */
import { storage } from '../../storage.js';
import { saveState } from '../../app-state.mjs';
import { patients } from '../../app-state.mjs';
import { applyLanPatientEntries } from '../sync-apply/patient-entries.mjs';
import { removePatientLocally } from '../sync-apply/patient-delete.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  shouldEnforceTeamPatientMirror,
  shouldUseElevatedPatientCensus,
} from '../../clinical-privileges.mjs';
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

/** @param {Record<string, unknown>} todosMap @returns {string[]} */
function applyCloudTodosMap(todosMap) {
  const byPatient = {};
  for (const todo of Object.values(todosMap || {})) {
    if (!todo || typeof todo !== 'object') continue;
    const row = todo;
    const pid = String(row.patientId || '').trim();
    const id = String(row.id || '').trim();
    if (!pid || !id) continue;
    if (!byPatient[pid]) byPatient[pid] = storage.getTodos(pid).slice();
    const idx = byPatient[pid].findIndex(function (t) {
      return t && String(t.id) === id;
    });
    if (row._deleted) {
      if (idx >= 0) byPatient[pid].splice(idx, 1);
      continue;
    }
    if (idx >= 0) byPatient[pid][idx] = row;
    else byPatient[pid].push(row);
  }
  const changedPatients = [];
  for (const pid of Object.keys(byPatient)) {
    storage.saveTodos(pid, byPatient[pid]);
    changedPatients.push(pid);
  }
  return changedPatients;
}

/** @param {Record<string, unknown>} agendaMap */
function applyCloudAgendaMap(agendaMap) {
  const live = Object.values(agendaMap || {}).filter(function (item) {
    return item && typeof item === 'object' && !item._deleted;
  });
  storage.saveScheduledProcedures(live);
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
    if (isClinicalOpsLanAvailable()) {
      const result = await applyClinicalOpsLanSnapshot(clinicalOps);
      if (result.ok) {
        await refreshClinicalOpsSnapshotCache();
        return true;
      }
      return false;
    }
    return applyClinicalScopeFromLanOpsSnapshot(clinicalOps);
  } catch {
    return false;
  }
}

/** R4/Admin desktop ward census needs the full room; everyone else scopes at apply time. */
function shouldSkipTeamScopeFilterOnCloudPull() {
  if (shouldEnforceTeamPatientMirror()) return false;
  const user = clinicalSessionContext.user;
  return shouldUseElevatedPatientCensus(user);
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
  const patientSync = entries.length
    ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts())
    : { added: 0, updated: 0 };

  let todoPatients = [];
  if (!opts?.skipTodos && state.todos) todoPatients = applyCloudTodosMap(state.todos);
  if (Array.isArray(state.agenda)) {
    storage.saveScheduledProcedures(state.agenda.filter((item) => item && !item._deleted));
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
  const patientSync = entries.length
    ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts())
    : { added: 0, updated: 0 };
  const todoPatients = applyCloudTodosMap(fold.todos);
  applyCloudAgendaMap(fold.agenda);
  const removed = applyCloudTombstones(fold.tombstones);
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);

  if (patientSync.added || patientSync.updated || removed) {
    saveState({ immediate: true });
  }
  return { ...patientSync, removed };
}

/** @param {unknown} result */
export async function applyCloudPullResult(result) {
  if (!result || typeof result !== 'object') return { added: 0, updated: 0, removed: false };
  const row = result;
  if (row.needSnapshot && row.state) {
    return applyCloudState(row.state);
  }
  if (Array.isArray(row.ops) && row.ops.length) {
    return applyCloudOps(row.ops);
  }
  return { added: 0, updated: 0, removed: false };
}
