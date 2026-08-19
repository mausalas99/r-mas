/**
 * Modo Guardia — census table (Cama/Paciente/Alterados/Pendiente/Estado), built on the
 * shared workbench table grammar (teal-workbench redesign, screen 6a/6b).
 */
import { escHtml } from '../dom-escape.mjs';
import { isTodoOverdue } from '../todos-due.mjs';
import { storage } from '../storage.js';
import { accesoFechaToDateInputValue } from '../patient-date-fields.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { sortPatientsByPriorityThenBed } from '../../../lib/patient-priority-sort.mjs';
import { buildGuardiaTeamCensusGroups } from './unified-patient-grid-team-groups.mjs';
import { filterR4FollowUpPinPatients, R4_FOLLOWUP_PIN_LABEL } from './unified-patient-grid-board.mjs';
import {
  buildTableCardHeaderHtml,
  buildColumnHeadHtml,
  buildRowHtml,
  buildSummaryLineHtml,
} from './workbench/wb-table.mjs';
import { buildStatusLabelHtml } from './workbench/status-label.mjs';
import { buildFilterChipsHtml } from './workbench/filter-chips.mjs';

const VITAL_LABELS = { ta: 'T/A', tas: 'T/A', fc: 'FC', fr: 'FR', temp: 'Temp', sat: 'SatO₂' };
const GUARDIA_TABLE_GRID = '92px 1fr 132px 1fr 84px';
const GUARDIA_CENSUS_FILTER_DEFAULT = 'todos';

function vitalLabel(key) {
  return VITAL_LABELS[key] || String(key || '').toUpperCase();
}

function lastVitalsEntry(p) {
  const hist = Array.isArray(p?.monitoreo?.historial) ? p.monitoreo.historial : [];
  return hist.length ? hist[hist.length - 1] : null;
}

function entryVitals(entry) {
  if (!entry) return {};
  if (entry.vitals && typeof entry.vitals === 'object') return entry.vitals;
  if (entry.values && typeof entry.values === 'object') return entry.values;
  return {};
}

/**
 * Vitals-only alterados summary (labs are not merged in this pass — see plan).
 * @param {object} p
 * @returns {{ taken: boolean, chips: string[] }}
 */
export function alteradosForPatient(p) {
  const entry = lastVitalsEntry(p);
  if (!entry) return { taken: false, chips: [] };
  const vitals = entryVitals(entry);
  const alt = entry.alteredAt && typeof entry.alteredAt === 'object' ? entry.alteredAt : {};
  const chips = Object.keys(alt)
    .filter((k) => vitals[k] != null)
    .map((k) => `${vitalLabel(k)} ${vitals[k]}`);
  return { taken: true, chips };
}

/**
 * @param {string} patientId
 * @returns {{ open: object[], overdue: object[] }}
 */
export function patientPendientes(patientId) {
  const todos = (storage.getTodos(patientId) || []).filter((t) => t && !t.completed);
  const overdue = todos.filter((t) => isTodoOverdue(t));
  return { open: todos, overdue };
}

/**
 * VENCIDO / EN CURSO / ABIERTO / LISTO. EN CURSO comes from the todo `inProgress`
 * flag (storage-todo-normalize.mjs) — set while a pendiente is actively being worked.
 * @param {{ open: object[], overdue: object[] }} pendientes
 * @returns {'vencido'|'en_curso'|'abierto'|'listo'}
 */
export function guardiaPatientStatus(pendientes) {
  if (pendientes.overdue.length) return 'vencido';
  if (pendientes.open.some((t) => t && t.inProgress)) return 'en_curso';
  if (pendientes.open.length) return 'abierto';
  return 'listo';
}

/**
 * Local-calendar-day YYYY-MM-DD for an ISO datetime, or '' when invalid.
 * @param {unknown} iso
 * @returns {string}
 */
function isoDatetimeToLocalDateInputValue(iso) {
  const s = String(iso == null ? '' : iso).trim();
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  );
}

/**
 * Admission date for the Guardia "Ingresos" counter/filter (decision D3a).
 * Prefers `registeredAt` — already stamped by `stampPatientRegistrationMeta`
 * the moment a patient is added to the census, with no manual entry step —
 * over the FIMI (servicio)/FIUX (urgencias) fields, which are hand-typed and
 * exist for older/synced records that predate `registeredAt`. Patients are
 * stored as a JSON blob (no fixed SQL columns), so this needs no
 * `lib/db/schema.mjs` migration — just a new property on the patient object,
 * already written by `patient-registration-meta.mjs`.
 * @param {object} p
 * @returns {string} YYYY-MM-DD, or '' when unknown
 */
export function admissionDateForPatient(p) {
  return (
    isoDatetimeToLocalDateInputValue(p?.registeredAt) ||
    accesoFechaToDateInputValue(p?.fimiFecha) ||
    accesoFechaToDateInputValue(p?.fiuxFecha) ||
    ''
  );
}

function isSameLocalDateAsToday(isoDate) {
  if (!isoDate) return false;
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** @param {object} p */
export function isPatientAdmittedToday(p) {
  return isSameLocalDateAsToday(admissionDateForPatient(p));
}

function bedLabel(p) {
  const joined = [p?.cuarto, p?.cama].filter(Boolean).join(' · ');
  return joined || String(p?.bed_label || '—');
}

function alteradosCellHtml(p) {
  const a = alteradosForPatient(p);
  if (!a.taken) return '<span class="gct-cell-warn">sin toma 08:00</span>';
  if (!a.chips.length) return '<span class="gct-cell-muted">sin alterados</span>';
  const shown = a.chips.slice(0, 2);
  const rest = a.chips.length - shown.length;
  const tail = rest > 0 ? ` <span class="gct-cell-muted">+${rest}</span>` : '';
  return `<span class="gct-cell-alert">${shown.map(escHtml).join(' · ')}</span>${tail}`;
}

function pendienteCellHtml(pendientes) {
  const first = pendientes.open[0];
  if (!first) return '<span class="gct-cell-muted">—</span>';
  return escHtml(String(first.text || ''));
}

/**
 * @param {object} p
 * @returns {string}
 */
export function buildGuardiaCensusTableRowHtml(p) {
  const pendientes = patientPendientes(p.id);
  const status = guardiaPatientStatus(pendientes);
  const cellsHtml = [
    `<span class="gct-cell-bed">${escHtml(bedLabel(p))}</span>`,
    `<span class="gct-cell-name">${escHtml(String(p.name || p.nombre || '—'))}</span>`,
    alteradosCellHtml(p),
    pendienteCellHtml(pendientes),
    buildStatusLabelHtml(status),
  ];
  return buildRowHtml({
    id: p.id,
    cellsHtml,
    alert: status === 'vencido',
    gridTemplate: GUARDIA_TABLE_GRID,
  });
}

function dividerHtml(label) {
  return `<div class="gct-divider">${escHtml(label)}</div>`;
}

function batchRowsHtml(patients, guardiasMap) {
  return sortPatientsByPriorityThenBed(patients, guardiasMap)
    .map(buildGuardiaCensusTableRowHtml)
    .join('');
}

function guardiaCensusBodyHtml(patients, guardiasMap, userRank, groupCtx) {
  if (userRank !== 'R4') return batchRowsHtml(patients, guardiasMap);
  let body = '';
  const followUpPatients = filterR4FollowUpPinPatients(patients);
  const followUpIds = new Set(followUpPatients.map((p) => p.id));
  if (followUpPatients.length) {
    body += dividerHtml(R4_FOLLOWUP_PIN_LABEL) + batchRowsHtml(followUpPatients, guardiasMap);
  }
  const rest = (patients || []).filter((p) => p?.id && !followUpIds.has(p.id));
  buildGuardiaTeamCensusGroups(rest, groupCtx).forEach((group) => {
    if (!group.patients.length) return;
    body += dividerHtml(group.label) + batchRowsHtml(group.patients, guardiasMap);
  });
  return body;
}

function guardiaCensusSummaryLine(patients) {
  const quiet = patients.filter(
    (p) => alteradosForPatient(p).chips.length === 0 && patientPendientes(p.id).open.length === 0
  ).length;
  if (!quiet) return '';
  return `${quiet} paciente${quiet === 1 ? '' : 's'} sin alterados ni pendientes`;
}

/**
 * @param {object[]} patients
 * @returns {{ id: string, label: string }[]}
 */
function guardiaCensusFilterChips(patients) {
  const pendienteCount = patients.filter((p) => patientPendientes(p.id).open.length > 0).length;
  return [
    { id: 'pendiente', label: `Con pendiente · ${pendienteCount}` },
    { id: 'todos', label: 'Todos' },
    { id: 'ingresos', label: 'Ingresos' },
  ];
}

function applyGuardiaCensusFilter(patients, activeId) {
  if (activeId === 'pendiente') return patients.filter((p) => patientPendientes(p.id).open.length > 0);
  if (activeId === 'ingresos') return patients.filter((p) => isPatientAdmittedToday(p));
  return patients;
}

/**
 * @param {object[]} patients
 * @param {Map<string, object>} guardiasMap
 * @param {string} [userRank]
 * @param {{ teams?: object[], assignments?: object[], now?: string|Date|number }} [groupCtx]
 * @param {string} [activeFilter] one of 'pendiente' | 'todos' | 'ingresos'
 * @returns {string}
 */
export function buildGuardiaCensusTableHtml(
  patients,
  guardiasMap,
  userRank = 'R1',
  groupCtx = {},
  activeFilter = GUARDIA_CENSUS_FILTER_DEFAULT
) {
  const all = patients || [];
  const title = `Censo · ${all.length} paciente${all.length === 1 ? '' : 's'}`;
  const chipsHtml = buildFilterChipsHtml(guardiaCensusFilterChips(all), activeFilter);
  const header = buildTableCardHeaderHtml({ title, actionsHtml: chipsHtml });
  const colhead = buildColumnHeadHtml(
    ['Cama', 'Paciente', 'Alterados', 'Pendiente', 'Estado'],
    GUARDIA_TABLE_GRID
  );
  const filtered = applyGuardiaCensusFilter(all, activeFilter);
  const bodyHtml = guardiaCensusBodyHtml(filtered, guardiasMap, userRank, groupCtx);
  const summary = guardiaCensusSummaryLine(filtered);
  return (
    '<div class="wb-table-card guardia-census-table">' +
    header +
    colhead +
    `<div class="wb-table-body">${bodyHtml}</div>` +
    (summary ? buildSummaryLineHtml(summary) : '') +
    '</div>'
  );
}

/**
 * @param {HTMLElement} container
 * @param {object[]} patients
 * @param {Map<string, object>} guardiasMap
 * @param {string} userRank
 * @param {{ teams?: object[], assignments?: object[], now?: string|Date|number }} groupCtx
 * @param {(patientId: string) => void} onRowClick
 */
export function mountGuardiaCensusTable(container, patients, guardiasMap, userRank, groupCtx, onRowClick) {
  if (!container) return;
  container.classList.remove('patient-chips-grid', 'patient-chips-grid--guardia');
  container.classList.add('guardia-census-table-mount');

  const activeFilter = container._gctActiveFilter || GUARDIA_CENSUS_FILTER_DEFAULT;

  function wireRows() {
    if (typeof onRowClick !== 'function') return;
    container.querySelectorAll('.wb-row[data-wb-row-id]').forEach((row) => {
      const open = () => onRowClick(row.getAttribute('data-wb-row-id'));
      row.addEventListener('click', open);
      row.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          open();
        }
      });
    });
  }

  function wireChips() {
    container.querySelectorAll('[data-wb-chip-id]').forEach((btn) => {
      btn.addEventListener('click', () => renderAt(btn.getAttribute('data-wb-chip-id')));
    });
  }

  function renderAt(filterId) {
    container._gctActiveFilter = filterId;
    container.innerHTML = buildGuardiaCensusTableHtml(patients, guardiasMap, userRank, groupCtx, filterId);
    wireRows();
    wireChips();
  }

  renderAt(activeFilter);
}
