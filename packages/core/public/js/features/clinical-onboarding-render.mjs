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
import { renderSyncModeChoicePanel } from './clinical-onboarding-sync-mode.mjs';
import { drawLocalOnlyConfirm } from './clinical-onboarding-view.jsx';
import { drawLanProfileStage } from './clinical-onboarding-forms-view.jsx';
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
import { getCloudSyncToken, getCloudSyncUrl } from './cloud-sync/settings.mjs';
import { wireOnboardingInteractions } from './clinical-onboarding-handlers.mjs';
import {
  shouldShowNubePasswordField,
  syncOnboardingNubeVisibility,
} from './clinical-onboarding-nube.mjs';
import { isCloudSalaUpgradePending } from './cloud-sync/cloud-sala-upgrade.mjs';

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
    await renderTeamOnboardingInto(host);
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

function renderLanProfileForm(host, settings) {
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const salaUpgrade = isCloudSalaUpgradePending(settings);
  const prefilledSala = String(settings.clinicalSala || clinicalSessionContext.user?.sala || '');
  drawLanProfileStage(host, {
    title: profileGatePending ? 'Confirma tu perfil' : salaUpgrade ? 'Conectar Nube' : 'Configura tu rotación',
    leadKind: profileGatePending ? 'gate' : salaUpgrade ? 'upgrade' : 'default',
    username: resolveOnboardUsernamePrefill(settings),
    name: String(settings.clinicalDisplayName || clinicalSessionContext.user?.clinical_name || ''),
    rank: String(settings.clinicalRank || clinicalSessionContext.user?.rank || 'R1'),
    sala: prefilledSala,
    nubeShow: shouldShowNubePasswordField(prefilledSala),
    upgrade: isCloudSalaUpgradePending(),
    cloudUrl: getCloudSyncUrl(),
  });
  syncOnboardingNubeVisibility(host);
}

async function renderNoSessionOnboarding(host) {
  if (needsClinicalSyncModeChoice()) {
    await renderSyncModeChoicePanel(host);
    await wireOnboardingInteractions();
    return;
  }
  const { drawOnboardingSessionBlock } = await import('./clinical-onboarding-main.mjs');
  await drawOnboardingSessionBlock(host);
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
    await renderSyncModeChoicePanel(host);
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
    drawLocalOnlyConfirm(host);
    await wireOnboardingInteractions();
    return;
  }

  renderLanProfileForm(host, settings);
  await wireOnboardingInteractions();
}
