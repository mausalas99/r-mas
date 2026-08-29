import {
  syncGuidedTourContext
} from "/mobile/js/chunks/chunk-6KV6OYKI.js";

// public/js/features/settings-help/tour-state.mjs
var GUIDED_TOUR_LS_KEY = "rpc-guided-tour-done-for-version";
var GUIDED_TOUR_RUNNING_CLASS = "guided-tour-running";
var tourWasRunning = false;
var tourState = {
  tendSectionExpandedLs: "rpc-tend-sections-expanded",
  tendHiddenSeriesLs: "rpc-tend-hidden-series",
  tendAbnormalOnlyLs: "rpc-tend-abnormal-only",
  guidedTourActive: false,
  /** @type {'sala'|'interconsulta'|null} */
  guidedTourBranch: null,
  /** @type {'base'} */
  guidedTourMode: "base",
  /** @type {string|null} */
  tourStepId: null,
  /** @type {string|null} single chapter from Learn Hub (module-only replay) */
  guidedTourChapterScope: null,
  /** when true, tour ends after the scoped chapter */
  guidedTourModuleOnly: false,
  persistTourProgressTimer: null,
  tourActionPollTimer: null,
  tourActionClickHandler: null,
  tourDemoLabSessionProcessed: false,
  miniTourActive: false,
  miniTourSteps: null,
  miniTourIdx: 0
};
function syncTourDocumentClass() {
  if (typeof document === "undefined") return;
  const running = tourState.guidedTourActive || tourState.miniTourActive;
  document.documentElement.classList.toggle(GUIDED_TOUR_RUNNING_CLASS, running);
}
function resumeClinicalOnboardingAfterTourIfNeeded() {
  void import("/mobile/js/chunks/tour-flow-UXS652PQ.js").then((mod) => {
    if (mod && typeof mod.handlePostGuidedTourOnboardingResume === "function") {
      void mod.handlePostGuidedTourOnboardingResume();
      return;
    }
    void import("/mobile/js/chunks/clinical-onboarding-main-RTQEC5VT.js").then((main) => {
      if (main && typeof main.refreshMainClinicalOnboardingIfNeeded === "function") {
        void main.refreshMainClinicalOnboardingIfNeeded();
      }
    });
  });
}
function publishTourGuardContext() {
  const running = tourState.guidedTourActive || tourState.miniTourActive;
  syncGuidedTourContext({
    active: tourState.guidedTourActive,
    stepId: tourState.tourStepId
  });
  syncTourDocumentClass();
  if (tourWasRunning && !running) resumeClinicalOnboardingAfterTourIfNeeded();
  tourWasRunning = running;
}
publishTourGuardContext();

export {
  GUIDED_TOUR_LS_KEY,
  GUIDED_TOUR_RUNNING_CLASS,
  tourState,
  syncTourDocumentClass,
  publishTourGuardContext
};
//# sourceMappingURL=/js/chunks/chunk-ONL4KPJ3.js.map
