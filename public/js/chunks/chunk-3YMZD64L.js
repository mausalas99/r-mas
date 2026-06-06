import {
  CURRICULUM_VERSION,
  isValidStepForBranch,
  migrateTourStepId
} from "/js/chunks/chunk-DANTQKNZ.js";

// public/js/onboarding-progress.mjs
var GUIDED_TOUR_PROGRESS_LS_KEY = "rpc-guided-tour-progress";
function loadTourProgress(storage = localStorage) {
  try {
    const raw = storage.getItem(GUIDED_TOUR_PROGRESS_LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.stepId || !p.branch) return null;
    const branch = p.branch === "guardia-v7" ? "guardia-v7" : p.branch === "quick-route" ? "quick-route" : p.branch === "interconsulta" ? "interconsulta" : "sala";
    const mode = p.mode === "neo" ? "neo" : "base";
    const stepId = migrateTourStepId(p.stepId, branch);
    if (!isValidStepForBranch(stepId, branch, mode)) return null;
    return { ...p, branch, stepId };
  } catch (_e) {
    return null;
  }
}
function saveTourProgress(payload, storage = localStorage) {
  const branch = payload.branch === "guardia-v7" ? "guardia-v7" : payload.branch === "quick-route" ? "quick-route" : payload.branch === "interconsulta" ? "interconsulta" : "sala";
  const body = {
    branch,
    track: payload.track || branch,
    stepId: payload.stepId,
    chapterId: payload.chapterId || null,
    moduleOnly: !!payload.moduleOnly,
    mode: payload.mode === "neo" ? "neo" : "base",
    curriculumVersion: CURRICULUM_VERSION,
    updatedAt: Date.now()
  };
  storage.setItem(GUIDED_TOUR_PROGRESS_LS_KEY, JSON.stringify(body));
}
function clearTourProgress(storage = localStorage) {
  try {
    storage.removeItem(GUIDED_TOUR_PROGRESS_LS_KEY);
  } catch (_e) {
  }
}

export {
  loadTourProgress,
  saveTourProgress,
  clearTourProgress
};
//# sourceMappingURL=/js/chunks/chunk-3YMZD64L.js.map
