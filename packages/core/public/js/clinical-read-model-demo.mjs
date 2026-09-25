/**
 * Tour/pitch demo overlay for clinical read display (P5).
 * Demos never persist; compose at read layer. Persist isolation may still use
 * setPersistPatientsResolver when the in-memory census was swapped to demos.
 */
import {
  isPitchPatientIsolationActive,
  PITCH_TOUR_ACTIVE_SS_KEY,
} from './tour-pitch-sandbox.mjs';

/** @type {Array<Record<string, unknown>>} */
let demoPatients = [];

/** @returns {boolean} */
export function isPitchTourActive() {
  try {
    if (isPitchPatientIsolationActive()) return true;
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(PITCH_TOUR_ACTIVE_SS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Display-layer census for sidebar / pitch UI.
 * When pitch isolation is active and demos are registered, return demos only
 * (real census stays in getPatients for persistence via resolver or in-memory).
 * @param {() => Array} baseGetPatients
 * @returns {Array}
 */
export function getPatientsForDisplay(baseGetPatients) {
  const base = typeof baseGetPatients === 'function' ? baseGetPatients() : [];
  const list = Array.isArray(base) ? base : [];
  if (!isPitchTourActive()) return list;
  if (isPitchPatientIsolationActive() && demoPatients.length) {
    return demoPatients.slice();
  }
  return [...demoPatients, ...list.filter((p) => p && !p.isDemo)];
}

/** @param {Array<Record<string, unknown>>} list */
export function setDemoPatientsForTests(list) {
  demoPatients = Array.isArray(list) ? list.slice() : [];
}

/** @param {Array<Record<string, unknown>>} list */
export function setDemoPatients(list) {
  demoPatients = Array.isArray(list) ? list.slice() : [];
}

/** @returns {Array<Record<string, unknown>>} */
export function getDemoPatients() {
  return demoPatients.slice();
}
