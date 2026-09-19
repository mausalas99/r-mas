/** Directorio — full outpatient roster, search-only (no sidebar zone, ~200 patients). */
import { getPatients, persistClinicalState } from '../app-state.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import { isCloudSyncActive } from './cloud-sync/nube-sync-policy.mjs';
import { escHtml } from '../dom-escape.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { switchAppTab } from './app-tabs.mjs';
import { renderPatientSidebarBodyHtml } from '../patient-sidebar-card.mjs';

let directorioSearchFilter = '';

function matchesDirectorioSearch(p) {
  if (!directorioSearchFilter) return true;
  var q = directorioSearchFilter;
  return (
    String(p.nombre || '').toLowerCase().indexOf(q) !== -1 ||
    String(p.registro || '').toLowerCase().indexOf(q) !== -1
  );
}

function directorioPatients() {
  return getPatients()
    .filter(function (p) {
      return p && !p.hospitalizado;
    })
    .filter(matchesDirectorioSearch)
    .sort(function (a, b) {
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    });
}

function renderDirectorioRowHtml(p) {
  return (
    '<div class="patient-card directorio-row" data-patient-id="' +
    escHtml(p.id) +
    '" role="button" tabindex="0" onclick="openDirectorioPatient(\'' +
    escHtml(p.id) +
    '\')">' +
    '<div class="patient-card-toolbar"><div class="patient-card-toolbar-left"></div>' +
    '<button type="button" class="patient-toolbar-chip" onclick="readmitDirectorioPatient(event,\'' +
    escHtml(p.id) +
    '\')">Reingresar</button></div>' +
    renderPatientSidebarBodyHtml(p, { showServicio: true }) +
    '</div>'
  );
}

export function onDirectorioSearchInput(val) {
  directorioSearchFilter = String(val || '').trim().toLowerCase();
  renderDirectorioPanel();
}

export function renderDirectorioPanel() {
  var mount = document.getElementById('directorio-list');
  if (!mount) return;
  var patients = directorioPatients();
  if (!patients.length) {
    mount.innerHTML =
      '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">' +
      (directorioSearchFilter ? 'Ningún paciente coincide con la búsqueda' : 'Sin pacientes en el directorio') +
      '</div>';
    return;
  }
  mount.innerHTML = patients.map(renderDirectorioRowHtml).join('');
}

export function openDirectorioPatient(id) {
  patientsBridge.selectPatient(id);
  switchAppTab('nota');
}

export function readmitDirectorioPatient(ev, id) {
  if (ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }
  var p = getPatients().find(function (x) {
    return x.id === id;
  });
  if (!p) return;
  p.hospitalizado = true;
  p.lanUpdatedAt = new Date().toISOString();
  persistClinicalState();
  renderDirectorioPanel();
  patientsBridge.renderPatientList();
  patientsBridge.selectPatient(id);
  switchAppTab('nota');
  if (isCloudSyncActive()) {
    scheduleCloudSyncPush();
  }
}

export var windowHandlers = {
  onDirectorioSearchInput,
  openDirectorioPatient,
  readmitDirectorioPatient,
};
