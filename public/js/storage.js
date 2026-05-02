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

  /**
   * Batch save all data to localStorage
   * @param {Array} patients - Array of patient objects
   * @param {Object} notes - Object mapping patient IDs to note text
   * @param {Object} indicaciones - Object mapping patient IDs to indicaciones text
   * @param {Object} labHistory - Object mapping patient IDs to arrays of lab entries
   * @param {Object} medRecetaByPatient - Object mapping patient IDs to med receta payloads
   */
  saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient) {
    this.savePatients(patients);
    this.saveNotes(notes);
    this.saveIndicaciones(indicaciones);
    this.saveLabHistory(labHistory);
    this.saveMedRecetaByPatient(medRecetaByPatient || {});
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
