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
 * The window body is Preact (inicio-turno-view.jsx); this file owns the scrim,
 * Esc, the numbers and the callbacks.
 *
 * Data honesty notes (see also inicio-turno-summary.mjs / inicio-turno-zones.mjs):
 * - "Tus zonas hoy" uses the real per-patient `area` field, not the mockup's
 *   placeholder N/V/HD/HI/NM labels (those are SOAP objective-by-system
 *   sections inside one patient's note
 *   — not a ward/zone assignment model).
 * - "Internos del turno" has no backing data at all (Interno MIP phones exist,
 *   but there is no intern↔zone/bed assignment model) — rendered as an empty state.
 * - The outgoing resident's free-text handoff paragraph has no data model in
 *   R+ (entrega tracks who covers whom, not a shift-wide prose note) —
 *   rendered as an empty state instead of a fabricated paragraph. Its bed-
 *   mention extractor (inicio-turno-bed-mentions.mjs) was unused and removed
 *   2026-09-24; rebuild it the day that field exists.
 */
import { getPatients } from '../../app-state.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import { drawInicioTurno } from './inicio-turno-view.jsx';
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
} from './inicio-turno-zones.mjs';

let dom = null;

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
  scrim.appendChild(win);
  document.body.appendChild(scrim);

  dom = { scrim, win };
  return dom;
}

function openPatientFromInicioTurno(patientId) {
  closeInicioTurnoPanel();
  void import('../patients.mjs').then((mod) => {
    if (typeof mod.selectPatient === 'function') mod.selectPatient(patientId);
  });
}

function closeThen(fn) {
  return () => {
    closeInicioTurnoPanel();
    fn();
  };
}

function onKeydown(ev) {
  if (ev.key === 'Escape') closeInicioTurnoPanel();
}

export function openInicioTurnoPanel() {
  const d = ensureDom();
  const patients = getPatients() || [];

  drawInicioTurno(d.win, {
    context: residentContextLabel(),
    total: patients.length,
    heredas: computeHeredasPendientesSummary(patients),
    signos: computeTomaSignosSummary(patients),
    ingresos: computeIngresosNocheSummary(patients),
    lo: buildLoPrimeroRows(patients, { limit: 4 }),
    zones: deriveZonesFromCensus(patients),
    initialZones: readInicioTurnoZonesPreference(),
    onZonesChange: writeInicioTurnoZonesPreference,
    onClose: closeInicioTurnoPanel,
    onOpenPatient: openPatientFromInicioTurno,
    onOpenLab: closeThen(() => window.switchAppTab?.('lab')),
    onOpenInterconsulta: closeThen(() => window.setWorkModeFromHeader?.('interconsulta')),
  });

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
