import { isCloudSyncActive } from '../cloud-sync/lan-override.mjs';
import { activePatient } from './runtime.mjs';

export function readLocalHistoria(patient) {
  if (!patient || !patient.historiaClinica || !patient.historiaClinica.data) return null;
  return {
    version: Number(patient.historiaClinica.version || 0),
    data: patient.historiaClinica.data,
    pendingLanSync: false,
  };
}

export async function fetchHistoriaRemote(_patientId, _roomId) {
  void isCloudSyncActive;
  return null;
}

export async function loadHistoriaForPatient(patient) {
  if (!patient) return null;
  return readLocalHistoria(patient);
}

export function getHistoriaPatient() {
  return activePatient();
}
