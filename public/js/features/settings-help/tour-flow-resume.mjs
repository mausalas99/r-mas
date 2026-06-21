/** Resume guided tour from saved progress. */
import { loadTourProgress } from '../../onboarding-progress.mjs';
import { resetTourUiBeforeResume } from './tour-engine.mjs';
import { startOnboarding } from './tour-flow-onboarding.mjs';
import { getSettingsHelpRuntime } from './runtime.mjs';
import { tourState } from './tour-state.mjs';

const rt = getSettingsHelpRuntime();

function resumeGuidedTourFromProgress() {
  var p = loadTourProgress();
  if (!p) return false;
  tourState.guidedTourBranch =
    p.branch === 'interconsulta' ? 'interconsulta'
      : p.branch === 'guardia-v7' ? 'guardia-v7'
        : p.branch === 'quick-route' ? 'quick-route'
          : 'sala';
  tourState.guidedTourMode = p.mode === 'neo' ? 'neo' : 'base';
  tourState.guidedTourModuleOnly = !!p.moduleOnly;
  tourState.guidedTourChapterScope = p.moduleOnly ? p.chapterId || null : null;
  resetTourUiBeforeResume();
  startOnboarding(tourState.guidedTourBranch, { resumeStepId: p.stepId, skipIntro: true });
  return true;
}

function startNeoCompanionTour(startStepId) {
  if (tourState.guidedTourActive) {
    rt.showToast('Finaliza el tutorial actual primero.', 'error');
    return;
  }
  tourState.guidedTourMode = 'neo';
  tourState.guidedTourBranch = 'sala';
  startOnboarding('sala', { resumeStepId: startStepId || 'sala_casiopea_lab', skipIntro: true });
}

export { resumeGuidedTourFromProgress, startNeoCompanionTour };
