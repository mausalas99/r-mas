/**
 * First-run clinical identity registration (rank + display name) after DB unlock.
 */
import { isDbMode } from '../db-storage-bridge.mjs';

const RANKS = ['R1', 'R2', 'R3', 'R4', 'Admin'];

/** @param {Record<string, unknown>|null|undefined} settings */
export function needsClinicalRegistration(settings) {
  if (!isDbMode()) return false;
  return !settings || settings.clinicalRegistered !== true;
}

/** @type {((ok: boolean) => void)|null} */
let pendingResolve = null;

function backdropEl() {
  return document.getElementById('clinical-registration-backdrop');
}

export function openClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  const nameInput = document.getElementById('clinical-reg-name');
  if (nameInput) nameInput.focus();
}

export function closeClinicalRegistrationModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
}

function wireRegistrationFormOnce() {
  const form = document.getElementById('clinical-registration-form');
  if (!form || form._rpcClinicalRegWired) return;
  form._rpcClinicalRegWired = true;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const errEl = document.getElementById('clinical-reg-error');
    const name = String(document.getElementById('clinical-reg-name')?.value || '').trim();
    const rank = String(document.getElementById('clinical-reg-rank')?.value || 'R1');
    const service = String(document.getElementById('clinical-reg-service')?.value || '').trim();
    if (!name) {
      if (errEl) {
        errEl.textContent = 'Escribe tu nombre o identificador de guardia.';
        errEl.hidden = false;
      }
      return;
    }
    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    } catch (_e) {}
    settings.clinicalRegistered = true;
    settings.clinicalDisplayName = name;
    settings.clinicalRank = RANKS.includes(rank) ? rank : 'R1';
    if (service) settings.clinicalService = service.toUpperCase();
    try {
      localStorage.setItem('rpc-settings', JSON.stringify(settings));
    } catch (_e) {}
    closeClinicalRegistrationModal();
    if (pendingResolve) {
      const done = pendingResolve;
      pendingResolve = null;
      done(true);
    }
  });
}

/**
 * @param {Record<string, unknown>} settings
 * @returns {Promise<boolean>}
 */
export function promptClinicalRegistrationIfNeeded(settings) {
  if (!needsClinicalRegistration(settings)) return Promise.resolve(false);
  wireRegistrationFormOnce();
  try {
    const nameInput = document.getElementById('clinical-reg-name');
    const rankSelect = document.getElementById('clinical-reg-rank');
    const serviceInput = document.getElementById('clinical-reg-service');
    if (nameInput && settings.clinicalDisplayName) nameInput.value = String(settings.clinicalDisplayName);
    if (rankSelect && settings.clinicalRank) rankSelect.value = String(settings.clinicalRank);
    if (serviceInput && settings.clinicalService) serviceInput.value = String(settings.clinicalService);
    const errEl = document.getElementById('clinical-reg-error');
    if (errEl) errEl.hidden = true;
  } catch (_e) {}
  openClinicalRegistrationModal();
  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
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
