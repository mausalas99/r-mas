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
import { enqueueOutbox } from '../../live-sync-outbox.mjs';
import { mergeLiveSyncFullBundles } from "../../lan-merge-registry.mjs";
import { liveSyncDeletePatchesFromEntityMap } from "../../live-sync-room.mjs";
import {
  mergeEventualidades,
  mergeHistoriaClinica,
} from "../../lan-patient-merge.mjs";
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
} from "../../clinical-access-runtime.mjs";
import { clinicalSessionContext } from "../../clinical-session-context.mjs";
import { filterPatientEntriesForLanTeamScope } from "../../lan-patient-team-scope.mjs";
import { isClinicalLocalOnlyMode, readRpcSettings } from '../../clinical-settings.mjs';
import { buildLanCommand } from '../../lan-command-client.mjs';
import {
  deleteDraftConflict,
  listDraftConflicts,
  clearAllDraftConflicts,
  countDraftConflicts,
} from "../../draft-conflict-store.mjs";
import { conflictSnapshotsMatchForAutoResolve } from "../../lan-conflict-silent-match.mjs";
import { notifyLwwOverwrite } from "../../lan-lww-toast.mjs";
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

let _lanNetworkRefreshWired = false;

function wireLanNetworkRefresh() {
  if (_lanNetworkRefreshWired || typeof window === 'undefined') return;
  _lanNetworkRefreshWired = true;
  window.addEventListener('online', function () {
    void import('./room.mjs').then(function (m) {
      if (typeof m.resumeAutoHostDetectAndReconnect === 'function') {
        m.resumeAutoHostDetectAndReconnect();
      }
    });
    void initLanHostPlugAndPlay();
    if (typeof renderLanPanel === 'function') void renderLanPanel();
  });
}

export function registerLanRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(runtime, ctx);
  wireLanNetworkRefresh();
  void import('../../lan-shift-pin-connect.mjs').then(function (m) {
    if (typeof m.tryEasyLanShiftPinConnect === 'function') {
      return m.tryEasyLanShiftPinConnect({ silent: true });
    }
  });
  void initLanHostPlugAndPlay();
}

const LIVE_SYNC_ENTITIES_LS = 'rpc-lan-live-entities';

function readLiveSyncEntityMap() {
  try {
    var raw = localStorage.getItem(LIVE_SYNC_ENTITIES_LS);
    var parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_e) {
    return {};
  }
}

function liveSyncEntityStoreKey(entityType, entityId, patientId) {
  if (entityType === 'todo') return 'todo:' + String(patientId || '') + ':' + String(entityId || '');
  if (entityType === 'agenda') return 'agenda:' + String(entityId || '');
  if (entityType === 'patient') return 'patient:' + String(entityId || '');
  return String(entityType || '') + ':' + String(entityId || '');
}

function getLiveSyncEntityBase(entityType, entityId, patientId) {
  var map = readLiveSyncEntityMap();
  return map[liveSyncEntityStoreKey(entityType, entityId, patientId)] || null;
}

function rememberLiveSyncEntity(entityType, entityId, patientId, version, data) {
  var map = readLiveSyncEntityMap();
  var row = Object.assign({}, data || {}, { version: Number(version || 1) });
  map[liveSyncEntityStoreKey(entityType, entityId, patientId)] = row;
  try {
    localStorage.setItem(LIVE_SYNC_ENTITIES_LS, JSON.stringify(map));
  } catch (_e) {}
}

/** Local tombstone so LAN reconcile cannot resurrect a patient pending delete sync. */
export function rememberPatientDeleteTombstone(patient) {
  if (!patient || !patient.id || String(patient.id).indexOf('demo-') === 0) return;
  var pid = String(patient.id);
  var cached = getLiveSyncEntityBase('patient', pid, null) || {};
  var ver = cached.version != null ? Number(cached.version) + 1 : 1;
  rememberLiveSyncEntity('patient', pid, null, ver, {
    id: pid,
    registro: String(patient.registro || '').trim(),
    _deleted: true,
    updatedAt: new Date().toISOString(),
  });
}

function syncHostBundleEntityFromApplied(msg) {
  var rid = String((msg && msg.roomId) || activeLiveSyncRoomId || '').trim();
  if (!rid || !msg || msg.version == null) return;
  var bases = getHostBundleBases(rid);
  var key = null;
  if (msg.entityType === 'agenda') key = agendaEntityKey(msg.entityId);
  else if (msg.entityType === 'todo' && msg.patientId) {
    key = todoEntityKey(msg.patientId, msg.entityId);
  } else if (msg.entityType === 'patient') {
    var reg = msg.data && msg.data.registro;
    key = patientEntityKey(msg.entityId, reg);
  }
  if (!key) return;
  var entityVersions = Object.assign({}, bases.entityVersions || {});
  entityVersions[key] = Number(msg.version);
  setHostBundleBases(rid, {
    revision: bases.revision,
    entityVersions: entityVersions,
  });
}

function stampTodosWithEntityVersions(todosMap, entityVersions) {
  var versions = entityVersions && typeof entityVersions === 'object' ? entityVersions : {};
  var out = {};
  Object.keys(todosMap || {}).forEach(function (pid) {
    out[pid] = (todosMap[pid] || []).map(function (t) {
      if (!t || !t.id) return t;
      var key = liveSyncEntityStoreKey('todo', t.id, pid);
      if (versions[key] == null) return t;
      return Object.assign({}, t, { version: Number(versions[key]) });
    });
  });
  return out;
}

function rememberTodosFromMap(todosMap) {
  Object.keys(todosMap || {}).forEach(function (pid) {
    (todosMap[pid] || []).forEach(function (t) {
      if (!t || !t.id) return;
      var ver = Number(t.version || 0);
      if (!ver) return;
      rememberLiveSyncEntity('todo', t.id, pid, ver, t);
    });
  });
}

function buildLiveSyncMutationFromDesired(entityType, entityId, desired, extra) {
  extra = extra || {};
  var patientId = extra.patientId;
  var cached = getLiveSyncEntityBase(entityType, entityId, patientId);
  var base = cached
    ? Object.assign({}, cached)
    : { id: entityId, version: Number(desired && desired.version != null ? desired.version : 0) };
  if (entityType === 'todo' && patientId && !base.patientId) base.patientId = patientId;
  var builder = createMutationBuilder(entityType, entityId).captureBase(base);
  var hasChange = false;
  Object.keys(desired || {}).forEach(function (key) {
    if (key === 'version') return;
    if (desired[key] !== base[key]) {
      builder.set(key, desired[key]);
      hasChange = true;
    }
  });
  if (!hasChange && desired) {
    Object.keys(desired).forEach(function (key) {
      if (key === 'version') return;
      builder.set(key, desired[key]);
    });
  }
  return builder.build(extra);
}

function sendLiveSyncMutation(mutation) {
  if (!activeLiveSyncRoomId || !mutation) return;
  var rid = String(activeLiveSyncRoomId || '').trim();
  var envelope = wrapLiveSyncPatch(rid, getLanClientId(), mutation);

  function transmit() {
    if (!lanClient.liveConnected) return false;
    void guardAndSignLiveSyncMutation(mutation, envelope)
      .then(function () {
        lanClient.sendLive(envelope);
      })
      .catch(function (err) {
        if (err && err.code === 'CLINICAL_ACCESS_DENIED') {
          runtime.showToast(String(err.message || 'Acceso clínico denegado'), 'error');
        }
      });
    return true;
  }

  if (transmit()) return;
  try {
    lanClient.connectLiveChannel(rid);
  } catch (_eConn) {}
  void waitForLiveChannelOpen(rid, 4500).then(function () {
    transmit();
  });
}

function isRoomBundleConflictDraft(draft) {
  return !!(draft && (draft.scope || draft.localBundle || draft.entityType === 'roomBundle'));
}

async function clearConflictDraft(draftId) {
  if (!draftId) return;
  try {
    await deleteDraftConflict(draftId);
  } catch (_e) {}
  void renderLanPanel();
}

async function discardDraftsForConflictEntity(payload) {
  if (!payload || !payload.entityType || !payload.entityId) return;
  var drafts = [];
  try {
    drafts = await listDraftConflicts();
  } catch (_eList) {
    return;
  }
  var roomId = payload.roomId || null;
  for (var i = 0; i < drafts.length; i += 1) {
    var d = drafts[i];
    if (!d || !d.id || isRoomBundleConflictDraft(d)) continue;
    if (d.entityType !== payload.entityType || String(d.entityId) !== String(payload.entityId)) continue;
    if (roomId != null && d.roomId != null && String(d.roomId) !== String(roomId)) continue;
    try {
      await deleteDraftConflict(d.id);
    } catch (_eDel) {}
  }
}

/**
 * Align revision + clinicalOps from host without merging full census (fast, non-blocking).
 * @returns {boolean}
 */
export function acceptServerBundleConflict(opts) {
  opts = opts || {};
  var rid = String(opts.roomId || '').trim();
  var bundle = opts.serverBundle;
  if (!rid || !bundle || typeof bundle !== 'object') return false;
  setHostBundleBases(rid, bundle);
  if (bundle.clinicalOps && isClinicalOpsLanAvailable()) {
    void applyClinicalOpsLanSnapshot(bundle.clinicalOps).then(function (result) {
      if (result.ok) {
        void refreshClinicalOpsSnapshotCache();
        if (result.changed) {
          document.dispatchEvent(new CustomEvent('rpc-clinical-ops-synced'));
        }
      }
    });
  }
  applyRoomSyncPhaseAfterReconcile(rid);
  return true;
}

/** @returns {Promise<boolean>} */
export function acceptServerClinicalOpsConflict(roomId, snapshot, revision) {
  var rid = String(roomId || '').trim();
  if (!rid) return Promise.resolve(false);
  if (revision != null) {
    var bases = getHostBundleBases(rid) || { entityVersions: {} };
    setHostBundleBases(rid, {
      revision: Number(revision),
      entityVersions: bases.entityVersions || {},
    });
  }
  if (snapshot && isClinicalOpsLanAvailable()) {
    return applyClinicalOpsLanSnapshot(snapshot).then(function (result) {
      if (result.ok) {
        void refreshClinicalOpsSnapshotCache();
        if (result.changed) {
          document.dispatchEvent(new CustomEvent('rpc-clinical-ops-synced'));
        }
      }
      applyRoomSyncPhaseAfterReconcile(rid);
      return !!result.ok;
    });
  }
  applyRoomSyncPhaseAfterReconcile(rid);
  return Promise.resolve(revision != null);
}

async function applyConflictUseServer(payload) {
  var server = payload && payload.serverSnapshot;
  if (server && server.data) {
    if (payload.entityType === 'historiaClinica' && payload.patientId) {
      var hcRow = patients.find(function (p) {
        return p && String(p.id) === String(payload.patientId);
      });
      if (hcRow) {
        var mod = await import('../../historia-clinica-lan-sync.mjs');
        mod.applyServerHistoriaClinicaToPatient(hcRow, server.version, server.data);
      }
    } else {
      applyLiveSyncApplied({
        roomId: payload.roomId || activeLiveSyncRoomId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        patientId: payload.patientId,
        version: server.version,
        data: server.data,
      });
    }
  }
  if (payload.draftId) {
    await clearConflictDraft(payload.draftId);
  }
}

function clearHistoriaPendingAfterConflict(payload) {
  if (!payload || payload.entityType !== 'historiaClinica' || !payload.patientId) return;
  var row = patients.find(function (p) {
    return p && String(p.id) === String(payload.patientId);
  });
  if (!row || !row.historiaClinica) return;
  delete row.historiaClinica.pendingLanSync;
  delete row.historiaClinica.lanSyncPending;
  saveState();
}

function mergeConflictSnapshotData(snap) {
  if (!snap) return {};
  var base = snap.baseData && typeof snap.baseData === 'object' ? snap.baseData : {};
  var patch = snap.data && typeof snap.data === 'object' ? snap.data : {};
  return Object.assign({}, base, patch);
}

function conflictDataForViewer(payload) {
  var local = mergeConflictSnapshotData(payload && payload.localSnapshot);
  var server =
    payload && payload.serverSnapshot && payload.serverSnapshot.data
      ? Object.assign({}, payload.serverSnapshot.data)
      : {};
  if (payload && payload.entityType === 'todo' && (!server.text || server.completed == null)) {
    var cached = getLiveSyncEntityBase('todo', payload.entityId, payload.patientId);
    if (cached) server = Object.assign({}, cached, server);
  }
  return { localData: local, serverData: server };
}

function shouldAutoResolveTodoConflict(payload) {
  if (!payload || payload.entityType !== 'todo') return false;
  if (payload.localSnapshot && payload.localSnapshot.op === 'delete') return true;
  var local = mergeConflictSnapshotData(payload.localSnapshot);
  var server = payload.serverSnapshot && payload.serverSnapshot.data;
  return !!(local.completed || (server && server.completed));
}

function tryAutoResolveTodoConflict(payload) {
  var server = payload.serverSnapshot;
  if (!server || server.version == null || !payload.patientId) return false;
  var local = mergeConflictSnapshotData(payload.localSnapshot);
  var merged = Object.assign({}, server.data || {}, local, {
    id: payload.entityId,
    version: server.version,
  });
  if (payload.localSnapshot && payload.localSnapshot.op === 'delete') {
    rememberLiveSyncEntity(
      'todo',
      payload.entityId,
      payload.patientId,
      server.version,
      Object.assign({}, server.data || {}, { id: payload.entityId })
    );
    emitLiveSyncTodoDelete(payload.patientId, {
      id: payload.entityId,
      version: server.version,
    });
    return true;
  }
  if (local.completed) {
    merged.completed = true;
    emitLiveSyncTodoUpsert(payload.patientId, merged);
    return true;
  }
  return false;
}

async function appendLanConflictDraftsSection(root) {
  if (!root) return;
  var draftCount = 0;
  try {
    draftCount = await countDraftConflicts();
  } catch (_eList) {
    draftCount = 0;
  }
  if (!draftCount) return;

  var prev = root.querySelector('#lan-conflict-drafts-card');
  if (prev) prev.remove();

  var card = document.createElement('div');
  card.id = 'lan-conflict-drafts-card';
  card.className = 'lan-connect-card';

  var title = document.createElement('div');
  title.className = 'lan-connect-card-title';
  title.textContent = 'Conflictos antiguos';
  card.appendChild(title);

  var hint = document.createElement('p');
  hint.className = 'lan-connect-card-hint';
  hint.textContent =
    draftCount +
    ' borrador(es) de conflictos anteriores. La sala ya resuelve cambios concurrentes automáticamente.';
  card.appendChild(hint);

  var bulkRow = document.createElement('div');
  bulkRow.className = 'lan-connect-actions-row';
  bulkRow.style.marginTop = '4px';
  var bulkBtn = document.createElement('button');
  bulkBtn.type = 'button';
  bulkBtn.className = 'btn-lan-primary';
  bulkBtn.style.flex = '1';
  bulkBtn.textContent = 'Descartar todos';
  bulkBtn.onclick = function () {
    if (
      typeof confirm === 'function' &&
      !confirm('¿Descartar los ' + draftCount + ' borradores de conflicto antiguos?')
    ) {
      return;
    }
    bulkBtn.disabled = true;
    bulkBtn.textContent = 'Descartando…';
    void clearAllDraftConflicts()
      .then(function (cleared) {
        runtime.showToast(
          cleared
            ? 'Se descartaron ' + cleared + ' conflictos antiguos.'
            : 'No había borradores que descartar.',
          cleared ? 'success' : 'info'
        );
      })
      .catch(function () {
        runtime.showToast('No se pudieron descartar los borradores.', 'error');
      })
      .finally(function () {
        bulkBtn.disabled = false;
        bulkBtn.textContent = 'Descartar todos';
        void renderLanPanel();
      });
  };
  bulkRow.appendChild(bulkBtn);
  card.appendChild(bulkRow);
  root.appendChild(card);
}

async function applyLwwConflictLocally(payload) {
  if (!payload) return;
  if (shouldAutoResolveTodoConflict(payload) && tryAutoResolveTodoConflict(payload)) {
    await discardDraftsForConflictEntity(payload);
    clearHistoriaPendingAfterConflict(payload);
    var localDelete = payload.localSnapshot && payload.localSnapshot.op === 'delete';
    if (!localDelete) {
      runtime.showToast('Pendiente alineado con la sala', 'info');
    }
    return;
  }
  var viewerData = conflictDataForViewer(payload);
  var silentMatch = conflictSnapshotsMatchForAutoResolve({
    conflictingKeys: payload.conflictingKeys,
    localData: viewerData.localData,
    serverData: viewerData.serverData,
  });
  await applyConflictUseServer(payload);
  await discardDraftsForConflictEntity(payload);
  clearHistoriaPendingAfterConflict(payload);
  var server = payload.serverSnapshot;
  if (server && server.version != null) {
    syncHostBundleEntityFromApplied({
      roomId: payload.roomId || activeLiveSyncRoomId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      patientId: payload.patientId,
      version: server.version,
      data: server.data,
    });
  }
  if (!silentMatch && payload.lwwApplied) {
    notifyLwwOverwrite(runtime, {
      entityType: payload.entityType,
      entityId: payload.entityId,
      overwrittenKeys: payload.overwrittenKeys || payload.conflictingKeys || [],
    });
  }
}

async function handleSyncConflict(payload, options) {
  options = options || {};
  await applyLwwConflictLocally(payload);
  void renderLanPanel();
}

function wsConflictDetailToPayload(detail) {
  return {
    transport: 'ws',
    entityType: detail.entityType,
    entityId: detail.entityId,
    roomId: detail.roomId,
    patientId: detail.patientId,
    lwwApplied: detail.lwwApplied === true,
    overwrittenKeys: detail.overwrittenKeys || detail.conflictingKeys || [],
    conflictingKeys: detail.conflictingKeys || [],
    localSnapshot: {
      expectedVersion: detail.client && detail.client.version != null ? detail.client.version : detail.expectedVersion,
      data: detail.client && detail.client.data,
      baseData: getLiveSyncEntityBase(detail.entityType, detail.entityId, detail.patientId) || undefined,
      op: detail.client && detail.client.op,
    },
    serverSnapshot: {
      version: detail.server && detail.server.version,
      data: detail.server && detail.server.data,
    },
  };
}

/** @param {string} patientId */
export async function lanFetchHostPatientRow(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || !isLanSessionConfiguredForRest()) return null;
  var resp = await lanFetchAuthed('/api/lan/v1/patients');
  if (!resp.ok) return null;
  var body = {};
  try {
    body = await resp.json();
  } catch (_e) {}
  var list = Array.isArray(body.patients) ? body.patients : [];
  return (
    list.find(function (row) {
      return row && String(row.id) === pid && !row._deleted;
    }) || null
  );
}

export async function lanPushPatientVersioned(patientId, mutation) {
  var pid = String(patientId || '').trim();
  if (!pid || !mutation) return { ok: false, error: 'invalid_args' };
  var resp = await lanFetchAuthed('/api/lan/v1/patients/' + encodeURIComponent(pid), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mutation),
  });
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  var out = {};
  try {
    out = await resp.json();
  } catch (_eOut) {}
  if (out && out.version != null && out.data) {
    rememberLiveSyncEntity('patient', pid, null, out.version, out.data);
    syncHostBundleEntityFromApplied({
      roomId: activeLiveSyncRoomId,
      entityType: 'patient',
      entityId: pid,
      version: out.version,
      data: out.data,
    });
  }
  if (out && out.lwwApplied) {
    notifyLwwOverwrite(runtime, {
      entityType: 'patient',
      entityId: pid,
      overwrittenKeys: out.overwrittenKeys || [],
    });
  }
  return { ok: true, body: out, version: out.version, data: out.data };
}

/** Pull one patient row from the host sync-bundle into the local census (orphan entregas). */
export async function restoreLanPatientFromHost(patientId) {
  var pid = String(patientId || '').trim();
  var rid = String(activeLiveSyncRoomId || '').trim();
  if (!pid || !rid || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  try {
    var resp = await lanClient.fetch(
      '/api/lan/v1/rooms/' + encodeURIComponent(rid) + '/sync-bundle',
      { cache: 'no-store' }
    );
    if (!resp || !resp.ok) {
      return { ok: false, error: 'bundle_fetch_failed', status: resp && resp.status };
    }
    var j = await resp.json();
    var bundle = j && j.bundle;
    var entries = bundle && Array.isArray(bundle.entries) ? bundle.entries : [];
    var entry = entries.find(function (e) {
      return e && e.patient && String(e.patient.id) === pid;
    });
    if (!entry) return { ok: false, error: 'patient_not_on_host' };
    await fetchClinicalScopeContextFromDb();
    var result = applyLanPatientEntries([entry], { skipTeamScopeFilter: true });
    if (result.added || result.updated) {
      await refreshClinicalPatientListForScope({ allowLanPull: false });
    }
    return { ok: true, added: result.added, updated: result.updated };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : 'restore_failed' };
  }
}

/** Tombstone + live-sync delete patch so the LAN host drops the patient chart. */
export async function purgeLanPatientFromHost(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) return { ok: false, error: 'invalid_id' };
  if (!activeLiveSyncRoomId || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  var hostRow = await lanFetchHostPatientRow(pid);
  var snap = {
    id: pid,
    registro: hostRow && hostRow.registro ? String(hostRow.registro) : '',
  };
  rememberPatientDeleteTombstone(snap);
  emitLiveSyncPatientDelete(snap);
  scheduleLiveSyncPush();
  await flushLiveSyncOutbox(activeLiveSyncRoomId);
  var rid = String(activeLiveSyncRoomId || '').trim();
  if (rid) {
    var envelope = await buildLiveSyncBundleEnvelope(rid);
    saveLocalRoomSnapshot(rid);
    await pushRoomSyncBundleToHost(rid, envelope);
  }
  return { ok: true, hadHostRow: !!hostRow };
}

export async function lanPushHistoriaClinica(patientId, mutation) {
  var pid = String(patientId || '').trim();
  if (!pid || !mutation) return { ok: false, error: 'invalid_args' };
  var resp = await lanFetchAuthed(
    '/api/lan/v1/patients/' + encodeURIComponent(pid) + '/historia-clinica',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mutation),
    }
  );
  if (!resp.ok) {
    return { ok: false, status: resp.status };
  }
  var out = {};
  try {
    out = await resp.json();
  } catch (_eOut) {}
  if (out && out.lwwApplied) {
    notifyLwwOverwrite(runtime, {
      entityType: 'historiaClinica',
      entityId: pid,
      overwrittenKeys: out.overwrittenKeys || [],
    });
  }
  return { ok: true, version: out.version, data: out.data, body: out };
}

export async function lanPushHistoriaClinicaDelta(patientId, delta) {
  const pid = String(patientId || '').trim();
  if (!pid || !delta || !activeLiveSyncRoomId) return { ok: false, error: 'invalid_args' };
  const resp = await lanFetchAuthed(
    '/api/lan/v1/rooms/' + encodeURIComponent(activeLiveSyncRoomId) + '/delta',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...delta,
        entityType: 'historiaClinica',
        entityId: pid,
        patientId: pid,
      }),
    }
  );
  const body = await resp.json().catch(function () {
    return {};
  });
  if (resp.ok) return { ok: true, version: body.version, body };
  if (resp.status === 409) return { ok: false, stale: true, body };
  return { ok: false, status: resp.status, body };
}

/** Sync patient.archived to LAN host (triggers historia archive when archived: true). */
export async function lanSyncPatientArchivedFlag(patient) {
  if (!patient || !patient.id || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  var resp = await lanFetchAuthed('/api/lan/v1/patients');
  if (!resp.ok) return { ok: false, status: resp.status };
  var body = {};
  try {
    body = await resp.json();
  } catch (_e) {}
  var list = Array.isArray(body.patients) ? body.patients : [];
  var hostRow = list.find(function (row) {
    return row && String(row.id) === String(patient.id);
  });
  if (!hostRow) return { ok: false, error: 'patient_not_on_host' };
  var mutation = {
    expectedVersion: Number(hostRow.version || 1),
    changedKeys: ['archived'],
    baseData: hostRow,
    data: Object.assign({}, hostRow, { archived: !!patient.archived }),
  };
  return lanPushPatientVersioned(patient.id, mutation);
}

export async function lanFetchHistoriaClinica(patientId, roomId) {
  var pid = String(patientId || '').trim();
  var rid = String(roomId || '').trim();
  if (!pid || !rid || !isLanSessionConfiguredForRest()) {
    return { ok: false, error: 'not_configured' };
  }
  var resp = await lanFetchAuthed(
    '/api/lan/v1/patients/' +
      encodeURIComponent(pid) +
      '/historia-clinica?roomId=' +
      encodeURIComponent(rid)
  );
  if (resp.status === 404) return { ok: true, missing: true };
  if (!resp.ok) return { ok: false, status: resp.status };
  var body = await resp.json();
  return { ok: true, version: body.version, data: body.data };
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

function filterIncomingPatientEntriesForScope(entries) {
  if (!isClinicalScopeReadyForLanPatientApply()) return [];
  var user = clinicalSessionContext.user;
  if (!user?.user_id) return [];
  return filterPatientEntriesForLanTeamScope(
    entries || [],
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

function touchPatientLanUpdatedAt(patientId) {
  var p = patients.find(function (x) {
    return x && x.id === patientId;
  });
  if (p) p.lanUpdatedAt = new Date().toISOString();
}

function saveEntryTodosOnLocalPatient(localPatientId, entry) {
  if (!localPatientId || !entry) return false;
  var incoming = Array.isArray(entry.todos) ? entry.todos : [];
  if (!incoming.length) return false;
  var merged = mergeTodoListsById(storage.getTodos(localPatientId), incoming);
  if (lanJsonEqual(storage.getTodos(localPatientId), merged)) return false;
  storage.saveTodos(localPatientId, merged);
  return true;
}

function lanJsonEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_e) {
    return a === b;
  }
}

function assignLanScalarIfChanged(target, key, incoming, fallback) {
  var next = incoming != null && incoming !== '' ? incoming : fallback;
  if (String(target[key] || '') === String(next || '')) return false;
  target[key] = next;
  return true;
}

/** @returns {boolean} */
function applyLanPatientEntryToExisting(existing, entry, opts) {
  if (!existing || !entry || !entry.patient) return false;
  var changed = false;
  var p = entry.patient;
  var scalarKeys = [
    'nombre',
    'edad',
    'sexo',
    'area',
    'servicio',
    'cuarto',
    'cama',
    'peso',
    'talla',
    'viaAcceso',
    'registro',
  ];
  for (var sk = 0; sk < scalarKeys.length; sk += 1) {
    var key = scalarKeys[sk];
    if (assignLanScalarIfChanged(existing, key, p[key], existing[key])) changed = true;
  }
  var censoBefore = JSON.stringify(existing);
  mergeCensoPatientFields(existing, p);
  if (JSON.stringify(existing) !== censoBefore) changed = true;
  if (p.fromLab && !existing.fromLab) {
    existing.fromLab = true;
    changed = true;
  }
  if (p.eventualidades && typeof p.eventualidades === 'object') {
    var mergedEv = mergeEventualidades(existing.eventualidades, p.eventualidades) || p.eventualidades;
    if (!lanJsonEqual(existing.eventualidades, mergedEv)) {
      existing.eventualidades = mergedEv;
      changed = true;
    }
  }
  if (p.historiaClinica && typeof p.historiaClinica === 'object') {
    var mergedHc = mergeHistoriaClinica(existing.historiaClinica, p.historiaClinica);
    if (mergedHc && !lanJsonEqual(existing.historiaClinica, mergedHc)) {
      existing.historiaClinica = mergedHc;
      changed = true;
    }
  }
  var nextNote = entry.note || {};
  if (!lanJsonEqual(notes[existing.id], nextNote)) {
    notes[existing.id] = nextNote;
    changed = true;
  }
  var nextInd = entry.indicaciones || {};
  if (!lanJsonEqual(indicaciones[existing.id], nextInd)) {
    indicaciones[existing.id] = nextInd;
    changed = true;
  }
  var nextLabs = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  if (!lanJsonEqual(labHistory[existing.id], nextLabs)) {
    labHistory[existing.id] = nextLabs;
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'medReceta')) {
    if (entry.medReceta) {
      if (!lanJsonEqual(medRecetaByPatient[existing.id], entry.medReceta)) {
        medRecetaByPatient[existing.id] = entry.medReceta;
        changed = true;
      }
    } else if (medRecetaByPatient[existing.id]) {
      delete medRecetaByPatient[existing.id];
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'medPharmProfile')) {
    if (entry.medPharmProfile) {
      if (!lanJsonEqual(medPharmProfileByPatient[existing.id], entry.medPharmProfile)) {
        medPharmProfileByPatient[existing.id] = entry.medPharmProfile;
        changed = true;
      }
    } else if (medPharmProfileByPatient[existing.id]) {
      delete medPharmProfileByPatient[existing.id];
      changed = true;
    }
  }
  if (entry.vpo) {
    if (!lanJsonEqual(vpoByPatient[existing.id], entry.vpo)) {
      vpoByPatient[existing.id] = entry.vpo;
      changed = true;
    }
  } else if (vpoByPatient[existing.id]) {
    delete vpoByPatient[existing.id];
    changed = true;
  }
  if (entry.listadoProblemas) {
    if (!lanJsonEqual(listadoProblemas[existing.id], entry.listadoProblemas)) {
      listadoProblemas[existing.id] = entry.listadoProblemas;
      changed = true;
    }
  }
  var monBefore = JSON.stringify(existing);
  mergePatientMonitoreoFromImported(existing, p);
  if (JSON.stringify(existing) !== monBefore) changed = true;
  if (!opts.skipTodos && saveEntryTodosOnLocalPatient(existing.id, entry)) changed = true;
  return changed;
}

function applyLanPatientEntries(entries, opts) {
  opts = opts || {};
  if (!entries || !entries.length) return { added: 0, updated: 0 };
  var scopedEntries = opts.skipTeamScopeFilter
    ? entries
    : filterIncomingPatientEntriesForScope(entries);
  if (!scopedEntries.length) return { added: 0, updated: 0 };
  var added = 0;
  var updated = 0;
  for (var i = 0; i < scopedEntries.length; i += 1) {
    var entry = scopedEntries[i];
    if (!entry || !entry.patient) continue;
    var reg = String(entry.patient.registro || '').trim();
    var existing = reg ? runtime.findPatientByRegistro(reg) : null;
    if (!existing && entry.patient.id) {
      existing = patients.find(function (p) {
        return p && p.id === entry.patient.id;
      });
    }
    if (existing) {
      if (applyLanPatientEntryToExisting(existing, entry, opts)) updated += 1;
    } else {
      var remoteId = String(entry.patient.id || '').trim();
      var idTaken =
        remoteId &&
        patients.some(function (p) {
          return p && p.id === remoteId;
        });
      var newId;
      if (remoteId && !idTaken) {
        var newPat = {
          id: remoteId,
          nombre: runtime.ensureUniquePatientName(entry.patient.nombre || 'PACIENTE SIN NOMBRE'),
          area: entry.patient.area || '',
          servicio: entry.patient.servicio || '',
          cuarto: entry.patient.cuarto || '',
          cama: entry.patient.cama || '',
          peso: entry.patient.peso || '',
          talla: entry.patient.talla || '',
          viaAcceso: entry.patient.viaAcceso || '',
          edad: entry.patient.edad || '',
          sexo: entry.patient.sexo || 'F',
          registro: entry.patient.registro || '',
          fromLab: !!entry.patient.fromLab,
        };
        mergePatientMonitoreoFromImported(newPat, entry.patient);
        mergeCensoPatientFields(newPat, entry.patient);
        if (entry.patient.eventualidades && typeof entry.patient.eventualidades === 'object') {
          newPat.eventualidades = entry.patient.eventualidades;
        }
        if (entry.patient.historiaClinica && typeof entry.patient.historiaClinica === 'object') {
          newPat.historiaClinica = structuredClone(entry.patient.historiaClinica);
        }
        patients.unshift(newPat);
        notes[remoteId] = entry.note || {};
        indicaciones[remoteId] = entry.indicaciones || {};
        labHistory[remoteId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
        if (Object.prototype.hasOwnProperty.call(entry, 'medReceta') && entry.medReceta) {
          medRecetaByPatient[remoteId] = entry.medReceta;
        }
        if (Object.prototype.hasOwnProperty.call(entry, 'medPharmProfile') && entry.medPharmProfile) {
          medPharmProfileByPatient[remoteId] = entry.medPharmProfile;
        }
        if (entry.vpo) vpoByPatient[remoteId] = entry.vpo;
        newId = remoteId;
      } else {
        newId = runtime.applyImportEntry(entry, 'duplicate', null);
      }
      if (entry.listadoProblemas && newId) listadoProblemas[newId] = entry.listadoProblemas;
      if (!opts.skipTodos) saveEntryTodosOnLocalPatient(newId, entry);
      added += 1;
    }
  }
  if (added || updated) {
    saveState({ immediate: true });
    renderPatientListLanSilent();
    if (runtime.getActiveId()) {
      try {
        runtime.renderNoteForm();
      } catch (_e) {}
      try {
        runtime.renderLabHistoryPanel();
      } catch (_e2) {}
    }
  }
  return { added: added, updated: updated };
}

export function removePatientLocally(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) return false;
  if (!patients.some(function (p) {
    return p && p.id === pid;
  })) {
    return false;
  }
  setPatients(patients.filter(function (p) {
    return p.id !== pid;
  }));
  delete notes[pid];
  delete indicaciones[pid];
  if (labHistory && labHistory[pid]) delete labHistory[pid];
  if (medRecetaByPatient && medRecetaByPatient[pid]) delete medRecetaByPatient[pid];
  if (medPharmProfileByPatient && medPharmProfileByPatient[pid]) delete medPharmProfileByPatient[pid];
  if (typeof vpoByPatient !== 'undefined' && vpoByPatient && vpoByPatient[pid]) delete vpoByPatient[pid];
  if (recetaHuByPatient && recetaHuByPatient[pid]) delete recetaHuByPatient[pid];
  if (medNotaSelectionByPatient && medNotaSelectionByPatient[pid]) delete medNotaSelectionByPatient[pid];
  if (listadoProblemas && listadoProblemas[pid]) delete listadoProblemas[pid];
  try {
    var rawTodosMap = localStorage.getItem('rpc-todos');
    if (rawTodosMap) {
      var todosMap = JSON.parse(rawTodosMap);
      if (todosMap && typeof todosMap === 'object' && todosMap[pid]) {
        delete todosMap[pid];
        localStorage.setItem('rpc-todos', JSON.stringify(todosMap));
      }
    }
  } catch (_e) {}
  try {
    if (storage.removeScheduledProceduresForPatient) storage.removeScheduledProceduresForPatient(pid);
  } catch (_eAg) {}
  if (runtime.getActiveId() === pid) runtime.setActiveId(patients.length ? patients[0].id : null);
  return true;
}

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
  var clinicalOpsApplied = false;
  if (merged.clinicalOps && isClinicalOpsLanAvailable()) {
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
  Object.keys(saveTodoPids).forEach(function (pid) {
    var todoList = todosMap[pid] || [];
    var nextTodos = todoList;
    if (!lanJsonEqual(storage.getTodos(pid), nextTodos)) {
      storage.saveTodos(pid, nextTodos);
      todosChanged = true;
    }
  });
  var patientSync = entries.length ? applyLanPatientEntries(entries, { skipTodos: true }) : null;
  var patientsChanged = !!(patientSync && (patientSync.added || patientSync.updated));
  if (patientRemoved) {
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
  if (todosChanged) runtime.refreshAllTodoUIs();
  if (patientsChanged && runtime.getActiveId()) {
    try {
      runtime.renderNoteForm();
    } catch (_eNote) {}
    try {
      runtime.renderLabHistoryPanel();
    } catch (_eLab) {}
  }
  if (patientsChanged) migrateLocalPatientsClinicalSala();
  if (patientsChanged || patientRemoved || clinicalOpsApplied) {
    void refreshClinicalPatientListForScope({ allowLanPull: false });
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
    runtime.refreshAllTodoUIs();
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

function emitLiveSyncAgendaUpsert(eventObj) {
  if (!eventObj || !eventObj.id) return;
  var mutation = buildLiveSyncMutationFromDesired('agenda', eventObj.id, eventObj, {
    roomId: activeLiveSyncRoomId,
    op: 'upsert',
  });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncAgendaDelete(id, updatedAt) {
  var eid = String(id || '').trim();
  if (!eid) return;
  var base = getLiveSyncEntityBase('agenda', eid, null) || { id: eid, version: 0, updatedAt: updatedAt };
  var mutation = createMutationBuilder('agenda', eid)
    .captureBase(base)
    .build({ roomId: activeLiveSyncRoomId, op: 'delete' });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncTodoUpsert(patientId, todo) {
  if (!todo) return;
  if (String(patientId || '').indexOf('demo-') === 0) return;
  var mutation = buildLiveSyncMutationFromDesired('todo', todo.id, todo, {
    roomId: activeLiveSyncRoomId,
    patientId: patientId,
    op: 'upsert',
  });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncTodoDelete(patientId, todoRef, updatedAt) {
  var todo = todoRef && typeof todoRef === 'object' ? todoRef : null;
  var eid = todo ? String(todo.id || '').trim() : String(todoRef || '').trim();
  if (!eid) return;
  var cached = getLiveSyncEntityBase('todo', eid, patientId);
  var base = cached
    ? Object.assign({}, cached)
    : Object.assign({}, todo || { id: eid, updatedAt: updatedAt }, { id: eid, patientId: patientId });
  if (todo && todo.version != null && (cached == null || cached.version == null)) {
    base.version = Number(todo.version);
  }
  if (base.version == null) base.version = Number(todo && todo.version != null ? todo.version : 0);
  var mutation = createMutationBuilder('todo', eid)
    .captureBase(base)
    .build({ roomId: activeLiveSyncRoomId, patientId: patientId, op: 'delete' });
  var tombVer = Number(base.version || 0) + 1;
  rememberLiveSyncEntity('todo', eid, patientId, tombVer, {
    id: eid,
    patientId: patientId,
    _deleted: true,
    updatedAt: String((todo && todo.updatedAt) || updatedAt || new Date().toISOString()),
  });
  sendLiveSyncMutation(mutation);
}
function emitLiveSyncPatientDelete(patient) {
  if (!patient) return;
  if (String(patient.id || '').indexOf('demo-') === 0) return;
  var mutation = buildLiveSyncMutationFromDesired(
    'patient',
    patient.id,
    { id: patient.id, registro: patient.registro || '' },
    { roomId: activeLiveSyncRoomId, op: 'delete' }
  );
  sendLiveSyncMutation(mutation);
}

var lanSyncBridgesWired = false;

/** Idempotent LAN bridge registration (safe when esbuild loads room/push before this module). */
export function wireLanSyncBridges() {
  if (lanSyncBridgesWired) return;
  lanSyncBridgesWired = true;

  registerLanSyncPushBridge({
    isLanSessionConfiguredForRest,
    buildLiveSyncBundleEnvelope,
    saveLocalRoomSnapshot,
    buildLiveSyncLocalMergeSource,
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

  lanMutationRegistry.registerMutationHandler('patient-fields', async (pid, payload) => {
    void pid;
    void payload;
  });
  lanMutationRegistry.setDomainOutboxKind('patient-fields', 'patient_fields');

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
  lanClient.addEventListener('lan-patch', function () {
    syncLiveSyncStatusChrome();
  });
}

wireLanSyncBridges();

let _lanRuntimeStarted = false;

/** Start LAN client + discovery when not in solo-equipo mode (boot or after Ajustes switch). */
export function ensureLanSyncRuntimeStarted() {
  if (typeof document === 'undefined') return;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return;
  if (_lanRuntimeStarted) return;
  _lanRuntimeStarted = true;
  initLanClientFromStorage();
  wireClinicalOpsLanSyncEvents();
  wireLanPanelDelegation();
  if (isLanElectronDesktop()) {
    scheduleTierALanServerWarm();
    startLanAutoDiscovery();
  }
}

if (typeof document !== 'undefined') {
  queueMicrotask(() => ensureLanSyncRuntimeStarted());
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
    },
  });
}

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
