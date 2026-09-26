import { accesoFechaToDateInputValue } from './patient-date-fields.mjs';
import { refreshRpcDateFields } from './rpc-date-picker.mjs';
import { ensurePatientAccesos, syncLegacyAccesoFields, VIA_ACCESO_LABELS } from './patient-accesos.mjs';
import { getPatients, persistClinicalState } from './app-state.mjs';

import { esc } from './dom-escape.mjs';
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

function viaSelectHtml(index, via) {
  var v = String(via || '');
  return (
    '<select class="exp-datos-q patient-acceso-via" data-onchange="onPatientAccesoVia" data-onchange-args="[' +
    index +
    ']" data-onchange-pass="value" aria-label="Vía de acceso">' +
    '<option value=""' +
    (!v ? ' selected' : '') +
    '>— Vía —</option>' +
    Object.keys(VIA_ACCESO_LABELS)
      .map(function (key) {
        return '<option value="' + key + '"' + (v === key ? ' selected' : '') + '>' + VIA_ACCESO_LABELS[key] + '</option>';
      })
      .join('') +
    '</select>'
  );
}

/** Whole days from the access date to today, or '' when there is no valid date. */
function accesoDiaHtml(fecha) {
  var iso = accesoFechaToDateInputValue(fecha);
  if (!iso) return '';
  var days = Math.floor((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000);
  return days >= 0 ? '<span class="exp-datos-tag exp-datos-tag--muted">día ' + days + '</span>' : '';
}

function renderAccesosListHtml(patient) {
  var rows = accesoRows(patient);
  return rows
    .map(function (row, i) {
      var name = 'Acceso' + (rows.length > 1 ? ' ' + (i + 1) : '');
      return (
        '<div class="exp-datos-prop patient-acceso-row">' +
        '<span class="exp-datos-prop__k">' + name + '</span>' +
        '<div class="exp-datos-acc">' +
        viaSelectHtml(i, row.via) +
        '<label class="exp-datos-acc__date"><span class="visually-hidden">Fecha ' + name + '</span>' +
        '<input type="date" class="rpc-date-input patient-acceso-fecha" value="' +
        esc(accesoFechaToDateInputValue(row.fecha)) +
        '" data-oninput="onPatientAccesoFecha" data-oninput-args="[' +
        i +
        ']" data-oninput-pass="value"></label>' +
        accesoDiaHtml(row.fecha) +
        (rows.length > 1
          ? '<button type="button" class="exp-datos-list__rm" data-onclick="removePatientAccesoRow" data-onclick-args="[' + i + ']" aria-label="Quitar ' + name + '">×</button>'
          : '') +
        '</div></div>'
      );
    })
    .join('');
}

/** Access rows for the Ingreso group; "+ Acceso" lives in the group title. */
export function buildPatientAccesosSectionHtml(patient) {
  ensurePatientAccesos(patient);
  return '<div class="patient-accesos-list" id="patient-accesos-list">' + renderAccesosListHtml(patient) + '</div>';
}

function refreshAccesosListDom(patientId) {
  var patient = activePatient(patientId);
  var listEl = document.getElementById('patient-accesos-list');
  if (!patient || !listEl) return;
  listEl.innerHTML = renderAccesosListHtml(patient);
  refreshRpcDateFields(listEl);
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
