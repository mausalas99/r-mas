import {
  safeRenderClinicalTeamsPanel
} from "/mobile/js/chunks/chunk-JB63TG4Y.js";

// public/js/features/clinical-onboarding.mjs
async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    const { renderOnboardingPanelInto: renderOnboardingPanelInto2 } = await import("/mobile/js/chunks/clinical-onboarding-render-ANQHAAIL.js");
    await renderOnboardingPanelInto2(host);
  });
}

export {
  renderOnboardingPanel
};
//# sourceMappingURL=/js/chunks/chunk-7M7KYIIH.js.map
