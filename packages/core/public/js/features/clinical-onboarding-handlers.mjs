/**
 * Clinical onboarding form handlers.
 */
import {
  clinicalSessionContext,
  lookupClinicalUserByUsername,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername,
} from '../clinical-access-runtime.mjs';
import {
  isClinicalLocalOnlyMode,
  persistClinicalUserBinding,
  readRpcSettings,
} from '../clinical-settings.mjs';
import {
  isValidUsernameFormat,
  normalizeUsername,
  shouldClaimClinicalUsername,
} from '../clinical-username.mjs';
import { getClientId, needsProfileOnboarding } from './clinical-onboarding-gates.mjs';
import {
  wireOnboardingModeBackButtons,
  wireSyncModeOnboardingInteractions,
} from './clinical-onboarding-sync-mode.mjs';
import { wireExistingAccountLoginInteractions } from './clinical-onboarding-existing-login.mjs';
import { isCloudSala } from './cloud-sync/sala-allowlist.mjs';
import { syncOnboardingNubeVisibility } from './clinical-onboarding-nube.mjs';
import { finishOnboardingCloud } from './clinical-onboarding-cloud-finish.mjs';
import {
  defaultLocalOnlyDisplayName,
  submitLocalOnlyProfile,
} from './clinical-onboarding-local-submit.mjs';

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

function readUsernameFormFields() {
  return {
    username: normalizeUsername(String(document.getElementById('onboard-username')?.value || '')),
    name: String(document.getElementById('onboard-clinical-name')?.value || '').trim(),
    rank: String(document.getElementById('onboard-rank')?.value || 'R1'),
    sala: String(document.getElementById('onboard-sala')?.value || '').trim(),
    shiftPin: String(document.getElementById('onboard-shift-pin')?.value || '').trim(),
  };
}

function showOnboardError(errEl, message) {
  if (!errEl) return;
  errEl.textContent = message;
  errEl.hidden = false;
}

function validateUsernameForm(fields, errEl) {
  if (!isValidUsernameFormat(fields.username)) {
    showOnboardError(
      errEl,
      'Usuario inválido. Usa 3–32 letras minúsculas (a-z, 0-9, _). p. ej. drmendoza — no tu nombre en guardia.'
    );
    return false;
  }
  if (!fields.name) {
    showOnboardError(errEl, 'Escribe tu nombre en guardia.');
    return false;
  }
  if (!fields.sala) {
    showOnboardError(errEl, 'Selecciona tu rotación.');
    return false;
  }
  return true;
}

async function tryResumeExistingUsername(username, settings, errEl, errMsg) {
  // Electron renderer cannot use window.confirm; Guardar perfil / Recuperar already express intent.
  const resumeRes = await resumeClinicalIdentityByUsername(username, settings, getClientId());
  if (!resumeRes.ok) {
    showOnboardError(errEl, resumeRes.error || errMsg);
    return { ok: false };
  }
  return { ok: true, settings: readRpcSettings(), sessionUserId: String(clinicalSessionContext.user?.user_id || '') };
}

async function claimUsernameIfNeeded(api, sessionUserId, username, sala, settings, errEl) {
  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || '');
  const needsClaim = shouldClaimClinicalUsername(currentHandle, username, getClientId());
  if (!needsClaim) return { ok: true, needsClaim: false, sessionUserId, settings };

  const { assertRoomForUsernameRegister } = await import('../clinical-profile-cloud-stubs.mjs');
  await assertRoomForUsernameRegister({ sala });

  if (typeof api.dbClinicalUsernameClaim !== 'function') {
    return { ok: true, needsClaim: false, sessionUserId, settings };
  }

  const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username });
  if (claimRes?.ok) {
    if (clinicalSessionContext.user) clinicalSessionContext.user.username = username;
    return { ok: true, needsClaim: true, sessionUserId, settings };
  }

  const errMsg = String(claimRes?.error || '');
  if (/ya está en uso/i.test(errMsg)) {
    const resumed = await tryResumeExistingUsername(username, settings, errEl, errMsg);
    if (!resumed.ok) return { ok: false, needsClaim: false, sessionUserId, settings };
    return {
      ok: true,
      needsClaim: false,
      sessionUserId: resumed.sessionUserId,
      settings: resumed.settings,
    };
  }

  showOnboardError(errEl, errMsg || 'No se pudo registrar el usuario.');
  return { ok: false, needsClaim: false, sessionUserId, settings };
}

async function upsertClinicalProfile(api, sessionUserId, fields, errEl) {
  if (typeof api.dbClinicalProfileUpsert !== 'function') return true;
  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: fields.name,
    rank: fields.rank,
    sala: fields.sala || null,
    // Omitted on purpose: a brand-new user gets the schema default (not
    // admin); an existing session keeps its real admin flag either way.
  });
  if (!profileRes?.ok) {
    showOnboardError(errEl, profileRes?.error || 'No se guardó el perfil.');
    return false;
  }
  if (clinicalSessionContext.user) {
    clinicalSessionContext.user.rank = fields.rank;
    clinicalSessionContext.user.clinical_name = fields.name;
    clinicalSessionContext.user.sala = fields.sala || null;
  }
  return true;
}

async function connectShiftPinIfProvided(_shiftPin, _sala) {
  /* LAN shift-pin connect retired */
}

async function pushProfileToLanAndNotify(sala, needsClaim) {
  const {
    flushClinicalProfileToCloud,
    PROFILE_PUSH_FAILED_MSG,
    PROFILE_NEEDS_CONNECT_MSG,
    isBenignPushSkipCode,
    isProfileNeedsConnectCode,
    notifyProfilePushResult,
  } = await import('../clinical-profile-cloud-stubs.mjs');
  const lanPush = await flushClinicalProfileToCloud({
    sala: sala || clinicalSessionContext.user?.sala,
  });
  notifyProfilePushResult(lanPush, toast);

  const localOnly = isClinicalLocalOnlyMode();
  if (!localOnly && !lanPush.ok && isProfileNeedsConnectCode(lanPush.code)) {
    toast(PROFILE_NEEDS_CONNECT_MSG, 'info');
    const rot = await import('./clinical-rotation-entry.mjs');
    rot.syncClinicalRotationEntryChrome();
    return;
  }

  if (
    !lanPush.ok &&
    !isBenignPushSkipCode(lanPush.code) &&
    !(lanPush.channels && lanPush.channels.outbox)
  ) {
    toast(PROFILE_PUSH_FAILED_MSG, 'warning');
  } else if (lanPush.ok && needsClaim) {
    toast('@usuario publicado en la sala ⇄.', 'success');
  }
}

async function finishRegistrationLanSideEffects(fields, needsClaim) {
  try {
    if (isCloudSala(fields.sala)) return;
    await connectShiftPinIfProvided(fields.shiftPin, fields.sala);
    await pushProfileToLanAndNotify(fields.sala, needsClaim);
  } catch {
    /* LAN connect/push are best-effort after profile save */
  }
}

export async function handleUsernameStepSubmit(ev) {
  ev.preventDefault();
  const fields = readUsernameFormFields();
  const errEl = document.getElementById('onboard-error');
  if (!validateUsernameForm(fields, errEl)) return;

  let settings = readRpcSettings();
  let sessionUserId = String(clinicalSessionContext.user?.user_id || '');
  const api = dbApi();
  if (!sessionUserId || !api) {
    toast('Sesión clínica no disponible.', 'error');
    return;
  }

  try {
    const claimResult = await claimUsernameIfNeeded(
      api,
      sessionUserId,
      fields.username,
      fields.sala,
      settings,
      errEl
    );
    if (!claimResult.ok) return;
    sessionUserId = claimResult.sessionUserId;
    settings = claimResult.settings;

    const saved = await upsertClinicalProfile(api, sessionUserId, fields, errEl);
    if (!saved) return;

    persistClinicalUserBinding({
      userId: sessionUserId,
      username: fields.username,
      displayName: fields.name,
      rank: fields.rank,
      sala: fields.sala || '',
      registered: true,
      lanProfileGateComplete: true,
    });

    if (errEl) errEl.hidden = true;

    const cloudOk = await finishOnboardingCloud({
      username: fields.username,
      name: fields.name,
      sala: fields.sala,
      toast,
      showError: (msg) => showOnboardError(errEl, msg),
    });
    if (!cloudOk) return;

    await refreshClinicalUserProfile();
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));

    const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
    await refreshMainClinicalOnboardingIfNeeded();
    toast('Perfil guardado.', 'success');

    void finishRegistrationLanSideEffects(fields, claimResult.needsClaim);
  } catch (err) {
    showOnboardError(errEl, err instanceof Error ? err.message : 'Error al guardar el perfil.');
  }
}

function applyResumedProfileToSession(name, rank, sala) {
  if (!clinicalSessionContext.user) return;
  clinicalSessionContext.user.rank = rank;
  clinicalSessionContext.user.clinical_name = name;
  clinicalSessionContext.user.sala = sala;
}

function readResumedFormFields() {
  return {
    name: String(document.getElementById('onboard-clinical-name')?.value || '').trim(),
    rank: String(document.getElementById('onboard-rank')?.value || 'R1'),
    sala: String(document.getElementById('onboard-sala')?.value || '').trim(),
  };
}

async function saveResumedProfileIfComplete(api, sessionUserId, username, errEl) {
  const fields = readResumedFormFields();
  if (!sessionUserId || !fields.name || !fields.sala) return true;
  if (!api?.dbClinicalProfileUpsert) return true;

  const profileRes = await api.dbClinicalProfileUpsert({
    userId: sessionUserId,
    clinicalName: fields.name,
    rank: fields.rank,
    sala: fields.sala,
    // Omitted on purpose: this resumes an EXISTING user's identity, so the
    // DB update skips the column, preserving their existing admin flag.
  });
  if (!profileRes?.ok) {
    showOnboardError(errEl, profileRes?.error || 'No se guardó el perfil.');
    return false;
  }

  applyResumedProfileToSession(fields.name, fields.rank, fields.sala);
  persistClinicalUserBinding({
    userId: sessionUserId,
    username,
    displayName: fields.name,
    rank: fields.rank,
    sala: fields.sala,
    registered: true,
    lanProfileGateComplete: true,
  });
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
  return true;
}

export async function handleResumeIdentityClick() {
  const username = normalizeUsername(String(document.getElementById('onboard-username')?.value || ''));
  const errEl = document.getElementById('onboard-error');
  const resumeBtn = document.getElementById('clinical-onboard-resume-btn');
  if (!isValidUsernameFormat(username)) {
    showOnboardError(errEl, 'Escribe tu @usuario para recuperarlo.');
    return;
  }
  const existing = await lookupClinicalUserByUsername(username);
  if (!existing?.user_id) {
    showOnboardError(
      errEl,
      `No encontramos @${username} en esta base de datos. Para registrarte, completa el formulario y pulsa Guardar perfil.`
    );
    return;
  }
  if (resumeBtn instanceof HTMLButtonElement) {
    resumeBtn.disabled = true;
    resumeBtn.textContent = 'Recuperando…';
  }
  const settings = readRpcSettings();
  try {
    const resumeRes = await resumeClinicalIdentityByUsername(username, settings, getClientId());
    if (!resumeRes.ok) {
      showOnboardError(errEl, resumeRes.error || 'No se pudo recuperar la cuenta.');
      return;
    }
    if (errEl) errEl.hidden = true;
    toast('Cuenta recuperada.', 'success');
    await refreshClinicalUserProfile();
    const sessionUserId = String(clinicalSessionContext.user?.user_id || '');
    const api = dbApi();
    const saved = await saveResumedProfileIfComplete(api, sessionUserId, username, errEl);
    if (!saved) return;
    const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
    await refreshMainClinicalOnboardingIfNeeded();
    if (needsProfileOnboarding()) {
      toast('Completa tu perfil y pulsa Guardar perfil.', 'info');
    }
  } finally {
    if (resumeBtn instanceof HTMLButtonElement) {
      resumeBtn.disabled = false;
      resumeBtn.textContent = 'Recuperar mi usuario';
    }
  }
}

export async function handleLocalOnlyConfirmClick() {
  const confirmBtn = document.getElementById('clinical-onboard-local-confirm-btn');
  const errEl = document.getElementById('onboard-local-only-error');
  if (confirmBtn instanceof HTMLButtonElement) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Preparando…';
  }
  const settings = readRpcSettings();
  const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1');
  try {
    const result = await submitLocalOnlyProfile(defaultLocalOnlyDisplayName(), rank, errEl);
    if (!result.ok) return;
    toast('Listo. R+ queda solo en este equipo, sin R+ Cloud.', 'success');
    const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
    await refreshMainClinicalOnboardingIfNeeded();
  } finally {
    if (confirmBtn instanceof HTMLButtonElement) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Entrar a R+';
    }
  }
}

export async function wireOnboardingInteractions() {
  wireSyncModeOnboardingInteractions();
  wireExistingAccountLoginInteractions();
  wireOnboardingModeBackButtons();

  const form = document.getElementById('clinical-onboard-username-form');
  if (form && !form._rpcOnboardWired) {
    form._rpcOnboardWired = true;
    form.addEventListener('submit', (ev) => void handleUsernameStepSubmit(ev));
  }

  const resumeBtn = document.getElementById('clinical-onboard-resume-btn');
  if (resumeBtn && !resumeBtn._rpcResumeWired) {
    resumeBtn._rpcResumeWired = true;
    resumeBtn.addEventListener('click', () => void handleResumeIdentityClick());
  }

  const localConfirmBtn = document.getElementById('clinical-onboard-local-confirm-btn');
  if (localConfirmBtn && !localConfirmBtn._rpcLocalConfirmWired) {
    localConfirmBtn._rpcLocalConfirmWired = true;
    localConfirmBtn.addEventListener('click', () => void handleLocalOnlyConfirmClick());
  }

  wireOnboardingNubeExtras();
}

function wireOnboardingNubeExtras() {
  const sala = document.getElementById('onboard-sala');
  if (sala && !sala._rpcNubeSalaWired) {
    sala._rpcNubeSalaWired = true;
    sala.addEventListener('change', () => syncOnboardingNubeVisibility());
  }
  syncOnboardingNubeVisibility();
}
