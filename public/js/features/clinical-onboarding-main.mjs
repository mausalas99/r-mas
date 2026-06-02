/**
 * Main-area clinical onboarding host (#main-area).
 */
import { ensureClinicalPanelSession } from './clinical-panel-host.mjs';
import {
  needsClinicalOnboarding,
  renderOnboardingPanelInto,
} from './clinical-onboarding.mjs';
import { prefillRegistrationFromUrlParams } from './clinical-registration.mjs';
import { syncClinicalRotationEntryChrome } from './clinical-rotation-entry.mjs';

export const CLINICAL_ONBOARDING_MAIN_ID = 'clinical-onboarding-main';
export const CLINICAL_ONBOARDING_ACTIVE_CLASS = 'clinical-onboarding-active';

let teamsChangedListenerWired = false;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getClinicalOnboardingMainHost() {
  return document.getElementById(CLINICAL_ONBOARDING_MAIN_ID);
}

export function isMainClinicalOnboardingActive() {
  return document.documentElement.classList.contains(CLINICAL_ONBOARDING_ACTIVE_CLASS);
}

function wireTeamsChangedListenerOnce() {
  if (teamsChangedListenerWired || typeof document === 'undefined') return;
  teamsChangedListenerWired = true;
  document.addEventListener('rpc-clinical-teams-changed', () => {
    void refreshMainClinicalOnboardingIfNeeded();
  });
}

export function hideMainClinicalOnboarding() {
  document.documentElement.classList.remove(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  const host = getClinicalOnboardingMainHost();
  if (host) host.remove();
  syncClinicalRotationEntryChrome();
}

export function focusMainClinicalOnboarding() {
  const host = getClinicalOnboardingMainHost();
  if (!host) return false;
  host.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return true;
}

export async function showMainClinicalOnboarding() {
  wireTeamsChangedListenerOnce();

  if (!needsClinicalOnboarding()) {
    hideMainClinicalOnboarding();
    return;
  }

  const main = document.getElementById('main-area');
  if (!main) return;

  let host = getClinicalOnboardingMainHost();
  if (!host) {
    host = document.createElement('div');
    host.id = CLINICAL_ONBOARDING_MAIN_ID;
    host.className = 'clinical-onboarding-main';
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Configura tu rotación');
    main.prepend(host);
  }

  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);

  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Desbloquea la base de datos para configurar tu rotación.</p></div>`;
    return;
  }

  host.innerHTML =
    '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Cargando…</p></div>';
  const card = host.querySelector('.clinical-onboarding-card');
  try {
    await renderOnboardingPanelInto(card || host);
    prefillRegistrationFromUrlParams();
    syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : 'Error al cargar.')}</p></div>`;
  }
}

export async function refreshMainClinicalOnboardingIfNeeded() {
  if (needsClinicalOnboarding()) await showMainClinicalOnboarding();
  else hideMainClinicalOnboarding();
}
