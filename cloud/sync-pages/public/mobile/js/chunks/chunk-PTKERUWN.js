import {
  safeRenderClinicalTeamsPanel
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";

// public/js/features/clinical-onboarding.mjs
async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    const { renderOnboardingPanelInto: renderOnboardingPanelInto2 } = await import("/mobile/js/chunks/clinical-onboarding-render-KHDQJN6N.js");
    await renderOnboardingPanelInto2(host);
  });
}

export {
  renderOnboardingPanel
};
//# sourceMappingURL=/js/chunks/chunk-PTKERUWN.js.map
