/**
 * Edición de formatos por defecto dentro de las pestañas Nota / Indicaciones (no en Mi Perfil).
 */

import { ensureProfileTemplateDefaults } from "./profile-templates.mjs";

/** @type {null | 'nota' | 'indica'} */
var formatsEditMode = null;

export function getFormatsEditMode() {
  return formatsEditMode;
}

/** @param {null | 'nota' | 'indica'} mode */

export function setFormatsEditMode(mode) {
  formatsEditMode = mode;
}

export function clearFormatsEditMode() {
  formatsEditMode = null;
}

/** Campos en memoria mientras editas (antes de guardar). */
var draft = {};

export function loadDraftFromSettings(st) {
  ensureProfileTemplateDefaults(st);
  draft = {
    notaEvolucion: String(st.defaultNotaEvolucion || ""),
    notaEstudios: String(st.defaultNotaEstudios || ""),
    dieta: String(st.defaultDieta || ""),
    cuidados: String(st.defaultCuidados || ""),
    medicamentos: String(st.defaultMedicamentos || ""),
    estudios: String(st.defaultIndicacionesEstudios || ""),
    interconsultas: String(st.defaultIndicacionesInterconsultas || ""),
  };
}

export function applyDraftToSettings(st) {
  st.defaultNotaEvolucion = draft.notaEvolucion.trim();
  st.defaultNotaEstudios = draft.notaEstudios.trim();
  st.defaultDieta = draft.dieta.trim();
  st.defaultCuidados = draft.cuidados.trim();
  st.defaultMedicamentos = draft.medicamentos.trim();
  st.defaultIndicacionesEstudios = draft.estudios.trim();
  st.defaultIndicacionesInterconsultas = draft.interconsultas.trim();
}

export function updateDefaultFormatField(field, value) {
  if (Object.prototype.hasOwnProperty.call(draft, field)) {
    draft[field] = value;
  }
}

export function resetDraftToBlank() {
  draft = {
    notaEvolucion: "",
    notaEstudios: "",
    dieta: "",
    cuidados: "",
    medicamentos: "",
    estudios: "",
    interconsultas: "",
  };
}
