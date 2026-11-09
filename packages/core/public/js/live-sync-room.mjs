/** LiveSync por sala: merge por entityVersion (sin LWW por reloj en la capa de red). */
import { isDemoPatientId } from './demo-patient.mjs';

export { isDemoPatientId };

export const CLIENT_ID_KEY = 'rpc-client-id';
export const LEGACY_CLIENT_ID_KEY = 'rpc-lan-client-id';
/** Read client id from storage, migrating rpc-lan-client-id → rpc-client-id. */
export function readMigratedClientId(storage = localStorage) {
  try {
    const current = String(storage.getItem(CLIENT_ID_KEY) || '').trim();
    if (current) return current;
    const legacy = String(storage.getItem(LEGACY_CLIENT_ID_KEY) || '').trim();
    if (!legacy) return '';
    storage.setItem(CLIENT_ID_KEY, legacy);
    storage.removeItem(LEGACY_CLIENT_ID_KEY);
    return legacy;
  } catch {
    return '';
  }
}


export function compareIso(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x > y) return 1;
  if (x < y) return -1;
  return 0;
}

export function agendaEntityKey(id) {
  return 'a:' + String(id || '');
}

export function todoEntityKey(patientId, id) {
  return 't:' + String(patientId || '') + ':' + String(id || '');
}

export function patientEntityKey(id, registro) {
  const reg = String(registro || '').trim();
  if (reg) return 'reg:' + reg;
  return 'id:' + String(id || '');
}
