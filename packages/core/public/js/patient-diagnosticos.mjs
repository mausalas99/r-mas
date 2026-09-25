import { mergeAccesosPatientFields } from './patient-accesos.mjs';

function normalizePlusSeparators(text) {
  return String(text || '')
    .replace(/[\uFF0B\u2795]/g, '+')
    .replace(/\s+\+\s+/g, ' + ');
}

/** @param {string} text @returns {string[]} */
export function parseDiagnosticosText(text) {
  var raw = normalizePlusSeparators(String(text || '').trim());
  if (!raw) return [];
  var parts = /\+/.test(raw) ? raw.split(/\s*\+\s*/) : raw.split(/\r?\n/);
  return parts
    .map(function (p) {
      return String(p || '')
        .trim()
        .replace(/^\d+\.\s*/, '')
        .toUpperCase();
    })
    .filter(Boolean);
}

/** @param {string[]} list @returns {string} */
export function formatDiagnosticosCopy(list) {
  return (list || [])
    .map(function (d, i) {
      return i + 1 + '. ' + String(d || '').trim();
    })
    .filter(function (line) {
      return line.length > 2;
    })
    .join('\n');
}

/** @param {Record<string, unknown>|null|undefined} patient */
export function ensurePatientDiagnosticos(patient) {
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [];
  if (!patient.diagnosticosList.length && patient.diagnosticosText) {
    patient.diagnosticosList = parseDiagnosticosText(String(patient.diagnosticosText));
  }
  if (!patient.diagnosticosList.length) patient.diagnosticosList = [''];
  var normalized = patient.diagnosticosList.map(function (d) {
    return String(d || '').trim().toUpperCase();
  });
  patient.diagnosticosList = normalized;
  var nonEmpty = normalized.filter(Boolean);
  patient.diagnosticosText = formatDiagnosticosCopy(nonEmpty);
}

/** Máximo de diagnósticos exportados al censo (los primeros N de la lista). */
export const CENSO_MAX_DIAGNOSTICOS = 3;

/** @param {string[]} list @param {{ max?: number }} [options] */
export function diagnosticosTextForCenso(list, options) {
  var max =
    options && options.max != null ? options.max : CENSO_MAX_DIAGNOSTICOS;
  return (list || [])
    .map(function (d) {
      return String(d || '').trim().toUpperCase();
    })
    .filter(Boolean)
    .slice(0, max)
    .join(' + ');
}

/**
 * @param {Record<string, unknown>} patient
 * @param {Record<string, unknown>|null|undefined} vpoState
 */
export function migratePatientDiagnosticosFromVpo(patient, vpoState) {
  if (!patient || !vpoState) return false;
  var has = (patient.diagnosticosList || []).some(function (d) {
    return String(d).trim();
  });
  if (has) return false;
  var from = (vpoState.diagnosticosList || []).filter(function (d) {
    return String(d).trim();
  });
  if (!from.length) return false;
  patient.diagnosticosList = from
    .map(function (d) {
      return String(d).trim().toUpperCase();
    })
    .concat(['']);
  ensurePatientDiagnosticos(patient);
  return true;
}

/**
 * @param {Record<string, unknown>} patient
 * @param {string[]} list
 */
export function applyPatientDiagnosticosList(patient, list) {
  patient.diagnosticosList = list;
  ensurePatientDiagnosticos(patient);
}

function noteDiagnosticosEmpty(note) {
  var dx = (note && note.diagnosticos) || [];
  return !dx.some(function (d) {
    return String(d).trim();
  });
}

function patientDiagnosticosNonEmpty(patient) {
  ensurePatientDiagnosticos(patient);
  return (patient.diagnosticosList || []).filter(function (d) {
    return String(d).trim();
  });
}

/**
 * Copy censo diagnoses into the note when the note dx list is empty.
 * @param {{ diagnosticos?: string[] }} note
 * @param {Record<string, unknown>} patient
 */
export function preloadNoteDxFromPatient(note, patient) {
  return syncNoteDxFromPatient(note, patient, { mode: 'ifEmpty' });
}

/**
 * @param {{ diagnosticos?: string[] }} note
 * @param {Record<string, unknown>} patient
 * @param {{ mode?: 'ifEmpty' | 'replace' }} [options]
 * @returns {boolean} whether note.diagnosticos changed
 */
export function syncNoteDxFromPatient(note, patient, options) {
  if (!note || !patient) return false;
  var mode = (options && options.mode) || 'ifEmpty';
  var from = patientDiagnosticosNonEmpty(patient);
  if (!from.length) return false;
  if (mode === 'ifEmpty' && !noteDiagnosticosEmpty(note)) return false;
  note.diagnosticos = from.slice();
  return true;
}

/**
 * Before Word export: ensure note has dx from censo if the note list is empty.
 * @param {{ diagnosticos?: string[] }} note
 * @param {Record<string, unknown>} patient
 */
export function ensureNoteDxFromPatientForExport(note, patient) {
  return syncNoteDxFromPatient(note, patient, { mode: 'ifEmpty' });
}

function diagnosticosListHasContent(list) {
  return (list || []).some(function (d) {
    return String(d || '').trim();
  });
}

/**
 * Stamp the censo fields clock. Diagnoses and censo meds ride the single
 * `entries/<id>/fields` LWW path — without this stamp the Nube rejects the op
 * as stale and the old remote value comes back on the next pull.
 * @param {Record<string, unknown>|null|undefined} patient
 * @param {string} [now]
 * @param {'diagnosticosList'|'censoMedsText'|'censoAtbText'} [key] also stamp that key's own clock
 */
export function stampCensoFieldsClock(patient, now, key) {
  if (!patient) return;
  var at = String(now || new Date().toISOString());
  patient.lanUpdatedAt = at;
  if (key) patient.fieldClocks = Object.assign({}, patient.fieldClocks, { [key]: at });
}

/**
 * Per-key clock compare for the censo keys. `fields` is one LWW blob, so a peer
 * that touched only estado actual still pushes its stale dx with a newer blob
 * clock — the key clock is what says whose dx is really newer.
 * @returns {1|0|-1|null} 1 = source newer, -1 = target newer, null = no key clocks
 *   (peer predates key clocks, or neither side ever stamped this key)
 */
export function compareFieldClock(target, source, key) {
  if (!source || !source.fieldClocks || typeof source.fieldClocks !== 'object') return null;
  var a = String((target && target.fieldClocks && target.fieldClocks[key]) || '');
  var b = String(source.fieldClocks[key] || '');
  if (!a && !b) return null;
  if (!b) return -1;
  if (!a) return 1;
  return b > a ? 1 : b < a ? -1 : 0;
}

/**
 * Fold source key clocks into target (max per key).
 * @returns {{ changed: boolean, localNewer: boolean }} localNewer = target holds a
 *   key the source's blob is behind on, so target must re-push its merged blob.
 */
export function mergeFieldClocks(target, source) {
  var out = { changed: false, localNewer: false };
  if (!target || !source || !source.fieldClocks || typeof source.fieldClocks !== 'object') return out;
  var local = target.fieldClocks && typeof target.fieldClocks === 'object' ? target.fieldClocks : {};
  var merged = Object.assign({}, local);
  Object.keys(source.fieldClocks).forEach(function (k) {
    var remote = String(source.fieldClocks[k] || '');
    if (remote > String(merged[k] || '')) {
      merged[k] = remote;
      out.changed = true;
    }
  });
  Object.keys(local).forEach(function (k) {
    if (String(local[k] || '') > String(source.fieldClocks[k] || '')) out.localNewer = true;
  });
  if (out.changed) target.fieldClocks = merged;
  return out;
}

/** @param {Record<string, unknown>} target @param {Record<string, unknown>} source @param {string} key @param {boolean} keepLocal */
function mergeCensoTextField(target, source, key, keepLocal) {
  var cmp = compareFieldClock(target, source, key);
  if (cmp === 1) target[key] = String(source[key] || '');
  if (cmp != null) return;
  if (source[key] && !(keepLocal && String(target[key] || '').trim())) {
    target[key] = source[key];
  }
}

/**
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>|undefined} source
 * @param {{ keepLocalWhenPresent?: boolean }} [options] — set when the incoming
 *   clock is behind the local one; then local non-empty values win.
 */
export function mergeCensoPatientFields(target, source, options) {
  if (!target || !source) return;
  var keepLocal = !!(options && options.keepLocalWhenPresent);
  mergeAccesosPatientFields(target, source);
  mergeCensoTextField(target, source, 'censoMedsText', keepLocal);
  mergeCensoTextField(target, source, 'censoAtbText', keepLocal);
  var dxCmp = compareFieldClock(target, source, 'diagnosticosList');
  if (dxCmp === 1) {
    // Newer key clock: take it even when empty — that is how a removed dx syncs.
    target.diagnosticosList = Array.isArray(source.diagnosticosList) ? source.diagnosticosList.slice() : [];
    target.diagnosticosText = '';
    ensurePatientDiagnosticos(target);
    return;
  }
  if (dxCmp != null) return;
  // Never clobber real diagnoses with placeholder [''] from ensurePatientDiagnosticos.
  if (!diagnosticosListHasContent(source.diagnosticosList)) return;
  if (keepLocal && diagnosticosListHasContent(target.diagnosticosList)) return;
  target.diagnosticosList = source.diagnosticosList;
  if (source.diagnosticosText) target.diagnosticosText = source.diagnosticosText;
  else ensurePatientDiagnosticos(target);
}

/**
 * Two-way censo merge for LAN entry merge.
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>|undefined} preferred — usually newer by lanUpdatedAt
 * @param {Record<string, unknown>|undefined} fallback
 */
export function mergeCensoPatientFieldsFromBoth(target, preferred, fallback) {
  if (!target) return;
  // Apply fallback first, then preferred so non-empty preferred dx/meds win.
  mergeCensoPatientFields(target, fallback);
  mergeCensoPatientFields(target, preferred);
}

export function pushDiagnosticosToPatient(patient, list) {
  if (!patient) return;
  var cleaned = (list || [])
    .map(function (d) {
      return String(d || '').trim().toUpperCase();
    })
    .filter(Boolean);
  applyPatientDiagnosticosList(patient, cleaned.length ? cleaned.concat(['']) : ['']);
}
