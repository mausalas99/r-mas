import {
  ensureStorageHydrated,
  isMeaningfulLabHistorySet,
  normalizeLabHistoryPatientSets,
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";
import {
  applyMedCatalogOverlay,
  applySomePharmCatalogOverlay,
  migratePatientMonitoreo,
  toClinicalHistoryText
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
import {
  isSessionScopedWebClient
} from "/mobile/js/chunks/chunk-EE5CSOUC.js";
import {
  migratePatientsClinicalSala
} from "/mobile/js/chunks/chunk-WTVHUFEL.js";
import {
  _applyRepoSnapshot
} from "/mobile/js/chunks/chunk-FSGBGJHB.js";
import {
  isWebClinicalClient
} from "/mobile/js/chunks/chunk-75QM3TGW.js";

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
var EVENTUALIDAD_KINDS = ["transfusion", "biopsia", "procedimiento", "otro"];
var EVENTUALIDAD_KIND_LABELS = {
  transfusion: "Transfusi\xF3n",
  biopsia: "Biopsia",
  procedimiento: "Procedimiento",
  otro: "Otro"
};
var TRANSFUSION_PRODUCTS = ["eritrocitos", "plaquetas", "plasma"];
var TRANSFUSION_PRODUCT_LABELS = {
  eritrocitos: "Eritrocitos",
  plaquetas: "Plaquetas",
  plasma: "Plasma"
};
function normalizeTransfusionProduct(product) {
  const p = String(product == null ? "" : product).trim().toLowerCase();
  return TRANSFUSION_PRODUCTS.includes(
    /** @type {TransfusionProduct} */
    p
  ) ? (
    /** @type {TransfusionProduct} */
    p
  ) : null;
}
function buildEventualidadComposeText(fields) {
  const kind = normalizeEventualidadKind(fields && fields.kind);
  const detail = normalizeEventualidadText(fields && fields.detail != null ? String(fields.detail) : "");
  const product = normalizeTransfusionProduct(fields && fields.transfusionProduct);
  if (kind === "transfusion") {
    if (!product) return "";
    const base = normalizeEventualidadText(TRANSFUSION_PRODUCT_LABELS[product]);
    return detail ? base + " \u2014 " + detail : base;
  }
  if (kind === "biopsia" || kind === "procedimiento") return detail;
  return resolveEventualidadEntryText(detail, kind);
}
var EVENTUALIDAD_KIND_PRIORITY = {
  transfusion: 4,
  biopsia: 3,
  procedimiento: 2,
  otro: 1
};
function normalizeEventualidadKind(kind) {
  const k = String(kind == null ? "" : kind).trim().toLowerCase();
  return EVENTUALIDAD_KINDS.includes(
    /** @type {EventualidadKind} */
    k
  ) ? (
    /** @type {EventualidadKind} */
    k
  ) : null;
}
function inferEventualidadKind(text) {
  const t = String(text || "").toUpperCase();
  if (/\bTRANSFUSI|TRANSFUSIÓN|\bPFC\b|PLAQUETAS|CONCENTRADO\s+DE\s+ERIT|CONCENTRADO\s+ERIT|\bCH\b/.test(t)) {
    return "transfusion";
  }
  if (/\bBIOPSIA\b/.test(t)) return "biopsia";
  if (/\bPROCEDIMIENTO\b|\bCIRUGÍA\b|\bCIRUGIA\b|\bCX\b|CATÉTER|CATETER|\bDRENAJE\b|\bLAVADO\b/.test(t)) {
    return "procedimiento";
  }
  return "otro";
}
function resolveEventualidadKind(entry) {
  const explicit = normalizeEventualidadKind(entry && entry.kind);
  if (explicit) return explicit;
  return inferEventualidadKind(entry && entry.text != null ? String(entry.text) : "");
}
function pickHigherPriorityKind(a, b) {
  const ka = normalizeEventualidadKind(a) || "otro";
  const kb = normalizeEventualidadKind(b) || "otro";
  return (EVENTUALIDAD_KIND_PRIORITY[ka] || 1) >= (EVENTUALIDAD_KIND_PRIORITY[kb] || 1) ? ka : kb;
}
function resolveEventualidadEntryText(text, kind) {
  const normalized = normalizeEventualidadText(text);
  if (normalized) return normalized;
  const normalizedKind = normalizeEventualidadKind(kind);
  if (normalizedKind) return normalizeEventualidadText(EVENTUALIDAD_KIND_LABELS[normalizedKind]);
  return "";
}
function appendEventualidad(store, text, clientId, atIso, kind, transfusionProduct, entryId) {
  const normalizedKind = normalizeEventualidadKind(kind);
  const normalizedProduct = normalizeTransfusionProduct(transfusionProduct);
  const t = resolveEventualidadEntryText(text, kind);
  const base = cloneStoreShell_(store);
  if (!t) return base;
  const at = atIso && String(atIso).trim() ? String(atIso).trim() : eventualidadDateToIso(toEventualidadDateValue(/* @__PURE__ */ new Date()));
  const stableId = entryId != null ? String(entryId).trim() : "";
  const entry = {
    id: stableId || "ev_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at,
    text: t,
    clientId: clientId || void 0
  };
  if (normalizedKind) entry.kind = normalizedKind;
  if (normalizedKind === "transfusion" && normalizedProduct) entry.transfusionProduct = normalizedProduct;
  base.entries.push(entry);
  if (base.deletedIds && base.deletedIds[entry.id]) delete base.deletedIds[entry.id];
  return touchEventualidadesMeta_(base);
}
function resolveUpdateEventualidadKind_(patch, cur) {
  return patch && patch.kind != null ? normalizeEventualidadKind(patch.kind) : normalizeEventualidadKind(cur.kind);
}
function resolveUpdateEventualidadText_(patch, cur, patchKind) {
  return patch && patch.text != null ? resolveEventualidadEntryText(patch.text, patchKind || cur.kind) : resolveEventualidadEntryText(cur.text, patchKind || cur.kind);
}
function resolveUpdateEventualidadAt_(patch, cur) {
  return patch && patch.at != null && String(patch.at).trim() ? String(patch.at).trim() : cur.at;
}
function applyUpdateEventualidadPatchExtras_(nextEntry, patch) {
  if (patch && patch.kind != null) {
    const normalizedKind = normalizeEventualidadKind(patch.kind);
    if (normalizedKind) nextEntry.kind = normalizedKind;
    else delete nextEntry.kind;
  }
  if (patch && patch.transfusionProduct != null) {
    const normalizedProduct = normalizeTransfusionProduct(patch.transfusionProduct);
    if (normalizedProduct) nextEntry.transfusionProduct = normalizedProduct;
    else delete nextEntry.transfusionProduct;
  } else if (nextEntry.kind !== "transfusion") {
    delete nextEntry.transfusionProduct;
  }
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
  const patchKind = resolveUpdateEventualidadKind_(patch, cur);
  const text = resolveUpdateEventualidadText_(patch, cur, patchKind);
  if (!text) return base;
  const at = resolveUpdateEventualidadAt_(patch, cur);
  const nextEntry = Object.assign({}, cur, { text, at });
  applyUpdateEventualidadPatchExtras_(nextEntry, patch);
  base.entries[idx] = nextEntry;
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
function sortEntriesDesc(entries) {
  return (entries || []).slice().sort(function(a, b) {
    return String(b.at || "").localeCompare(String(a.at || ""));
  });
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

// public/js/clinical-repo-client.mjs
var SNAPSHOT_KEYS = [
  "patients",
  "notes",
  "indicaciones",
  "labHistory",
  "medRecetaByPatient",
  "medPharmProfileByPatient",
  "recetaHuByPatient",
  "listadoProblemas",
  "vpoByPatient"
];
function canExecuteClinicalCommand() {
  return !!(typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbClinicalCommand === "function");
}
function canProjectClinicalChanges() {
  return !!(typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbClinicalProjectUnsynced === "function" && typeof window.electronAPI.dbClinicalMarkSynced === "function");
}
function pickSnapshotFields(res) {
  const snapshot = {};
  for (const key of SNAPSHOT_KEYS) {
    if (res[key] === void 0) continue;
    snapshot[key] = res[key];
  }
  return snapshot;
}
async function executeClinicalCommand(command, meta = {}) {
  if (!canExecuteClinicalCommand()) {
    return { ok: false, error: "ipc_unavailable" };
  }
  const res = await window.electronAPI.dbClinicalCommand({
    command,
    meta: {
      actorId: meta.actorId,
      source: meta.source || "ui",
      echoSnapshot: meta.echoSnapshot
    }
  });
  if (!res || typeof res !== "object") {
    return { ok: false, error: "command_failed" };
  }
  if (res.ok === false) {
    return { ok: false, error: String(res.error || res.code || "command_failed") };
  }
  const out = {
    ok: true,
    changedKeys: Array.isArray(res.changedKeys) ? res.changedKeys : [],
    changeId: res.changeId != null ? String(res.changeId) : null
  };
  if (meta.echoSnapshot !== false) {
    const snapshot = pickSnapshotFields(res);
    if (Object.keys(snapshot).length) {
      _applyRepoSnapshot(snapshot, { source: "clinical-command" });
      Object.assign(out, snapshot);
    }
  }
  return out;
}
async function projectUnsyncedClinicalChanges(opts = {}) {
  if (!canProjectClinicalChanges()) {
    return { ok: false, error: "ipc_unavailable" };
  }
  const res = await window.electronAPI.dbClinicalProjectUnsynced({
    actorId: opts.actorId,
    limit: opts.limit,
    changeIds: Array.isArray(opts.changeIds) ? opts.changeIds : void 0
  });
  if (!res || typeof res !== "object" || res.ok === false) {
    return { ok: false, error: String(res?.error || "project_failed") };
  }
  return {
    ok: true,
    mutations: Array.isArray(res.mutations) ? res.mutations : [],
    skipIds: Array.isArray(res.skipIds) ? res.skipIds : []
  };
}
async function markClinicalChangesSynced(payload) {
  if (!canProjectClinicalChanges()) {
    return { ok: false, error: "ipc_unavailable" };
  }
  const res = await window.electronAPI.dbClinicalMarkSynced({
    changeIds: Array.isArray(payload?.changeIds) ? payload.changeIds : [],
    syncedAt: payload?.syncedAt
  });
  if (!res || typeof res !== "object" || res.ok === false) {
    return { ok: false, error: String(res?.error || "mark_failed") };
  }
  return { ok: true, marked: Number(res.marked) || 0 };
}

// public/js/deferred-work.mjs
var idleGeneration = 0;
var afterPaintGeneration = 0;
var trailingGeneration = 0;
var trailingTimer = null;
function cancelDeferredIdleWork() {
  idleGeneration += 1;
  afterPaintGeneration += 1;
  trailingGeneration += 1;
  if (trailingTimer != null) {
    clearTimeout(trailingTimer);
    trailingTimer = null;
  }
  return idleGeneration;
}
function scheduleAfterPaint(fn) {
  if (typeof fn !== "function") return;
  const gen = afterPaintGeneration;
  const run = function() {
    if (gen !== afterPaintGeneration) return;
    fn();
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function() {
      requestAnimationFrame(run);
    });
    return;
  }
  setTimeout(run, 0);
}
function scheduleIdle(fn, timeoutMs) {
  if (typeof fn !== "function") return;
  const gen = idleGeneration;
  const timeout = timeoutMs == null ? 150 : timeoutMs;
  const run = function() {
    if (gen !== idleGeneration) return;
    fn();
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout });
    return;
  }
  setTimeout(run, 0);
}
function scheduleAfterPaintThenIdle(fn, timeoutMs) {
  if (typeof fn !== "function") return;
  scheduleAfterPaint(function() {
    scheduleIdle(fn, timeoutMs);
  });
}
function scheduleTrailing(fn, delayMs) {
  if (typeof fn !== "function") return;
  if (trailingTimer != null) clearTimeout(trailingTimer);
  const gen = trailingGeneration;
  const delay = delayMs == null ? 120 : delayMs;
  trailingTimer = setTimeout(function() {
    trailingTimer = null;
    if (gen !== trailingGeneration) return;
    fn();
  }, delay);
}

// public/js/clinical-repo-persist.mjs
var _persistTimer = null;
var _persistInFlight = null;
var _coalesceTail = null;
var _flushQueued = false;
var _debounceResolvers = [];
var PERSIST_DEBOUNCE_MS = 400;
var IDLE_FULL_PERSIST_MS = 8e3;
var _idleFullPersistQueued = false;
function snapshotForPersist(opts = {}) {
  const full = getClinicalPersistSnapshot();
  const domains = opts && Array.isArray(opts.domains) ? opts.domains : null;
  if (!domains || !domains.length) return full;
  const out = {};
  for (let i = 0; i < domains.length; i += 1) {
    const key = String(domains[i] || "");
    if (!key || full[key] === void 0) continue;
    out[key] = full[key];
  }
  return Object.keys(out).length ? out : full;
}
function legacySaveAll(snapshot) {
  return storage.saveAll(
    snapshot.patients,
    snapshot.notes,
    snapshot.indicaciones,
    snapshot.labHistory,
    snapshot.medRecetaByPatient,
    snapshot.listadoProblemas,
    snapshot.recetaHuByPatient,
    snapshot.vpoByPatient,
    snapshot.medPharmProfileByPatient
  );
}
function clearPersistTimer() {
  if (_persistTimer) {
    clearTimeout(_persistTimer);
    _persistTimer = null;
  }
}
function resolveDebounceWaiters(resultPromise) {
  const resolvers = _debounceResolvers.splice(0);
  if (!resolvers.length) return;
  Promise.resolve(resultPromise).then((result) => {
    for (let i = 0; i < resolvers.length; i += 1) resolvers[i](result);
  });
}
async function runPersistNow(opts = {}) {
  invokeBeforeSaveHook();
  const snapshot = snapshotForPersist(opts);
  const source = opts.source || "ui";
  let promise;
  if (canExecuteClinicalCommand()) {
    promise = executeClinicalCommand(
      { type: "clinical.persistSnapshot", ...snapshot },
      { source, echoSnapshot: false }
    ).then((res) => {
      if (!res || res.ok === false) {
        return { ok: false, error: String(res?.error || "persist_failed") };
      }
      return { ok: true, ...res };
    });
  } else {
    _applyRepoSnapshot(snapshot, { source: "persist-memory" });
    if (isWebClinicalClient()) {
      promise = Promise.resolve({ ok: true, memoryOnly: true });
    } else {
      promise = Promise.resolve(legacySaveAll(snapshot)).then((result) => {
        if (result && result.ok === false) {
          return { ok: false, error: String(result.error || "save_failed"), ...result };
        }
        return { ok: true, ...result && typeof result === "object" ? result : {} };
      });
    }
  }
  _persistInFlight = promise;
  try {
    const result = await promise;
    notifySaveResultHook(result);
    invokeAfterSaveHook();
    return result;
  } finally {
    if (_persistInFlight === promise) _persistInFlight = null;
  }
}
function enqueueCoalescedFollowUp(opts = {}) {
  _flushQueued = true;
  if (!_coalesceTail) {
    const inFlight = _persistInFlight;
    _coalesceTail = Promise.resolve(inFlight).then(async () => {
      _coalesceTail = null;
      if (!_flushQueued) return { ok: true };
      _flushQueued = false;
      return runPersistNow({ ...opts, immediate: true });
    });
  }
  return _coalesceTail;
}
function persistClinicalState(opts = {}) {
  const immediate = !!(opts && opts.immediate);
  if (_persistTimer) {
    clearTimeout(_persistTimer);
    _persistTimer = null;
  }
  if (immediate) {
    const run = _persistInFlight ? enqueueCoalescedFollowUp(opts) : runPersistNow(opts);
    resolveDebounceWaiters(run);
    return run;
  }
  return new Promise((resolve) => {
    _debounceResolvers.push(resolve);
    _persistTimer = setTimeout(() => {
      _persistTimer = null;
      const run = _persistInFlight ? enqueueCoalescedFollowUp(opts) : runPersistNow(opts);
      resolveDebounceWaiters(run);
    }, PERSIST_DEBOUNCE_MS);
  });
}
async function flushPersistClinicalState() {
  clearPersistTimer();
  const run = _persistInFlight ? enqueueCoalescedFollowUp({ immediate: true, source: "flush" }) : runPersistNow({ immediate: true, source: "flush" });
  resolveDebounceWaiters(run);
  return run;
}
function scheduleIdleClinicalPersist() {
  if (_idleFullPersistQueued) return;
  _idleFullPersistQueued = true;
  scheduleIdle(function() {
    _idleFullPersistQueued = false;
    persistClinicalState();
  }, IDLE_FULL_PERSIST_MS);
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
var _setPatientsWarned = false;
function setPatients(next) {
  if (!_setPatientsWarned) {
    _setPatientsWarned = true;
    console.warn("[reckoning] setPatients mutates the in-memory census; prefer clinical-repo commands");
  }
  patients = Array.isArray(next) ? next : [];
}
function resetSetPatientsWarningForTests() {
  _setPatientsWarned = false;
}
function getPatients() {
  return patients;
}
function getNotes() {
  return notes;
}
function getIndicaciones() {
  return indicaciones;
}
function getLabHistory() {
  return labHistory;
}
function getMedRecetaByPatient() {
  return medRecetaByPatient;
}
function getMedPharmProfileByPatient() {
  return medPharmProfileByPatient;
}
function getRecetaHuByPatient() {
  return recetaHuByPatient;
}
function getListadoProblemas() {
  return listadoProblemas;
}
function getVpoByPatient() {
  return vpoByPatient;
}
function getMedNotaSelectionByPatient() {
  return medNotaSelectionByPatient;
}
function getClinicalDomain(name) {
  switch (String(name || "")) {
    case "patients":
      return getPatients();
    case "notes":
      return getNotes();
    case "indicaciones":
      return getIndicaciones();
    case "labHistory":
      return getLabHistory();
    case "medRecetaByPatient":
      return getMedRecetaByPatient();
    case "medPharmProfileByPatient":
      return getMedPharmProfileByPatient();
    case "recetaHuByPatient":
      return getRecetaHuByPatient();
    case "listadoProblemas":
      return getListadoProblemas();
    case "vpoByPatient":
      return getVpoByPatient();
    case "medNotaSelectionByPatient":
      return getMedNotaSelectionByPatient();
    default:
      return void 0;
  }
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
  setListadoProblemas({});
  setVpoByPatient({});
  setMedNotaSelectionByPatient({});
}
function asPlainMap(next) {
  return next && typeof next === "object" && !Array.isArray(next) ? next : {};
}
function setNotes(next) {
  notes = asPlainMap(next);
}
function setIndicaciones(next) {
  indicaciones = asPlainMap(next);
}
function setLabHistory(next) {
  labHistory = asPlainMap(next);
}
function setMedRecetaByPatient(next) {
  medRecetaByPatient = asPlainMap(next);
}
function setMedPharmProfileByPatient(next) {
  medPharmProfileByPatient = asPlainMap(next);
}
function setVpoByPatient(next) {
  vpoByPatient = asPlainMap(next);
}
function setRecetaHuByPatient(next) {
  recetaHuByPatient = asPlainMap(next);
}
function setListadoProblemas(next) {
  listadoProblemas = asPlainMap(next);
}
function setMedNotaSelectionByPatient(next) {
  medNotaSelectionByPatient = asPlainMap(next);
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
  setListadoProblemas(clonePlainRecord(data.listadoProblemas));
  setVpoByPatient(clonePlainRecord(data.vpoByPatient));
  setMedNotaSelectionByPatient({});
}
function setSaveStateHooks({ before, after, onSaveResult } = {}) {
  if (before !== void 0) _beforeSave = before;
  if (after !== void 0) _afterSave = after;
  if (onSaveResult !== void 0) _onSaveResult = onSaveResult;
}
function invokeBeforeSaveHook() {
  if (_beforeSave) _beforeSave();
}
function invokeAfterSaveHook() {
  if (_afterSave) _afterSave();
}
function notifySaveResultHook(result) {
  if (_onSaveResult && result) _onSaveResult(result);
}
function getClinicalPersistSnapshot() {
  return {
    patients: patientsForPersistence(),
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    medPharmProfileByPatient,
    recetaHuByPatient,
    listadoProblemas,
    vpoByPatient
  };
}
function repairLabHistoryInMemory() {
  return repairLabHistoryMapInPlace(labHistory);
}
async function bootHydrateFromDb() {
  await ensureStorageHydrated();
  initAppState();
  try {
    var repoHydrate = await import("/mobile/js/chunks/clinical-repo-hydrate-7KIQ4VWT.js");
    if (repoHydrate && typeof repoHydrate.hydrateClinicalRepoIntoReadModel === "function") {
      await repoHydrate.hydrateClinicalRepoIntoReadModel();
    }
  } catch (err) {
    console.warn("[R+] Clinical read-model hydrate:", err && err.message);
  }
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
    setListadoProblemas(storage.getListadoProblemas());
    setVpoByPatient(storage.getVpoByPatient());
  }
  var medCatalog = storage.getMedCatalog();
  applyMedCatalogOverlay(medCatalog);
  applySomePharmCatalogOverlay(medCatalog);
  setMedNotaSelectionByPatient({});
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
    void persistClinicalState({ immediate: true, source: "boot-migrate" });
  }
  var stripLabs = maybeStripAutoLabInterpretationsOnce(patients);
  if (stripLabs.ran && stripLabs.patientsChanged > 0) {
    void persistClinicalState({ immediate: true, source: "boot-strip-labs" });
    try {
      import("/mobile/js/chunks/mutate-bridge-OGE2GEEP.js").then(function(m) {
        if (m && typeof m.scheduleCloudSyncPush === "function") m.scheduleCloudSyncPush();
      });
    } catch (_e) {
      void _e;
    }
  }
}
function saveState(opts) {
  console.warn("[reckoning] saveState is deprecated; use persistClinicalState");
  return persistClinicalState(opts);
}
function flushSaveState() {
  return flushPersistClinicalState();
}

export {
  normalizeEventualidadText,
  rt,
  registerEventualidadesRuntime,
  toEventualidadDateValue,
  eventualidadDateToIso,
  EVENTUALIDAD_KINDS,
  EVENTUALIDAD_KIND_LABELS,
  TRANSFUSION_PRODUCTS,
  TRANSFUSION_PRODUCT_LABELS,
  buildEventualidadComposeText,
  normalizeEventualidadKind,
  resolveEventualidadKind,
  pickHigherPriorityKind,
  resolveEventualidadEntryText,
  appendEventualidad,
  updateEventualidad,
  findEventualidadEntry,
  removeEventualidad,
  sortEntriesDesc,
  dayKeyFromIso,
  formatDaySubLabel,
  groupEntriesByDay,
  canExecuteClinicalCommand,
  canProjectClinicalChanges,
  executeClinicalCommand,
  projectUnsyncedClinicalChanges,
  markClinicalChangesSynced,
  cancelDeferredIdleWork,
  scheduleAfterPaint,
  scheduleIdle,
  scheduleAfterPaintThenIdle,
  scheduleTrailing,
  persistClinicalState,
  flushPersistClinicalState,
  scheduleIdleClinicalPersist,
  setPersistPatientsResolver,
  setPatients,
  resetSetPatientsWarningForTests,
  getPatients,
  getNotes,
  getIndicaciones,
  getLabHistory,
  getMedRecetaByPatient,
  getMedPharmProfileByPatient,
  getRecetaHuByPatient,
  getListadoProblemas,
  getVpoByPatient,
  getMedNotaSelectionByPatient,
  getClinicalDomain,
  clearWebSessionClinicalMemory,
  setNotes,
  setIndicaciones,
  setLabHistory,
  setMedRecetaByPatient,
  setMedPharmProfileByPatient,
  setVpoByPatient,
  setRecetaHuByPatient,
  setListadoProblemas,
  setMedNotaSelectionByPatient,
  replaceAppStateFromBackupData,
  setSaveStateHooks,
  invokeBeforeSaveHook,
  invokeAfterSaveHook,
  notifySaveResultHook,
  getClinicalPersistSnapshot,
  repairLabHistoryInMemory,
  bootHydrateFromDb,
  initAppState,
  saveState,
  flushSaveState
};
//# sourceMappingURL=/js/chunks/chunk-NC6VRD7M.js.map
