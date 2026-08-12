import {
  findActivePatient,
  getVitalHistoryEntries,
  renderVitalHistoryListHtml,
  vitalHasHistory,
  vitalHistoryTitle
} from "/mobile/js/chunks/chunk-CWXF5HCJ.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-3MF5KBNS.js";
import "/mobile/js/chunks/chunk-ID2H6AJR.js";
import {
  deriveSnapshot,
  ensureMonitoreo
} from "/mobile/js/chunks/chunk-RHISJ2VG.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-XKV6IPP7.js";
import "/mobile/js/chunks/chunk-TTNY5OXP.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";

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
//# sourceMappingURL=/js/chunks/estado-actual-vital-history-modal-LFVL5DJ2.js.map
