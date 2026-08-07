import {
  safeRenderClinicalTeamsPanel
} from "/mobile/js/chunks/chunk-FHDPZLZP.js";

// public/js/features/clinical-onboarding.mjs
async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    const { renderOnboardingPanelInto: renderOnboardingPanelInto2 } = await import("/mobile/js/chunks/clinical-onboarding-render-RFHPGFHT.js");
    await renderOnboardingPanelInto2(host);
  });
}

export {
  renderOnboardingPanel
};
//# sourceMappingURL=/js/chunks/chunk-RARSRFYU.js.map
