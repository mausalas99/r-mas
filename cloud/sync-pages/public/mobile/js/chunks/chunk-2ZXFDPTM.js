// public/js/patient-datos-modal.mjs
var dismissWired = false;
function getBackdrop() {
  return document.getElementById("exp-datos-modal-backdrop");
}
function getMount() {
  return document.getElementById("exp-datos-modal-mount");
}
function getPanesHost() {
  return document.getElementById("expediente-panes-host");
}
function ensureDatosPaneInModal() {
  var pane = document.getElementById("itab-content-datos");
  var mount = getMount();
  if (!pane || !mount) return;
  if (pane.parentElement !== mount) {
    mount.appendChild(pane);
    pane.classList.remove("tab-content");
    pane.classList.add("exp-segment-panel", "active");
  }
  pane.hidden = false;
}
function returnDatosPaneToHost() {
  var pane = document.getElementById("itab-content-datos");
  var host = getPanesHost();
  if (!pane || !host || pane.parentElement === host) return;
  host.appendChild(pane);
  pane.classList.add("tab-content");
  pane.classList.remove("exp-segment-panel", "active");
  pane.hidden = true;
}
function closePatientDatosModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  returnDatosPaneToHost();
}
function openPatientDatosModal(patientId) {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  ensureDatosPaneInModal();
  if (typeof window !== "undefined" && typeof window.renderPatientDataPane === "function") {
    window.renderPatientDataPane(patientId);
  }
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  var closeBtn = backdrop.querySelector(".exp-datos-modal-close");
  if (closeBtn instanceof HTMLElement) closeBtn.focus();
}
function openPatientDatosModalForPatient(patientId) {
  openPatientDatosModal(patientId);
}
function wirePatientDatosModal() {
  if (dismissWired) return;
  dismissWired = true;
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.addEventListener("click", function(ev) {
    if (!backdrop.classList.contains("open")) return;
    if (ev.target !== backdrop) return;
    closePatientDatosModal();
  });
  document.addEventListener("keydown", function(ev) {
    if (ev.key !== "Escape" && ev.key !== "Esc") return;
    var bd = getBackdrop();
    if (!bd || !bd.classList.contains("open")) return;
    closePatientDatosModal();
  });
}
function wirePatientDatosModalOnce() {
  wirePatientDatosModal();
  var pane = document.getElementById("itab-content-datos");
  if (pane && !pane.closest("#exp-datos-modal-mount")) {
    pane.hidden = true;
    pane.classList.remove("active");
  }
}
var patientDatosModalWindowHandlers = {
  openPatientDatosModal,
  openPatientDatosModalForPatient,
  closePatientDatosModal
};

export {
  closePatientDatosModal,
  openPatientDatosModal,
  openPatientDatosModalForPatient,
  wirePatientDatosModalOnce,
  patientDatosModalWindowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-2ZXFDPTM.js.map
