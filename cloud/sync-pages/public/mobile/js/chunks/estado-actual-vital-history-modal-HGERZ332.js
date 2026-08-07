import {
  findActivePatient,
  getVitalHistoryEntries,
  renderVitalHistoryListHtml,
  vitalHasHistory,
  vitalHistoryTitle
} from "/mobile/js/chunks/chunk-5OEZNMAY.js";
import {
  deriveSnapshot,
  ensureMonitoreo
} from "/mobile/js/chunks/chunk-2VPNV3XW.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-IFN2KBEN.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-J2US57NE.js";
import "/mobile/js/chunks/chunk-TRTQ4CW2.js";
import "/mobile/js/chunks/chunk-2VO3CNBC.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/features/estado-actual-vital-history-modal.mjs
var rt = {
  showToast() {
  }
};
var dismissWired = false;
function registerEaVitalHistoryModalRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function getBackdrop() {
  return document.getElementById("ea-vital-history-backdrop");
}
function getBodyEl() {
  return document.getElementById("ea-vital-history-body");
}
function getTitleEl() {
  return document.getElementById("ea-vital-history-title");
}
function closeEaVitalHistoryModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
}
function openEaVitalHistoryModal(vitalKey) {
  var key = String(vitalKey || "").trim();
  if (!key) return;
  var backdrop = getBackdrop();
  var body = getBodyEl();
  var title = getTitleEl();
  if (!backdrop || !body || !title) {
    rt.showToast("Historial de signos no disponible", "error");
    return;
  }
  var patient = findActivePatient();
  if (!patient) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  ensureMonitoreo(patient);
  var snapshot = deriveSnapshot(patient.monitoreo);
  if (!vitalHasHistory(key, snapshot)) return;
  var entries = getVitalHistoryEntries(key, snapshot);
  title.textContent = vitalHistoryTitle(key);
  body.innerHTML = renderVitalHistoryListHtml(entries);
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
}
function handleEaVitalHistoryEscape(ev) {
  if (ev.key !== "Escape" && ev.key !== "Esc") return;
  var backdrop = getBackdrop();
  if (!backdrop || !backdrop.classList.contains("open")) return;
  closeEaVitalHistoryModal();
  ev.preventDefault();
  ev.stopPropagation();
}
function wireEaVitalHistoryModalDismiss() {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener("keydown", handleEaVitalHistoryEscape, true);
  var backdrop = getBackdrop();
  if (backdrop) {
    backdrop.addEventListener("click", function(ev) {
      if (!backdrop.classList.contains("open")) return;
      if (ev.target !== backdrop) return;
      closeEaVitalHistoryModal();
    });
  }
}
var windowHandlers = {
  openEaVitalHistoryModal,
  closeEaVitalHistoryModal
};
export {
  closeEaVitalHistoryModal,
  openEaVitalHistoryModal,
  registerEaVitalHistoryModalRuntime,
  windowHandlers,
  wireEaVitalHistoryModalDismiss
};
//# sourceMappingURL=/js/chunks/estado-actual-vital-history-modal-HGERZ332.js.map
