/** EA panel cache + active patient lookup. */
import { getPatients } from '../app-state.mjs';
import { getEaPanelRuntime } from './estado-actual-panel-runtime.mjs';

export var _eaPanelCache = { shellKey: '', dataKey: '' };

export function invalidateEaPanelCache() {
  _eaPanelCache.shellKey = '';
  _eaPanelCache.dataKey = '';
}

export function findActivePatient() {
  var activeId = getEaPanelRuntime().getActiveId();
  if (!activeId) return null;
  return (
    getPatients().find(function (p) {
      return String(p.id) === String(activeId);
    }) || null
  );
}

/**
 * @param {string | number | null | undefined} id
 */
export function findPatientById(id) {
  if (id == null) return null;
  return (
    getPatients().find(function (p) {
      return String(p.id) === String(id);
    }) || null
  );
}

/**
 * Id of the patient the "estado actual" registro form was opened for.
 * Captured when the form opens so background events (cloud sync switching the
 * active patient) cannot make the save handler write to the wrong patient.
 * @type {string | number | null}
 */
var _eaFormOpenPatientId = null;

/**
 * @param {string | number | null | undefined} id
 */
export function setEaFormOpenPatientId(id) {
  _eaFormOpenPatientId = id == null ? null : id;
}

export function getEaFormOpenPatientId() {
  return _eaFormOpenPatientId;
}

/**
 * True when the registro modal is open and it was opened for `id`.
 * @param {string | number | null | undefined} id
 */
export function isEaRegistroFormOpenForPatient(id) {
  if (id == null || _eaFormOpenPatientId == null) return false;
  if (String(id) !== String(_eaFormOpenPatientId)) return false;
  if (typeof document === 'undefined') return false;
  var backdrop = document.getElementById('ea-registro-backdrop');
  return !!(backdrop && backdrop.classList.contains('open'));
}
