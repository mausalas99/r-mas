// storage.js — Data persistence layer
// Wraps localStorage with consistent interface

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
    return safeParseArray(localStorage.getItem('rpc-patients'));
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
    return safeParseObject(localStorage.getItem('rpc-notes'));
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
    return safeParseObject(localStorage.getItem('rpc-indicaciones'));
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
    return safeParseObject(localStorage.getItem('rpc-listado-problemas'));
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
    return safeParseObject(localStorage.getItem('rpc-labHistory'));
  },

  /**
   * Save lab history to localStorage (filters out demo patient history)
   * @param {Object} labHistory - Object mapping patient IDs to arrays of lab entries
   */
  saveLabHistory(labHistory) {
    const lhPersist = {};
    Object.keys(labHistory).forEach(k => {
      if (labHistory[k] && !k.startsWith('demo-')) lhPersist[k] = labHistory[k];
    });
    localStorage.setItem('rpc-labHistory', JSON.stringify(lhPersist));
  },

  getMedRecetaByPatient() {
    return safeParseObject(localStorage.getItem('rpc-medRecetaByPatient'));
  },

  saveMedRecetaByPatient(medRecetaByPatient) {
    const persist = {};
    Object.keys(medRecetaByPatient || {}).forEach(k => {
      if (medRecetaByPatient[k] && !k.startsWith('demo-')) persist[k] = medRecetaByPatient[k];
    });
    localStorage.setItem('rpc-medRecetaByPatient', JSON.stringify(persist));
  },

  /**
   * Get to-do list for a patient. Normaliza forma de cada todo.
   * @param {string} patientId
   * @returns {Array<{id:string,text:string,completed:boolean,priority:'alta'|'media'|'baja',createdAt:string}>}
   */
  getTodos(patientId) {
    const map = safeParseObject(localStorage.getItem('rpc-todos'));
    const raw = Array.isArray(map[patientId]) ? map[patientId] : [];
    return raw.map(function (t) {
      var rawP = t && t.priority;
      var p = rawP === 'alta' || rawP === 'baja' || rawP === 'media' ? rawP : 'media';
      return {
        id: String(t && t.id != null ? t.id : ''),
        text: String(t && t.text != null ? t.text : ''),
        completed: !!(t && t.completed),
        priority: p,
        createdAt: String(t && t.createdAt != null ? t.createdAt : '')
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
    const map = safeParseObject(localStorage.getItem('rpc-todos')) || {};
    map[patientId] = Array.isArray(todos) ? todos : [];
    localStorage.setItem('rpc-todos', JSON.stringify(map));
  },

  /**
   * Catálogo personalizado de medicamentos (acentos + tokens SOAP por categoría).
   * @returns {{ v: number, accents: Object, soapTokens: { vasop: string[], abx: string[], analgesia: string[], antihta: string[] } }}
   */
  getMedCatalog() {
    const o = safeParseObject(localStorage.getItem('rpc-medCatalog'));
    const st = o.soapTokens && typeof o.soapTokens === 'object' ? o.soapTokens : {};
    return {
      v: typeof o.v === 'number' ? o.v : 1,
      accents: o.accents && typeof o.accents === 'object' ? o.accents : {},
      soapTokens: {
        vasop: Array.isArray(st.vasop) ? st.vasop : [],
        abx: Array.isArray(st.abx) ? st.abx : [],
        analgesia: Array.isArray(st.analgesia) ? st.analgesia : [],
        antihta: Array.isArray(st.antihta) ? st.antihta : [],
      },
    };
  },

  /**
   * @param {{ accents?: Object, soapTokens?: Object }} catalog
   */
  saveMedCatalog(catalog) {
    const c = catalog && typeof catalog === 'object' ? catalog : {};
    const st = c.soapTokens && typeof c.soapTokens === 'object' ? c.soapTokens : {};
    const payload = {
      v: 1,
      accents: c.accents && typeof c.accents === 'object' ? c.accents : {},
      soapTokens: {
        vasop: Array.isArray(st.vasop) ? st.vasop : [],
        abx: Array.isArray(st.abx) ? st.abx : [],
        analgesia: Array.isArray(st.analgesia) ? st.analgesia : [],
        antihta: Array.isArray(st.antihta) ? st.antihta : [],
      },
    };
    localStorage.setItem('rpc-medCatalog', JSON.stringify(payload));
  },

  /**
   * Lista local de procedimientos agendados (spec agenda semanal v1).
   * @returns {Array<Object>}
   */
  getScheduledProcedures() {
    const raw = safeParseArray(localStorage.getItem('rpc-scheduled-procedures'));
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
    return safeParseObject(localStorage.getItem('rpc-lan-host-patient-map'));
  },

  saveHostPatientMap(map) {
    localStorage.setItem('rpc-lan-host-patient-map', JSON.stringify(map || {}));
  },

  /** 'host' = esta R+ abre el servidor; 'client' = solo se une. */
  getLanUiRole() {
    var v = localStorage.getItem('rpc-lan-ui-role');
    if (v === 'host' || v === 'client') return v;
    return 'client';
  },

  saveLanUiRole(role) {
    if (role === 'host' || role === 'client') {
      localStorage.setItem('rpc-lan-ui-role', role);
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
  saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas) {
    this.savePatients(patients);
    this.saveNotes(notes);
    this.saveIndicaciones(indicaciones);
    this.saveLabHistory(labHistory);
    this.saveMedRecetaByPatient(medRecetaByPatient || {});
    if (listadoProblemas !== undefined) this.saveListadoProblemas(listadoProblemas || {});
  }
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
