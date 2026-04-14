// storage.js — Data persistence layer
// Wraps localStorage with consistent interface

export const storage = {
  // Patient operations
  getPatients() {
    return JSON.parse(localStorage.getItem('rpc-patients') || '[]');
  },

  savePatients(patients) {
    const filtered = patients.filter(p => !p.isDemo);
    localStorage.setItem('rpc-patients', JSON.stringify(filtered));
  },

  // Notes operations
  getNotes() {
    return JSON.parse(localStorage.getItem('rpc-notes') || '{}');
  },

  saveNotes(notes) {
    const notesPersist = {};
    Object.keys(notes).forEach(k => {
      if (notes[k] && !k.startsWith('demo-')) notesPersist[k] = notes[k];
    });
    localStorage.setItem('rpc-notes', JSON.stringify(notesPersist));
  },

  // Indicaciones operations
  getIndicaciones() {
    return JSON.parse(localStorage.getItem('rpc-indicaciones') || '{}');
  },

  saveIndicaciones(indicaciones) {
    const indPersist = {};
    Object.keys(indicaciones).forEach(k => {
      if (indicaciones[k] && !k.startsWith('demo-')) indPersist[k] = indicaciones[k];
    });
    localStorage.setItem('rpc-indicaciones', JSON.stringify(indPersist));
  },

  // Lab history operations
  getLabHistory() {
    return JSON.parse(localStorage.getItem('rpc-labHistory') || '{}');
  },

  saveLabHistory(labHistory) {
    const lhPersist = {};
    Object.keys(labHistory).forEach(k => {
      if (labHistory[k] && !k.startsWith('demo-')) lhPersist[k] = labHistory[k];
    });
    localStorage.setItem('rpc-labHistory', JSON.stringify(lhPersist));
  },

  pushLabHistory(patientId, labEntry) {
    const labHistory = this.getLabHistory();
    if (!labHistory[patientId]) labHistory[patientId] = [];
    labHistory[patientId].push(labEntry);
    this.saveLabHistory(labHistory);
  },

  // Settings operations
  getSettings() {
    return JSON.parse(localStorage.getItem('rpc-settings') || '{}');
  },

  saveSettings(settings) {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  },

  // Theme operations
  getTheme() {
    return localStorage.getItem('theme') || 'light';
  },

  saveTheme(theme) {
    localStorage.setItem('theme', theme);
  },

  // Guided tour operations
  getGuidedTourVersion() {
    return localStorage.getItem('rpc-guidedTourDone');
  },

  saveGuidedTourVersion(version) {
    localStorage.setItem('rpc-guidedTourDone', version);
  },

  removeGuidedTourVersion() {
    localStorage.removeItem('rpc-guidedTourDone');
  },

  // Batch save all data
  saveAll(patients, notes, indicaciones, labHistory) {
    this.savePatients(patients);
    this.saveNotes(notes);
    this.saveIndicaciones(indicaciones);
    this.saveLabHistory(labHistory);
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
