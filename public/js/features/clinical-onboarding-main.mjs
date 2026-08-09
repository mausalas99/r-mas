/**
 * Main-area clinical onboarding host (#main-area).
 */
import { ensureClinicalPanelSession } from './clinical-panel-host.mjs';
import { ensureClinicalDbUnlocked, isSqlcipherNativeReady } from './db-unlock.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { isClinicalLocalOnlyMode, readRpcSettings } from '../clinical-settings.mjs';
import {
  needsClinicalOnboarding,
  needsClinicalSyncModeChoice,
  needsOnboardingShell,
  needsProfileOnboarding,
  needsTeamOnboardingStep,
  renderOnboardingPanelInto,
} from './clinical-onboarding.mjs';
import { prefillRegistrationFromUrlParams, wireClinicalRegistrationForm } from './clinical-registration.mjs';
import {
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions,
} from './clinical-onboarding-sync-mode.mjs';
import { buildOnboardingBootLoadingHtml, buildOnboardingStageHtml } from './clinical-onboarding-shell.mjs';
import {
  animateOnboardingBootComplete,
  startOnboardingBootProgress,
  stopOnboardingBootProgress,
} from './clinical-onboarding-boot-progress.mjs';

import { escapeHtml } from '../dom-escape.mjs';
export const CLINICAL_ONBOARDING_MAIN_ID = 'clinical-onboarding-main';
export const CLINICAL_ONBOARDING_ACTIVE_CLASS = 'clinical-onboarding-active';

let teamsChangedListenerWired = false;
/** @type {Promise<void>|null} */
let showMainClinicalOnboardingInflight = null;
/** @type {(() => void)|null} */
let bootProgressStopper = null;

function ensureOnboardingBootLoading(host, opts = {}) {
  const hasLoader = host.querySelector('.clinical-onboard-boot-loader');
  if (!hasLoader) {
    stopOnboardingBootProgress(host);
    if (bootProgressStopper) {
      bootProgressStopper();
      bootProgressStopper = null;
    }
    host.innerHTML = buildOnboardingBootLoadingHtml(opts);
    bootProgressStopper = startOnboardingBootProgress(host);
    return;
  }
  if (!bootProgressStopper) {
    bootProgressStopper = startOnboardingBootProgress(host);
  }
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
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('rpc-clinical-onboarding-finished'));
  }
  void import('./clinical-rotation-entry.mjs').then((m) => m.syncClinicalRotationEntryChrome());
  void import('./settings-help/tour-engine.mjs').then((m) => {
    if (typeof m.tryShowPostRegistrationEducationIfNeeded === 'function') {
      void m.tryShowPostRegistrationEducationIfNeeded();
    }
  });
  void import('./settings-help/learn-hub.mjs').then((m) => {
    if (typeof m.syncLearnAprenderChrome === 'function') m.syncLearnAprenderChrome();
  });
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
  } catch {
    return 'unknown';
  }
}

/** User-facing copy when onboarding cannot load the clinical session. */
export async function describeOnboardingSessionBlock() {
  if (typeof window === 'undefined') {
    return 'Abre la base de datos local de R+ para continuar. No necesitas R+ Cloud ni ⇄.';
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
      'R+ está preparando el almacenamiento local de este equipo. ' +
      'Pulsa Reintentar en unos segundos; no necesitas R+ Cloud ni ⇄.'
    );
  }
  if (gate === 'no_api') {
    return 'R+ no detectó el acceso a la base local. Reinicia la aplicación.';
  }
  return 'Abre la base de datos local de R+ para continuar. No necesitas R+ Cloud ni ⇄.';
}

/** Card HTML when session bootstrap failed (auto-unlock retries; no manual DB gate). */
export async function buildOnboardingSessionBlockHtml() {
  const lead = await describeOnboardingSessionBlock();
  const gate = await readClinicalDbGateKind();
  const actions =
    gate === 'native_blocked'
      ? ''
      : `<div class="modal-actions clinical-onboard-session-actions"><button type="button" class="btn-save" id="clinical-onboard-retry-session-btn">Reintentar</button></div>`;
  return buildOnboardingStageHtml({
    title: 'Sesión clínica',
    leadHtml: `<p>${escapeHtml(lead)}</p>`,
    bodyHtml: actions,
  });
}

export function wireOnboardingSessionRecoveryOnce(host) {
  if (!host || host._rpcSessionRecoveryWired) return;
  host._rpcSessionRecoveryWired = true;
  host.addEventListener('click', (ev) => {
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

function ensureOnboardingMainHost() {
  const main = document.getElementById('main-area');
  if (!main) return null;

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
  return host;
}

function mountSyncModeChoiceOnboarding(host) {
  renderSyncModeChoicePanel(host);
  wireSyncModeOnboardingInteractions();
  void import('./settings-help/learn-hub.mjs').then((m) => {
    if (typeof m.syncLearnAprenderChrome === 'function') m.syncLearnAprenderChrome();
  });
}

/** Step 1 only needs rpc-settings — show before DB unlock / clinical bootstrap. */
export function showEarlySyncModeOnboardingIfNeeded() {
  if (typeof document === 'undefined' || !isDbMode()) return false;
  if (!needsClinicalSyncModeChoice()) return false;
  wireTeamsChangedListenerOnce();
  const host = ensureOnboardingMainHost();
  if (!host) return false;
  if (typeof window !== 'undefined' && window.__RPC_EARLY_SYNC_MODE_CHOSEN__) {
    const chosen = window.__RPC_EARLY_SYNC_MODE_CHOSEN__;
    delete window.__RPC_EARLY_SYNC_MODE_CHOSEN__;
    void refreshMainClinicalOnboardingIfNeeded();
    void chosen;
    return true;
  }
  if (host.querySelector('.clinical-onboard-mode-grid')) {
    wireSyncModeOnboardingInteractions();
    return true;
  }
  mountSyncModeChoiceOnboarding(host);
  return true;
}

export async function refreshTeamOnboardingShellOnly() {
  if (!needsTeamOnboardingStep()) {
    hideMainClinicalOnboarding();
    return;
  }
  const main = document.getElementById('main-area');
  if (!main) return;

  let host = getClinicalOnboardingMainHost();
  if (!host) {
    await showMainClinicalOnboarding();
    return;
  }

  document.documentElement.classList.add(CLINICAL_ONBOARDING_ACTIVE_CLASS);
  if (host.querySelector('[data-team-onboard-open]')) return;

  const { renderTeamOnboardingInto, wireTeamOnboardingInteractions } = await import(
    './clinical-onboarding-team.mjs'
  );
  renderTeamOnboardingInto(host, { skipCloudSync: true });
  wireTeamOnboardingInteractions(host);
}

export async function showMainClinicalOnboarding() {
  if (showMainClinicalOnboardingInflight) return showMainClinicalOnboardingInflight;
  showMainClinicalOnboardingInflight = showMainClinicalOnboardingBody().finally(() => {
    showMainClinicalOnboardingInflight = null;
  });
  return showMainClinicalOnboardingInflight;
}

async function showMainClinicalOnboardingBody() {
  wireTeamsChangedListenerOnce();

  if (needsClinicalSyncModeChoice()) {
    const host = ensureOnboardingMainHost();
    if (host) mountSyncModeChoiceOnboarding(host);
    return;
  }

  // Load memberships before gating — a joined team must suppress registro / paso 3.
  try {
    const { fetchClinicalTeamsFromDb } = await import('../clinical-access-runtime.mjs');
    await fetchClinicalTeamsFromDb();
  } catch {
    /* session optional */
  }

  try {
    const { getCloudSyncToken } = await import('./cloud-sync/settings.mjs');
    if (getCloudSyncToken()) {
      const { tryResumeOnboardingFromStoredCloudToken } = await import(
        './clinical-onboarding-existing-login.mjs'
      );
      await tryResumeOnboardingFromStoredCloudToken();
      const { fetchClinicalTeamsFromDb } = await import('../clinical-access-runtime.mjs');
      await fetchClinicalTeamsFromDb();
    }
  } catch {
    /* resume optional */
  }

  if (!needsOnboardingShell()) {
    hideMainClinicalOnboarding();
    return;
  }

  const host = ensureOnboardingMainHost();
  if (!host) return;

  ensureOnboardingBootLoading(host, {
    title: 'Preparando R+',
    message: 'Preparando almacenamiento local…',
  });

  const dbReady = await ensureClinicalDbUnlocked();
  if (!dbReady.unlocked) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }

  try {
    const { flushPendingClinicalOpsLanSnapshot } = await import('../clinical-ops-lan.mjs');
    const flushed = await flushPendingClinicalOpsLanSnapshot();
    if (flushed.changed) {
      document.dispatchEvent(new CustomEvent('rpc-clinical-ops-synced'));
    }
  } catch (_e) { void _e; }

  let sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) {
    await ensureClinicalDbUnlocked();
    sessionOk = await ensureClinicalPanelSession();
  }
  if (!sessionOk) {
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    wireOnboardingSessionRecoveryOnce(host);
    return;
  }

  ensureOnboardingBootLoading(host, {
    title: 'Preparando R+',
    message: 'Cargando formulario…',
    stepperIndex: 2,
  });
  try {
    stopOnboardingBootProgress(host);
    if (bootProgressStopper) {
      bootProgressStopper();
      bootProgressStopper = null;
    }
    await animateOnboardingBootComplete(host, 'Listo');
    await renderOnboardingPanelInto(host);
    prefillRegistrationFromUrlParams();
    wireClinicalRegistrationForm();
    const rot = await import('./clinical-rotation-entry.mjs');
    rot.syncClinicalRotationEntryChrome();
  } catch (err) {
    host.innerHTML = `<p class="clinical-registration-error">${escapeHtml(err instanceof Error ? err.message : 'Error al cargar.')}</p>`;
  }
}

async function syncChromeAfterOnboardingChange() {
  try {
    const rot = await import('./clinical-rotation-entry.mjs');
    if (typeof rot.syncClinicalRotationEntryChrome === 'function') rot.syncClinicalRotationEntryChrome();
  } catch (_e) { void _e; }
  try {
    const settings = await import('./settings-help/settings-dropdown.mjs');
    if (typeof settings.syncTeamSyncHeaderButton === 'function') {
      settings.syncTeamSyncHeaderButton();
    }
  } catch (_e) { void _e; }
}

export async function refreshMainClinicalOnboardingIfNeeded() {
  // Join/create dispatch rpc-clinical-teams-changed before session.teams is reloaded —
  // refresh from SQLCipher first or the team step stays up until a full page reload.
  try {
    const { fetchClinicalTeamsFromDb } = await import('../clinical-access-runtime.mjs');
    await fetchClinicalTeamsFromDb();
  } catch {
    /* session optional */
  }
  if (!needsOnboardingShell()) {
    hideMainClinicalOnboarding();
    await syncChromeAfterOnboardingChange();
    return;
  }
  if (!needsProfileOnboarding() && needsTeamOnboardingStep()) {
    await refreshTeamOnboardingShellOnly();
    await syncChromeAfterOnboardingChange();
    return;
  }
  await showMainClinicalOnboarding();
  await syncChromeAfterOnboardingChange();
}
