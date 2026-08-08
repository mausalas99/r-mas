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
import { escapeHtml, escapeAttr } from '../dom-escape.mjs';
import { getClientId, hasPersistedClinicalProfile } from './clinical-onboarding-gates.mjs';
import { buildOnboardingStageHtml } from './clinical-onboarding-shell.mjs';
import { wireOnboardingModeBackButtons } from './clinical-onboarding-sync-mode.mjs';
import { CLINICAL_SALAS } from './clinical-teams/shared.mjs';
import { bridgeCloudIdentityToLocal } from './cloud-sync/identity-bridge.mjs';
import { createCloudSyncApi } from './cloud-sync/api-client.mjs';
import {
  completeCloudOnboardingSync,
  loginCloudDuringOnboarding,
} from './cloud-sync/register-during-onboarding.mjs';
import { isCloudSala } from './cloud-sync/sala-allowlist.mjs';
import { getCloudSyncRemember, getCloudSyncToken, getCloudSyncUrl } from './cloud-sync/settings.mjs';

function buildSalaOptionsHtml(prefilledSala) {
  return CLINICAL_SALAS.map(
    (s) =>
      `<option value="${escapeAttr(s)}" ${prefilledSala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
  ).join('');
}

export function needsExistingAccountLogin(
  settings = readRpcSettings(),
  user = clinicalSessionContext.user
) {
  if (!isClinicalExistingAccountPath(settings)) return false;
  return !hasPersistedClinicalProfile(settings, user);
}

export function buildExistingAccountLoginBodyHtml(settings = readRpcSettings()) {
  const prefilledSala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || '');
  const prefilledUser = normalizeUsername(
    String(settings.clinicalUsername || clinicalSessionContext.user?.username || '')
  );
  const rememberChecked = getCloudSyncRemember();
  return `
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-existing-login-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <div class="field-group">
            <label for="onboard-existing-username">Usuario (@usuario) *</label>
            <input id="onboard-existing-username" type="text" class="profile-input" placeholder="ej. drmendoza"
              value="${escapeAttr(prefilledUser)}" required autocomplete="username" spellcheck="false">
          </div>
          <div class="field-group">
            <label for="onboard-existing-password">Contraseña Nube *</label>
            <input id="onboard-existing-password" type="password" class="profile-input"
              required autocomplete="current-password" minlength="10">
          </div>
          <label class="cloud-sync-remember clinical-onboard-remember">
            <input type="checkbox" id="onboard-existing-remember" data-onboard-existing-remember${
              rememberChecked ? ' checked' : ''
            } />
            Recuérdame en este dispositivo
          </label>
          <p class="clinical-teams-hint">Mantiene la sesión Nube al reiniciar R+. No uses esto en una Mac compartida.</p>
          <div class="field-group">
            <label for="onboard-existing-sala">Rotación *</label>
            <select id="onboard-existing-sala" class="profile-input" required>
              <option value="">— Seleccionar —</option>
              ${buildSalaOptionsHtml(prefilledSala)}
            </select>
            <p class="clinical-teams-hint">Necesaria para unirte a la sala de turno en Nube (${escapeHtml(getCloudSyncUrl())}).</p>
          </div>
          <p id="onboard-existing-status" class="clinical-teams-hint" aria-live="polite"></p>
          <p id="onboard-existing-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Entrar y sincronizar</button>
            <button type="button" id="clinical-onboard-existing-back-btn" class="btn-med-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>`;
}

export function renderExistingAccountLoginPanel(host, settings = readRpcSettings()) {
  host.innerHTML = buildOnboardingStageHtml({
    title: 'Inicia sesión en Nube',
    leadHtml:
      '<p>Entra con tu @usuario y contraseña de R+ Cloud. Sincronizaremos equipos y censo del turno en este equipo.</p>',
    stepperIndex: 2,
    bodyHtml: buildExistingAccountLoginBodyHtml(settings),
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
 * }} ctx
 */
export async function finishExistingAccountProfile(ctx) {
  let settings = readRpcSettings();
  settings = await tryResumeLocalIdentity(ctx.username, settings);

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
  });
  if (!syncOut.ok) return syncOut;

  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  return { ok: true };
}

export async function handleExistingAccountLoginSubmit(ev) {
  ev.preventDefault();
  const errEl = document.getElementById('onboard-existing-error');
  const statusEl = document.getElementById('onboard-existing-status');
  const setStatus = (t) => {
    if (statusEl) statusEl.textContent = t;
    if (errEl) errEl.hidden = true;
  };
  const toast = (msg, kind = 'info') => {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(msg, kind);
    }
  };

  const fields = readExistingLoginFields();
  if (!isValidUsernameFormat(fields.username)) {
    showExistingLoginError(errEl, 'Usuario inválido: minúsculas, 3–32 caracteres, p. ej. drmendoza.');
    return;
  }
  if (!fields.password) {
    showExistingLoginError(errEl, 'Ingresa tu contraseña de Nube.');
    return;
  }
  if (!fields.sala) {
    showExistingLoginError(errEl, 'Selecciona tu rotación.');
    return;
  }
  if (!isCloudSala(fields.sala)) {
    showExistingLoginError(errEl, 'La rotación elegida no usa Nube. Elige Sala o Torre HU.');
    return;
  }

  const submitBtn = ev.target?.querySelector?.('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;

  try {
    const loginOut = await loginCloudDuringOnboarding({
      username: fields.username,
      password: fields.password,
      remember: fields.remember,
      setStatus,
    });
    if (!loginOut.ok) {
      showExistingLoginError(errEl, loginOut.error || 'No se pudo iniciar sesión.');
      return;
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
      return;
    }

    toast(
      fields.remember
        ? 'Sesión iniciada y sincronizada (se recordará en este dispositivo).'
        : 'Sesión iniciada y sincronizada.',
      'success'
    );

    const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
    await refreshMainClinicalOnboardingIfNeeded();
  } catch (err) {
    showExistingLoginError(errEl, err instanceof Error ? err.message : 'Error al iniciar sesión.');
  } finally {
    if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  }
}

/** Resume profile + sync when Recuérdame left a Nube token (also after app updates). */
export async function tryResumeOnboardingFromStoredCloudToken() {
  const token = getCloudSyncToken();
  if (!token) return false;

  const settings = readRpcSettings();
  const sala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || '').trim();
  if (!isCloudSala(sala)) return false;

  const clientId = resolveClinicalClientId(settings);
  let username = normalizeUsername(
    String(settings.clinicalUsername || clinicalSessionContext.user?.username || '')
  );
  let displayName = String(
    settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ''
  ).trim();
  const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1');

  const handleInvalid =
    !isValidUsernameFormat(username) || isLegacyMachineUsername(username, clientId);

  if (handleInvalid) {
    try {
      const client = createCloudSyncApi({
        getBaseUrl: getCloudSyncUrl,
        getToken: getCloudSyncToken,
      });
      const data = await client.me();
      const cloudUser = data?.user || {};
      const cloudHandle = normalizeUsername(String(cloudUser.username || ''));
      if (!isValidUsernameFormat(cloudHandle)) return false;
      username = cloudHandle;
      if (!displayName) {
        displayName = String(cloudUser.displayName || '').trim();
      }
    } catch {
      return false;
    }
  }

  if (!isValidUsernameFormat(username)) return false;

  const out = await finishExistingAccountProfile({
    username,
    displayName: displayName || username,
    sala,
    rank,
    toast: () => {},
    setStatus: () => {},
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
