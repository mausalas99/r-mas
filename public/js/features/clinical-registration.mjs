/**
 * First-run clinical identity registration (username, rank, display name, sala) after DB unlock.
 */
import { closeModalAnimated } from '../ui-motion.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { bundledWardShiftPin, ensureLanProfileGateDeviceReset, isClinicalLocalOnlyMode, needsClinicalLanProfileGate, readRpcSettings } from '../clinical-settings.mjs';

/** @param {Record<string, unknown>|null|undefined} settings */
export function needsClinicalRegistration(settings) {
  if (!isDbMode()) return false;
  const s = settings || readRpcSettings();
  if (isClinicalLocalOnlyMode(s)) {
    return s.clinicalRegistered !== true;
  }
  if (needsClinicalLanProfileGate(s)) return true;
  return !s || s.clinicalRegistered !== true;
}

function applyPrefillPair(regId, onboardId, value) {
  if (!value) return;
  const regEl = document.getElementById(regId);
  const onboardEl = document.getElementById(onboardId);
  if (regEl) regEl.value = value;
  if (onboardEl) onboardEl.value = value;
}

/**
 * Pre-fill registration form from URL query params (mobile pairing link).
 */
export function prefillRegistrationFromUrlParams() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const user = params.get('user') || '';
  const name = params.get('name') || '';
  const rank = params.get('rank') || '';
  const sala = params.get('sala') || '';
  const shiftPin = params.get('pin') || params.get('shiftPin') || '';
  if (!user && !name && !rank && !sala && !shiftPin) return;

  applyPrefillPair('clinical-reg-username', 'onboard-username', user);
  applyPrefillPair('clinical-reg-name', 'onboard-clinical-name', name);
  applyPrefillPair('clinical-reg-rank', 'onboard-rank', rank);
  applyPrefillPair('clinical-reg-sala', 'onboard-sala', sala);
  applyPrefillPair('clinical-reg-shift-pin', 'onboard-shift-pin', shiftPin);
}

function backdropEl() {
  return document.getElementById('clinical-registration-backdrop');
}

export function openClinicalRegistrationModal() {
  ensureLanProfileGateDeviceReset(readRpcSettings());
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  const gatePending = needsClinicalLanProfileGate(readRpcSettings());
  const pairs = [
    ['clinical-reg-username', 'onboard-username'],
    ['clinical-reg-name', 'onboard-clinical-name'],
  ];
  if (gatePending) {
    for (const [regId, onboardId] of pairs) {
      const regEl = document.getElementById(regId);
      const onboardEl = document.getElementById(onboardId);
      if (regEl) regEl.value = '';
      if (onboardEl) onboardEl.value = '';
    }
  }
  const usernameInput = document.getElementById('clinical-reg-username');
  if (usernameInput) usernameInput.focus();
  const pinInput = document.getElementById('clinical-reg-shift-pin');
  if (pinInput && !String(pinInput.value || '').trim()) {
    const bundled = bundledWardShiftPin();
    if (bundled) pinInput.value = bundled;
  }
}

export function closeClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  closeModalAnimated(bd);
}


/**
 * @param {Record<string, unknown>} settings
 * @returns {Promise<boolean>}
 */
export function promptClinicalRegistrationIfNeeded(settings) {
  if (!needsClinicalRegistration(settings)) return Promise.resolve(false);
  return import('./clinical-onboarding-main.mjs').then((mod) =>
    mod.showMainClinicalOnboarding().then(() => true)
  );
}

export const windowHandlers = {
  openClinicalRegistrationModal,
  closeClinicalRegistrationModal,
  submitClinicalRegistration(ev) {
    if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    const form = document.getElementById('clinical-registration-form');
    if (form) form.requestSubmit();
  },
};
