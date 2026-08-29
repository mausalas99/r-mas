import {
  getPatients
} from "/mobile/js/chunks/chunk-MLLRKYO6.js";

// public/js/features/estado-actual-panel-runtime.mjs
var rt = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  onMedicionRegistered() {
  },
  getSettings() {
    return {};
  },
  switchConsolidatedTab() {
  },
  switchInnerTab() {
  },
  renderNoteForm() {
  },
  copyToClipboardSafe(_text) {
    return Promise.resolve(false);
  }
};
function registerEstadoActualPanelRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}
function getEaPanelRuntime() {
  return rt;
}

// public/js/features/estado-actual-panel-core.mjs
var _eaPanelCache = { shellKey: "", dataKey: "" };
function invalidateEaPanelCache() {
  _eaPanelCache.shellKey = "";
  _eaPanelCache.dataKey = "";
}
function findActivePatient() {
  var activeId = getEaPanelRuntime().getActiveId();
  if (!activeId) return null;
  return getPatients().find(function(p) {
    return String(p.id) === String(activeId);
  }) || null;
}
function findPatientById(id) {
  if (id == null) return null;
  return getPatients().find(function(p) {
    return String(p.id) === String(id);
  }) || null;
}
var _eaFormOpenPatientId = null;
function setEaFormOpenPatientId(id) {
  _eaFormOpenPatientId = id == null ? null : id;
}
function getEaFormOpenPatientId() {
  return _eaFormOpenPatientId;
}
function isEaRegistroFormOpenForPatient(id) {
  if (id == null || _eaFormOpenPatientId == null) return false;
  if (String(id) !== String(_eaFormOpenPatientId)) return false;
  if (typeof document === "undefined") return false;
  var backdrop = document.getElementById("ea-registro-backdrop");
  return !!(backdrop && backdrop.classList.contains("open"));
}

export {
  registerEstadoActualPanelRuntime,
  getEaPanelRuntime,
  _eaPanelCache,
  invalidateEaPanelCache,
  findActivePatient,
  findPatientById,
  setEaFormOpenPatientId,
  getEaFormOpenPatientId,
  isEaRegistroFormOpenForPatient
};
//# sourceMappingURL=/js/chunks/chunk-HVYKQKG5.js.map
