import {
  rescheduleAllTodos
} from "/mobile/js/chunks/chunk-IGOCX3DQ.js";
import {
  getIndicaciones,
  getLabHistory,
  getListadoProblemas,
  getMedNotaSelectionByPatient,
  getMedPharmProfileByPatient,
  getMedRecetaByPatient,
  getNotes,
  getRecetaHuByPatient,
  getVpoByPatient
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";

// public/js/features/sync-apply/patient-delete-local.mjs
var PATIENT_STATE_MAPS = [
  () => getNotes(),
  () => getIndicaciones(),
  () => getLabHistory(),
  () => getMedRecetaByPatient(),
  () => getMedPharmProfileByPatient(),
  () => getVpoByPatient(),
  () => getRecetaHuByPatient(),
  () => getMedNotaSelectionByPatient(),
  () => getListadoProblemas()
];
function clearPatientLocalStateMaps(pid) {
  for (const getMap of PATIENT_STATE_MAPS) {
    const map = getMap();
    if (map && map[pid]) delete map[pid];
  }
}
function clearPatientTodosLocal(pid) {
  try {
    storage.saveTodos(pid, []);
  } catch {
  }
}
function pruneOrphanTodos(livePatientIds) {
  try {
    var live = /* @__PURE__ */ new Set();
    if (livePatientIds) {
      Array.from(livePatientIds).forEach(function(id) {
        if (id != null && id !== "") live.add(String(id));
      });
    }
    var ids = storage.listTodoPatientIds();
    var n = 0;
    ids.forEach(function(pid) {
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
function clearPatientAgendaLocal(pid) {
  try {
    if (storage.removeScheduledProceduresForPatient) storage.removeScheduledProceduresForPatient(pid);
  } catch {
  }
}

export {
  clearPatientLocalStateMaps,
  clearPatientTodosLocal,
  pruneOrphanTodos,
  clearPatientAgendaLocal
};
//# sourceMappingURL=/js/chunks/chunk-YUEMH3I3.js.map
