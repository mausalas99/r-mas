/**
 * Main-area clinical onboarding host (#main-area).
 */
import { ensureClinicalPanelSession } from './clinical-panel-host.mjs';
import { isSqlcipherNativeReady } from './db-unlock.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../clinical-settings.mjs';
import {
  needsClinicalOnboarding,
  needsClinicalSyncModeChoice,
  renderOnboardingPanelInto,
} from './clinical-onboarding.mjs';
import { prefillRegistrationFromUrlParams } from './clinical-registration.mjs';
import {
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions,
} from './clinical-onboarding-sync-mode.mjs';

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
  void import('./clinical-rotation-entry.mjs').then((m) => m.syncClinicalRotationEntryChrome());
}

/** @returns {Promise<'locked'|'unlocked'|'native_blocked'|'no_api'|'unknown'>} */
export async function readClinicalDbGateKind() {
  if (typeof window === 'undefined' || !isDbMode()) return 'no_api';
  const api = window.rplusDb || window.electronAPI;
  if (!api || typeof api.dbStatus !== 'function') return 'no_api';
  try {
    const status = await api.dbStatus();
    if (status && !isSqlcipherNativeReady(status)) return 'native_blocked';
    if (status && status.state === 'unlocked') return 'unlocked';
    if (status && status.state) return 'locked';
    return 'unknown';
  } catch (_e) {
    return 'unknown';
  }
}

/** User-facing copy when onboarding cannot load the clinical session. */
export async function describeOnboardingSessionBlock() {
  if (typeof window === 'undefined') {
    return 'Abre la base de datos local de R+ para continuar. No necesitas red LAN ni ⇄.';
  }
  const gate = await readClinicalDbGateKind();
  if (gate === 'native_blocked') {
    return (
      'Esta instalación de R+ no cargó el módulo de base de datos (SQLCipher). ' +
      'Reinstala desde GitHub o usa Ajustes → Aplicación → Reinstalar versión actual.'
    );
  }
  if (gate === 'unlocked') {
    return (
      'La base local ya está abierta, pero la sesión clínica no inició. ' +
      'Pulsa Reintentar abajo o cierra R+ por completo (incluida la bandeja) y vuelve a abrir.'
    );
  }
  if (gate === 'locked') {
    return (
      'Abre la base de datos local de R+ para continuar. ' +
      'No necesitas red LAN ni conexión ⇄ — solo el almacenamiento cifrado de este equipo.'
    );
  }
  if (gate === 'no_api') {
    return 'R+ no detectó el acceso a la base local. Reinicia la aplicación.';
  }
  return 'Abre la base de datos local de R+ para continuar. No necesitas red LAN ni ⇄.';
}

/** Card HTML when session bootstrap failed (local-first; unlock is not LAN). */
export async function buildOnboardingSessionBlockHtml() {
  const lead = await describeOnboardingSessionBlock();
  const gate = await readClinicalDbGateKind();
  const unlockBtn =
    gate === 'locked' || gate === 'unknown'
      ? '<button type="button" class="btn-save" id="clinical-onboard-unlock-btn">Abrir base de datos</button>'
      : '';
  const retryBtn =
    gate === 'unlocked'
      ? '<button type="button" class="btn-save" id="clinical-onboard-retry-session-btn">Reintentar</button>'
      : '';
  const actions =
    unlockBtn || retryBtn
      ? `<div class="modal-actions clinical-onboard-session-actions">${unlockBtn}${retryBtn}</div>`
      : '';
  return `<div class="clinical-onboarding-card"><p class="clinical-teams-lead">${escapeHtml(lead)}</p>${actions}</div>`;
}

function wireOnboardingSessionRecoveryOnce(host) {
  if (!host || host._rpcSessionRecoveryWired) return;
  host._rpcSessionRecoveryWired = true;
  host.addEventListener('click', (ev) => {
    const unlockBtn = ev.target.closest('#clinical-onboard-unlock-btn');
    if (unlockBtn) {
      void import('./db-unlock.mjs').then((mod) => {
        if (typeof mod.retryClinicalDbUnlockForOnboarding === 'function') {
          void mod.retryClinicalDbUnlockForOnboarding();
        }
      });
      return;
    }
    const retryBtn = ev.target.closest('#clinical-onboard-retry-session-btn');
    if (retryBtn) void showMainClinicalOnboarding();
  });
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
    host.setAttribute(
      'aria-label',
      isClinicalLocalOnlyMode(readRpcSettings())
        ? 'Configura tu perfil local'
        : 'Configura tu rotación'
    );
    main.prepend(host);
  }

  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);

  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    wireSyncModeOnboardingInteractions();
    return;
  }

  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }

  host.innerHTML =
    '<div class="clinical-onboarding-card"><p class="clinical-teams-lead">Cargando…</p></div>';
  const card = host.querySelector('.clinical-onboarding-card');
  try {
    await renderOnboardingPanelInto(card || host);
    prefillRegistrationFromUrlParams();
    const rot = await import('./clinical-rotation-entry.mjs');
    rot.syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<div class="clinical-onboarding-card"><p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : 'Error al cargar.')}</p></div>`;
  }
}

async function syncChromeAfterOnboardingChange() {
  try {
    const rot = await import('./clinical-rotation-entry.mjs');
    if (typeof rot.syncClinicalRotationEntryChrome === 'function') rot.syncClinicalRotationEntryChrome();
  } catch (_e) {}
  try {
    const settings = await import('./settings-help/settings-dropdown.mjs');
    if (typeof settings.syncTeamSyncHeaderButton === 'function') {
      settings.syncTeamSyncHeaderButton();
    }
  } catch (_e) {}
}

export async function refreshMainClinicalOnboardingIfNeeded() {
  if (needsClinicalOnboarding()) await showMainClinicalOnboarding();
  else hideMainClinicalOnboarding();
  await syncChromeAfterOnboardingChange();
}
