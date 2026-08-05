import {
  invalidateCultivosTableCache,
  limpiarReporte,
  renderPatientList,
  selectPatient
} from "/mobile/js/chunks/chunk-4SIVR4SA.js";
import {
  clearPitchDemo,
  markPitchTourSessionActive,
  resolvePitchPersistPatients,
  seedPitchDemo,
  setPitchPatientIsolation,
  tryRecoverPatientsFromPitchSandboxIfNeeded
} from "/mobile/js/chunks/chunk-F55OGCCZ.js";
import {
  indicaciones,
  labHistory,
  listadoProblemas,
  medNotaSelectionByPatient,
  medRecetaByPatient,
  notes,
  patients,
  recetaHuByPatient,
  saveState,
  setPatients,
  setPersistPatientsResolver
} from "/mobile/js/chunks/chunk-JZ2SPQIK.js";

// public/js/presentation-mode.mjs
var presentationActive = false;
var rt = {
  getActiveId() {
    return null;
  },
  setActiveId() {
  },
  showToast() {
  }
};
function registerPresentationRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}
function isPresentationModeActive() {
  return presentationActive;
}
function getDemoState() {
  return {
    patients,
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient,
    setPatients,
    saveState,
    renderPatientList,
    selectPatient,
    getActiveId: function() {
      return rt.getActiveId();
    },
    setActiveId: function(id) {
      rt.setActiveId(id);
    }
  };
}
function syncPresentationBodyClass() {
  document.body.classList.toggle("presentation-mode-active", presentationActive);
}
function startPresentationMode() {
  if (presentationActive) {
    seedPitchDemo(getDemoState());
    invalidateCultivosTableCache();
    return;
  }
  setPersistPatientsResolver(resolvePitchPersistPatients);
  markPitchTourSessionActive(true);
  seedPitchDemo(getDemoState());
  invalidateCultivosTableCache();
  presentationActive = true;
  syncPresentationBodyClass();
  var pv = document.getElementById("patient-view");
  var es = document.getElementById("empty-state");
  if (pv) pv.style.display = "";
  if (es) es.style.display = "none";
  rt.showToast("Modo presentaci\xF3n: DEMO P\xC9REZ", "info");
}
function stopPresentationMode() {
  if (!presentationActive) return;
  setPersistPatientsResolver(null);
  setPitchPatientIsolation(false);
  markPitchTourSessionActive(false);
  clearPitchDemo(getDemoState());
  presentationActive = false;
  syncPresentationBodyClass();
  limpiarReporte();
  var pv = document.getElementById("patient-view");
  var es = document.getElementById("empty-state");
  if (!rt.getActiveId()) {
    if (pv) pv.style.display = "none";
    if (es) es.style.display = "flex";
  } else {
    selectPatient(rt.getActiveId());
  }
  rt.showToast("Modo presentaci\xF3n terminado", "info");
}
function togglePresentationMode() {
  if (presentationActive) stopPresentationMode();
  else startPresentationMode();
}
function recoverPresentationPatientsOnBoot() {
  var state = getDemoState();
  var recovered = false;
  try {
    if (sessionStorage.getItem("rpc-pitch-tour-active") === "1") {
      setPersistPatientsResolver(null);
      setPitchPatientIsolation(false);
      clearPitchDemo(state);
      recovered = true;
    }
  } catch (_e) {
    void _e;
  }
  if (!recovered && tryRecoverPatientsFromPitchSandboxIfNeeded(state)) {
    recovered = true;
  }
  if (!recovered) return false;
  presentationActive = false;
  syncPresentationBodyClass();
  renderPatientList();
  if (rt.getActiveId()) selectPatient(rt.getActiveId());
  else if (patients.length) selectPatient(patients[0].id);
  return true;
}
function isPresentationShortcut(e) {
  if (!e || !e.altKey || !e.shiftKey) return false;
  if (!(e.metaKey || e.ctrlKey)) return false;
  if (e.code === "KeyP") return true;
  return String(e.key || "").toLowerCase() === "p";
}
function initPresentationShortcut() {
  if (initPresentationShortcut._bound) return;
  initPresentationShortcut._bound = true;
  if (typeof window !== "undefined") {
    window.togglePresentationMode = togglePresentationMode;
  }
  document.addEventListener(
    "keydown",
    function(e) {
      if (!isPresentationShortcut(e)) return;
      var tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target && e.target.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      togglePresentationMode();
    },
    true
  );
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      initPresentationShortcut();
    });
  } else {
    initPresentationShortcut();
  }
}

export {
  registerPresentationRuntime,
  isPresentationModeActive,
  startPresentationMode,
  stopPresentationMode,
  togglePresentationMode,
  recoverPresentationPatientsOnBoot,
  isPresentationShortcut,
  initPresentationShortcut
};
//# sourceMappingURL=/js/chunks/chunk-U4AKRAFK.js.map
