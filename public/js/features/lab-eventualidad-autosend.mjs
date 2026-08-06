/**
 * Labs → Eventualidades autosend desactivado (ya no se interpretan labs en EV).
 * API conservada para no romper importadores; siempre no-op / skipped.
 */
import { patients } from '../app-state.mjs';

function findPatientById(patientId) {
  var id = String(patientId || '');
  return (patients || []).find(function (p) {
    return p && String(p.id) === id;
  });
}

/**
 * @param {object} patient
 * @param {object[]} labSets
 * @param {{ filterToday?: boolean, todayFecha?: string }} [opts]
 * @returns {Promise<{ ok: boolean, reason?: string, skipped?: string }>}
 */
export async function autosendLabsToEventualidad(patient, labSets, opts) {
  void patient;
  void labSets;
  void opts;
  return { ok: true, skipped: 'disabled' };
}

/**
 * @param {Record<string, object[]>} storedByPatient
 * @param {{ showToast?: (msg: string, type?: string) => void }} [opts]
 * @returns {Promise<{ sent: number, skipped: number }>}
 */
export async function autosendLabsEventualidadForStored(storedByPatient, opts) {
  void opts;
  var map = storedByPatient || {};
  var skipped = 0;
  var ids = Object.keys(map);
  for (var i = 0; i < ids.length; i++) {
    if (!findPatientById(ids[i])) skipped += 1;
    else skipped += 1;
  }
  return { sent: 0, skipped: skipped };
}
