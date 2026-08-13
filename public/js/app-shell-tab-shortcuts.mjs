/**
 * ⌘1–4 tab shortcuts: first press switches app tab; repeat cycles inner views.
 * Pure resolvers are testable without DOM.
 */
import { isGuardiaMode, isPaseMode, toggleGuardiaMode } from './features/chrome.mjs';
import {
  getConsolidatedTabs,
  consolidatedInnerTabButtonId,
  migrateGranularInner,
} from './expediente-tabs.mjs';
import { LAB_INNER_SECTIONS } from './expediente-group-row.mjs';
import { currentLabInner, switchLabInner } from './features/patient-dashboard/lab-inner.mjs';
import { switchAppTab } from './features/pase-board-app-tabs.mjs';
import { switchConsolidatedTab, openPaseSectionInNormal } from './features/pase-board-navigation.mjs';
import { getActiveInnerTab } from './features/pase-board.mjs';
import { rt } from './features/pase-board-runtime.mjs';
import { getMedSubview, setMedSubview } from './features/med-pharm-profile-panel.mjs';
import { medOutputTab } from './features/medications-runtime-state.mjs';
import { setMedOutputTab } from './features/medications-actions.mjs';
import {
  navigateProcedureAgendaWeek,
  resetProcedureAgendaWeek,
} from './features/agenda.mjs';

var DIGIT_APP_TABS = {
  1: 'nota',
  2: 'lab',
  3: 'med',
  4: 'agenda',
  5: 'agenda',
};

var PASE_DIGIT_SECTIONS = {
  1: 'resumen',
  2: 'labs',
  3: 'med',
  4: 'agenda',
  5: 'agenda',
};

/** @param {string} key */
export function digitKeyAppTab(key) {
  return DIGIT_APP_TABS[key] || null;
}

/**
 * @param {string} currentComposite
 * @param {string[]} visibleTabs
 */
export function nextConsolidatedCompositeTab(currentComposite, visibleTabs) {
  var tabs = Array.isArray(visibleTabs) ? visibleTabs : [];
  if (!tabs.length) return null;
  var idx = tabs.indexOf(currentComposite);
  if (idx < 0) return tabs[0];
  return tabs[(idx + 1) % tabs.length];
}

/** @param {'receta'|'perfil'} current */
export function nextMedSubview(current) {
  return current === 'perfil' ? 'receta' : 'perfil';
}

/** @param {'full'|'simple'} current */
export function nextMedOutputTab(current) {
  return current === 'simple' ? 'full' : 'simple';
}

/** @param {string} current */
export function nextLabInnerSection(current) {
  var tabs = LAB_INNER_SECTIONS;
  var idx = tabs.indexOf(current);
  if (idx < 0) return tabs[0];
  return tabs[(idx + 1) % tabs.length];
}

function currentExpedienteComposite(settings) {
  var inner = migrateGranularInner(getActiveInnerTab() || 'todo', settings);
  return consolidatedInnerTabButtonId(inner, settings).replace(/^itab-/, '');
}

function leaveGuardiaForStandardNavigation() {
  if (!isGuardiaMode()) return;
  toggleGuardiaMode();
}

function openDigitTabFirst(key) {
  if (isPaseMode()) {
    var section = PASE_DIGIT_SECTIONS[key];
    if (section) openPaseSectionInNormal(section);
    return;
  }
  var tab = digitKeyAppTab(key);
  if (tab) switchAppTab(tab);
}

function cycleExpedienteComposite() {
  var settings = typeof rt.getSettings === 'function' ? rt.getSettings() : {};
  var tabs = getConsolidatedTabs(settings);
  var current = currentExpedienteComposite(settings);
  var next = nextConsolidatedCompositeTab(current, tabs);
  if (!next) return;
  switchConsolidatedTab(next);
}

function cycleLabInner() {
  var next = nextLabInnerSection(currentLabInner());
  if (next) switchLabInner(next);
}

function cycleMedSubview() {
  var next = nextMedSubview(getMedSubview());
  setMedSubview(next);
}

function cycleMedOutputFormat() {
  if (getMedSubview() !== 'receta') return;
  setMedOutputTab(nextMedOutputTab(medOutputTab));
}

function isOnDigitAppTab(key) {
  var tab = digitKeyAppTab(key);
  if (!tab) return false;
  var active = typeof rt.getActiveAppTab === 'function' ? rt.getActiveAppTab() : '';
  if (active === 'lan') active = 'lab';
  return active === tab;
}

/** @param {string} key - digit 1–5 */
export function runTabDigitShortcut(key) {
  if (!digitKeyAppTab(key)) return false;
  leaveGuardiaForStandardNavigation();
  if (isOnDigitAppTab(key)) {
    if (key === '1') {
      cycleExpedienteComposite();
      return true;
    }
    if (key === '2') {
      cycleLabInner();
      return true;
    }
    if (key === '3') {
      cycleMedSubview();
      return true;
    }
    if (key === '4' || key === '5') {
      resetProcedureAgendaWeek();
      return true;
    }
    return true;
  }
  openDigitTabFirst(key);
  return true;
}

/** ⌘⇧3 — alternate egreso text format when on Manejo actual. */
export function runMedOutputTabShortcut() {
  leaveGuardiaForStandardNavigation();
  if (typeof rt.getActiveAppTab === 'function' && rt.getActiveAppTab() !== 'med') {
    switchAppTab('med');
    return true;
  }
  if (getMedSubview() !== 'receta') {
    setMedSubview('receta');
    return true;
  }
  cycleMedOutputFormat();
  return true;
}

/** ⌘M — Manejo tab + cycle subviews (alias of ⌘3). */
export function runMedTabShortcut() {
  return runTabDigitShortcut('3');
}

/** ⌘A — Agenda tab + reset to current week (alias of ⌘4). */
export function runAgendaTabShortcut() {
  return runTabDigitShortcut('4');
}

/** ⌘[ / ⌘] — previous / next agenda week (when on Agenda). */
export function runAgendaWeekNavShortcut(delta) {
  leaveGuardiaForStandardNavigation();
  if (typeof rt.getActiveAppTab === 'function' && rt.getActiveAppTab() !== 'agenda') {
    switchAppTab('agenda');
    return true;
  }
  navigateProcedureAgendaWeek(delta);
  return true;
}

/** @internal tests */
export function resolveExpedienteCompositeCycle(currentComposite, settings) {
  return nextConsolidatedCompositeTab(currentComposite, getConsolidatedTabs(settings || {}));
}
