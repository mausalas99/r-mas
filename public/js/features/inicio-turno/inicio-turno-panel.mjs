/**
 * Inicio de turno (screen 12a) — full-screen overlay panel.
 *
 * Entry point decision (documented, not silently assumed): this is NOT wired
 * in as a 3rd entry next to Sala/Interconsulta/Guardia in the header
 * segment (public/js/features/chrome.mjs `getUiDensity`/`setUiDensity`). That
 * state machine is a strict, mutually-exclusive 2-value density switch deeply
 * wired into tab rendering, census rendering and entrega phases — adding a
 * permanent mode would touch all of that for a screen the resident visits
 * once, briefly, before starting work (per the design brief: "el residente
 * abre la app a las 07:02, antes del pase"). Instead this mounts as a
 * dismissable full-window overlay (same `.wb-scrim` pattern as
 * workbench/confirm.mjs), reachable on demand from the command palette
 * (⌘/ → "Inicio de turno", wired in command-palette-model.mjs /
 * command-palette.mjs). Its primary action ("Recibir N pacientes") simply
 * closes the overlay — the resident lands on whatever mode was already open
 * behind it.
 *
 * Data honesty notes (see also inicio-turno-summary.mjs / inicio-turno-zones.mjs):
 * - "Tus zonas hoy" uses the real per-patient `area` field, not the mockup's
 *   placeholder N/V/HD/HI/NM labels (those are SOAP objective-by-system
 *   sections inside one patient's note — lib/nota-evolucion/objetivo-derive.mjs
 *   — not a ward/zone assignment model).
 * - "Internos del turno" has no backing data at all (R+ has no "interno" role
 *   and no intern↔zone/bed assignment model) — rendered as an empty state.
 * - The outgoing resident's free-text handoff paragraph has no data model in
 *   R+ (entrega tracks who covers whom, not a shift-wide prose note) —
 *   rendered as an empty state instead of a fabricated paragraph. The bed-
 *   mention extractor (inicio-turno-bed-mentions.mjs) is still implemented
 *   and tested so it's ready the day that field exists.
 */
import { escHtml } from '../../dom-escape.mjs';
import { getPatients } from '../../app-state.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { mountModeFrame } from '../workbench/mode-frame.mjs';
import { mountCountersBand } from '../workbench/counters-band.mjs';
import { buildTableCardHeaderHtml, buildColumnHeadHtml, buildRowHtml, buildSummaryLineHtml } from '../workbench/wb-table.mjs';
import { buildFilterChipHtml } from '../workbench/filter-chips.mjs';
import { mountEmptyState } from '../workbench/empty-state.mjs';
import {
  computeHeredasPendientesSummary,
  computeTomaSignosSummary,
  computeIngresosNocheSummary,
  buildLoPrimeroRows,
} from './inicio-turno-summary.mjs';
import {
  deriveZonesFromCensus,
  readInicioTurnoZonesPreference,
  writeInicioTurnoZonesPreference,
  zonesFooterNote,
} from './inicio-turno-zones.mjs';

const LO_PRIMERO_GRID = '92px 1fr 128px 96px';

let dom = null;
let selectedZoneIds = [];

function residentContextLabel() {
  const user = clinicalSessionContext.user;
  const rank = String(user?.rank || '').trim();
  const name = String(user?.clinical_name || user?.username || '').trim();
  const who = name ? `${rank} ${name}`.trim() : rank || 'Residente';
  const now = new Date();
  const day = now.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
  const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time} · ${who}`;
}

function ensureDom() {
  if (dom) return dom;

  const scrim = document.createElement('div');
  scrim.className = 'wb-scrim wb-it-scrim';
  scrim.hidden = true;
  scrim.addEventListener('click', (ev) => {
    if (ev.target === scrim) closeInicioTurnoPanel();
  });

  const win = document.createElement('div');
  win.className = 'wb-it-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-modal', 'true');
  win.setAttribute('aria-label', 'Inicio de turno');

  const frameHost = document.createElement('div');
  frameHost.id = 'inicio-turno-mode-frame';

  const countersHost = document.createElement('div');
  countersHost.id = 'inicio-turno-counters';

  const body = document.createElement('div');
  body.className = 'wb-it-body';

  const colLeft = document.createElement('div');
  colLeft.className = 'wb-it-col wb-it-col-left';
  const loPrimeroHost = document.createElement('div');
  loPrimeroHost.id = 'inicio-turno-lo-primero';
  loPrimeroHost.className = 'wb-it-lo-primero';
  const entregaHost = document.createElement('div');
  entregaHost.id = 'inicio-turno-entrega';
  colLeft.appendChild(loPrimeroHost);
  colLeft.appendChild(entregaHost);

  const colRight = document.createElement('div');
  colRight.className = 'wb-it-col wb-it-col-right';
  const zonasHost = document.createElement('div');
  zonasHost.id = 'inicio-turno-zonas';
  const internosHost = document.createElement('div');
  internosHost.id = 'inicio-turno-internos';
  const labsEmptyHost = document.createElement('div');
  labsEmptyHost.id = 'inicio-turno-labs-empty';
  const icEmptyHost = document.createElement('div');
  icEmptyHost.id = 'inicio-turno-ic-empty';
  colRight.appendChild(zonasHost);
  colRight.appendChild(internosHost);
  colRight.appendChild(labsEmptyHost);
  colRight.appendChild(icEmptyHost);

  body.appendChild(colLeft);
  body.appendChild(colRight);

  win.appendChild(frameHost);
  win.appendChild(countersHost);
  win.appendChild(body);
  scrim.appendChild(win);
  document.body.appendChild(scrim);

  dom = {
    scrim,
    win,
    frameHost,
    countersHost,
    loPrimeroHost,
    entregaHost,
    zonasHost,
    internosHost,
    labsEmptyHost,
    icEmptyHost,
  };
  return dom;
}

function renderModeFrame(host, total) {
  mountModeFrame(host, {
    modeName: 'Inicio de turno',
    context: residentContextLabel(),
    secondaryActions: [{ label: 'Censo completo', onClick: () => closeInicioTurnoPanel() }],
    primaryAction: {
      label: `Recibir ${total} paciente${total === 1 ? '' : 's'}`,
      onClick: () => closeInicioTurnoPanel(),
    },
  });
}

function renderCounters(host, patients) {
  const heredas = computeHeredasPendientesSummary(patients);
  const signos = computeTomaSignosSummary(patients);
  const ingresos = computeIngresosNocheSummary(patients);

  mountCountersBand(host, [
    {
      label: 'Heredas pendientes',
      figure: `${heredas.open} abierto${heredas.open === 1 ? '' : 's'}`,
      detail: heredas.overdue > 0 ? `${heredas.overdue} vencido${heredas.overdue === 1 ? '' : 's'}` : '',
      tone: 'alert',
    },
    {
      label: 'Toma de signos',
      figure: `${signos.receivedToday} de ${signos.total} recibidos`,
      progress: { percent: signos.percent },
    },
    {
      label: 'Ingresos de la noche',
      figure: `${ingresos.admittedToday} nuevo${ingresos.admittedToday === 1 ? '' : 's'}`,
      detail: ingresos.incompleteChart > 0 ? `${ingresos.incompleteChart} con ficha incompleta` : '',
    },
  ]);
}

function loPrimeroRowHtml(row) {
  const lineOne = `${escHtml(row.name)} <span class="wb-it-line-muted">${escHtml(
    [row.ageLabel, row.stayLabel].filter(Boolean).join(' · ')
  )}</span>`;
  const lineTwo = row.alteredText
    ? `${escHtml(row.reasonText)} · <span class="wb-it-altered">${escHtml(row.alteredText)}</span>`
    : escHtml(row.reasonText);
  const nameCell =
    `<div class="wb-it-row-lines"><span class="wb-it-row-name">${lineOne}</span>` +
    `<span class="wb-it-row-reason">${lineTwo}</span></div>`;
  const sinceClass =
    row.urgency === 'vencido' ? 'wb-it-since--vencido' : row.urgency === 'en_espera' ? 'wb-it-since--espera' : 'wb-it-since--curso';
  const sinceCell = `<span class="wb-it-since ${sinceClass}">${escHtml(row.sinceLabel)}</span>`;
  const btnClass = row.action.tone === 'primary' ? 'wb-btn wb-btn-primary' : 'wb-btn wb-btn-secondary';
  const actionCell = `<button type="button" class="${btnClass}" data-it-row-action="${escHtml(row.id)}">${escHtml(row.action.label)}</button>`;
  return buildRowHtml({
    id: row.id,
    cellsHtml: [`<span class="wb-it-bed">${escHtml(row.bedLabel)}</span>`, nameCell, sinceCell, actionCell],
    alert: row.urgency === 'vencido',
    twoLine: true,
    gridTemplate: LO_PRIMERO_GRID,
  });
}

function renderLoPrimero(host, patients) {
  const { rows, remainingCount, totalCount } = buildLoPrimeroRows(patients, { limit: 4 });
  const rowsHtml = rows.map(loPrimeroRowHtml).join('');
  const summary = rows.length
    ? `${remainingCount} paciente${remainingCount === 1 ? '' : 's'} sin nada urgente al recibir`
    : `Los ${totalCount} pacientes están sin nada urgente al recibir`;
  host.innerHTML =
    '<div class="wb-table-card wb-it-table-card">' +
    buildTableCardHeaderHtml({
      title: `Lo primero · ${rows.length} cama${rows.length === 1 ? '' : 's'}`,
      actionsHtml: `<span class="wb-it-table-sub">de ${totalCount}</span>`,
    }) +
    buildColumnHeadHtml(['Cama', 'Por qué', 'Desde', 'Acción'], LO_PRIMERO_GRID) +
    `<div class="wb-table-body">${rowsHtml}</div>` +
    buildSummaryLineHtml(summary) +
    '</div>';

  host.querySelectorAll('[data-it-row-action]').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const patientId = btn.getAttribute('data-it-row-action');
      openPatientFromInicioTurno(patientId);
    });
  });
}

function openPatientFromInicioTurno(patientId) {
  closeInicioTurnoPanel();
  void import('../patients.mjs').then((mod) => {
    if (typeof mod.selectPatient === 'function') mod.selectPatient(patientId);
  });
}

/** No shift-wide free-text handoff paragraph exists in R+ (see module header) — empty state. */
function renderEntregaEmptyState(host) {
  mountEmptyState(host, {
    label: 'Entrega de la guardia saliente',
    missing: 'R+ todavía no guarda un resumen de texto libre de la guardia que entrega.',
    whenArrives: 'Se habilita cuando exista un campo de entrega de turno en R+; mientras tanto, revisa los pendientes heredados arriba.',
  });
}

function renderZonasCard(host, patients) {
  const zones = deriveZonesFromCensus(patients);
  if (!zones.length) {
    mountEmptyState(host, {
      label: 'Tus zonas hoy',
      missing: 'Ningún paciente del censo tiene un área asignada todavía.',
      whenArrives: 'Se llenan solas en cuanto se registre el área de cada paciente.',
    });
    return;
  }

  function paint() {
    const chipsHtml = zones
      .map((z) => {
        const isActive = selectedZoneIds.includes(z.id);
        return buildFilterChipHtml(
          { id: z.id, label: `${z.label} · ${z.count}` },
          isActive ? z.id : null,
          'teal'
        );
      })
      .join('');
    host.innerHTML =
      '<div class="wb-table-card wb-it-zonas-card">' +
      buildTableCardHeaderHtml({ title: 'Tus zonas hoy' }) +
      '<div class="wb-it-zonas-body">' +
      '<p class="wb-it-zonas-hint">Elige las zonas que revisas tú. Filtran el censo mientras dure el turno.</p>' +
      `<div class="wb-chips">${chipsHtml}</div>` +
      `<p class="wb-it-zonas-footer">${escHtml(zonesFooterNote(selectedZoneIds))}</p>` +
      '</div></div>';

    host.querySelectorAll('[data-wb-chip-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-wb-chip-id');
        selectedZoneIds = selectedZoneIds.includes(id)
          ? selectedZoneIds.filter((z) => z !== id)
          : [...selectedZoneIds, id];
        writeInicioTurnoZonesPreference(selectedZoneIds);
        paint();
      });
    });
  }

  paint();
}

/** No intern role / intern↔zone assignment model exists in R+ (see module header) — empty state. */
function renderInternosEmptyState(host) {
  mountEmptyState(host, {
    label: 'Internos del turno',
    missing: 'R+ no tiene un rol de interno ni una asignación de zona/camas por interno todavía.',
    whenArrives: 'Se habilita cuando exista ese modelo de datos; por ahora, coordina la cobertura fuera de la app.',
  });
}

function renderLabsEmptyState(host) {
  mountEmptyState(host, {
    label: 'Labs de hoy',
    missing: 'Todavía no hay resultados de hoy.',
    whenArrives: 'Aparecen aquí y en cada paciente en cuanto se registran en R+.',
    exitLabel: 'Abrir laboratorio',
  });
  const exit = host.querySelector('[data-wb-empty-exit]');
  if (exit) {
    exit.addEventListener('click', () => {
      closeInicioTurnoPanel();
      if (typeof window !== 'undefined' && typeof window.switchAppTab === 'function') {
        window.switchAppTab('lab');
      }
    });
  }
}

function renderInterconsultasEmptyState(host) {
  mountEmptyState(host, {
    label: 'Interconsultas',
    missing: 'Sin solicitudes nuevas para revisar aquí.',
    whenArrives: 'Las que ya estén en seguimiento siguen disponibles en el modo Interconsultas.',
    exitLabel: 'Abrir modo interconsultas',
  });
  const exit = host.querySelector('[data-wb-empty-exit]');
  if (exit) {
    exit.addEventListener('click', () => {
      closeInicioTurnoPanel();
      if (typeof window !== 'undefined' && typeof window.setWorkModeFromHeader === 'function') {
        window.setWorkModeFromHeader('interconsulta');
      }
    });
  }
}

function onKeydown(ev) {
  if (ev.key === 'Escape') closeInicioTurnoPanel();
}

export function openInicioTurnoPanel() {
  const d = ensureDom();
  const patients = getPatients() || [];
  selectedZoneIds = readInicioTurnoZonesPreference();

  renderModeFrame(d.frameHost, patients.length);
  renderCounters(d.countersHost, patients);
  renderLoPrimero(d.loPrimeroHost, patients);
  renderEntregaEmptyState(d.entregaHost);
  renderZonasCard(d.zonasHost, patients);
  renderInternosEmptyState(d.internosHost);
  renderLabsEmptyState(d.labsEmptyHost);
  renderInterconsultasEmptyState(d.icEmptyHost);

  d.scrim.hidden = false;
  requestAnimationFrame(() => d.scrim.classList.add('wb-scrim--open'));
  document.addEventListener('keydown', onKeydown);
}

export function closeInicioTurnoPanel() {
  if (!dom) return;
  dom.scrim.classList.remove('wb-scrim--open');
  dom.scrim.hidden = true;
  document.removeEventListener('keydown', onKeydown);
}

export function isInicioTurnoPanelOpen() {
  return !!dom && !dom.scrim.hidden;
}
