import {
  isSessionScopedWebClient
} from "/mobile/js/chunks/chunk-J2US57NE.js";
import {
  appStateFieldsToBlobs,
  hydrateStorageCache,
  isDbMode,
  persistSaveAll
} from "/mobile/js/chunks/chunk-TRTQ4CW2.js";

// public/js/storage-quota.mjs
var STORAGE_WARN_RATIO = 0.82;
var STORAGE_BLOCK_RATIO = 0.97;
var FALLBACK_LOCAL_STORAGE_QUOTA = 5 * 1024 * 1024;
function estimateJsonBytes(value) {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}
function estimateRpcPersistBytes(data) {
  var d = data || {};
  return estimateJsonBytes(d.patients) + estimateJsonBytes(d.notes) + estimateJsonBytes(d.indicaciones) + estimateJsonBytes(d.labHistory) + estimateJsonBytes(d.medRecetaByPatient) + estimateJsonBytes(d.medPharmProfileByPatient) + estimateJsonBytes(d.listadoProblemas) + estimateJsonBytes(d.recetaHuByPatient) + estimateJsonBytes(d.vpoByPatient);
}
async function readStorageQuotaEstimate() {
  try {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      var est = await navigator.storage.estimate();
      var quota = est.quota;
      if (typeof quota === "number" && quota > 0) {
        return {
          usage: typeof est.usage === "number" ? est.usage : null,
          quota
        };
      }
    }
  } catch (_e) {
    void _e;
  }
  return { usage: null, quota: FALLBACK_LOCAL_STORAGE_QUOTA };
}
function assessStoragePressure(pendingBytes, quotaInfo) {
  var quota = quotaInfo && typeof quotaInfo.quota === "number" && quotaInfo.quota > 0 ? quotaInfo.quota : FALLBACK_LOCAL_STORAGE_QUOTA;
  var usage = quotaInfo && typeof quotaInfo.usage === "number" && quotaInfo.usage >= 0 ? quotaInfo.usage : null;
  var projected = (usage != null ? usage : 0) + Math.max(0, pendingBytes || 0);
  if (projected >= quota * STORAGE_BLOCK_RATIO) return "block";
  if (projected >= quota * STORAGE_WARN_RATIO) return "warn";
  return "ok";
}
function isQuotaExceededError(err) {
  if (!err) return false;
  return err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014 || /quota/i.test(String(err.message || ""));
}

// public/js/storage/storage-core.mjs
var _blobCache = null;
function getBlobCache() {
  return _blobCache;
}
function setBlobCache(v) {
  _blobCache = v;
}
var _parsedCache = /* @__PURE__ */ new Map();
function invalidateParsed(blobKey) {
  if (blobKey == null) _parsedCache.clear();
  else _parsedCache.delete(blobKey);
}
var _cachedQuotaEstimate = null;
var _quotaEstimateTs = 0;
var QUOTA_CACHE_MS = 15e3;
async function getCachedQuotaEstimate() {
  var now = Date.now();
  if (_cachedQuotaEstimate && now - _quotaEstimateTs < QUOTA_CACHE_MS) {
    return _cachedQuotaEstimate;
  }
  _cachedQuotaEstimate = await readStorageQuotaEstimate();
  _quotaEstimateTs = now;
  return _cachedQuotaEstimate;
}
function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) return false;
    throw err;
  }
}
function skipClinicalLocalPersist() {
  return isSessionScopedWebClient();
}
function safeParse(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  try {
    var parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}
function safeParseArray(raw) {
  var parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}
function safeParseObject(raw) {
  var parsed = safeParse(raw, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}
function blobCacheRaw(blobKey) {
  if (!_blobCache) return void 0;
  var raw = _blobCache[blobKey];
  if (raw == null) return null;
  return typeof raw === "string" ? raw : JSON.stringify(raw);
}
var WEB_SESSION_EMPTY_CLINICAL_BLOBS = /* @__PURE__ */ new Set([
  "patients",
  "notes",
  "indicaciones",
  "labHistory",
  "medRecetaByPatient",
  "listadoProblemas",
  "recetaHuByPatient",
  "vpoByPatient",
  "medPharmProfileByPatient",
  "lanRoomSnapshots",
  "lanHostPatientMap"
]);
function readClinicalBlob(blobKey, lsKey, parseFromRaw) {
  if (skipClinicalLocalPersist() && WEB_SESSION_EMPTY_CLINICAL_BLOBS.has(blobKey)) {
    return blobKey === "patients" ? [] : parseFromRaw("{}");
  }
  var raw;
  if (_blobCache) {
    raw = blobCacheRaw(blobKey);
  } else {
    raw = localStorage.getItem(lsKey);
  }
  var cached = _parsedCache.get(blobKey);
  if (cached && cached.raw === raw) {
    return cached.parsed;
  }
  var parsed = parseFromRaw(raw);
  _parsedCache.set(blobKey, { raw, parsed });
  return parsed;
}
function readTodosMap() {
  return readClinicalBlob("todos", "rpc-todos", safeParseObject);
}
function writeTodosMap(map) {
  if (skipClinicalLocalPersist()) return;
  const json = JSON.stringify(map);
  if (_blobCache) {
    _blobCache.todos = json;
    if (isDbMode()) {
      void persistSaveAll(
        { todos: map },
        { eventType: "clinical.todos_save", meta: { source: "storage.saveTodos" } }
      );
      invalidateParsed("todos");
      return;
    }
  }
  localStorage.setItem("rpc-todos", json);
  invalidateParsed("todos");
}

// public/js/storage/storage-hydration.mjs
async function ensureStorageHydrated() {
  if (!isDbMode()) return;
  if (getBlobCache()) return;
  if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbStatus === "function") {
    try {
      var st = await window.electronAPI.dbStatus();
      if (st && st.state === "locked") return;
    } catch {
      return;
    }
  }
  try {
    setBlobCache(await hydrateStorageCache());
    invalidateParsed();
  } catch {
    setBlobCache(null);
    invalidateParsed();
  }
}

// public/js/storage/storage-lab.mjs
function isMeaningfulLabHistorySet(set) {
  if (!set || typeof set !== "object") return false;
  if (set.id === "migrated-anterior" || set.id === "migrated-recent") return true;
  if (set.sourceText && String(set.sourceText).trim()) return true;
  if (Array.isArray(set.resLabs) && set.resLabs.length) return true;
  return false;
}
function ensureLabSetId(set, index, used) {
  var raw = set.id != null ? String(set.id).trim() : "";
  if (raw && used.indexOf(raw) === -1) {
    used.push(raw);
    set.id = raw;
    return;
  }
  var base = raw || "set-" + String(index);
  var id = base;
  var n = 2;
  while (used.indexOf(id) !== -1) {
    id = base + "-" + n;
    n += 1;
  }
  set.id = id;
  used.push(id);
}
function normalizeLabHistoryPatientSets(value) {
  var list = [];
  if (value == null) return list;
  if (Array.isArray(value)) list = value.slice();
  else if (typeof value === "object") {
    if (Array.isArray(value.resLabs) || value.id != null || value.sourceText != null) {
      list = [value];
    } else {
      var keys = Object.keys(value);
      if (keys.length) {
        if (keys.every(function(k) {
          return /^\d+$/.test(k);
        })) {
          list = keys.sort(function(a, b) {
            return Number(a) - Number(b);
          }).map(function(k) {
            return value[k];
          });
        } else {
          list = keys.map(function(k) {
            var item = value[k];
            if (!item || typeof item !== "object") return null;
            if (item.id == null || String(item.id).trim() === "") item.id = k;
            return item;
          });
        }
      }
    }
  }
  var used = [];
  var out = [];
  list.forEach(function(set, index) {
    if (!isMeaningfulLabHistorySet(set)) return;
    var copy = set;
    if (typeof set === "object") {
      try {
        copy = Object.assign({}, set);
      } catch {
        copy = set;
      }
    }
    ensureLabSetId(copy, index, used);
    out.push(copy);
  });
  return out;
}
function coerceBool(v, defaultVal) {
  if (v === true || v === false) return v;
  if (v === "true" || v === 1) return true;
  if (v === "false" || v === 0) return false;
  return defaultVal;
}
function normalizeOptionalTodoString(v) {
  if (typeof v !== "string") return null;
  var s = v.trim();
  return s === "" ? null : s;
}
function normalizeScheduledProcedureStored(raw) {
  const core = parseScheduledProcedureCore(raw);
  if (!core) return null;
  const timestamps = resolveScheduledProcedureTimestamps(raw, core.startMs);
  return {
    ...core,
    ...timestamps,
    start: new Date(core.startMs).toISOString()
  };
}
function parseScheduledProcedureCore(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id != null ? raw.id : "").trim();
  const patientId = String(raw.patientId != null ? raw.patientId : "").trim();
  const procedure = String(raw.procedure != null ? raw.procedure : "").trim();
  const location = String(raw.location != null ? raw.location : "").trim();
  if (!id || !patientId || !procedure || !location) return null;
  if (patientId.indexOf("demo-") === 0) return null;
  const start = String(raw.start != null ? raw.start : "").trim();
  if (!start) return null;
  const startMs = Date.parse(start);
  if (!Number.isFinite(startMs)) return null;
  return {
    id,
    patientId,
    procedure,
    location,
    materialApproved: coerceBool(raw.materialApproved, false),
    anesthesiaScheduled: coerceBool(raw.anesthesiaScheduled, false),
    startMs
  };
}
function resolveScheduledProcedureTimestamps(raw, startMs) {
  let createdAt = String(raw.createdAt != null ? raw.createdAt : "").trim();
  if (!createdAt || !Number.isFinite(Date.parse(createdAt))) {
    createdAt = new Date(startMs).toISOString();
  }
  let updatedAt = String(raw.updatedAt != null ? raw.updatedAt : "").trim();
  if (!updatedAt || !Number.isFinite(Date.parse(updatedAt))) updatedAt = createdAt;
  return { createdAt, updatedAt };
}

// public/js/storage/storage-todo-normalize.mjs
function normalizeTodoPriority(rawP) {
  return rawP === "alta" || rawP === "baja" || rawP === "media" ? rawP : "media";
}
function readTodoString(t, key, fallback) {
  return String(t && t[key] != null ? t[key] : fallback);
}
function readTodoOptionalFields(t) {
  return {
    dueDate: normalizeOptionalTodoString(t && t.dueDate),
    reminderAt: normalizeOptionalTodoString(t && t.reminderAt),
    createdBy: normalizeOptionalTodoString(t && t.createdBy),
    completedAt: normalizeOptionalTodoString(t && t.completedAt),
    completedBy: normalizeOptionalTodoString(t && t.completedBy),
    handoffAcknowledgedAt: normalizeOptionalTodoString(t && t.handoffAcknowledgedAt),
    handoffAcknowledgedBy: normalizeOptionalTodoString(t && t.handoffAcknowledgedBy)
  };
}
function normalizeTodoRow(t, fallbackNow) {
  const createdAt = readTodoString(t, "createdAt", fallbackNow);
  const updatedAt = readTodoString(t, "updatedAt", createdAt || fallbackNow);
  return Object.assign(
    {
      id: readTodoString(t, "id", ""),
      text: readTodoString(t, "text", ""),
      completed: !!(t && t.completed),
      priority: normalizeTodoPriority(t && t.priority),
      createdAt,
      updatedAt
    },
    readTodoOptionalFields(t)
  );
}
function normalizeSoapTokenArrays(st) {
  return {
    vasop: Array.isArray(st.vasop) ? st.vasop : [],
    abx: Array.isArray(st.abx) ? st.abx : [],
    analgesia: Array.isArray(st.analgesia) ? st.analgesia : [],
    antihta: Array.isArray(st.antihta) ? st.antihta : []
  };
}
function buildMedCatalogShape(catalog) {
  const c = catalog && typeof catalog === "object" ? catalog : {};
  const st = c.soapTokens && typeof c.soapTokens === "object" ? c.soapTokens : {};
  const sp = c.somePharm && typeof c.somePharm === "object" ? c.somePharm : {};
  const spt = sp.tokens && typeof sp.tokens === "object" ? sp.tokens : {};
  return {
    v: typeof c.v === "number" ? c.v : 1,
    accents: c.accents && typeof c.accents === "object" ? c.accents : {},
    soapTokens: normalizeSoapTokenArrays(st),
    somePharm: { tokens: spt }
  };
}
function buildMedCatalogPayload(catalog) {
  const shaped = buildMedCatalogShape(catalog);
  return {
    v: 1,
    accents: shaped.accents,
    soapTokens: shaped.soapTokens,
    somePharm: shaped.somePharm
  };
}

// public/js/storage/storage-clinical-methods.mjs
var clinicalBlobStorageMethods = {
  getPatients() {
    return readClinicalBlob("patients", "rpc-patients", safeParseArray);
  },
  /**
   * Get all notes from localStorage
   * @returns {Object} Object mapping patient IDs to note text
   */
  getNotes() {
    return readClinicalBlob("notes", "rpc-notes", safeParseObject);
  },
  /**
   * Get all indicaciones from localStorage
   * @returns {Object} Object mapping patient IDs to indicaciones text
   */
  getIndicaciones() {
    return readClinicalBlob("indicaciones", "rpc-indicaciones", safeParseObject);
  },
  /**
   * Get listado de problemas (v3.0) from localStorage
   * @returns {Object} Object mapping patient IDs to listado objects
   */
  getListadoProblemas() {
    return readClinicalBlob("listadoProblemas", "rpc-listado-problemas", safeParseObject);
  },
  /**
   * Get lab history from localStorage
   * @returns {Object} Object mapping patient IDs to arrays of lab entries
   */
  getLabHistory() {
    var raw = readClinicalBlob("labHistory", "rpc-labHistory", safeParseObject);
    var out = {};
    Object.keys(raw).forEach(function(k) {
      out[k] = normalizeLabHistoryPatientSets(raw[k]);
    });
    return out;
  },
  getMedRecetaByPatient() {
    return readClinicalBlob("medRecetaByPatient", "rpc-medRecetaByPatient", safeParseObject);
  },
  getMedPharmProfileByPatient() {
    return readClinicalBlob("medPharmProfileByPatient", "rpc-medPharmProfileByPatient", safeParseObject);
  },
  getVpoByPatient() {
    return readClinicalBlob("vpoByPatient", "rpc-vpoByPatient", safeParseObject);
  },
  getRecetaHuByPatient() {
    return readClinicalBlob("recetaHuByPatient", "rpc-recetaHuByPatient", safeParseObject);
  },
  /**
   * Get to-do list for a patient. Normaliza forma de cada todo.
   * @param {string} patientId
   * @returns {Array<{id:string,text:string,completed:boolean,priority:'alta'|'media'|'baja',createdAt:string,updatedAt:string,dueDate:string|null,reminderAt:string|null,createdBy:string|null,completedAt:string|null,completedBy:string|null,handoffAcknowledgedAt:string|null,handoffAcknowledgedBy:string|null}>}
   */
  getTodos(patientId) {
    const map = readClinicalBlob("todos", "rpc-todos", safeParseObject);
    const raw = Array.isArray(map[patientId]) ? map[patientId] : [];
    return raw.map(function(t) {
      return normalizeTodoRow(t, "");
    });
  },
  /**
   * Save to-do list for a patient. Skips demo- patients.
   * @param {string} patientId
   * @param {Array} todos
   */
  saveTodos(patientId, todos) {
    if (typeof patientId !== "string") return;
    if (patientId.indexOf("demo-") === 0) return;
    const map = readTodosMap();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    map[patientId] = (Array.isArray(todos) ? todos : []).map(function(t) {
      return normalizeTodoRow(t, now);
    });
    writeTodosMap(map);
  },
  /** Patient ids with at least one stored todo row (rpc-todos map keys). */
  listTodoPatientIds() {
    const map = readTodosMap();
    return Object.keys(map);
  },
  getLanRoomSnapshots() {
    return readClinicalBlob("lanRoomSnapshots", "rpc-lan-room-snapshots", safeParseObject);
  },
  getLanRoomSnapshot(roomId) {
    const all = this.getLanRoomSnapshots();
    const row = all[String(roomId || "")];
    return row && typeof row === "object" ? row : null;
  },
  saveLanRoomSnapshot(roomId, snapshot) {
    if (skipClinicalLocalPersist()) return;
    const rid = String(roomId || "");
    if (!rid) return;
    const all = this.getLanRoomSnapshots();
    all[rid] = snapshot && typeof snapshot === "object" ? snapshot : {};
    localStorage.setItem("rpc-lan-room-snapshots", JSON.stringify(all));
    invalidateParsed("lanRoomSnapshots");
  },
  /**
   * Catálogo personalizado de medicamentos (acentos + tokens SOAP + categorías SOME perfil).
   * @returns {{ v: number, accents: Object, soapTokens: Object, somePharm: { tokens: Object } }}
   */
  getMedCatalog() {
    const o = readClinicalBlob("medCatalog", "rpc-medCatalog", function(raw) {
      return safeParseObject(raw);
    });
    return buildMedCatalogShape(o);
  },
  /**
   * @param {{ accents?: Object, soapTokens?: Object }} catalog
   */
  saveMedCatalog(catalog) {
    if (skipClinicalLocalPersist()) return;
    const payload = buildMedCatalogPayload(catalog);
    localStorage.setItem("rpc-medCatalog", JSON.stringify(payload));
    invalidateParsed("medCatalog");
  },
  /**
   * Lista local de procedimientos agendados (spec agenda semanal v1).
   * @returns {Array<Object>}
   */
  getScheduledProcedures() {
    const raw = readClinicalBlob("scheduledProcedures", "rpc-scheduled-procedures", safeParseArray);
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    for (let i = 0; i < raw.length; i += 1) {
      const ev = normalizeScheduledProcedureStored(raw[i]);
      if (ev && ev.patientId.indexOf("demo-") !== 0 && !seen.has(ev.id)) {
        seen.add(ev.id);
        out.push(ev);
      }
    }
    return out;
  },
  /**
   * @param {Array<Object>} events
   */
  saveScheduledProcedures(events) {
    if (skipClinicalLocalPersist()) return;
    const list = Array.isArray(events) ? events.map(normalizeScheduledProcedureStored).filter(Boolean) : [];
    const filtered = list.filter((ev) => ev.patientId.indexOf("demo-") !== 0);
    localStorage.setItem("rpc-scheduled-procedures", JSON.stringify(filtered));
    invalidateParsed("scheduledProcedures");
  },
  /** Elimina en cascada eventos ligados al paciente. */
  removeScheduledProceduresForPatient(patientId) {
    if (typeof patientId !== "string" || !patientId) return;
    const cur = this.getScheduledProcedures();
    const next = cur.filter((ev) => ev.patientId !== patientId);
    if (next.length !== cur.length) this.saveScheduledProcedures(next);
  }
};

// public/js/storage/storage-prefs-methods.mjs
var prefsStorageMethods = {
  getSettings() {
    return safeParseObject(localStorage.getItem("rpc-settings"));
  },
  /**
   * Save application settings to localStorage
   * @param {Object} settings - Settings object
   */
  saveSettings(settings) {
    localStorage.setItem("rpc-settings", JSON.stringify(settings));
  },
  /**
   * Get current theme preference from localStorage
   * @returns {string} Theme name ('light' or 'dark')
   */
  getTheme() {
    return localStorage.getItem("theme") || "light";
  },
  /**
   * Save theme preference to localStorage
   * @param {string} theme - Theme name ('light' or 'dark')
   */
  saveTheme(theme) {
    localStorage.setItem("theme", theme);
  },
  /**
   * Get guided tour completion version from localStorage
   * @returns {string|null} Guided tour version or null if not completed
   */
  getGuidedTourVersion() {
    return localStorage.getItem("rpc-guidedTourDone");
  },
  /**
   * Save guided tour completion version to localStorage
   * @param {string} version - Guided tour version
   */
  saveGuidedTourVersion(version) {
    localStorage.setItem("rpc-guidedTourDone", version);
  },
  /**
   * Remove guided tour completion flag from localStorage
   */
  removeGuidedTourVersion() {
    localStorage.removeItem("rpc-guidedTourDone");
  },
  getLanConfig() {
    return safeParse(localStorage.getItem("rpc-lan-config"), null) || null;
  },
  saveLanConfig(cfg) {
    if (!cfg) {
      localStorage.removeItem("rpc-lan-config");
      return;
    }
    localStorage.setItem("rpc-lan-config", JSON.stringify(cfg));
  },
  /** Last ward shift PIN (6 digits) — used to re-find host after Wi‑Fi change. */
  getLanShiftPin() {
    try {
      const pin = String(localStorage.getItem("rpc-lan-shift-pin") || "").trim();
      return /^\d{6}$/.test(pin) ? pin : "";
    } catch {
      return "";
    }
  },
  saveLanShiftPin(pin) {
    const code = String(pin || "").trim();
    try {
      if (!/^\d{6}$/.test(code)) {
        localStorage.removeItem("rpc-lan-shift-pin");
        return;
      }
      localStorage.setItem("rpc-lan-shift-pin", code);
    } catch (_e) {
      void _e;
    }
  },
  getHostPatientMap() {
    return readClinicalBlob("lanHostPatientMap", "rpc-lan-host-patient-map", safeParseObject);
  },
  saveHostPatientMap(map) {
    if (skipClinicalLocalPersist()) return;
    localStorage.setItem("rpc-lan-host-patient-map", JSON.stringify(map || {}));
    invalidateParsed("lanHostPatientMap");
  },
  /** 'host' = esta R+ abre el servidor; 'client' = solo se une. */
  getLanUiRole() {
    var v = localStorage.getItem("rpc-lan-ui-role");
    if (v === "host" || v === "client") return v;
    return "client";
  },
  saveLanUiRole(role) {
    if (role === "host" || role === "client") {
      localStorage.setItem("rpc-lan-ui-role", role);
    }
  },
  /** Ocultar la franja «Sin conexión al host LAN» cuando se pierde el enlace. */
  getLanHideDisconnectBanner() {
    try {
      return localStorage.getItem("rpc-lan-hide-disconnect-banner") === "1";
    } catch {
      return false;
    }
  },
  saveLanHideDisconnectBanner(hide) {
    try {
      localStorage.setItem("rpc-lan-hide-disconnect-banner", hide ? "1" : "0");
    } catch (_e) {
      void _e;
    }
  },
  /** Aviso no bloqueante cuando LWW sobrescribe un cambio concurrente en la sala. */
  getLanLwwOverwriteToast() {
    try {
      var v = localStorage.getItem("rpc-lan-lww-overwrite-toast");
      if (v === "0") return false;
      return true;
    } catch {
      return true;
    }
  },
  setLanLwwOverwriteToast(enabled) {
    try {
      localStorage.setItem("rpc-lan-lww-overwrite-toast", enabled ? "1" : "0");
    } catch (_e) {
      void _e;
    }
  }
};

// public/js/storage/storage-save-all-helpers.mjs
function filterObjectKeys(obj, keep) {
  const out = {};
  Object.keys(obj || {}).forEach(function(k) {
    if (keep(k, obj[k])) out[k] = obj[k];
  });
  return out;
}
function isNonDemoPatientKey(k) {
  return !k.startsWith("demo-");
}
function buildNotesPersist(notes) {
  return filterObjectKeys(notes, function(k, v) {
    return !!v && isNonDemoPatientKey(k);
  });
}
function buildIndicacionesPersist(indicaciones) {
  return filterObjectKeys(indicaciones, function(k, v) {
    return !!v && isNonDemoPatientKey(k);
  });
}
function buildLabHistoryPersist(labHistory) {
  const out = {};
  Object.keys(labHistory || {}).forEach(function(k) {
    if (isNonDemoPatientKey(k)) {
      out[k] = normalizeLabHistoryPatientSets(labHistory[k]);
    }
  });
  return out;
}
function buildOptionalPatientMapPersist(map) {
  return filterObjectKeys(map || {}, isNonDemoPatientKey);
}
function buildListadoPersist(listadoProblemas) {
  return filterObjectKeys(listadoProblemas || {}, function(k, v) {
    return !!v && isNonDemoPatientKey(k);
  });
}
function buildSaveAllPersistPayload(input) {
  const {
    patients,
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient,
    vpoByPatient,
    medPharmProfileByPatient
  } = input;
  const notesPersist = buildNotesPersist(notes);
  const indPersist = buildIndicacionesPersist(indicaciones);
  const lhPersist = buildLabHistoryPersist(labHistory);
  const medPersist = buildOptionalPatientMapPersist(medRecetaByPatient);
  const medPharmPersist = buildOptionalPatientMapPersist(medPharmProfileByPatient);
  const listPersist = buildListadoPersist(listadoProblemas);
  const recetaPersist = buildOptionalPatientMapPersist(recetaHuByPatient);
  const vpoPersist = buildOptionalPatientMapPersist(vpoByPatient);
  const filteredPatients = patients.filter(function(p) {
    return !p.isDemo;
  });
  const dbFields = {
    patients: filteredPatients,
    notes: notesPersist,
    indicaciones: indPersist,
    labHistory: lhPersist,
    medRecetaByPatient: medPersist
  };
  const writes = [
    ["rpc-patients", JSON.stringify(filteredPatients)],
    ["rpc-notes", JSON.stringify(notesPersist)],
    ["rpc-indicaciones", JSON.stringify(indPersist)],
    ["rpc-labHistory", JSON.stringify(lhPersist)],
    ["rpc-medRecetaByPatient", JSON.stringify(medPersist)]
  ];
  if (medPharmProfileByPatient !== void 0) {
    dbFields.medPharmProfileByPatient = medPharmPersist;
    writes.push(["rpc-medPharmProfileByPatient", JSON.stringify(medPharmPersist)]);
  }
  if (listadoProblemas !== void 0) {
    dbFields.listadoProblemas = listPersist;
    writes.push(["rpc-listado-problemas", JSON.stringify(listPersist)]);
  }
  if (recetaHuByPatient !== void 0) {
    dbFields.recetaHuByPatient = recetaPersist;
    writes.push(["rpc-recetaHuByPatient", JSON.stringify(recetaPersist)]);
  }
  if (vpoByPatient !== void 0) {
    dbFields.vpoByPatient = vpoPersist;
    writes.push(["rpc-vpoByPatient", JSON.stringify(vpoPersist)]);
  }
  return { dbFields, localWrites: writes };
}

// public/js/storage/storage-save-all.mjs
function buildSaveAllPayloadInput(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas, recetaHuByPatient, vpoByPatient, medPharmProfileByPatient) {
  return {
    patients,
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient: medRecetaByPatient || {},
    listadoProblemas: listadoProblemas !== void 0 ? listadoProblemas || {} : void 0,
    recetaHuByPatient: recetaHuByPatient !== void 0 ? recetaHuByPatient || {} : void 0,
    vpoByPatient: vpoByPatient !== void 0 ? vpoByPatient || {} : void 0,
    medPharmProfileByPatient: medPharmProfileByPatient !== void 0 ? medPharmProfileByPatient || {} : void 0
  };
}
async function persistSaveAllToDb(dbFields, level) {
  const dbRes = await persistSaveAll(dbFields, {
    meta: { source: "storage.saveAll", level }
  });
  if (!dbRes || dbRes.ok === false) {
    return { ok: false, code: dbRes && dbRes.code ? dbRes.code : "DB_ERROR", level: "block" };
  }
  const writtenBlobs = appStateFieldsToBlobs(dbFields);
  setBlobCache(Object.assign({}, getBlobCache() || {}, writtenBlobs));
  invalidateParsed();
  return { ok: true, level: level === "warn" ? "warn" : "ok" };
}
function persistSaveAllToLocalStorage(localWrites, level) {
  for (let i = 0; i < localWrites.length; i += 1) {
    if (!safeLocalStorageSet(localWrites[i][0], localWrites[i][1])) {
      return { ok: false, code: "QUOTA_EXCEEDED", level };
    }
  }
  invalidateParsed();
  return { ok: true, level: level === "warn" ? "warn" : "ok" };
}
async function storageSaveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas, recetaHuByPatient, vpoByPatient, medPharmProfileByPatient) {
  if (skipClinicalLocalPersist()) {
    return { ok: true, level: "ok" };
  }
  const payload = buildSaveAllPayloadInput(
    patients,
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient,
    vpoByPatient,
    medPharmProfileByPatient
  );
  const pending = estimateRpcPersistBytes(payload);
  const quotaInfo = await getCachedQuotaEstimate();
  const level = assessStoragePressure(pending, quotaInfo);
  if (level === "block") {
    return { ok: false, code: "QUOTA_EXCEEDED", level: "block" };
  }
  const { dbFields, localWrites } = buildSaveAllPersistPayload(payload);
  if (isDbMode()) {
    return persistSaveAllToDb(dbFields, level);
  }
  return persistSaveAllToLocalStorage(localWrites, level);
}

// public/js/storage.js
var storage = {
  ...clinicalBlobStorageMethods,
  ...prefsStorageMethods,
  saveAll: storageSaveAll
};
var _origRemoveScheduled = storage.removeScheduledProceduresForPatient;
storage.removeScheduledProceduresForPatient = function(patientId) {
  return _origRemoveScheduled.call(storage, patientId);
};
var _origGetLanSnapshot = storage.getLanRoomSnapshot;
storage.getLanRoomSnapshot = function(roomId) {
  return _origGetLanSnapshot.call(storage, roomId);
};

export {
  isMeaningfulLabHistorySet,
  normalizeLabHistoryPatientSets,
  ensureStorageHydrated,
  storage
};
//# sourceMappingURL=/js/chunks/chunk-IFN2KBEN.js.map
