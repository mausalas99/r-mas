import {
  appStateFieldsToBlobs,
  hydrateStorageCache,
  isDbMode,
  persistSaveAll
} from "/js/chunks/chunk-K6QXHWFW.js";
import {
  migratePatientsClinicalSala
} from "/js/chunks/chunk-ZRVSNZK5.js";

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
  /** Last ward shift PIN (6 digits) — used to re-find host after Wi‑Fi change. */
  getLanShiftPin() {
    try {
      const pin = String(localStorage.getItem("rpc-lan-shift-pin") || "").trim();
      return /^\d{6}$/.test(pin) ? pin : "";
    } catch (_e) {
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
    } catch (_e2) {
    }
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
var STANDARD_GLUCOMETRIA_TIMES = ["08:00", "16:00", "00:00"];
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
  if (!medicion || typeof medicion !== "object") return { ok: false, error: "empty" };
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
  if (repairLabHistoryInMemory() || monitoreoMigrated || salaMigrated > 0) {
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
  STANDARD_GLUCOMETRIA_TIMES,
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
//# sourceMappingURL=/js/chunks/chunk-434Q5TP4.js.map
