import { parseDiagnosticosText } from './patient-diagnosticos.mjs';
import {
  ensurePatientDiagnosticos,
  applyPatientDiagnosticosList,
  migratePatientDiagnosticosFromVpo,
  stampCensoFieldsClock,
} from './patient-diagnosticos.mjs';
import { scheduleCloudSyncPush } from './features/cloud-sync/mutate-bridge.mjs';
import { formatCensoMedsFromReceta, formatCensoAtbFromReceta } from './censo-meds-format.mjs';
import { getPatients, getMedRecetaByPatient, getVpoByPatient, persistClinicalState } from './app-state.mjs';

import { esc } from './dom-escape.mjs';

/** Dx/censo meds ride `entries/<id>/fields` — push now, or a peer's newer clock wins. */
function stampCensoAndPush(patient, key) {
  stampCensoFieldsClock(patient, undefined, key);
  scheduleCloudSyncPush();
}

function activePatient(patientId) {
  return getPatients().find(function (p) {
    return String(p.id) === String(patientId);
  });
}

function dxRows(patient) {
  var list = (patient.diagnosticosList || []).slice();
  return list.length ? list : [''];
}

function renderDxListHtml(patient) {
  var rows = dxRows(patient);
  return rows
    .map(function (dx, i) {
      var canRemove = rows.length > 1;
      return (
        '<div class="vpo-dx-row list-row">' +
        '<input type="text" class="ea-input" value="' +
        esc(dx) +
        '" placeholder="Diagnóstico ' +
        (i + 1) +
        '" data-oninput="onPatientDxInput" data-oninput-args="[' +
        i +
        ']" data-oninput-pass="value" style="text-transform:uppercase;">' +
        '<button type="button" class="btn-remove" data-onclick="removePatientDxRow" data-onclick-args="[' +
        i +
        ']"' +
        (canRemove ? '' : ' style="visibility:hidden"') +
        ' aria-label="Eliminar">×</button></div>'
      );
    })
    .join('');
}

/** @param {Record<string, unknown>} patient */
export function buildPatientCensoDatosSectionsHtml(patient) {
  migratePatientDiagnosticosFromVpo(patient, getVpoByPatient()[patient.id]);
  ensurePatientDiagnosticos(patient);
  return (
    '<div class="card" style="margin-top:10px;"><div class="card-header">Diagnósticos (censo)</div><div class="card-body">' +
    '<div class="vpo-toolbar">' +
    '<button type="button" class="btn-add-row" data-onclick="addPatientDxRow">+ Agregar diagnóstico</button>' +
    '</div>' +
    '<div class="vpo-dx-list" id="patient-dx-list">' +
    renderDxListHtml(patient) +
    '</div>' +
    '<div class="vpo-dx-paste" style="margin-top:8px;">' +
    '<span class="ea-label">Pegar con « + » entre diagnósticos</span>' +
    '<textarea class="ea-input" id="patient-dx-paste" rows="2" placeholder="DX1 + DX2…"></textarea>' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-onclick="splitPatientDxPaste">Separar por +</button>' +
    '</div></div></div>' +
    '<div class="card" style="margin-top:10px;"><div class="card-header">Censo — Antibióticos</div><div class="card-body">' +
    '<div class="vpo-toolbar">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-onclick="censoTomarDeAntibioticos">Tomar de Antibióticos</button>' +
    '</div>' +
    '<textarea class="ea-input" id="patient-censo-atb" rows="4" placeholder="Texto para columna ATB del PDF…" data-oninput="updatePatientCensoAtb" data-oninput-pass="value">' +
    esc(patient.censoAtbText || '') +
    '</textarea></div></div>' +
    '<div class="card" style="margin-top:10px;"><div class="card-header">Censo — Medicamentos</div><div class="card-body">' +
    '<div class="vpo-toolbar">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-onclick="censoTomarDeMedicamentos">Tomar de Medicamentos</button>' +
    '</div>' +
    '<textarea class="ea-input" id="patient-censo-meds" rows="6" placeholder="Texto para columna Meds del PDF…" data-oninput="updatePatientCensoMeds" data-oninput-pass="value">' +
    esc(patient.censoMedsText || '') +
    '</textarea></div></div>'
  );
}

function refreshDxListDom(patientId) {
  var patient = activePatient(patientId);
  var listEl = document.getElementById('patient-dx-list');
  if (!patient || !listEl) return;
  listEl.innerHTML = renderDxListHtml(patient);
}

function currentPatientId() {
  var wrap = document.getElementById('patient-data-form');
  return wrap && wrap.dataset.patientId ? wrap.dataset.patientId : null;
}

export function onPatientDxInput(index, value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [''];
  patient.diagnosticosList[index] = String(value || '').toUpperCase();
  ensurePatientDiagnosticos(patient);
  stampCensoAndPush(patient, 'diagnosticosList');
  persistClinicalState();
}

export function addPatientDxRow() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [''];
  patient.diagnosticosList.push('');
  stampCensoAndPush(patient, 'diagnosticosList');
  persistClinicalState();
  refreshDxListDom(pid);
}

export function removePatientDxRow(index) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient || !Array.isArray(patient.diagnosticosList)) return;
  if (patient.diagnosticosList.length <= 1) return;
  patient.diagnosticosList.splice(index, 1);
  applyPatientDiagnosticosList(patient, patient.diagnosticosList);
  stampCensoAndPush(patient, 'diagnosticosList');
  persistClinicalState();
  refreshDxListDom(pid);
}

export function splitPatientDxPaste() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  var ta = document.getElementById('patient-dx-paste');
  if (!patient || !ta) return;
  var parsed = parseDiagnosticosText(ta.value);
  if (!parsed.length) return;
  applyPatientDiagnosticosList(patient, parsed.concat(['']));
  stampCensoAndPush(patient, 'diagnosticosList');
  persistClinicalState();
  refreshDxListDom(pid);
}

export function updatePatientCensoMeds(value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  patient.censoMedsText = String(value || '');
  stampCensoAndPush(patient, 'censoMedsText');
  persistClinicalState();
}

export function updatePatientCensoAtb(value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  patient.censoAtbText = String(value || '');
  stampCensoAndPush(patient, 'censoAtbText');
  persistClinicalState();
}

export function censoTomarDeMedicamentos() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  var text = formatCensoMedsFromReceta(getMedRecetaByPatient()[pid]);
  patient.censoMedsText = text;
  stampCensoAndPush(patient, 'censoMedsText');
  var ta = document.getElementById('patient-censo-meds');
  if (ta) ta.value = text;
  persistClinicalState();
}

export function censoTomarDeAntibioticos() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  var text = formatCensoAtbFromReceta(getMedRecetaByPatient()[pid]);
  patient.censoAtbText = text;
  stampCensoAndPush(patient, 'censoAtbText');
  var ta = document.getElementById('patient-censo-atb');
  if (ta) ta.value = text;
  persistClinicalState();
}

export const patientDataCensoWindowHandlers = {
  onPatientDxInput,
  addPatientDxRow,
  removePatientDxRow,
  splitPatientDxPaste,
  updatePatientCensoMeds,
  updatePatientCensoAtb,
  censoTomarDeMedicamentos,
  censoTomarDeAntibioticos,
};
