/**
 * Mobile web boot (legacy ward URL — cloud mobile uses features/cloud-mobile/boot.mjs).
 */
import { clearWebSessionClinicalMemory } from './app-state.mjs';
import { tryMountClinicalTeamInviteBrowserGate } from './clinical-team-invite.mjs';
import { prefillRegistrationFromUrlParams } from './features/clinical-registration.mjs';
import { isMobileWeb, syncMobileBarebonesChrome } from './mobile-web.mjs';
import { closeConnectionDropdown } from './features/cloud-sync/panel-chrome.mjs';
import { shellSyncTeamSyncHeaderButton } from './app-shell-lazy-panels.mjs';
import { isCloudMobileClient } from './features/cloud-mobile/origin.mjs';

function importLazyRoutes() {
  return import('./lazy-feature-routes.mjs');
}

export function setMobileBootBanner(visible, text) {
  if (!isMobileWeb()) return;
  const el = document.getElementById('rpc-mobile-boot-banner');
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.toggle('is-visible', !!visible);
}

async function applyMobileBootSettings() {
  try {
    const settingsMod = await importLazyRoutes().then((m) => m.ensureSettingsHelpLoaded());
    const v = await settingsMod.resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = settingsMod.normalizeTourVersionLabel(v);
    settingsMod.markGuidedTourVersionDone();
  } catch {
    /* optional */
  }
}

export async function initMobileWebBoot() {
  if (isCloudMobileClient()) {
    const { initCloudMobileBoot } = await import('./features/cloud-mobile/boot.mjs');
    await initCloudMobileBoot();
    return;
  }
  tryMountClinicalTeamInviteBrowserGate();
  if (!isMobileWeb()) return;
  try {
    const { wipeSessionClinicalStorage } = await import('./session-clinical-wipe.mjs');
    wipeSessionClinicalStorage({ includeLanSession: false });
    clearWebSessionClinicalMemory();
  } catch {
    /* optional */
  }
  setMobileBootBanner(true, 'Cargando R+ Móvil…');
  prefillRegistrationFromUrlParams();
  try {
    const mobileSharer = await import('./mobile-sharer-sync.mjs');
    mobileSharer.applyMobileSharerContextFromUrl?.();
    mobileSharer.hydrateMobileSharerSessionFromSettings?.();
  } catch {
    /* optional */
  }
  closeConnectionDropdown();
  syncMobileBarebonesChrome();
  try {
    document.title = 'R+ Móvil';
  } catch {
    /* ignore */
  }
  shellSyncTeamSyncHeaderButton();
  await applyMobileBootSettings();
  const intro = document.getElementById('onboarding-intro-backdrop');
  if (intro) {
    intro.classList.remove('open');
    intro.setAttribute('aria-hidden', 'true');
  }
  setMobileBootBanner(false);
}
