import {
  ensureStorageHydrated,
  isMeaningfulLabHistorySet,
  normalizeLabHistoryPatientSets,
  storage
} from "/mobile/js/chunks/chunk-HNK3CY62.js";
import {
  applyMedCatalogOverlay,
  applySomePharmCatalogOverlay,
  migratePatientMonitoreo,
  toClinicalHistoryText
} from "/mobile/js/chunks/chunk-GJK2JHBF.js";
import {
  isSessionScopedWebClient
} from "/mobile/js/chunks/chunk-3VLOKES3.js";
import {
  isWebClinicalClient
} from "/mobile/js/chunks/chunk-TGGEFYRH.js";
import {
  migratePatientsClinicalSala
} from "/mobile/js/chunks/chunk-GPBMQXYE.js";

// public/js/lab-history-repair.mjs
function patientLabHistoryNeedsRepair(raw) {
  if (raw == null) return false;
  if (!Array.isArray(raw)) return true;
  var usedIds = [];
  for (var i = 0; i < raw.length; i++) {
    var set = raw[i];
    if (!isMeaningfulLabHistorySet(set)) return true;
    if (!set || typeof set !== "object") return true;
    var id = set.id != null ? String(set.id).trim() : "";
    if (!id) return true;
    if (usedIds.indexOf(id) !== -1) return true;
    usedIds.push(id);
  }
  return false;
}
function repairLabHistoryMapInPlace(labHistoryMap) {
  var changed = false;
  Object.keys(labHistoryMap || {}).forEach(function(pid) {
    var raw = labHistoryMap[pid];
    if (!patientLabHistoryNeedsRepair(raw)) return;
    var fixed = normalizeLabHistoryPatientSets(raw);
    if (fixed.length) labHistoryMap[pid] = fixed;
    else delete labHistoryMap[pid];
    changed = true;
  });
  return changed;
}

// public/js/features/eventualidades-store.mjs
function normalizeEventualidadText(text) {
  return toClinicalHistoryText(text).trim();
}
var rt = {
  getActiveId() {
    return null;
  },
  showToast(_msg, _type) {
  }
};
function registerEventualidadesRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function toEventualidadDateValue(when) {
  const d = when == null ? /* @__PURE__ */ new Date() : when instanceof Date ? when : new Date(when);
  if (!Number.isFinite(d.getTime())) return "";
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function eventualidadDateToIso(dateIso) {
  const raw = String(dateIso || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return eventualidadDateToIso(toEventualidadDateValue(/* @__PURE__ */ new Date()));
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(y, mo - 1, day, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
}
function cloneDeletedIds_(deleted) {
  if (!deleted || typeof deleted !== "object") return null;
  const deletedIds = {};
  for (const key of Object.keys(deleted)) {
    const id = String(key || "").trim();
    if (!id) continue;
    deletedIds[id] = String(
      /** @type {Record<string, unknown>} */
      deleted[id] || ""
    );
  }
  return Object.keys(deletedIds).length ? deletedIds : null;
}
function cloneStoreShell_(store) {
  const entries = Array.isArray(store && store.entries) ? store.entries.slice() : [];
  const labsText = store && store.labsText != null ? normalizeEventualidadText(store.labsText) : "";
  const next = { entries, labsText };
  const deletedIds = cloneDeletedIds_(store && store.deletedIds);
  if (deletedIds) next.deletedIds = deletedIds;
  if (store && store.updatedAt) next.updatedAt = String(store.updatedAt);
  return next;
}
function touchEventualidadesMeta_(store) {
  store.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return store;
}
function appendEventualidad(store, text, clientId, atIso) {
  const t = normalizeEventualidadText(text);
  const base = cloneStoreShell_(store);
  if (!t) return base;
  const at = atIso && String(atIso).trim() ? String(atIso).trim() : eventualidadDateToIso(toEventualidadDateValue(/* @__PURE__ */ new Date()));
  const entry = {
    id: "ev_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at,
    text: t,
    clientId: clientId || void 0
  };
  base.entries.push(entry);
  if (base.deletedIds && base.deletedIds[entry.id]) delete base.deletedIds[entry.id];
  return touchEventualidadesMeta_(base);
}
function updateEventualidad(store, entryId, patch) {
  const id = String(entryId || "").trim();
  const base = cloneStoreShell_(store);
  if (!id) return base;
  const idx = base.entries.findIndex(function(e) {
    return e && String(e.id) === id;
  });
  if (idx === -1) return base;
  const cur = base.entries[idx];
  const text = patch && patch.text != null ? normalizeEventualidadText(patch.text) : normalizeEventualidadText(cur.text);
  if (!text) return base;
  const at = patch && patch.at != null && String(patch.at).trim() ? String(patch.at).trim() : cur.at;
  base.entries[idx] = Object.assign({}, cur, { text, at });
  return touchEventualidadesMeta_(base);
}
function findEventualidadEntry(store, entryId) {
  const id = String(entryId || "").trim();
  if (!id) return null;
  return (Array.isArray(store && store.entries) ? store.entries : []).find(function(e) {
    return e && String(e.id) === id;
  }) || null;
}
function removeEventualidad(store, entryId) {
  const id = String(entryId || "").trim();
  const base = cloneStoreShell_(store);
  if (!id) return base;
  base.entries = base.entries.filter(function(e) {
    return e && String(e.id) !== id;
  });
  if (!base.deletedIds) base.deletedIds = {};
  base.deletedIds[id] = (/* @__PURE__ */ new Date()).toISOString();
  return touchEventualidadesMeta_(base);
}
function dayKeyFromIso(iso) {
  if (!iso) return "unknown";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "unknown";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  } catch {
    return "unknown";
  }
}
function formatDayLabel(dayKey, now) {
  if (dayKey === "unknown") return "Sin fecha";
  const parts = String(dayKey).split("-").map(Number);
  if (parts.length !== 3 || parts.some(function(n) {
    return !Number.isFinite(n);
  })) {
    return String(dayKey);
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (!Number.isFinite(date.getTime())) return String(dayKey);
  const ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : /* @__PURE__ */ new Date();
  const todayKey = dayKeyFromIso(ref.toISOString());
  const yesterday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1);
  const yesterdayKey = dayKeyFromIso(yesterday.toISOString());
  if (dayKey === todayKey) return "Hoy";
  if (dayKey === yesterdayKey) return "Ayer";
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}
function formatDaySubLabel(dayKey, now) {
  if (dayKey === "unknown") return "";
  const parts = String(dayKey).split("-").map(Number);
  if (parts.length !== 3 || parts.some(function(n) {
    return !Number.isFinite(n);
  })) {
    return "";
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (!Number.isFinite(date.getTime())) return "";
  const ref = now instanceof Date && Number.isFinite(now.getTime()) ? now : /* @__PURE__ */ new Date();
  const todayKey = dayKeyFromIso(ref.toISOString());
  const yesterday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - 1);
  const yesterdayKey = dayKeyFromIso(yesterday.toISOString());
  if (dayKey !== todayKey && dayKey !== yesterdayKey) return "";
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "short"
  });
}
function groupEntriesByDay(entries, now) {
  const map = /* @__PURE__ */ new Map();
  (entries || []).forEach(function(e) {
    const key = dayKeyFromIso(e && e.at);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  });
  return [...map.entries()].sort(function(a, b) {
    return String(b[0]).localeCompare(String(a[0]));
  }).map(function(pair) {
    const day = pair[0];
    const dayEntries = pair[1].slice().sort(function(a, b) {
      const byAt = String(b.at || "").localeCompare(String(a.at || ""));
      if (byAt !== 0) return byAt;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });
    return {
      day,
      label: formatDayLabel(day, now),
      isToday: day === dayKeyFromIso((now || /* @__PURE__ */ new Date()).toISOString()),
      entries: dayEntries
    };
  });
}

// public/js/features/eventualidades-strip-auto-labs.mjs
var FLAG_KEY = "rpc-strip-auto-lab-ev-v1";
function isAutoLabInterpretationText(text) {
  var t = normalizeEventualidadText(text);
  if (!t) return false;
  if (/^LABS\s+\d{1,2}\/\d{1,2}/.test(t)) return true;
  if (/EN LA (BIOMETR|QU[IÍ]MICA|GASOMETR)/.test(t)) return true;
  if (/EN LABORATORIO SE REGISTRAN/.test(t)) return true;
  if (/\b(BH|QS|ESC|PFHS?|GASES|COAG)\b/.test(t) && /\b(HB|HTO|PH|PCO2|GLU|CR|NA|K|ALB|TP|INR)\s*-?\d/.test(t)) {
    return true;
  }
  return false;
}
function stripAutoLabInterpretationsFromStore(store) {
  var entries = Array.isArray(store && store.entries) ? store.entries.slice() : [];
  var labsText = store && store.labsText != null ? normalizeEventualidadText(store.labsText) : "";
  var clearedLabsText = !!labsText;
  var kept = [];
  var removed = [];
  entries.forEach(function(e) {
    if (!e) return;
    if (isAutoLabInterpretationText(e.text)) {
      removed.push(e);
      return;
    }
    kept.push(e);
  });
  var changed = clearedLabsText || removed.length > 0;
  if (!changed) {
    return {
      store: store && typeof store === "object" ? store : { entries: [], labsText: "" },
      changed: false,
      removedEntries: 0,
      clearedLabsText: false
    };
  }
  var next = {
    entries: kept,
    labsText: "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  var deletedIds = store && store.deletedIds && typeof store.deletedIds === "object" ? Object.assign({}, store.deletedIds) : {};
  var now = next.updatedAt;
  removed.forEach(function(e) {
    var id = e && e.id != null ? String(e.id) : "";
    if (id) deletedIds[id] = now;
  });
  if (Object.keys(deletedIds).length) next.deletedIds = deletedIds;
  return {
    store: next,
    changed: true,
    removedEntries: removed.length,
    clearedLabsText
  };
}
function stripAutoLabInterpretationsFromPatients(patients2) {
  var patientsChanged = 0;
  var entriesRemoved = 0;
  var labsTextCleared = 0;
  (patients2 || []).forEach(function(p) {
    if (!p || typeof p !== "object" || !p.eventualidades) return;
    var out = stripAutoLabInterpretationsFromStore(p.eventualidades);
    if (!out.changed) return;
    p.eventualidades = out.store;
    patientsChanged += 1;
    entriesRemoved += out.removedEntries;
    if (out.clearedLabsText) labsTextCleared += 1;
  });
  return {
    patientsChanged,
    entriesRemoved,
    labsTextCleared
  };
}
function hasStrippedAutoLabInterpretations() {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}
function markStrippedAutoLabInterpretations() {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(FLAG_KEY, "1");
  } catch {
  }
}
function maybeStripAutoLabInterpretationsOnce(patients2) {
  if (hasStrippedAutoLabInterpretations()) {
    return { ran: false, patientsChanged: 0, entriesRemoved: 0, labsTextCleared: 0 };
  }
  var stats = stripAutoLabInterpretationsFromPatients(patients2);
  markStrippedAutoLabInterpretations();
  return {
    ran: true,
    patientsChanged: stats.patientsChanged,
    entriesRemoved: stats.entriesRemoved,
    labsTextCleared: stats.labsTextCleared
  };
}

// public/js/app-state.mjs
var patients = [];
var notes = {};
var indicaciones = {};
var labHistory = {};
var medRecetaByPatient = {};
var medPharmProfileByPatient = {};
var recetaHuByPatient = {};
var listadoProblemas = {};
var vpoByPatient = {};
var medNotaSelectionByPatient = {};
var _beforeSave = null;
var _afterSave = null;
var _onSaveResult = null;
var _persistPatientsResolver = null;
var _saveTimer = null;
var _saveInFlight = null;
var _flushSaveQueued = false;
var SAVE_DEBOUNCE_MS = 400;
function setPersistPatientsResolver(fn) {
  _persistPatientsResolver = typeof fn === "function" ? fn : null;
}
function patientsForPersistence() {
  if (_persistPatientsResolver) {
    const overridden = _persistPatientsResolver();
    if (Array.isArray(overridden) && overridden.length) return overridden;
    const filtered = patients.filter(function(p) {
      return p && p.id !== "demo-pitch" && p.id !== "demo-pitch-2" && !p.isDemo;
    });
    if (filtered.length) return filtered;
    const stored = storage.getPatients();
    if (Array.isArray(stored) && stored.length) return stored;
    return [];
  }
  return patients;
}
function setPatients(next) {
  patients = next;
}
function clearWebSessionClinicalMemory() {
  if (!isWebClinicalClient()) return;
  setPatients([]);
  setNotes({});
  setIndicaciones({});
  setLabHistory({});
  setMedRecetaByPatient({});
  setMedPharmProfileByPatient({});
  setRecetaHuByPatient({});
  listadoProblemas = {};
  vpoByPatient = {};
  medNotaSelectionByPatient = {};
}
function setNotes(next) {
  notes = next;
}
function setIndicaciones(next) {
  indicaciones = next;
}
function setLabHistory(next) {
  labHistory = next;
}
function setMedRecetaByPatient(next) {
  medRecetaByPatient = next;
}
function setMedPharmProfileByPatient(next) {
  medPharmProfileByPatient = next;
}
function setVpoByPatient(next) {
  vpoByPatient = next;
}
function setRecetaHuByPatient(next) {
  recetaHuByPatient = next;
}
function clonePlainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}
function replaceAppStateFromBackupData(data) {
  if (!data || typeof data !== "object") return;
  var nextPatients = Array.isArray(data.patients) ? data.patients : [];
  setPatients(
    nextPatients.filter(function(p) {
      return p && !p.isDemo;
    })
  );
  setNotes(clonePlainRecord(data.notes));
  setIndicaciones(clonePlainRecord(data.indicaciones));
  setLabHistory(clonePlainRecord(data.labHistory));
  setMedRecetaByPatient(clonePlainRecord(data.medRecetaByPatient));
  setMedPharmProfileByPatient(clonePlainRecord(data.medPharmProfileByPatient));
  listadoProblemas = clonePlainRecord(data.listadoProblemas);
  vpoByPatient = clonePlainRecord(data.vpoByPatient);
  medNotaSelectionByPatient = {};
}
function setSaveStateHooks({ before, after, onSaveResult } = {}) {
  if (before !== void 0) _beforeSave = before;
  if (after !== void 0) _afterSave = after;
  if (onSaveResult !== void 0) _onSaveResult = onSaveResult;
}
function repairLabHistoryInMemory() {
  return repairLabHistoryMapInPlace(labHistory);
}
async function bootHydrateFromDb() {
  await ensureStorageHydrated();
  initAppState();
}
function initAppState() {
  if (isSessionScopedWebClient()) {
    clearWebSessionClinicalMemory();
  } else {
    setPatients(storage.getPatients());
    setNotes(storage.getNotes());
    setIndicaciones(storage.getIndicaciones());
    setLabHistory(storage.getLabHistory());
    setMedRecetaByPatient(storage.getMedRecetaByPatient());
    setMedPharmProfileByPatient(storage.getMedPharmProfileByPatient());
    setRecetaHuByPatient(storage.getRecetaHuByPatient());
    listadoProblemas = storage.getListadoProblemas();
    vpoByPatient = storage.getVpoByPatient();
  }
  var medCatalog = storage.getMedCatalog();
  applyMedCatalogOverlay(medCatalog);
  applySomePharmCatalogOverlay(medCatalog);
  medNotaSelectionByPatient = {};
  var monitoreoMigrated = false;
  for (var pi = 0; pi < patients.length; pi += 1) {
    if (migratePatientMonitoreo(patients[pi])) monitoreoMigrated = true;
  }
  var salaMigrated = 0;
  try {
    var rpcSettings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    var clinicalSala = String(rpcSettings.clinicalSala || "").trim();
    if (clinicalSala) {
      salaMigrated = migratePatientsClinicalSala(patients, { sala: clinicalSala });
    }
  } catch (_e) {
    void _e;
  }
  if (repairLabHistoryInMemory() || monitoreoMigrated || salaMigrated > 0) {
    saveState({ immediate: true });
  }
  var stripLabs = maybeStripAutoLabInterpretationsOnce(patients);
  if (stripLabs.ran && stripLabs.patientsChanged > 0) {
    saveState({ immediate: true });
    try {
      import("/mobile/js/chunks/mutate-bridge-TBOGIAHM.js").then(function(m) {
        if (m && typeof m.scheduleCloudSyncPush === "function") m.scheduleCloudSyncPush();
      });
    } catch (_e) {
      void _e;
    }
  }
}
function notifySaveResult(result) {
  if (_onSaveResult && result) _onSaveResult(result);
}
function runSaveNow() {
  if (_beforeSave) _beforeSave();
  var promise = storage.saveAll(
    patientsForPersistence(),
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient,
    vpoByPatient,
    medPharmProfileByPatient
  );
  _saveInFlight = promise;
  return promise.then(function(result) {
    notifySaveResult(result);
    if (_afterSave) _afterSave();
    return result;
  }).finally(function() {
    if (_saveInFlight === promise) _saveInFlight = null;
  });
}
function saveState(opts) {
  var immediate = !!(opts && opts.immediate);
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (immediate) {
    return runSaveNow();
  }
  return new Promise(function(resolve) {
    _saveTimer = setTimeout(function() {
      _saveTimer = null;
      runSaveNow().then(resolve);
    }, SAVE_DEBOUNCE_MS);
  });
}
function flushSaveState() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_saveInFlight) {
    _flushSaveQueued = true;
    return _saveInFlight.then(function() {
      if (_flushSaveQueued) {
        _flushSaveQueued = false;
        return runSaveNow();
      }
    });
  }
  _flushSaveQueued = false;
  return runSaveNow();
}

export {
  normalizeEventualidadText,
  rt,
  registerEventualidadesRuntime,
  toEventualidadDateValue,
  eventualidadDateToIso,
  appendEventualidad,
  updateEventualidad,
  findEventualidadEntry,
  removeEventualidad,
  formatDaySubLabel,
  groupEntriesByDay,
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  medPharmProfileByPatient,
  recetaHuByPatient,
  listadoProblemas,
  vpoByPatient,
  medNotaSelectionByPatient,
  setPersistPatientsResolver,
  setPatients,
  clearWebSessionClinicalMemory,
  setNotes,
  setIndicaciones,
  setLabHistory,
  setMedRecetaByPatient,
  setMedPharmProfileByPatient,
  setVpoByPatient,
  setRecetaHuByPatient,
  replaceAppStateFromBackupData,
  setSaveStateHooks,
  repairLabHistoryInMemory,
  bootHydrateFromDb,
  initAppState,
  saveState,
  flushSaveState
};
//# sourceMappingURL=/js/chunks/chunk-H66E52WF.js.map
