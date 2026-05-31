import { CURRICULUM_VERSION, isValidStepForBranch } from './onboarding-curriculum.mjs';

export const GUIDED_TOUR_PROGRESS_LS_KEY = 'rpc-guided-tour-progress';

export function loadTourProgress(storage = localStorage) {
  try {
    const raw = storage.getItem(GUIDED_TOUR_PROGRESS_LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.stepId || !p.branch) return null;
    const mode = p.mode === 'neo' ? 'neo' : 'base';
    if (!isValidStepForBranch(p.stepId, p.branch, mode)) return null;
    return p;
  } catch (_e) {
    return null;
  }
}

export function saveTourProgress(payload, storage = localStorage) {
  const body = {
    branch: payload.branch,
    stepId: payload.stepId,
    chapterId: payload.chapterId || null,
    mode: payload.mode === 'neo' ? 'neo' : 'base',
    curriculumVersion: CURRICULUM_VERSION,
    updatedAt: Date.now(),
  };
  storage.setItem(GUIDED_TOUR_PROGRESS_LS_KEY, JSON.stringify(body));
}

export function clearTourProgress(storage = localStorage) {
  try {
    storage.removeItem(GUIDED_TOUR_PROGRESS_LS_KEY);
  } catch (_e) {}
}
