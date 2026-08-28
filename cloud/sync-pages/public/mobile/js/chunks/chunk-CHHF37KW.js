import {
  clearPatientAgendaLocal,
  clearPatientLocalStateMaps,
  clearPatientTodosLocal
} from "/mobile/js/chunks/chunk-GRPBL3SH.js";
import {
  rescheduleAllTodos
} from "/mobile/js/chunks/chunk-A35AFCZK.js";
import {
  getPatients,
  setPatients
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";

// public/js/features/sync-apply/patient-delete.mjs
var deleteDeps = {};
function removePatientLocally(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) return false;
  if (!getPatients().some(function(p) {
    return p && String(p.id) === pid;
  })) {
    return false;
  }
  setPatients(getPatients().filter(function(p) {
    return String(p.id) !== pid;
  }));
  clearPatientLocalStateMaps(pid);
  clearPatientTodosLocal(pid);
  clearPatientAgendaLocal(pid);
  rescheduleAllTodos(pid);
  var rt = deleteDeps.runtime;
  if (rt && typeof rt.getActiveId === "function" && rt.getActiveId() === pid) {
    rt.setActiveId(getPatients().length ? getPatients()[0].id : null);
  }
  return true;
}

export {
  removePatientLocally
};
//# sourceMappingURL=/js/chunks/chunk-CHHF37KW.js.map
