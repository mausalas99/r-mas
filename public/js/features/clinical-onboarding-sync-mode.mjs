/**
 * Onboarding: Nube / ya tengo cuenta / solo este equipo.
 */
import {
  readRpcSettings,
  setClinicalExistingAccountPath,
  setClinicalSyncModeLocalOnly,
} from '../clinical-settings.mjs';
import {
  buildOnboardingStageHtml,
  buildSyncModeChoiceBodyHtml,
} from './clinical-onboarding-shell.mjs';

/** @param {string} userId */
export function localOnlyUsernameForUserId(userId) {
  const tail =
    String(userId || '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase()
      .slice(-10) || 'device';
  return `local_${tail}`.slice(0, 32);
}

export function renderSyncModeChoicePanel(host) {
  host.innerHTML = buildOnboardingStageHtml({
    title: '¿Cómo usarás R+?',
    leadHtml:
      '<p>Elige cómo usarás R+ en este equipo. Con Nube creas cuenta o entras si ya tienes una; en solo equipo trabajas sin sincronizar.</p>',
    bodyHtml: buildSyncModeChoiceBodyHtml(),
    stepperIndex: 1,
  });
}

async function refreshOnboardingHost() {
  const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
  await refreshMainClinicalOnboardingIfNeeded();
}

export async function handleSyncModeChoice(mode) {
  if (mode === 'local') {
    setClinicalExistingAccountPath(false);
    setClinicalSyncModeLocalOnly(true);
  } else if (mode === 'nube' || mode === 'lan') {
    setClinicalExistingAccountPath(false);
    setClinicalSyncModeLocalOnly(false);
  } else if (mode === 'existing') {
    setClinicalExistingAccountPath(true);
  } else {
    return;
  }
  await refreshOnboardingHost();
}

export async function handleSyncModeBack() {
  const settings = readRpcSettings();
  delete settings.clinicalLocalOnly;
  delete settings.clinicalOnboardingExistingAccount;
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
  } catch (_e) { void _e; }
  await refreshOnboardingHost();
}

export function wireSyncModeOnboardingInteractions() {
  const modeHost = document.querySelector('.clinical-onboard-mode-grid');
  if (modeHost && !modeHost._rpcModeWired) {
    modeHost._rpcModeWired = true;
    modeHost.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-sync-mode]');
      if (!btn) return;
      void handleSyncModeChoice(String(btn.getAttribute('data-sync-mode') || ''));
    });
  }
}
