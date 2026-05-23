/** Tour-only guards (no settings-help import — avoids cycles with lab-panel). */

let guidedTourActive = false;
let tourStepId = null;

export function syncGuidedTourContext({ active, stepId } = {}) {
  guidedTourActive = !!active;
  tourStepId = stepId || null;
}

export function isCasiopeaTourSendBlocked(kind) {
  if (!guidedTourActive) return false;
  if (kind === 'lab') return tourStepId === 'sala_casiopea_lab';
  if (kind === 'trends') return tourStepId === 'sala_casiopea_trends';
  return false;
}
