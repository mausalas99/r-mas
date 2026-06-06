import {
  NEO_COMPANION
} from "/js/chunks/chunk-DANTQKNZ.js";

// public/js/neo-companion-progress.mjs
var NEO_COMPANION_PROGRESS_LS_KEY = "rpc-neo-companion-progress";
function loadNeoCompanionProgress(storage = localStorage) {
  try {
    const raw = storage.getItem(NEO_COMPANION_PROGRESS_LS_KEY);
    if (!raw) return { completedSteps: [] };
    const p = JSON.parse(raw);
    return {
      completedSteps: Array.isArray(p.completedSteps) ? p.completedSteps : [],
      updatedAt: p.updatedAt || null
    };
  } catch (_e) {
    return { completedSteps: [] };
  }
}
function isNeoCompanionStepId(stepId) {
  return NEO_COMPANION.stepIds.includes(stepId);
}
function isNeoCompanionStepComplete(stepId, storage = localStorage) {
  return loadNeoCompanionProgress(storage).completedSteps.includes(stepId);
}
function markNeoCompanionStepComplete(stepId, storage = localStorage) {
  if (!isNeoCompanionStepId(stepId)) {
    return { ...loadNeoCompanionProgress(storage), wasNew: false };
  }
  const prev = loadNeoCompanionProgress(storage);
  const set = new Set(prev.completedSteps);
  const wasNew = !set.has(stepId);
  set.add(stepId);
  const next = {
    completedSteps: [...set],
    updatedAt: Date.now()
  };
  storage.setItem(NEO_COMPANION_PROGRESS_LS_KEY, JSON.stringify(next));
  return { ...next, wasNew };
}

export {
  NEO_COMPANION_PROGRESS_LS_KEY,
  loadNeoCompanionProgress,
  isNeoCompanionStepId,
  isNeoCompanionStepComplete,
  markNeoCompanionStepComplete
};
//# sourceMappingURL=/js/chunks/chunk-4NCUFN7B.js.map
