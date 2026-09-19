/**
 * Clear per-patient local state maps on delete.
 */
import { getNotes, getIndicaciones, getLabHistory, getMedRecetaByPatient, getMedPharmProfileByPatient, getVpoByPatient, getRecetaHuByPatient, getListadoProblemas, getMedNotaSelectionByPatient } from '../../app-state.mjs';
import { storage } from '../../storage.js';
import { rescheduleAllTodos } from '../../todos-reminder-scheduler.mjs';

const PATIENT_STATE_MAPS = [
  () => getNotes(),
  () => getIndicaciones(),
  () => getLabHistory(),
  () => getMedRecetaByPatient(),
  () => getMedPharmProfileByPatient(),
  () => getVpoByPatient(),
  () => getRecetaHuByPatient(),
  () => getMedNotaSelectionByPatient(),
  () => getListadoProblemas(),
];

/** @param {string} pid */
export function clearPatientLocalStateMaps(pid) {
  for (const getMap of PATIENT_STATE_MAPS) {
    const map = getMap();
    if (map && map[pid]) delete map[pid];
  }
}

/**
 * @param {string} pid
 * Goes through storage.saveTodos (not raw localStorage) so the write lands in the
 * blob cache / DB — in DB mode, direct localStorage edits are invisible to
 * storage.getTodos, which reads the cache and never sees the patient as cleared.
 */
export function clearPatientTodosLocal(pid) {
  try {
    storage.saveTodos(pid, []);
  } catch { /* ignored */ }
}

/**
 * Drop pendientes whose patient is no longer in the census (deleted charts,
 * leftover Nube keys). Cancels already-scheduled reminder timers.
 * @param {Iterable<string|number>} livePatientIds
 * @returns {number} pruned patient keys
 */
export function pruneOrphanTodos(livePatientIds) {
  try {
    var live = new Set();
    if (livePatientIds) {
      Array.from(livePatientIds).forEach(function (id) {
        if (id != null && id !== '') live.add(String(id));
      });
    }
    var ids = storage.listTodoPatientIds();
    var n = 0;
    ids.forEach(function (pid) {
      if (live.has(String(pid))) return;
      clearPatientTodosLocal(pid);
      rescheduleAllTodos(pid);
      n += 1;
    });
    return n;
  } catch {
    return 0;
  }
}

/** @param {string} pid */
export function clearPatientAgendaLocal(pid) {
  try {
    if (storage.removeScheduledProceduresForPatient) storage.removeScheduledProceduresForPatient(pid);
  } catch { /* ignored */ }
}
