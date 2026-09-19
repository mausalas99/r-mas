/**
 * Local patient delete (transport-agnostic). Nube wipe is enqueueCloudPatientDelete.
 */
import { getPatients, setPatients } from '../../app-state.mjs';
import {
  clearPatientAgendaLocal,
  clearPatientLocalStateMaps,
  clearPatientTodosLocal,
  pruneOrphanTodos,
} from './patient-delete-local.mjs';
import { rescheduleAllTodos } from '../../todos-reminder-scheduler.mjs';

/** @type {{
 *   runtime?: { getActiveId?: () => string|null, setActiveId?: (id: string|null) => void },
 * }} */
let deleteDeps = {};

export function configurePatientDeleteLocal(deps) {
  if (deps && typeof deps === 'object') Object.assign(deleteDeps, deps);
}

/** @deprecated Prefer configurePatientDeleteLocal — kept for LAN wire-config callers. */
export function configureLanPatientDelete(deps) {
  configurePatientDeleteLocal(deps);
}

export function removePatientLocally(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid || pid.indexOf('demo-') === 0) return false;
  if (!getPatients().some(function (p) {
    return p && String(p.id) === pid;
  })) {
    return false;
  }
  setPatients(getPatients().filter(function (p) {
    return String(p.id) !== pid;
  }));
  clearPatientLocalStateMaps(pid);
  clearPatientTodosLocal(pid);
  clearPatientAgendaLocal(pid);
  // Cancel any already-scheduled reminder timers — clearing storage above doesn't
  // touch in-flight setTimeouts, which would otherwise still fire with stale data.
  rescheduleAllTodos(pid);
  var rt = deleteDeps.runtime;
  if (rt && typeof rt.getActiveId === 'function' && rt.getActiveId() === pid) {
    rt.setActiveId(getPatients().length ? getPatients()[0].id : null);
  }
  return true;
}

export { pruneOrphanTodos };
