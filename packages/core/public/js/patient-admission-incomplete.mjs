/**
 * Paciente en censo con alta incompleta (falta ubicación / servicio para censo).
 */
import { isModeSala } from './mode-features.mjs';

/**
 * @param {object | null | undefined} patient
 * @param {object | null | undefined} [settings]
 */
export function isPatientAdmissionIncomplete(patient, settings) {
  if (!patient || patient.isDemo) return false;
  var cuarto = String(patient.cuarto || '').trim();
  var cama = String(patient.cama || '').trim();
  var servicio = String(patient.servicio || '').trim();
  var area = String(patient.area || '').trim();
  if (!cuarto || !cama) return true;
  if (!servicio) return true;
  if (!isModeSala(settings) && !area) return true;
  return false;
}

/**
 * @param {object | null | undefined} patient
 * @param {object | null | undefined} [settings]
 * @returns {string[]}
 */
export function patientAdmissionMissingFields(patient, settings) {
  if (!patient) return [];
  var missing = [];
  if (!String(patient.cuarto || '').trim()) missing.push('cuarto');
  if (!String(patient.cama || '').trim()) missing.push('cama');
  if (!String(patient.servicio || '').trim()) missing.push('servicio');
  if (!isModeSala(settings) && !String(patient.area || '').trim()) missing.push('area');
  return missing;
}
