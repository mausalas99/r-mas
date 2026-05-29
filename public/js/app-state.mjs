import { storage, normalizeLabHistoryPatientSets } from './storage.js';
import { applyMedCatalogOverlay } from './med-receta-core.mjs';
import { repairLabHistoryMapInPlace } from './lab-history-repair.mjs';
import { migratePatientMonitoreo } from './features/estado-actual-data.mjs';
import { syncManejoTodoDismissalsOnBoot } from './manejo-todo-dismiss.mjs';

export let patients = [];
export let notes = {};
export let indicaciones = {};
export let labHistory = {};
export let medRecetaByPatient = {};
export let recetaHuByPatient = {};
export let listadoProblemas = {};
export let vpoByPatient = {};
export let medNotaSelectionByPatient = {};

let _beforeSave = null;
let _afterSave = null;
let _onSaveResult = null;
let _persistPatientsResolver = null;
let _saveTimer = null;
let _saveInFlight = null;
const SAVE_DEBOUNCE_MS = 400;

/**
 * Durante el tour pitch la lista en memoria son solo demos; al persistir se usa el respaldo real.
 * @param {(() => import('./app-state.mjs').patients | undefined) | null} fn
 */
export function setPersistPatientsResolver(fn) {
  _persistPatientsResolver = typeof fn === 'function' ? fn : null;
}

function patientsForPersistence() {
  if (_persistPatientsResolver) {
    const overridden = _persistPatientsResolver();
    if (Array.isArray(overridden) && overridden.length) return overridden;
    const filtered = patients.filter(function (p) {
      return p && p.id !== 'demo-pitch' && p.id !== 'demo-pitch-2' && !p.isDemo;
    });
    if (filtered.length) return filtered;
    const stored = storage.getPatients();
    if (Array.isArray(stored) && stored.length) return stored;
    return [];
  }
  return patients;
}

export function setPatients(next) {
  patients = next;
}

export function setNotes(next) {
  notes = next;
}

export function setIndicaciones(next) {
  indicaciones = next;
}

export function setLabHistory(next) {
  labHistory = next;
}

export function setMedRecetaByPatient(next) {
  medRecetaByPatient = next;
}

export function setVpoByPatient(next) {
  vpoByPatient = next;
}

export function setRecetaHuByPatient(next) {
  recetaHuByPatient = next;
}

function clonePlainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_e) {
    return {};
  }
}

/** Sustituye pacientes y datos clínicos en memoria (importación de respaldo, deshacer). */
export function replaceAppStateFromBackupData(data) {
  if (!data || typeof data !== 'object') return;
  var nextPatients = Array.isArray(data.patients) ? data.patients : [];
  setPatients(
    nextPatients.filter(function (p) {
      return p && !p.isDemo;
    })
  );
  setNotes(clonePlainRecord(data.notes));
  setIndicaciones(clonePlainRecord(data.indicaciones));
  setLabHistory(clonePlainRecord(data.labHistory));
  setMedRecetaByPatient(clonePlainRecord(data.medRecetaByPatient));
  listadoProblemas = clonePlainRecord(data.listadoProblemas);
  vpoByPatient = clonePlainRecord(data.vpoByPatient);
  medNotaSelectionByPatient = {};
}

export function setSaveStateHooks({ before, after, onSaveResult } = {}) {
  if (before !== undefined) _beforeSave = before;
  if (after !== undefined) _afterSave = after;
  if (onSaveResult !== undefined) _onSaveResult = onSaveResult;
}

export function repairLabHistoryInMemory() {
  return repairLabHistoryMapInPlace(labHistory);
}

export function initAppState() {
  setPatients(storage.getPatients());
  setNotes(storage.getNotes());
  setIndicaciones(storage.getIndicaciones());
  setLabHistory(storage.getLabHistory());
  setMedRecetaByPatient(storage.getMedRecetaByPatient());
  setRecetaHuByPatient(storage.getRecetaHuByPatient());
  listadoProblemas = storage.getListadoProblemas();
  vpoByPatient = storage.getVpoByPatient();
  applyMedCatalogOverlay(storage.getMedCatalog());
  medNotaSelectionByPatient = {};
  var monitoreoMigrated = false;
  for (var pi = 0; pi < patients.length; pi += 1) {
    if (migratePatientMonitoreo(patients[pi])) monitoreoMigrated = true;
  }
  if (syncManejoTodoDismissalsOnBoot(patients, labHistory, storage)) {
    saveState({ immediate: true });
  } else if (repairLabHistoryInMemory() || monitoreoMigrated) {
    saveState({ immediate: true });
  }
}

function notifySaveResult(result) {
  if (_onSaveResult && result) _onSaveResult(result);
}

function runSaveNow() {
  if (_beforeSave) _beforeSave();
  var promise = storage.saveAll(
    patientsForPersistence(),
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient,
    vpoByPatient
  );
  _saveInFlight = promise;
  return promise
    .then(function (result) {
      notifySaveResult(result);
      if (_afterSave) _afterSave();
      return result;
    })
    .finally(function () {
      if (_saveInFlight === promise) _saveInFlight = null;
    });
}

/**
 * @param {{ immediate?: boolean }} [opts] — immediate: true salta el debounce (cierre de app, import, etc.)
 */
export function saveState(opts) {
  var immediate = !!(opts && opts.immediate);
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (immediate) {
    return runSaveNow();
  }
  return new Promise(function (resolve) {
    _saveTimer = setTimeout(function () {
      _saveTimer = null;
      runSaveNow().then(resolve);
    }, SAVE_DEBOUNCE_MS);
  });
}

/** Persiste de inmediato cualquier guardado pendiente (p. ej. antes de cerrar la app). */
export function flushSaveState() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_saveInFlight) return _saveInFlight;
  return runSaveNow();
}
