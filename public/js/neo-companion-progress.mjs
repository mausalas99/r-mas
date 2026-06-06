import { NEO_COMPANION } from './onboarding-curriculum.mjs';

export const NEO_COMPANION_PROGRESS_LS_KEY = 'rpc-neo-companion-progress';

export function loadNeoCompanionProgress(storage = localStorage) {
  try {
    const raw = storage.getItem(NEO_COMPANION_PROGRESS_LS_KEY);
    if (!raw) return { completedSteps: [] };
    const p = JSON.parse(raw);
    return {
      completedSteps: Array.isArray(p.completedSteps) ? p.completedSteps : [],
      updatedAt: p.updatedAt || null,
    };
  } catch (_e) {
    return { completedSteps: [] };
  }
}

export function isNeoCompanionStepId(stepId) {
  return NEO_COMPANION.stepIds.includes(stepId);
}

export function isNeoCompanionStepComplete(stepId, storage = localStorage) {
  return loadNeoCompanionProgress(storage).completedSteps.includes(stepId);
}

export function markNeoCompanionStepComplete(stepId, storage = localStorage) {
  if (!isNeoCompanionStepId(stepId)) {
    return { ...loadNeoCompanionProgress(storage), wasNew: false };
  }
  const prev = loadNeoCompanionProgress(storage);
  const set = new Set(prev.completedSteps);
  const wasNew = !set.has(stepId);
  set.add(stepId);
  const next = {
    completedSteps: [...set],
    updatedAt: Date.now(),
  };
  storage.setItem(NEO_COMPANION_PROGRESS_LS_KEY, JSON.stringify(next));
  return { ...next, wasNew };
}
