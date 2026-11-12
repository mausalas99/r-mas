/**
 * Onboarding: login with existing Nube account (remember me + full sync).
 */
import {
  clinicalSessionContext,
  lookupClinicalUserByUsername,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername,
} from '../clinical-access-runtime.mjs';
import {
  isClinicalExistingAccountPath,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId,
  setClinicalExistingAccountPath,
} from '../clinical-settings.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';
import { getClientId, hasPersistedClinicalProfile } from './clinical-onboarding-gates.mjs';
import { drawExistingLoginStage } from './clinical-onboarding-forms-view.jsx';
import { wireOnboardingModeBackButtons } from './clinical-onboarding-sync-mode.mjs';
import { ROTACION_PENDING, ROTACION_PENDING_MSG, wireSalaPicker } from './sala-picker.mjs';
import { bridgeCloudIdentityToLocal } from './cloud-sync/identity-bridge.mjs';
import { createCloudSyncApi } from './cloud-sync/api-client.mjs';
import {
  completeCloudOnboardingSync,
  loginCloudDuringOnboarding,
} from './cloud-sync/register-during-onboarding.mjs';
import { isCloudSala } from './cloud-sync/sala-allowlist.mjs';
import { getCloudSyncRemember, getCloudSyncToken, getCloudSyncUrl } from './cloud-sync/settings.mjs';
import { notify } from '../toast-notify.mjs';

export function needsExistingAccountLogin(
  settings = readRpcSettings(),
  user = clinicalSessionContext.user
) {
  if (!isClinicalExistingAccountPath(settings)) return false;
  return !hasPersistedClinicalProfile(settings, user);
}

export function renderExistingAccountLoginPanel(host, settings = readRpcSettings()) {
  drawExistingLoginStage(host, {
    username: normalizeUsername(String(settings.clinicalUsername || clinicalSessionContext.user?.username || '')),
    sala: String(settings.clinicalSala || clinicalSessionContext.user?.sala || ''),
    remember: getCloudSyncRemember(),
    cloudUrl: getCloudSyncUrl(),
  });
}

function showExistingLoginError(errEl, message) {
  if (!errEl) return;
  errEl.textContent = message;
  errEl.hidden = false;
}

function readExistingLoginFields() {
  const rememberEl = document.getElementById('onboard-existing-remember');
  return {
    username: normalizeUsername(String(document.getElementById('onboard-existing-username')?.value || '')),
    password: String(document.getElementById('onboard-existing-password')?.value || ''),
    sala: String(document.getElementById('onboard-existing-sala')?.value || '').trim(),
    remember: !!(rememberEl && /** @type {HTMLInputElement} */ (rememberEl).checked),
  };
}

async function tryResumeLocalIdentity(username, settings) {
  try {
    const existing = await lookupClinicalUserByUsername(username);
    if (!existing?.user_id) return settings;
    const resumed = await resumeClinicalIdentityByUsername(username, settings, getClientId());
    if (resumed.ok) return readRpcSettings();
  } catch {
    /* bridge will attach */
  }
  return settings;
}

/**
 * @param {{
 *   username: string,
 *   displayName: string,
 *   sala: string,
 *   rank?: string,
 *   toast?: (msg: string, kind?: string) => void,
 *   setStatus?: (msg: string) => void,
 *   resume?: boolean,
 * }} ctx
 */
export async function finishExistingAccountProfile(ctx) {
  await tryResumeLocalIdentity(ctx.username, readRpcSettings());

  await bridgeCloudIdentityToLocal({
    username: ctx.username,
    displayName: ctx.displayName,
    rank: ctx.rank || clinicalSessionContext.user?.rank || 'R1',
    sala: ctx.sala,
  });

  persistClinicalUserBinding({
    userId: clinicalSessionContext.user?.user_id,
    username: ctx.username,
    displayName: ctx.displayName,
    rank: ctx.rank || clinicalSessionContext.user?.rank || 'R1',
    sala: ctx.sala,
    registered: true,
    lanProfileGateComplete: true,
  });
  setClinicalExistingAccountPath(false);

  const syncOut = await completeCloudOnboardingSync({
    username: ctx.username,
    displayName: ctx.displayName,
    sala: ctx.sala,
    toast: ctx.toast,
    setStatus: ctx.setStatus,
    resume: ctx.resume,
  });
  if (!syncOut.ok) return syncOut;

  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  return { ok: true };
}

function validateExistingLoginFields(fields, errEl) {
  if (!isValidUsernameFormat(fields.username)) {
    showExistingLoginError(errEl, 'Usuario inválido: minúsculas, 3–32 caracteres, p. ej. drmendoza.');
    return false;
  }
  if (!fields.password) {
    showExistingLoginError(errEl, 'Ingresa tu contraseña de Nube.');
    return false;
  }
  if (!fields.sala) {
    showExistingLoginError(errEl, 'Selecciona tu rotación.');
    return false;
  }
  if (fields.sala === ROTACION_PENDING) {
    showExistingLoginError(errEl, ROTACION_PENDING_MSG);
    return false;
  }
  if (!isCloudSala(fields.sala)) {
    showExistingLoginError(errEl, 'La rotación elegida no usa Nube. Elige Sala o Torre HU.');
    return false;
  }
  return true;
}

async function runExistingAccountLogin(fields, { errEl, toast, setStatus }) {
  const loginOut = await loginCloudDuringOnboarding({
    username: fields.username,
    password: fields.password,
    remember: fields.remember,
    setStatus,
  });
  if (!loginOut.ok) {
    showExistingLoginError(errEl, loginOut.error || 'No se pudo iniciar sesión.');
    return false;
  }

  const displayName =
    String(loginOut.displayName || clinicalSessionContext.user?.clinical_name || '').trim() ||
    fields.username;
  const rank = String(loginOut.rank || clinicalSessionContext.user?.rank || 'R1');

  const finishOut = await finishExistingAccountProfile({
    username: fields.username,
    displayName,
    sala: fields.sala,
    rank,
    toast,
    setStatus,
  });
  if (!finishOut.ok) {
    showExistingLoginError(errEl, finishOut.error || 'No se pudo sincronizar.');
    return false;
  }

  toast(
    fields.remember
      ? 'Sesión iniciada y sincronizada (se recordará en este dispositivo).'
      : 'Sesión iniciada y sincronizada.',
    'success'
  );
  return true;
}

export async function handleExistingAccountLoginSubmit(ev) {
  ev.preventDefault();
  const errEl = document.getElementById('onboard-existing-error');
  const statusEl = document.getElementById('onboard-existing-status');
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
    if (errEl) errEl.hidden = true;
  };
  const toast = (msg, kind = 'info') => notify(msg, kind);

  const fields = readExistingLoginFields();
  if (!validateExistingLoginFields(fields, errEl)) return;

  const submitBtn = ev.target?.querySelector?.('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

  try {
    const ok = await runExistingAccountLogin(fields, { errEl, toast, setStatus });
    if (!ok) return;
    const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
    await refreshMainClinicalOnboardingIfNeeded();
  } catch (err) {
    showExistingLoginError(errEl, err instanceof Error ? err.message : 'Error al iniciar sesión.');
  } finally {
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}

function readStoredCloudTokenIdentity(settings) {
  return {
    clientId: resolveClinicalClientId(settings),
    username: normalizeUsername(
      String(settings.clinicalUsername || clinicalSessionContext.user?.username || '')
    ),
    displayName: String(
      settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ''
    ).trim(),
    rank: String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1'),
  };
}

/** Resolves username/displayName via cloud /me when the local handle is missing or a legacy machine id. */
async function resolveStoredCloudTokenHandle(identity) {
  const isInvalid =
    !isValidUsernameFormat(identity.username) || isLegacyMachineUsername(identity.username, identity.clientId);
  if (!isInvalid) return identity;

  try {
    const client = createCloudSyncApi({ getBaseUrl: getCloudSyncUrl, getToken: getCloudSyncToken });
    const data = await client.me();
    const cloudUser = data?.user || {};
    const cloudHandle = normalizeUsername(String(cloudUser.username || ''));
    if (!isValidUsernameFormat(cloudHandle)) return null;
    return {
      ...identity,
      username: cloudHandle,
      displayName: identity.displayName || String(cloudUser.displayName || '').trim(),
    };
  } catch {
    return null;
  }
}

/** Resume profile + sync when Recuérdame left a Nube token (also after app updates). */
export async function tryResumeOnboardingFromStoredCloudToken() {
  const token = getCloudSyncToken();
  if (!token) return false;

  const settings = readRpcSettings();
  const sala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || '').trim();
  if (!isCloudSala(sala)) return false;

  let identity = await resolveStoredCloudTokenHandle(readStoredCloudTokenIdentity(settings));
  if (!identity || !isValidUsernameFormat(identity.username)) return false;

  const out = await finishExistingAccountProfile({
    username: identity.username,
    displayName: identity.displayName || identity.username,
    sala,
    rank: identity.rank,
    toast: () => {},
    setStatus: () => {},
    resume: true,
  });
  if (!out.ok) return false;

  const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
  await refreshMainClinicalOnboardingIfNeeded();
  return true;
}

/** Resume sync when remember-me left a token but profile flags were cleared. */
export async function tryCompleteExistingAccountFromStoredSession() {
  const settings = readRpcSettings();
  if (!needsExistingAccountLogin(settings) && !getCloudSyncToken()) return false;
  return tryResumeOnboardingFromStoredCloudToken();
}

export function wireExistingAccountLoginInteractions() {
  const form = document.getElementById('clinical-onboard-existing-login-form');
  if (form && !form._rpcExistingLoginWired) {
    form._rpcExistingLoginWired = true;
    form.addEventListener('submit', (ev) => void handleExistingAccountLoginSubmit(ev));
  }
  wireSalaPicker(/** @type {HTMLSelectElement | null} */ (document.getElementById('onboard-existing-sala')));

  wireOnboardingModeBackButtons();

  const switchBtn = document.getElementById('clinical-onboard-switch-existing-btn');
  if (switchBtn && !switchBtn._rpcSwitchExistingWired) {
    switchBtn._rpcSwitchExistingWired = true;
    switchBtn.addEventListener('click', () => {
      setClinicalExistingAccountPath(true);
      void import('./clinical-onboarding-main.mjs').then((m) => m.refreshMainClinicalOnboardingIfNeeded());
    });
  }
}
