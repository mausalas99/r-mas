/**
 * Clinical onboarding — perfil mínimo (usuario LAN, rango, sala) y paso de equipo al arrancar.
 */
import { safeRenderClinicalTeamsPanel } from './clinical-panel-host.mjs';
export {
  hasJoinedClinicalTeam,
  needsUsernameClaim,
  needsTeamOnboarding,
  needsTeamOnboardingStep,
  needsOnboardingShell,
  needsClinicalSyncModeChoice,
  needsProfileOnboarding,
  needsClinicalOnboarding,
} from './clinical-onboarding-gates.mjs';
export { renderOnboardingPanelInto } from './clinical-onboarding-render.mjs';

export async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    const { renderOnboardingPanelInto } = await import('./clinical-onboarding-render.mjs');
    await renderOnboardingPanelInto(host);
  });
}
