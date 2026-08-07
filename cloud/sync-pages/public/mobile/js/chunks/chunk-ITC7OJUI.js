import {
  safeRenderClinicalTeamsPanel
} from "/mobile/js/chunks/chunk-V7RKRU36.js";

// public/js/features/clinical-onboarding.mjs
async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    const { renderOnboardingPanelInto: renderOnboardingPanelInto2 } = await import("/mobile/js/chunks/clinical-onboarding-render-SD6W4TAI.js");
    await renderOnboardingPanelInto2(host);
  });
}

export {
  renderOnboardingPanel
};
//# sourceMappingURL=/js/chunks/chunk-ITC7OJUI.js.map
