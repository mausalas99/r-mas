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
      var n = i + 1;
      return (
        '<li><label class="exp-datos-list__n" for="patient-dx-' + n + '">' + n + '</label>' +
        '<input type="text" id="patient-dx-' + n + '" class="exp-datos-q" value="' + esc(dx) + '"' +
        (dx ? '' : ' placeholder="Diagnóstico · pegar DX1 + DX2"') +
        ' aria-label="Diagnóstico ' + n + '" style="text-transform:uppercase;"' +
        ' data-oninput="onPatientDxInput" data-oninput-args="[' + i + ']" data-oninput-pass="value"' +
        ' data-onpaste="splitPatientDxPaste" data-onpaste-args="[' + i + ']" data-onpaste-pass="event"' +
        ' data-onkeydown="addPatientDxRow" data-onkeydown-keys="Enter">' +
        (rows.length > 1
          ? '<button type="button" class="exp-datos-list__rm" data-onclick="removePatientDxRow" data-onclick-args="[' + i + ']" aria-label="Quitar diagnóstico ' + n + '">×</button>'
          : '') +
        '</li>'
      );
    })
    .join('');
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

function censoListHtml(patient, kind, editIndex) {
  var cfg = CENSO_LINES[kind];
  var items = censoRenderItems(patient, kind);
  var lis = items.map(function (it, i) {
    if (i === editIndex) {
      return (
        '<li><input type="text" class="exp-datos-q" value="' + esc(censoItemText(it)) + '" aria-label="' + cfg.label + ' ' + (i + 1) + '"' +
        ' data-onkeydown="onCensoLineKey" data-onkeydown-keys="Enter,Escape" data-onkeydown-args=\'["' + kind + '",' + i + ']\' data-onkeydown-pass="event"' +
        ' data-onblur="commitCensoLine" data-onblur-args=\'["' + kind + '",' + i + ']\' data-onblur-pass="event"></li>'
      );
    }
    var tag = it.dia
      ? '<span class="exp-datos-tag">' + esc(it.dia) + '</span>'
      : kind === 'atb'
        ? '<span class="exp-datos-tag exp-datos-tag--muted">sin día</span>'
        : '';
    return (
      '<li><button type="button" class="exp-datos-line" data-line="' + i + '" data-onclick="editCensoLine" data-onclick-args=\'["' + kind + '",' + i + ']\'' +
      ' aria-label="Editar ' + esc(censoItemText(it)) + '"><span class="exp-datos-line__t">' + esc(it.name) + '</span>' + tag + '</button></li>'
    );
  });
  if (!lis.length) {
    lis.push(
      '<li><button type="button" class="exp-datos-line exp-datos-line--empty" data-onclick="editCensoLine" data-onclick-args=\'["' + kind + '",0]\'>' +
        cfg.empty + '</button></li>'
    );
  }
  return (
    '<ul class="exp-datos-list' + (kind === 'meds' ? ' exp-datos-list--cols' : '') + '" id="patient-censo-' + kind + '">' + lis.join('') + '</ul>'
  );
}

function censoCountHtml(patient, kind) {
  var n = parseCensoLines(patient[CENSO_LINES[kind].field]).length;
  return '<span class="exp-datos-sec__count" id="patient-censo-' + kind + '-count">' + (n ? '· ' + n : '') + '</span>';
}

var TOMAR_BTN = function (fn, what) {
  return (
    '<button type="button" class="exp-datos-sec__action exp-datos-sec__action--muted" data-onclick="' + fn + '" title="Tomar de ' + what + '">↻ Tomar de lista</button>'
  );
};

/**
 * Censo blocks for Expediente → Datos, each wrapped by the caller's section builder.
 * @param {Record<string, unknown>} patient
 * @param {(title: string, body: string, action?: string) => string} section
 */
export function buildPatientCensoDatosSectionsHtml(patient, section) {
  migratePatientDiagnosticosFromVpo(patient, getVpoByPatient()[patient.id]);
  ensurePatientDiagnosticos(patient);
  draftLine = null;
  return (
    section(
      'Diagnósticos',
      '<ol class="exp-datos-list exp-datos-list--dx" id="patient-dx-list">' + renderDxListHtml(patient) + '</ol>',
      '<button type="button" class="exp-datos-sec__action" data-onclick="addPatientDxRow">+ Agregar</button>'
    ) +
    section('Antibióticos ' + censoCountHtml(patient, 'atb'), censoListHtml(patient, 'atb', -1), TOMAR_BTN('censoTomarDeAntibioticos', 'Antibióticos')) +
    section('Medicamentos ' + censoCountHtml(patient, 'meds'), censoListHtml(patient, 'meds', -1), TOMAR_BTN('censoTomarDeMedicamentos', 'Medicamentos'))
  );
}

function refreshCensoLines(kind, editIndex) {
  var patient = activePatient(currentPatientId());
  var listEl = document.getElementById('patient-censo-' + kind);
  if (!patient || !listEl) return;
  listEl.outerHTML = censoListHtml(patient, kind, editIndex);
  var countEl = document.getElementById('patient-censo-' + kind + '-count');
  if (countEl) countEl.outerHTML = censoCountHtml(patient, kind);
  if (editIndex >= 0) {
    var input = document.querySelector('#patient-censo-' + kind + ' input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
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
  onCensoLineKey,
  commitCensoLine,
};
