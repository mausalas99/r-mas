/**
 * ⌘E / ⌘T / ⌘D — navegación rápida en expediente (Estado actual, Resultados, Datos).
 */
import { migrateGranularInner } from './expediente-tabs.mjs';
import { isGuardiaMode, toggleGuardiaMode } from './features/chrome.mjs';
import { isModeSala } from './mode-features.mjs';
import { switchAppTab } from './features/pase-board-app-tabs.mjs';
import { getActiveInnerTab, switchInnerTab } from './features/pase-board.mjs';
import { openPatientDatosModal } from './patient-datos-modal.mjs';
import { rt } from './features/pase-board-runtime.mjs';

var EXPEDIENTE_SHORTCUT_KEYS = { e: 1, t: 1, d: 1 };

export const expedienteShortcutKeys = Object.freeze(['e', 't', 'd']);

export function isExpedienteShortcutKey(key) {
  return !!EXPEDIENTE_SHORTCUT_KEYS[String(key || '').toLowerCase()];
}

/**
 * @param {string} key
 * @param {string|null|undefined} currentInner
 * @param {{ appMode?: string }|null|undefined} settings
 */
export function resolveExpedienteShortcutTarget(key, currentInner, settings) {
  var k = String(key || '').toLowerCase();
  if (!EXPEDIENTE_SHORTCUT_KEYS[k]) return null;
  var st = settings || {};
  var inner = migrateGranularInner(currentInner || 'todo', st);
  if (k === 'e') {
    if (inner === 'estadoActual') {
      return isModeSala(st) ? 'eventualidades' : 'estadoActual';
    }
    if (inner === 'eventualidades') return 'estadoActual';
    return 'estadoActual';
  }
  if (k === 't') {
    if (inner === 'tend') return 'cult';
    if (inner === 'cult') return 'tend';
    return 'tend';
  }
  if (k === 'd') return 'datos';
  return null;
}

export function runExpedienteShortcut(key) {
  var k = String(key || '').toLowerCase();
  if (isGuardiaMode()) {
    toggleGuardiaMode();
    switchAppTab('nota');
  }
  var settings = typeof rt.getSettings === 'function' ? rt.getSettings() : {};
  var current = getActiveInnerTab();
  var target = resolveExpedienteShortcutTarget(k, current, settings);
  if (!target) return false;
  if (k === 'd') {
    openPatientDatosModal();
    return true;
  }
  if (target === migrateGranularInner(current || 'todo', settings)) return true;
  switchInnerTab(target);
  return true;
}
