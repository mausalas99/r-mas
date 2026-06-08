/**
 * Clinical onboarding — perfil mínimo (usuario LAN, rango, sala).
 * Equipos: crear/unirse al reabrir Mi rotación, no en el wizard inicial.
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername,
} from '../clinical-access-runtime.mjs';
import {
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  CLINICAL_LAN_PROFILE_GATE_LEAD_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  ensureLanProfileGateDeviceReset,
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  isLocalOnlyPlaceholderUsername,
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
  readRpcSettings,
  bundledWardShiftPin,
} from '../clinical-settings.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { safeRenderClinicalTeamsPanel } from './clinical-panel-host.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from '../clinical-username.mjs';
import { CLINICAL_SALAS } from './clinical-teams/shared.mjs';

import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { filterJoinedTeams } from './clinical-teams.mjs';
import {
  renderLocalOnlyProfilePanel,
  renderSyncModeChoicePanel,
  wireSyncModeOnboardingInteractions,
} from './clinical-onboarding-sync-mode.mjs';
import { buildOnboardingStageHtml } from './clinical-onboarding-shell.mjs';

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

function getClientId() {
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    return String(settings.clientId || '');
  } catch (_e) {
    return '';
  }
}

export function needsUsernameClaim() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return true;
  if (isLegacyMachineUsername(user.username, getClientId())) return true;
  try {
    const settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    const cached = String(settings.clinicalUsername || '').trim();
    if (cached && !isValidUsernameFormat(normalizeUsername(cached))) return true;
    if (cached && isLegacyMachineUsername(user.username, getClientId())) return true;
  } catch (_e) {}
  const handle = normalizeUsername(user.username || '');
  return !isValidUsernameFormat(handle);
}

/** Sin equipo asignado (informativo; no bloquea la app). R4/Admin supervisan sin unirse. */
export function needsTeamOnboarding() {
  if (!clinicalSessionContext.user?.user_id) return true;
  if (hasElevatedTeamPrivileges(clinicalSessionContext.user)) return false;
  const teams = clinicalSessionContext.teams || [];
  return filterJoinedTeams(teams, clinicalSessionContext.user).length === 0;
}

/** First screen: LAN guardia vs solo este equipo (before any profile fields). */
export function needsClinicalSyncModeChoice() {
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  if (settings.clinicalRegistered === true) return false;
  if (isClinicalSyncModeChosen(settings)) return false;
  return true;
}

/** Falta perfil clínico mínimo antes de usar guardia / Mi rotación con datos. */
export function needsProfileOnboarding() {
  if (!isDbMode()) return false;
  if (!clinicalSessionContext.user?.user_id) return true;
  if (needsClinicalSyncModeChoice()) return true;
  const settings = readRpcSettings();
  if (isClinicalLocalOnlyMode(settings)) {
    if (settings.clinicalRegistered !== true) return true;
    const name = String(clinicalSessionContext.user?.clinical_name || '').trim();
    return !name;
  }
  if (needsClinicalLanProfileGate(settings)) return true;
  if (isLocalOnlyPlaceholderUsername(clinicalSessionContext.user?.username)) return true;
  if (needsUsernameClaim()) return true;
  const name = String(clinicalSessionContext.user?.clinical_name || '').trim();
  if (!name) return true;
  const sala = String(clinicalSessionContext.user?.sala || '').trim();
  if (!sala) return true;
  return false;
}

export function needsClinicalOnboarding() {
  return needsProfileOnboarding();
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

async function handleUsernameStepSubmit(ev) {
  ev.preventDefault();
  const username = normalizeUsername(
    String(document.getElementById('onboard-username')?.value || '')
  );
  const name = String(document.getElementById('onboard-clinical-name')?.value || '').trim();
  let rank = String(document.getElementById('onboard-rank')?.value || 'R1');
  const sala = String(document.getElementById('onboard-sala')?.value || '').trim();
  const errEl = document.getElementById('onboard-error');

  if (!isValidUsernameFormat(username)) {
    if (errEl) {
      errEl.textContent =
        'Usuario LAN inválido. Usa 3–32 letras minúsculas (a-z, 0-9, _), p. ej. drmendoza — no tu nombre en guardia.';
      errEl.hidden = false;
    }
    return;
  }
  if (!name) {
    if (errEl) {
      errEl.textContent = 'Escribe tu nombre en guardia.';
      errEl.hidden = false;
    }
    return;
  }

  let settings = readRpcSettings();
  let sessionUserId = String(clinicalSessionContext.user?.user_id || '');
  const api = dbApi();
  if (!sessionUserId || !api) {
    toast('Sesión clínica no disponible.', 'error');
    return;
  }

  const currentHandle = normalizeUsername(clinicalSessionContext.user?.username || '');
  const needsClaim = currentHandle !== username;

  if (needsClaim) {
    const { assertLanRoomForUsernameRegister } = await import('../clinical-profile-lan-sync.mjs');
    await assertLanRoomForUsernameRegister({ sala });
  }

  if (needsClaim && typeof api.dbClinicalUsernameClaim === 'function') {
    const claimRes = await api.dbClinicalUsernameClaim({ userId: sessionUserId, username });
    if (!claimRes?.ok) {
      const errMsg = String(claimRes?.error || '');
      if (/ya está en uso/i.test(errMsg)) {
        const cached = normalizeUsername(String(settings.clinicalUsername || ''));
        const autoResume = cached === username;
        const resume =
          autoResume ||
          window.confirm(
            `El usuario @${username} ya está registrado en esta base de datos.\n\n¿Recuperar tu cuenta en este dispositivo?`
          );
        if (resume) {
          const resumeRes = await resumeClinicalIdentityByUsername(
            username,
            settings,
            getClientId()
          );
          if (!resumeRes.ok) {
            if (errEl) {
              errEl.textContent = resumeRes.error || errMsg;
              errEl.hidden = false;
            }
            return;
          }
          sessionUserId = String(clinicalSessionContext.user?.user_id || '');
          settings = readRpcSettings();
        } else {
          if (errEl) {
            errEl.textContent = errMsg;
            errEl.hidden = false;
          }
          return;
        }
      } else {
        if (errEl) {
          errEl.textContent = errMsg || 'No se pudo registrar el usuario.';
          errEl.hidden = false;
        }
        return;
      }
    } else if (clinicalSessionContext.user) {
      clinicalSessionContext.user.username = username;
    }
  }

  if (typeof api.dbClinicalProfileUpsert === 'function') {
    const profileRes = await api.dbClinicalProfileUpsert({
      userId: sessionUserId,
      clinicalName: name,
      rank,
      sala: sala || null,
      isProgramAdmin: false,
    });
    if (!profileRes?.ok) {
      if (errEl) {
        errEl.textContent = profileRes?.error || 'No se guardó el perfil.';
        errEl.hidden = false;
      }
      return;
    }
    if (clinicalSessionContext.user) {
      clinicalSessionContext.user.rank = rank;
      clinicalSessionContext.user.clinical_name = name;
      clinicalSessionContext.user.sala = sala || null;
      clinicalSessionContext.user.is_program_admin = 0;
    }
  }

  persistClinicalUserBinding({
    userId: sessionUserId,
    username,
    displayName: name,
    rank,
    sala: sala || '',
    registered: true,
    lanProfileGateComplete: true,
    isProgramAdmin: false,
  });

  const shiftPin = String(document.getElementById('onboard-shift-pin')?.value || '').trim();
  if (shiftPin && !isClinicalLocalOnlyMode()) {
    const { connectLanWithShiftPin } = await import('../lan-shift-pin-connect.mjs');
    const connected = await connectLanWithShiftPin(shiftPin, { sala });
    if (!connected) {
      toast(
        'No se encontró anfitrión con ese PIN del turno. Revisa Wi‑Fi o pide un PIN nuevo al R4.',
        'warning'
      );
    }
  }

  if (errEl) errEl.hidden = true;
  await refreshClinicalUserProfile();
  document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));

  const {
    flushClinicalProfileToLan,
    LAN_PROFILE_PUSH_FAILED_MSG,
    LAN_PROFILE_NEEDS_CONNECT_MSG,
    isBenignLanPushSkipCode,
    isLanProfileNeedsConnectCode,
    notifyLanProfilePushResult,
  } = await import('../clinical-profile-lan-sync.mjs');
  const lanPush = await flushClinicalProfileToLan({
    sala: sala || clinicalSessionContext.user?.sala,
  });
  notifyLanProfilePushResult(lanPush, toast);

  const localOnly = isClinicalLocalOnlyMode();

  if (
    !localOnly &&
    !lanPush.ok &&
    isLanProfileNeedsConnectCode(lanPush.code)
  ) {
    toast(LAN_PROFILE_NEEDS_CONNECT_MSG, 'info');
    const rot = await import('./clinical-rotation-entry.mjs');
    rot.syncClinicalRotationEntryChrome();
    const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
    await refreshMainClinicalOnboardingIfNeeded();
    return;
  }

  if (
    !lanPush.ok &&
    !isBenignLanPushSkipCode(lanPush.code) &&
    !(lanPush.channels && lanPush.channels.outbox)
  ) {
    toast(LAN_PROFILE_PUSH_FAILED_MSG, 'warning');
  } else if (lanPush.ok && needsClaim) {
    toast('Perfil guardado y @usuario publicado en la sala ⇄.', 'success');
  } else {
    toast(
      'Perfil guardado. Abre Mi rotación cuando quieras buscar equipos o crear el tuyo.',
      'success'
    );
  }

  const { refreshMainClinicalOnboardingIfNeeded } = await import('./clinical-onboarding-main.mjs');
  await refreshMainClinicalOnboardingIfNeeded();
}

async function handleResumeIdentityClick() {
  const username = normalizeUsername(
    String(document.getElementById('onboard-username')?.value || '')
  );
  const errEl = document.getElementById('onboard-error');
  const resumeBtn = document.getElementById('clinical-onboard-resume-btn');
  if (!isValidUsernameFormat(username)) {
    if (errEl) {
      errEl.textContent = 'Escribe tu usuario LAN para recuperarlo.';
      errEl.hidden = false;
    }
    return;
  }
  if (resumeBtn instanceof HTMLButtonElement) {
    resumeBtn.disabled = true;
    resumeBtn.textContent = 'Recuperando…';
  }
  const settings = readRpcSettings();
  try {
    const resumeRes = await resumeClinicalIdentityByUsername(
      username,
      settings,
      getClientId()
    );
    if (!resumeRes.ok) {
      if (errEl) {
        errEl.textContent = resumeRes.error || 'No se pudo recuperar la cuenta.';
        errEl.hidden = false;
      }
      return;
    }
    if (errEl) errEl.hidden = true;
    toast('Cuenta recuperada.', 'success');
    await refreshClinicalUserProfile();
    if (!needsUsernameClaim()) {
      const { refreshMainClinicalOnboardingIfNeeded } = await import(
        './clinical-onboarding-main.mjs'
      );
      await refreshMainClinicalOnboardingIfNeeded();
      return;
    }
    toast('Completa tu perfil y pulsa Continuar.', 'info');
    const { refreshMainClinicalOnboardingIfNeeded } = await import(
      './clinical-onboarding-main.mjs'
    );
    await refreshMainClinicalOnboardingIfNeeded();
  } finally {
    if (resumeBtn instanceof HTMLButtonElement) {
      resumeBtn.disabled = false;
      resumeBtn.textContent = 'Recuperar mi usuario';
    }
  }
}

async function wireOnboardingInteractions() {
  wireSyncModeOnboardingInteractions();

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

}

export async function renderOnboardingPanel() {
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderOnboardingPanelInto(host);
  });
}

export async function renderOnboardingPanelInto(host) {
  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!userId) {
    if (needsClinicalSyncModeChoice()) {
      renderSyncModeChoicePanel(host);
      await wireOnboardingInteractions();
      return;
    }
    const { buildOnboardingSessionBlockHtml } = await import('./clinical-onboarding-main.mjs');
    host.innerHTML = await buildOnboardingSessionBlockHtml();
    return;
  }

  await fetchClinicalTeamsFromDb();

  let settings = ensureLanProfileGateDeviceReset(readRpcSettings());
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const cachedUsername = profileGatePending
    ? ''
    : normalizeUsername(String(settings.clinicalUsername || ''));
  if (
    !profileGatePending &&
    needsUsernameClaim() &&
    cachedUsername &&
    isValidUsernameFormat(cachedUsername)
  ) {
    try {
      await resumeClinicalIdentityByUsername(cachedUsername, settings, getClientId());
      await refreshClinicalUserProfile();
      settings = readRpcSettings();
    } catch (_e) {
      /* fall through to manual step 1 */
    }
  }

  if (!needsProfileOnboarding()) {
    const { hideMainClinicalOnboarding } = await import('./clinical-onboarding-main.mjs');
    hideMainClinicalOnboarding();
    if (host.closest('#clinical-teams-panel-body')) {
      const { renderClinicalTeamsPanel } = await import('./clinical-teams.mjs');
      await renderClinicalTeamsPanel();
    }
    return;
  }

  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    await wireOnboardingInteractions();
    return;
  }

  if (isClinicalLocalOnlyMode(settings)) {
    renderLocalOnlyProfilePanel(host, settings);
    await wireOnboardingInteractions();
    return;
  }

  {
    const rank =
      String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1');
    const prefilledName = profileGatePending
      ? ''
      : String(settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || '');
    const prefilledSala = String(
      settings.clinicalSala || clinicalSessionContext.user?.sala || ''
    );
    const prefilledShiftPin = bundledWardShiftPin();
    const gateLead = profileGatePending
      ? `<p class="clinical-onboard-gate-lead">${CLINICAL_LAN_PROFILE_GATE_LEAD_HTML}</p>`
      : '<p>Confirma tu usuario LAN, nombre en guardia, rango y rotación. Para equipos, abre <strong>Mi rotación</strong> después.</p>';
    host.innerHTML = buildOnboardingStageHtml({
      title: 'Configura tu rotación',
      leadHtml: gateLead,
      stepperIndex: 2,
      bodyHtml: `
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          <div class="field-group">
            <label for="onboard-username">Usuario LAN (@usuario) *</label>
            <input id="onboard-username" type="text" class="profile-input" placeholder="ej. drmendoza"
              value="${escapeAttr(cachedUsername)}" required autocomplete="off" spellcheck="false">
            <p class="clinical-teams-hint">${CLINICAL_LAN_USERNAME_HINT_HTML}</p>
          </div>
          <div class="field-group">
            <label for="onboard-clinical-name">Nombre en guardia *</label>
            <input id="onboard-clinical-name" type="text" class="profile-input" placeholder="ej. Dr. Mendoza"
              value="${escapeAttr(prefilledName)}" required autocomplete="name">
            <p class="clinical-teams-hint">${CLINICAL_LAN_DISPLAY_NAME_HINT_HTML}</p>
          </div>
          <div class="field-group">
            <label for="onboard-rank">Rango</label>
            <select id="onboard-rank" class="profile-input">
              <option value="R1" ${rank === 'R1' ? 'selected' : ''}>R1</option>
              <option value="R2" ${rank === 'R2' ? 'selected' : ''}>R2</option>
              <option value="R3" ${rank === 'R3' ? 'selected' : ''}>R3</option>
              <option value="R4" ${rank === 'R4' ? 'selected' : ''}>R4</option>
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-sala">Rotación *</label>
            <select id="onboard-sala" class="profile-input" required>
              <option value="">— Seleccionar —</option>
              ${CLINICAL_SALAS.map(
                (s) =>
                  `<option value="${escapeAttr(s)}" ${prefilledSala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-shift-pin">PIN del turno (⇄)</label>
            <input id="onboard-shift-pin" type="text" class="profile-input" inputmode="numeric"
              pattern="[0-9]{6}" maxlength="6" placeholder="6 dígitos del anfitrión" autocomplete="off"
              value="${escapeAttr(prefilledShiftPin)}">
            <p class="clinical-teams-hint">6 dígitos del anfitrión (⇄). R+ conecta solo; si cambias de Wi‑Fi, vuelve a usar el mismo PIN.</p>
          </div>
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Guardar perfil</button>
            <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
          </div>
        </form>
      </div>`,
    });
    await wireOnboardingInteractions();
  }
}
