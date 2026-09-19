/**
 * Modo Guardia — census table (Cama/Paciente/Alterados/Pendiente/Estado), built on the
 * shared workbench table grammar (teal-workbench redesign, screen 6a/6b).
 */
import { escHtml, escAttr } from '../dom-escape.mjs';
import { isTodoOverdue } from '../todos-due.mjs';
import { storage } from '../storage.js';
import { accesoFechaToDateInputValue } from '../patient-date-fields.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { getLabHistory } from '../clinical-read-model.mjs';
import { sortLabHistoryChronological, parseFechaLabToMs } from '../tend-core.mjs';
import { sortPatientsByPriorityThenBed } from '../../../lib/patient-priority-sort.mjs';
import { buildGuardiaTeamCensusGroups } from './unified-patient-grid-team-groups.mjs';
import { filterR4FollowUpPinPatients, R4_FOLLOWUP_PIN_LABEL } from './unified-patient-grid-board.mjs';
import { buildTableCardHeaderHtml, buildSummaryLineHtml } from './workbench/wb-table.mjs';
import { buildFilterChipsHtml } from './workbench/filter-chips.mjs';
import { appendExitingRows } from '../ui-motion.mjs';

const VITAL_LABELS = { ta: 'T/A', tas: 'T/A', fc: 'FC', fr: 'FR', temp: 'Temp', sat: 'SatO₂' };
const GUARDIA_CENSUS_FILTER_DEFAULT = 'todos';

export const GUARDIA_ESFUERZO_OPTIONS = [
  { id: 'full', icon: '🍪', label: 'Reanimar' },
  { id: 'show', icon: '🎭', label: 'Show' },
  { id: 'no', icon: '🚫', label: 'No reanimar' },
];
export const GUARDIA_PRONOSTICO_OPTIONS = [
  { id: 'good', icon: '🙂', label: 'Bueno' },
  { id: 'bad', icon: '🙁', label: 'Malo' },
];
export const GUARDIA_NOTA_MAX = 200;

/** @param {unknown} raw */
export function normalizeGuardiaEsfuerzo(raw) {
  const v = String(raw || '');
  return GUARDIA_ESFUERZO_OPTIONS.some((o) => o.id === v) ? v : null;
}

/** @param {unknown} raw */
export function normalizeGuardiaPronostico(raw) {
  const v = String(raw || '');
  return GUARDIA_PRONOSTICO_OPTIONS.some((o) => o.id === v) ? v : null;
}

/** @param {unknown} raw */
export function normalizeGuardiaNota(raw) {
  return String(raw == null ? '' : raw)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, GUARDIA_NOTA_MAX);
}

/** @param {{ guardiaEsfuerzo?: unknown, guardiaPronostico?: unknown, guardiaNota?: unknown }} patch */
export function normalizeGuardiaMarksPatch(patch) {
  const next = {};
  if (!patch || typeof patch !== 'object') return next;
  if (Object.prototype.hasOwnProperty.call(patch, 'guardiaEsfuerzo')) {
    next.guardiaEsfuerzo = normalizeGuardiaEsfuerzo(patch.guardiaEsfuerzo);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'guardiaPronostico')) {
    next.guardiaPronostico = normalizeGuardiaPronostico(patch.guardiaPronostico);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'guardiaNota')) {
    next.guardiaNota = normalizeGuardiaNota(patch.guardiaNota);
  }
  return next;
}

function guardiaMarkChipHtml(prefix, option, risk) {
  const title = `${prefix}: ${option.label}`;
  const cls = risk ? 'gct-chip gct-chip--risk' : 'gct-chip';
  return (
    `<span class="${cls}" title="${escAttr(title)}" aria-label="${escAttr(title)}">${option.icon}</span>`
  );
}

/** @param {object} p */
export function buildGuardiaMarksBadgesHtml(p) {
  const esfuerzo = GUARDIA_ESFUERZO_OPTIONS.find((o) => o.id === normalizeGuardiaEsfuerzo(p?.guardiaEsfuerzo));
  const pronostico = GUARDIA_PRONOSTICO_OPTIONS.find(
    (o) => o.id === normalizeGuardiaPronostico(p?.guardiaPronostico)
  );
  return (
    (esfuerzo ? guardiaMarkChipHtml('Esfuerzo', esfuerzo, esfuerzo.id === 'no') : '') +
    (pronostico ? guardiaMarkChipHtml('Pronóstico', pronostico, pronostico.id === 'bad') : '')
  );
}

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
 * @param {Date} [now] Reference time for the overdue check. Defaults to real now.
 * @returns {{ open: object[], overdue: object[] }}
 */
export function patientPendientes(patientId, now) {
  const todos = (storage.getTodos(patientId) || []).filter((t) => t && !t.completed);
  const overdue = todos.filter((t) => isTodoOverdue(t, now));
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

const STALE_LABS_MS = 7 * 24 * 60 * 60 * 1000;

/** Sin laboratorios en los últimos 7 días (o nunca): candidato a alta no dado de baja del censo. */
export function isProbableDischargeCandidate(p) {
  const hist = getLabHistory(p.id);
  if (!hist || !hist.length) return true;
  const newest = sortLabHistoryChronological(hist)[0];
  const ms = parseFechaLabToMs(newest.fecha, newest.hora);
  if (ms == null) return true;
  return Date.now() - ms > STALE_LABS_MS;
}

function bedLabel(p) {
  const joined = [p?.cuarto, p?.cama].filter(Boolean).join(' · ');
  return joined || String(p?.bed_label || '—');
}

/** First name + first last name, e.g. "MARIBEL BENITEZ BAZABE" -> "MARIBEL BENITEZ" — full name stays in title/aria-label. */
function patientShortName(name) {
  const words = String(name || '')
    .trim()
    .split(/[\s,]+/)
    .filter((w) => /^\p{L}/u.test(w));
  return words.length ? words.slice(0, 2).join(' ') : String(name || '—');
}

/**
 * @param {object} p
 * @returns {string}
 */
export function buildGuardiaCensusCardHtml(p) {
  const pendientes = patientPendientes(p.id);
  const status = guardiaPatientStatus(pendientes);
  const task = pendientes.overdue[0] || pendientes.open[0];
  const morePend = task ? pendientes.open.length - 1 : 0;
  const classes = ['gct-card'];
  if (status === 'vencido') classes.push('gct-card--alert');
  const staleLabs = !isPatientAdmissionIncomplete(p) && isProbableDischargeCandidate(p);
  if (staleLabs) classes.push('gct-card--stale-labs');
  const staleLabsChip = staleLabs
    ? '<span class="gct-chip gct-chip--stale-labs" title="Sin laboratorios en 7 días: posible alta" aria-label="Sin laboratorios en 7 días: posible alta">⏳</span>'
    : '';
  const name = String(p.name || p.nombre || '—');
  return (
    `<div class="${classes.join(' ')}" data-wb-row-id="${escAttr(p.id)}" role="button" tabindex="0">` +
    '<div class="gct-card__row">' +
    `<span class="gct-cell-bed">${escHtml(bedLabel(p))}</span>` +
    `<span class="gct-cell-name" title="${escAttr(name)}" aria-label="${escAttr(name)}">${escHtml(patientShortName(name))}</span>` +
    `<span class="gct-card__marks">${staleLabsChip}${buildGuardiaMarksBadgesHtml(p)}</span>` +
    '</div>' +
    '<div class="gct-task-row">' +
    `<span class="gct-task"${task ? ` title="${escAttr(String(task.text || ''))}"` : ''}>` +
    `${task ? escHtml(String(task.text || '')) : ''}</span>` +
    (morePend > 0
      ? `<span class="gct-task-more" title="${morePend} pendientes más">+${morePend}</span>`
      : '') +
    '</div>' +
    '</div>'
  );
}

const GCT_CARD_H_DEFAULT = 78;
// Floor/ceiling for how far fitGuardiaCards can resize a card. Bounds are set from the
// real pixel cost of each task-line tier below (padding 16 + row1 ~20 + gap 6 + N * 17.3
// line-height), not round numbers — MIN=40 or MAX=132 used to sit inside a line tier's
// needed height, so cards at those extremes clipped their own task text.
const GCT_CARD_H_MIN = 60;
const GCT_CARD_H_MAX = 200;

function guardiaScrollHost() {
  return document.getElementById('guardia-board-scroll');
}

// Thresholds are the minimum card height that tier's line count actually fits in
// (see GCT_CARD_H_MIN comment) — grant a tier only once there's room for it.
export function guardiaTaskLinesFor(cardHeight) {
  if (cardHeight >= 95) return '3';
  if (cardHeight >= 78) return '2';
  return '1';
}

/**
 * Grows or shrinks --gct-card-h so the census always fills #guardia-board-scroll
 * with no leftover blank space and no scrollbar (med-admin-panel.mjs pattern),
 * adjusting the task line-clamp to match. Loops because one pass under/over
 * corrects when the grid has more than one column (changing every card's height
 * by X changes total scroll height by X per ROW, not per card).
 */
function fitGuardiaCards(mountEl) {
  const cards = mountEl.querySelectorAll('.gct-card');
  if (!cards.length) return;
  const host = guardiaScrollHost();
  if (!host) return;
  for (let guard = 0; guard < 20; guard += 1) {
    const overflow = host.scrollHeight - host.clientHeight;
    const current = parseFloat(getComputedStyle(mountEl).getPropertyValue('--gct-card-h')) || GCT_CARD_H_DEFAULT;
    let next = current;
    if (overflow > 1 && current > GCT_CARD_H_MIN) {
      next = Math.max(GCT_CARD_H_MIN, current - Math.max(2, Math.ceil(overflow / 40)));
    } else if (overflow < -8 && current < GCT_CARD_H_MAX) {
      next = Math.min(GCT_CARD_H_MAX, current + Math.max(2, Math.ceil(-overflow / 40)));
    } else {
      return;
    }
    if (next === current) return;
    mountEl.style.setProperty('--gct-card-h', `${next}px`);
    mountEl.style.setProperty('--gct-task-lines', guardiaTaskLinesFor(next));
  }
}

function wireGuardiaCardsResize(mountEl) {
  if (mountEl._gctResizeWired) return;
  mountEl._gctResizeWired = true;
  if (typeof ResizeObserver === 'undefined') return;
  const ro = new ResizeObserver(() => fitGuardiaCards(mountEl));
  ro.observe(mountEl);
}

/** Group keys the user collapsed. Survives re-renders (mountGuardiaCensusTable replaces innerHTML each refresh). */
export const collapsedGroupIds = new Set();

function groupBlockHtml(key, label, count, cardsHtml) {
  const open = collapsedGroupIds.has(key) ? '' : ' open';
  return (
    `<details class="gct-team-group" data-group-key="${escAttr(key)}"${open}>` +
    `<summary class="gct-divider">${escHtml(label)} · ${count}</summary>` +
    `<div class="gct-grid">${cardsHtml}</div>` +
    '</details>'
  );
}

function batchRowsHtml(patients, guardiasMap) {
  return sortPatientsByPriorityThenBed(patients, guardiasMap)
    .map(buildGuardiaCensusCardHtml)
    .join('');
}

function teamGroupsHtml(patients, guardiasMap, groupCtx) {
  return buildGuardiaTeamCensusGroups(patients, groupCtx)
    .filter((group) => group.patients.length)
    .map((group) =>
      groupBlockHtml(
        group.teamId || group.label,
        group.label,
        group.patients.length,
        batchRowsHtml(group.patients, guardiasMap)
      )
    )
    .join('');
}

function guardiaCensusBodyHtml(patients, guardiasMap, userRank, groupCtx) {
  if (userRank !== 'R4') return teamGroupsHtml(patients || [], guardiasMap, groupCtx);
  let body = '';
  const followUpPatients = filterR4FollowUpPinPatients(patients);
  const followUpIds = new Set(followUpPatients.map((p) => p.id));
  if (followUpPatients.length) {
    body += groupBlockHtml(
      R4_FOLLOWUP_PIN_LABEL,
      R4_FOLLOWUP_PIN_LABEL,
      followUpPatients.length,
      batchRowsHtml(followUpPatients, guardiasMap)
    );
  }
  const rest = (patients || []).filter((p) => p?.id && !followUpIds.has(p.id));
  return body + teamGroupsHtml(rest, guardiasMap, groupCtx);
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
  // Cambiar sala/equipo lives here (not a separate head bar) to keep the census
  // grid's vertical room — the click is handled by a delegated document listener
  // in guardia-board-chrome.mjs, so the button works from anywhere in the DOM.
  const cambiarBtn = '<button type="button" class="btn-med-secondary" id="guardia-btn-cambiar-sala">Cambiar</button>';
  const header = buildTableCardHeaderHtml({ title, actionsHtml: cambiarBtn + chipsHtml });
  const filtered = applyGuardiaCensusFilter(all, activeFilter);
  const bodyHtml = guardiaCensusBodyHtml(filtered, guardiasMap, userRank, groupCtx);
  const summary = guardiaCensusSummaryLine(filtered);
  return (
    '<div class="wb-table-card guardia-census-table">' +
    header +
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

  if (!container._gctToggleWired) {
    container._gctToggleWired = true;
    // toggle does not bubble — capture phase is required for delegation.
    container.addEventListener(
      'toggle',
      (ev) => {
        const details = ev.target.closest && ev.target.closest('details.gct-team-group');
        const key = details && details.getAttribute('data-group-key');
        if (!key) return;
        if (details.open) collapsedGroupIds.delete(key);
        else collapsedGroupIds.add(key);
      },
      true
    );
  }

  const activeFilter = container._gctActiveFilter || GUARDIA_CENSUS_FILTER_DEFAULT;

  function wireRows() {
    if (typeof onRowClick !== 'function') return;
    container.querySelectorAll('[data-wb-row-id]').forEach((row) => {
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
    // Reassess from the full 2-line card height on every render — a previous
    // filter/collapse pass may have shrunk these to fit fewer/shorter rows.
    container.style.removeProperty('--gct-card-h');
    container.style.removeProperty('--gct-task-lines');
    var prevRows = Object.create(null);
    container.querySelectorAll('[data-wb-row-id]').forEach((row) => {
      prevRows[row.getAttribute('data-wb-row-id')] = row;
    });
    container.innerHTML = buildGuardiaCensusTableHtml(patients, guardiasMap, userRank, groupCtx, filterId);
    var newIds = new Set();
    container.querySelectorAll('[data-wb-row-id]').forEach((row) => {
      var id = row.getAttribute('data-wb-row-id');
      newIds.add(id);
      if (!prevRows[id]) row.classList.add('row-enter');
    });
    appendExitingRows(container, prevRows, newIds);
    wireRows();
    wireChips();
    wireGuardiaCardsResize(container);
    fitGuardiaCards(container);
  }

  renderAt(activeFilter);
}
