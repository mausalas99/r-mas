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

import { lazyView } from './deferred-work.mjs';

const censoView = lazyView(() => import('./patient-data-censo-view.jsx'));

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

/* ATB / meds stay plain text; each non-empty line is one item. The census
   formatter puts "Día N" on its own line under the drug, so that line joins
   the item above it; "DRUG · Día N" on one line works too. */
var CENSO_LINES = {
  atb: { field: 'censoAtbText', label: 'Antibiótico', empty: 'Sin antibióticos · clic para agregar' },
  meds: { field: 'censoMedsText', label: 'Medicamento', empty: 'Sin medicamentos · clic para agregar' },
};
var DIA_LINE_RE = /^D[ií]a\s*\d+$/i;
var DIA_TAIL_RE = /\s*·\s*(D[ií]a\s*\d+)$/i;

/** @param {string} line @param {string} [sep] */
function parseCensoItem(line, sep) {
  var m = DIA_TAIL_RE.exec(line);
  return m ? { name: line.slice(0, m.index), dia: m[1], sep: sep || ' · ' } : { name: line, dia: '', sep: sep || '\n' };
}

/** @param {unknown} text */
export function parseCensoLines(text) {
  var items = [];
  String(text || '')
    .split('\n')
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean)
    .forEach(function (line) {
      var prev = items[items.length - 1];
      if (prev && !prev.dia && DIA_LINE_RE.test(line)) {
        prev.dia = line;
        prev.sep = '\n';
      } else {
        items.push(parseCensoItem(line));
      }
    });
  return items;
}

/** @param {{ name: string, dia: string, sep: string }[]} items */
export function joinCensoLines(items) {
  return items
    .map(function (it) {
      return it.name + (it.dia ? it.sep + it.dia : '');
    })
    .join('\n');
}

function censoItemText(it) {
  return it.name + (it.dia ? ' · ' + it.dia : '');
}

/** Pending new line: { kind, index } while its editor is open, not yet saved. */
var draftLine = null;

function censoRenderItems(patient, kind) {
  var items = parseCensoLines(patient[CENSO_LINES[kind].field]);
  if (draftLine && draftLine.kind === kind) items.splice(draftLine.index, 0, { name: '', dia: '', sep: '\n' });
  return items;
}

/* Crossed-out meds live in `censoMedsStruckText`, same line format as
   censoMedsText. They are already gone from censoMedsText (so from the census);
   this list only lets a click bring them back. */
function censoListProps(patient, kind, editIndex) {
  var cfg = CENSO_LINES[kind];
  var text = function (it) { return { name: it.name, dia: it.dia, text: censoItemText(it) }; };
  return {
    kind: kind,
    label: cfg.label,
    empty: cfg.empty,
    editIndex: editIndex,
    items: censoRenderItems(patient, kind).map(text),
    struck: kind === 'meds' && editIndex < 0 ? parseCensoLines(patient.censoMedsStruckText).map(text) : [],
  };
}

function censoCount(patient, kind) {
  return parseCensoLines(patient[CENSO_LINES[kind].field]).length;
}

/**
 * Props for the censo blocks of Expediente → Datos (see expediente-datos-view.jsx).
 * @param {Record<string, unknown>} patient
 */
export function censoDatosProps(patient) {
  migratePatientDiagnosticosFromVpo(patient, getVpoByPatient()[patient.id]);
  ensurePatientDiagnosticos(patient);
  draftLine = null;
  return {
    dx: dxRows(patient),
    atb: { count: censoCount(patient, 'atb'), list: censoListProps(patient, 'atb', -1) },
    meds: { count: censoCount(patient, 'meds'), list: censoListProps(patient, 'meds', -1) },
  };
}

function refreshCensoLines(kind, editIndex) {
  var patient = activePatient(currentPatientId());
  var listEl = document.getElementById('patient-censo-' + kind);
  if (!patient || !listEl) return;
  censoView.use(function (v) {
    v.replaceWithCensoList(listEl, censoListProps(patient, kind, editIndex));
    var countEl = document.getElementById('patient-censo-' + kind + '-count');
    if (countEl) v.replaceWithCensoCount(countEl, { kind: kind, count: censoCount(patient, kind) });
    if (editIndex >= 0) {
      var input = document.querySelector('#patient-censo-' + kind + ' input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  });
}

function saveCensoText(kind, text) {
  if (kind === 'atb') updatePatientCensoAtb(text);
  else updatePatientCensoMeds(text);
}

/** Write one edited line back: empty removes it, a draft is inserted. @returns {boolean} kept */
function applyCensoLine(kind, index, value) {
  var patient = activePatient(currentPatientId());
  if (!patient) return false;
  var isDraft = !!(draftLine && draftLine.kind === kind && draftLine.index === index);
  draftLine = null;
  var items = parseCensoLines(patient[CENSO_LINES[kind].field]);
  var v = String(value || '').trim();
  var next = v ? parseCensoItem(v, items[index] && !isDraft ? items[index].sep : '\n') : null;
  if (isDraft) {
    if (!next) return false;
    items.splice(index, 0, next);
  } else if (next) {
    items[index] = next;
  } else {
    items.splice(index, 1);
  }
  var text = joinCensoLines(items);
  if (text !== String(patient[CENSO_LINES[kind].field] || '')) saveCensoText(kind, text);
  return !!next;
}

export function editCensoLine(kind, index) {
  var patient = activePatient(currentPatientId());
  if (!patient) return;
  if (!parseCensoLines(patient[CENSO_LINES[kind].field]).length) draftLine = { kind: kind, index: 0 };
  refreshCensoLines(kind, index);
}

/** «+ Agregar»: open an empty line at the end of the list. */
export function addCensoLine(kind) {
  var patient = activePatient(currentPatientId());
  if (!patient || !CENSO_LINES[kind]) return;
  var n = parseCensoLines(patient[CENSO_LINES[kind].field]).length;
  draftLine = { kind: kind, index: n };
  refreshCensoLines(kind, n);
}

/** Enter saves and opens a new line below; Escape drops the edit. */
export function onCensoLineKey(kind, index, ev) {
  var el = ev.target;
  el.dataset.done = '1';
  if (ev.key === 'Escape') {
    ev.preventDefault();
    ev.stopPropagation();
    draftLine = null;
    refreshCensoLines(kind, -1);
    return;
  }
  ev.preventDefault();
  if (applyCensoLine(kind, index, el.value)) {
    draftLine = { kind: kind, index: index + 1 };
    refreshCensoLines(kind, index + 1);
  } else {
    refreshCensoLines(kind, -1);
  }
}

/** Blur saves. Focus moving to another line of the same list opens that line. */
export function commitCensoLine(kind, index, ev) {
  var el = ev.target;
  if (el.dataset.done) return;
  el.dataset.done = '1';
  var to = ev.relatedTarget && ev.relatedTarget.closest ? ev.relatedTarget.closest('#patient-censo-' + kind + ' [data-line]') : null;
  var kept = applyCensoLine(kind, index, el.value);
  var j = to ? Number(to.dataset.line) : -1;
  if (j > index && !kept) j -= 1;
  refreshCensoLines(kind, j);
}

/** Click a med: cross it out and move it to the bottom. Click a crossed-out med: bring it back. */
export function toggleCensoMed(index) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  var items = parseCensoLines(patient.censoMedsText);
  var struck = parseCensoLines(patient.censoMedsStruckText);
  if (index < items.length) struck.push(items.splice(index, 1)[0]);
  else if (struck[index - items.length]) items.push(struck.splice(index - items.length, 1)[0]);
  else return;
  patient.censoMedsStruckText = joinCensoLines(struck);
  stampCensoFieldsClock(patient, undefined, 'censoMedsStruckText');
  saveCensoText('meds', joinCensoLines(items));
  refreshCensoLines('meds', -1);
}

function refreshDxListDom(patientId) {
  var patient = activePatient(patientId);
  var listEl = document.getElementById('patient-dx-list');
  if (!patient || !listEl) return;
  var props = { rows: dxRows(patient) };
  censoView.use(function (v) { v.drawDxRows(listEl, props); });
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
  var inputs = document.querySelectorAll('#patient-dx-list input');
  if (inputs.length) inputs[inputs.length - 1].focus();
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

/** Pasting "DX1 + DX2" (or several lines) into a diagnosis splits it into rows. */
export function splitPatientDxPaste(index, ev) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  var parsed = parseDiagnosticosText(ev && ev.clipboardData ? ev.clipboardData.getData('text') : '');
  if (!patient || parsed.length < 2) return;
  ev.preventDefault();
  var list = dxRows(patient);
  if (list[index]) list.splice.apply(list, [index + 1, 0].concat(parsed));
  else list.splice.apply(list, [index, 1].concat(parsed));
  applyPatientDiagnosticosList(patient, list);
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
  if (patient.censoMedsStruckText) {
    patient.censoMedsStruckText = '';
    stampCensoFieldsClock(patient, undefined, 'censoMedsStruckText');
  }
  patient.censoMedsText = text;
  stampCensoAndPush(patient, 'censoMedsText');
  refreshCensoLines('meds', -1);
  persistClinicalState();
}

export function censoTomarDeAntibioticos() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  var text = formatCensoAtbFromReceta(getMedRecetaByPatient()[pid]);
  patient.censoAtbText = text;
  stampCensoAndPush(patient, 'censoAtbText');
  refreshCensoLines('atb', -1);
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
  editCensoLine,
  addCensoLine,
  onCensoLineKey,
  commitCensoLine,
  toggleCensoMed,
};
