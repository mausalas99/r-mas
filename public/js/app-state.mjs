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
export let medNotaSelectionByPatient = {};

let _beforeSave = null;
let _afterSave = null;
let _onSaveResult = null;
let _saveTimer = null;
let _saveInFlight = null;
const SAVE_DEBOUNCE_MS = 400;

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

export function setRecetaHuByPatient(next) {
  recetaHuByPatient = next;
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
    patients,
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient
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
