import {
  LAB_INNER_SECTIONS
} from "/mobile/js/chunks/chunk-S7KMFXOR.js";

// public/js/features/patient-dashboard/lab-inner.mjs
var rt = {
  getActiveAppTab() {
    return "nota";
  },
  getActiveInner() {
    return "resumen";
  },
  setActiveInner() {
  },
  switchAppTab() {
  },
  switchInnerTab() {
  }
};
function registerLabInnerRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function labInnerFromGranular(inner) {
  if (inner === "tend" || inner === "cult") return inner;
  return "labs";
}
function innerAfterLeavingLab(inner) {
  if (inner === "tend" || inner === "cult") return "resumen";
  return inner;
}
function currentLabInner() {
  return labInnerFromGranular(rt.getActiveInner());
}
function syncLabInnerVisibility() {
  var section = currentLabInner();
  var labs = document.getElementById("lab-inner-labs");
  var tend = document.getElementById("lab-inner-tend-mount");
  var cult = document.getElementById("lab-inner-cult-mount");
  if (labs) labs.hidden = section !== "labs";
  if (tend) tend.hidden = section !== "tend";
  if (cult) cult.hidden = section !== "cult";
  document.querySelectorAll("[data-lab-inner]").forEach(function(btn) {
    var on = btn.getAttribute("data-lab-inner") === section;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
}
function switchLabInner(section) {
  var next = LAB_INNER_SECTIONS.indexOf(section) >= 0 ? section : "labs";
  if (next === "tend" || next === "cult") {
    rt.switchInnerTab(next);
    syncLabInnerVisibility();
    return;
  }
  rt.switchAppTab("lab");
  var inner = rt.getActiveInner();
  if (inner === "tend" || inner === "cult") {
    rt.setActiveInner("resumen");
  }
  syncLabInnerVisibility();
}
var windowHandlers = {
  switchLabInner
};

export {
  registerLabInnerRuntime,
  labInnerFromGranular,
  innerAfterLeavingLab,
  currentLabInner,
  syncLabInnerVisibility,
  switchLabInner,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-UKBXHDKP.js.map
