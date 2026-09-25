/**
 * Magia IC — pull Estado actual (compiled text + vitals) into the note form.
 * Pure helpers; UI confirm lives in notes-indicaciones.
 */
import { deriveSnapshot } from './estado-actual-data.mjs';
import { buildEstadoActualText } from './estado-actual-text.mjs';

const VITAL_NOTE_KEYS = ['ta', 'fr', 'fc', 'temp', 'peso'];

/**
 * @param {unknown} value
 * @returns {string}
 */
function fmtVital(value) {
  if (value == null || value === '') return '';
  var n = Number(value);
  if (Number.isFinite(n)) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  }
  return String(value).trim();
}

/**
 * Latest monitoreo vitals → note Signos Vitales fields.
 * @param {Record<string, unknown>|null|undefined} patient
 * @returns {{ ta: string, fr: string, fc: string, temp: string, peso: string }}
 */
export function extractVitalsFromPatient(patient) {
  var empty = { ta: '', fr: '', fc: '', temp: '', peso: '' };
  if (!patient || typeof patient !== 'object') return empty;
  var mon = patient.monitoreo;
  var snap = mon ? deriveSnapshot(mon) : { vitals: {} };
  var v = snap && snap.vitals && typeof snap.vitals === 'object' ? snap.vitals : {};
  var ta = '';
  if (v.tas != null && v.tad != null) ta = fmtVital(v.tas) + '/' + fmtVital(v.tad);
  else if (v.tas != null) ta = fmtVital(v.tas);
  var peso = '';
  if (patient.peso != null && String(patient.peso).trim()) peso = fmtVital(patient.peso);
  return {
    ta: ta,
    fr: fmtVital(v.fr),
    fc: fmtVital(v.fc),
    temp: fmtVital(v.temp),
    peso: peso,
  };
}

/**
 * @param {Record<string, unknown>|null|undefined} patient
 * @param {{ getEstadoActualText?: (p: Record<string, unknown>) => string }} [options]
 * @returns {{ evolucion: string, vitals: ReturnType<typeof extractVitalsFromPatient> }}
 */
export function buildNotePatchFromEstadoActual(patient, options) {
  var vitals = extractVitalsFromPatient(patient);
  if (!patient || typeof patient !== 'object') {
    return { evolucion: '', vitals: vitals };
  }
  var getText = options && typeof options.getEstadoActualText === 'function'
    ? options.getEstadoActualText
    : null;
  var evolucion = '';
  if (getText) {
    evolucion = String(getText(patient) || '').trim();
  } else if (patient.monitoreo) {
    var mon = /** @type {any} */ (patient.monitoreo);
    var ec = mon.estadoClinico && typeof mon.estadoClinico === 'object' ? mon.estadoClinico : {};
    evolucion = String(
      buildEstadoActualText(ec, deriveSnapshot(mon), {}, { patientPeso: patient.peso }) || ''
    ).trim();
  }
  return { evolucion: evolucion, vitals: vitals };
}

/**
 * @param {{ evolucion?: string }|null|undefined} note
 */
export function noteEvolucionHasContent(note) {
  return !!(note && String(note.evolucion || '').trim());
}

/**
 * @param {Record<string, unknown>} note
 * @param {string} evol
 * @param {boolean} replace
 * @returns {boolean}
 */
function applyEvolucionToNote(note, evol, replace) {
  if (!evol) return false;
  var cur = String(note.evolucion || '').trim();
  if (!replace && cur) return false;
  if (String(note.evolucion || '') === evol) return false;
  note.evolucion = evol;
  return true;
}

/**
 * @param {Record<string, unknown>} note
 * @param {Record<string, string>|null|undefined} vitals
 * @returns {boolean}
 */
function applyEmptyVitalsToNote(note, vitals) {
  if (!vitals || typeof vitals !== 'object') return false;
  var changed = false;
  for (var i = 0; i < VITAL_NOTE_KEYS.length; i++) {
    var key = VITAL_NOTE_KEYS[i];
    var next = String(vitals[key] || '').trim();
    if (!next || String(note[key] || '').trim()) continue;
    note[key] = next;
    changed = true;
  }
  return changed;
}

/**
 * Apply EA patch onto note. Evolución: fill if empty, or replace when flagged.
 * Vitals: only fill empty note fields (never clobber clinician SV).
 * @param {Record<string, unknown>} note
 * @param {{ evolucion?: string, vitals?: Record<string, string> }} patch
 * @param {{ replaceEvolucion?: boolean }} [options]
 * @returns {boolean} true if any field changed
 */
export function applyEstadoActualToNote(note, patch, options) {
  if (!note || !patch) return false;
  var evolChanged = applyEvolucionToNote(
    note,
    String(patch.evolucion || '').trim(),
    !!(options && options.replaceEvolucion)
  );
  var vitalsChanged = applyEmptyVitalsToNote(note, patch.vitals);
  return evolChanged || vitalsChanged;
}
