import { storage, normalizeLabHistoryPatientSets } from './storage.js';
import { applyMedCatalogOverlay } from './med-receta-core.mjs';

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

export function setSaveStateHooks({ before, after } = {}) {
  if (before !== undefined) _beforeSave = before;
  if (after !== undefined) _afterSave = after;
}

export function repairLabHistoryInMemory() {
  var changed = false;
  Object.keys(labHistory || {}).forEach(function (pid) {
    var raw = labHistory[pid];
    var fixed = normalizeLabHistoryPatientSets(raw);
    if (!Array.isArray(raw) || raw !== fixed || JSON.stringify(raw) !== JSON.stringify(fixed)) {
      if (fixed.length) labHistory[pid] = fixed;
      else delete labHistory[pid];
      changed = true;
    }
  });
  return changed;
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
  if (repairLabHistoryInMemory()) saveState();
}

export function saveState() {
  if (_beforeSave) _beforeSave();
  storage.saveAll(
    patients,
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas,
    recetaHuByPatient
  );
  if (_afterSave) _afterSave();
}
