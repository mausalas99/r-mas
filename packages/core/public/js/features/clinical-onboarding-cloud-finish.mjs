/**
 * After profile save: Nube register when the sala is cloud.
 */
import { isCloudSala } from './cloud-sync/sala-allowlist.mjs';
import { registerCloudDuringOnboarding } from './cloud-sync/register-during-onboarding.mjs';
import {
  clearCloudSalaUpgradePending,
  isCloudSalaUpgradePending,
} from './cloud-sync/cloud-sala-upgrade.mjs';
import { readOnboardingNubeFields } from './clinical-onboarding-nube.mjs';

/**
 * @param {{
 *   username: string,
 *   name: string,
 *   sala: string,
 *   toast: (msg: string, kind?: string) => void,
 *   showError: (msg: string) => void,
 * }} ctx
 * @returns {Promise<boolean>}
 */
export async function finishOnboardingCloud(ctx) {
  const sala = ctx.sala;
  const needsCloud = isCloudSala(sala) || isCloudSalaUpgradePending();
  if (needsCloud && isCloudSala(sala)) {
    const { password, mode } = readOnboardingNubeFields();
    const statusEl = document.getElementById('onboard-nube-status');
    const setStatus = (t) => {
      if (statusEl) statusEl.textContent = t;
    };
    const out = await registerCloudDuringOnboarding({
      mode,
      username: ctx.username,
      displayName: ctx.name,
      sala,
      password,
      // Desktop onboarding is personal-device by default (same as Recuérdame).
      remember: true,
      toast: ctx.toast,
      setStatus,
    });
    if (!out.ok) {
      ctx.showError(out.error || 'No se pudo conectar Nube.');
      return false;
    }
  }

  clearCloudSalaUpgradePending();
  return true;
}
