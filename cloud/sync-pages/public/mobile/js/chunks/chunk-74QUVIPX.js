import {
  safeRenderClinicalTeamsPanel
} from "/mobile/js/chunks/chunk-4RWHEAJO.js";

// public/js/features/clinical-onboarding.mjs
async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    const { renderOnboardingPanelInto: renderOnboardingPanelInto2 } = await import("/mobile/js/chunks/clinical-onboarding-render-YVXH3LLL.js");
    await renderOnboardingPanelInto2(host);
  });
}

export {
  renderOnboardingPanel
};
//# sourceMappingURL=/js/chunks/chunk-74QUVIPX.js.map
