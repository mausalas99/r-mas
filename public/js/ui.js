// ui.js — UI rendering and DOM interactions with caching

// DOM element cache
const DOM = {
  // Main containers
  patientList: null,
  mainContent: null,
  tabContent: null,
  noteForm: null,
  indicaForm: null,
  tendContainer: null,

  // Tab buttons
  tabButtons: null,
  innerTabButtons: null,

  // Form inputs
  noteInput: null,
  indicaInput: null,

  // Detail modals
  tendDetailBackdrop: null,
  tendDetailCanvas: null,

  init() {
    this.patientList = document.querySelector('.patient-list');
    this.mainContent = document.querySelector('main');
    this.tabContent = document.querySelectorAll('.tab-content');
    this.noteForm = document.getElementById('note-form');
    this.indicaForm = document.getElementById('indica-form');
    this.tendContainer = document.getElementById('tend-container');
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.innerTabButtons = document.querySelectorAll('.inner-tab-button');
    this.noteInput = document.getElementById('note-input');
    this.indicaInput = document.getElementById('indica-input');
    this.tendDetailBackdrop = document.getElementById('tend-detail-backdrop');
    this.tendDetailCanvas = document.getElementById('tend-detail-canvas');
  },

  // Refresh cache after DOM updates
  refresh() {
    this.init();
  }
};

// Debounce utility
/**
 * Create a debounced version of a function that delays execution
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Initialize DOM cache on module load
DOM.init();

/**
 * Switch active tab and display corresponding content
 * @param {string} tabName - Name of the tab to activate
 */
export function switchTab(tabName) {
  DOM.tabButtons.forEach(t => t.classList.remove('active'));
  DOM.tabContent.forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
}

/**
 * Switch active inner tab and display corresponding content
 * @param {string} tabName - Name of the inner tab to activate
 */
export function switchInnerTab(tabName) {
  const innerTabs = document.querySelectorAll('.inner-tab-button');
  const innerContents = document.querySelectorAll('.inner-tab-content');

  innerTabs.forEach(t => t.classList.remove('active'));
  innerContents.forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-inner-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`inner-tab-${tabName}`)?.classList.add('active');
}

/**
 * Render list of patients in the sidebar
 * @param {Array} patients - Array of patient objects
 */
export function renderPatientList(patients) {
  if (!DOM.patientList) return;

  let html = '<div class="patient-items">';
  patients.forEach(p => {
    html += `<div class="patient-item" onclick="selectPatient('${p.id}')">
      <div class="patient-name">${p.name}</div>
      <div class="patient-meta">${p.expediente || 'N/A'}</div>
    </div>`;
  });
  html += '</div>';

  DOM.patientList.innerHTML = html;
}

/**
 * Select a patient and render their detail view
 * @param {string} patientId - ID of the patient to select
 */
export function selectPatient(patientId) {
  window.currentPatient = window.patients.find(p => p.id === patientId);
  if (window.currentPatient) {
    renderPatientDetail(window.currentPatient);
  }
}

/**
 * Render detailed view of a patient with tabs for notes, indicaciones, and tendencias
 * @param {Object} patient - Patient object to display
 */
export function renderPatientDetail(patient) {
  if (!DOM.mainContent) return;

  let html = `<div class="patient-detail">
    <div class="patient-header">
      <h2>${patient.name}</h2>
      <div class="patient-info">
        <span>Expediente: ${patient.expediente || 'N/A'}</span>
        <span>Edad: ${patient.edad || 'N/A'}</span>
        <span>Sexo: ${patient.sexo || 'N/A'}</span>
      </div>
    </div>
    <div class="patient-tabs">
      <button class="tab-button active" onclick="switchTab('nota')">Nota</button>
      <button class="tab-button" onclick="switchTab('indicaciones')">Indicaciones</button>
      <button class="tab-button" onclick="switchTab('tendencias')">Tendencias</button>
    </div>
  </div>`;

  DOM.mainContent.innerHTML = html;
}

/**
 * Delete a patient after confirmation
 * @param {string} patientId - ID of the patient to delete
 */
export function deletePatient(patientId) {
  if (!confirm('¿Eliminar este paciente?')) return;

  window.patients = window.patients.filter(p => p.id !== patientId);
  window.storage.savePatients(window.patients);
  renderPatientList(window.patients);
  window.currentPatient = null;
}

/**
 * Add a new patient and render updated patient list
 * @param {string} name - Patient name
 * @param {string} expediente - Patient medical record number
 * @returns {Object} The newly created patient object
 */
export function addPatient(name, expediente) {
  const newPatient = {
    id: Date.now().toString(),
    name,
    expediente,
    edad: '',
    sexo: '',
    fecha: new Date().toLocaleDateString()
  };

  window.patients.push(newPatient);
  window.storage.savePatients(window.patients);
  renderPatientList(window.patients);

  return newPatient;
}

/**
 * Update a patient field and persist to storage
 * @param {string} patientId - ID of the patient to update
 * @param {string} field - Field name to update
 * @param {string} value - New value for the field
 */
export function updatePatientField(patientId, field, value) {
  const patient = window.patients.find(p => p.id === patientId);
  if (patient) {
    patient[field] = value;
    window.storage.savePatients(window.patients);
  }
}

// Debounced form input handler
/**
 * Debounced handler for form input changes (300ms delay)
 * @param {string} patientId - ID of the patient being edited
 * @param {string} field - Field name being updated
 * @param {string} value - New field value
 */
export const handleFormInput = debounce((patientId, field, value) => {
  updatePatientField(patientId, field, value);
}, 300);
