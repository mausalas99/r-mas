// public/js/storage-quota.mjs
var STORAGE_WARN_RATIO = 0.82;
var STORAGE_BLOCK_RATIO = 0.97;
var FALLBACK_LOCAL_STORAGE_QUOTA = 5 * 1024 * 1024;
function estimateJsonBytes(value) {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch (_e) {
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

// public/js/db-storage-bridge.mjs
var CLINICAL_LS_KEYS = [
  "rpc-patients",
  "rpc-notes",
  "rpc-indicaciones",
  "rpc-labHistory",
  "rpc-medRecetaByPatient",
  "rpc-listado-problemas",
  "rpc-recetaHuByPatient",
  "rpc-vpoByPatient",
  "rpc-medPharmProfileByPatient",
  "rpc-medCatalog",
  "rpc-todos",
  "rpc-scheduled-procedures",
  "rpc-lan-room-snapshots",
  "rpc-lan-host-patient-map"
];
var APP_FIELD_TO_BLOB = {
  patients: "patients",
  notes: "notes",
  indicaciones: "indicaciones",
  labHistory: "labHistory",
  medRecetaByPatient: "medRecetaByPatient",
  listadoProblemas: "listadoProblemas",
  recetaHuByPatient: "recetaHuByPatient",
  vpoByPatient: "vpoByPatient",
  medPharmProfileByPatient: "medPharmProfileByPatient",
  medCatalog: "medCatalog",
  todos: "todos",
  scheduledProcedures: "scheduledProcedures",
  lanRoomSnapshots: "lanRoomSnapshots",
  lanHostPatientMap: "lanHostPatientMap"
};
function isDbMode() {
  return !!(typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbClinicalLoadAll === "function");
}
async function hydrateStorageCache() {
  const res = await window.electronAPI.dbClinicalLoadAll();
  if (!res || res.ok === false) {
    const err = new Error(res?.code || res?.error || "DB_LOAD_FAILED");
    err.code = res?.code || "DB_LOAD_FAILED";
    throw err;
  }
  return res.blobs && typeof res.blobs === "object" ? res.blobs : {};
}
function appStateFieldsToBlobs(fields) {
  const blobs = {};
  if (!fields || typeof fields !== "object") return blobs;
  for (const [field, blobKey] of Object.entries(APP_FIELD_TO_BLOB)) {
    if (fields[field] === void 0) continue;
    blobs[blobKey] = JSON.stringify(fields[field]);
  }
  return blobs;
}
async function persistSaveAll(fields, auditMeta) {
  const blobs = appStateFieldsToBlobs(fields);
  const payload = {
    blobs,
    auditMeta: auditMeta && typeof auditMeta === "object" ? auditMeta : {}
  };
  if (!payload.auditMeta.eventType) {
    payload.auditMeta.eventType = "clinical.save_all";
  }
  return window.electronAPI.dbClinicalSaveAll(payload);
}

// public/js/storage.js
var _blobCache = null;
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
function safeParse(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  try {
    var parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (_e) {
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
function readClinicalBlob(blobKey, lsKey, parseFromRaw) {
  if (_blobCache) {
    return parseFromRaw(blobCacheRaw(blobKey));
  }
  return parseFromRaw(localStorage.getItem(lsKey));
}
function readTodosMap() {
  return readClinicalBlob("todos", "rpc-todos", safeParseObject);
}
function writeTodosMap(map) {
  const json = JSON.stringify(map);
  if (_blobCache) {
    _blobCache.todos = json;
    if (isDbMode()) {
      void persistSaveAll(
        { todos: map },
        { eventType: "clinical.todos_save", meta: { source: "storage.saveTodos" } }
      );
      return;
    }
  }
  localStorage.setItem("rpc-todos", json);
}
async function ensureStorageHydrated() {
  if (!isDbMode()) return;
  if (_blobCache) return;
  if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbStatus === "function") {
    try {
      var st = await window.electronAPI.dbStatus();
      if (st && st.state === "locked") return;
    } catch (_e) {
      return;
    }
  }
  try {
    _blobCache = await hydrateStorageCache();
  } catch (_e) {
    _blobCache = null;
  }
}
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
      } catch (_e) {
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
function normalizeScheduledProcedureStored(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id != null ? raw.id : "").trim();
  const patientId = String(raw.patientId != null ? raw.patientId : "").trim();
  const procedure = String(raw.procedure != null ? raw.procedure : "").trim();
  const location = String(raw.location != null ? raw.location : "").trim();
  if (!id || !patientId || !procedure || !location) return null;
  if (patientId.indexOf("demo-") === 0) return null;
  const start = String(raw.start != null ? raw.start : "").trim();
  if (!start) return null;
  const ds = Date.parse(start);
  if (!Number.isFinite(ds)) return null;
  let createdAt = String(raw.createdAt != null ? raw.createdAt : "").trim();
  if (!createdAt || !Number.isFinite(Date.parse(createdAt))) {
    createdAt = new Date(ds).toISOString();
  }
  let updatedAt = String(raw.updatedAt != null ? raw.updatedAt : "").trim();
  if (!updatedAt || !Number.isFinite(Date.parse(updatedAt))) updatedAt = createdAt;
  return {
    id,
    patientId,
    procedure,
    location,
    materialApproved: coerceBool(raw.materialApproved, false),
    anesthesiaScheduled: coerceBool(raw.anesthesiaScheduled, false),
    start: new Date(ds).toISOString(),
    createdAt,
    updatedAt
  };
}
var storage = {
  /**
   * Get all patients from localStorage
   * @returns {Array} Array of patient objects
   */
  getPatients() {
    return readClinicalBlob("patients", "rpc-patients", safeParseArray);
  },
  /**
   * Save patients to localStorage (filters out demo patients)
   * @param {Array} patients - Array of patient objects
   */
  savePatients(patients2) {
    const filtered = patients2.filter((p) => !p.isDemo);
    localStorage.setItem("rpc-patients", JSON.stringify(filtered));
  },
  /**
   * Get all notes from localStorage
   * @returns {Object} Object mapping patient IDs to note text
   */
  getNotes() {
    return readClinicalBlob("notes", "rpc-notes", safeParseObject);
  },
  /**
   * Save notes to localStorage (filters out demo patient notes)
   * @param {Object} notes - Object mapping patient IDs to note text
   */
  saveNotes(notes2) {
    const notesPersist = {};
    Object.keys(notes2).forEach((k) => {
      if (notes2[k] && !k.startsWith("demo-")) notesPersist[k] = notes2[k];
    });
    localStorage.setItem("rpc-notes", JSON.stringify(notesPersist));
  },
  /**
   * Get all indicaciones from localStorage
   * @returns {Object} Object mapping patient IDs to indicaciones text
   */
  getIndicaciones() {
    return readClinicalBlob("indicaciones", "rpc-indicaciones", safeParseObject);
  },
  /**
   * Save indicaciones to localStorage (filters out demo patient indicaciones)
   * @param {Object} indicaciones - Object mapping patient IDs to indicaciones text
   */
  saveIndicaciones(indicaciones2) {
    const indPersist = {};
    Object.keys(indicaciones2).forEach((k) => {
      if (indicaciones2[k] && !k.startsWith("demo-")) indPersist[k] = indicaciones2[k];
    });
    localStorage.setItem("rpc-indicaciones", JSON.stringify(indPersist));
  },
  /**
   * Get listado de problemas (v3.0) from localStorage
   * @returns {Object} Object mapping patient IDs to listado objects
   */
  getListadoProblemas() {
    return readClinicalBlob("listadoProblemas", "rpc-listado-problemas", safeParseObject);
  },
  /**
   * Save listado de problemas (v3.0) to localStorage (filters out demo)
   * @param {Object} listadoProblemas
   */
  saveListadoProblemas(listadoProblemas2) {
    const persist = {};
    Object.keys(listadoProblemas2 || {}).forEach((k) => {
      if (listadoProblemas2[k] && !k.startsWith("demo-")) persist[k] = listadoProblemas2[k];
    });
    localStorage.setItem("rpc-listado-problemas", JSON.stringify(persist));
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
  /**
   * Save lab history to localStorage (filters out demo patient history)
   * @param {Object} labHistory - Object mapping patient IDs to arrays of lab entries
   */
  saveLabHistory(labHistory2) {
    const lhPersist = {};
    Object.keys(labHistory2).forEach((k) => {
      if (k.startsWith("demo-")) return;
      var sets = normalizeLabHistoryPatientSets(labHistory2[k]);
      if (sets.length) lhPersist[k] = sets;
    });
    localStorage.setItem("rpc-labHistory", JSON.stringify(lhPersist));
  },
  getMedRecetaByPatient() {
    return readClinicalBlob("medRecetaByPatient", "rpc-medRecetaByPatient", safeParseObject);
  },
  saveMedRecetaByPatient(medRecetaByPatient2) {
    const persist = {};
    Object.keys(medRecetaByPatient2 || {}).forEach((k) => {
      if (medRecetaByPatient2[k] && !k.startsWith("demo-")) persist[k] = medRecetaByPatient2[k];
    });
    localStorage.setItem("rpc-medRecetaByPatient", JSON.stringify(persist));
  },
  getMedPharmProfileByPatient() {
    return readClinicalBlob("medPharmProfileByPatient", "rpc-medPharmProfileByPatient", safeParseObject);
  },
  saveMedPharmProfileByPatient(medPharmProfileByPatient2) {
    const persist = {};
    Object.keys(medPharmProfileByPatient2 || {}).forEach((k) => {
      if (medPharmProfileByPatient2[k] && !k.startsWith("demo-")) {
        persist[k] = medPharmProfileByPatient2[k];
      }
    });
    localStorage.setItem("rpc-medPharmProfileByPatient", JSON.stringify(persist));
  },
  getVpoByPatient() {
    return readClinicalBlob("vpoByPatient", "rpc-vpoByPatient", safeParseObject);
  },
  saveVpoByPatient(vpoByPatient2) {
    const persist = {};
    Object.keys(vpoByPatient2 || {}).forEach((k) => {
      if (vpoByPatient2[k] && !k.startsWith("demo-")) persist[k] = vpoByPatient2[k];
    });
    localStorage.setItem("rpc-vpoByPatient", JSON.stringify(persist));
  },
  getRecetaHuByPatient() {
    return readClinicalBlob("recetaHuByPatient", "rpc-recetaHuByPatient", safeParseObject);
  },
  saveRecetaHuByPatient(recetaHuByPatient2) {
    const persist = {};
    Object.keys(recetaHuByPatient2 || {}).forEach((k) => {
      if (recetaHuByPatient2[k] && !k.startsWith("demo-")) persist[k] = recetaHuByPatient2[k];
    });
    localStorage.setItem("rpc-recetaHuByPatient", JSON.stringify(persist));
  },
  /**
   * Get to-do list for a patient. Normaliza forma de cada todo.
   * @param {string} patientId
   * @returns {Array<{id:string,text:string,completed:boolean,priority:'alta'|'media'|'baja',createdAt:string,updatedAt:string}>}
   */
  getTodos(patientId) {
    const map = readClinicalBlob("todos", "rpc-todos", safeParseObject);
    const raw = Array.isArray(map[patientId]) ? map[patientId] : [];
    return raw.map(function(t) {
      var rawP = t && t.priority;
      var p = rawP === "alta" || rawP === "baja" || rawP === "media" ? rawP : "media";
      var createdAt = String(t && t.createdAt != null ? t.createdAt : "");
      var updatedAt = String(
        t && t.updatedAt != null ? t.updatedAt : createdAt || ""
      );
      return {
        id: String(t && t.id != null ? t.id : ""),
        text: String(t && t.text != null ? t.text : ""),
        completed: !!(t && t.completed),
        priority: p,
        createdAt,
        updatedAt
      };
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
      var createdAt = String(t && t.createdAt != null ? t.createdAt : now);
      return {
        id: String(t && t.id != null ? t.id : ""),
        text: String(t && t.text != null ? t.text : ""),
        completed: !!(t && t.completed),
        priority: t && (t.priority === "alta" || t.priority === "baja" || t.priority === "media") ? t.priority : "media",
        createdAt,
        updatedAt: String(t && t.updatedAt != null ? t.updatedAt : createdAt || now)
      };
    });
    writeTodosMap(map);
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
    const rid = String(roomId || "");
    if (!rid) return;
    const all = this.getLanRoomSnapshots();
    all[rid] = snapshot && typeof snapshot === "object" ? snapshot : {};
    localStorage.setItem("rpc-lan-room-snapshots", JSON.stringify(all));
  },
  /**
   * Catálogo personalizado de medicamentos (acentos + tokens SOAP + categorías SOME perfil).
   * @returns {{ v: number, accents: Object, soapTokens: Object, somePharm: { tokens: Object } }}
   */
  getMedCatalog() {
    const o = readClinicalBlob("medCatalog", "rpc-medCatalog", function(raw) {
      return safeParseObject(raw);
    });
    const st = o.soapTokens && typeof o.soapTokens === "object" ? o.soapTokens : {};
    const sp = o.somePharm && typeof o.somePharm === "object" ? o.somePharm : {};
    const spt = sp.tokens && typeof sp.tokens === "object" ? sp.tokens : {};
    return {
      v: typeof o.v === "number" ? o.v : 1,
      accents: o.accents && typeof o.accents === "object" ? o.accents : {},
      soapTokens: {
        vasop: Array.isArray(st.vasop) ? st.vasop : [],
        abx: Array.isArray(st.abx) ? st.abx : [],
        analgesia: Array.isArray(st.analgesia) ? st.analgesia : [],
        antihta: Array.isArray(st.antihta) ? st.antihta : []
      },
      somePharm: { tokens: spt }
    };
  },
  /**
   * @param {{ accents?: Object, soapTokens?: Object }} catalog
   */
  saveMedCatalog(catalog) {
    const c = catalog && typeof catalog === "object" ? catalog : {};
    const st = c.soapTokens && typeof c.soapTokens === "object" ? c.soapTokens : {};
    const sp = c.somePharm && typeof c.somePharm === "object" ? c.somePharm : {};
    const spt = sp.tokens && typeof sp.tokens === "object" ? sp.tokens : {};
    const payload = {
      v: 1,
      accents: c.accents && typeof c.accents === "object" ? c.accents : {},
      soapTokens: {
        vasop: Array.isArray(st.vasop) ? st.vasop : [],
        abx: Array.isArray(st.abx) ? st.abx : [],
        analgesia: Array.isArray(st.analgesia) ? st.analgesia : [],
        antihta: Array.isArray(st.antihta) ? st.antihta : []
      },
      somePharm: { tokens: spt }
    };
    localStorage.setItem("rpc-medCatalog", JSON.stringify(payload));
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
    const list = Array.isArray(events) ? events.map(normalizeScheduledProcedureStored).filter(Boolean) : [];
    const filtered = list.filter((ev) => ev.patientId.indexOf("demo-") !== 0);
    localStorage.setItem("rpc-scheduled-procedures", JSON.stringify(filtered));
  },
  /** Elimina en cascada eventos ligados al paciente. */
  removeScheduledProceduresForPatient(patientId) {
    if (typeof patientId !== "string" || !patientId) return;
    const cur = this.getScheduledProcedures();
    const next = cur.filter((ev) => ev.patientId !== patientId);
    if (next.length !== cur.length) this.saveScheduledProcedures(next);
  },
  /**
   * Add a lab entry to a patient's lab history
   * @param {string} patientId - Patient ID
   * @param {Object} labEntry - Lab entry object with test results
   */
  pushLabHistory(patientId, labEntry) {
    const labHistory2 = this.getLabHistory();
    if (!labHistory2[patientId]) labHistory2[patientId] = [];
    labHistory2[patientId].push(labEntry);
    this.saveLabHistory(labHistory2);
  },
  /**
   * Get application settings from localStorage
   * @returns {Object} Settings object
   */
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
  getHostPatientMap() {
    return readClinicalBlob("lanHostPatientMap", "rpc-lan-host-patient-map", safeParseObject);
  },
  saveHostPatientMap(map) {
    localStorage.setItem("rpc-lan-host-patient-map", JSON.stringify(map || {}));
  },
  /** 'host' = esta R+ abre el servidor; 'client' = solo se une. */
  getLanUiRole() {
    var v = localStorage.getItem("rpc-lan-ui-role");
    if (v === "host" || v === "client") return v;
    if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.getLanCandidateBaseUrl === "function") {
      return "host";
    }
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
    } catch (_e) {
      return false;
    }
  },
  saveLanHideDisconnectBanner(hide) {
    try {
      localStorage.setItem("rpc-lan-hide-disconnect-banner", hide ? "1" : "0");
    } catch (_e) {
    }
  },
  /** Aviso no bloqueante cuando LWW sobrescribe un cambio concurrente en la sala. */
  getLanLwwOverwriteToast() {
    try {
      var v = localStorage.getItem("rpc-lan-lww-overwrite-toast");
      if (v === "0") return false;
      return true;
    } catch (_e) {
      return true;
    }
  },
  setLanLwwOverwriteToast(enabled) {
    try {
      localStorage.setItem("rpc-lan-lww-overwrite-toast", enabled ? "1" : "0");
    } catch (_e) {
    }
  },
  /**
   * Batch save all data to localStorage
   * @param {Array} patients - Array of patient objects
   * @param {Object} notes - Object mapping patient IDs to note text
   * @param {Object} indicaciones - Object mapping patient IDs to indicaciones text
   * @param {Object} labHistory - Object mapping patient IDs to arrays of lab entries
   * @param {Object} medRecetaByPatient - Object mapping patient IDs to med receta payloads
   * @param {Object} [listadoProblemas] - Optional v3.0 listado de problemas map
   */
  /**
   * @returns {Promise<{ ok: boolean, code?: string, level?: string }>}
   */
  async saveAll(patients2, notes2, indicaciones2, labHistory2, medRecetaByPatient2, listadoProblemas2, recetaHuByPatient2, vpoByPatient2, medPharmProfileByPatient2) {
    var payload = {
      patients: patients2,
      notes: notes2,
      indicaciones: indicaciones2,
      labHistory: labHistory2,
      medRecetaByPatient: medRecetaByPatient2 || {},
      listadoProblemas: listadoProblemas2 !== void 0 ? listadoProblemas2 || {} : void 0,
      recetaHuByPatient: recetaHuByPatient2 !== void 0 ? recetaHuByPatient2 || {} : void 0,
      vpoByPatient: vpoByPatient2 !== void 0 ? vpoByPatient2 || {} : void 0,
      medPharmProfileByPatient: medPharmProfileByPatient2 !== void 0 ? medPharmProfileByPatient2 || {} : void 0
    };
    var pending = estimateRpcPersistBytes(payload);
    var quotaInfo = await getCachedQuotaEstimate();
    var level = assessStoragePressure(pending, quotaInfo);
    if (level === "block") {
      return { ok: false, code: "QUOTA_EXCEEDED", level: "block" };
    }
    var notesPersist = {};
    Object.keys(notes2).forEach(function(k) {
      if (notes2[k] && !k.startsWith("demo-")) notesPersist[k] = notes2[k];
    });
    var indPersist = {};
    Object.keys(indicaciones2).forEach(function(k) {
      if (indicaciones2[k] && !k.startsWith("demo-")) indPersist[k] = indicaciones2[k];
    });
    var lhPersist = {};
    Object.keys(labHistory2 || {}).forEach(function(k) {
      if (!k.startsWith("demo-")) {
        lhPersist[k] = normalizeLabHistoryPatientSets(labHistory2[k]);
      }
    });
    var medPersist = {};
    Object.keys(medRecetaByPatient2 || {}).forEach(function(k) {
      if (!k.startsWith("demo-")) medPersist[k] = medRecetaByPatient2[k];
    });
    var medPharmPersist = {};
    if (medPharmProfileByPatient2 !== void 0) {
      Object.keys(medPharmProfileByPatient2 || {}).forEach(function(k) {
        if (!k.startsWith("demo-")) medPharmPersist[k] = medPharmProfileByPatient2[k];
      });
    }
    var listPersist = {};
    if (listadoProblemas2 !== void 0) {
      Object.keys(listadoProblemas2 || {}).forEach(function(k) {
        if (listadoProblemas2[k] && !k.startsWith("demo-")) listPersist[k] = listadoProblemas2[k];
      });
    }
    var recetaPersist = {};
    if (recetaHuByPatient2 !== void 0) {
      Object.keys(recetaHuByPatient2 || {}).forEach(function(k) {
        if (!k.startsWith("demo-")) recetaPersist[k] = recetaHuByPatient2[k];
      });
    }
    var vpoPersist = {};
    if (vpoByPatient2 !== void 0) {
      Object.keys(vpoByPatient2 || {}).forEach(function(k) {
        if (!k.startsWith("demo-")) vpoPersist[k] = vpoByPatient2[k];
      });
    }
    var filteredPatients = patients2.filter(function(p) {
      return !p.isDemo;
    });
    if (isDbMode()) {
      var dbFields = {
        patients: filteredPatients,
        notes: notesPersist,
        indicaciones: indPersist,
        labHistory: lhPersist,
        medRecetaByPatient: medPersist
      };
      if (medPharmProfileByPatient2 !== void 0) {
        dbFields.medPharmProfileByPatient = medPharmPersist;
      }
      if (listadoProblemas2 !== void 0) {
        dbFields.listadoProblemas = listPersist;
      }
      if (recetaHuByPatient2 !== void 0) {
        dbFields.recetaHuByPatient = recetaPersist;
      }
      if (vpoByPatient2 !== void 0) {
        dbFields.vpoByPatient = vpoPersist;
      }
      var dbRes = await persistSaveAll(dbFields, {
        meta: { source: "storage.saveAll", level }
      });
      if (!dbRes || dbRes.ok === false) {
        return { ok: false, code: dbRes && dbRes.code ? dbRes.code : "DB_ERROR", level: "block" };
      }
      var writtenBlobs = appStateFieldsToBlobs(dbFields);
      _blobCache = Object.assign({}, _blobCache || {}, writtenBlobs);
      return { ok: true, level: level === "warn" ? "warn" : "ok" };
    }
    var writes = [
      ["rpc-patients", JSON.stringify(filteredPatients)],
      ["rpc-notes", JSON.stringify(notesPersist)],
      ["rpc-indicaciones", JSON.stringify(indPersist)],
      ["rpc-labHistory", JSON.stringify(lhPersist)],
      ["rpc-medRecetaByPatient", JSON.stringify(medPersist)]
    ];
    if (medPharmProfileByPatient2 !== void 0) {
      writes.push(["rpc-medPharmProfileByPatient", JSON.stringify(medPharmPersist)]);
    }
    if (listadoProblemas2 !== void 0) {
      writes.push(["rpc-listado-problemas", JSON.stringify(listPersist)]);
    }
    if (recetaHuByPatient2 !== void 0) {
      writes.push(["rpc-recetaHuByPatient", JSON.stringify(recetaPersist)]);
    }
    if (vpoByPatient2 !== void 0) {
      writes.push(["rpc-vpoByPatient", JSON.stringify(vpoPersist)]);
    }
    for (var i = 0; i < writes.length; i++) {
      if (!safeLocalStorageSet(writes[i][0], writes[i][1])) {
        return { ok: false, code: "QUOTA_EXCEEDED", level };
      }
    }
    return { ok: true, level: level === "warn" ? "warn" : "ok" };
  }
};

// public/js/med-receta-core.mjs
function trimStr(v) {
  return String(v == null ? "" : v).trim();
}
function parseFechaDMYFromTimestampCell(cell) {
  var t = trimStr(cell);
  var m = t.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  return m ? m[1] : "";
}
function normalizeDiaMarkerText(s) {
  return String(s == null ? "" : s).replace(/\u2217/g, "*").replace(/\u204E/g, "*").replace(/\uFF0A/g, "*").replace(/\u00B7/g, " ");
}
function extractDiaTratamiento(dosisRaw) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  var m = t.match(/DIA\s*#\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
function setDiaTratamientoInDosis(dosisRaw, dia) {
  var t = normalizeDiaMarkerText(trimStr(dosisRaw));
  if (!/DIA\s*#\s*\d+/i.test(t)) return trimStr(dosisRaw);
  var n = parseInt(dia, 10);
  if (!Number.isFinite(n) || n < 1) return trimStr(dosisRaw);
  return t.replace(/(\*?\s*DIA\s*#\s*)\d+(\s*\*?)/i, function(_m, pre, post) {
    return pre + String(n) + post;
  });
}
function incrementMedItemsDiaTratamiento(items) {
  var list = Array.isArray(items) ? items : [];
  var count = 0;
  var next = list.map(function(it) {
    if (!it || it.suspendido || it.diaTratamiento == null) return it;
    var diaNext = it.diaTratamiento + 1;
    count += 1;
    return Object.assign({}, it, {
      diaTratamiento: diaNext,
      dosisRaw: setDiaTratamientoInDosis(it.dosisRaw, diaNext)
    });
  });
  return { items: next, count };
}
function stripDiaMarkersFromDosis(dosisPart) {
  var t = normalizeDiaMarkerText(String(dosisPart || ""));
  return trimStr(
    t.replace(/\*?\s*DIA\s*#\s*\d+\s*\*?/gi, "").replace(/\s+/g, " ")
  );
}
function looksLikeSomeMedicationPaste(text) {
  var raw = String(text || "");
  if (!raw.trim()) return false;
  if (!/\t/.test(raw)) return false;
  var lines = raw.split(/\r?\n/).map(trimStr).filter(Boolean);
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split("	");
    if (cols.length >= 7 && trimStr(cols[1]).toUpperCase() === "MEDICAMENTOS") return true;
  }
  return false;
}
function parseMedicationPaste(text) {
  var lines = String(text || "").split(/\r?\n/).map(trimStr).filter(Boolean);
  var items = [];
  var fechas = [];
  var skipped = 0;
  for (var i = 0; i < lines.length; i += 1) {
    var cols = lines[i].split("	");
    if (cols.length < 7) {
      skipped += 1;
      continue;
    }
    var tipo = trimStr(cols[1]).toUpperCase();
    if (tipo !== "MEDICAMENTOS") {
      skipped += 1;
      continue;
    }
    var fd = parseFechaDMYFromTimestampCell(cols[0]);
    if (fd) fechas.push(fd);
    var dosisRaw = trimStr(cols[4]);
    var dia = extractDiaTratamiento(dosisRaw);
    if (dia == null) {
      dia = extractDiaTratamiento(lines[i]);
    }
    items.push({
      id: "med-" + Date.now().toString(36) + "-" + i + "-" + Math.random().toString(36).slice(2, 5),
      nombreRaw: trimStr(cols[2]),
      viaRaw: trimStr(cols[3]),
      dosisRaw,
      frecuenciaRaw: trimStr(cols[5]),
      suspendido: false,
      diaTratamiento: dia
    });
  }
  return { items, fechas, skipped };
}
function resolveFechaActualizacion(fechas, fallbackDMY) {
  var list = (fechas || []).filter(Boolean);
  if (!list.length) return trimStr(fallbackDMY) || "";
  var counts = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < list.length; i += 1) {
    var k = list[i];
    counts[k] = (counts[k] || 0) + 1;
  }
  var best = list[0];
  var bestN = 0;
  Object.keys(counts).forEach(function(k2) {
    if (counts[k2] > bestN) {
      bestN = counts[k2];
      best = k2;
    }
  });
  return best;
}
var ACCENT_FIRST_WORD = {
  LOSARTAN: "LOSART\xC1N",
  ONDANSETRON: "ONDANSETR\xD3N",
  SENOSIDOS: "SEN\xD3SIDOS"
};
var MAX_CUSTOM_TOKENS_PER_CAT = 400;
var MAX_CUSTOM_TOKEN_LEN = 120;
var MAX_CUSTOM_ACCENTS = 500;
var _catalogOverlay = {
  accents: {},
  soapTokens: { vasop: [], abx: [], analgesia: [], antihta: [] }
};
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeNombreForSoapClassify(nombreRaw) {
  var n = String(nombreRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  n = n.replace(/\bONDASETRON\b/g, "ONDANSETRON");
  return n;
}
function sanitizeAccentMap(raw) {
  var out = /* @__PURE__ */ Object.create(null);
  if (!raw || typeof raw !== "object") return out;
  var n = 0;
  for (var k in raw) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    if (n >= MAX_CUSTOM_ACCENTS) break;
    var key = String(k || "").trim().toUpperCase().replace(/\s+/g, " ");
    if (!key) continue;
    var val = String(raw[k] == null ? "" : raw[k]).trim();
    if (!val) continue;
    if (val.length > 80) val = val.slice(0, 80);
    out[key] = val;
    n += 1;
  }
  return out;
}
function sanitizeTokenList(arr) {
  if (!Array.isArray(arr)) return [];
  var out = [];
  var seen = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < arr.length && out.length < MAX_CUSTOM_TOKENS_PER_CAT; i += 1) {
    var t = String(arr[i] || "").trim();
    if (t.length > MAX_CUSTOM_TOKEN_LEN) t = t.slice(0, MAX_CUSTOM_TOKEN_LEN);
    if (!t) continue;
    var k = t.toUpperCase();
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(t);
  }
  return out;
}
function applyMedCatalogOverlay(raw) {
  var o = raw && typeof raw === "object" ? raw : {};
  var soap = o.soapTokens && typeof o.soapTokens === "object" ? o.soapTokens : {};
  _catalogOverlay = {
    accents: sanitizeAccentMap(o.accents),
    soapTokens: {
      vasop: sanitizeTokenList(soap.vasop),
      abx: sanitizeTokenList(soap.abx),
      analgesia: sanitizeTokenList(soap.analgesia),
      antihta: sanitizeTokenList(soap.antihta)
    }
  };
}
function overlayTokensMatch(nNorm, tokens) {
  if (!tokens || !tokens.length) return false;
  var parts = [];
  for (var i = 0; i < tokens.length; i += 1) {
    var x = normalizeNombreForSoapClassify(tokens[i]);
    if (x) parts.push(escapeRegExp(x));
  }
  if (!parts.length) return false;
  return new RegExp("\\b(" + parts.join("|") + ")\\b").test(nNorm);
}
function applyNombreAccents(n) {
  var table = Object.assign({}, ACCENT_FIRST_WORD, _catalogOverlay.accents);
  var u = n.toUpperCase();
  for (var k in table) {
    if (Object.prototype.hasOwnProperty.call(table, k) && u.indexOf(k) === 0) {
      return table[k] + n.slice(k.length);
    }
  }
  return n;
}
function normalizeSpacesPct(s) {
  return s.replace(/\s+/g, " ").replace(/(\d)\s+%/g, "$1%");
}
function stripListaMarkers(nombre) {
  return trimStr(
    nombre.replace(/\s*\(\+\*\)\s*$/i, "").replace(/\s*\(\*\)\s*$/i, "").replace(/\s*\(\+\*\)/gi, "").replace(/\s*\(\*\)/gi, "")
  );
}
function expandSolInyClause(n) {
  return n.replace(/\bSOL INY\s+(\d+(?:[.,]\d+)?)\s*ML\b/gi, function(_full, ml, _off, str) {
    var idx = arguments[arguments.length - 2];
    var before = str.slice(0, idx);
    if (/\b50\s*%/i.test(before) && String(ml).replace(",", ".") === "50") {
      return "SOLUCI\xD3N INYECTABLE 50 ML";
    }
    return "SOLUCI\xD3N INYECTABLE";
  }).replace(/\bSOL INY\b/gi, "SOLUCI\xD3N INYECTABLE");
}
function expandNombrePresentacion(nombre) {
  var n = normalizeSpacesPct(stripListaMarkers(nombre));
  n = expandSolInyClause(n);
  n = n.replace(/\bCOMPRIMIDO\b/gi, "TABLETA");
  n = n.replace(/\bCAPSULA\b/gi, "C\xC1PSULA");
  n = n.replace(/\bCAPSULAS\b/gi, "C\xC1PSULAS");
  n = n.replace(/\bJARABE\s+\d+\s*ML\b/gi, "JARABE");
  n = n.replace(/\bGEL\s+\d+\s*ML\b/gi, "GEL");
  var m = n.match(/^(POLIETILENGLICOL\s+3350)\s+POLVO\s+(\d+\s*G)\s*$/i);
  if (m) {
    return normalizeSpacesPct(m[1] + " " + m[2] + " POLVO");
  }
  return normalizeSpacesPct(n);
}
function normalizeVia(viaRaw) {
  var v = trimStr(viaRaw).toUpperCase();
  if (v === "VIA ORAL") return "V\xCDA ORAL";
  if (v === "VIA INTRAVENOSA") return "V\xCDA INTRAVENOSA";
  if (v === "VIA SUBCUTANEA") return "V\xCDA SUBCUT\xC1NEA";
  return viaRaw;
}
function verbForVia(viaNorm) {
  if (viaNorm === "V\xCDA ORAL") return "TOMAR";
  if (viaNorm === "V\xCDA SUBCUT\xC1NEA") return "APLICAR";
  return "ADMINISTRAR";
}
function normalizeFrecuencia(fr) {
  var t = trimStr(fr);
  t = t.replace(/\bHRS\b/gi, "HORAS");
  t = t.replace(/\bHR\b/gi, "HORA");
  return t;
}
function dosisBeforeSlash(dosisRaw) {
  var t = trimStr(dosisRaw);
  var idx = t.indexOf("//");
  var left = idx === -1 ? t : t.slice(0, idx);
  return stripDiaMarkersFromDosis(left);
}
function expandSmashedInfusionDosis(s) {
  return String(s || "").replace(/DILUIREN/gi, " DILUIREN ").replace(/DILUIR\s*EN/gi, " DILUIR EN ").replace(/VEL\.?\s*INF\.?/gi, " VEL.INF ").replace(/(MCG|MG|G|ML|UI)(?=\/)/gi, "$1 ").replace(/(MCG|MG|G|ML|UI)(?=[A-Z])/gi, "$1 ").replace(/(CC)(?=\/)/gi, "$1 ").replace(/(CC)(?=\d)/gi, "$1 ").replace(/\s+/g, " ").trim();
}
function dosisForInfusionParse(dosisRaw) {
  var raw = trimStr(dosisRaw);
  if (!raw) return "";
  var left = dosisBeforeSlash(raw);
  var after = raw.indexOf("//") === -1 ? "" : stripDiaMarkersFromDosis(raw.slice(raw.indexOf("//") + 2));
  return normalizeSpacesPct(expandSmashedInfusionDosis(left + " " + after)).toUpperCase();
}
function extractVelInfSegment(dosisParsed) {
  var m = String(dosisParsed || "").match(/VEL\.INF\s*:\s*(.+)$/i);
  return m ? trimStr(m[1]) : "";
}
function extractBolusBeforeDilution(dosisLeft) {
  var t = normalizeSpacesPct(expandSmashedInfusionDosis(dosisLeft)).toUpperCase();
  var cut = t.split(/\bDILUIREN\b|\bDILUIR\s+EN\b/i)[0];
  cut = trimStr(cut.replace(/\bVEL\.INF\b.*$/i, ""));
  var amount = cut.match(
    /(\d+(?:[.,]\d+)?)\s*(MCG\/(?:MIN|HORA|H)|MG\/(?:MIN|HORA|H)|MCG|MG|G|ML|UI|U)\b/i
  );
  return amount ? trimStr(amount[1] + " " + amount[2]).replace(/\s+/g, " ") : cut;
}
function compactRecetaDoseToken(dosePhrase) {
  var t = trimStr(dosePhrase).toUpperCase().replace(/\s+/g, " ");
  var rate = t.match(
    /^(\d+(?:[.,]\d+)?)\s*(MCG\/(?:MIN|HORA|H)|MG\/(?:MIN|HORA|H)|CC\/(?:HORA|H))$/i
  );
  if (rate) {
    return String(rate[1]).replace(",", ".") + " " + rate[2].replace(/\s+/g, "");
  }
  var grams = t.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);
  if (grams) return String(grams[1]).replace(",", ".") + " G";
  return t.replace(/(\d(?:[.,]\d+)?)\s*(MG|G|ML|MCG|UI|U)\b/gi, function(_m, n, u) {
    return String(n).replace(",", ".") + String(u).toUpperCase();
  }).replace(/\s+/g, "");
}
function extractRecetaNameOnlyDose(dosisRaw) {
  var parsed = dosisForInfusionParse(dosisRaw);
  if (!parsed) return "";
  var vel = extractVelInfSegment(parsed);
  if (vel) {
    var mcgMin = vel.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
    if (mcgMin) return compactRecetaDoseToken(mcgMin[1] + " MCG/MIN");
    var mcgHr = vel.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
    if (mcgHr) return compactRecetaDoseToken(mcgHr[1] + " MCG/HORA");
    var mgHr = vel.match(/(\d+(?:[.,]\d+)?)\s*MG\s*\/\s*(?:HORA|H)\b/i);
    if (mgHr) return compactRecetaDoseToken(mgHr[1] + " MG/HORA");
    var ccHr = vel.match(/(\d+(?:[.,]\d+)?)\s*CC\s*\/\s*(?:HORA|H)\b/i);
    if (ccHr) {
      var bolusMcg = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
      if (/\bMCG\b/i.test(bolusMcg) && !/\bMG\b/i.test(bolusMcg.replace(/\bMCG\b/gi, ""))) {
        return compactRecetaDoseToken(ccHr[1] + " MCG/HORA");
      }
      return compactRecetaDoseToken(ccHr[1] + " CC/HORA");
    }
    if (/^\d+(?:[.,]\d+)?\s*HORAS?\b/i.test(vel)) {
      var bolusTimed = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
      if (bolusTimed) return compactRecetaDoseToken(bolusTimed);
    }
  }
  var anywhereMcgMin = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*MIN\b/i);
  if (anywhereMcgMin) return compactRecetaDoseToken(anywhereMcgMin[1] + " MCG/MIN");
  var anywhereMcgHr = parsed.match(/(\d+(?:[.,]\d+)?)\s*MCG\s*\/\s*(?:HORA|H)\b/i);
  if (anywhereMcgHr) return compactRecetaDoseToken(anywhereMcgHr[1] + " MCG/HORA");
  var bolus = extractBolusBeforeDilution(dosisBeforeSlash(dosisRaw));
  if (bolus) return compactRecetaDoseToken(bolus);
  return compactRecetaDoseToken(dosisBeforeSlash(dosisRaw));
}
function isPrnItem(item) {
  var f = trimStr(item.frecuenciaRaw).toUpperCase();
  if (f === "PRN") return true;
  return /CRITERIO\s+PRN/i.test(item.dosisRaw || "");
}
function extractPrnTail(dosisRaw) {
  var t = trimStr(dosisRaw);
  var m = t.match(/CRITERIO\s+PRN:\s*(.+)$/i);
  return m ? trimStr(m[1]) : "";
}
function polishHypoPrnCriterion(crit) {
  var c = normalizeFrecuencia(trimStr(crit));
  c = c.replace(/\bHIPOGLUCEMIA\s*<\s*70\b/gi, "HIPOGLUCEMIA <70 MG/DL");
  if (!/SEG[ÚU]N\s+REQUERIMIENTO/i.test(c)) {
    c = trimStr(c) + " SEG\xDAN REQUERIMIENTO";
  }
  return c;
}
function extractCadaHorasFromCrit(crit) {
  var m = String(crit || "").match(/CADA\s+(\d+)\s*H(?:RS|ORAS)?/i);
  return m ? "CADA " + m[1] + " HORAS" : "";
}
function instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido) {
  var verb = verbForVia(viaNorm);
  var nUp = nombreExpandido.toUpperCase();
  var isTab = /\bTABLETA\b/i.test(nombreExpandido);
  var isCap = /\bCÁPSULA\b/i.test(nombreExpandido);
  var mMg = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*MG$/i);
  var mMl = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*ML$/i);
  var mG = dosisPrincipal.match(/^(\d+(?:[.,]\d+)?)\s*G$/i);
  if (mG && verb !== "TOMAR") {
    return verb + " " + mG[1].replace(",", ".") + " G";
  }
  if (verb === "TOMAR" && isTab && mMg) {
    return "TOMAR 1 TABLETA (" + mMg[1].replace(",", ".") + " MG)";
  }
  if (verb === "TOMAR" && isCap && mMg) {
    return "TOMAR 1 C\xC1PSULA (" + mMg[1].replace(",", ".") + " MG)";
  }
  if (verb === "TOMAR" && isTab && mG) {
    return "TOMAR 1 TABLETA (" + mG[1].replace(",", ".") + " G)";
  }
  if (verb === "TOMAR" && mMl) {
    return "TOMAR " + mMl[1].replace(",", ".") + " ML";
  }
  if (verb === "TOMAR" && mG) {
    return "TOMAR " + mG[1].replace(",", ".") + " G";
  }
  if (mMg) {
    return verb + " " + mMg[1].replace(",", ".") + " MG";
  }
  if (mMl) {
    return verb + " " + mMl[1].replace(",", ".") + " ML";
  }
  return verb + " " + dosisPrincipal;
}
function formatMedicationEgresoLine(item) {
  var viaNorm = normalizeVia(item.viaRaw);
  var nombreExpandido = applyNombreAccents(expandNombrePresentacion(item.nombreRaw));
  var dosisPrincipal = dosisBeforeSlash(item.dosisRaw);
  var freqNorm = normalizeFrecuencia(item.frecuenciaRaw);
  var prn = isPrnItem(item);
  if (prn) {
    var critRaw = extractPrnTail(item.dosisRaw);
    if (!critRaw) critRaw = freqNorm;
    if (/HIPOGLUCEMIA/i.test(critRaw)) {
      var hypo = polishHypoPrnCriterion(critRaw);
      return nombreExpandido + " || ADMINISTRAR " + dosisPrincipal + " " + viaNorm + " " + hypo + ".";
    }
    if (/(NAUSEA|NÁUSEA|NAUSEAS|NÁUSEAS)/i.test(critRaw) && /VÓMITO|VOMITO/i.test(critRaw)) {
      var cadaN = extractCadaHorasFromCrit(critRaw) || normalizeFrecuencia("CADA 8 HORAS");
      return nombreExpandido + " || ADMINISTRAR " + dosisPrincipal + " " + viaNorm + " " + cadaN + " EN CASO DE N\xC1USEA O V\xD3MITO.";
    }
    var startFallback = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
    return nombreExpandido + " || " + startFallback + " " + normalizeFrecuencia(critRaw) + ".";
  }
  var instr = instructionAmountPhrase(item, viaNorm, dosisPrincipal, nombreExpandido);
  var mid = instr + " " + viaNorm + " " + freqNorm;
  if (item.diaTratamiento != null) {
    return nombreExpandido + " || " + mid + " (D\xCDA " + item.diaTratamiento + " DE TRATAMIENTO).";
  }
  return nombreExpandido + " || " + mid + ", SIN SUSPENDER HASTA NUEVO AVISO.";
}
function buildMedRecetaCopyText(items) {
  var list = (items || []).filter(function(it) {
    return it && !it.suspendido;
  });
  var lines = list.map(function(it) {
    return formatMedicationEgresoLine(it);
  });
  return lines.join("\n\n");
}
function buildMedRecetaNameOnlyText(items) {
  var list = (items || []).filter(function(it) {
    return it && !it.suspendido;
  });
  function viaShort(viaNorm) {
    if (viaNorm === "V\xCDA INTRAVENOSA") return "IV";
    if (viaNorm === "V\xCDA ORAL") return "VO";
    if (viaNorm === "V\xCDA SUBCUT\xC1NEA") return "SC";
    return trimStr(viaNorm).toUpperCase();
  }
  function freqShort(freqNorm) {
    var t = trimStr(freqNorm).toUpperCase();
    var m = t.match(/^CADA\s+(\d+)\s+H(?:ORA|ORAS)$/);
    if (m) return "C/" + m[1] + "H";
    return t;
  }
  function compactName(nombreExpandido) {
    var n = trimStr(nombreExpandido).toUpperCase();
    var trimmed = trimStr(n.replace(/\s+\d.*$/, ""));
    return trimmed || n;
  }
  var lines = list.map(function(it) {
    var nombre = compactName(applyNombreAccents(expandNombrePresentacion(it.nombreRaw)));
    var via = normalizeVia(it.viaRaw);
    var freq = normalizeFrecuencia(it.frecuenciaRaw);
    var parts = [nombre];
    var dosisCompact = extractRecetaNameOnlyDose(it.dosisRaw);
    if (dosisCompact) parts.push(dosisCompact);
    if (via) parts.push(viaShort(via));
    if (freq) parts.push(freqShort(freq));
    if (it.diaTratamiento != null) parts.push("DIA " + it.diaTratamiento);
    var line = parts.join(" ");
    return line;
  });
  return lines.join("\n");
}
function classifyMedicationSoapCategory(nombreRaw) {
  var n = normalizeNombreForSoapClassify(nombreRaw);
  var o = _catalogOverlay.soapTokens;
  if (overlayTokensMatch(n, o.vasop)) return "vasop";
  if (overlayTokensMatch(n, o.abx)) return "abx";
  if (overlayTokensMatch(n, o.analgesia)) return "analgesia";
  if (overlayTokensMatch(n, o.antihta)) return "antihta";
  if (/\b(NORADRENALINA|NOREPINEFRINA|EPINEFRINA|ADRENALINA|DOPAMINA|DOBUTAMINA|VASOPRESINA|TERLIPRESINA|FENILEFRINA|MILRINONA|DOPEXAMINA)\b/.test(
    n
  )) {
    return "vasop";
  }
  if (/\b(ERTAPENEM|MEROPENEM|IMIPENEM|CEFTRIAX|CEFEPIME|CEFTAZID|CEFOXIT|CEFUROXI|CEFOTAX|CEFTAROL|CEFACLOR|CEFAZOLINA|PIPERACILINA|TAZOBACTAM|VANCOMICINA|TEICOPLANINA|DALBAVANCINA|ORITAVANCINA|TIGECICLINA|AMIKACINA|GENTAMICINA|TOBRAMICINA|PLAZOMICINA|LEVOFLOX|CIPROFLOX|MOXIFLOX|DELAFLOX|OFLOXACINO|NORFLOXACINO|METRONIDAZOL|LINEZOLID|DAPTOMICINA|AZTREONAM|COLISTINA|POLIMIXINA|CLINDAMICINA|AZITROMICINA|CLARITROMICINA|ERITROMICINA|DOXICICLINA|MINOCICLINA|FOSFOMICINA|NITROFURANTOINA|RIFAMPICINA|RIFAXIMINA|AMPICILINA|SULBACTAM|AMOXICILINA|BENZILPENICILINA|FLUCLOXACIL|PENICILINA|TRIMETOPRIM|SULFAMETOXAZOL|BACTRIM|COTRIMOX|FLUCONAZOL|VORICONAZOL|ITRACONAZOL|POSACONAZOL|ISAVUCONAZOL|ANIDULAFUNGINA|MICAFUNGINA|CASPOFUNGINA|AMFOTERICINA|ACICLOVIR|VALACICLOVIR|GANCICLOVIR|FOSCARNET|OSELTAMIVIR|REMDESIVIR|REM\s*DESIVIR)\b/.test(
    n
  )) {
    return "abx";
  }
  if (/\b(PARACETAMOL|ACETAMINOFEN|METAMIZOL|DIPIRONA|KETOROLAC|MORFINA|TRAMADOL|IBUPROFENO|NAPROXENO|DICLOFENACO|ACETILSALICILICO|ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA|BUPRENORFINA|FENTANILO|REMIFENTANILO|SUFENTANILO|HIDROMORFONA|OXICODONA|NALBUFINA|PENTAZOCINA|TAPENTADOL)\b/.test(
    n
  )) {
    return "analgesia";
  }
  if (/\b(LOSARTAN|IRBESARTAN|VALSARTAN|TELMISARTAN|OLMESARTAN|CANDESARTAN|ENALAPRIL|LISINOPRIL|RAMIPRIL|CAPTOPRIL|AMLODIPINO|NIFEDIPINO|FELODIPINO|LERCANIDIPINO|CARVEDILOL|METOPROLOL|BISOPROLOL|NEBIVOLOL|PROPRANOLOL|ATENOLOL|LABETALOL|ESMOLOL|SOTALOL|HIDROCLOROTIAZ|CLORTALIDONA|INDAPAMIDA|FUROSEMIDA|TORASEMIDA|BUMETANIDA|ESPIRONOLACTONA|EPLERENONA|CLONIDINA|HIDRALAZINA|MINOXIDIL|NICARDIPINO|CLEVUDIPINO|DILTIAZEM|VERAPAMILO)\b/.test(
    n
  )) {
    return "antihta";
  }
  if (/\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|ASPARTA|LISPRO|GLULISINA|NPH|METFORMINA|REPAGLINIDA|GLIBENCLAMINA|GLIMEPIRIDA|PIOGLITAZON|EMPAGLIFLOZINA|DAPAGLIFLOZINA|SITAGLIPTINA|OMEPRAZOL|PANTOPRAZOL|ESOMEPRAZOL|LANSOPRAZOL|RABEPRAZOL|DEXAMETASONA|BETAMETASONA|HIDROCORTISONA|METILPREDNISOLONA|PREDNISON|PREDNISOLONA|ENOXAPARINA|HEPARINA|DALTEPARINA|TINZAPARINA|APIXABAN|RIVAROXABAN|EDOXABAN|DABIGATRAN|WARFARINA|ACENOCUMAROL|LEVOTIROXINA|LIOTIRONINA|ATORVASTATINA|ROSUVASTATINA|PRAVASTATINA|SINVASTATINA|SALBUTAMOL|LEVOSALBUTAMOL|TERBUTALINA|BUDESONIDA|BECLOMETASONA|FLUTICASONA|TIOTROPIO|IPRATROPIO|FOLICO|CIANOCOBALAMINA|FERROSO|CLORURO\s+DE\s+POTASIO|SULFATO\s+DE\s+MAGNESIO|LACTULOSA|BISACODILO|SENOSIDOS|PROPOFOL|MIDAZOLAM|LORAZEPAM|DIAZEPAM|CLONAZEPAM|HALOPERIDOL|QUETIAPINA|OLANZAPINA|LEVETIRACETAM|FENITOINA|CARBAMAZEPINA|VALPROATO|GABAPENTINA|PREGABALINA|DONEPECILO|MEMANTINA|BROMOCRIPTINA|FINASTERIDA|TAMSULOSINA|SOLIFENACINA|OXYBUTININA|NITROGLICERINA|ISOSORBIDE)\b/.test(
    n
  )) {
    return "otros";
  }
  return "otros";
}

// public/js/med-pharm-some-catalog.mjs
var MAX_TOKENS_PER_CAT = 400;
var MAX_TOKEN_LEN = 64;
var SOME_PHARM_FILTER_ORDER = [
  "AGONISTA ALFA/BETA",
  "ANALG\xC9SICO",
  "ANALG\xC9SICO ANTIPIR\xC9TICO/ANTIINFLAMATORIC",
  "ANEST\xC9SICO",
  "ANTIARR\xCDTMICO",
  "ANTIASM\xC1TICO",
  "ANTIBI\xD3TICO",
  "ANTICOAGULANTE",
  "ANTICONVULSIVO",
  "ANTIDIAB\xC9TICO",
  "ANTIINFLAMATORIO ESTEROIDEO",
  "ANTILIP\xC9MICO",
  "ANTIULCEROSO",
  "BRONCODILATADOR",
  "CORTICOSTEROIDE",
  "DIUR\xC9TICO",
  "LAXANTE",
  "RELAJANTE MUSCULAR PERIF\xC9RICO",
  "SEDANTE",
  "SUEROS",
  "SUPLEMENTO",
  "SUPLEMENTO ELECTROL\xCDTICO",
  "OTROS"
];
var BUILTIN_TOKENS = {
  "AGONISTA ALFA/BETA": [
    "NORADRENALINA",
    "NOREPINEFRINA",
    "EPINEFRINA",
    "DOPAMINA",
    "DOBUTAMINA",
    "VASOPRESINA",
    "FENILEFRINA",
    "FENILEFRIN"
  ],
  "ANALG\xC9SICO": ["METAMIZOL", "MORFINA", "TRAMADOL", "FENTANILO", "REMIFENTANILO"],
  "ANALG\xC9SICO ANTIPIR\xC9TICO/ANTIINFLAMATORIC": ["PARACETAMOL", "KETOROLAC", "IBUPROFENO", "DICLOFENACO"],
  ANEST\u00C9SICO: ["PROPOFOL", "KETAMINA", "LIDOCAINA", "BUPIVACAINA"],
  ANTIARR\u00CDTMICO: ["AMIODARONA", "LIDOCAINA", "METOPROLOL"],
  ANTIASM\u00C1TICO: ["SALBUTAMOL", "IPRATROPIO", "TIOTROPIO", "MONTELUKAST"],
  "ANTIBI\xD3TICO": [
    "ERTAPENEM",
    "CEFALOTINA",
    "CEFTRIAX",
    "CEFEPIME",
    "MEROPENEM",
    "VANCOMICINA",
    "PIPERACILINA",
    "TAZOBACTAM",
    "METRONIDAZOL",
    "LINEZOLID",
    "AZITROMICINA",
    "LEVOFLOX",
    "CIPROFLOX",
    "AMIKACINA",
    "GENTAMICINA",
    "AMPICILINA",
    "FLUCONAZOL"
  ],
  ANTICOAGULANTE: ["ENOXAPARINA", "HEPARINA", "APIXABAN", "RIVAROXABAN", "WARFARINA"],
  ANTICONVULSIVO: ["LEVETIRACETAM", "FENITOINA", "VALPROATO", "CARBAMAZEPINA"],
  "ANTIDIAB\xC9TICO": ["INSULINA", "METFORMINA", "GLARGINA"],
  "ANTIINFLAMATORIO ESTEROIDEO": ["METILPREDNISOLONA", "HIDROCORTISONA"],
  "ANTILIP\xC9MICO": ["ATORVASTATINA", "ROSUVASTATINA", "SINVASTATINA"],
  ANTIULCEROSO: ["OMEPRAZOL", "PANTOPRAZOL", "ESOMEPRAZOL", "RANITIDINA"],
  BRONCODILATADOR: ["SALBUTAMOL", "IPRATROPIO", "TIOTROPIO", "TERBUTALINA"],
  CORTICOSTEROIDE: ["BUDESONIDA", "DEXAMETASONA", "HIDROCORTISONA", "METILPREDNISOLONA"],
  DIUR\u00C9TICO: ["FUROSEMIDA", "ESPIRONOLACTONA", "MANITOL", "TORASEMIDA"],
  LAXANTE: ["LACTULOSA", "POLIETILENGLICOL", "BISACODILO", "SENOSIDO"],
  "RELAJANTE MUSCULAR PERIF\xC9RICO": ["CISATRACURIO", "ROCURONIO", "VECURONIO", "PANCURONIO"],
  SEDANTE: ["DEXMEDETOMIDINA", "PROPOFOL", "MIDAZOLAM"],
  SUEROS: [
    "CLORURO DE SODIO",
    "SOLUCION SALINA",
    "DEXTROSA",
    "LACTATO",
    "RINGER",
    "CLORURO DE POTASIO",
    "SULFATO DE MAGNESIO",
    "SOLUCION GLUCOSADA"
  ],
  SUPLEMENTO: ["MULTIVITAMINICO", "VITAMINA", "ZINC", "HIERRO"],
  "SUPLEMENTO ELECTROL\xCDTICO": ["POTASIO", "MAGNESIO", "FOSFORO", "CALCIO GLUCONATO"]
};
var _overlayTokens = null;
function normName(nombreRaw) {
  return String(nombreRaw || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
function escapeRegExp2(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sanitizeTokenList2(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < arr.length && out.length < MAX_TOKENS_PER_CAT; i += 1) {
    let t = String(arr[i] || "").trim();
    if (t.length > MAX_TOKEN_LEN) t = t.slice(0, MAX_TOKEN_LEN);
    if (!t) continue;
    const k = t.toUpperCase();
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(t);
  }
  return out;
}
function sanitizeSomePharmCatalog(raw) {
  const tokens = /* @__PURE__ */ Object.create(null);
  if (!raw || typeof raw !== "object") return { tokens };
  const src = raw.tokens && typeof raw.tokens === "object" ? raw.tokens : raw;
  SOME_PHARM_FILTER_ORDER.forEach(function(cat) {
    if (cat === "OTROS") return;
    if (Array.isArray(src[cat])) tokens[cat] = sanitizeTokenList2(src[cat]);
  });
  return { tokens };
}
function tokensForCategory(cat) {
  const custom = _overlayTokens && _overlayTokens[cat];
  if (custom && custom.length) return custom;
  return BUILTIN_TOKENS[cat] || [];
}
function tokensMatch(nNorm, tokens) {
  if (!tokens.length) return false;
  const parts = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const x = normName(tokens[i]);
    if (x) parts.push(escapeRegExp2(x));
  }
  if (!parts.length) return false;
  return new RegExp("\\b(" + parts.join("|") + ")\\b").test(nNorm);
}
function applySomePharmCatalogOverlay(catalogFromStorage) {
  const block = catalogFromStorage && catalogFromStorage.somePharm ? catalogFromStorage.somePharm : catalogFromStorage;
  _overlayTokens = sanitizeSomePharmCatalog(block).tokens;
}
function listSomePharmFilterLabels() {
  return ["TODOS"].concat(SOME_PHARM_FILTER_ORDER);
}
function isSomePharmCategoryLabel(cat) {
  return SOME_PHARM_FILTER_ORDER.indexOf(String(cat || "")) >= 0;
}
function classifySomePharmCategory(nombreRaw) {
  const n = normName(nombreRaw);
  if (!n) return "OTROS";
  for (let i = 0; i < SOME_PHARM_FILTER_ORDER.length; i += 1) {
    const cat = SOME_PHARM_FILTER_ORDER[i];
    if (cat === "OTROS") break;
    if (tokensMatch(n, tokensForCategory(cat))) return cat;
  }
  return "OTROS";
}
function rowSomePharmCategory(row) {
  if (!row) return "OTROS";
  if (row.catOverride) return String(row.catOverride);
  if (row.cat) return String(row.cat);
  return classifySomePharmCategory(row.med);
}
function assignSomePharmCategory(row) {
  if (!row) return row;
  const next = Object.assign({}, row);
  if (!next.catOverride) next.cat = classifySomePharmCategory(next.med);
  return next;
}
function assignSomePharmCategories(rows) {
  return (rows || []).map(assignSomePharmCategory);
}

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

// public/js/features/estado-actual-io.mjs
function toEaSalidaText(raw) {
  if (raw == null || raw === "") return "";
  return String(raw).toUpperCase();
}
function formatBalanceLive(bal) {
  if (!Number.isFinite(bal)) return "\u2014";
  return (bal > 0 ? "+" : "") + bal + " CC";
}
function parseIoIngresoField(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  return parseIoNumber(s);
}
function parseIoNumber(raw) {
  if (raw == null) return null;
  var s = String(raw).trim().replace(/\s/g, "").replace(/,/g, "");
  if (!s) return null;
  var n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function isIoNumericValue(v) {
  if (v == null || v === "") return false;
  if (v === "NC" || String(v).toUpperCase() === "NC") return false;
  var n = Number(v);
  return Number.isFinite(n);
}
function normalizeEvacAbbrev(val) {
  if (val == null || val === "") return val;
  var s = String(val).trim();
  if (/^nc$/i.test(s)) return "NC";
  if (/no\s+reportad|sin\s+evacuacion|sin\s+evac\b|no\s+hubo\s+evac/i.test(s)) return "NC";
  return val;
}
function parseIoEvacField(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return null;
  var abbrev = normalizeEvacAbbrev(s);
  if (abbrev === "NC") return "NC";
  if (/sin\s+evacuaciones/i.test(s)) return toEaSalidaText(s);
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  var n2 = parseIoNumber(s);
  if (n2 != null) return n2;
  return s.toUpperCase();
}
function normalizeIoNcAbbrev(val) {
  if (val == null || val === "") return val;
  if (val === "NC" || String(val).toUpperCase() === "NC") return "NC";
  if (typeof val === "string" && /no\s+cuantificad/i.test(val)) return "NC";
  return val;
}
function parseSegmentValue(seg) {
  var s = String(seg || "").trim();
  if (/^nc$/i.test(s)) return "NC";
  if (/no\s+cuantificad/i.test(s)) return "NC";
  var numMatch = s.match(/([\d.,]+)\s*(?:CC|ML)?\b/i);
  if (numMatch) {
    var n = parseIoNumber(numMatch[1]);
    if (n != null) return n;
  }
  var n2 = parseIoNumber(s);
  if (n2 != null) return n2;
  return s.toUpperCase();
}
function splitIoSegments(text) {
  var s = String(text || "").trim();
  if (!s) return [];
  var tokens = [];
  var buf = "";
  var depth = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch === "(") {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      continue;
    }
    if ((ch === "," || ch === ";") && depth === 0) {
      if (buf.trim()) tokens.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) tokens.push(buf.trim());
  return tokens;
}
function classifyEgresoSegment(seg) {
  var s = String(seg || "").trim();
  var u = s.toUpperCase();
  if (/^NC$/i.test(s) || /^no\s+cuantificad/i.test(s)) {
    return { kind: "diuresis", label: "DIURESIS", value: "NC" };
  }
  if (/^DIURESIS\b/i.test(s) || /^ORINA\b/i.test(s)) {
    var rest = s.replace(/^(?:DIURESIS|ORINA)\s*/i, "").trim();
    if (!rest || /no\s+cuantificad/i.test(rest)) {
      return { kind: "diuresis", label: "DIURESIS", value: rest ? parseSegmentValue(rest) : "NC" };
    }
    return { kind: "diuresis", label: "DIURESIS", value: parseSegmentValue(rest) };
  }
  if (/DRENAJ/i.test(u)) {
    var dRest = s.replace(/^DRENAJ(?:E|ES)?\s*/i, "").trim();
    return { kind: "drain", label: "DRENAJE", value: parseSegmentValue(dRest || s) };
  }
  if (/GASTROSTOM/i.test(u)) {
    var gRest = s.replace(/^GASTROSTOM(?:ÍA|IA)?\s*/i, "").trim();
    return { kind: "gastrostomy", label: "GASTROSTOM\xCDA", value: parseSegmentValue(gRest || s) };
  }
  if (/NEFRO/i.test(u)) {
    var side = "";
    if (/IZQ|IZQUIERDA/i.test(u)) side = "IZQUIERDA";
    else if (/\bDER\b|DERECHA/i.test(u)) side = "DERECHA";
    var nRest = s.replace(/^NEFRO(?:STOM(?:ÍA|IA))?/i, "").trim();
    nRest = nRest.replace(/\b(IZQ|IZQUIERDA|DER|DERECHA)\b/gi, "").trim();
    var label = side ? "NEFROSTOM\xCDA " + side : "NEFROSTOM\xCDA";
    return { kind: "nephro", label, value: parseSegmentValue(nRest || s) };
  }
  var n = parseIoNumber(s);
  if (n != null) return { kind: "diuresis", label: "DIURESIS", value: n };
  if (/no\s+cuantificad/i.test(s)) {
    return { kind: "diuresis", label: "DIURESIS", value: "NC" };
  }
  return { kind: "diuresis", label: "DIURESIS", value: u };
}
function parseIoEgresoLine(raw) {
  var s = String(raw == null ? "" : raw).trim();
  if (!s) return [];
  var segments = splitIoSegments(s);
  if (!segments.length) segments = [s];
  return segments.map(classifyEgresoSegment);
}
function diuresisValueFromParts(parts) {
  if (!Array.isArray(parts)) return null;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p && p.kind === "diuresis") return p.value;
  }
  return null;
}
function sumNumericEgressFromParts(parts) {
  if (!Array.isArray(parts)) return 0;
  var sum = 0;
  var any = false;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (!p) continue;
    if (isIoNumericValue(p.value)) {
      sum += Number(p.value);
      any = true;
    }
  }
  return any ? sum : 0;
}
function ioNumericEgressTotal(io) {
  if (!io || typeof io !== "object") return null;
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) {
    var sum = sumNumericEgressFromParts(o.egrParts);
    return sum > 0 ? sum : null;
  }
  if (isIoNumericValue(o.egr)) return Number(o.egr);
  return null;
}
function ioDiuresisForBalance(io) {
  if (!io || typeof io !== "object") return null;
  var o = io;
  if (Array.isArray(o.egrParts) && o.egrParts.length) {
    return diuresisValueFromParts(o.egrParts);
  }
  return o.egr != null && o.egr !== "" ? o.egr : null;
}
function computeIoBalanceFromIngEgr(ing, io) {
  if (!isIoNumericValue(ing)) return NaN;
  var egrTotal = ioNumericEgressTotal(io);
  if (egrTotal == null) return NaN;
  return Number(ing) - egrTotal;
}
function formatEgresoPartForText(part) {
  if (!part) return "";
  var val = normalizeIoNcAbbrev(part.value);
  var valStr = val === "NC" ? "NC" : isIoNumericValue(val) ? String(val) + " CC" : String(val).toUpperCase();
  return part.label.toUpperCase() + " " + valStr;
}
function serializeEgrPartsToFormText(parts) {
  if (!Array.isArray(parts) || !parts.length) return "";
  return parts.map(formatEgresoPartForText).join(", ");
}
function legacyEgrToParts(egrLegacy) {
  if (egrLegacy == null || egrLegacy === "") return [];
  return parseIoEgresoLine(String(egrLegacy));
}
function formatEvacForText(evac) {
  if (evac == null || evac === "") return "___";
  var norm = normalizeEvacAbbrev(evac);
  if (norm === "NC" || String(norm).toUpperCase() === "NC") return "NC";
  if (isIoNumericValue(evac)) return String(evac) + " CC";
  return String(evac).toUpperCase();
}
function formatIoClauseForSoap(io, balanceTurno2) {
  io = io || {};
  var clauses = ["INGRESOS " + (io.ing != null && io.ing !== "" ? String(io.ing) : "___") + " CC"];
  var parts = Array.isArray(io.egrParts) && io.egrParts.length ? io.egrParts : legacyEgrToParts(io.egr);
  if (parts.length) {
    for (var i = 0; i < parts.length; i++) {
      clauses.push(formatEgresoPartForText(parts[i]));
    }
  } else if (io.egr != null && io.egr !== "") {
    var egrNorm = normalizeIoNcAbbrev(io.egr);
    if (isIoNumericValue(egrNorm)) {
      clauses.push("DIURESIS " + String(egrNorm) + " CC");
    } else if (egrNorm === "NC") {
      clauses.push("DIURESIS NC");
    } else {
      clauses.push(String(egrNorm).toUpperCase());
    }
  } else {
    clauses.push("DIURESIS ___");
  }
  if (io.evac != null && io.evac !== "") {
    clauses.push("EVACUACIONES " + formatEvacForText(io.evac));
  }
  var balance = balanceTurno2 != null && balanceTurno2 !== "" && Number.isFinite(Number(balanceTurno2)) ? (Number(balanceTurno2) > 0 ? "+" : "") + balanceTurno2 : "___";
  clauses.push("BALANCE " + balance + " CC");
  return clauses.join(", ");
}

// public/js/features/estado-actual-vital-extras.mjs
var VITAL_BASE_KEYS = ["tas", "tad", "fc", "fr", "temp", "sat"];
function getVitalExtraStorageKey(baseKey) {
  return baseKey === "temp" ? "tempPeak" : baseKey + "Extra";
}

// public/js/features/estado-actual-registro-defaults.mjs
function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function getDefaultRegistroRecordedAt(now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  return startOfLocalDay(ref);
}
function getGlucometriaRegistroWindow(now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  var end = startOfLocalDay(ref);
  var start = new Date(end);
  start.setDate(start.getDate() - 1);
  start.setHours(8, 0, 0, 0);
  return { start, end };
}
function parseRecordedAt(iso) {
  if (!iso) return null;
  var d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
function gluPointMs(recordedAt, timeHm) {
  var base = parseRecordedAt(recordedAt);
  if (!base) return 0;
  if (!timeHm || !String(timeHm).trim()) return base.getTime();
  var parts = String(timeHm).trim().split(":");
  var h = Number(parts[0]);
  var m = Number(parts[1] != null ? parts[1] : 0);
  if (!Number.isFinite(h)) return base.getTime();
  var d = new Date(base);
  d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
  return d.getTime();
}
function isGluPointInRegistroWindow(ms, now) {
  if (!ms) return false;
  var win = getGlucometriaRegistroWindow(now);
  return ms >= win.start.getTime() && ms <= win.end.getTime();
}
function collectGlucometriasForRegistroWindow(historial, now) {
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  var hist = Array.isArray(historial) ? historial : [];
  var out = [];
  var seen = /* @__PURE__ */ new Set();
  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== "object") continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : "";
    var glus = Array.isArray(row.glucometrias) ? row.glucometrias : [];
    for (var j = 0; j < glus.length; j++) {
      var g = glus[j];
      if (!g || typeof g !== "object") continue;
      var val = (
        /** @type {any} */
        g.value
      );
      if (val == null || val === "") continue;
      var time = (
        /** @type {any} */
        g.time != null ? String(
          /** @type {any} */
          g.time
        ) : ""
      );
      var ms = gluPointMs(recordedAt, time);
      if (!isGluPointInRegistroWindow(ms, ref)) continue;
      var key = String(val) + "@" + time;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: val, time });
    }
  }
  out.sort(function(a, b) {
    var ta = String(a.time || "");
    var tb = String(b.time || "");
    if (ta !== tb) return ta.localeCompare(tb);
    return String(a.value).localeCompare(String(b.value));
  });
  return out;
}

// public/js/features/estado-actual-vital-series.mjs
var MAX_VITAL_READINGS_PER_DAY = 4;
var MAX_VITAL_LAYERS_IN_FORM = 4;
function normalizeReading(raw) {
  if (!raw || typeof raw !== "object") return null;
  var val = Number(
    /** @type {any} */
    raw.value
  );
  if (!Number.isFinite(val)) return null;
  var time = (
    /** @type {any} */
    raw.time
  );
  return { value: val, time: time != null && String(time).length ? String(time) : void 0 };
}
function pushReading(list, item) {
  var key = item.value + "@" + (item.time || "");
  for (var i = 0; i < list.length; i++) {
    var k = list[i].value + "@" + (list[i].time || "");
    if (k === key) return;
  }
  list.push(item);
}
function vitalSeriesFromMedicion(medicion) {
  var out = {};
  if (!medicion || typeof medicion !== "object") return out;
  var m = medicion;
  var rawSeries = m.vitalSeries;
  if (rawSeries && typeof rawSeries === "object") {
    for (var sk = 0; sk < VITAL_BASE_KEYS.length; sk++) {
      var bk = VITAL_BASE_KEYS[sk];
      var arr = (
        /** @type {any} */
        rawSeries[bk]
      );
      if (!Array.isArray(arr)) continue;
      out[bk] = [];
      for (var ai = 0; ai < arr.length; ai++) {
        var norm = normalizeReading(arr[ai]);
        if (norm) pushReading(out[bk], norm);
      }
    }
  }
  var vit = m.vitals && typeof m.vitals === "object" ? (
    /** @type {any} */
    m.vitals
  ) : {};
  var alt = m.alteredAt && typeof m.alteredAt === "object" ? (
    /** @type {Record<string, string>} */
    m.alteredAt
  ) : {};
  for (var vi = 0; vi < VITAL_BASE_KEYS.length; vi++) {
    var key = VITAL_BASE_KEYS[vi];
    if (!out[key]) out[key] = [];
    if (vit[key] != null && vit[key] !== "") {
      pushReading(out[key], {
        value: Number(vit[key]),
        time: alt[key] ? String(alt[key]) : void 0
      });
    }
    var extraKey = getVitalExtraStorageKey(key);
    if (vit[extraKey] != null && vit[extraKey] !== "") {
      pushReading(out[key], {
        value: Number(vit[extraKey]),
        time: alt[extraKey] ? String(alt[extraKey]) : void 0
      });
    }
  }
  for (var ck = 0; ck < VITAL_BASE_KEYS.length; ck++) {
    var ckKey = VITAL_BASE_KEYS[ck];
    if (out[ckKey] && out[ckKey].length > MAX_VITAL_READINGS_PER_DAY) {
      out[ckKey] = out[ckKey].slice(-MAX_VITAL_READINGS_PER_DAY);
    }
  }
  return out;
}
function vitalSeriesToLegacyFields(series) {
  var vitals = {};
  var alteredAt = {};
  VITAL_BASE_KEYS.forEach(function(key) {
    vitals[key] = null;
    var list = series[key] || [];
    if (!list.length) return;
    var last = list[list.length - 1];
    vitals[key] = last.value;
    if (last.time) alteredAt[key] = last.time;
    if (list.length >= 2 && key === "temp") {
      var second = list[list.length - 2];
      vitals.tempPeak = second.value;
      if (second.time) alteredAt.tempPeak = second.time;
    } else if (list.length >= 2) {
      var sec = list[list.length - 2];
      vitals[getVitalExtraStorageKey(key)] = sec.value;
      if (sec.time) alteredAt[getVitalExtraStorageKey(key)] = sec.time;
    }
  });
  return { vitals, alteredAt };
}
function countVitalReadingsInRegistroWindow(historial, vitalKey, now) {
  var hist = Array.isArray(historial) ? historial : [];
  var all = [];
  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== "object") continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : "";
    var series = vitalSeriesFromMedicion(row);
    var list = series[vitalKey] || [];
    for (var j = 0; j < list.length; j++) {
      var rd = list[j];
      var ms = gluPointMs(recordedAt, rd.time || "");
      if (!isGluPointInRegistroWindow(ms, now)) continue;
      pushReading(all, rd);
    }
  }
  return all.length;
}
function collectBombaInsulinaForRegistroWindow(historial, now) {
  var hist = Array.isArray(historial) ? historial : [];
  var out = [];
  var seen = /* @__PURE__ */ new Set();
  for (var i = 0; i < hist.length; i++) {
    var row = hist[i];
    if (!row || typeof row !== "object") continue;
    var recordedAt = row.recordedAt != null ? String(row.recordedAt) : "";
    var entries = Array.isArray(row.bombaInsulina) ? row.bombaInsulina : [];
    for (var j = 0; j < entries.length; j++) {
      var e = entries[j];
      if (!e || typeof e !== "object") continue;
      var val = Number(
        /** @type {any} */
        e.value
      );
      var units = Number(
        /** @type {any} */
        e.units
      );
      if (!Number.isFinite(val)) continue;
      if (!Number.isFinite(units)) units = 0;
      var time = (
        /** @type {any} */
        e.time != null ? String(
          /** @type {any} */
          e.time
        ) : ""
      );
      var ms = gluPointMs(recordedAt, time);
      if (!isGluPointInRegistroWindow(ms, now)) continue;
      var key = val + "@" + units + "@" + time;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: val, units, time });
    }
  }
  out.sort(function(a, b) {
    return String(a.time || "").localeCompare(String(b.time || ""));
  });
  return out;
}

// public/js/features/estado-actual-data.mjs
var MED_FIELD_KEYS = (
  /** @type {const} */
  ["analgesia", "abx", "antihta", "vasop"]
);
function emptyEstadoClinico() {
  return {
    four: "",
    esferas: "",
    analgesia: "",
    abx: "",
    antihta: "",
    vasop: "",
    soporte: "",
    tempContext: "",
    dieta: "",
    kcalKg: "",
    kcal: "",
    pesoRef: ""
  };
}
function emptyPendienteReceta() {
  const o = {};
  for (var k of Object.keys(emptyEstadoClinico())) {
    o[k] = "";
  }
  return o;
}
function emptyMonitoreo() {
  var confirmado = {};
  for (var mk of MED_FIELD_KEYS) {
    confirmado[mk] = false;
  }
  return {
    estadoClinico: emptyEstadoClinico(),
    confirmado,
    pendienteReceta: emptyPendienteReceta(),
    historial: [],
    textoGuardado: { text: "", savedAt: null }
  };
}
var VITAL_KEYS = ["tas", "tad", "fc", "fr", "temp", "sat"];
function hasIoNumber(v) {
  return v != null && v !== "";
}
function isIoNumericValue2(v) {
  return isIoNumericValue(v);
}
function compareSavedAt(a, b) {
  if ((a == null || a === "") && (b == null || b === "")) return 0;
  if (a == null || a === "") return -1;
  if (b == null || b === "") return 1;
  return String(a).localeCompare(String(b));
}
function ensureMonitoreo(patient) {
  if (!patient || typeof patient !== "object") return patient;
  if (!/** @type {any} */
  patient.monitoreo) {
    patient.monitoreo = emptyMonitoreo();
  }
  return patient;
}
function migratePatientMonitoreo(patient) {
  if (!patient || typeof patient !== "object") return false;
  var p = patient;
  ensureMonitoreo(p);
  var leg = p.estadoActual;
  var hadLegacyKey = Object.prototype.hasOwnProperty.call(p, "estadoActual");
  if (!leg || typeof leg !== "object") {
    delete p.estadoActual;
    return hadLegacyKey;
  }
  var tg = p.monitoreo.textoGuardado;
  var legText = typeof leg.text === "string" ? leg.text : leg.text != null ? String(leg.text) : "";
  var legSaved = leg.savedAt != null ? String(leg.savedAt) : null;
  if (compareSavedAt(legSaved, tg.savedAt) > 0) {
    tg.text = legText;
    tg.savedAt = legSaved;
  } else if ((!tg.text || tg.text === "") && !(tg.savedAt != null && String(tg.savedAt).length > 0) && legText) {
    tg.text = legText;
    tg.savedAt = legSaved != null ? legSaved : tg.savedAt;
  }
  delete p.estadoActual;
  return true;
}
function mergePatientMonitoreoFromImported(target, source) {
  if (!target || typeof target !== "object") return false;
  if (!source || typeof source !== "object") return migratePatientMonitoreo(target);
  var s = source;
  var t = target;
  try {
    if ("monitoreo" in s && s.monitoreo != null && typeof s.monitoreo === "object") {
      t.monitoreo = JSON.parse(JSON.stringify(s.monitoreo));
    }
    if ("estadoActual" in s && s.estadoActual != null && typeof s.estadoActual === "object") {
      t.estadoActual = JSON.parse(JSON.stringify(s.estadoActual));
    }
  } catch (_e) {
  }
  return migratePatientMonitoreo(target);
}
function medicionHasCoreData(medicion) {
  if (!medicion || typeof medicion !== "object") return false;
  var m = medicion;
  var vit = m.vitals && typeof m.vitals === "object" ? m.vitals : {};
  for (var vk of VITAL_KEYS) {
    var vv = vit[vk];
    if (vv != null && vv !== "") return true;
  }
  for (var ek = 0; ek < VITAL_BASE_KEYS.length; ek++) {
    var extraKey = getVitalExtraStorageKey(VITAL_BASE_KEYS[ek]);
    if (vit[extraKey] != null && vit[extraKey] !== "") return true;
  }
  var vs = m.vitalSeries;
  if (vs && typeof vs === "object") {
    for (var vk2 in vs) {
      if (Array.isArray(vs[vk2]) && vs[vk2].length) return true;
    }
  }
  var bombas = Array.isArray(m.bombaInsulina) ? m.bombaInsulina : [];
  for (var bi = 0; bi < bombas.length; bi++) {
    var b = bombas[bi];
    if (b && typeof b === "object" && /** @type {any} */
    b.value != null && /** @type {any} */
    b.value !== "") {
      return true;
    }
  }
  var glus = Array.isArray(m.glucometrias) ? m.glucometrias : [];
  for (var i = 0; i < glus.length; i++) {
    var g = glus[i];
    if (!g || typeof g !== "object") continue;
    var val = (
      /** @type {any} */
      g.value
    );
    if (val != null && val !== "") return true;
  }
  var io = m.io && typeof m.io === "object" ? (
    /** @type {any} */
    m.io
  ) : {};
  if (hasIoNumber(io.ing)) return true;
  if (ioNumericEgressTotal(io) != null) return true;
  if (ioDiuresisForBalance(io) != null && ioDiuresisForBalance(io) !== "") return true;
  if (Array.isArray(io.egrParts) && io.egrParts.length) return true;
  if (io.evac != null && io.evac !== "") return true;
  return hasIoNumber(io.egr);
}
function historialSortedAsc(historial) {
  return historial.slice().sort(function(a, b) {
    var ra = typeof a === "object" && a && "recordedAt" in a ? String(
      /** @type {any} */
      a.recordedAt
    ) : "";
    var rb = typeof b === "object" && b && "recordedAt" in b ? String(
      /** @type {any} */
      b.recordedAt
    ) : "";
    return ra.localeCompare(rb);
  });
}
function deriveSnapshot(monitoreoLike) {
  var emptyVitals = {};
  var emptyAltered = {};
  for (var zk of VITAL_KEYS) {
    emptyVitals[zk] = null;
  }
  var snap = {
    vitals: emptyVitals,
    alteredAt: emptyAltered,
    glucometrias: (
      /** @type {Array<{ value?: unknown, time?: string }>} */
      []
    ),
    io: (
      /** @type {{ ing: null | unknown, egr: null | unknown }} */
      { ing: null, egr: null }
    )
  };
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  var vitals = {};
  for (var v0 of VITAL_KEYS) vitals[v0] = null;
  var alteredAt = {};
  for (var iRow = 0; iRow < sortedAsc.length; iRow++) {
    var row = sortedAsc[iRow];
    if (!row || typeof row !== "object") continue;
    var rv = (
      /** @type {any} */
      row.vitals && typeof /** @type {any} */
      row.vitals === "object" ? (
        /** @type {any} */
        row.vitals
      ) : {}
    );
    var rowAlt = (
      /** @type {any} */
      row.alteredAt && typeof /** @type {any} */
      row.alteredAt === "object" ? (
        /** @type {Record<string, string>} */
        /** @type {any} */
        row.alteredAt
      ) : {}
    );
    for (var vk of VITAL_KEYS) {
      var val = rv[vk];
      if (val != null && val !== "") {
        vitals[vk] = val;
        if (rowAlt && rowAlt[vk] != null && String(rowAlt[vk]).length > 0) {
          alteredAt[vk] = String(rowAlt[vk]);
        } else {
          delete alteredAt[vk];
        }
      }
    }
    for (var ex = 0; ex < VITAL_BASE_KEYS.length; ex++) {
      var baseK = VITAL_BASE_KEYS[ex];
      var extraK = getVitalExtraStorageKey(baseK);
      var extraVal = rv[extraK];
      if (extraVal != null && extraVal !== "") {
        vitals[extraK] = extraVal;
        if (rowAlt && rowAlt[extraK] != null && String(rowAlt[extraK]).length > 0) {
          alteredAt[extraK] = String(rowAlt[extraK]);
        } else {
          delete alteredAt[extraK];
        }
      }
    }
  }
  var gluChosen = [];
  var bombaChosen = [];
  for (var j = sortedAsc.length - 1; j >= 0; j--) {
    var r2 = sortedAsc[j];
    if (!r2 || typeof r2 !== "object") continue;
    var barr = Array.isArray(
      /** @type {any} */
      r2.bombaInsulina
    ) ? (
      /** @type {any} */
      r2.bombaInsulina
    ) : [];
    if (barr.length) {
      bombaChosen = barr.map(function(e) {
        if (!e || typeof e !== "object") return null;
        var v = Number(
          /** @type {any} */
          e.value
        );
        var u = Number(
          /** @type {any} */
          e.units
        );
        if (!Number.isFinite(v)) return null;
        return {
          value: v,
          units: Number.isFinite(u) ? u : 0,
          time: (
            /** @type {any} */
            e.time != null ? String(
              /** @type {any} */
              e.time
            ) : void 0
          )
        };
      }).filter(Boolean);
      gluChosen = [];
      break;
    }
    var garr = Array.isArray(
      /** @type {any} */
      r2.glucometrias
    ) ? (
      /** @type {any} */
      r2.glucometrias
    ) : [];
    var nonempty = (
      /** @type {typeof gluChosen} */
      []
    );
    for (var gg of garr) {
      if (!gg || typeof gg !== "object") continue;
      if (
        /** @type {any} */
        gg.value != null && /** @type {any} */
        gg.value !== ""
      ) nonempty.push(gg);
    }
    if (nonempty.length > 0) {
      gluChosen = nonempty;
      bombaChosen = [];
      break;
    }
  }
  var ingSeen = (
    /** @type {null | unknown} */
    null
  );
  var egrSeen = (
    /** @type {null | unknown} */
    null
  );
  var egrPartsSeen = null;
  var evacSeen = (
    /** @type {null | unknown} */
    null
  );
  for (var k2 = sortedAsc.length - 1; k2 >= 0; k2--) {
    var rIo = sortedAsc[k2];
    if (!rIo || typeof rIo !== "object") continue;
    var ioObj = (
      /** @type {any} */
      rIo.io && typeof /** @type {any} */
      rIo.io === "object" ? (
        /** @type {any} */
        /** @type {any} */
        rIo.io
      ) : {}
    );
    if (egrPartsSeen === null && Array.isArray(ioObj.egrParts) && ioObj.egrParts.length) {
      egrPartsSeen = ioObj.egrParts.slice();
      egrSeen = ioNumericEgressTotal(ioObj) ?? ioDiuresisForBalance(ioObj);
    }
    if (egrSeen === null && ioObj.egr != null && ioObj.egr !== "") egrSeen = ioObj.egr;
    if (evacSeen === null && ioObj.evac != null && ioObj.evac !== "") evacSeen = ioObj.evac;
    if (ingSeen === null && hasIoNumber(ioObj.ing)) ingSeen = ioObj.ing;
    if (ingSeen !== null && (egrSeen !== null || egrPartsSeen) && evacSeen !== null) break;
  }
  var vitalSeries = {};
  for (var si = sortedAsc.length - 1; si >= 0; si--) {
    var srow = sortedAsc[si];
    if (!srow || typeof srow !== "object") continue;
    var fromRow = vitalSeriesFromMedicion(srow);
    VITAL_BASE_KEYS.forEach(function(bk) {
      if (!vitalSeries[bk]) vitalSeries[bk] = [];
      var list = fromRow[bk] || [];
      for (var ri = 0; ri < list.length; ri++) {
        var rd = list[ri];
        var dup = vitalSeries[bk].some(function(x) {
          return x.value === rd.value && (x.time || "") === (rd.time || "");
        });
        if (!dup) vitalSeries[bk].push(rd);
      }
    });
  }
  snap.vitals = vitals;
  snap.alteredAt = alteredAt;
  snap.vitalSeries = vitalSeries;
  snap.glucometrias = gluChosen.slice();
  snap.bombaInsulina = bombaChosen;
  var snapIo = { ing: ingSeen, egr: egrSeen };
  if (egrPartsSeen) snapIo.egrParts = egrPartsSeen;
  if (evacSeen !== null) snapIo.evac = evacSeen;
  snap.io = snapIo;
  return snap;
}
function balanceTurno(monitoreoLike) {
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  for (var i = sortedAsc.length - 1; i >= 0; i--) {
    var row = sortedAsc[i];
    if (!row || typeof row !== "object") continue;
    var io = (
      /** @type {any} */
      row.io && typeof /** @type {any} */
      row.io === "object" ? (
        /** @type {any} */
        /** @type {any} */
        row.io
      ) : {}
    );
    var bal = computeIoBalanceFromIngEgr(io.ing, io);
    if (!Number.isFinite(bal)) continue;
    return bal;
  }
  return NaN;
}
function balanceGlobalHistorico(monitoreoLike) {
  var m = monitoreoLike || {};
  var hist = Array.isArray(m.historial) ? m.historial : [];
  var sortedAsc = historialSortedAsc(hist);
  var sum = 0;
  var any = false;
  for (var i = 0; i < sortedAsc.length; i++) {
    var row = sortedAsc[i];
    if (!row || typeof row !== "object") continue;
    var io = (
      /** @type {any} */
      row.io && typeof /** @type {any} */
      row.io === "object" ? (
        /** @type {any} */
        /** @type {any} */
        row.io
      ) : {}
    );
    var bal = computeIoBalanceFromIngEgr(io.ing, io);
    if (!Number.isFinite(bal)) continue;
    sum += bal;
    any = true;
  }
  return any ? sum : NaN;
}
function resolveMonitoreoContainer(patientOrMonitoreo) {
  var tgt = patientOrMonitoreo;
  if (!tgt || typeof tgt !== "object") return null;
  if (Array.isArray(tgt.historial)) return tgt;
  if (tgt.monitoreo && typeof tgt.monitoreo === "object" && Array.isArray(tgt.monitoreo.historial))
    return tgt.monitoreo;
  tgt.monitoreo = emptyMonitoreo();
  return tgt.monitoreo;
}
function appendMedicion(patientOrMonitoreo, medicion) {
  if (!medicionHasCoreData(medicion)) return { ok: false, error: "empty" };
  var mon = resolveMonitoreoContainer(patientOrMonitoreo);
  if (!mon) return { ok: false, error: "empty" };
  mon.historial.push(structuredClone(
    /** @type {object} */
    medicion
  ));
  return { ok: true };
}
function removeMedicion(patientOrMonitoreo, id) {
  var mon = resolveMonitoreoContainer(patientOrMonitoreo);
  if (!mon || !Array.isArray(mon.historial)) return;
  mon.historial = mon.historial.filter(function(row) {
    return row && typeof row === "object" && /** @type {any} */
    row.id !== id;
  });
}
function mergeMonitoreo(localIn, remoteIn) {
  var local = (
    /** @type {any} */
    structuredClone(localIn)
  );
  var remote = (
    /** @type {any} */
    structuredClone(remoteIn)
  );
  var lHist = Array.isArray(local?.historial) ? local.historial : [];
  var rHist = Array.isArray(remote?.historial) ? remote.historial : [];
  var result = (
    /** @type {any} */
    structuredClone(localIn)
  );
  result.historial = structuredClone((rHist.length > lHist.length ? remote : local).historial || []);
  var locT = result.textoGuardado || { text: "", savedAt: null };
  var remT = remote.textoGuardado || { text: "", savedAt: null };
  result.textoGuardado = compareSavedAt(remT.savedAt, locT.savedAt) > 0 ? structuredClone(remT) : structuredClone(locT);
  var resEco = result.estadoClinico || emptyEstadoClinico();
  var resCf = result.confirmado || {};
  var remEco = remote.estadoClinico || emptyEstadoClinico();
  var remCf = remote.confirmado || {};
  for (var mk of MED_FIELD_KEYS) {
    if (remCf[mk] && !resCf[mk]) {
      resEco[mk] = remEco[mk];
      resCf[mk] = true;
    }
  }
  result.estadoClinico = resEco;
  result.confirmado = resCf;
  return result;
}
function parseWeightKg(raw) {
  if (raw == null || raw === "") return null;
  var n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
function resolveDietWeightKg(opts) {
  opts = opts || {};
  return parseWeightKg(opts.patientPeso) ?? parseWeightKg(opts.pesoRef);
}
function computeDietKcalTotal(kcalKg, weightKg) {
  var k = Number(kcalKg);
  if (!Number.isFinite(k) || k <= 0 || weightKg == null) return null;
  return Math.round(k * weightKg);
}
function computeDietKcalKgFromTotal(kcalTotal, weightKg) {
  var t = Number(kcalTotal);
  if (!Number.isFinite(t) || t <= 0 || weightKg == null || weightKg <= 0) return null;
  return Math.round(t / weightKg * 10) / 10;
}
function syncDietKcalFromWeight(estadoClinico, weightKg) {
  if (!estadoClinico || typeof estadoClinico !== "object" || weightKg == null) return false;
  var total = computeDietKcalTotal(estadoClinico.kcalKg, weightKg);
  if (total == null) return false;
  estadoClinico.kcal = String(total);
  return true;
}

// public/js/lab-clinical-suggestions.mjs
function numOrNull(v) {
  if (v == null || v === "") return null;
  var n = typeof v === "number" ? v : parseFloat(String(v).replace(/\*/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function pickSection(parsedBySection, section, key, parsedFlat) {
  var sec = parsedBySection && parsedBySection[section];
  if (sec && sec[key] != null) return numOrNull(sec[key]);
  if (parsedFlat && parsedFlat[key] != null) return numOrNull(parsedFlat[key]);
  return null;
}
var LAB_CLINICAL_RULES = [
  {
    id: "hb-transfusion",
    test: function(v) {
      return v.hb != null && v.hb < 7;
    },
    text: function(v) {
      return "TRANSFUSION DE CONCENTRADO ERITROCITARIO (HB " + formatLabVal(v.hb) + ")";
    }
  }
];
function formatLabVal(n) {
  var s = String(n);
  return s.indexOf(".") >= 0 ? s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") : s;
}
function extractLabValuesForSuggestions(parsed, parsedBySection) {
  var pb = parsedBySection || {};
  return {
    hb: pickSection(pb, "BH", "Hb", parsed),
    na: pickSection(pb, "ESC", "Na", parsed),
    k: pickSection(pb, "ESC", "K", parsed),
    mg: pickSection(pb, "ESC", "Mg", parsed),
    ca: pickSection(pb, "ESC", "Ca", parsed)
  };
}
function evaluateLabSuggestions(parsed, parsedBySection, fechaEstudio) {
  var fecha = String(fechaEstudio || "").trim();
  var values = extractLabValuesForSuggestions(parsed, parsedBySection);
  var out = [];
  for (var i = 0; i < LAB_CLINICAL_RULES.length; i += 1) {
    var rule = LAB_CLINICAL_RULES[i];
    if (!rule.test(values)) continue;
    out.push({
      ruleId: rule.id,
      text: rule.text(values),
      fechaEstudio: fecha
    });
  }
  return out;
}
function shouldAddLabSuggestionTodo(todos, ruleId, fechaEstudio) {
  var rid = String(ruleId || "");
  var fecha = String(fechaEstudio || "").trim();
  if (!rid || !fecha) return true;
  var list = Array.isArray(todos) ? todos : [];
  for (var i = 0; i < list.length; i += 1) {
    var t = list[i];
    if (!t || t.completed) continue;
    if (String(t.labRuleId || "") === rid && String(t.labFecha || "").trim() === fecha) return false;
  }
  return true;
}
function filterNewLabSuggestions(suggestions, todos) {
  return (suggestions || []).filter(function(s) {
    return shouldAddLabSuggestionTodo(todos, s.ruleId, s.fechaEstudio);
  });
}

// public/js/clinical-safety.mjs
var ClinicalSafetyError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ClinicalSafetyError";
  }
};
var VANCO_LOAD_MAX_MG = 3e3;
var VANCO_MAINT_MAX_MG = 2250;
var MEQ_PER_AMPOULE_8_4_PCT = 50;
var LEVETIRACETAM_LOAD_MAX_MG = 4500;
var INSULIN_MAX_U_PER_HR = 50;
var HYPERTONIC_MAX_ML = 500;
var ALBUMIN_MAX_GRAMS = 200;
var PROPOFOL_MAX_MG_PER_KG_H = 4;
var STD_BAG_VOLUMES_ML = [100, 250, 500, 1e3];
var MAX_BAG_PLAN_ITERATIONS = 20;
function requirePositiveFinite(val) {
  var n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
function maxMeqForVolume(volMl, maxConcMeqPerL) {
  return maxConcMeqPerL * volMl / 1e3;
}
function planStandardKClBags(totalMeq, maxConcMeqPerL) {
  if (!Number.isFinite(totalMeq) || totalMeq <= 0) {
    throw new ClinicalSafetyError("Dosis de K+ inv\xE1lida");
  }
  if (!Number.isFinite(maxConcMeqPerL) || maxConcMeqPerL <= 0) {
    throw new ClinicalSafetyError("L\xEDmite de concentraci\xF3n inv\xE1lido");
  }
  var bags = [];
  var remaining = totalMeq;
  var iterations = 0;
  while (remaining > 1e-6) {
    if (iterations++ >= MAX_BAG_PLAN_ITERATIONS) {
      throw new ClinicalSafetyError("No se pudo fraccionar K+ en bolsas est\xE1ndar");
    }
    var placed = false;
    for (var i = 0; i < STD_BAG_VOLUMES_ML.length; i += 1) {
      var vol = STD_BAG_VOLUMES_ML[i];
      var cap = maxMeqForVolume(vol, maxConcMeqPerL);
      if (cap >= remaining) {
        bags.push({ volMl: vol, meq: remaining });
        remaining = 0;
        placed = true;
        break;
      }
    }
    if (placed) continue;
    var bigVol = 1e3;
    var chunk = maxMeqForVolume(bigVol, maxConcMeqPerL);
    if (chunk <= 0) {
      throw new ClinicalSafetyError("No se pudo fraccionar K+ en bolsas est\xE1ndar");
    }
    var use = Math.min(remaining, chunk);
    bags.push({ volMl: bigVol, meq: use });
    remaining -= use;
  }
  return { bags };
}

// public/js/electrolyte-manejo.mjs
var MED_KCL = "CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)";
var MED_NACL_HYPERT = "CLORURO DE SODIO HIPERT. 17.7 % SOL INY 10 ML (+)";
var MED_CA_GLUC = "GLUCONATO DE CALCIO 10% SOL INY";
var MED_MG_SO4 = "SULFATO DE MAGNESIO 50% SOL INY";
var MED_PHOS_K = "FOSFATO DE POTASIO 20 MEQ SOL INY 10 ML (+)";
var MED_PHOS_NA = "FOSFATO DE SODIO SOL INY";
var MED_INSULIN = "INSULINA REGULAR";
var MED_D50 = "DEXTROSA 50% SOL INY";
var MED_SALBUTAMOL = "SALBUTAMOL";
var NACL_EFFECTIVE_3_MEQ_PER_ML = 0.513;
var NACL_HYPERT_TO_EFFECTIVE3_RATIO = 17.7 / 3;
function mlEffective3FromDeficitMeq(defNaMeq) {
  return defNaMeq > 0 ? defNaMeq / NACL_EFFECTIVE_3_MEQ_PER_ML : 0;
}
function mlHypertonic177FromEffective3(mlEffective3) {
  if (mlEffective3 == null || !Number.isFinite(mlEffective3) || mlEffective3 <= 0) return 0;
  return mlEffective3 / NACL_HYPERT_TO_EFFECTIVE3_RATIO;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}
function hypertonic177DilutionText(ml177, volFinalMl) {
  var diluent = Math.max(0, Math.round(volFinalMl - ml177));
  return " DILUIR " + round1(ml177) + " ML HIPERT. 17.7% EN " + diluent + " ML NACL AL 0.9% (~" + Math.round(volFinalMl) + " ML FINAL ~3% EQ.)";
}
function numOrNull2(v) {
  if (v == null || v === "") return null;
  var n = typeof v === "number" ? v : parseFloat(String(v).replace(/\*/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function pickSection2(pb, section, key, parsedFlat) {
  var sec = pb && pb[section];
  if (sec && sec[key] != null) return numOrNull2(sec[key]);
  if (parsedFlat && parsedFlat[key] != null) return numOrNull2(parsedFlat[key]);
  return null;
}
function pickGlu(pb, parsedFlat) {
  return pickSection2(pb, "QS", "Glu", parsedFlat) ?? pickSection2(pb, "GASES", "GLU", parsedFlat) ?? pickSection2(pb, "GASES", "Glu", parsedFlat);
}
function pickAlb(pb, parsedFlat) {
  return pickSection2(pb, "PFHs", "Alb", parsedFlat) ?? pickSection2(pb, "QS", "Alb", parsedFlat) ?? pickSection2(pb, "BH", "Alb", parsedFlat);
}
function toSomeUpper(s) {
  if (s == null || s === "") return "";
  return String(s).trim().toUpperCase();
}
function formatSomeBlock(order) {
  var o = order || {};
  var rateRaw = o.infusionRateMlHr;
  var rateStr = "";
  if (rateRaw !== null && rateRaw !== void 0 && rateRaw !== "" && !(typeof rateRaw === "number" && !Number.isFinite(rateRaw))) {
    var rateText = String(rateRaw).trim();
    rateStr = /mcg\/min|mg\/min|u\/min|u\/kg\/h/i.test(rateText) ? toSomeUpper(rateText) : toSomeUpper(rateText + " CC/HR");
  }
  var dosePart = String(o.doseValue != null ? o.doseValue : "").trim() + (o.doseUnit ? " " + String(o.doseUnit).trim() : "");
  return "MEDICAMENTO: " + toSomeUpper(o.medication || "") + "\nDOSIS: " + toSomeUpper(dosePart.trim()) + "\nVIA: " + toSomeUpper(o.route || "") + "\nDILUCION: " + toSomeUpper(o.dilution || "") + "\nFRECUENCIA: " + toSomeUpper(o.frequency || "") + "\nVELOCIDAD DE INFUSION: " + rateStr + "\nCOMENTARIOS ADICIONALES: " + toSomeUpper(o.comments || "");
}
function parsePatientWeightKg(patient) {
  if (!patient) return null;
  var n = numOrNull2(patient.peso);
  return n != null && n > 0 ? n : null;
}
function isCentralAccess(viaAcceso) {
  return String(viaAcceso || "").trim().toLowerCase() === "cvc";
}
function kLimitsForAccess(viaAcceso) {
  if (isCentralAccess(viaAcceso)) return { maxConcMeqPerL: 80, maxMeqPerHr: 40 };
  return { maxConcMeqPerL: 40, maxMeqPerHr: 10 };
}
function accessRouteLabel(viaAcceso) {
  return isCentralAccess(viaAcceso) ? "central (CVC)" : "perif\xE9rica / PICC";
}
function formatSuggestedDoseFromOrder(order, opts) {
  opts = opts || {};
  if (!order) return opts.extra || "";
  var parts = [];
  var dose = String(order.doseValue != null ? order.doseValue : "").trim();
  if (dose && order.doseUnit) parts.push(dose + " " + String(order.doseUnit).trim());
  if (order.dilution) parts.push("Diluci\xF3n: " + order.dilution);
  if (opts.accessLabel) parts.push("Acceso " + opts.accessLabel);
  if (opts.meqPerHr != null && Number.isFinite(opts.meqPerHr)) {
    parts.push("Vel. reposici\xF3n: ~" + opts.meqPerHr + " mEq/h m\xE1x");
  }
  var rate = order.infusionRateMlHr;
  if (rate != null && rate !== "" && Number.isFinite(Number(rate))) {
    parts.push("Vel. infusi\xF3n: ~" + Math.round(Number(rate)) + " mL/h");
  } else if (rate != null && rate !== "") {
    parts.push("Vel. infusi\xF3n: " + rate);
  }
  if (opts.extra) parts.push(opts.extra);
  return parts.join(" \xB7 ");
}
function tbwFactor(patient) {
  if (!patient) return 0.6;
  var s = String(patient.sexo || "").trim().toUpperCase();
  return s === "F" ? 0.5 : 0.6;
}
function correctedCalcium(ca, alb) {
  var caN = numOrNull2(ca);
  var albN = numOrNull2(alb);
  if (caN == null || albN == null || !Number.isFinite(caN) || !Number.isFinite(albN)) return null;
  var v = caN + 0.8 * (4 - albN);
  return Math.round(v * 100) / 100;
}
function kHypoSeverity(k) {
  if (k == null || !Number.isFinite(k)) return null;
  if (k < 2.5) return "grave";
  if (k < 3) return "moderada";
  if (k < 3.5) return "leve";
  return null;
}
function kHyperSeverity(k) {
  if (k == null || !Number.isFinite(k)) return null;
  if (k >= 6.5) return "emergencia";
  if (k >= 6) return "moderada";
  if (k >= 5.5) return "leve";
  return null;
}
function naHypoSeverity(na) {
  if (na == null || !Number.isFinite(na)) return null;
  if (na >= 134) return null;
  if (na < 125) return "grave";
  return "moderada";
}
function naHyperSeverity(na) {
  if (na == null || !Number.isFinite(na)) return null;
  if (na <= 145) return null;
  if (na <= 150) return "leve";
  if (na <= 160) return "moderada";
  return "grave";
}
function mgHypoSeverity(mg) {
  if (mg == null || !Number.isFinite(mg)) return null;
  if (mg < 1) return "grave";
  if (mg < 1.5) return "moderada";
  return null;
}
function phosHypoSeverity(pMgDl) {
  if (pMgDl == null || !Number.isFinite(pMgDl)) return null;
  if (pMgDl < 1) return "grave";
  if (pMgDl < 2) return "moderada";
  return null;
}
function kHypoDilutionText(bagMeq, bagVol, maxConc, bagIndex, bagCount) {
  var suffix = bagCount > 1 ? " (BOLSA " + bagIndex + "/" + bagCount + ")" : "";
  return bagVol + " ML SOL SALINA AL 0.9% (" + Math.round(bagMeq * 10) / 10 + " MEQ / " + bagVol + " ML; CONC. \u2264" + maxConc + " MEQ/L)" + suffix;
}
function kOrderFromBag(bag, idx, count, maxConc, routeLabel, mEqPerHrRaw, totalMeq) {
  return {
    medication: MED_KCL,
    route: routeLabel,
    doseValue: Math.round(bag.meq * 10) / 10,
    doseUnit: "MEQ",
    dilution: kHypoDilutionText(bag.meq, bag.volMl, maxConc, idx + 1, count),
    infusionRateMlHr: Math.round(mEqPerHrRaw / totalMeq * bag.volMl),
    requiresDilution: true
  };
}
function buildKHypoOrders(mEqChosen, limits, etaLow, routeLabel) {
  var maxConc = limits.maxConcMeqPerL;
  var plan = planStandardKClBags(mEqChosen, maxConc);
  var bags = plan.bags;
  var mEqPerHrRaw = etaLow ? Math.min(limits.maxMeqPerHr, 10) : limits.maxMeqPerHr;
  if (etaLow && mEqPerHrRaw > 10) mEqPerHrRaw = 10;
  var volMl = 0;
  for (var v = 0; v < bags.length; v += 1) volMl += bags[v].volMl;
  var orders = bags.map(function(bag, idx) {
    return kOrderFromBag(bag, idx, bags.length, maxConc, routeLabel, mEqPerHrRaw, mEqChosen);
  });
  return { orders, volMl, mEqPerHr: mEqPerHrRaw };
}
function buildPhosHypoOrders(phs, mmLo, mmHi, kVal) {
  var usePotassium = !(kVal != null && kVal >= 4);
  var mmTarget = phs === "grave" ? Math.min(mmHi, 30) : Math.max(mmLo, Math.round((mmLo + mmHi) / 2 * 10) / 10);
  var volMl = phs === "grave" ? 500 : 250;
  var hours = phs === "grave" ? 8 : 10;
  var mmolPerHr = Math.round(mmTarget / hours * 10) / 10;
  var med = usePotassium ? MED_PHOS_K : MED_PHOS_NA;
  return {
    orders: [
      {
        medication: med,
        route: "INTRAVENOSA",
        doseValue: mmTarget,
        doseUnit: "MMOL P",
        dilution: volMl + " ML SOL SALINA AL 0.9% EN " + hours + " H",
        infusionRateMlHr: Math.round(mmolPerHr / mmTarget * volMl),
        requiresDilution: true
      }
    ],
    mmTarget,
    mmolPerHr,
    usePotassium
  };
}
function buildNaHypoSomeOrders(severity, mlEffective3) {
  if (severity === "grave") {
    var volFinalLow = 100;
    var volFinalHigh = 150;
    var ml177Low = Math.round(mlHypertonic177FromEffective3(volFinalLow));
    var ml177High = Math.round(mlHypertonic177FromEffective3(volFinalHigh));
    return [
      {
        medication: MED_NACL_HYPERT,
        route: "INTRAVENOSA",
        doseValue: String(ml177Low) + "\u2013" + String(ml177High),
        doseUnit: "ML",
        dilution: hypertonic177DilutionText(ml177Low, volFinalLow) + " O " + hypertonic177DilutionText(ml177High, volFinalHigh) + "; BOLUS 10\u201320 MIN",
        infusionRateMlHr: 600,
        requiresDilution: true
      }
    ];
  }
  var volFinal = 150;
  var ml177 = 20;
  if (mlEffective3 != null && mlEffective3 > 0 && mlEffective3 <= 150) {
    volFinal = Math.max(100, Math.round(mlEffective3));
    ml177 = Math.max(10, Math.round(mlHypertonic177FromEffective3(volFinal)));
  }
  return [
    {
      medication: MED_NACL_HYPERT,
      route: "INTRAVENOSA",
      doseValue: ml177,
      doseUnit: "ML",
      dilution: hypertonic177DilutionText(ml177, volFinal),
      infusionRateMlHr: 300,
      requiresDilution: true
    }
  ];
}
function evaluateElectrolyteManejo(ctx) {
  ctx = ctx || {};
  var pb = ctx.parsedBySection || {};
  var flat = ctx.parsed || {};
  var patient = ctx.patient || {};
  var rows = [];
  var crossAlerts = [];
  var w = parsePatientWeightKg(patient);
  var fTbw = tbwFactor(patient);
  var limits = kLimitsForAccess(patient.viaAcceso);
  var routeIv = "INTRAVENOSA";
  var eTFG = pickSection2(pb, "QS", "eTFG", flat);
  var etaLow = eTFG != null && eTFG < 30;
  var kVal = pickSection2(pb, "ESC", "K", flat);
  var naVal = pickSection2(pb, "ESC", "Na", flat);
  var caVal = pickSection2(pb, "ESC", "Ca", flat);
  var albVal = pickAlb(pb, flat);
  var cc = correctedCalcium(caVal, albVal);
  var mgVal = pickSection2(pb, "ESC", "Mg", flat);
  var pMgDl = pickSection2(pb, "ESC", "F", flat);
  var glu = pickGlu(pb, flat);
  var kHypoAlerts = [];
  var mgAlerts = [];
  var ks = kHypoSeverity(kVal);
  if (ks) {
    if (etaLow)
      kHypoAlerts.push("IRC (eTFG <30): considerar \u221250% dosis K inicial y vigilancia estrecha");
    var defStr = null;
    var defEq = null;
    if (w != null && kVal != null) {
      defEq = (4 - kVal) * w * 0.4;
      defStr = Math.round(defEq * 10) / 10 + " mEq estimados (formula (4\u2212K)\xD7peso\xD70.4)";
    }
    var mEqBase = ks === "grave" ? 40 : ks === "moderada" ? 30 : 25;
    if (etaLow) mEqBase = Math.round(mEqBase * 0.5 / 5) * 5;
    var mEqUse = Math.max(10, Math.min(mEqBase, etaLow ? 20 : 40));
    var kPack;
    try {
      kPack = buildKHypoOrders(mEqUse, limits, etaLow, routeIv);
    } catch (planErr) {
      if (planErr instanceof ClinicalSafetyError) {
        kHypoAlerts.push("Reposici\xF3n K+ no calculada: " + planErr.message);
        kPack = { orders: [], volMl: 0, mEqPerHr: 0 };
      } else {
        throw planErr;
      }
    }
    var someKs = kPack.orders;
    var kOrder = someKs[0];
    rows.push({
      electrolyte: "K",
      direction: "hypo",
      value: kVal,
      unit: "mEq/L",
      interpretation: "HIPOPOTASEMIA " + ks.toUpperCase(),
      severity: ks,
      formula: defEq != null ? "(4\u2212K)\xD7peso\xD70.4" : "",
      formulaResult: defStr,
      suggestedDose: kOrder ? formatSuggestedDoseFromOrder(kOrder, {
        accessLabel: accessRouteLabel(patient.viaAcceso),
        meqPerHr: kPack.mEqPerHr
      }) : "",
      route: routeIv,
      monitoring: "Ionograma y ECG si procede; repetir K en 4\u20136 h.",
      alerts: kHypoAlerts.concat(),
      clinicalNotes: ks === "grave" ? ["Evitar dex en hipo K grave.", "Preferir bomba IV."] : [],
      someOrders: someKs,
      ruleId: "k-hypo-" + ks
    });
  }
  var khyp = ks;
  var khypS = kHyperSeverity(kVal);
  if (khypS === "emergencia") {
    var em = [];
    em.push({
      medication: MED_CA_GLUC,
      route: routeIv,
      doseValue: "10\u201320",
      doseUnit: "ML",
      dilution: glu != null && glu >= 250 ? "BOLO IV 2\u20135 MIN (REPETIBLE SI ALTERACION DE ECG)" : "BOLO IV 2\u20135 MIN",
      infusionRateMlHr: 120,
      requiresDilution: false
    });
    em.push({
      medication: MED_INSULIN,
      route: routeIv,
      doseValue: 10,
      doseUnit: "U",
      dilution: glu != null && glu < 250 ? "MAS DEXTROSA 50% SI GLU <250 MG/DL" : "REVISAR GLUCEMIA",
      infusionRateMlHr: "SEGUN BOMBA / PROTOCOLO",
      requiresDilution: false
    });
    if (glu != null && glu < 250) {
      em.push({
        medication: MED_D50,
        route: routeIv,
        doseValue: 50,
        doseUnit: "ML",
        dilution: "TRAS INSULINA; MONITORIZAR GLUCEMIA C/30\u201360 MIN X 4\u20136 H",
        infusionRateMlHr: null,
        requiresDilution: false
      });
    }
    em.push({
      medication: MED_SALBUTAMOL,
      route: "NEBULIZACION",
      doseValue: "10\u201320",
      doseUnit: "MG",
      dilution: "EN 4 ML SS AL 0.9% (NEBULIZADO)",
      infusionRateMlHr: null,
      requiresDilution: false
    });
    rows.push({
      electrolyte: "K",
      direction: "hyper",
      value: kVal,
      unit: "mEq/L",
      interpretation: "HIPERPOTASEMIA GRAVE / URGENCIA",
      severity: "emergencia",
      formula: "",
      formulaResult: glu != null ? "Glucosa concurrente " + glu + " mg/dL" : null,
      suggestedDose: "Secuencia estabilizaci\xF3n membrana + desplazo K intracelular",
      route: routeIv,
      monitoring: "K cada 2 h; ECG; glucometr\xEDa recurrente.",
      alerts: ["Kayexalate no recomendado en esta gu\xEDa v1.", "Valorar dialisis si refractario."],
      clinicalNotes: glu == null ? ["Registrar glucosa QS/gasometria para regimen insulina + dextrosa."] : [],
      someOrders: em,
      ruleId: "k-hyper-emergencia"
    });
  }
  var ns = naHypoSeverity(naVal);
  if (ns && w != null) {
    var tbwTot = fTbw * w;
    var defNaMeq = tbwTot * (140 - naVal);
    var mlEffective3 = mlEffective3FromDeficitMeq(defNaMeq);
    var ml177 = mlHypertonic177FromEffective3(mlEffective3);
    rows.push({
      electrolyte: "Na",
      direction: "hypo",
      value: naVal,
      unit: "mEq/L",
      interpretation: "HIPONATREMIA " + ns.toUpperCase(),
      severity: ns,
      formula: "TBW\xD7(140\u2212Na); vol. final ~3% eq.\u2248mEq\xF7" + String(NACL_EFFECTIVE_3_MEQ_PER_ML) + "; mL 17.7%=vol\xF7" + round1(NACL_HYPERT_TO_EFFECTIVE3_RATIO),
      formulaResult: "Deficit ~" + round1(defNaMeq) + " mEq; ~" + round1(mlEffective3) + " mL final ~3% eq.; hipert. 17.7% ~" + round1(ml177) + " mL (diluir en SS 0.9%)",
      suggestedDose: ns === "grave" ? "Hipert. 17.7% diluido a ~100\u2013150 mL final ~3% eq.; bolo IV 10\u201320 min si sintom\xE1tico grave" : "Hipert. 17.7% p. ej. 20 mL + 130 mL NaCl 0.9% (~150 mL ~3% eq.) en ~30 min; gradual (<10 mEq/L/24 h)",
      route: routeIv,
      monitoring: "Na cada 4\u20138 h inicialmente; neurologico.",
      alerts: [],
      clinicalNotes: ns === "grave" ? [
        "Sin NaCl al 3% en vademecum HU: preparar con hipert. 17.7% + diluci\xF3n a ~3% equivalente.",
        "No corregir >10 mEq/L/24 h salvo urgencia neurologica dirigida.",
        "Valorar causa (SIADH, etc.)."
      ] : [
        "Sin NaCl al 3% en vademecum HU: diluir hipert. 17.7% en NaCl 0.9% hasta ~3% equivalente.",
        "Respetar tasas maximas recomendadas."
      ],
      someOrders: buildNaHypoSomeOrders(ns, mlEffective3),
      ruleId: "na-hypo-" + ns
    });
  } else if (ns && w == null) {
    rows.push({
      electrolyte: "Na",
      direction: "hypo",
      value: naVal,
      unit: "mEq/L",
      interpretation: "HIPONATREMIA \u2014 FALTA PESO PARA TBW/DEFICIT",
      severity: ns,
      formula: "TBW\xD7(140\u2212Na); vol. ~3% eq.\u2248mEq\xF7" + NACL_EFFECTIVE_3_MEQ_PER_ML + "; mL 17.7%=vol\xF7" + round1(NACL_HYPERT_TO_EFFECTIVE3_RATIO),
      formulaResult: null,
      suggestedDose: "",
      route: "",
      monitoring: "",
      alerts: [],
      clinicalNotes: ["Indicar peso en datos del paciente para estimar d\xE9ficit hidrosodio."],
      someOrders: [],
      ruleId: "na-hypo-no-weight"
    });
  }
  var nhs = naHyperSeverity(naVal);
  if (nhs && w != null) {
    var tbwTot2 = fTbw * w;
    var fwd = tbwTot2 * (naVal / 140 - 1);
    rows.push({
      electrolyte: "Na",
      direction: "hyper",
      value: naVal,
      unit: "mEq/L",
      interpretation: "HIPERNATREMIA " + nhs.toUpperCase(),
      severity: nhs,
      formula: "Agua libre deficit (L)=TBW\xD7((Na/140)\u22121); TBW=F\xD7peso",
      formulaResult: (fwd > 0 ? "~" + Math.round(fwd * 1e3) / 1e3 + " L aprox." : "Marginal por formula") + "; TBW usado ~" + Math.round(tbwTot2 * 10) / 10 + " L",
      suggestedDose: "Corregir despacio (<10\u201312 mEq/L/24 h); D5W o hipotonica segun contexto volumen.",
      route: routeIv,
      monitoring: "Na y estado de volumen frecuentes.",
      alerts: [],
      clinicalNotes: fwd > 0 ? ["Hipovolemico puede requerir fase isotonica inicial; hipervolemico: diureticos, etc."] : [],
      someOrders: [],
      ruleId: "na-hyper-" + nhs
    });
  }
  var mags = mgHypoSeverity(mgVal);
  if (mags) {
    var gMgEq = mags === "grave" ? 24 : 20;
    if (etaLow) gMgEq = Math.round(gMgEq * 0.5);
    mgAlerts = mgAlerts.concat();
    if (etaLow)
      mgAlerts.push("IRC (eTFG <30): dosis Mg reducida 50%; monitoreo neuromuscular acentuado");
    var volMg = mags === "grave" ? 250 : 500;
    var mgMeq = gMgEq;
    var mgHours = mags === "grave" ? 0.5 : 6;
    var mgMlHr = mags === "grave" ? Math.round(volMg / 0.5) : Math.round(volMg / mgHours);
    var mgOrder = {
      medication: MED_MG_SO4,
      route: routeIv,
      doseValue: mgMeq,
      doseUnit: "MEQ Mg (~" + Math.round(mgMeq / 4) + " mL MgSO4 50%)",
      dilution: volMg + " ML SOL SALINA AL 0.9%" + (mags === "grave" ? " EN 15\u201360 MIN" : " EN 4\u20138 H"),
      infusionRateMlHr: mgMlHr,
      requiresDilution: true
    };
    rows.push({
      electrolyte: "Mg",
      direction: "hypo",
      value: mgVal,
      unit: "mg/dL",
      interpretation: "HIPOMAGNESEMIA " + mags.toUpperCase(),
      severity: mags,
      formula: etaLow ? "Dosis Mg ajustada a eTFG" : "",
      formulaResult: etaLow ? "\u221250% por eTFG <30" : null,
      suggestedDose: formatSuggestedDoseFromOrder(mgOrder, {
        accessLabel: accessRouteLabel(patient.viaAcceso)
      }),
      route: routeIv,
      monitoring: "Reflejos/PFR; Mg serico y K asociados.",
      alerts: mgAlerts,
      clinicalNotes: [],
      someOrders: [mgOrder],
      ruleId: "mg-hypo-" + mags
    });
  }
  var phs = phosHypoSeverity(pMgDl);
  if (phs && w != null) {
    var mmLo = Math.round(w * 0.16 * 10) / 10;
    var mmHi = Math.round(w * 0.32 * 10) / 10;
    var phPack = !etaLow ? buildPhosHypoOrders(phs, mmLo, mmHi, kVal) : null;
    var phOrder = phPack && phPack.orders[0] ? phPack.orders[0] : null;
    var phSuggested = etaLow ? "IRC (eTFG <30): evitar fosfato IV; si imprescindible: \u2264" + Math.round(mmLo * 0.5 * 10) / 10 + " mmol en 250 mL SS 0.9%, \u22644 mmol/h, monitor Ca/Mg/K" : formatSuggestedDoseFromOrder(phOrder, {
      extra: phPack && !phPack.usePotassium ? "Usar fosfato de sodio (K \u22654 mEq/L)" : null
    });
    rows.push({
      electrolyte: "P",
      direction: "hypo",
      value: pMgDl,
      unit: "mg/dL",
      interpretation: "HIPOFOSFATEMIA " + phs.toUpperCase(),
      severity: phs,
      formula: "0.16\u20130.32 mmol/kg IV (grave-moderado; max 90 mmol/dia)",
      formulaResult: "~" + mmLo + "\u2013" + mmHi + " mmol para peso corporal actual",
      suggestedDose: phSuggested,
      route: routeIv,
      monitoring: "Ca ionico / total; Mg; K funcion renal.",
      alerts: etaLow ? ["IRC: evitar o extremar precauciones con P IV."] : [],
      clinicalNotes: kVal != null && kVal < 3.8 && phPack && phPack.usePotassium ? ["Fosfato de potasio aporta K+; vigilar hipocalcemia antes de iniciar."] : [],
      someOrders: phPack ? phPack.orders : [],
      ruleId: "p-hypo-" + phs
    });
  }
  if (caVal != null && cc != null && cc < 8.5) {
    var caOrder = {
      medication: MED_CA_GLUC,
      route: routeIv,
      doseValue: cc < 7.5 ? "20" : "10\u201320",
      doseUnit: "ML (1\u20132 G)",
      dilution: "IV DIRECTO O DILUIDO EN 50\u2013100 ML D5W/SS 0.9%",
      infusionRateMlHr: cc < 7.5 ? 200 : 100,
      requiresDilution: false
    };
    rows.push({
      electrolyte: "Ca",
      direction: "hypo",
      value: cc,
      unit: "mg/dL (corr.)",
      interpretation: "HIPOCALCAMIA FUNCION CALCIO CORREGIDO (<8.5)",
      severity: cc < 7.5 ? "grave" : "moderada",
      formula: "Ca total + 0.8\xD7(4\u2212Alb)",
      formulaResult: String(cc),
      suggestedDose: formatSuggestedDoseFromOrder(caOrder) + " \xB7 Administrar en 10\u201320 min con monitor ECG",
      route: routeIv,
      monitoring: "ECG si sintomatico; Ca total/ionizado seriados.",
      alerts: [],
      clinicalNotes: albVal == null ? ["Alb faltante impide corroboracion; interpretar ionograma/clinica."] : [],
      someOrders: [caOrder],
      ruleId: "ca-hypo-corrected"
    });
  }
  if (khyp && mags != null && kVal != null && kVal < 3.5 && mgVal != null && mgVal < 1.5) {
    crossAlerts.push("Corregir magnesio antes del potasio (K refractario con hipomagnesemia)");
  }
  var caLow = cc != null && cc < 8.5 && caVal != null;
  var pLow = phs != null;
  if (caLow && pLow) {
    crossAlerts.push("Normalizar calcio antes de fosforo IV (riesgo tetania)");
  }
  var hasAlterations = rows.some(function(r) {
    return ["K", "Na", "Mg", "P", "Ca"].indexOf(String(r.electrolyte)) >= 0 && r.direction;
  });
  return { rows, crossAlerts, hasAlterations };
}

// public/js/tend-core.mjs
var TEND_MESES_MAP = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
  jan: "01",
  apr: "04",
  aug: "08",
  dec: "12"
};
function tendEligibleSectionKey(sec) {
  var u = String(sec == null ? "" : sec).trim().replace(/:+$/, "").toUpperCase();
  if (!u) return false;
  return /^(BH|PLTCIT|QS|ESC|PFHS|GASES|LCR|LIQ|PROT12H|PROT24H|PIE|EGO|CUANTORINA|FROTIS)$/.test(u);
}
function normalizeFechaLabHistory(fechaRaw) {
  if (fechaRaw == null || fechaRaw === "") return "";
  if (String(fechaRaw).trim() === "Anterior") return "Anterior";
  var t = String(fechaRaw).trim();
  var mEn = t.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    var mon = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (mon) return mEn[2].padStart(2, "0") + "/" + mon + "/" + mEn[3];
  }
  var mNum = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (mNum) {
    var y = mNum[3] ? String(mNum[3]) : String((/* @__PURE__ */ new Date()).getFullYear());
    if (y.length === 2) y = "20" + y;
    return mNum[1].padStart(2, "0") + "/" + mNum[2].padStart(2, "0") + "/" + y;
  }
  return t;
}
function applyHoraToMs(ms, horaStr) {
  if (horaStr == null || !/^\d{1,2}:\d{2}/.test(String(horaStr).trim())) return ms;
  var h = String(horaStr).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!h) return ms;
  return ms + (parseInt(h[1], 10) * 3600 + parseInt(h[2], 10) * 60) * 1e3;
}
function normalizeHoraLabHistory(horaRaw) {
  if (horaRaw == null) return "";
  var t = String(horaRaw).trim();
  if (!t) return "";
  var m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return "";
  var hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  var mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  var ss = m[3] == null ? null : Math.max(0, Math.min(59, parseInt(m[3], 10)));
  var out = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  if (ss != null) out += ":" + String(ss).padStart(2, "0");
  return out;
}
function parseFechaLabToMs(fechaStr, horaStr) {
  if (!fechaStr) return null;
  var t = String(fechaStr).trim();
  if (t === "Anterior") return null;
  var mEn = t.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (mEn) {
    var monStr = TEND_MESES_MAP[mEn[1].toLowerCase().slice(0, 3)];
    if (monStr) {
      var mo = parseInt(monStr, 10) - 1;
      var ms = new Date(parseInt(mEn[3], 10), mo, parseInt(mEn[2], 10)).getTime();
      return applyHoraToMs(ms, horaStr);
    }
  }
  var mNum = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (mNum) {
    var y = mNum[3] ? parseInt(mNum[3], 10) : (/* @__PURE__ */ new Date()).getFullYear();
    if (y < 100) y += 2e3;
    var ms2 = new Date(y, parseInt(mNum[2], 10) - 1, parseInt(mNum[1], 10)).getTime();
    return applyHoraToMs(ms2, horaStr);
  }
  return null;
}
function sortLabHistoryChronological(hist) {
  return (hist || []).slice().sort(function(a, b) {
    var aAnterior = !!(a && (a.fecha === "Anterior" || a.id === "migrated-anterior"));
    var bAnterior = !!(b && (b.fecha === "Anterior" || b.id === "migrated-anterior"));
    if (aAnterior !== bAnterior) return aAnterior ? 1 : -1;
    var ta = parseFechaLabToMs(a.fecha, a.hora);
    var tb = parseFechaLabToMs(b.fecha, b.hora);
    var aValid = typeof ta === "number" && isFinite(ta);
    var bValid = typeof tb === "number" && isFinite(tb);
    if (aValid !== bValid) return aValid ? -1 : 1;
    if (aValid && bValid && ta !== tb) return tb - ta;
    var ha = normalizeHoraLabHistory(a && a.hora);
    var hb = normalizeHoraLabHistory(b && b.hora);
    if (ha && hb && ha !== hb) return hb.localeCompare(ha);
    return 0;
  });
}
function parseTrendNumeric(raw) {
  if (raw == null || raw === "") return null;
  var s = String(typeof raw === "object" && raw.val != null ? raw.val : raw).trim();
  if (!s || s === "---") return null;
  s = s.replace(/\*/g, "").replace(/^<\s*/, "").trim();
  if (!s) return null;
  var n = parseFloat(s.replace(",", "."));
  return isFinite(n) ? n : null;
}
function getSetTrendValueForSeries(set, sectionKey, fieldKey) {
  if (!set || !set.parsedBySection) return null;
  var pb = set.parsedBySection;
  if (!pb[sectionKey]) return null;
  return parseTrendNumeric(pb[sectionKey][fieldKey]);
}
function columnSetsForFields(historyAsc, sectionKey, fieldKeys) {
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  (historyAsc || []).forEach(function(set) {
    var ms = parseFechaLabToMs(set.fecha, set.hora);
    var colKey = typeof ms === "number" && isFinite(ms) ? "t:" + ms : "f:" + String(set.fecha) + "|h:" + normalizeHoraLabHistory(set.hora);
    if (seen[colKey]) return;
    var has = (fieldKeys || []).some(function(fk) {
      return getSetTrendValueForSeries(set, sectionKey, fk) != null;
    });
    if (!has) return;
    seen[colKey] = true;
    out.push(set);
  });
  return out;
}
function dedupeTrendSetsForSeries(setsDesc, sectionKey, fieldKey) {
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  for (var i = 0; i < (setsDesc || []).length; i++) {
    var s = setsDesc[i];
    var v = getSetTrendValueForSeries(s, sectionKey, fieldKey);
    if (v == null || !isFinite(v)) continue;
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var key = typeof ms === "number" && isFinite(ms) ? "t:" + ms + "|v:" + v + "|" + sectionKey + "|" + fieldKey : "f:" + String(s.fecha) + "|h:" + normalizeHoraLabHistory(s.hora) + "|v:" + v + "|" + sectionKey + "|" + fieldKey;
    if (seen[key]) continue;
    seen[key] = true;
    out.push(s);
  }
  return out;
}
function buildTrendAxisMeta(setsAsc) {
  var cols = setsAsc || [];
  var timeVis = buildTrendColumnTimeVisibility(cols);
  var dayCounts = /* @__PURE__ */ Object.create(null);
  var points = cols.map(function(s, idx) {
    if (s.fecha === "Anterior") {
      return { set: s, x: idx, dayLabel: "Ant.", tooltipTime: "" };
    }
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    var d = new Date(ms);
    var dayKey = isFinite(d.getTime()) ? d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() : "raw:" + String(s.fecha);
    dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    var n = dayCounts[dayKey];
    var dd = isFinite(d.getTime()) ? String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") : String(s.fecha).slice(0, 12);
    var hora = normalizeHoraLabHistory(s.hora);
    var jitter = n > 1 ? (n - 1) * 0.12 : 0;
    var showTimeInLabel = !!timeVis[colKeyForTrendSet(s)];
    return {
      set: s,
      x: idx + jitter,
      dayLabel: dd,
      tooltipTime: hora ? hora.slice(0, 5) : "",
      showTimeInLabel
    };
  });
  return {
    points,
    labels: points.map(function(p) {
      if (p.set.fecha === "Anterior") return "Ant.";
      if (p.showTimeInLabel && p.tooltipTime) return p.dayLabel + " " + p.tooltipTime;
      return p.dayLabel;
    })
  };
}
function buildTendChartLabels(setsAsc) {
  return buildTrendAxisMeta(setsAsc).labels;
}
function isErythrocytePercentField(fieldKey) {
  var f = String(fieldKey || "").trim();
  if (/^hto$/i.test(f)) return true;
  if (/^hct$/i.test(f)) return true;
  if (/^rdw$/i.test(f)) return true;
  if (/^ret/i.test(f)) return true;
  return false;
}
var BH_PANEL_FAMILIES = [
  "bh-absolute",
  "bh-quality",
  "bh-diff-manual",
  "bh-coag"
];
var GENERIC_PANEL_FAMILIES = ["gases", "percent-diff", "percent-rbc", "absolute"];
var BH_QUALITY_FIELDS = {
  VCM: true,
  HCM: true,
  CHCM: true,
  RDW: true,
  Hto: true,
  Ret: true,
  MPV: true
};
var BH_ABSOLUTE_FIELDS = {
  Hb: true,
  RBC: true,
  Leu: true,
  Neu: true,
  Lin: true,
  Mono: true,
  Baso: true,
  Eos: true,
  Plt: true
};
var BH_DIFF_FIELDS = {
  NeuPct: true,
  LinPct: true,
  MonoPct: true,
  EosPct: true,
  BasoPct: true,
  Bandas: true,
  Mielo: true,
  Metamielo: true,
  Promielo: true,
  Blastos: true,
  Atipicos: true
};
var BH_COAG_FIELDS = { TP: true, TTP: true, INR: true, Fib: true, DD: true };
function familyOrderForSection(sectionKey) {
  if (sectionKey === "BH") return BH_PANEL_FAMILIES.slice();
  return GENERIC_PANEL_FAMILIES.slice();
}
function migratePanelFamilyKey(sectionKey, familyKey) {
  var fam = String(familyKey || "");
  if (sectionKey !== "BH") return fam;
  if (fam === "percent-rbc") return "bh-quality";
  if (fam === "percent-diff" || fam === "bh-diff") return "bh-diff-manual";
  if (fam === "absolute") return "bh-absolute";
  return fam;
}
function classifyTendPanelFamily(sectionKey, fieldKey, unit) {
  var fk = String(fieldKey || "").trim();
  if (sectionKey === "GASES") return "gases";
  if (sectionKey === "BH") {
    if (BH_COAG_FIELDS[fk]) return "bh-coag";
    if (BH_DIFF_FIELDS[fk] || /Pct$/i.test(fk)) return "bh-diff-manual";
    if (BH_QUALITY_FIELDS[fk] || isErythrocytePercentField(fk)) return "bh-quality";
    if (BH_ABSOLUTE_FIELDS[fk]) return "bh-absolute";
    var u = String(unit || "").trim();
    if (u === "%") return "bh-quality";
    return "bh-absolute";
  }
  if (/Pct$/i.test(fk)) return "percent-diff";
  if (isErythrocytePercentField(fk)) return "percent-rbc";
  var u2 = String(unit || "").trim();
  if (u2 === "%" && !/Pct$/i.test(fk)) return "percent-rbc";
  return "absolute";
}
function isPercentPanelFamily(family) {
  return family === "percent-diff" || family === "percent-rbc" || family === "bh-diff-manual" || family === "bh-diff" || family === "bh-quality";
}
function colKeyForTrendSet(set) {
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  return typeof ms === "number" && isFinite(ms) ? "t:" + ms : "f:" + String(set.fecha) + "|h:" + normalizeHoraLabHistory(set.hora);
}
function trendDayKey(set) {
  if (!set || set.fecha === "Anterior") return "anterior";
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms === "number" && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  return "f:" + normalizeFechaLabHistory(set.fecha);
}
function buildTrendColumnTimeVisibility(columns) {
  var byDay = /* @__PURE__ */ Object.create(null);
  (columns || []).forEach(function(set) {
    var dk = trendDayKey(set);
    if (!byDay[dk]) byDay[dk] = [];
    byDay[dk].push(normalizeHoraLabHistory(set.hora));
  });
  var showTime = /* @__PURE__ */ Object.create(null);
  (columns || []).forEach(function(set) {
    var ck = colKeyForTrendSet(set);
    var horasOnDay = byDay[trendDayKey(set)] || [];
    if (horasOnDay.length < 2) {
      showTime[ck] = false;
      return;
    }
    var distinct = /* @__PURE__ */ Object.create(null);
    horasOnDay.forEach(function(h) {
      distinct[h || ""] = true;
    });
    showTime[ck] = Object.keys(distinct).length >= 2;
  });
  return showTime;
}
function formatTrendColumnHeader(set, columns, opts) {
  if (!set) return "";
  if (set.fecha === "Anterior") return "Anterior";
  var cols = columns && columns.length ? columns : [set];
  var vis = opts && opts.timeVisibility || buildTrendColumnTimeVisibility(cols);
  var ck = colKeyForTrendSet(set);
  var showTime = !!vis[ck];
  var date = normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim();
  var hora = normalizeHoraLabHistory(set.hora);
  if (showTime && hora) return date + " " + hora.slice(0, 5);
  return date;
}
function formatTendSeriesLabel(cardTitle, fieldKey, unit) {
  var name = String(cardTitle || fieldKey || "").trim();
  var u = String(unit || "").trim();
  if (u === "%" && /%\s*$/.test(name)) {
    name = name.replace(/\s*%+\s*$/, "").trim();
  }
  return { name: name || fieldKey, unit: u };
}
function buildSectionTableModel(historyAsc, sectionKey, catalogSpecs, getValue) {
  var colSets = [];
  var seenCol = /* @__PURE__ */ Object.create(null);
  historyAsc.forEach(function(set) {
    var ms = parseFechaLabToMs(set.fecha, set.hora);
    var colKey = typeof ms === "number" && isFinite(ms) ? "t:" + ms : "f:" + set.fecha + "|h:" + normalizeHoraLabHistory(set.hora);
    if (seenCol[colKey]) return;
    var hasAny = catalogSpecs.some(function(sp) {
      return getValue(set, sp.fieldKey) != null;
    });
    if (!hasAny) return;
    seenCol[colKey] = true;
    colSets.push(set);
  });
  var rows = catalogSpecs.map(function(sp) {
    return {
      fieldKey: sp.fieldKey,
      label: sp.cardTitle || sp.fieldKey,
      unit: sp.unit || "",
      values: colSets.map(function(set) {
        return getValue(set, sp.fieldKey);
      })
    };
  });
  return { columns: colSets, rows };
}

// public/js/manejo-todo-dismiss.mjs
var LS_KEY = "rpc-manejo-todo-dismiss";
function readMap() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    var map = JSON.parse(raw);
    return map && typeof map === "object" ? map : {};
  } catch (_e) {
    return {};
  }
}
function writeMap(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map || {}));
  } catch (_e) {
  }
}
function manejoTodoDismissKey(ruleId, labFecha) {
  var rid = String(ruleId || "").trim();
  if (rid.indexOf("manejo:") !== 0) rid = "manejo:" + rid;
  return rid + "|" + String(labFecha || "").trim();
}
function isManejoTodoDismissed(patientId, ruleId, labFecha) {
  if (!patientId || !ruleId) return false;
  var map = readMap();
  var list = Array.isArray(map[patientId]) ? map[patientId] : [];
  return list.indexOf(manejoTodoDismissKey(ruleId, labFecha)) >= 0;
}
function dismissManejoTodo(patientId, ruleId, labFecha) {
  if (!patientId || !ruleId) return;
  var key = manejoTodoDismissKey(ruleId, labFecha);
  var map = readMap();
  var list = Array.isArray(map[patientId]) ? map[patientId].slice() : [];
  if (list.indexOf(key) < 0) list.push(key);
  map[patientId] = list;
  writeMap(map);
}
function isRepoTodo(todo) {
  if (!todo) return false;
  var rid = String(todo.labRuleId || "");
  if (rid.indexOf("manejo:") === 0) return true;
  return /^Repo /i.test(String(todo.text || ""));
}
function dismissManejoTodoFromTodo(patientId, todo) {
  if (!patientId || !todo) return;
  var rid = String(todo.labRuleId || "");
  var fecha = String(todo.labFecha || "").trim();
  if (rid.indexOf("manejo:") === 0) {
    dismissManejoTodo(patientId, rid, fecha);
    return;
  }
  if (/^Repo /i.test(String(todo.text || ""))) {
    var map = readMap();
    var list = Array.isArray(map[patientId]) ? map[patientId].slice() : [];
    var legacyKey = "legacy:" + fecha + "|" + String(todo.text || "").trim().slice(0, 200);
    if (list.indexOf(legacyKey) < 0) list.push(legacyKey);
    map[patientId] = list;
    writeMap(map);
  }
}
function isLegacyRepoDismissed(patientId, todo) {
  if (!patientId || !todo) return false;
  var map = readMap();
  var list = Array.isArray(map[patientId]) ? map[patientId] : [];
  var legacyKey = "legacy:" + String(todo.labFecha || "").trim() + "|" + String(todo.text || "").trim().slice(0, 200);
  return list.indexOf(legacyKey) >= 0;
}
function shouldAllowManejoTodo(patientId, ruleId, labFecha, todos) {
  if (isManejoTodoDismissed(patientId, ruleId, labFecha)) return false;
  var scoped = String(ruleId || "").trim();
  if (scoped.indexOf("manejo:") !== 0) scoped = "manejo:" + scoped;
  return shouldAddLabSuggestionTodo(todos, scoped, labFecha);
}
function filterTodosRespectingDismissals(patientId, todos) {
  return (todos || []).filter(function(t) {
    if (!t || t.completed || !isRepoTodo(t)) return true;
    if (isLegacyRepoDismissed(patientId, t)) return false;
    var rid = String(t.labRuleId || "");
    if (rid.indexOf("manejo:") === 0 && isManejoTodoDismissed(patientId, rid, t.labFecha)) return false;
    return true;
  });
}
function purgeBlockedManejoTodosForPatient(patientId, storageApi) {
  if (!patientId || !storageApi || typeof storageApi.getTodos !== "function") return false;
  var todos = storageApi.getTodos(patientId);
  if (!todos.length) return false;
  var next = filterTodosRespectingDismissals(patientId, todos);
  if (next.length === todos.length) return false;
  storageApi.saveTodos(patientId, next);
  return true;
}
function tryClearManejoPendingForPatient(patient, labHistorySets) {
  if (!patient || !patient.manejoPending) return false;
  var labSetId = String(patient.manejoPending.labSetId || "");
  var sets = sortLabHistoryChronological(labHistorySets || []);
  var set = sets.find(function(s) {
    return s && String(s.id) === labSetId;
  }) || sets[0];
  if (!set) {
    patient.manejoPending = null;
    return true;
  }
  var fecha = normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim();
  var evalOut = evaluateElectrolyteManejo({
    parsedBySection: set.parsedBySection,
    parsed: set.parsed,
    patient,
    refsBySection: set.refsBySection,
    labSetId: set.id != null ? String(set.id) : "",
    labFecha: fecha
  });
  if (shouldClearManejoPendingForDismissals(patient, sets, evalOut, fecha)) {
    patient.manejoPending = null;
    return true;
  }
  return false;
}
function syncManejoTodoDismissalsOnBoot(patients2, labHistory2, storageApi) {
  var any = false;
  for (var i = 0; i < (patients2 || []).length; i += 1) {
    var p = patients2[i];
    if (!p || !p.id || String(p.id).indexOf("demo-") === 0) continue;
    if (purgeBlockedManejoTodosForPatient(p.id, storageApi)) any = true;
    var hist = labHistory2 && labHistory2[p.id] ? labHistory2[p.id] : [];
    if (tryClearManejoPendingForPatient(p, hist)) any = true;
  }
  return any;
}
function shouldClearManejoPendingForDismissals(patient, labHistorySets, evalOut, labFechaNorm) {
  if (!patient || !patient.id || !patient.manejoPending) return false;
  if (!evalOut || !evalOut.rows || !evalOut.rows.length) return true;
  var pid = String(patient.id);
  var fecha = String(labFechaNorm || "").trim();
  for (var r = 0; r < evalOut.rows.length; r += 1) {
    var row = evalOut.rows[r];
    if (!row) continue;
    if (!isManejoTodoDismissed(pid, "manejo:" + String(row.ruleId || ""), fecha)) return false;
  }
  return true;
}

// public/js/clinical-product-policy.mjs
function isClinicalDecisionGuidanceHidden() {
  return true;
}
function isManejoTabGloballyHidden() {
  return isClinicalDecisionGuidanceHidden();
}
function areElectrolyteReplacementSuggestionsHidden() {
  return isClinicalDecisionGuidanceHidden();
}
function areLabClinicalSuggestionsHidden() {
  return isClinicalDecisionGuidanceHidden();
}
function isHistoriaClinicaSafetyHidden() {
  return isClinicalDecisionGuidanceHidden();
}
function isVpoRiskCalculationDisabled() {
  return isClinicalDecisionGuidanceHidden();
}
function isVpoPeriopMedGuidanceHidden() {
  return isClinicalDecisionGuidanceHidden();
}
function isVpoDxInferenceHidden() {
  return isClinicalDecisionGuidanceHidden();
}
function isClinicoUnlockDisabled() {
  return isClinicalDecisionGuidanceHidden();
}
function isAbgAnalysisHidden() {
  return isClinicalDecisionGuidanceHidden();
}

// public/js/clinico-access.mjs
var CLINICO_UNLOCK_PHRASE = "entiendo, usare mi criterio clincio";
var R3_EXTENDED_SERVICES = /* @__PURE__ */ new Set(["torre hu", "eme", "ux"]);
function normalizeClinicoUnlockPhrase(text) {
  return String(text || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
function matchesClinicoUnlockPhrase(text) {
  return normalizeClinicoUnlockPhrase(text) === normalizeClinicoUnlockPhrase(CLINICO_UNLOCK_PHRASE);
}
function isClinicoUnlocked(settings) {
  if (!settings || typeof settings !== "object") return false;
  if (settings.clinicoUnlocked) return true;
  if (settings.hideManejoSection === false && !settings.hideClinicoTab) return true;
  return false;
}
function isClinicoAccessHidden(settings) {
  if (!isClinicoUnlocked(settings)) return true;
  if (!settings) return true;
  return !!(settings.hideManejoSection || settings.hideClinicoTab);
}
var _unlockSuccessCb = null;
function openClinicoUnlockModal(onSuccess) {
  if (isClinicoUnlockDisabled()) return;
  var backdrop = document.getElementById("clinico-unlock-backdrop");
  var input = document.getElementById("clinico-unlock-input");
  var err = document.getElementById("clinico-unlock-error");
  if (!backdrop || !input) {
    if (typeof onSuccess === "function") onSuccess();
    return;
  }
  _unlockSuccessCb = typeof onSuccess === "function" ? onSuccess : null;
  input.value = "";
  if (err) {
    err.textContent = "";
    err.hidden = true;
  }
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  window.setTimeout(function() {
    input.focus();
  }, 40);
}
function closeClinicoUnlockModal() {
  var backdrop = document.getElementById("clinico-unlock-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  _unlockSuccessCb = null;
}
function confirmClinicoUnlock() {
  if (isClinicoUnlockDisabled()) return;
  var input = document.getElementById("clinico-unlock-input");
  var err = document.getElementById("clinico-unlock-error");
  if (!input) return;
  if (!matchesClinicoUnlockPhrase(input.value)) {
    if (err) {
      err.textContent = "Escribe exactamente: \xAB" + CLINICO_UNLOCK_PHRASE + "\xBB (sin comillas).";
      err.hidden = false;
    }
    input.focus();
    input.select();
    return;
  }
  var cb = _unlockSuccessCb;
  closeClinicoUnlockModal();
  if (cb) cb();
}
function normalizeServiceKey(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}
var CYCLE_CONFIGS = {
  sala_r2: { letters: ["A", "B", "C", "D", "E", "F"], length: 6 },
  sala_r1: { letters: ["A1", "B1", "C1", "D1", "A2", "B2", "C2", "D2"], length: 8 },
  default: { letters: ["A", "B", "C", "D"], length: 4 }
};
function getCycleConfig(service, rank) {
  const svc = normalizeServiceKey(service);
  if (svc.includes("sala")) {
    if (rank === "R2") return CYCLE_CONFIGS.sala_r2;
    if (rank === "R1") return CYCLE_CONFIGS.sala_r1;
  }
  return CYCLE_CONFIGS.default;
}
function getCycleLettersForTeamCreate(service, rank, r1LineIndex = 0) {
  const cfg = getCycleConfig(service, rank);
  const svc = normalizeServiceKey(service);
  if (rank === "R1" && svc.includes("sala")) {
    const half = Math.floor(cfg.letters.length / 2);
    return r1LineIndex === 1 ? cfg.letters.slice(half) : cfg.letters.slice(0, half);
  }
  return cfg.letters;
}
function getCycleFieldMetaForTeamCreate(service, rank, r1LineIndex = 0) {
  const svc = normalizeServiceKey(service);
  if (svc.includes("sala") && rank === "R2") {
    return {
      label: "Tu letra de ciclo (R2)",
      hint: "Cada equipo de sala tiene tres puestos: R2 (A\u2013F), R1 primera l\xEDnea (A1\u2013D1) y R1 segunda l\xEDnea (A2\u2013D2). Como R2 eliges tu letra A\u2013F."
    };
  }
  if (svc.includes("sala") && rank === "R1") {
    const line = r1LineIndex === 1 ? "segunda l\xEDnea (A2\u2013D2)" : "primera l\xEDnea (A1\u2013D1)";
    return {
      label: `Tu subciclo R1 \xB7 ${line}`,
      hint: "No es la posici\xF3n del equipo completo: cada R1 lleva su subciclo (A1\u2013D1 o A2\u2013D2) dentro del mismo equipo de sala."
    };
  }
  return {
    label: "Posici\xF3n en ciclo",
    hint: "Letra de rotaci\xF3n para este servicio."
  };
}
function letterIndexForTeam(team, rank) {
  const frac = String(team?.sub_area_fraction || "").trim().toUpperCase();
  if (!frac) return -1;
  const cfg = getCycleConfig(team?.service, rank);
  return cfg.letters.indexOf(frac);
}
function isOnCallToday(team, rank, now) {
  const idx = letterIndexForTeam(team, rank);
  if (idx === -1) return false;
  const cfg = getCycleConfig(team?.service, rank);
  const d = now instanceof Date ? now : new Date(String(now));
  const dayOfMonth = d.getDate();
  return (dayOfMonth - 1) % cfg.length === idx;
}
function toMillis(value, fallbackIso) {
  if (value instanceof Date) return value.getTime();
  if (value != null && value !== "") return new Date(String(value)).getTime();
  if (fallbackIso) return new Date(String(fallbackIso)).getTime();
  return NaN;
}
function isIncomingPreviewWindow(cycle, now) {
  if (!cycle?.preview_start_at || !cycle?.effective_at) return false;
  const t = toMillis(now);
  const start = toMillis(cycle.preview_start_at);
  const end = toMillis(cycle.effective_at);
  if (!Number.isFinite(t) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return t >= start && t < end;
}
function extractSalaLetter(serviceOrArea) {
  const raw = String(serviceOrArea || "").trim();
  const match = raw.match(/Sala\s*([A-F])/i);
  if (match) return match[1].toUpperCase();
  const lone = raw.match(/^([A-F])$/i);
  return lone ? lone[1].toUpperCase() : "";
}
function salaLetterForTeamOrArea(teamOrPatient) {
  const frac = String(teamOrPatient?.sub_area_fraction || "").trim();
  const bare = frac.replace(/[0-9]+$/, "").toUpperCase();
  if (bare && /^[A-F]$/.test(bare)) return bare;
  const fromName = extractSalaLetter(teamOrPatient?.name || "");
  if (fromName) return fromName;
  return extractSalaLetter(teamOrPatient?.sub_area || teamOrPatient?.service || "");
}
function patientMatchesTeam(patient, team) {
  if (!patient || !team) return false;
  const patientSvc = normalizeServiceKey(patient.service);
  const teamSvc = normalizeServiceKey(team.service);
  if (patientSvc !== teamSvc && !(patientSvc.includes("sala") && teamSvc.includes("sala"))) {
    if (teamSvc.includes("sala") && (patientSvc.includes("sala") || extractSalaLetter(patient.service))) {
    } else if (patientSvc !== teamSvc) {
      return false;
    }
  }
  const frac = String(team.sub_area_fraction || "").trim();
  if (!frac) return true;
  const letter = frac.toUpperCase();
  const patientLetter = salaLetterForTeamOrArea(patient);
  if (patientLetter && patientLetter === letter) return true;
  const hay = `${patient.service || ""} ${patient.sub_area || ""}`;
  return hay.toUpperCase().includes(letter);
}
function getJoinedTeams(teams, userId) {
  const uid = String(userId || "");
  if (!uid) return [];
  return (teams || []).filter(
    (team) => (team.members || []).some((m) => String(m.user_id) === uid)
  );
}
function patientAssignedToTeam(patientId, assignments, joinedTeamIds) {
  const pid = String(patientId || "");
  return (assignments || []).some(
    (a) => String(a.patient_id) === pid && joinedTeamIds.has(String(a.team_id))
  );
}
function patientCoveredByGuardia(patientId, userId, guardias) {
  const uid = String(userId || "");
  return (guardias || []).some(
    (g) => String(g.patient_id) === String(patientId) && String(g.covering_user_id) === uid
  );
}
function isActiveGuardiaCoveringUser(userId, activeGuardia) {
  if (!activeGuardia || !userId) return false;
  return String(activeGuardia.covering_user_id || "") === String(userId);
}
function hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, salaLetter) {
  const letter = String(salaLetter || "").toUpperCase();
  if (!letter) return false;
  const salaTeams = (teams || []).filter(
    (t) => normalizeServiceKey(t.service).includes("sala") && salaLetterForTeamOrArea(t) === letter
  );
  if (!salaTeams.length) return false;
  const declared = new Set(
    (salaGuardiaToday || []).map((row) => String(row.team_id || ""))
  );
  return salaTeams.some((t) => declared.has(String(t.team_id || "")));
}
function computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, userId, now) {
  const uid = String(userId || "");
  if (!uid) return false;
  const d = now instanceof Date ? now : new Date(String(now));
  const r2Cfg = CYCLE_CONFIGS.sala_r2;
  const hasDeficitLetter = r2Cfg.letters.some(
    (letter) => !hasSalaGuardiaDeclaredForLetter(salaGuardiaToday, teams, letter)
  );
  if (!hasDeficitLetter) return false;
  return (teams || []).some((team) => {
    if (!normalizeServiceKey(team.service).includes("sala")) return false;
    if (!isOnCallToday(team, "R2", d)) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return (salaGuardiaToday || []).some(
      (g) => String(g.team_id) === String(team.team_id) && String(g.user_id) === uid
    );
  });
}
function salaOnCallR1(teams, sala, now) {
  const d = now instanceof Date ? now : new Date(String(now));
  return (teams || []).filter((t) => t.sala === sala).filter((t) => isOnCallToday(t, "R1", d)).flatMap(
    (t) => (t.members || []).filter((m) => m.rank === "R1").map((m) => ({ team_id: t.team_id, user_id: m.user_id }))
  );
}
function salaOnCallR2(teams, now) {
  const d = now instanceof Date ? now : new Date(String(now));
  const r2Teams = (teams || []).filter((t) => isOnCallToday(t, "R2", d));
  return r2Teams.flatMap(
    (t) => (t.members || []).filter((m) => m.rank === "R2").map((m) => ({ team_id: t.team_id, user_id: m.user_id }))
  );
}
function resolvePatientSala(patient) {
  const explicit = String(patient?.sala || "").trim();
  if (explicit) return explicit;
  const letter = extractSalaLetter(
    patient?.servicio || patient?.service || patient?.area || patient?.sub_area || ""
  );
  if (letter === "1") return "Sala 1";
  if (letter === "2") return "Sala 2";
  if (letter === "E") return "Sala E";
  return "";
}
function patientInUserSala(patient, userSala) {
  const ps = resolvePatientSala(patient);
  return ps !== "" && ps === String(userSala || "").trim();
}
function stampPatientClinicalSala(patient, user) {
  if (!patient || typeof patient !== "object") return patient;
  const profileSala = String(user?.sala || "").trim();
  if (profileSala) {
    patient.sala = profileSala;
    return patient;
  }
  const inferred = resolvePatientSala(patient);
  if (inferred) patient.sala = inferred;
  return patient;
}
function migratePatientsClinicalSala(patients2, user) {
  if (!Array.isArray(patients2) || !user) return 0;
  let migrated = 0;
  for (const patient of patients2) {
    if (!patient || typeof patient !== "object" || patient.isDemo) continue;
    if (String(patient.sala || "").trim()) continue;
    stampPatientClinicalSala(patient, user);
    if (String(patient.sala || "").trim()) migrated += 1;
  }
  return migrated;
}
function teamForMemberCycle(team, userId) {
  if (!team || !userId) return team;
  const member = (team.members || []).find((m) => String(m.user_id) === String(userId));
  const frac = String(member?.sub_area_fraction || "").trim();
  if (!frac) {
    if (String(member?.rank || "") === "R2") {
      const teamFrac = String(team.sub_area_fraction || "").trim();
      if (teamFrac) return { ...team, sub_area_fraction: teamFrac };
    }
    return team;
  }
  return { ...team, sub_area_fraction: frac };
}
function inferMembershipCycleForJoin(team, userRank) {
  const rank = String(userRank || "R1");
  const svc = normalizeServiceKey(team?.service);
  if (!svc.includes("sala")) {
    const letters = getCycleLettersForTeamCreate(team?.service, rank);
    return letters[0] || "A";
  }
  if (rank === "R2") {
    return getCycleLettersForTeamCreate("Sala", "R2")[0] || "A";
  }
  const used = new Set(
    (team?.members || []).filter((m) => String(m?.rank) === "R1").map((m) => String(m?.sub_area_fraction || "").trim()).filter(Boolean)
  );
  for (const letter of getCycleLettersForTeamCreate("Sala", "R1", 0)) {
    if (!used.has(letter)) return letter;
  }
  for (const letter of getCycleLettersForTeamCreate("Sala", "R1", 1)) {
    if (!used.has(letter)) return letter;
  }
  return "A1";
}
function resolveMembershipCycleForUser(team, userId, userRank) {
  const uid = String(userId || "").trim();
  if (uid && team) {
    const member = (team.members || []).find((m) => String(m.user_id || "") === uid);
    const existing = String(member?.sub_area_fraction || "").trim();
    if (existing) return existing;
  }
  return inferMembershipCycleForJoin(team || {}, userRank);
}
function formatMemberCycleLabel(member) {
  const frac = String(member?.sub_area_fraction || "").trim();
  if (!frac) return "";
  const rank = String(member?.rank || "");
  if (rank === "R2" || /^[A-F]$/i.test(frac)) return `Ciclo R2 \xB7 ${frac}`;
  if (rank === "R1" || /[12]$/i.test(frac)) return `Subciclo R1 \xB7 ${frac}`;
  return `Ciclo \xB7 ${frac}`;
}
function patientMatchesAnyJoinedTeam(patient, joinedTeams, userId) {
  const mapped = {
    id: patient?.id,
    service: String(patient?.service || patient?.servicio || ""),
    sub_area: String(patient?.sub_area || patient?.area || ""),
    interconsult_type: patient?.interconsult_type,
    sala: patient?.sala
  };
  return (joinedTeams || []).some((team) => {
    const scoped = userId ? teamForMemberCycle(team, userId) : team;
    return patientMatchesTeam(mapped, scoped);
  });
}
function r3ExtendedStructuralAccess(user, patient, joinedTeams) {
  const uid = String(user?.user_id || "");
  return (joinedTeams || []).some((team) => {
    const svc = normalizeServiceKey(team?.service);
    const isExtended = [...R3_EXTENDED_SERVICES].some((s) => svc.includes(s));
    if (!isExtended) return false;
    if (!(team.members || []).some((m) => String(m.user_id) === uid)) return false;
    return patientMatchesTeam(
      {
        id: patient?.id,
        service: String(patient?.service || patient?.servicio || ""),
        sub_area: String(patient?.sub_area || patient?.area || "")
      },
      team
    );
  });
}
function isPatientReadableInClinicalScope(user, patient, activeGuardia = null, context = null) {
  const scope = evaluateClinicalScope(user, patient, activeGuardia, context);
  return scope.readable === true;
}
function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  const ctx = context && typeof context === "object" ? context : {};
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const guardias = Array.isArray(ctx.guardias) ? ctx.guardias : [];
  const cycle = ctx.cycle ?? null;
  const guardiaMode = !!ctx.guardiaMode;
  const now = ctx.now != null ? ctx.now instanceof Date ? ctx.now : new Date(String(ctx.now)) : /* @__PURE__ */ new Date();
  const userId = String(currentUser?.user_id || "");
  const rank = String(currentUser?.rank || "");
  const patientId = String(targetPatient?.id || "");
  const userSala = String(currentUser?.sala || "");
  const deny = (reasoning, extra = {}) => ({
    readable: false,
    writable: false,
    reasoning,
    audit: { userId: currentUser?.user_id, rank: currentUser?.rank, patientId: targetPatient?.id, timestamp: now.toISOString() },
    ...extra
  });
  const allow = (reasoning, readable = true, writable = true, extra = {}) => ({
    readable,
    writable,
    reasoning,
    audit: { userId: currentUser?.user_id, rank: currentUser?.rank, patientId: targetPatient?.id, timestamp: now.toISOString() },
    ...extra
  });
  if (!currentUser?.user_id || !targetPatient?.id) {
    return deny("Usuario o paciente no identificado");
  }
  if (currentUser.is_program_admin === 1 || currentUser.is_program_admin === true || rank === "Admin") {
    return allow("Privilegios admin: acceso completo");
  }
  if (isActiveGuardiaCoveringUser(userId, activeGuardia)) {
    return allow("Guardia activa: cobertura asignada");
  }
  if (isIncomingPreviewWindow(cycle, now)) {
    const incoming = assignments.find((a) => String(a.patient_id) === patientId);
    if (incoming) {
      const effectiveMs = toMillis(incoming.effective_at);
      const nowMs = toMillis(now);
      if (Number.isFinite(effectiveMs) && Number.isFinite(nowMs) && nowMs < effectiveMs) {
        return allow(
          "Vista previa Incoming: lectura permitida hasta vigencia",
          true,
          false,
          { incomingPreview: true }
        );
      }
    }
  }
  const joinedTeams = getJoinedTeams(teams, userId);
  const joinedTeamIds = new Set(joinedTeams.map((t) => String(t.team_id)));
  if (guardiaMode) {
    if (rank === "R1") {
      const patientSala = targetPatient?.sala || "";
      if (patientSala && patientSala === userSala) {
        return allow("Modo Guardia R1: visibilidad de Sala completa", true, false);
      }
      return deny("Modo Guardia R1: fuera de mi Sala");
    }
    if (rank === "R2") {
      if (patientCoveredByGuardia(patientId, userId, guardias)) {
        return allow("Modo Guardia R2: paciente entregado", true, false);
      }
      return deny("Modo Guardia R2: sin entrega recibida");
    }
    if (rank === "R4") {
      const svc = normalizeServiceKey(targetPatient?.service);
      if (svc.includes("sala") || svc.includes("torre")) {
        return allow("Modo Guardia R4: cobertura Sala + Torre", true, false);
      }
      return deny("Modo Guardia R4: fuera de dominio");
    }
    return deny("Modo Guardia: rango sin cobertura");
  }
  if (rank === "R4") {
    return allow("R4: acceso global");
  }
  if (patientInUserSala(targetPatient, userSala)) {
    return allow("Censo compartido de sala");
  }
  if (rank === "R1") {
    return deny("R1: fuera de mi sala");
  }
  if (rank === "R2") {
    if (patientCoveredByGuardia(patientId, userId, guardias)) {
      return allow("R2: paciente entregado");
    }
    if (patientMatchesAnyJoinedTeam(targetPatient, joinedTeams, userId)) {
      return allow("R2: paciente de mi equipo");
    }
    return deny("R2: sin equipo ni entrega");
  }
  if (rank === "R3") {
    if (patientMatchesAnyJoinedTeam(targetPatient, joinedTeams, userId)) {
      return allow("R3: paciente de mi equipo");
    }
    if (r3ExtendedStructuralAccess(currentUser, targetPatient, joinedTeams)) {
      return allow("R3: servicio extendido");
    }
    return deny("R3: fuera de alcance");
  }
  if (patientAssignedToTeam(patientId, assignments, joinedTeamIds)) {
    return allow("Paciente del equipo (asignaci\xF3n)");
  }
  if (patientCoveredByGuardia(patientId, userId, guardias)) {
    return allow("Paciente entregado (handoff)");
  }
  return deny("Fuera de alcance");
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
  } catch (_e) {
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
  setPatients(storage.getPatients());
  setNotes(storage.getNotes());
  setIndicaciones(storage.getIndicaciones());
  setLabHistory(storage.getLabHistory());
  setMedRecetaByPatient(storage.getMedRecetaByPatient());
  setMedPharmProfileByPatient(storage.getMedPharmProfileByPatient());
  setRecetaHuByPatient(storage.getRecetaHuByPatient());
  listadoProblemas = storage.getListadoProblemas();
  vpoByPatient = storage.getVpoByPatient();
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
  }
  if (syncManejoTodoDismissalsOnBoot(patients, labHistory, storage)) {
    saveState({ immediate: true });
  } else if (repairLabHistoryInMemory() || monitoreoMigrated || salaMigrated > 0) {
    saveState({ immediate: true });
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
  if (_saveInFlight) return _saveInFlight;
  return runSaveNow();
}

export {
  CLINICAL_LS_KEYS,
  isDbMode,
  normalizeLabHistoryPatientSets,
  storage,
  incrementMedItemsDiaTratamiento,
  looksLikeSomeMedicationPaste,
  parseMedicationPaste,
  resolveFechaActualizacion,
  applyMedCatalogOverlay,
  dosisBeforeSlash,
  formatMedicationEgresoLine,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  classifyMedicationSoapCategory,
  applySomePharmCatalogOverlay,
  listSomePharmFilterLabels,
  isSomePharmCategoryLabel,
  rowSomePharmCategory,
  assignSomePharmCategory,
  assignSomePharmCategories,
  toEaSalidaText,
  formatBalanceLive,
  parseIoIngresoField,
  isIoNumericValue,
  normalizeEvacAbbrev,
  parseIoEvacField,
  normalizeIoNcAbbrev,
  parseIoEgresoLine,
  diuresisValueFromParts,
  ioNumericEgressTotal,
  computeIoBalanceFromIngEgr,
  formatEgresoPartForText,
  serializeEgrPartsToFormText,
  formatEvacForText,
  formatIoClauseForSoap,
  getVitalExtraStorageKey,
  getDefaultRegistroRecordedAt,
  getGlucometriaRegistroWindow,
  gluPointMs,
  isGluPointInRegistroWindow,
  collectGlucometriasForRegistroWindow,
  MAX_VITAL_READINGS_PER_DAY,
  MAX_VITAL_LAYERS_IN_FORM,
  vitalSeriesFromMedicion,
  vitalSeriesToLegacyFields,
  countVitalReadingsInRegistroWindow,
  collectBombaInsulinaForRegistroWindow,
  MED_FIELD_KEYS,
  isIoNumericValue2,
  ensureMonitoreo,
  migratePatientMonitoreo,
  mergePatientMonitoreoFromImported,
  deriveSnapshot,
  balanceTurno,
  balanceGlobalHistorico,
  appendMedicion,
  removeMedicion,
  mergeMonitoreo,
  resolveDietWeightKg,
  computeDietKcalTotal,
  computeDietKcalKgFromTotal,
  syncDietKcalFromWeight,
  evaluateLabSuggestions,
  filterNewLabSuggestions,
  VANCO_LOAD_MAX_MG,
  VANCO_MAINT_MAX_MG,
  MEQ_PER_AMPOULE_8_4_PCT,
  LEVETIRACETAM_LOAD_MAX_MG,
  INSULIN_MAX_U_PER_HR,
  HYPERTONIC_MAX_ML,
  ALBUMIN_MAX_GRAMS,
  PROPOFOL_MAX_MG_PER_KG_H,
  requirePositiveFinite,
  clamp,
  toSomeUpper,
  formatSomeBlock,
  parsePatientWeightKg,
  evaluateElectrolyteManejo,
  tendEligibleSectionKey,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  parseFechaLabToMs,
  sortLabHistoryChronological,
  getSetTrendValueForSeries,
  columnSetsForFields,
  dedupeTrendSetsForSeries,
  buildTrendAxisMeta,
  buildTendChartLabels,
  BH_PANEL_FAMILIES,
  familyOrderForSection,
  migratePanelFamilyKey,
  classifyTendPanelFamily,
  isPercentPanelFamily,
  colKeyForTrendSet,
  formatTrendColumnHeader,
  formatTendSeriesLabel,
  buildSectionTableModel,
  isManejoTodoDismissed,
  dismissManejoTodoFromTodo,
  shouldAllowManejoTodo,
  filterTodosRespectingDismissals,
  shouldClearManejoPendingForDismissals,
  isClinicalDecisionGuidanceHidden,
  isManejoTabGloballyHidden,
  areElectrolyteReplacementSuggestionsHidden,
  areLabClinicalSuggestionsHidden,
  isHistoriaClinicaSafetyHidden,
  isVpoRiskCalculationDisabled,
  isVpoPeriopMedGuidanceHidden,
  isVpoDxInferenceHidden,
  isAbgAnalysisHidden,
  isClinicoUnlocked,
  isClinicoAccessHidden,
  openClinicoUnlockModal,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  isOnCallToday,
  patientMatchesTeam,
  getJoinedTeams,
  computeSalaAbcdefDeficitWrite,
  salaOnCallR1,
  salaOnCallR2,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
  teamForMemberCycle,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
  isPatientReadableInClinicalScope,
  evaluateClinicalScope,
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
//# sourceMappingURL=/js/chunks/chunk-NWJJI23U.js.map
