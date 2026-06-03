/** Shared guided-tour / mini-tour mutable state (mutate via tourState.*). */
import { syncGuidedTourContext } from '../../tour-guards.mjs';

export const GUIDED_TOUR_LS_KEY = 'rpc-guided-tour-done-for-version';

export const tourState = {
  tendSectionExpandedLs: 'rpc-tend-sections-expanded',
  tendHiddenSeriesLs: 'rpc-tend-hidden-series',
  tendAbnormalOnlyLs: 'rpc-tend-abnormal-only',
  guidedTourActive: false,
  /** @type {'sala'|'interconsulta'|null} */
  guidedTourBranch: null,
  /** @type {'base'|'neo'} */
  guidedTourMode: 'base',
  /** @type {string|null} */
  tourStepId: null,
  persistTourProgressTimer: null,
  tourDemoLabSessionProcessed: false,
  miniTourActive: false,
  miniTourSteps: null,
  miniTourIdx: 0,
};

export function publishTourGuardContext() {
  syncGuidedTourContext({
    active: tourState.guidedTourActive,
    stepId: tourState.tourStepId,
  });
}

publishTourGuardContext();
