import { registerCloudDuringOnboarding } from './register-during-onboarding.mjs';

/**
 * Register/login → ensure-turn → pull if revision>0 → configure push bridge.
 * @returns {Promise<boolean>}
 */
export async function syncCloudCutover({ root, mode, chosenUser, toast, onSuccess }) {
  const statusEl = root.querySelector('[data-cutover-cloud-status]');
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
  };
  const password = String(root.querySelector('[data-cutover-pass]')?.value || '');
  const out = await registerCloudDuringOnboarding({
    mode,
    username: chosenUser.username,
    displayName: chosenUser.displayName,
    sala: chosenUser.sala,
    password,
    toast,
    setStatus,
  });
  if (!out.ok) {
    if (out.error) toast(out.error, 'error');
    return false;
  }
  onSuccess?.();
  return true;
}
