/**
 * Clinical onboarding panel render helpers.
 */
import {
  clinicalSessionContext,
  fetchClinicalTeamsFromDb,
  lookupClinicalUserByUsername,
  refreshClinicalUserProfile,
  resumeClinicalIdentityByUsername,
} from '../clinical-access-runtime.mjs';
import {
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  CLINICAL_LAN_PROFILE_GATE_LEAD_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  ensureLanProfileGateDeviceReset,
  isClinicalLocalOnlyMode,
  needsClinicalLanProfileGate,
  readRpcSettings,
} from '../clinical-settings.mjs';
import {
  isValidUsernameFormat,
  isLegacyMachineUsername,
  normalizeUsername,
} from '../clinical-username.mjs';
import { CLINICAL_SALAS } from './clinical-teams/shared.mjs';
import { renderSyncModeChoicePanel } from './clinical-onboarding-sync-mode.mjs';
import { isLanSkipShiftPin } from '../shift-pin-stub.mjs';
import { buildOnboardingStageHtml } from './clinical-onboarding-shell.mjs';
import {
  getClientId,
  needsClinicalSyncModeChoice,
  needsLocalOnlyProfile,
  needsProfileOnboarding,
  needsTeamOnboardingStep,
  needsUsernameClaim,
} from './clinical-onboarding-gates.mjs';
import {
  needsExistingAccountLogin,
  renderExistingAccountLoginPanel,
  tryResumeOnboardingFromStoredCloudToken,
  wireExistingAccountLoginInteractions,
} from './clinical-onboarding-existing-login.mjs';
import { getCloudSyncToken } from './cloud-sync/settings.mjs';
import { wireOnboardingInteractions } from './clinical-onboarding-handlers.mjs';
import {
  buildCutoverPickerHtml,
  buildNubePasswordFieldHtml,
  syncOnboardingNubeVisibility,
} from './clinical-onboarding-nube.mjs';
import { isCutoverDone, isCutoverPending } from './cloud-sync/cutover-flags.mjs';
import { shouldShowCutoverWizard } from './cloud-sync/cutover-gate.mjs';
import { isCloudSalaUpgradePending } from './cloud-sync/cloud-sala-upgrade.mjs';

import { escapeHtml, escapeAttr } from '../dom-escape.mjs';
async function tryAutoResumeCachedUsername(settings) {
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const cachedUsername = profileGatePending
    ? ''
    : normalizeUsername(String(settings.clinicalUsername || ''));
  if (
    profileGatePending ||
    !needsUsernameClaim() ||
    !cachedUsername ||
    !isValidUsernameFormat(cachedUsername)
  ) {
    return settings;
  }
  try {
    const existing = await lookupClinicalUserByUsername(cachedUsername);
    if (existing?.user_id) {
      await resumeClinicalIdentityByUsername(cachedUsername, settings, getClientId());
      await refreshClinicalUserProfile();
      return readRpcSettings();
    }
  } catch {
    /* fall through to manual step 1 */
  }
  return settings;
}

async function renderCompletedOnboarding(host) {
  if (needsTeamOnboardingStep()) {
    const { renderTeamOnboardingInto, wireTeamOnboardingInteractions } = await import(
      './clinical-onboarding-team.mjs'
    );
    renderTeamOnboardingInto(host);
    wireTeamOnboardingInteractions(host);
    return;
  }
  const { hideMainClinicalOnboarding } = await import('./clinical-onboarding-main.mjs');
  hideMainClinicalOnboarding();
  if (host.closest('#clinical-teams-panel-body')) {
    const { renderClinicalTeamsPanel } = await import('./clinical-teams.mjs');
    await renderClinicalTeamsPanel();
  }
}

function buildRankOptionsHtml(rank) {
  return ['R1', 'R2', 'R3', 'R4']
    .map((r) => `<option value="${r}" ${rank === r ? 'selected' : ''}>${r}</option>`)
    .join('');
}

function buildSalaOptionsHtml(prefilledSala) {
  return CLINICAL_SALAS.map(
    (s) =>
      `<option value="${escapeAttr(s)}" ${prefilledSala === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
  ).join('');
}

function resolveOnboardUsernamePrefill(settings) {
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const sessionUsername = normalizeUsername(clinicalSessionContext.user?.username || '');
  if (!profileGatePending) {
    return normalizeUsername(String(settings.clinicalUsername || ''));
  }
  if (
    isValidUsernameFormat(sessionUsername) &&
    !isLegacyMachineUsername(sessionUsername, getClientId())
  ) {
    return sessionUsername;
  }
  return '';
}

function buildLanProfileFormBody(settings) {
  const cachedUsername = resolveOnboardUsernamePrefill(settings);
  const rank = String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1');
  const prefilledName = String(
    settings.clinicalDisplayName ||
      clinicalSessionContext.user?.clinical_name ||
      ''
  );
  const prefilledSala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || '');
  const prefilledShiftPin = '';
  const shiftPinFieldHtml = isLanSkipShiftPin()
    ? ''
    : `
          <div class="field-group">
            <label for="onboard-shift-pin">PIN del turno (⇄)</label>
            <input id="onboard-shift-pin" type="text" class="profile-input" inputmode="numeric"
              pattern="[0-9]{6}" maxlength="6" placeholder="6 dígitos del anfitrión" autocomplete="off"
              value="${escapeAttr(prefilledShiftPin)}">
            <p class="clinical-teams-hint">6 dígitos del anfitrión (⇄). R+ conecta solo; si cambias de Wi‑Fi, vuelve a usar el mismo PIN.</p>
          </div>`;

  return `
      <div class="clinical-onboard-form-shell">
        <form id="clinical-onboard-username-form" class="clinical-teams-create-form clinical-onboard-form" novalidate>
          ${buildCutoverPickerHtml()}
          <div class="field-group">
            <label for="onboard-username">Usuario (@usuario) *</label>
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
              ${buildRankOptionsHtml(rank)}
            </select>
          </div>
          <div class="field-group">
            <label for="onboard-sala">Rotación *</label>
            <select id="onboard-sala" class="profile-input" required>
              <option value="">— Seleccionar —</option>
              ${buildSalaOptionsHtml(prefilledSala)}
            </select>
          </div>
          ${buildNubePasswordFieldHtml(prefilledSala)}
          ${shiftPinFieldHtml}
          <p id="onboard-error" class="clinical-registration-error" hidden></p>
          <div class="modal-actions clinical-onboard-form-actions">
            <button type="submit" class="btn-save">Guardar perfil</button>
            <button type="button" id="clinical-onboard-switch-existing-btn" class="btn-med-secondary">Ya tengo cuenta Nube</button>
            <button type="button" id="clinical-onboard-resume-btn" class="btn-med-secondary">Recuperar mi usuario</button>
            <button type="button" id="clinical-onboard-mode-back-btn" class="btn-med-secondary">Cambiar modo</button>
          </div>
        </form>
      </div>`;
}

function renderLocalOnlyConfirmPanel(host) {
  host.innerHTML = buildOnboardingStageHtml({
    title: 'Solo este equipo',
    leadHtml:
      '<p>Los expedientes y notas quedan solo en esta Mac. Sin Nube, rotaciones ni sala compartida.</p>',
    stepperIndex: 2,
    bodyHtml: `
      <p id="onboard-local-only-error" class="clinical-registration-error" hidden></p>
      <div class="modal-actions clinical-onboard-form-actions">
        <button type="button" class="btn-save" id="clinical-onboard-local-confirm-btn">Entrar a R+</button>
        <button type="button" id="clinical-onboard-mode-back-btn" class="btn-med-secondary">Cambiar modo</button>
      </div>`,
  });
}

function renderLanProfileForm(host, settings) {
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const cutover = shouldShowCutoverWizard({
    cutoverDone: isCutoverDone(),
    cutoverPending: isCutoverPending(),
  });
  const salaUpgrade = isCloudSalaUpgradePending(settings);
  let gateLead;
  if (profileGatePending || cutover) {
    gateLead = `<p class="clinical-onboard-gate-lead">${CLINICAL_LAN_PROFILE_GATE_LEAD_HTML}</p>`;
  } else if (salaUpgrade) {
    gateLead =
      '<p class="clinical-onboard-gate-lead">Pasaste a <strong>Sala</strong> o <strong>Torre HU</strong>. ' +
      'Completa el perfil y registra tu <strong>contraseña de Nube</strong> para sincronizar el turno.</p>';
  } else {
    gateLead =
      '<p>Confirma tu @usuario de R+ Cloud, nombre en guardia, rango y rotación. ' +
      'Para equipos, abre <strong>Mi rotación</strong> después.</p>';
  }
  const title =
    profileGatePending || cutover
      ? 'Confirma tu perfil'
      : salaUpgrade
        ? 'Conectar Nube'
        : 'Configura tu rotación';

  host.innerHTML = buildOnboardingStageHtml({
    title,
    leadHtml: gateLead,
    stepperIndex: 2,
    bodyHtml: buildLanProfileFormBody(settings),
  });
  syncOnboardingNubeVisibility(host);
}

async function renderNoSessionOnboarding(host) {
  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    await wireOnboardingInteractions();
    return;
  }
  const { buildOnboardingSessionBlockHtml } = await import('./clinical-onboarding-main.mjs');
  host.innerHTML = await buildOnboardingSessionBlockHtml();
}

/**
 * @param {HTMLElement} host
 */
export async function renderOnboardingPanelInto(host) {
  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!userId) {
    await renderNoSessionOnboarding(host);
    return;
  }

  await fetchClinicalTeamsFromDb();
  let settings = ensureLanProfileGateDeviceReset(readRpcSettings());
  settings = await tryAutoResumeCachedUsername(settings);

  if (!needsProfileOnboarding()) {
    await renderCompletedOnboarding(host);
    return;
  }

  if (needsClinicalSyncModeChoice()) {
    renderSyncModeChoicePanel(host);
    await wireOnboardingInteractions();
    return;
  }

  if (needsExistingAccountLogin(settings)) {
    const resumed = await tryResumeOnboardingFromStoredCloudToken();
    if (resumed) return;
    renderExistingAccountLoginPanel(host, settings);
    wireExistingAccountLoginInteractions();
    return;
  }

  if (getCloudSyncToken()) {
    const resumed = await tryResumeOnboardingFromStoredCloudToken();
    if (resumed) return;
  }

  if (isClinicalLocalOnlyMode(settings)) {
    if (!needsLocalOnlyProfile(settings)) {
      await renderCompletedOnboarding(host);
      return;
    }
    renderLocalOnlyConfirmPanel(host);
    await wireOnboardingInteractions();
    return;
  }

  renderLanProfileForm(host, settings);
  await wireOnboardingInteractions();
}
