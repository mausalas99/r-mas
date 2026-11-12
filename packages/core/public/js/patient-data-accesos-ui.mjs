import { accesoFechaToDateInputValue } from './patient-date-fields.mjs';
import { refreshRpcDateFields } from './rpc-date-picker.mjs';
import { ensurePatientAccesos, syncLegacyAccesoFields, VIA_ACCESO_LABELS } from './patient-accesos.mjs';
import { getPatients, persistClinicalState } from './app-state.mjs';

import { lazyView } from './deferred-work.mjs';

const accesoView = lazyView(() => import('./patient-data-accesos-view.jsx'));
function activePatient(patientId) {
  return getPatients().find(function (p) {
    return String(p.id) === String(patientId);
  });
}

function accesoRows(patient) {
  ensurePatientAccesos(patient);
  var list = (patient.accesosList || []).slice();
  return list.length ? list : [{ via: '', fecha: '' }];
}

/** Props for the acceso rows (AccesoRows in patient-data-accesos-view.jsx). */
export function accesosListProps(patient, now) {
  return {
    rows: accesoRows(patient).map(function (row) { return { via: row.via, dateValue: accesoFechaToDateInputValue(row.fecha) }; }),
    viaLabels: VIA_ACCESO_LABELS,
    now: now,
  };
}

function refreshAccesosListDom(patientId) {
  var patient = activePatient(patientId);
  var listEl = document.getElementById('patient-accesos-list');
  if (!patient || !listEl) return;
  var props = accesosListProps(patient, Date.now());
  accesoView.use(function (v) {
    v.drawAccesoRows(listEl, props);
    refreshRpcDateFields(listEl);
  });
}

function currentPatientId() {
  var wrap = document.getElementById('patient-data-form');
  return wrap && wrap.dataset.patientId ? wrap.dataset.patientId : null;
}

function touchAccesos(patient, mutator) {
  if (!patient) return;
  ensurePatientAccesos(patient);
  mutator(patient);
  syncLegacyAccesoFields(patient);
  persistClinicalState();
}

export function onPatientAccesoVia(index, value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function (p) {
    p.accesosList[index].via = String(value || '').trim();
  });
}

export function onPatientAccesoFecha(index, value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function (p) {
    p.accesosList[index].fecha = String(value || '').trim();
  });
  refreshAccesosListDom(pid);
}

export function addPatientAccesoRow() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function (p) {
    p.accesosList.push({ via: '', fecha: '' });
  });
  refreshAccesosListDom(pid);
  var vias = document.querySelectorAll('#patient-accesos-list .patient-acceso-via');
  if (vias.length) vias[vias.length - 1].focus();
}

export function removePatientAccesoRow(index) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient || !Array.isArray(patient.accesosList)) return;
  if (patient.accesosList.length <= 1) return;
  touchAccesos(patient, function (p) {
    p.accesosList.splice(index, 1);
    ensurePatientAccesos(p);
  });
  refreshAccesosListDom(pid);
}

export const patientDataAccesosWindowHandlers = {
  onPatientAccesoVia,
  onPatientAccesoFecha,
  addPatientAccesoRow,
  removePatientAccesoRow,
};
