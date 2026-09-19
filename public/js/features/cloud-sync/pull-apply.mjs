/**
 * Apply cloud pull results into local patient/note/lab state (LAN hydration paths).
 */
import { storage } from '../../storage.js';
import { persistClinicalState, scheduleIdleClinicalPersist } from '../../app-state.mjs';
import { getSyncablePatients } from '../../app-state.mjs';
import { applyLanPatientEntries } from '../sync-apply/patient-entries.mjs';
import { removePatientLocally, pruneOrphanTodos } from '../sync-apply/patient-delete.mjs';
import { shouldEnforceTeamPatientMirror } from '../../clinical-privileges.mjs';
import { isClinicalScopeReadyForPatientApply } from '../../clinical-access-runtime/scope-ops.mjs';
import { getClinicalScopeContextForEvaluate } from '../../clinical-access-runtime/scope-evaluate.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { filterPatientsForDesktopCloudTeamScope } from '../../mobile-team-patient-scope.mjs';
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
import { getLabHistory } from '../../app-state.mjs';
import { getCloudSyncRoomSnapshot } from './settings.mjs';
import { getCachedRoomDek } from './room-dek.mjs';
import { fingerprintValue } from './crypto.mjs';

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
  const pid = resolveCloudTodoLocalPatientId(remotePid, registro, getSyncablePatients(), map);
  if (!pid) return;
  if (
    !getSyncablePatients().some(function (p) {
      return p && String(p.id) === String(pid);
    })
  ) {
    return;
  }
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

/**
 * A patient id with an active delete tombstone must never be reborn as a new
 * nameless shell from stale/residual entry data in the same pull. Drop those
 * entries before applyLanPatientEntries can call createNewPatientShell on them.
 * @param {Array<{ patient?: { id?: string } }>} entries
 * @param {Record<string, unknown>} [tombstones]
 */
export function excludeTombstonedEntries(entries, tombstones) {
  const deletedIds = tombstones ? Object.keys(tombstones) : [];
  if (!deletedIds.length) return entries;
  const deleted = new Set(deletedIds);
  return entries.filter(function (entry) {
    return !(entry && entry.patient && deleted.has(String(entry.patient.id || '')));
  });
}

/**
 * Guards against a same-pull-batch race: a tombstone op and a later resurrection
 * (re-admit under the same chart number, different patient id) can both land in
 * one incremental ops batch — this must not delete the resurrected patient.
 *
 * A non-E2EE room's tombstone still carries a plaintext `registro` (compared
 * directly). An E2EE room's tombstone only carries the one-way `registroFp`
 * (Part A/B) — this device fingerprints each other local patient's own registro
 * with the room DEK to compare, the same way the Worker never reads the real
 * value either. No DEK cached yet: fail open (apply the tombstone), same as an
 * empty registro — there's nothing to compare against.
 * @param {string} patientId @param {unknown} tombstoneMeta
 */
export async function shouldApplyCloudTombstone(patientId, tombstoneMeta) {
  const pid = String(patientId || '').trim();
  if (!pid) return false;
  const meta =
    tombstoneMeta && typeof tombstoneMeta === 'object'
      ? /** @type {{ registro?: string, registroFp?: string }} */ (tombstoneMeta)
      : {};
  const reg = String(meta.registro || '').trim();
  if (reg) {
    return !getSyncablePatients().some(function (p) {
      return p && String(p.id || '') !== pid && String(p.registro || '').trim() === reg;
    });
  }
  const fp = String(meta.registroFp || '').trim();
  if (!fp) return true;
  const roomId = getCloudSyncRoomSnapshot()?.id || '';
  const dek = roomId ? getCachedRoomDek(roomId) : null;
  if (!dek) return true;
  const candidates = getSyncablePatients().filter(
    (p) => p && String(p.id || '') !== pid && String(p.registro || '').trim()
  );
  for (const p of candidates) {
    if ((await fingerprintValue(dek, String(p.registro).trim())) === fp) return false;
  }
  return true;
}

/** @param {Record<string, unknown>} tombstones */
async function applyCloudTombstones(tombstones) {
  let removed = false;
  for (const patientId of Object.keys(tombstones || {})) {
    if (!(await shouldApplyCloudTombstone(patientId, tombstones[patientId]))) continue;
    if (removePatientLocally(patientId)) removed = true;
  }
  return removed;
}

async function applyClinicalOpsSnapshot(clinicalOps) {
  if (clinicalOps == null) return false;
  try {
    const { isClinicalOpsSyncAvailable, applyClinicalOpsSnapshot, refreshClinicalOpsSnapshotCache } =
      await import('../../clinical-ops-sync.mjs');
    const { applyClinicalScopeFromOpsSnapshot } = await import('../../clinical-access-runtime.mjs');
    let applied = false;
    if (isClinicalOpsSyncAvailable()) {
      const result = await applyClinicalOpsSnapshot(clinicalOps);
      if (result.ok) {
        await refreshClinicalOpsSnapshotCache();
        applied = true;
      }
    } else {
      applied = !!(await applyClinicalScopeFromOpsSnapshot(clinicalOps));
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
  return !isClinicalScopeReadyForPatientApply();
}

function cloudPatientEntryApplyOpts() {
  return {
    skipTodos: true,
    skipTeamScopeFilter: shouldSkipTeamScopeFilterOnCloudPull(),
  };
}

/** One browser paint between staged batches — otherwise both apply within
 * the same tick and nothing visibly arrives before the rest. */
function yieldToPaint() {
  return new Promise(function (resolve) {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(function () { resolve(); });
    else setTimeout(resolve, 0);
  });
}

/**
 * A fresh room join pulls the whole history as one state snapshot. Applying
 * it in one shot leaves the sidebar empty until every patient in the room is
 * in. Split off the caller's own joined-team patients so those can paint
 * first — a no-op split (empty own set, or everyone is own-team) just
 * returns everything as "rest" and the caller applies it in one go.
 * @param {Array<{ patient: { id: string } }>} entries
 * @returns {{ own: Array, rest: Array }}
 */
export function splitEntriesByOwnTeamFirst(entries) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return { own: [], rest: entries };
  const patients = entries.map((e) => e.patient).filter(Boolean);
  const ownPatients = filterPatientsForDesktopCloudTeamScope(
    patients,
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
  if (!ownPatients.length || ownPatients.length === entries.length) return { own: [], rest: entries };
  const ownIds = new Set(ownPatients.map((p) => String(p.id)));
  return {
    own: entries.filter((e) => ownIds.has(String(e.patient.id))),
    rest: entries.filter((e) => !ownIds.has(String(e.patient.id))),
  };
}

/** @param {Array<{ patient: { id: string } }>} entries */
async function applyPatientEntriesStaged(entries) {
  if (!entries.length) return { added: 0, updated: 0 };
  const { own, rest } = splitEntriesByOwnTeamFirst(entries);
  if (!rest.length || !own.length) return applyLanPatientEntries(entries, cloudPatientEntryApplyOpts());
  const first = applyLanPatientEntries(own, cloudPatientEntryApplyOpts());
  await yieldToPaint();
  const second = applyLanPatientEntries(rest, cloudPatientEntryApplyOpts());
  return { added: first.added + second.added, updated: first.updated + second.updated };
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
  Object.keys(getLabHistory() || {}).forEach(function (pid) {
    const filtered = labWin.filterLabHistorySetsForMobileReference(getLabHistory()[pid]);
    const before = Array.isArray(getLabHistory()[pid]) ? getLabHistory()[pid].length : 0;
    if (filtered.length === before) return;
    if (filtered.length) getLabHistory()[pid] = filtered;
    else delete getLabHistory()[pid];
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
  const entries = excludeTombstonedEntries(cloudStateToLanEntries(snapshot), snapshot.tombstones);
  const idMap = buildLiveSyncPatientIdMap(entries, getSyncablePatients(), {});
  const patientSync = await applyPatientEntriesStaged(entries);

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
  const removed = await applyCloudTombstones(snapshot.tombstones || {});
  pruneOrphanTodos(
    getSyncablePatients().map(function (p) {
      return p && p.id;
    })
  );
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();

  if (patientSync.added || patientSync.updated || removed || prunedLabs) {
    persistClinicalState({ domains: ['patients'] });
    scheduleIdleClinicalPersist();
  }
  await recordLabPullDiagnostics(patientSync, rawCounts, filteredCounts);
  return { ...patientSync, removed };
}

/** @param {ReturnType<typeof createOpFold>} fold @param {{ rawLabOps: number, filteredLabOps: number }} labCounts */
async function applyFoldedCloudPull(fold, labCounts) {
  await applyClinicalOpsSnapshot(fold.clinicalOps);
  const entries = excludeTombstonedEntries(opFoldToLanEntries(fold), fold.tombstones);
  const idMap = buildLiveSyncPatientIdMap(entries, getSyncablePatients(), {});
  const patientSync = entries.length
    ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts())
    : { added: 0, updated: 0 };
  const todoPatients = applyCloudTodosMap(fold.todos, idMap);
  applyCloudAgendaMap(fold.agenda, idMap);
  const removed = await applyCloudTombstones(fold.tombstones);
  pruneOrphanTodos(
    getSyncablePatients().map(function (p) {
      return p && p.id;
    })
  );
  await finalizeCloudPullPatientScope();
  await refreshCloudTodoUIs(todoPatients);
  const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();

  if (patientSync.added || patientSync.updated || removed || prunedLabs) {
    persistClinicalState({ domains: ['patients'] });
    scheduleIdleClinicalPersist();
  }
  await recordLabPullDiagnostics(
    patientSync,
    { patients: 0, sets: labCounts.rawLabOps },
    { patients: 0, sets: labCounts.filteredLabOps }
  );
  return { ...patientSync, removed };
}

function countLabSidecarOps(ops) {
  let n = 0;
  for (let i = 0; i < (ops || []).length; i += 1) {
    if (String(ops[i]?.path || '').startsWith('labSidecars/')) n += 1;
  }
  return n;
}

/** @param {unknown[]} ops */
export async function applyCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return { added: 0, updated: 0, removed: false };
  const labWin = await loadMobileLabWindowMod();
  const rawLabOps = countLabSidecarOps(ops);
  const trimmedOps = labWin.filterCloudPullOpsForMobileLabWindow(ops);
  const filteredLabOps = countLabSidecarOps(trimmedOps);
  if (!trimmedOps.length) {
    const prunedLabs = await pruneStoredMobileLabHistoryAfterPull();
    if (prunedLabs) scheduleIdleClinicalPersist();
    return { added: 0, updated: 0, removed: false };
  }
  const fold = createOpFold();
  for (let i = 0; i < trimmedOps.length; i += 1) {
    foldCloudOp(fold, trimmedOps[i]);
  }
  labWin.filterOpFoldLabSidecarsForMobile(fold);
  return applyFoldedCloudPull(fold, { rawLabOps, filteredLabOps });
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

/**
 * The sidebar refresh above repaints the patient list, not the chart already
 * open on screen — without this, a patient whose eventualidades/signos just
 * arrived from another device keeps showing the stale chart until the owner
 * switches away and back, or reloads. Safe to call on every pull: it's a
 * no-op unless the open patient is the one that changed, and it never fires
 * while a text field in the chart is focused (see refreshActivePatientViewIfOpen).
 * @param {{ added?: number, updated?: number, removed?: boolean }} result
 */
async function refreshActivePatientChartAfterCloudPull(result) {
  if (!result?.added && !result?.updated && !result?.removed) return;
  try {
    const { refreshActivePatientViewIfOpen } = await import('../patients-select.mjs');
    refreshActivePatientViewIfOpen();
  } catch {
    /* optional during boot */
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
  await refreshActivePatientChartAfterCloudPull(applied);
  return applied;
}
