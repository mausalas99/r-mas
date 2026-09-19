/**
 * Agenda tab, Consulta Externa mode: simple weekly list of pending consultas
 * instead of the Sala procedure calendar (`agenda.mjs`/`agenda-panel-render.mjs`,
 * left untouched — Interno keeps that grid).
 *
 * A patient shows up here when a `cardio.consultas` entry set
 * `proximaConsultaFecha` inside the current week (Mon–Sun). That entry stays
 * on the patient forever, even after the visit happens — "Cerrar consulta"
 * (see `consulta-ic-wire.mjs`) appends a NEW entry dated today, so the row
 * must not disappear once closed. Instead: a row greys out + strikes through
 * when ANY entry dated inside the current week has `cerrada === true` (that
 * entry is the actual visit that fulfilled the pending date) — it stays
 * visible per spec ("gets greyed out and crossed over", not removed).
 */
import { getPatients } from '../../app-state.mjs';
import { mondayStartLocal, weekBoundsFromMonday } from '../../procedure-agenda-week.mjs';
import { escHtml } from '../../dom-escape.mjs';

function isConsultaExternaPatient(p) {
  var area = String((p && p.area) || '').trim().toUpperCase();
  return area.indexOf('CONSULTA EXTERNA') !== -1;
}

/** @param {string} iso 'YYYY-MM-DD' @returns {Date|null} local midnight, or null if unparseable */
function parseLocalIsoDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateInWeek(iso, week) {
  var d = parseLocalIsoDate(iso);
  if (!d) return false;
  return d.getTime() >= week.start.getTime() && d.getTime() < week.endExclusive.getTime();
}

/**
 * @param {object} patient
 * @param {{start:Date, endExclusive:Date}} week
 * @returns {null | {dueDate: string, done: boolean}}
 */
export function patientWeekConsultaStatus(patient, week) {
  var entries = (patient && patient.cardio && Array.isArray(patient.cardio.consultas))
    ? patient.cardio.consultas
    : [];
  var dueDate = null;
  var done = false;
  var doneEntryDate = null;
  entries.forEach(function (e) {
    if (!e) return;
    var pf = String(e.proximaConsultaFecha || '').trim();
    if (pf && dateInWeek(pf, week) && (!dueDate || pf < dueDate)) dueDate = pf;
    var d = String(e.date || '').trim();
    if (d && e.cerrada === true && dateInWeek(d, week)) {
      done = true;
      if (!doneEntryDate || d > doneEntryDate) doneEntryDate = d;
    }
  });
  if (!dueDate && !done) return null;
  return { dueDate: dueDate || doneEntryDate, done: done };
}

/** @returns {Array<{patient:object, dueDate:string, done:boolean}>} sorted by dueDate */
export function collectWeekConsultaRows(week) {
  var rows = [];
  getPatients().forEach(function (p) {
    if (!p || p.isDemo) return;
    if (!isConsultaExternaPatient(p)) return;
    var status = patientWeekConsultaStatus(p, week);
    if (!status) return;
    rows.push({ patient: p, dueDate: status.dueDate, done: status.done });
  });
  rows.sort(function (a, b) {
    return String(a.dueDate).localeCompare(String(b.dueDate)) ||
      String(a.patient.nombre || '').localeCompare(String(b.patient.nombre || ''), 'es');
  });
  return rows;
}

function formatDueDate(iso) {
  var d = parseLocalIsoDate(iso);
  if (!d) return escHtml(iso);
  return escHtml(
    d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
  );
}

function renderRowHtml(row) {
  return (
    '<div class="hf-agenda-consulta-row' +
    (row.done ? ' hf-agenda-row--done' : '') +
    '" data-patient-id="' +
    escHtml(row.patient.id) +
    '">' +
    '<span class="hf-agenda-consulta-row-name">' + escHtml(row.patient.nombre || '') + '</span>' +
    '<span class="hf-agenda-consulta-row-date">' + formatDueDate(row.dueDate) + '</span>' +
    '</div>'
  );
}

/** @param {Date} [anchor] any date inside the target week; defaults to today */
export function buildAgendaConsultaListHtml(anchor) {
  var week = weekBoundsFromMonday(mondayStartLocal(anchor || new Date()));
  var rows = collectWeekConsultaRows(week);
  if (!rows.length) {
    return '<div class="hf-agenda-consulta-empty">Sin consultas pendientes esta semana</div>';
  }
  return '<div class="hf-agenda-consulta-list">' + rows.map(renderRowHtml).join('') + '</div>';
}

/** Renders the Consulta Externa weekly list into the agenda mount, replacing the procedure calendar. */
export function renderAgendaConsultaListPanel() {
  var mount = document.getElementById('procedure-agenda-grid-mount');
  var rangeEl = document.getElementById('procedure-agenda-range');
  if (!mount) return;
  if (rangeEl) rangeEl.textContent = 'Esta semana';
  ['procedure-agenda-prev', 'procedure-agenda-next', 'procedure-agenda-new'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) btn.hidden = true;
  });
  mount.innerHTML = buildAgendaConsultaListHtml();
}
