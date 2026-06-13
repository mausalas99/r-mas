// Built from app.js refactor — LAN / LiveSync (facade IM-11)
import { storage } from "../../storage.js";
import { isPitchPatientIsolationActive } from "../../tour-pitch-demo-seed.mjs";
import {
  lanClient,
  activeLiveSyncRoomId,
  getLanClientId,
} from "./runtime.mjs";
import {
  registerLanSyncPushBridge,
  pushClinicalOpsLanNow,
  scheduleLiveSyncPush,
  flushLiveSyncOutbox,
  pushRoomSyncBundleToHost,
  emitLiveSyncRevisionHint,
  scheduleReconcileFromRevisionHint,
  markUntypedDirty,
  scheduleUntypedSafetyBundle,
} from "./push.mjs";
import { lanMutationRegistry } from '../../lan-mutation-registry.mjs';
import { upsertHost, evictStale } from '../../lan-host-registry.mjs';
import { RoomSyncPhase, getRoomSyncPhase } from '../../lan-sync-state.mjs';
import { enqueueOutbox } from '../../live-sync-outbox.mjs';
import { mergeLiveSyncFullBundles } from "../../lan-merge-registry.mjs";
import { liveSyncDeletePatchesFromEntityMap } from "../../live-sync-room.mjs";
import {
  mergeEventualidades,
  mergeHistoriaClinica,
  mergeLabHistorySets,
} from "../../lan-patient-merge.mjs";
import { bumpLabHistoryRevision } from "../../lab-history-cache.mjs";
import {
  buildLiveSyncPatientIdMap,
  remapTodosPatientIds,
  remapAgendaPatientIds,
  attachTodosMapToPatientEntries,
  mergeTodoListsById,
} from "../../livesync-patient-ids.mjs";
import { getHostBundleBases, setHostBundleBases } from "../../host-bundle-bases.mjs";
import {
  applyClinicalOpsLanSnapshot,
  getCachedClinicalOpsSnapshot,
  isClinicalOpsLanAvailable,
  refreshClinicalOpsSnapshotCache,
} from "../../clinical-ops-lan.mjs";
import { mergePatientMonitoreoFromImported } from "../estado-actual-data.mjs";
import { mergeCensoPatientFields } from "../../patient-diagnosticos.mjs";
import { mergePatientRegistrationMeta } from "../../patient-registration-meta.mjs";
import { createMutationBuilder, wrapLiveSyncPatch } from "../../versioned-mutation.mjs";
import {
  applyDeltaPathValues,
  createDeltaEchoTracker,
  deltaLabelForPath,
  withRemoteDeltaApply,
} from "../../lan-delta-client.mjs";
import {
  guardAndSignLiveSyncMutation,
  migrateLocalPatientsClinicalSala,
  getClinicalScopeContextForEvaluate,
  fetchClinicalScopeContextFromDb,
  refreshClinicalPatientListForScope,
  isClinicalScopeReadyForLanPatientApply,
  applyClinicalScopeFromLanOpsSnapshot,
  finalizeMobileLanPatientCensus,
  pruneMobilePatientsOutsideTeamScope,
} from "../../clinical-access-runtime.mjs";
import { shouldEnforceTeamPatientMirror } from '../../clinical-privileges.mjs';
import { clinicalSessionContext } from "../../clinical-session-context.mjs";
import { filterPatientEntriesForLanTeamScope } from "../../lan-patient-team-scope.mjs";
import { isHostPatientOwnedByOtherClient } from './host-patients-annotate.mjs';
import {
  fetchHostPatientsList,
  invalidateHostPatientsCache,
} from './host-patients-snapshot.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../../clinical-settings.mjs';
import { buildLanCommand } from '../../lan-command-client.mjs';
import { notifyLwwOverwrite } from "../../lan-lww-toast.mjs";
import { perfMark, perfMeasure } from "../../perf-markers.mjs";
import {
  agendaEntityKey,
  todoEntityKey,
  patientEntityKey,
} from "../../live-sync-room.mjs";
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  medPharmProfileByPatient,
  vpoByPatient,
  recetaHuByPatient,
  listadoProblemas,
  medNotaSelectionByPatient,
  setPatients,
  setSaveStateHooks,
  saveState,
} from "../../app-state.mjs";
import {
  canLocalMacBeLanHost,
  isClinicalRankConfiguredForLan,
} from '../../lan-host-rank-policy.mjs';
import {
  isLanSessionConfiguredForRest,
  lanFetchAuthed,
  initLanClientFromStorage,
  persistLanClientConfig,
  isLanElectronDesktop,
  initLanHostPlugAndPlay,
  configureLanFromMobileJoin,
} from "./transport.mjs";
import {
  registerLanSyncRoomBridge,
  registerLanSyncRoomWireHandlers,
  bootLanRoomMembership,
  buildLiveSyncBundleEnvelope,
  saveLocalRoomSnapshot,
  applyRoomSyncPhaseAfterReconcile,
  syncLiveSyncStatusChrome,
  maybeRevertSurrogateToPrimary,
  getActiveLiveSyncRoomId,
  joinLanRoom,
  leaveLiveSyncRoom,
  refreshLanClinicalDirectoryFromRoom,
  fetchAndApplyClinicalOpsFromHost,
  waitForLiveChannelOpen,
  resumeAutoHostDetectAndReconnect,
} from "./room.mjs";
import { registerLanSyncTransportDeps } from "./transport.mjs";
import { getSurrogateHostState } from "../../lan-surrogate-host.mjs";
import {
  renderLanPanel,
  wireLanPanelDelegation,
  wireClinicalOpsLanSyncEvents,
  patchLanPanelJoinButtons,
  rememberLanRoomJoined,
  forgetLanRoomSession,
  updateLanConnectionBanner,
  startLanAutoDiscovery,
  openConnectionDropdown,
  focusLanShiftPinInput,
  resolveAutoJoinRoomId,
  saveLanSettingsFromUi,
  joinLanFromInviteUi,
  createLanRoomFromUi,
  deleteLanRoom,
  copyLanInviteLinkFromUi,
  copyMobileLanLinkFromUi,
  toggleConnectionDropdown,
  closeConnectionDropdown,
  openTeamSyncFromHeader,
  saveLanHostTeamCodeFromUi,
  resetLanSquadHostStateFromUi,
  resetLanTurnConnectionFromUi,
  dismissLanHostFirstTimeHint,
  dismissLanDisconnectBanner,
  setLanHideDisconnectBannerFromUi,
  syncSettingsLanHostDiskSection,
  syncLanHostTeamCodeSettingsInput,
  registerLanSyncPanelRuntime,
  refreshClinicalSessionTeams,
} from "./panel.mjs";

import {
  configureLanConflicts,
  acceptServerBundleConflict,
  acceptServerClinicalOpsConflict,
  appendLanConflictDraftsSection,
  handleSyncConflict,
  wsConflictDetailToPayload,
} from './conflicts.mjs';
import {
  configureLanEntityVersions,
  readLiveSyncEntityMap,
  getLiveSyncEntityBase,
  rememberLiveSyncEntity,
  rememberPatientDeleteTombstone,
  syncHostBundleEntityFromApplied,
  stampTodosWithEntityVersions,
  rememberTodosFromMap,
  buildLiveSyncMutationFromDesired,
  sendLiveSyncMutation,
} from './entity-versions.mjs';
import {
  configureLanPatientDelete,
  purgeLanPatientFromHost,
  removePatientLocally,
} from './patient-delete.mjs';

import {
  configureLanHistoriaSync,
  lanPushHistoriaClinica,
  lanPushHistoriaClinicaDelta,
  lanSyncPatientArchivedFlag,
  lanFetchHistoriaClinica,
} from './historia-sync.mjs';

import {
  configureLanPatientEntries,
  applyLanPatientEntries,
  lanJsonEqual,
  touchPatientLanUpdatedAt,
} from './patient-entries.mjs';

import {
  configureLanHostPatientHttp,
  lanFetchHostPatientRow,
  lanPushPatientVersioned,
  restoreLanPatientFromHost,
} from './host-patient-http.mjs';

import {
  emitLiveSyncAgendaUpsert,
  emitLiveSyncAgendaDelete,
  emitLiveSyncTodoUpsert,
  emitLiveSyncTodoDelete,
  emitLiveSyncPatientDelete,
} from './live-sync-emit.mjs';



let _lanLastPingAt = null;
let _lanLastPingStatus = 0;

const deltaEchoTracker = createDeltaEchoTracker(getLanClientId());

function scheduleTierALanServerWarm() {
  if (!isLanElectronDesktop()) return;
  if (typeof window === 'undefined' || !window.electronAPI?.ensureLanServerReady) return;
  if (!isClinicalRankConfiguredForLan()) return;
  var uiRole = typeof storage.getLanUiRole === 'function' ? storage.getLanUiRole() : '';
  if (uiRole === 'host' && canLocalMacBeLanHost()) {
    void window.electronAPI.ensureLanServerReady();
    return;
  }
  if (uiRole === 'client') {
    if (typeof storage.getLanConfig === 'function' && storage.getLanConfig()) {
      void window.electronAPI.ensureLanServerReady();
      return;
    }
  }
  if (getSurrogateHostState()) {
    void window.electronAPI.ensureLanServerReady();
    return;
  }
  if (getActiveLiveSyncRoomId()) {
    void window.electronAPI.ensureLanServerReady();
  }
}

function renderPatientListLanSilent() {
  runtime.renderPatientList({ silent: true });
}

let runtime = {
  showToast() {},
  renderPatientList(_opts) {},
  renderNoteForm() {},
  renderLabHistoryPanel() {},
  getActiveId() {
    return null;
  },
  setActiveId() {},
  getActiveAppTab() {
    return "lab";
  },
  selectPatient() {},
  isMobileWeb() {
    return false;
  },
  renderProcedureAgendaPanel() {},
  refreshAllTodoUIs() {},
  refreshTodoUIsForPatient() {},
  refreshTodoUIsForPatients() {},
  syncWorkContextChrome() {},
  findPatientByRegistro() {
    return null;
  },
  ensureUniquePatientName(x) {
    return x;
  },
  applyImportEntry() {
    return "";
  },
  syncSettingsLanHostDiskSection() {},
  buildPatientEntry() {
    return null;
  },
  closeSettingsDropdown() {},
};

/** Dev-only: profiled bundle merge (Phase 0 LAN sync gate). */
export function profiledMergeLiveSyncFullBundles(sources) {
  perfMark('lan-sync-merge-start');
  var merged = mergeLiveSyncFullBundles(sources);
  perfMark('lan-sync-merge-end');
  perfMeasure('lan-sync-merge', 'lan-sync-merge-start', 'lan-sync-merge-end');
  return merged;
}

function profiledRefreshTodoUIsAfterReconcile(touchedTodoPatientIds) {
  perfMark('lan-sync-todos-refresh-start');
  try {
    if (typeof runtime.refreshTodoUIsForPatients === 'function') {
      runtime.refreshTodoUIsForPatients(touchedTodoPatientIds);
    } else if (typeof runtime.refreshTodoUIsForPatient === 'function') {
      touchedTodoPatientIds.forEach(function (pid) {
        runtime.refreshTodoUIsForPatient(pid);
      });
    } else {
      runtime.refreshAllTodoUIs();
    }
  } finally {
    perfMark('lan-sync-todos-refresh-end');
    perfMeasure('lan-sync-todos-refresh', 'lan-sync-todos-refresh-start', 'lan-sync-todos-refresh-end');
  }
}

let _lanNetworkRefreshWired = false;

function wireLanNetworkRefresh() {
  if (_lanNetworkRefreshWired || typeof window === 'undefined') return;
  _lanNetworkRefreshWired = true;
  window.addEventListener('online', function () {
    void (async function () {
      /** @type {{ prefixes?: string[], candidateBaseUrl?: string }} */
      var payload = {};
      if (window.electronAPI?.getLanSubnetPrefixes && window.electronAPI?.getLanCandidateBaseUrl) {
        try {
          var prefixes = await window.electronAPI.getLanSubnetPrefixes();
          var candidateBaseUrl = await window.electronAPI.getLanCandidateBaseUrl();
          payload = { prefixes: prefixes || [], candidateBaseUrl: candidateBaseUrl || '' };
        } catch (_eOnline) {}
      }
      var m = await import('../../lan-network-change.mjs');
      if (typeof m.handleLanNetworkChanged === 'function') {
        await m.handleLanNetworkChanged(payload);
      }
    })();
  });
  if (window.electronAPI && typeof window.electronAPI.onLanNetworkChanged === 'function') {
    window.electronAPI.onLanNetworkChanged(function (payload) {
      void import('../../lan-network-change.mjs').then(function (m) {
        if (typeof m.handleLanNetworkChanged === 'function') {
          return m.handleLanNetworkChanged(payload || {});
        }
      });
    });
  }
}

export function registerLanRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(runtime, ctx);
  wireLanNetworkRefresh();
  void (async function () {
    const { isClinicalLocalOnlyMode, readRpcSettings } = await import('../../clinical-settings.mjs');
    if (isClinicalLocalOnlyMode(readRpcSettings())) return;
    const pin = await import('../../lan-shift-pin-connect.mjs');
    if (typeof pin.tryEasyLanShiftPinConnect === 'function') {
      await pin.tryEasyLanShiftPinConnect({ silent: true });
    }
    await initLanHostPlugAndPlay();
  })();
}

/** @param {string} patientId */
/** Pull host monitoreo (interno vitals) into local patient row. */
export async function hydrateLocalPatientMonitoreoFromHost(patientId) {
  const pid = String(patientId || '').trim();
  if (!pid || !isLanSessionConfiguredForRest()) return { ok: false, error: 'not_configured' };
  const hostRow = await lanFetchHostPatientRow(pid);
  if (!hostRow) return { ok: false, error: 'not_found' };
  const local = patients.find((p) => p && String(p.id) === pid);
  if (!local) return { ok: false, error: 'local_missing' };
  const before = JSON.stringify(local.monitoreo || null);
  mergePatientMonitoreoFromImported(local, hostRow);
  if (hostRow.nombre && String(hostRow.nombre).trim()) local.nombre = hostRow.nombre;
  if (hostRow.cuarto) local.cuarto = hostRow.cuarto;
  if (hostRow.cama) local.cama = hostRow.cama;
  mergeCensoPatientFields(local, hostRow);
  mergePatientRegistrationMeta(local, hostRow);
  const changed = before !== JSON.stringify(local.monitoreo || null);
  if (changed) await saveState({ immediate: true });
  return { ok: true, changed };
}

/** Host Mac: interno vitals POST → IPC → refresh guardia census (LAN mode not required). */
export function wireInternoHostSyncBridge() {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  if (typeof window.electronAPI.onInternoHostSync !== 'function') return;
  if (window.__rpcInternoHostSyncWired) return;
  window.__rpcInternoHostSyncWired = true;
  window.electronAPI.onInternoHostSync((payload) => {
    void handleInternoHostSyncBroadcast(payload);
  });
}

async function handleInternoHostSyncBroadcast(detail) {
  const pid = String(detail?.patientId || '').trim();
  if (detail?.type === 'patients-updated' && pid) {
    const local = patients.find((p) => p && String(p.id) === pid);
    if (local && detail.monitoreo && typeof detail.monitoreo === 'object') {
      mergePatientMonitoreoFromImported(local, { monitoreo: detail.monitoreo });
      await saveState({ immediate: true });
    } else {
      await hydrateLocalPatientMonitoreoFromHost(pid);
    }
  }
  if (detail?.type === 'patients-updated' || detail?.type === 'guardias-updated') {
    await refreshGuardiaCensusFromDb();
    if (typeof runtime.renderPatientList === 'function') runtime.renderPatientList();
    document.dispatchEvent(
      new CustomEvent('rpc-interno-vitals-synced', { detail: { patientId: pid } })
    );
  }
}

function collectPatientIdsForLiveSync() {
  return patients
    .filter(function (p) {
      return p && p.id && String(p.id).indexOf('demo-') !== 0;
    })
    .map(function (p) {
      return String(p.id);
    });
}
function collectTodosMapForLiveSync() {
  var out = {};
  collectPatientIdsForLiveSync().forEach(function (pid) {
    var list = storage.getTodos(pid);
    if (list.length) out[pid] = list;
  });
  return out;
}
function collectPatientEntriesForLanSync() {
  var out = [];
  patients.forEach(function (p) {
    if (!p || !p.id || String(p.id).indexOf('demo-') === 0) return;
    var entry = runtime.buildPatientEntry(p.id);
    if (entry) out.push(entry);
  });
  if (!isClinicalScopeReadyForLanPatientApply()) return [];
  var user = clinicalSessionContext.user;
  if (!user?.user_id) return [];
  return filterPatientEntriesForLanTeamScope(
    out,
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
}

function buildLiveSyncLocalMergeSource() {
  return {
    agenda: storage.getScheduledProcedures(),
    todos: collectTodosMapForLiveSync(),
    entries: collectPatientEntriesForLanSync(),
    clinicalOps: getCachedClinicalOpsSnapshot(),
    patches: liveSyncDeletePatchesFromEntityMap(readLiveSyncEntityMap()),
  };
}

/*
 * V2 clinical ops LAN merge (rotation_cycles, patient_team_assignment,
 * team_guardia_today, teams, active_guardias) — LiveSync room names unchanged.
 *
 * - team_guardia_today: last-write per team_id by declared_at
 * - teams metadata: last-write per team_id (created_at tie-break)
 * - patient_team_assignment, team_membership: union — never silent delete
 * - active_guardias: last-write per patient by assigned_at
 * - rotation.nueva: signed audit event; peers apply archive + guardia clear when
 *   incoming rotationNuevaAt is newer than local (see lib/db/clinical-ops-sync.mjs)
 *
 * Host sync-bundle and WS livesync:bundle carry `clinicalOps` snapshot; renderer
 * applies via db:clinical-ops-merge. db:clinical-save-all also accepts clinicalOps blob.
 */

function applyLiveSyncPatientDeletes(deletes, idMap) {
  if (!deletes || !deletes.length) return false;
  var changed = false;
  for (var i = 0; i < deletes.length; i += 1) {
    var d = deletes[i];
    if (!d || !d.deleted) continue;
    var remoteId = String(d.id || '').trim();
    var localId = remoteId && idMap && idMap[remoteId] ? idMap[remoteId] : remoteId;
    if (localId && removePatientLocally(localId)) {
      changed = true;
      continue;
    }
    var reg = String(d.registro || '').trim();
    if (reg) {
      var existing = runtime.findPatientByRegistro(reg);
      if (existing && removePatientLocally(existing.id)) changed = true;
    }
  }
  return changed;
}

async function applyLiveSyncMerged(merged) {
  if (!merged) return;
  if (isPitchPatientIsolationActive()) return;
  perfMark('lan-sync-bundle-apply-start');
  try {
  var clinicalOpsApplied = false;
  if (merged.clinicalOps) {
    if (isClinicalOpsLanAvailable()) {
      var opsResult = await applyClinicalOpsLanSnapshot(merged.clinicalOps);
      if (opsResult.ok) {
        clinicalOpsApplied = true;
        await refreshClinicalOpsSnapshotCache();
        await fetchClinicalScopeContextFromDb();
      } else if (opsResult.code !== 'DB_LOCKED' && !opsResult.deferred) {
        runtime.showToast(
          'No se pudieron sincronizar equipos ni usuarios LAN. Reintenta desde ⇄ o reinicia R+.',
          'warn'
        );
      }
    } else if (applyClinicalScopeFromLanOpsSnapshot(merged.clinicalOps)) {
      clinicalOpsApplied = true;
    }
  }
  var entries = merged.entries || [];
  var idMap = buildLiveSyncPatientIdMap(entries, patients, merged.todos || {});
  var patientRemoved = applyLiveSyncPatientDeletes(merged.patientDeletes || [], idMap);
  storage.saveScheduledProcedures(remapAgendaPatientIds(merged.agenda || [], idMap));
  var todosMap = remapTodosPatientIds(merged.todos || {}, idMap);
  if (activeLiveSyncRoomId) {
    var entityVersions = getHostBundleBases(activeLiveSyncRoomId).entityVersions;
    todosMap = stampTodosWithEntityVersions(todosMap, entityVersions);
    rememberTodosFromMap(todosMap);
  }
  var saveTodoPids = Object.create(null);
  Object.keys(todosMap).forEach(function (pid) {
    saveTodoPids[pid] = true;
  });
  (merged.todoTouchedPatientIds || []).forEach(function (pid) {
    var mapped = idMap[pid] || pid;
    if (mapped) saveTodoPids[mapped] = true;
  });
  var todosChanged = false;
  var changedTodoPids = [];
  Object.keys(saveTodoPids).forEach(function (pid) {
    var todoList = todosMap[pid] || [];
    var nextTodos = todoList;
    if (!lanJsonEqual(storage.getTodos(pid), nextTodos)) {
      storage.saveTodos(pid, nextTodos);
      todosChanged = true;
      changedTodoPids.push(pid);
    }
  });
  if (shouldEnforceTeamPatientMirror() && clinicalOpsApplied) {
    pruneMobilePatientsOutsideTeamScope();
  }
  var patientSync = entries.length ? applyLanPatientEntries(entries, { skipTodos: true }) : null;
  var patientsChanged = !!(patientSync && (patientSync.added || patientSync.updated));
  if (patientRemoved && !shouldEnforceTeamPatientMirror()) {
    renderPatientListLanSilent();
    if (runtime.getActiveId()) runtime.selectPatient(runtime.getActiveId());
    else {
      var pv = document.getElementById('patient-view');
      var es = document.getElementById('empty-state');
      if (pv) pv.style.display = 'none';
      if (es) es.style.display = 'flex';
      runtime.syncWorkContextChrome();
    }
  }
  if (runtime.getActiveAppTab() === 'agenda' || runtime.isMobileWeb()) {
    runtime.renderProcedureAgendaPanel();
  }
  if (todosChanged) {
    var refreshTodoPids = changedTodoPids;
    if ((merged.todoTouchedPatientIds || []).length) {
      refreshTodoPids = merged.todoTouchedPatientIds
        .map(function (pid) {
          return String(idMap[pid] || pid || '').trim();
        })
        .filter(function (pid) {
          return !!pid;
        });
    }
    profiledRefreshTodoUIsAfterReconcile(refreshTodoPids);
  }
  if (patientsChanged && runtime.getActiveId()) {
    try {
      runtime.renderNoteForm();
    } catch (_eNote) {}
    try {
      runtime.renderLabHistoryPanel();
    } catch (_eLab) {}
  }
  if (patientsChanged) migrateLocalPatientsClinicalSala();
  if (shouldEnforceTeamPatientMirror() && (clinicalOpsApplied || patientsChanged || patientRemoved)) {
    await finalizeMobileLanPatientCensus();
  } else if (patientsChanged || patientRemoved || clinicalOpsApplied) {
    void refreshClinicalPatientListForScope({ allowLanPull: false });
  }
  } finally {
    perfMark('lan-sync-bundle-apply-end');
    perfMeasure('lan-sync-bundle-apply', 'lan-sync-bundle-apply-start', 'lan-sync-bundle-apply-end');
  }
}

/** Re-apply host bundle patient rows after clinical-ops directorio catch-up. */
async function reapplyLanPatientEntries(entries) {
  if (!entries || !entries.length) return { added: 0, updated: 0 };
  await fetchClinicalScopeContextFromDb();
  return applyLanPatientEntries(entries, { skipTodos: true });
}

async function applyLiveSyncDeltaApplied(msg) {
  if (!msg || isPitchPatientIsolationActive()) return;
  if (msg.roomId && activeLiveSyncRoomId && msg.roomId !== activeLiveSyncRoomId) return;
  const ownEcho = deltaEchoTracker.isOwnEcho(msg);
  const partial = Array.isArray(msg.rejectedPaths) && msg.rejectedPaths.length > 0;
  if (ownEcho && !partial) {
    syncHostBundleEntityFromApplied(msg);
    return;
  }

  await withRemoteDeltaApply(async function () {
    if (msg.entityType === 'historiaClinica' && msg.entityId) {
      const row = patients.find(function (p) {
        return p && String(p.id) === String(msg.entityId);
      });
      if (row) {
        if (!row.historiaClinica) row.historiaClinica = { version: 0, data: {} };
        row.historiaClinica.data = applyDeltaPathValues(
          Object.assign({}, row.historiaClinica.data || {}),
          msg.pathValues || {}
        );
        row.historiaClinica.version = Number(msg.version || row.historiaClinica.version || 0);
        saveState({ immediate: true });
      }
    }
  });

  if (partial) {
    const labels = (msg.rejectedPaths || []).map(function (path) {
      return deltaLabelForPath(msg.entityType, path);
    });
    runtime.showToast('Tu cambio en "' + labels.join(', ') + '" fue reemplazado por una edición más reciente en la sala.', 'warn');
  }
  syncHostBundleEntityFromApplied(msg);
}

async function applyLabUpsertDelta(entry) {
  if (!entry || isPitchPatientIsolationActive()) return;
  if (entry.roomId && activeLiveSyncRoomId && entry.roomId !== activeLiveSyncRoomId) return;
  var pid = String(entry.patientId || '').trim();
  var set = entry.set;
  if (!pid || !set || !set.id) return;
  if (String(entry.originClientId || '') === String(getLanClientId())) {
    var setId = String(entry.setId || set.id);
    var existing = (labHistory[pid] || []).find(function (s) {
      return s && String(s.id) === setId;
    });
    if (existing && Number(existing._clientTimestamp || 0) >= Number(entry.clientTimestamp || 0)) {
      return;
    }
  }
  await withRemoteDeltaApply(async function () {
    var merged = mergeLabHistorySets(labHistory[pid] || [], [set]);
    if (lanJsonEqual(labHistory[pid], merged)) return;
    labHistory[pid] = merged;
    bumpLabHistoryRevision(pid);
    saveState({ immediate: true });
    if (runtime.getActiveId() === pid) {
      try {
        runtime.renderLabHistoryPanel();
      } catch (_eLab) {}
    }
  });
}

/**
 * Apply a batch of delta-log entries from GET /deltas (Flow B catch-up).
 * @param {string} roomId
 * @param {object[]} deltas
 */
async function applyLiveSyncDeltas(roomId, deltas) {
  if (!Array.isArray(deltas) || !deltas.length) return;
  var rid = String(roomId || '').trim();
  var sorted = deltas.slice().sort(function (a, b) {
    return Number(a.deltaSeq || a.seq || 0) - Number(b.deltaSeq || b.seq || 0);
  });
  for (var i = 0; i < sorted.length; i++) {
    var entry = sorted[i];
    if (entry && entry.type === 'command') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lan-command-applied', { detail: entry }));
      }
      continue;
    }
    if (entry && entry.type === 'lab_upsert') {
      await applyLabUpsertDelta(Object.assign({ roomId: rid }, entry));
      continue;
    }
    await applyLiveSyncDeltaApplied(Object.assign({ roomId: rid }, entry));
  }
}

function applyLiveSyncApplied(msg) {
  if (!msg || isPitchPatientIsolationActive()) return;
  if (msg.roomId && activeLiveSyncRoomId && msg.roomId !== activeLiveSyncRoomId) return;
  var entityType = msg.entityType;
  var entityId = String(msg.entityId || '').trim();
  var patientId = msg.patientId;
  var version = Number(msg.version || 1);
  var entityData = msg.data || {};
  if (!entityType || !entityId) return;

  rememberLiveSyncEntity(entityType, entityId, patientId, version, entityData);

  if (entityType === 'agenda') {
    var agenda = storage.getScheduledProcedures();
    if (entityData._deleted) {
      agenda = agenda.filter(function (ev) {
        return ev && ev.id !== entityId;
      });
    } else {
      var agendaFound = false;
      agenda = agenda.map(function (ev) {
        if (ev && ev.id === entityId) {
          agendaFound = true;
          return Object.assign({}, ev, entityData, { id: entityId, version: version });
        }
        return ev;
      });
      if (!agendaFound) {
        agenda.push(Object.assign({}, entityData, { id: entityId, version: version }));
      }
    }
    storage.saveScheduledProcedures(agenda);
    if (runtime.getActiveAppTab() === 'agenda' || runtime.isMobileWeb()) {
      runtime.renderProcedureAgendaPanel();
    }
  } else if (entityType === 'todo' && patientId) {
    var pid = String(patientId);
    if (pid.indexOf('demo-') !== 0) {
      var todos = storage.getTodos(pid);
      if (entityData._deleted) {
        todos = todos.filter(function (t) {
          return t && t.id !== entityId;
        });
      } else {
        var todoFound = false;
        todos = todos.map(function (t) {
          if (t && t.id === entityId) {
            todoFound = true;
            return Object.assign({}, t, entityData, { id: entityId, version: version });
          }
          return t;
        });
        if (!todoFound) {
          todos.push(Object.assign({}, entityData, { id: entityId, version: version }));
        }
      }
      storage.saveTodos(pid, todos);
    }
    perfMark('lan-sync-todos-refresh-start');
    try {
      if (typeof runtime.refreshTodoUIsForPatient === 'function') {
        runtime.refreshTodoUIsForPatient(pid);
      } else {
        runtime.refreshAllTodoUIs();
      }
    } finally {
      perfMark('lan-sync-todos-refresh-end');
      perfMeasure('lan-sync-todos-refresh', 'lan-sync-todos-refresh-start', 'lan-sync-todos-refresh-end');
    }
  } else if (entityType === 'patient') {
    var row = patients.find(function (p) {
      return p && p.id === entityId;
    });
    if (row && !entityData._deleted) {
      var before = JSON.stringify(row);
      Object.assign(row, entityData, { version: version });
      saveState({ immediate: true });
      if (JSON.stringify(row) !== before) renderPatientListLanSilent();
      if (runtime.getActiveId() === entityId) {
        try {
          runtime.renderNoteForm();
        } catch (_eNote) {}
        try {
          runtime.renderLabHistoryPanel();
        } catch (_eLab) {}
      }
    }
  }

  syncHostBundleEntityFromApplied(msg);

  if (msg.lwwApplied) {
    notifyLwwOverwrite(runtime, {
      entityType: msg.entityType,
      entityId: msg.entityId,
      overwrittenKeys: msg.overwrittenKeys || [],
    });
  } else if (msg.autoMerged) {
    runtime.showToast('Cambios fusionados automáticamente con el servidor.', 'success');
  }
}

var lanSyncBridgesWired = false;

/** Idempotent LAN bridge registration (safe when esbuild loads room/push before this module). */
export function wireLanSyncBridges() {
  if (lanSyncBridgesWired) return;
  lanSyncBridgesWired = true;

  configureLanPatientEntries({
    runtime: runtime,
    renderPatientListLanSilent: renderPatientListLanSilent,
  });
  configureLanHostPatientHttp({ runtime: runtime });
  configureLanEntityVersions({
    showToast: function (msg, type) {
      runtime.showToast(msg, type);
    },
  });
  configureLanConflicts({
    applyLiveSyncApplied: applyLiveSyncApplied,
    getLiveSyncEntityBase: getLiveSyncEntityBase,
    rememberLiveSyncEntity: rememberLiveSyncEntity,
    syncHostBundleEntityFromApplied: syncHostBundleEntityFromApplied,
    emitLiveSyncTodoDelete: emitLiveSyncTodoDelete,
    emitLiveSyncTodoUpsert: emitLiveSyncTodoUpsert,
    showToast: function (msg, type) {
      runtime.showToast(msg, type);
    },
  });
  configureLanHistoriaSync({
    runtime: runtime,
    lanPushPatientVersioned: lanPushPatientVersioned,
  });
  configureLanPatientDelete({
    lanFetchHostPatientRow: lanFetchHostPatientRow,
    lanPushPatientVersioned: lanPushPatientVersioned,
    emitLiveSyncPatientDelete: emitLiveSyncPatientDelete,
    scheduleLiveSyncPush: scheduleLiveSyncPush,
    runtime: runtime,
  });

  registerLanSyncPushBridge({
    isLanSessionConfiguredForRest,
    buildLiveSyncBundleEnvelope,
    saveLocalRoomSnapshot,
    buildLiveSyncLocalMergeSource,
    mergeLiveSyncFullBundles: profiledMergeLiveSyncFullBundles,
    applyLiveSyncMerged,
    applyLiveSyncDeltas,
    reapplyLanPatientEntries,
    applyRoomSyncPhaseAfterReconcile,
    fetchAndApplyClinicalOpsFromHost,
    syncLiveSyncStatusChrome,
    acceptServerBundleConflict,
    acceptServerClinicalOpsConflict,
    renderLanPanel,
    showToast: function (msg, type) {
      runtime.showToast(msg, type);
    },
  });

  registerLanSyncTransportDeps({
    get runtime() { return runtime; },
    renderLanPanel,
    joinLanRoom,
    resolveAutoJoinRoomId,
    openConnectionDropdown,
    bootLanRoomMembership,
  });

  registerLanSyncPanelRuntime(
    Object.assign(runtime, {
      appendLanConflictDraftsSection: appendLanConflictDraftsSection,
    })
  );

  registerLanSyncRoomBridge({
    runtime: runtime,
    renderLanPanel,
    patchLanPanelJoinButtons,
    rememberLanRoomJoined,
    initLanClientFromStorage,
    mergeLiveSyncFullBundles: profiledMergeLiveSyncFullBundles,
    applyLiveSyncMerged,
    applyLiveSyncApplied,
    applyLiveSyncDeltaApplied,
    buildLiveSyncLocalMergeSource,
    collectPatientEntriesForLanSync,
    collectPatientIdsForLiveSync,
    collectTodosMapForLiveSync,
    maybeRevertSurrogateToPrimary,
  });

  registerLanSyncRoomWireHandlers();

  lanMutationRegistry.registerMutationHandler('nota', async (pid, payload) => {
    const rid = getActiveLiveSyncRoomId();
    if (!rid) return;
    const res = await lanClient.fetch('/api/lan/v1/patients/' + encodeURIComponent(pid) + '/nota', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: payload,
        expectedVersion: 0,
        clientId: getLanClientId(),
        clientTimestamp: Date.now(),
      }),
    });
    if (!res || !res.ok) throw new Error('nota push failed');
  });
  lanMutationRegistry.setDomainOutboxKind('nota', 'nota_replace');

  lanMutationRegistry.registerMutationHandler('indicaciones', async (pid, payload) => {
    const rid = getActiveLiveSyncRoomId();
    if (!rid) return;
    const res = await lanClient.fetch('/api/lan/v1/patients/' + encodeURIComponent(pid) + '/indicaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: payload,
        expectedVersion: 0,
        clientId: getLanClientId(),
        clientTimestamp: Date.now(),
      }),
    });
    if (!res || !res.ok) throw new Error('indicaciones push failed');
  });
  lanMutationRegistry.setDomainOutboxKind('indicaciones', 'indicaciones_replace');

  lanMutationRegistry.registerMutationHandler('lab-history', async (pid, payload) => {
    const rid = getActiveLiveSyncRoomId();
    if (!rid) return;
    const set = payload;
    const res = await lanClient.fetch('/api/lan/v1/patients/' + encodeURIComponent(pid) + '/lab-history/upsert-set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        set,
        clientId: getLanClientId(),
        clientTimestamp: Date.now(),
      }),
    });
    if (!res || !res.ok) throw new Error('lab-history push failed');
  });
  lanMutationRegistry.setDomainOutboxKind('lab-history', 'lab_history_upsert');

  // 'patient-fields' has no typed handler on purpose: deletes propagate via
  // tombstone + bundle push; dispatch falls back to the untyped safety bundle.
  // The host PUT /patients/:id/fields endpoint remains for legacy outbox items.

  lanMutationRegistry.registerMutationHandler('entrega', async () => {
    await pushClinicalOpsLanNow();
  });

  lanMutationRegistry.configure({
    isActive: () => !!getActiveLiveSyncRoomId() && isLanSessionConfiguredForRest(),
    getActiveRoomId: getActiveLiveSyncRoomId,
    enqueueOutbox: (roomId, item) => enqueueOutbox(roomId, item),
    markUntypedDirty,
    scheduleUntypedSafetyBundle,
  });

  lanClient.addEventListener('lan-applied', function (ev) {
    applyLiveSyncApplied(ev.detail);
  });
  lanClient.addEventListener('lan-conflict', function (ev) {
    if (!ev.detail) return;
    var payload = wsConflictDetailToPayload(ev.detail);
    if (!payload.lwwApplied && payload.serverSnapshot && payload.serverSnapshot.data) {
      payload.lwwApplied = true;
    }
    void handleSyncConflict(payload);
  });
  wireInternoHostSyncBridge();

  lanClient.addEventListener('lan-patch', function (ev) {
    const data = ev.detail;
    if (data?.type === 'patients-updated' || data?.type === 'guardias-updated') {
      void handleInternoHostSyncBroadcast(data);
      return;
    }
    if (data?.type === 'livesync:hello') {
      const cfg = typeof storage.getLanConfig === 'function' ? storage.getLanConfig() || {} : {};
      const hostUrl = String(lanClient.baseUrl() || cfg.hostUrl || '')
        .trim()
        .replace(/\/+$/, '');
      if (hostUrl && data.clientId && data.startedAt) {
        upsertHost({
          fingerprint: `${data.clientId}:${data.startedAt}`,
          clientId: data.clientId,
          startedAt: data.startedAt,
          currentUrl: hostUrl,
          rank: data.rank || '',
          dbUnlocked: !!data.dbUnlocked,
          shiftPinActive: !!data.shiftPinActive,
          rttMs: 0,
          lastSeenAt: Date.now(),
          source: 'heartbeat',
        });
      }
      const roomId = String(activeLiveSyncRoomId || '').trim();
      if (roomId && getRoomSyncPhase(roomId) === RoomSyncPhase.offline) {
        resumeAutoHostDetectAndReconnect();
      }
      return;
    }
    syncLiveSyncStatusChrome();
  });
}

wireLanSyncBridges();

let _lanRuntimeStarted = false;
let _lanRegistryEvictionStarted = false;

function wireLanHostRegistryDiscovery() {
  if (typeof window === 'undefined') return;
  if (window.electronAPI?.onLanMdnsPeers) {
    window.electronAPI.onLanMdnsPeers((peers) => {
      if (!Array.isArray(peers)) return;
      peers.forEach((peer) => {
        if (!peer?.clientId || !peer?.startedAt) return;
        upsertHost({
          fingerprint: `${peer.clientId}:${peer.startedAt}`,
          clientId: peer.clientId,
          startedAt: peer.startedAt,
          currentUrl: peer.url,
          rank: peer.rank || '',
          dbUnlocked: false,
          shiftPinActive: false,
          rttMs: 0,
          lastSeenAt: Date.now(),
          source: 'mdns',
        });
      });
    });
  }
  if (!_lanRegistryEvictionStarted) {
    _lanRegistryEvictionStarted = true;
    setInterval(() => evictStale(90_000), 30_000);
  }
}

/** Start LAN client + discovery when not in solo-equipo mode (boot or after Ajustes switch). */
export function ensureLanSyncRuntimeStarted() {
  if (typeof document === 'undefined') return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;
  if (_lanRuntimeStarted) return;
  _lanRuntimeStarted = true;
  wireLanSyncBridges();
  initLanClientFromStorage();
  wireClinicalOpsLanSyncEvents();
  wireLanPanelDelegation();
  wireLanHostRegistryDiscovery();
  if (isLanElectronDesktop()) {
    scheduleTierALanServerWarm();
    startLanAutoDiscovery();
  }
}

if (typeof document !== 'undefined') {
  queueMicrotask(() => {
    wireInternoHostSyncBridge();
    ensureLanSyncRuntimeStarted();
  });
}

export function buildEstadoActualCommand(opts) {
  return buildLanCommand({
    ...opts,
    domain: 'estadoActual',
    op: 'updateField',
    entityId: `${opts.patientId}:estadoActual`,
    payload: { path: opts.path, value: opts.value },
  });
}

export function buildEventualidadAddCommand(opts) {
  return buildLanCommand({
    ...opts,
    domain: 'eventualidades',
    op: 'add',
    entityId: `${opts.patientId}:eventualidades`,
    payload: {
      eventualidadId: opts.eventualidadId,
      at: opts.at,
      text: opts.text,
    },
  });
}

export function buildPendienteCommand(opts) {
  const op = String(opts.op || '').trim();
  return buildLanCommand({
    ...opts,
    domain: 'pendientes',
    op,
    entityId: `${opts.patientId}:pendientes`,
    payload: {
      itemId: opts.itemId,
      text: opts.text,
      completed: op === 'complete' ? true : opts.completed,
    },
  });
}

export function registerLanSaveHooks(deps) {
  var post =
    deps && typeof deps.scheduleLabHistoryPostSaveMaintenance === 'function'
      ? deps.scheduleLabHistoryPostSaveMaintenance
      : function () {};
  setSaveStateHooks({
    before() {
      var aid = runtime.getActiveId();
      if (activeLiveSyncRoomId && aid) touchPatientLanUpdatedAt(aid);
    },
    after() {
      post();
      void import('../../clinical-access-runtime.mjs').then((mod) => {
        if (typeof mod.touchClinicalSessionActivity === 'function') {
          mod.touchClinicalSessionActivity({ force: true });
        }
      });
    },
  });
}


export { lanPushHistoriaClinica, lanPushHistoriaClinicaDelta, lanSyncPatientArchivedFlag, lanFetchHistoriaClinica } from './historia-sync.mjs';
export { acceptServerBundleConflict, acceptServerClinicalOpsConflict } from './conflicts.mjs';
export { rememberPatientDeleteTombstone } from './entity-versions.mjs';
export { purgeLanPatientFromHost, removePatientLocally } from './patient-delete.mjs';
export {
  lanFetchHostPatientRow,
  lanPushPatientVersioned,
  restoreLanPatientFromHost,
} from './host-patient-http.mjs';

export {
  appendLanConflictDraftsSection,
  pushClinicalOpsLanNow,
  refreshLanClinicalDirectoryFromRoom,
  fetchAndApplyClinicalOpsFromHost,
  emitLiveSyncAgendaUpsert,
  emitLiveSyncAgendaDelete,
  emitLiveSyncTodoUpsert,
  emitLiveSyncTodoDelete,
  emitLiveSyncPatientDelete,
  scheduleLiveSyncPush,
  touchPatientLanUpdatedAt,
  renderLanPanel,
  configureLanFromMobileJoin,
  syncLanHostTeamCodeSettingsInput,
  closeConnectionDropdown,
  openConnectionDropdown,
  focusLanShiftPinInput,
  isLanSessionConfiguredForRest,
  joinLanRoom,
  getActiveLiveSyncRoomId,
  persistLanClientConfig,
  syncSettingsLanHostDiskSection,
};

export const windowHandlers = {
  toggleConnectionDropdown,
  closeConnectionDropdown,
  openConnectionDropdown,
  openTeamSyncFromHeader,
  saveLanSettingsFromUi,
  saveLanHostTeamCodeFromUi,
  resetLanSquadHostStateFromUi,
  resetLanTurnConnectionFromUi,
  dismissLanHostFirstTimeHint,
  dismissLanDisconnectBanner,
  setLanHideDisconnectBannerFromUi,
  joinLanRoom,
  joinLanFromInviteUi,
  createLanRoomFromUi,
  deleteLanRoom,
  copyLanInviteLinkFromUi,
  copyMobileLanLinkFromUi,
};
