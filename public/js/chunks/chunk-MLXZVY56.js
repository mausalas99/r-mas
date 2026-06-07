// public/js/tour-guards.mjs
var guidedTourActive = false;
var tourStepId = null;
var GUARDIA_V7_BOARD_PANEL_STEPS = /* @__PURE__ */ new Set([
  "gv7_guardia_tab",
  "gv7_guardia_scope",
  "gv7_guardia_toggle",
  "gv7_entrega_phase",
  "gv7_entrega_patient",
  "gv7_censo_r4"
]);
var GUARDIA_V7_ENTREGA_ROSTER_STEPS = /* @__PURE__ */ new Set(["gv7_entrega_roster"]);
function syncGuidedTourContext({ active, stepId } = {}) {
  guidedTourActive = !!active;
  tourStepId = stepId || null;
}
function isGuidedTourRunning() {
  return guidedTourActive;
}
function getGuidedTourStepId() {
  return tourStepId;
}
function shouldSuppressGuardiaEntregaBootstrap() {
  if (!guidedTourActive || !tourStepId) return false;
  return GUARDIA_V7_BOARD_PANEL_STEPS.has(tourStepId);
}
function shouldShowGuardiaBoardWithoutEntrega(stepId) {
  if (!guidedTourActive || !stepId) return false;
  return GUARDIA_V7_BOARD_PANEL_STEPS.has(stepId);
}
function shouldOpenEntregaRosterForTour(stepId) {
  if (!guidedTourActive || !stepId) return false;
  return GUARDIA_V7_ENTREGA_ROSTER_STEPS.has(stepId);
}
function isCasiopeaTourSendBlocked(kind) {
  if (!guidedTourActive) return false;
  if (kind === "lab") return tourStepId === "sala_casiopea_lab";
  if (kind === "trends") return tourStepId === "sala_casiopea_trends";
  return false;
}

export {
  syncGuidedTourContext,
  isGuidedTourRunning,
  getGuidedTourStepId,
  shouldSuppressGuardiaEntregaBootstrap,
  shouldShowGuardiaBoardWithoutEntrega,
  shouldOpenEntregaRosterForTour,
  isCasiopeaTourSendBlocked
};
//# sourceMappingURL=/js/chunks/chunk-MLXZVY56.js.map
