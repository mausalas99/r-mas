/**
 * ⌘E / ⌘T / ⌘D — navegación rápida en expediente (Estado actual, Resultados, Datos).
 */
import { migrateGranularInner, getClinicoSections } from './expediente-tabs.mjs';
import { isGuardiaMode, toggleGuardiaMode } from './features/chrome.mjs';
import { isModeSala } from './mode-features.mjs';
import { switchAppTab } from './features/app-tabs.mjs';
import { getActiveInnerTab, switchInnerTab } from './features/expediente-navigation.mjs';
import { switchLabInner } from './features/patient-dashboard/lab-inner.mjs';
import { openPatientDatosModal } from './patient-datos-modal.mjs';
import { rt } from './features/app-tabs-runtime.mjs';

var EXPEDIENTE_SHORTCUT_KEYS = { e: 1, t: 1, d: 1 };

export const expedienteShortcutKeys = Object.freeze(['e', 't', 'd']);

export function isExpedienteShortcutKey(key) {
  return !!EXPEDIENTE_SHORTCUT_KEYS[String(key || '').toLowerCase()];
}

/**
 * @param {string} key
 * @param {string|null|undefined} currentInner
 * @param {{ appMode?: string }|null|undefined} settings
 * @param {boolean} [onNota] For ⌘E: whether the "nota" (expediente) app tab is already
 *   active. Only then does ⌘E cycle its views — arriving from another app tab (Laboratorio,
 *   Manejo) always lands on Estado actual first.
 * @param {boolean} [onLab] For ⌘T: whether the Laboratorio app tab is already active —
 *   Tendencias/Cultivos live there, not under "nota". Only then does ⌘T cycle onward;
 *   arriving from anywhere else always begins fresh at Tendencias.
 */
export function resolveExpedienteShortcutTarget(key, currentInner, settings, onNota, onLab) {
  var k = String(key || '').toLowerCase();
  if (!EXPEDIENTE_SHORTCUT_KEYS[k]) return null;
  var st = settings || {};
  var inner = migrateGranularInner(currentInner || 'todo', st);
  if (k === 'e') {
    // Interconsulta has no Eventualidades/Medicamentos pills — ⌘E only opens Estado actual.
    if (!isModeSala(st)) return 'estadoActual';
    // Sala cycles all 3 Clínico pills: Estado actual → Eventualidades → Medicamentos → ...
    var salaCycle = getClinicoSections(st);
    if (!onNota) return salaCycle[0];
    var idx = salaCycle.indexOf(inner);
    return salaCycle[(idx + 1 + salaCycle.length) % salaCycle.length];
  }
  if (k === 't') {
    // Cycle: Tendencias → Cultivos → Laboratorio → Tendencias. Arriving from outside
    // the Laboratorio tab always begins fresh at Tendencias.
    if (!onLab) return 'tend';
    var labSection = inner === 'tend' || inner === 'cult' ? inner : 'labs';
    if (labSection === 'tend') return 'cult';
    if (labSection === 'cult') return 'labs';
    return 'tend';
  }
  if (k === 'd') return 'datos';
  return null;
}

function isOnNotaAppTab() {
  return (typeof rt.getActiveAppTab === 'function' ? rt.getActiveAppTab() : '') === 'nota';
}

function isOnLabAppTab() {
  return (typeof rt.getActiveAppTab === 'function' ? rt.getActiveAppTab() : '') === 'lab';
}

export function runExpedienteShortcut(key) {
  var k = String(key || '').toLowerCase();
  if (isGuardiaMode()) {
    toggleGuardiaMode();
    switchAppTab('nota');
  }
  if (k === 'd') {
    openPatientDatosModal();
    return true;
  }
  var settings = typeof rt.getSettings === 'function' ? rt.getSettings() : {};
  var current = getActiveInnerTab();
  var onNota = isOnNotaAppTab();
  var onLab = isOnLabAppTab();
  var target = resolveExpedienteShortcutTarget(k, current, settings, onNota, onLab);
  if (!target) return false;
  if (k === 't') {
    // switchLabInner/switchInnerTab already switch to the Laboratorio app tab
    // themselves when the target lives there — forcing "nota" first here just
    // bounced through Paciente before landing, flashing the whole view.
    switchLabInner(target);
    return true;
  }
  if (!onNota) {
    switchAppTab('nota');
    switchInnerTab(target);
    return true;
  }
  if (target === migrateGranularInner(current || 'todo', settings)) return true;
  switchInnerTab(target);
  return true;
}
