// storage.js — Data persistence layer
// Wraps localStorage with consistent interface

import {
  estimateRpcPersistBytes,
  readStorageQuotaEstimate,
  assessStoragePressure,
  isQuotaExceededError,
} from './storage-quota.mjs';
import {
  isDbMode,
  hydrateStorageCache,
  persistSaveAll,
  appStateFieldsToBlobs,
} from './db-storage-bridge.mjs';

/** @type {Record<string, string> | null} blob_key → JSON string when SQLCipher desktop mode */
let _blobCache = null;

let _cachedQuotaEstimate = null;
let _quotaEstimateTs = 0;
const QUOTA_CACHE_MS = 15000;

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
  if (raw == null || raw === '') return fallback;
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
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function blobCacheRaw(blobKey) {
  if (!_blobCache) return undefined;
  var raw = _blobCache[blobKey];
  if (raw == null) return null;
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

function readClinicalBlob(blobKey, lsKey, parseFromRaw) {
  if (_blobCache) {
    return parseFromRaw(blobCacheRaw(blobKey));
  }
  return parseFromRaw(localStorage.getItem(lsKey));
}

function readTodosMap() {
  return readClinicalBlob('todos', 'rpc-todos', safeParseObject);
}

/** @param {Record<string, unknown>} map */
function writeTodosMap(map) {
  const json = JSON.stringify(map);
  if (_blobCache) {
    _blobCache.todos = json;
    if (isDbMode()) {
      void persistSaveAll(
        { todos: map },
        { eventType: 'clinical.todos_save', meta: { source: 'storage.saveTodos' } }
      );
      return;
    }
  }
  localStorage.setItem('rpc-todos', json);
}

/**
 * Load clinical blobs from SQLCipher once (no-op if locked, not db mode, or already hydrated).
 * @returns {Promise<void>}
 */
export async function ensureStorageHydrated() {
  if (!isDbMode()) return;
  if (_blobCache) return;
  if (
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.dbStatus === 'function'
  ) {
    try {
      var st = await window.electronAPI.dbStatus();
      if (st && st.state === 'locked') return;
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

/** @internal tests */
export function clearBlobCacheForTests() {
  _blobCache = null;
}

export function isMeaningfulLabHistorySet(set) {
  if (!set || typeof set !== 'object') return false;
  if (set.id === 'migrated-anterior' || set.id === 'migrated-recent') return true;
  if (set.sourceText && String(set.sourceText).trim()) return true;
  if (Array.isArray(set.resLabs) && set.resLabs.length) return true;
  return false;
}

function ensureLabSetId(set, index, used) {
  var raw = set.id != null ? String(set.id).trim() : '';
  if (raw && used.indexOf(raw) === -1) {
    used.push(raw);
    set.id = raw;
    return;
  }
  var base = raw || 'set-' + String(index);
  var id = base;
  var n = 2;
  while (used.indexOf(id) !== -1) {
    id = base + '-' + n;
    n += 1;
  }
  set.id = id;
  used.push(id);
}

/** Asegura arreglo de conjuntos válidos, con id único y sin basura vacía. */
export function normalizeLabHistoryPatientSets(value) {
  var list = [];
  if (value == null) return list;
  if (Array.isArray(value)) list = value.slice();
  else if (typeof value === 'object') {
    if (Array.isArray(value.resLabs) || value.id != null || value.sourceText != null) {
      list = [value];
    } else {
      var keys = Object.keys(value);
      if (keys.length) {
        if (keys.every(function (k) { return /^\d+$/.test(k); })) {
          list = keys
            .sort(function (a, b) { return Number(a) - Number(b); })
            .map(function (k) { return value[k]; });
        } else {
          list = keys.map(function (k) {
            var item = value[k];
            if (!item || typeof item !== 'object') return null;
            if (item.id == null || String(item.id).trim() === '') item.id = k;
            return item;
          });
        }
      }
    }
  }
  var used = [];
  var out = [];
  list.forEach(function (set, index) {
    if (!isMeaningfulLabHistorySet(set)) return;
    var copy = set;
    if (typeof set === 'object') {
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
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return defaultVal;
}

/** Normaliza evento persistente desde JSON crudo (omite inválidos / demo paciente). */
function normalizeScheduledProcedureStored(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id != null ? raw.id : '').trim();
  const patientId = String(raw.patientId != null ? raw.patientId : '').trim();
  const procedure = String(raw.procedure != null ? raw.procedure : '').trim();
  const location = String(raw.location != null ? raw.location : '').trim();
  if (!id || !patientId || !procedure || !location) return null;
  if (patientId.indexOf('demo-') === 0) return null;
  const start = String(raw.start != null ? raw.start : '').trim();
  if (!start) return null;
  const ds = Date.parse(start);
  if (!Number.isFinite(ds)) return null;
  let createdAt = String(raw.createdAt != null ? raw.createdAt : '').trim();
  if (!createdAt || !Number.isFinite(Date.parse(createdAt))) {
    createdAt = new Date(ds).toISOString();
  }
  let updatedAt = String(raw.updatedAt != null ? raw.updatedAt : '').trim();
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
    updatedAt,
  };
}

export const storage = {
  /**
   * Get all patients from localStorage
   * @returns {Array} Array of patient objects
   */
  getPatients() {
    return readClinicalBlob('patients', 'rpc-patients', safeParseArray);
  },

  /**
   * Save patients to localStorage (filters out demo patients)
   * @param {Array} patients - Array of patient objects
   */
  savePatients(patients) {
    const filtered = patients.filter(p => !p.isDemo);
    localStorage.setItem('rpc-patients', JSON.stringify(filtered));
  },

  /**
   * Get all notes from localStorage
   * @returns {Object} Object mapping patient IDs to note text
   */
  getNotes() {
    return readClinicalBlob('notes', 'rpc-notes', safeParseObject);
  },

  /**
   * Save notes to localStorage (filters out demo patient notes)
   * @param {Object} notes - Object mapping patient IDs to note text
   */
  saveNotes(notes) {
    const notesPersist = {};
    Object.keys(notes).forEach(k => {
      if (notes[k] && !k.startsWith('demo-')) notesPersist[k] = notes[k];
    });
    localStorage.setItem('rpc-notes', JSON.stringify(notesPersist));
  },

  /**
   * Get all indicaciones from localStorage
   * @returns {Object} Object mapping patient IDs to indicaciones text
   */
  getIndicaciones() {
    return readClinicalBlob('indicaciones', 'rpc-indicaciones', safeParseObject);
  },

  /**
   * Save indicaciones to localStorage (filters out demo patient indicaciones)
   * @param {Object} indicaciones - Object mapping patient IDs to indicaciones text
   */
  saveIndicaciones(indicaciones) {
    const indPersist = {};
    Object.keys(indicaciones).forEach(k => {
      if (indicaciones[k] && !k.startsWith('demo-')) indPersist[k] = indicaciones[k];
    });
    localStorage.setItem('rpc-indicaciones', JSON.stringify(indPersist));
  },

  /**
   * Get listado de problemas (v3.0) from localStorage
   * @returns {Object} Object mapping patient IDs to listado objects
   */
  getListadoProblemas() {
    return readClinicalBlob('listadoProblemas', 'rpc-listado-problemas', safeParseObject);
  },

  /**
   * Save listado de problemas (v3.0) to localStorage (filters out demo)
   * @param {Object} listadoProblemas
   */
  saveListadoProblemas(listadoProblemas) {
    const persist = {};
    Object.keys(listadoProblemas || {}).forEach(k => {
      if (listadoProblemas[k] && !k.startsWith('demo-')) persist[k] = listadoProblemas[k];
    });
    localStorage.setItem('rpc-listado-problemas', JSON.stringify(persist));
  },

  /**
   * Get lab history from localStorage
   * @returns {Object} Object mapping patient IDs to arrays of lab entries
   */
  getLabHistory() {
    var raw = readClinicalBlob('labHistory', 'rpc-labHistory', safeParseObject);
    var out = {};
    Object.keys(raw).forEach(function (k) {
      out[k] = normalizeLabHistoryPatientSets(raw[k]);
    });
    return out;
  },

  /**
   * Save lab history to localStorage (filters out demo patient history)
   * @param {Object} labHistory - Object mapping patient IDs to arrays of lab entries
   */
  saveLabHistory(labHistory) {
    const lhPersist = {};
    Object.keys(labHistory).forEach(k => {
      if (k.startsWith('demo-')) return;
      var sets = normalizeLabHistoryPatientSets(labHistory[k]);
      if (sets.length) lhPersist[k] = sets;
    });
    localStorage.setItem('rpc-labHistory', JSON.stringify(lhPersist));
  },

  getMedRecetaByPatient() {
    return readClinicalBlob('medRecetaByPatient', 'rpc-medRecetaByPatient', safeParseObject);
  },

  saveMedRecetaByPatient(medRecetaByPatient) {
    const persist = {};
    Object.keys(medRecetaByPatient || {}).forEach(k => {
      if (medRecetaByPatient[k] && !k.startsWith('demo-')) persist[k] = medRecetaByPatient[k];
    });
    localStorage.setItem('rpc-medRecetaByPatient', JSON.stringify(persist));
  },

  getMedPharmProfileByPatient() {
    return readClinicalBlob('medPharmProfileByPatient', 'rpc-medPharmProfileByPatient', safeParseObject);
  },

  saveMedPharmProfileByPatient(medPharmProfileByPatient) {
    const persist = {};
    Object.keys(medPharmProfileByPatient || {}).forEach((k) => {
      if (medPharmProfileByPatient[k] && !k.startsWith('demo-')) {
        persist[k] = medPharmProfileByPatient[k];
      }
    });
    localStorage.setItem('rpc-medPharmProfileByPatient', JSON.stringify(persist));
  },

  getVpoByPatient() {
    return readClinicalBlob('vpoByPatient', 'rpc-vpoByPatient', safeParseObject);
  },

  saveVpoByPatient(vpoByPatient) {
    const persist = {};
    Object.keys(vpoByPatient || {}).forEach((k) => {
      if (vpoByPatient[k] && !k.startsWith('demo-')) persist[k] = vpoByPatient[k];
    });
    localStorage.setItem('rpc-vpoByPatient', JSON.stringify(persist));
  },

  getRecetaHuByPatient() {
    return readClinicalBlob('recetaHuByPatient', 'rpc-recetaHuByPatient', safeParseObject);
  },

  saveRecetaHuByPatient(recetaHuByPatient) {
    const persist = {};
    Object.keys(recetaHuByPatient || {}).forEach(k => {
      if (recetaHuByPatient[k] && !k.startsWith('demo-')) persist[k] = recetaHuByPatient[k];
    });
    localStorage.setItem('rpc-recetaHuByPatient', JSON.stringify(persist));
  },

  /**
   * Get to-do list for a patient. Normaliza forma de cada todo.
   * @param {string} patientId
   * @returns {Array<{id:string,text:string,completed:boolean,priority:'alta'|'media'|'baja',createdAt:string,updatedAt:string}>}
   */
  getTodos(patientId) {
    const map = readClinicalBlob('todos', 'rpc-todos', safeParseObject);
    const raw = Array.isArray(map[patientId]) ? map[patientId] : [];
    return raw.map(function (t) {
      var rawP = t && t.priority;
      var p = rawP === 'alta' || rawP === 'baja' || rawP === 'media' ? rawP : 'media';
      var createdAt = String(t && t.createdAt != null ? t.createdAt : '');
      var updatedAt = String(
        t && t.updatedAt != null ? t.updatedAt : createdAt || ''
      );
      return {
        id: String(t && t.id != null ? t.id : ''),
        text: String(t && t.text != null ? t.text : ''),
        completed: !!(t && t.completed),
        priority: p,
        createdAt: createdAt,
        updatedAt: updatedAt
      };
    });
  },

  /**
   * Save to-do list for a patient. Skips demo- patients.
   * @param {string} patientId
   * @param {Array} todos
   */
  saveTodos(patientId, todos) {
    if (typeof patientId !== 'string') return;
    if (patientId.indexOf('demo-') === 0) return;
    const map = readTodosMap();
    const now = new Date().toISOString();
    map[patientId] = (Array.isArray(todos) ? todos : []).map(function (t) {
      var createdAt = String(t && t.createdAt != null ? t.createdAt : now);
      return {
        id: String(t && t.id != null ? t.id : ''),
        text: String(t && t.text != null ? t.text : ''),
        completed: !!(t && t.completed),
        priority:
          t && (t.priority === 'alta' || t.priority === 'baja' || t.priority === 'media')
            ? t.priority
            : 'media',
        createdAt: createdAt,
        updatedAt: String(t && t.updatedAt != null ? t.updatedAt : createdAt || now)
      };
    });
    writeTodosMap(map);
  },

  getLanRoomSnapshots() {
    return readClinicalBlob('lanRoomSnapshots', 'rpc-lan-room-snapshots', safeParseObject);
  },

  getLanRoomSnapshot(roomId) {
    const all = this.getLanRoomSnapshots();
    const row = all[String(roomId || '')];
    return row && typeof row === 'object' ? row : null;
  },

  saveLanRoomSnapshot(roomId, snapshot) {
    const rid = String(roomId || '');
    if (!rid) return;
    const all = this.getLanRoomSnapshots();
    all[rid] = snapshot && typeof snapshot === 'object' ? snapshot : {};
    localStorage.setItem('rpc-lan-room-snapshots', JSON.stringify(all));
  },

  /**
   * Catálogo personalizado de medicamentos (acentos + tokens SOAP + categorías SOME perfil).
   * @returns {{ v: number, accents: Object, soapTokens: Object, somePharm: { tokens: Object } }}
   */
  getMedCatalog() {
    const o = readClinicalBlob('medCatalog', 'rpc-medCatalog', function (raw) {
      return safeParseObject(raw);
    });
    const st = o.soapTokens && typeof o.soapTokens === 'object' ? o.soapTokens : {};
    const sp = o.somePharm && typeof o.somePharm === 'object' ? o.somePharm : {};
    const spt = sp.tokens && typeof sp.tokens === 'object' ? sp.tokens : {};
    return {
      v: typeof o.v === 'number' ? o.v : 1,
      accents: o.accents && typeof o.accents === 'object' ? o.accents : {},
      soapTokens: {
        vasop: Array.isArray(st.vasop) ? st.vasop : [],
        abx: Array.isArray(st.abx) ? st.abx : [],
        analgesia: Array.isArray(st.analgesia) ? st.analgesia : [],
        antihta: Array.isArray(st.antihta) ? st.antihta : [],
      },
      somePharm: { tokens: spt },
    };
  },

  /**
   * @param {{ accents?: Object, soapTokens?: Object }} catalog
   */
  saveMedCatalog(catalog) {
    const c = catalog && typeof catalog === 'object' ? catalog : {};
    const st = c.soapTokens && typeof c.soapTokens === 'object' ? c.soapTokens : {};
    const sp = c.somePharm && typeof c.somePharm === 'object' ? c.somePharm : {};
    const spt = sp.tokens && typeof sp.tokens === 'object' ? sp.tokens : {};
    const payload = {
      v: 1,
      accents: c.accents && typeof c.accents === 'object' ? c.accents : {},
      soapTokens: {
        vasop: Array.isArray(st.vasop) ? st.vasop : [],
        abx: Array.isArray(st.abx) ? st.abx : [],
        analgesia: Array.isArray(st.analgesia) ? st.analgesia : [],
        antihta: Array.isArray(st.antihta) ? st.antihta : [],
      },
      somePharm: { tokens: spt },
    };
    localStorage.setItem('rpc-medCatalog', JSON.stringify(payload));
  },

  /**
   * Lista local de procedimientos agendados (spec agenda semanal v1).
   * @returns {Array<Object>}
   */
  getScheduledProcedures() {
    const raw = readClinicalBlob('scheduledProcedures', 'rpc-scheduled-procedures', safeParseArray);
    const out = [];
    const seen = new Set();
    for (let i = 0; i < raw.length; i += 1) {
      const ev = normalizeScheduledProcedureStored(raw[i]);
      if (
        ev &&
        ev.patientId.indexOf('demo-') !== 0 &&
        !seen.has(ev.id)
      ) {
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
    const filtered = list.filter(ev => ev.patientId.indexOf('demo-') !== 0);
    localStorage.setItem('rpc-scheduled-procedures', JSON.stringify(filtered));
  },

  /** Elimina en cascada eventos ligados al paciente. */
  removeScheduledProceduresForPatient(patientId) {
    if (typeof patientId !== 'string' || !patientId) return;
    const cur = this.getScheduledProcedures();
    const next = cur.filter(ev => ev.patientId !== patientId);
    if (next.length !== cur.length) this.saveScheduledProcedures(next);
  },

  /**
   * Add a lab entry to a patient's lab history
   * @param {string} patientId - Patient ID
   * @param {Object} labEntry - Lab entry object with test results
   */
  pushLabHistory(patientId, labEntry) {
    const labHistory = this.getLabHistory();
    if (!labHistory[patientId]) labHistory[patientId] = [];
    labHistory[patientId].push(labEntry);
    this.saveLabHistory(labHistory);
  },

  /**
   * Get application settings from localStorage
   * @returns {Object} Settings object
   */
  getSettings() {
    return safeParseObject(localStorage.getItem('rpc-settings'));
  },

  /**
   * Save application settings to localStorage
   * @param {Object} settings - Settings object
   */
  saveSettings(settings) {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  },

  /**
   * Get current theme preference from localStorage
   * @returns {string} Theme name ('light' or 'dark')
   */
  getTheme() {
    return localStorage.getItem('theme') || 'light';
  },

  /**
   * Save theme preference to localStorage
   * @param {string} theme - Theme name ('light' or 'dark')
   */
  saveTheme(theme) {
    localStorage.setItem('theme', theme);
  },

  /**
   * Get guided tour completion version from localStorage
   * @returns {string|null} Guided tour version or null if not completed
   */
  getGuidedTourVersion() {
    return localStorage.getItem('rpc-guidedTourDone');
  },

  /**
   * Save guided tour completion version to localStorage
   * @param {string} version - Guided tour version
   */
  saveGuidedTourVersion(version) {
    localStorage.setItem('rpc-guidedTourDone', version);
  },

  /**
   * Remove guided tour completion flag from localStorage
   */
  removeGuidedTourVersion() {
    localStorage.removeItem('rpc-guidedTourDone');
  },

  getLanConfig() {
    return safeParse(localStorage.getItem('rpc-lan-config'), null) || null;
  },

  saveLanConfig(cfg) {
    if (!cfg) {
      localStorage.removeItem('rpc-lan-config');
      return;
    }
    localStorage.setItem('rpc-lan-config', JSON.stringify(cfg));
  },

  getHostPatientMap() {
    return readClinicalBlob('lanHostPatientMap', 'rpc-lan-host-patient-map', safeParseObject);
  },

  saveHostPatientMap(map) {
    localStorage.setItem('rpc-lan-host-patient-map', JSON.stringify(map || {}));
  },

  /** 'host' = esta R+ abre el servidor; 'client' = solo se une. */
  getLanUiRole() {
    var v = localStorage.getItem('rpc-lan-ui-role');
    if (v === 'host' || v === 'client') return v;
    if (
      typeof window !== 'undefined' &&
      window.electronAPI &&
      typeof window.electronAPI.getLanCandidateBaseUrl === 'function'
    ) {
      return 'host';
    }
    return 'client';
  },

  saveLanUiRole(role) {
    if (role === 'host' || role === 'client') {
      localStorage.setItem('rpc-lan-ui-role', role);
    }
  },

  /** Ocultar la franja «Sin conexión al host LAN» cuando se pierde el enlace. */
  getLanHideDisconnectBanner() {
    try {
      return localStorage.getItem('rpc-lan-hide-disconnect-banner') === '1';
    } catch (_e) {
      return false;
    }
  },

  saveLanHideDisconnectBanner(hide) {
    try {
      localStorage.setItem('rpc-lan-hide-disconnect-banner', hide ? '1' : '0');
    } catch (_e) {}
  },

  /** Aviso no bloqueante cuando LWW sobrescribe un cambio concurrente en la sala. */
  getLanLwwOverwriteToast() {
    try {
      var v = localStorage.getItem('rpc-lan-lww-overwrite-toast');
      if (v === '0') return false;
      return true;
    } catch (_e) {
      return true;
    }
  },

  setLanLwwOverwriteToast(enabled) {
    try {
      localStorage.setItem('rpc-lan-lww-overwrite-toast', enabled ? '1' : '0');
    } catch (_e) {}
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
  async saveAll(
    patients,
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient,
    vpoByPatient,
    medPharmProfileByPatient
  ) {
    var payload = {
      patients: patients,
      notes: notes,
      indicaciones: indicaciones,
      labHistory: labHistory,
      medRecetaByPatient: medRecetaByPatient || {},
      listadoProblemas: listadoProblemas !== undefined ? listadoProblemas || {} : undefined,
      recetaHuByPatient: recetaHuByPatient !== undefined ? recetaHuByPatient || {} : undefined,
      vpoByPatient: vpoByPatient !== undefined ? vpoByPatient || {} : undefined,
      medPharmProfileByPatient:
        medPharmProfileByPatient !== undefined ? medPharmProfileByPatient || {} : undefined,
    };
    var pending = estimateRpcPersistBytes(payload);
    var quotaInfo = await getCachedQuotaEstimate();
    var level = assessStoragePressure(pending, quotaInfo);
    if (level === 'block') {
      return { ok: false, code: 'QUOTA_EXCEEDED', level: 'block' };
    }

    var notesPersist = {};
    Object.keys(notes).forEach(function (k) {
      if (notes[k] && !k.startsWith('demo-')) notesPersist[k] = notes[k];
    });
    var indPersist = {};
    Object.keys(indicaciones).forEach(function (k) {
      if (indicaciones[k] && !k.startsWith('demo-')) indPersist[k] = indicaciones[k];
    });
    var lhPersist = {};
    Object.keys(labHistory || {}).forEach(function (k) {
      if (!k.startsWith('demo-')) {
        lhPersist[k] = normalizeLabHistoryPatientSets(labHistory[k]);
      }
    });
    var medPersist = {};
    Object.keys(medRecetaByPatient || {}).forEach(function (k) {
      if (!k.startsWith('demo-')) medPersist[k] = medRecetaByPatient[k];
    });
    var medPharmPersist = {};
    if (medPharmProfileByPatient !== undefined) {
      Object.keys(medPharmProfileByPatient || {}).forEach(function (k) {
        if (!k.startsWith('demo-')) medPharmPersist[k] = medPharmProfileByPatient[k];
      });
    }
    var listPersist = {};
    if (listadoProblemas !== undefined) {
      Object.keys(listadoProblemas || {}).forEach(function (k) {
        if (listadoProblemas[k] && !k.startsWith('demo-')) listPersist[k] = listadoProblemas[k];
      });
    }
    var recetaPersist = {};
    if (recetaHuByPatient !== undefined) {
      Object.keys(recetaHuByPatient || {}).forEach(function (k) {
        if (!k.startsWith('demo-')) recetaPersist[k] = recetaHuByPatient[k];
      });
    }
    var vpoPersist = {};
    if (vpoByPatient !== undefined) {
      Object.keys(vpoByPatient || {}).forEach(function (k) {
        if (!k.startsWith('demo-')) vpoPersist[k] = vpoByPatient[k];
      });
    }

    var filteredPatients = patients.filter(function (p) {
      return !p.isDemo;
    });

    if (isDbMode()) {
      var dbFields = {
        patients: filteredPatients,
        notes: notesPersist,
        indicaciones: indPersist,
        labHistory: lhPersist,
        medRecetaByPatient: medPersist,
      };
      if (medPharmProfileByPatient !== undefined) {
        dbFields.medPharmProfileByPatient = medPharmPersist;
      }
      if (listadoProblemas !== undefined) {
        dbFields.listadoProblemas = listPersist;
      }
      if (recetaHuByPatient !== undefined) {
        dbFields.recetaHuByPatient = recetaPersist;
      }
      if (vpoByPatient !== undefined) {
        dbFields.vpoByPatient = vpoPersist;
      }
      var dbRes = await persistSaveAll(dbFields, {
        meta: { source: 'storage.saveAll', level: level },
      });
      if (!dbRes || dbRes.ok === false) {
        return { ok: false, code: dbRes && dbRes.code ? dbRes.code : 'DB_ERROR', level: 'block' };
      }
      var writtenBlobs = appStateFieldsToBlobs(dbFields);
      _blobCache = Object.assign({}, _blobCache || {}, writtenBlobs);
      return { ok: true, level: level === 'warn' ? 'warn' : 'ok' };
    }

    var writes = [
      ['rpc-patients', JSON.stringify(filteredPatients)],
      ['rpc-notes', JSON.stringify(notesPersist)],
      ['rpc-indicaciones', JSON.stringify(indPersist)],
      ['rpc-labHistory', JSON.stringify(lhPersist)],
      ['rpc-medRecetaByPatient', JSON.stringify(medPersist)],
    ];
    if (medPharmProfileByPatient !== undefined) {
      writes.push(['rpc-medPharmProfileByPatient', JSON.stringify(medPharmPersist)]);
    }
    if (listadoProblemas !== undefined) {
      writes.push(['rpc-listado-problemas', JSON.stringify(listPersist)]);
    }
    if (recetaHuByPatient !== undefined) {
      writes.push(['rpc-recetaHuByPatient', JSON.stringify(recetaPersist)]);
    }
    if (vpoByPatient !== undefined) {
      writes.push(['rpc-vpoByPatient', JSON.stringify(vpoPersist)]);
    }

    for (var i = 0; i < writes.length; i++) {
      if (!safeLocalStorageSet(writes[i][0], writes[i][1])) {
        return { ok: false, code: 'QUOTA_EXCEEDED', level: level };
      }
    }
    return { ok: true, level: level === 'warn' ? 'warn' : 'ok' };
  },
};

// Request batching for /generate and /generate-indicaciones
let pendingRequests = [];
let batchTimeout;

const BATCH_DELAY = 100; // ms

export function batchFetch(endpoint, data) {
  pendingRequests.push({ endpoint, data });

  clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    const batch = pendingRequests.splice(0);
    Promise.all(batch.map(r =>
      fetch(r.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r.data)
      })
    )).catch(err => console.error('Batch fetch error:', err));
  }, BATCH_DELAY);
}

export function flushBatch() {
  clearTimeout(batchTimeout);
  if (pendingRequests.length > 0) {
    const batch = pendingRequests.splice(0);
    Promise.all(batch.map(r =>
      fetch(r.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r.data)
      })
    )).catch(err => console.error('Batch fetch error:', err));
  }
}
