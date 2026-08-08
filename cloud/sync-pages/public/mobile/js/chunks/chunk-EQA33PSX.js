import {
  filterPatientEntriesForLanTeamScope
} from "/mobile/js/chunks/chunk-GHYXKSAH.js";
import {
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  opFoldToLanEntries
} from "/mobile/js/chunks/chunk-OXMUDSQA.js";
import {
  resolveCloudPushMutationId
} from "/mobile/js/chunks/chunk-3ETJLEUF.js";
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForLanPatientApply,
  shouldEnforceTeamPatientMirror
} from "/mobile/js/chunks/chunk-JB63TG4Y.js";
import {
  cloudSyncErrorCode,
  isCloudRateLimitError,
  nextCloudPollDelayMs,
  noteCloudSyncCycle,
  noteCloudSyncPull,
  noteCloudSyncPush,
  noteCloudSyncTransport,
  noteCloudSyncWsLifecycle,
  noteCloudSyncWsSignal,
  recordCloudSyncError,
  recordCloudSyncTrace,
  retryAfterMsFromError
} from "/mobile/js/chunks/chunk-FHX6BQST.js";
import {
  buildLiveSyncPatientIdMap,
  indicaciones,
  labHistory,
  listadoProblemas,
  medNotaSelectionByPatient,
  medPharmProfileByPatient,
  medRecetaByPatient,
  mergeCensoPatientFields,
  mergeEventualidades,
  mergeLabHistorySets,
  mergePatientMonitoreoFromImported,
  mergePatientRegistrationMeta,
  mergeTodoListsById,
  notes,
  patients,
  recetaHuByPatient,
  remapAgendaPatientIds,
  resolveCloudTodoLocalPatientId,
  saveState,
  setPatients,
  vpoByPatient
} from "/mobile/js/chunks/chunk-C345P2AA.js";
import {
  sanitizeOpsForCloudPush
} from "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import {
  storage
} from "/mobile/js/chunks/chunk-XJ7JWVS5.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-PJKQGVLW.js";

// public/js/features/sync-apply/patient-entries.mjs
var entryDeps = {};
function configureLanPatientEntries(deps) {
  if (deps && typeof deps === "object") Object.assign(entryDeps, deps);
}
function lanRuntime() {
  const configured = entryDeps.runtime;
  if (configured && typeof configured.ensureUniquePatientName === "function") {
    return configured;
  }
  return {
    findPatientByRegistro: function() {
      return null;
    },
    ensureUniquePatientName: function(name) {
      return name;
    },
    applyImportEntry: function() {
      return null;
    },
    getActiveId: function() {
      return null;
    },
    renderNoteForm: function() {
    },
    renderLabHistoryPanel: function() {
    },
    renderEstadoActualPanel: function() {
    }
  };
}
function lanJsonEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}
function isPlaceholderPatientName(name) {
  const n = String(name || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!n) return true;
  return n === "PACIENTE SIN NOMBRE" || n === "SIN NOMBRE" || n === "PACIENTE" || n === "PACIENTE SIN NOMBRE.";
}
function incomingScalarsAreAuthoritative(existing, incoming) {
  var localAt = String(existing && existing.lanUpdatedAt || "").trim();
  var remoteAt = String(incoming && incoming.lanUpdatedAt || "").trim();
  if (!localAt && !remoteAt) return false;
  if (!localAt) return true;
  if (!remoteAt) return false;
  return remoteAt.localeCompare(localAt) >= 0;
}
function pickNombreMergeValue(incoming, local, takeIncoming) {
  const remoteName = incoming != null ? String(incoming) : "";
  const localName = local != null ? String(local) : "";
  const remotePlaceholder = isPlaceholderPatientName(remoteName);
  const localPlaceholder = isPlaceholderPatientName(localName);
  if (!remotePlaceholder && localPlaceholder) return remoteName;
  if (remotePlaceholder && !localPlaceholder) return localName;
  if (takeIncoming) {
    return remoteName.trim() !== "" ? remoteName : localName;
  }
  return localName.trim() !== "" ? localName : remoteName;
}
function assignLanScalarIfChanged(target, key, incoming, fallback, takeIncoming) {
  var next;
  if (key === "nombre") {
    next = pickNombreMergeValue(incoming, fallback, takeIncoming);
  } else if (takeIncoming) {
    next = incoming != null && incoming !== "" ? incoming : fallback;
  } else {
    var localVal = target[key];
    if (localVal != null && String(localVal).trim() !== "") next = localVal;
    else next = incoming != null && incoming !== "" ? incoming : fallback;
  }
  if (String(target[key] || "") === String(next || "")) return false;
  target[key] = next;
  return true;
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
function saveEntryTodosOnLocalPatient(localPatientId, entry) {
  if (!localPatientId || !entry) return false;
  var incoming = Array.isArray(entry.todos) ? entry.todos : [];
  if (!incoming.length) return false;
  var merged = mergeTodoListsById(storage.getTodos(localPatientId), incoming);
  if (lanJsonEqual(storage.getTodos(localPatientId), merged)) return false;
  storage.saveTodos(localPatientId, merged);
  return true;
}
function applyLanPatientScalars(existing, p) {
  var changed = false;
  var takeIncoming = incomingScalarsAreAuthoritative(existing, p);
  var scalarKeys = [
    "nombre",
    "edad",
    "sexo",
    "area",
    "servicio",
    "cuarto",
    "cama",
    "peso",
    "talla",
    "viaAcceso",
    "registro"
  ];
  for (var sk = 0; sk < scalarKeys.length; sk += 1) {
    var key = scalarKeys[sk];
    if (assignLanScalarIfChanged(existing, key, p[key], existing[key], takeIncoming)) changed = true;
  }
  if (takeIncoming && p.lanUpdatedAt && String(p.lanUpdatedAt) !== String(existing.lanUpdatedAt || "")) {
    existing.lanUpdatedAt = p.lanUpdatedAt;
    changed = true;
  }
  var censoBefore = JSON.stringify(existing);
  mergeCensoPatientFields(existing, p);
  if (JSON.stringify(existing) !== censoBefore) changed = true;
  const regBefore = existing.registeredByUserId;
  mergePatientRegistrationMeta(existing, p);
  if (existing.registeredByUserId !== regBefore) changed = true;
  if (p.fromLab && !existing.fromLab) {
    existing.fromLab = true;
    changed = true;
  }
  return changed;
}
function applyLanPatientCharts(existing, entry) {
  var changed = false;
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
  var mergedLabs = mergeLabHistorySets(labHistory[existing.id] || [], nextLabs);
  if (!lanJsonEqual(labHistory[existing.id], mergedLabs)) {
    labHistory[existing.id] = mergedLabs;
    changed = true;
  }
  return applyLanPatientMedArtifacts(existing, entry) || changed;
}
function applyLanPatientNested(existing, entry, p) {
  var changed = false;
  if (p.eventualidades && typeof p.eventualidades === "object") {
    var mergedEv = mergeEventualidades(existing.eventualidades, p.eventualidades) || p.eventualidades;
    if (!lanJsonEqual(existing.eventualidades, mergedEv)) {
      existing.eventualidades = mergedEv;
      changed = true;
    }
  }
  if (applyLanPatientCharts(existing, entry)) changed = true;
  var monBefore = JSON.stringify(existing);
  mergePatientMonitoreoFromImported(existing, p);
  if (JSON.stringify(existing) !== monBefore) changed = true;
  return changed;
}
function applyLanPatientMedArtifacts(existing, entry) {
  var changed = false;
  changed = applyLanMedRecetaField(existing, entry) || changed;
  changed = applyLanMedPharmField(existing, entry) || changed;
  changed = applyLanVpoField(existing, entry) || changed;
  if (entry.listadoProblemas) {
    if (!lanJsonEqual(listadoProblemas[existing.id], entry.listadoProblemas)) {
      listadoProblemas[existing.id] = entry.listadoProblemas;
      changed = true;
    }
  }
  return changed;
}
function applyLanMedRecetaField(existing, entry) {
  if (!Object.prototype.hasOwnProperty.call(entry, "medReceta")) return false;
  if (entry.medReceta) {
    if (lanJsonEqual(medRecetaByPatient[existing.id], entry.medReceta)) return false;
    medRecetaByPatient[existing.id] = entry.medReceta;
    return true;
  }
  if (!medRecetaByPatient[existing.id]) return false;
  delete medRecetaByPatient[existing.id];
  return true;
}
function applyLanMedPharmField(existing, entry) {
  if (!Object.prototype.hasOwnProperty.call(entry, "medPharmProfile")) return false;
  if (entry.medPharmProfile) {
    if (lanJsonEqual(medPharmProfileByPatient[existing.id], entry.medPharmProfile)) return false;
    medPharmProfileByPatient[existing.id] = entry.medPharmProfile;
    return true;
  }
  if (!medPharmProfileByPatient[existing.id]) return false;
  delete medPharmProfileByPatient[existing.id];
  return true;
}
function applyLanVpoField(existing, entry) {
  if (entry.vpo) {
    if (lanJsonEqual(vpoByPatient[existing.id], entry.vpo)) return false;
    vpoByPatient[existing.id] = entry.vpo;
    return true;
  }
  if (!vpoByPatient[existing.id]) return false;
  delete vpoByPatient[existing.id];
  return true;
}
function applyLanPatientEntryToExisting(existing, entry, opts) {
  if (!existing || !entry || !entry.patient) return false;
  var p = entry.patient;
  var changed = applyLanPatientScalars(existing, p);
  if (applyLanPatientNested(existing, entry, p)) changed = true;
  if (!opts.skipTodos && saveEntryTodosOnLocalPatient(existing.id, entry)) changed = true;
  return changed;
}
function findExistingPatient(entry) {
  var reg = String(entry.patient.registro || "").trim();
  var existing = reg ? lanRuntime().findPatientByRegistro(reg) : null;
  if (!existing && entry.patient.id) {
    existing = patients.find(function(p) {
      return p && p.id === entry.patient.id;
    });
  }
  return existing;
}
function seedNewPatientArtifacts(remoteId, entry) {
  notes[remoteId] = entry.note || {};
  indicaciones[remoteId] = entry.indicaciones || {};
  labHistory[remoteId] = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  if (Object.prototype.hasOwnProperty.call(entry, "medReceta") && entry.medReceta) {
    medRecetaByPatient[remoteId] = entry.medReceta;
  }
  if (Object.prototype.hasOwnProperty.call(entry, "medPharmProfile") && entry.medPharmProfile) {
    medPharmProfileByPatient[remoteId] = entry.medPharmProfile;
  }
  if (entry.vpo) vpoByPatient[remoteId] = entry.vpo;
}
function attachOptionalPatientFields(newPat, patient) {
  if (patient.eventualidades && typeof patient.eventualidades === "object") {
    newPat.eventualidades = patient.eventualidades;
  }
}
function createNewPatientShell(entry) {
  var remoteId = String(entry.patient.id || "").trim();
  var p = entry.patient;
  var newPat = {
    id: remoteId,
    nombre: lanRuntime().ensureUniquePatientName(p.nombre || "PACIENTE SIN NOMBRE"),
    area: p.area || "",
    servicio: p.servicio || "",
    cuarto: p.cuarto || "",
    cama: p.cama || "",
    peso: p.peso || "",
    talla: p.talla || "",
    viaAcceso: p.viaAcceso || "",
    edad: p.edad || "",
    sexo: p.sexo || "F",
    registro: p.registro || "",
    fromLab: !!p.fromLab
  };
  mergePatientMonitoreoFromImported(newPat, p);
  mergeCensoPatientFields(newPat, p);
  mergePatientRegistrationMeta(newPat, p);
  attachOptionalPatientFields(newPat, p);
  patients.unshift(newPat);
  seedNewPatientArtifacts(remoteId, entry);
  return remoteId;
}
function addLanPatientFromEntry(entry, opts) {
  var remoteId = String(entry.patient.id || "").trim();
  var idTaken = remoteId && patients.some(function(p) {
    return p && p.id === remoteId;
  });
  var newId;
  if (remoteId && !idTaken) {
    newId = createNewPatientShell(entry);
  } else {
    newId = lanRuntime().applyImportEntry(entry, "duplicate", null);
  }
  if (entry.listadoProblemas && newId) listadoProblemas[newId] = entry.listadoProblemas;
  if (!opts.skipTodos) saveEntryTodosOnLocalPatient(newId, entry);
  return true;
}
function refreshLanPatientUiAfterApply() {
  if (typeof entryDeps.renderPatientListLanSilent === "function") {
    entryDeps.renderPatientListLanSilent();
  }
  if (lanRuntime().getActiveId()) {
    try {
      lanRuntime().renderNoteForm();
    } catch {
    }
    try {
      lanRuntime().renderLabHistoryPanel();
    } catch {
    }
    try {
      lanRuntime().renderEstadoActualPanel({ force: true, syncHeavy: true });
    } catch {
    }
  }
}
function applyLanPatientEntries(entries, opts) {
  opts = opts || {};
  if (!entries || !entries.length) return { added: 0, updated: 0 };
  var scopedEntries = opts.skipTeamScopeFilter ? entries : filterIncomingPatientEntriesForScope(entries);
  if (!scopedEntries.length) return { added: 0, updated: 0 };
  var added = 0;
  var updated = 0;
  for (var i = 0; i < scopedEntries.length; i += 1) {
    var entry = scopedEntries[i];
    if (!entry || !entry.patient) continue;
    var existing = findExistingPatient(entry);
    if (existing) {
      if (applyLanPatientEntryToExisting(existing, entry, opts)) updated += 1;
    } else if (addLanPatientFromEntry(entry, opts)) {
      added += 1;
    }
  }
  if (added || updated) {
    saveState({ immediate: true });
    if (!shouldEnforceTeamPatientMirror()) {
      refreshLanPatientUiAfterApply();
    }
  }
  return { added, updated };
}

// public/js/features/sync-apply/patient-delete-local.mjs
var PATIENT_STATE_MAPS = [
  () => notes,
  () => indicaciones,
  () => labHistory,
  () => medRecetaByPatient,
  () => medPharmProfileByPatient,
  () => vpoByPatient,
  () => recetaHuByPatient,
  () => medNotaSelectionByPatient,
  () => listadoProblemas
];
function clearPatientLocalStateMaps(pid) {
  for (const getMap of PATIENT_STATE_MAPS) {
    const map = getMap();
    if (map && map[pid]) delete map[pid];
  }
}
function clearPatientTodosLocal(pid) {
  try {
    const rawTodosMap = localStorage.getItem("rpc-todos");
    if (!rawTodosMap) return;
    const todosMap = JSON.parse(rawTodosMap);
    if (todosMap && typeof todosMap === "object" && todosMap[pid]) {
      delete todosMap[pid];
      localStorage.setItem("rpc-todos", JSON.stringify(todosMap));
    }
  } catch {
  }
}
function clearPatientAgendaLocal(pid) {
  try {
    if (storage.removeScheduledProceduresForPatient) storage.removeScheduledProceduresForPatient(pid);
  } catch {
  }
}

// public/js/features/sync-apply/patient-delete.mjs
var deleteDeps = {};
function removePatientLocally(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) return false;
  if (!patients.some(function(p) {
    return p && String(p.id) === pid;
  })) {
    return false;
  }
  setPatients(patients.filter(function(p) {
    return String(p.id) !== pid;
  }));
  clearPatientLocalStateMaps(pid);
  clearPatientTodosLocal(pid);
  clearPatientAgendaLocal(pid);
  var rt = deleteDeps.runtime;
  if (rt && typeof rt.getActiveId === "function" && rt.getActiveId() === pid) {
    rt.setActiveId(patients.length ? patients[0].id : null);
  }
  return true;
}

// public/js/features/cloud-sync/pull-apply.mjs
function mergeCloudTodoIntoMap(row, byPatient, map) {
  const remotePid = String(row.patientId || "").trim();
  const id = String(row.id || "").trim();
  if (!remotePid || !id) return;
  const registro = String(row.registro || "").trim();
  const pid = resolveCloudTodoLocalPatientId(remotePid, registro, patients, map);
  if (!pid) return;
  if (!byPatient[pid]) byPatient[pid] = storage.getTodos(pid).slice();
  const idx = byPatient[pid].findIndex(function(t) {
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
function applyCloudTodosMap(todosMap, idMap) {
  const byPatient = {};
  const map = idMap && typeof idMap === "object" ? idMap : {};
  for (const todo of Object.values(todosMap || {})) {
    if (!todo || typeof todo !== "object") continue;
    mergeCloudTodoIntoMap(todo, byPatient, map);
  }
  const changedPatients = [];
  for (const pid of Object.keys(byPatient)) {
    storage.saveTodos(pid, byPatient[pid]);
    changedPatients.push(pid);
  }
  return changedPatients;
}
function applyCloudAgendaMap(agendaMap, idMap) {
  const live = Object.values(agendaMap || {}).filter(function(item) {
    return item && typeof item === "object" && !item._deleted;
  });
  storage.saveScheduledProcedures(remapAgendaPatientIds(live, idMap || {}));
}
function shouldApplyCloudTombstone(patientId, tombstoneMeta) {
  const pid = String(patientId || "").trim();
  if (!pid) return false;
  const reg = String(
    tombstoneMeta && typeof tombstoneMeta === "object" ? (
      /** @type {{ registro?: string }} */
      tombstoneMeta.registro || ""
    ) : ""
  ).trim();
  if (!reg) return true;
  return !patients.some(function(p) {
    return p && String(p.id || "") !== pid && String(p.registro || "").trim() === reg;
  });
}
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
    const { isClinicalOpsLanAvailable, applyClinicalOpsLanSnapshot, refreshClinicalOpsSnapshotCache } = await import("/mobile/js/chunks/clinical-ops-sync-MKTDGWF3.js");
    const { applyClinicalScopeFromLanOpsSnapshot } = await import("/mobile/js/chunks/clinical-access-runtime-KAV32YSL.js");
    let applied = false;
    if (isClinicalOpsLanAvailable()) {
      const result = await applyClinicalOpsLanSnapshot(clinicalOps);
      if (result.ok) {
        await refreshClinicalOpsSnapshotCache();
        applied = true;
      }
    } else {
      applied = !!await applyClinicalScopeFromLanOpsSnapshot(clinicalOps);
    }
    if (applied) {
      const { hydrateClinicalTeamsAfterCloudPull } = await import("/mobile/js/chunks/clinical-ops-hydrate-GCPYG7QB.js");
      await hydrateClinicalTeamsAfterCloudPull();
    }
    return applied;
  } catch {
    return false;
  }
}
function shouldSkipTeamScopeFilterOnCloudPull() {
  if (!shouldEnforceTeamPatientMirror()) return true;
  return !isClinicalScopeReadyForLanPatientApply();
}
function cloudPatientEntryApplyOpts() {
  return {
    skipTodos: true,
    skipTeamScopeFilter: shouldSkipTeamScopeFilterOnCloudPull()
  };
}
async function refreshCloudTodoUIs(patientIds) {
  const ids = Array.isArray(patientIds) ? patientIds : [];
  if (!ids.length) return;
  try {
    const mod = await import("/mobile/js/chunks/todos-refresh-ASP47IXR.js");
    if (typeof mod.refreshTodoUIsForPatients === "function") {
      mod.refreshTodoUIsForPatients(ids);
    }
  } catch {
  }
}
async function finalizeCloudPullPatientScope() {
  try {
    const access = await import("/mobile/js/chunks/clinical-access-runtime-KAV32YSL.js");
    if (shouldEnforceTeamPatientMirror()) {
      if (typeof access.finalizeMobileLanPatientCensus === "function") {
        await access.finalizeMobileLanPatientCensus();
      }
      return;
    }
    const pruned = access.prunePatientsOutsideClinicalScope();
    if (pruned > 0 && typeof access.refreshDesktopPatientListAfterScopePrune === "function") {
      await access.refreshDesktopPatientListAfterScopePrune();
    }
  } catch {
  }
}
async function applyCloudState(state, opts) {
  if (!state) return { added: 0, updated: 0, removed: false };
  await applyClinicalOpsSnapshot(state.clinicalOps);
  const entries = cloudStateToLanEntries(state);
  const idMap = buildLiveSyncPatientIdMap(entries, patients, {});
  const patientSync = entries.length ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts()) : { added: 0, updated: 0 };
  let todoPatients = [];
  if (!opts?.skipTodos && state.todos) todoPatients = applyCloudTodosMap(state.todos, idMap);
  if (Array.isArray(state.agenda)) {
    applyCloudAgendaMap(
      Object.fromEntries(
        state.agenda.filter((item) => item && item.id).map((item) => [String(item.id), item])
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
async function applyCloudOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return { added: 0, updated: 0, removed: false };
  const fold = createOpFold();
  for (let i = 0; i < ops.length; i += 1) {
    foldCloudOp(fold, ops[i]);
  }
  await applyClinicalOpsSnapshot(fold.clinicalOps);
  const entries = opFoldToLanEntries(fold);
  const idMap = buildLiveSyncPatientIdMap(entries, patients, {});
  const patientSync = entries.length ? applyLanPatientEntries(entries, cloudPatientEntryApplyOpts()) : { added: 0, updated: 0 };
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
async function refreshSidebarAfterCloudPull(result) {
  if (!result?.added && !result?.updated && !result?.removed) return;
  try {
    const { renderPatientList } = await import("/mobile/js/chunks/patients-PJWNILQK.js");
    renderPatientList({ silent: true });
  } catch {
  }
}
async function applyCloudPullResult(result) {
  if (!result || typeof result !== "object") return { added: 0, updated: 0, removed: false };
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

// public/js/features/cloud-sync/room-sync-ws-internals.mjs
var RECONNECT_MIN_MS = 1e3;
var RECONNECT_MAX_MS = 3e4;
var SIGNAL_DEBOUNCE_MS = 300;
function buildRoomLiveWsUrl(deps) {
  const base = String(deps.getBaseUrl() || "").replace(/\/$/, "").replace(/^http/i, "ws");
  const roomId = String(deps.getRoomId() || "").trim();
  const token = String(deps.getToken() || "").trim();
  if (!base || !roomId || !token) return "";
  const revision = Number(deps.getRevision() || 0);
  const q = new URLSearchParams({
    access_token: token,
    revision: String(Number.isFinite(revision) ? revision : 0)
  });
  return `${base}/api/sync/v1/rooms/${encodeURIComponent(roomId)}/live?${q}`;
}
function createRoomWsSignalQueue(deps) {
  let signalTimer = null;
  let pendingRevision = 0;
  function flushSignal() {
    signalTimer = null;
    const rev = pendingRevision;
    pendingRevision = 0;
    if (!rev) return;
    const local = Number(deps.getRevision() || 0);
    if (rev > local) deps.onRevisionHint?.(rev);
  }
  function queueRevisionSignal(revision) {
    const rev = Number(revision);
    if (!Number.isFinite(rev) || rev <= 0) return;
    pendingRevision = Math.max(pendingRevision, rev);
    if (signalTimer) return;
    signalTimer = setTimeout(flushSignal, SIGNAL_DEBOUNCE_MS);
  }
  function handleMessage(raw) {
    try {
      const msg = JSON.parse(String(raw));
      const type = String(msg?.type || "");
      const rev = Number(msg?.revision);
      if (!Number.isFinite(rev) || rev <= 0) return;
      if (type === "revision") {
        queueRevisionSignal(rev);
        return;
      }
      if (type === "hello") {
        const local = Number(deps.getRevision() || 0);
        if (rev > local) queueRevisionSignal(rev);
      }
    } catch {
    }
  }
  function clear() {
    if (signalTimer) {
      clearTimeout(signalTimer);
      signalTimer = null;
    }
    pendingRevision = 0;
  }
  return { handleMessage, clear };
}
function wireRoomLiveSocket(ctx, url) {
  const redactedUrl = url.replace(/access_token=[^&]+/, "access_token=***");
  try {
    ctx.wsRef.current = new WebSocket(url);
    noteCloudSyncWsLifecycle({ url: redactedUrl });
  } catch (err) {
    noteCloudSyncWsLifecycle({
      url,
      message: err && typeof err === "object" ? String(err.message || err) : "WebSocket constructor failed"
    });
    ctx.scheduleReconnect();
    return;
  }
  const ws = ctx.wsRef.current;
  ws.onopen = function() {
    ctx.onOpen();
    noteCloudSyncWsLifecycle({ url: redactedUrl });
  };
  ws.onmessage = function(ev) {
    ctx.signal.handleMessage(ev.data);
  };
  ws.onclose = function(ev) {
    ctx.wsRef.current = null;
    noteCloudSyncWsLifecycle({
      code: ev?.code,
      reason: String(ev?.reason || "")
    });
    ctx.scheduleReconnect();
  };
  ws.onerror = function() {
    noteCloudSyncWsLifecycle({ message: "WebSocket error" });
  };
}
function readRoomWsTransportState(transport) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  return transport;
}
function roomWsClearReconnect(state) {
  if (state.reconnectTimer.current != null) {
    clearTimeout(state.reconnectTimer.current);
    state.reconnectTimer.current = null;
  }
}
function roomWsCloseSocket(state) {
  if (!state.wsRef.current) return;
  try {
    state.wsRef.current.close();
  } catch {
  }
  state.wsRef.current = null;
}
function roomWsConnect(state, deps) {
  if (state.stopped.current || typeof WebSocket === "undefined") return;
  const url = buildRoomLiveWsUrl(deps);
  if (!url) return;
  roomWsCloseSocket(state);
  wireRoomLiveSocket(
    {
      wsRef: state.wsRef,
      signal: state.signal,
      scheduleReconnect: function() {
        roomWsScheduleReconnect(state, deps);
      },
      onOpen: function() {
        state.reconnectDelay.current = RECONNECT_MIN_MS;
        state.setTransport("ws");
      }
    },
    url
  );
}
function roomWsScheduleReconnect(state, deps) {
  if (state.stopped.current) return;
  state.setTransport("poll");
  roomWsClearReconnect(state);
  state.reconnectTimer.current = setTimeout(function() {
    state.reconnectTimer.current = null;
    roomWsConnect(state, deps);
  }, state.reconnectDelay.current);
  state.reconnectDelay.current = Math.min(
    RECONNECT_MAX_MS,
    Math.floor(state.reconnectDelay.current * 1.5)
  );
}
function createRoomWsController(deps) {
  const wsRef = { current: (
    /** @type {WebSocket | null} */
    null
  ) };
  const reconnectTimer = { current: (
    /** @type {ReturnType<typeof setTimeout> | null} */
    null
  ) };
  const stopped = { current: false };
  const reconnectDelay = { current: RECONNECT_MIN_MS };
  const transport = { current: (
    /** @type {CloudSyncTransport} */
    "poll"
  ) };
  const signal = createRoomWsSignalQueue(deps);
  function setTransport(next) {
    if (transport.current === next) return;
    transport.current = next;
    deps.onTransportChange?.(next);
  }
  const state = {
    wsRef,
    reconnectTimer,
    stopped,
    reconnectDelay,
    transport,
    signal,
    setTransport
  };
  function getTransportState() {
    return readRoomWsTransportState(transport.current);
  }
  function armConnect() {
    reconnectDelay.current = RECONNECT_MIN_MS;
    roomWsConnect(state, deps);
  }
  function haltSocket(clearSignal) {
    roomWsClearReconnect(state);
    if (clearSignal) signal.clear();
    roomWsCloseSocket(state);
    setTransport("poll");
  }
  return {
    start() {
      stopped.current = false;
      armConnect();
    },
    stop() {
      stopped.current = true;
      haltSocket(true);
    },
    pause() {
      haltSocket(false);
    },
    resume() {
      if (!stopped.current) armConnect();
    },
    getTransportState
  };
}

// public/js/features/cloud-sync/room-sync-ws.mjs
function createRoomSyncWs(deps) {
  return createRoomWsController(deps);
}

// public/js/features/cloud-sync/sync-runtime-schedule.mjs
function createCloudPollScheduler(deps) {
  let timerId = null;
  let stopped = false;
  let errorStreak = 0;
  let forcedDelayMs = null;
  function clearTimer() {
    if (timerId != null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }
  function scheduleNext(delayMs) {
    if (stopped) return;
    clearTimer();
    timerId = setTimeout(function() {
      timerId = null;
      void deps.syncCycle();
    }, delayMs);
  }
  function armNextTimer(errored) {
    const delay = forcedDelayMs != null ? forcedDelayMs : nextCloudPollDelayMs({
      pending: deps.pendingCount() > 0,
      errored,
      errorStreak,
      lastLocalWriteAt: deps.getLastLocalWriteAt(),
      mobile: deps.pollMobile,
      transport: deps.getTransportState?.() ?? "poll"
    });
    forcedDelayMs = null;
    scheduleNext(delay);
  }
  function noteSuccess() {
    errorStreak = 0;
    armNextTimer(false);
  }
  function noteFailure(err) {
    errorStreak += 1;
    if (isCloudRateLimitError(err)) {
      forcedDelayMs = retryAfterMsFromError(err);
    }
    armNextTimer(true);
  }
  function stop() {
    stopped = true;
    clearTimer();
  }
  return {
    armNextTimer,
    noteSuccess,
    noteFailure,
    stop,
    isRateLimitedError: isCloudRateLimitError
  };
}

// public/js/features/cloud-sync/cloud-sync-error-text.mjs
var CLOUD_SYNC_CLIENT_NOT_READY = "El enlace con Nube no est\xE1 listo. Ve a Conexi\xF3n, confirma tu sala, y si persiste cierra sesi\xF3n y vuelve a entrar.";
function humanizeCloudSyncErrorMessage(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^failed to fetch$/i.test(s) || /networkerror when attempting to fetch/i.test(s)) {
    return "Sin red hacia Nube. Revisa Wi\u2011Fi / VPN e int\xE9ntalo de nuevo.";
  }
  if (/load failed|network request failed/i.test(s)) {
    return "No hubo respuesta de Nube. Revisa la conexi\xF3n e int\xE9ntalo de nuevo.";
  }
  return humanizeTechnicalSyncMessage(s);
}
function humanizeTechnicalSyncMessage(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/cliente nube no configurado/i.test(s)) {
    return CLOUD_SYNC_CLIENT_NOT_READY;
  }
  if (/cannot read properties of undefined/i.test(s)) {
    if (/reading 'pull'/i.test(s)) {
      return "El cliente de Nube no est\xE1 listo para descargar. Vuelve a Conexi\xF3n o reinicia R+.";
    }
    if (/reading 'push'/i.test(s)) {
      return "El cliente de Nube no est\xE1 listo para enviar. Vuelve a Conexi\xF3n o reinicia R+.";
    }
    return "Fallo interno al sincronizar. Reintenta o reinicia R+.";
  }
  if (/cannot read properties of null/i.test(s)) {
    return "Fallo interno al sincronizar. Reintenta o reinicia R+.";
  }
  if (/is not a function/i.test(s)) {
    return "El runtime de Nube no est\xE1 enlazado correctamente. Reconecta en Conexi\xF3n.";
  }
  if (/^TypeError:|^ReferenceError:/i.test(s)) {
    return "Fallo interno al sincronizar. Reintenta o reinicia R+.";
  }
  return s;
}
function cloudSyncErrorMessage(err, fallback) {
  const data = err && typeof err === "object" ? (
    /** @type {{ data?: { message?: string }, message?: string }} */
    err
  ) : null;
  const raw = String(data?.data?.message || data?.message || fallback).trim() || fallback;
  return humanizeCloudSyncErrorMessage(raw) || fallback;
}

// public/js/features/cloud-sync/sync-runtime-cycle.mjs
var PUSH_STALE_RETRIES = 3;
function isCloudRevisionStaleError(err) {
  const data = err && typeof err === "object" ? (
    /** @type {{ data?: { error?: string } }} */
    err
  ) : null;
  const code = String(data?.data?.error || "").trim();
  return code === "revision_stale" || code === "conflict";
}
function createOutboxSync(outbox, setStatus) {
  function pendingCount() {
    return outbox.list().length;
  }
  function refreshIdleStatus() {
    if (!navigator.onLine) {
      setStatus(pendingCount() > 0 ? "pending" : "offline");
      return;
    }
    setStatus(pendingCount() > 0 ? "pending" : "idle");
  }
  return { pendingCount, refreshIdleStatus };
}
function createPullPush(deps, setStatus, outboxSync, pace) {
  const { api, outbox, getRoomId, getRevision, setRevision, applyPullResult } = deps;
  function applyServerRevision(revision) {
    const next = Number(revision);
    if (!Number.isFinite(next) || next <= 0) return;
    const current = Number(getRevision() ?? 0);
    if (next <= current) return;
    setRevision(next);
  }
  async function pullLatest() {
    const roomId = getRoomId();
    if (!roomId) return;
    if (!api || typeof api.pull !== "function") {
      throw new Error("Cliente Nube no configurado");
    }
    const since = getRevision() ?? 0;
    const result = await api.pull(roomId, since);
    if (result?.revision != null) applyServerRevision(Number(result.revision));
    if (applyPullResult) await applyPullResult(result);
    noteCloudSyncPull();
    recordCloudSyncTrace("pull", {
      since,
      revision: result?.revision != null ? Number(result.revision) : null,
      opsCount: Array.isArray(result?.ops) ? result.ops.length : 0
    });
  }
  return createPullPushOps({
    api,
    outbox,
    getRoomId,
    getRevision,
    setStatus,
    outboxSync,
    pace,
    pullLatest,
    applyServerRevision
  });
}
function createPullPushOps(ctx) {
  const {
    api,
    outbox,
    getRoomId,
    getRevision,
    setStatus,
    outboxSync,
    pace,
    pullLatest,
    applyServerRevision
  } = ctx;
  async function pushWithStaleRetry(roomId, item, ops) {
    let lastErr;
    for (let attempt = 0; attempt <= PUSH_STALE_RETRIES; attempt++) {
      try {
        return await api.push(roomId, {
          clientMutationId: resolveCloudPushMutationId(item),
          ops,
          baseRevision: getRevision() ?? item.baseRevision ?? 0
        });
      } catch (err) {
        lastErr = err;
        if (!isCloudRevisionStaleError(err) || attempt >= PUSH_STALE_RETRIES) throw err;
        await pullLatest();
      }
    }
    throw lastErr;
  }
  async function flushOutbox() {
    const roomId = getRoomId();
    if (!roomId) return;
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? "pending" : "offline");
      return;
    }
    const pending = outbox.list();
    if (pending.length === 0) return;
    setStatus("syncing");
    for (const item of pending) {
      const sanitized = sanitizeOpsForCloudPush(item.ops);
      if (!sanitized.ops.length) {
        outbox.remove(item.clientMutationId);
        continue;
      }
      try {
        const result = await pushWithStaleRetry(roomId, item, sanitized.ops);
        outbox.remove(item.clientMutationId);
        pace.markLocalWrite();
        if (result?.revision != null) applyServerRevision(Number(result.revision));
        if (result?.needPull) await pullLatest();
        noteCloudSyncPush();
        recordCloudSyncTrace("push", {
          clientMutationId: item.clientMutationId,
          opCount: sanitized.ops.length,
          revision: result?.revision != null ? Number(result.revision) : null
        });
      } catch (err) {
        const msg = cloudSyncErrorMessage(err, "No se pudo enviar un cambio a la nube.");
        recordCloudSyncError({
          op: "push",
          code: cloudSyncErrorCode(err),
          message: msg
        });
        setStatus("error", msg);
        throw err;
      }
    }
  }
  return { pullLatest, flushOutbox };
}
function createSyncCycleController(ctx) {
  const {
    stopped,
    getRoomId,
    setStatus,
    outboxSync,
    flushOutbox,
    pullLatest,
    failCycle,
    getScheduler,
    cycleInflightRef
  } = ctx;
  async function runHiddenCycle() {
    const scheduler = getScheduler();
    if (outboxSync.pendingCount() > 0 && navigator.onLine) {
      try {
        setStatus("syncing");
        await flushOutbox();
        outboxSync.refreshIdleStatus();
        scheduler.noteSuccess();
        noteCloudSyncCycle(true);
      } catch (err) {
        failCycle(err);
      }
      return;
    }
    scheduler.armNextTimer(false);
  }
  async function runSyncCycleBody() {
    const scheduler = getScheduler();
    try {
      setStatus("syncing");
      const pending = outboxSync.pendingCount() > 0;
      if (pending) {
        await flushOutbox();
        await pullLatest();
      } else {
        await pullLatest();
        await flushOutbox();
      }
      outboxSync.refreshIdleStatus();
      scheduler.noteSuccess();
      noteCloudSyncCycle(true);
    } catch (err) {
      failCycle(err);
    }
  }
  async function syncCycle() {
    const scheduler = getScheduler();
    if (stopped()) return;
    if (!getRoomId()) {
      scheduler.armNextTimer(false);
      return;
    }
    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    if (hidden) {
      await runHiddenCycle();
      return;
    }
    if (!navigator.onLine) {
      setStatus(outboxSync.pendingCount() > 0 ? "pending" : "offline");
      scheduler.armNextTimer(false);
      return;
    }
    if (cycleInflightRef.current) return cycleInflightRef.current;
    cycleInflightRef.current = runSyncCycleBody().finally(function() {
      cycleInflightRef.current = null;
    });
    return cycleInflightRef.current;
  }
  return { syncCycle };
}
function attachSyncRuntimeListeners(ctx) {
  const { syncCycle, scheduler, pace, outboxSync, roomWs } = ctx;
  function onOnline() {
    void syncCycle();
  }
  function onVisibility() {
    if (document.visibilityState === "visible") {
      roomWs?.resume?.();
      void syncCycle();
    } else {
      roomWs?.pause?.();
    }
  }
  function onWindowFocus() {
    void syncCycle();
  }
  function noteLocalMutation() {
    pace.markLocalWrite();
    scheduler.armNextTimer(false);
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibility);
  }
  outboxSync.refreshIdleStatus();
  void syncCycle();
  scheduler.armNextTimer(false);
  return {
    noteLocalMutation,
    detach() {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("focus", onWindowFocus);
        document.removeEventListener("visibilitychange", onVisibility);
      }
    }
  };
}
function createSyncFailCycle(getScheduler, setStatus) {
  return function failCycle(err) {
    const scheduler = getScheduler();
    const rateLimited = scheduler.isRateLimitedError(err);
    const msg = rateLimited ? "Nube ocupada (l\xEDmite de peticiones). Reintento autom\xE1tico m\xE1s lento." : cloudSyncErrorMessage(err, "Error de sincronizaci\xF3n con la nube.");
    if (!rateLimited) {
      recordCloudSyncError({
        op: "cycle",
        code: cloudSyncErrorCode(err),
        message: msg
      });
    } else {
      recordCloudSyncTrace("rate_limit", { message: msg });
    }
    setStatus("error", msg);
    scheduler.noteFailure(err);
    noteCloudSyncCycle(false);
  };
}
function startLiveRoomSyncWs(deps, ctx) {
  if (!deps.liveRoomWs) return null;
  const roomWs = createRoomSyncWs({
    getBaseUrl: deps.liveRoomWs.getBaseUrl,
    getToken: deps.liveRoomWs.getToken,
    getRoomId: ctx.getRoomId,
    getRevision: deps.getRevision,
    onRevisionHint: function(revision) {
      noteCloudSyncWsSignal(revision);
      const local = Number(deps.getRevision() ?? 0);
      if (revision > local) void ctx.syncCycle();
      ctx.scheduler.armNextTimer(false);
    },
    onTransportChange: function(transport) {
      noteCloudSyncTransport(transport);
      ctx.scheduler.armNextTimer(false);
      ctx.onStatus?.(ctx.getCurrentStatus(), ctx.getLastDetail() || void 0);
    }
  });
  roomWs.start();
  return roomWs;
}
function buildSyncRuntimeHandle(args) {
  const {
    deps,
    stoppedRef,
    getCurrentStatus,
    getLastDetail,
    flushOutbox,
    syncCycle,
    noteLocalMutation,
    roomWs,
    scheduler,
    listeners
  } = args;
  const handle = {
    getStatus: getCurrentStatus,
    getDetail: getLastDetail,
    getTransportState: function() {
      return roomWs?.getTransportState() ?? "poll";
    },
    flushOutbox,
    syncCycle,
    noteLocalMutation,
    stop() {
      stoppedRef.stopped = true;
      roomWs?.stop();
      scheduler.stop();
      listeners.detach();
      deps.onStop?.(handle);
    }
  };
  return handle;
}
function createSyncRuntimeCycle(deps) {
  const { outbox, getRoomId, onStatus } = deps;
  const stoppedRef = { stopped: false };
  const cycleInflightRef = { current: null };
  let currentStatus = "idle";
  let lastDetail = "";
  let lastLocalWriteAt = 0;
  function setStatus(status, detail) {
    currentStatus = status;
    if (status === "error") lastDetail = String(detail || lastDetail || "").trim();
    else if (status === "idle" || status === "syncing") lastDetail = "";
    else if (detail) lastDetail = String(detail).trim();
    onStatus?.(status, lastDetail || void 0);
  }
  const pace = { markLocalWrite() {
    lastLocalWriteAt = Date.now();
  } };
  const outboxSync = createOutboxSync(outbox, setStatus);
  const { pullLatest, flushOutbox } = createPullPush(deps, setStatus, outboxSync, pace);
  let scheduler;
  const failCycle = createSyncFailCycle(() => scheduler, setStatus);
  const cycleController = createSyncCycleController({
    stopped: () => stoppedRef.stopped,
    getRoomId,
    setStatus,
    outboxSync,
    flushOutbox,
    pullLatest,
    failCycle,
    getScheduler: () => scheduler,
    cycleInflightRef
  });
  let roomWs = null;
  scheduler = createCloudPollScheduler({
    syncCycle: cycleController.syncCycle,
    pendingCount: outboxSync.pendingCount,
    getLastLocalWriteAt: function() {
      return lastLocalWriteAt;
    },
    pollMobile: deps.pollMobile,
    getTransportState: function() {
      if (roomWs) return roomWs.getTransportState();
      return typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "poll";
    }
  });
  roomWs = startLiveRoomSyncWs(deps, {
    getRoomId,
    syncCycle: cycleController.syncCycle,
    scheduler,
    onStatus,
    getCurrentStatus: () => currentStatus,
    getLastDetail: () => lastDetail
  });
  const listeners = attachSyncRuntimeListeners({
    syncCycle: cycleController.syncCycle,
    scheduler,
    pace,
    outboxSync,
    roomWs
  });
  return buildSyncRuntimeHandle({
    deps,
    stoppedRef,
    getCurrentStatus: () => currentStatus,
    getLastDetail: () => lastDetail,
    flushOutbox,
    syncCycle: cycleController.syncCycle,
    noteLocalMutation: listeners.noteLocalMutation,
    roomWs,
    scheduler,
    listeners
  });
}

// public/js/features/cloud-sync/sync-runtime.mjs
var _activeRuntime = null;
function startCloudSyncRuntime(deps) {
  if (_activeRuntime) {
    _activeRuntime.stop();
    _activeRuntime = null;
  }
  _activeRuntime = createSyncRuntimeCycle({
    ...deps,
    onStop(handle) {
      if (_activeRuntime === handle) _activeRuntime = null;
    }
  });
  return _activeRuntime;
}
function stopCloudSyncRuntime() {
  if (_activeRuntime) {
    _activeRuntime.stop();
    _activeRuntime = null;
  }
}

export {
  configureLanPatientEntries,
  removePatientLocally,
  applyCloudPullResult,
  CLOUD_SYNC_CLIENT_NOT_READY,
  humanizeCloudSyncErrorMessage,
  humanizeTechnicalSyncMessage,
  startCloudSyncRuntime,
  stopCloudSyncRuntime
};
//# sourceMappingURL=/js/chunks/chunk-EQA33PSX.js.map
