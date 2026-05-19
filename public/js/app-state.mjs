import { storage } from './storage.js';
import { applyMedCatalogOverlay } from './med-receta-core.mjs';

export let patients = [];
export let notes = {};
export let indicaciones = {};
export let labHistory = {};
export let medRecetaByPatient = {};
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

export function setSaveStateHooks({ before, after } = {}) {
  if (before !== undefined) _beforeSave = before;
  if (after !== undefined) _afterSave = after;
}

export function initAppState() {
  setPatients(storage.getPatients());
  setNotes(storage.getNotes());
  setIndicaciones(storage.getIndicaciones());
  setLabHistory(storage.getLabHistory());
  setMedRecetaByPatient(storage.getMedRecetaByPatient());
  listadoProblemas = storage.getListadoProblemas();
  applyMedCatalogOverlay(storage.getMedCatalog());
  medNotaSelectionByPatient = {};
}

export function saveState() {
  if (_beforeSave) _beforeSave();
  storage.saveAll(
    patients,
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    listadoProblemas
  );
  if (_afterSave) _afterSave();
}
