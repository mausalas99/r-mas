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
export function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Initialize DOM cache on module load
DOM.init();

export function switchTab(tabName) {
  DOM.tabButtons.forEach(t => t.classList.remove('active'));
  DOM.tabContent.forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
}

export function switchInnerTab(tabName) {
  const innerTabs = document.querySelectorAll('.inner-tab-button');
  const innerContents = document.querySelectorAll('.inner-tab-content');

  innerTabs.forEach(t => t.classList.remove('active'));
  innerContents.forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-inner-tab="${tabName}"]`)?.classList.add('active');
  document.getElementById(`inner-tab-${tabName}`)?.classList.add('active');
}

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

export function selectPatient(patientId) {
  window.currentPatient = window.patients.find(p => p.id === patientId);
  if (window.currentPatient) {
    renderPatientDetail(window.currentPatient);
  }
}

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

export function deletePatient(patientId) {
  if (!confirm('¿Eliminar este paciente?')) return;

  window.patients = window.patients.filter(p => p.id !== patientId);
  window.storage.savePatients(window.patients);
  renderPatientList(window.patients);
  window.currentPatient = null;
}

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

export function updatePatientField(patientId, field, value) {
  const patient = window.patients.find(p => p.id === patientId);
  if (patient) {
    patient[field] = value;
    window.storage.savePatients(window.patients);
  }
}

// Debounced form input handler
export const handleFormInput = debounce((patientId, field, value) => {
  updatePatientField(patientId, field, value);
}, 300);
