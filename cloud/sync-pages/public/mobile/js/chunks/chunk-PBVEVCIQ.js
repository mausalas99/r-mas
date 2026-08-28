import {
  syncClinicalContextBarVisibility
} from "/mobile/js/chunks/chunk-N6GUQKRJ.js";
import {
  syncGuardiaRotationToolbar
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import {
  isClinicalLocalOnlyMode,
  readRpcSettings
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-7CF6AX3C.js";

// public/js/features/clinical-rotation-entry.mjs
var entryControlsWired = false;
async function openMiRotacion() {
  if (!isDbMode()) {
    if (typeof window.showToast === "function") {
      window.showToast("Mi rotaci\xF3n requiere la base de datos cl\xEDnica.", "info");
    }
    return;
  }
  if (isClinicalLocalOnlyMode(readRpcSettings())) {
    if (typeof window.showToast === "function") {
      window.showToast(
        "Mi rotaci\xF3n no est\xE1 disponible en modo solo este equipo (ajeno a medicina interna).",
        "info"
      );
    }
    return;
  }
  const { openConexionEquipoPanel } = await import("/mobile/js/chunks/panel-equipo-nav-VBQSPJUJ.js");
  await openConexionEquipoPanel({
    toast(msg, kind) {
      if (typeof window.showToast === "function") window.showToast(msg, kind);
    }
  });
  syncClinicalRotationEntryChrome();
}
function syncClinicalRotationEntryChrome() {
  const rotationSection = document.getElementById("clinical-rotation-section");
  if (rotationSection) rotationSection.hidden = true;
  syncGuardiaRotationToolbar();
  syncClinicalContextBarVisibility();
}
function wireClinicalRotationEntryControls() {
  if (entryControlsWired) return;
  entryControlsWired = true;
  if (typeof document !== "undefined") {
    document.addEventListener("rpc-clinical-teams-changed", () => {
      syncClinicalRotationEntryChrome();
    });
    document.addEventListener("rpc-clinical-ops-synced", () => {
      syncClinicalRotationEntryChrome();
    });
  }
}
var windowHandlers = {
  openMiRotacion
};

export {
  openMiRotacion,
  syncClinicalRotationEntryChrome,
  wireClinicalRotationEntryControls,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-PBVEVCIQ.js.map
