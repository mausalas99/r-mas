import {
  filterJoinedTeams,
  hasElevatedTeamPrivileges,
  isCloudSalaUpgradePending
} from "/mobile/js/chunks/chunk-QQOJTZU6.js";
import {
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  isLocalOnlyPlaceholderUsername,
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername
} from "/mobile/js/chunks/chunk-LQTSNMET.js";
import {
  clinicalSessionContext,
  isDbMode
} from "/mobile/js/chunks/chunk-GRJDNRYE.js";

// public/js/features/clinical-onboarding-gates.mjs
function getClientId() {
  return resolveClinicalClientId(readRpcSettings());
}
function hasJoinedClinicalTeam(user = clinicalSessionContext.user, teams = clinicalSessionContext.teams) {
  if (!user?.user_id && !normalizeUsername(user?.username || "")) return false;
  return filterJoinedTeams(teams || [], user).length > 0;
}
function needsUsernameClaim() {
  if (hasJoinedClinicalTeam()) return false;
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return true;
  if (isLegacyMachineUsername(user.username, getClientId())) return true;
  try {
    const settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    const cached = String(settings.clinicalUsername || "").trim();
    if (cached && !isValidUsernameFormat(normalizeUsername(cached))) return true;
    if (cached && isLegacyMachineUsername(user.username, getClientId())) return true;
  } catch (_e) {
    void _e;
  }
  const handle = normalizeUsername(user.username || "");
  return !isValidUsernameFormat(handle);
}
function needsTeamOnboarding() {
  if (!clinicalSessionContext.user?.user_id) return true;
  if (hasElevatedTeamPrivileges(clinicalSessionContext.user)) return false;
  return !hasJoinedClinicalTeam();
}
function needsClinicalSyncModeChoice() {
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  if (settings.clinicalRegistered === true) return false;
  if (hasJoinedClinicalTeam()) return false;
  if (isClinicalSyncModeChosen(settings)) return false;
  return true;
}
function sessionHandleNeedsReplace(current, clientId) {
  if (!current) return true;
  if (!isValidUsernameFormat(current)) return true;
  if (isLegacyMachineUsername(current, clientId)) return true;
  return isLocalOnlyPlaceholderUsername(current);
}
function syncUsernameFromSettings(settings, user, clientId) {
  const cachedUser = normalizeUsername(String(settings.clinicalUsername || ""));
  const current = normalizeUsername(user.username || "");
  if (!cachedUser || !isValidUsernameFormat(cachedUser)) return;
  if (!sessionHandleNeedsReplace(current, clientId)) return;
  user.username = cachedUser;
}
function syncSessionFieldsFromSettings(settings, user) {
  if (!String(user.clinical_name || "").trim() && settings.clinicalDisplayName) {
    user.clinical_name = String(settings.clinicalDisplayName);
  }
  if (!String(user.sala || "").trim() && settings.clinicalSala) {
    user.sala = String(settings.clinicalSala);
  }
  if (settings.clinicalRank && !String(user.rank || "").trim()) {
    user.rank = String(settings.clinicalRank);
  }
}
function syncSessionFromPersistedProfile(settings, user) {
  if (!user) return;
  syncUsernameFromSettings(settings, user, getClientId());
  syncSessionFieldsFromSettings(settings, user);
}
function hasValidPersistedUsername(settings) {
  const cachedUser = normalizeUsername(String(settings.clinicalUsername || ""));
  return isValidUsernameFormat(cachedUser) && !isLegacyMachineUsername(cachedUser, getClientId()) && !isLocalOnlyPlaceholderUsername(cachedUser);
}
function hasPersistedClinicalProfile(settings = readRpcSettings(), user = clinicalSessionContext.user) {
  if (settings.clinicalRegistered !== true) return false;
  if (isClinicalLocalOnlyMode(settings)) return true;
  if (needsClinicalLanProfileGate(settings)) return false;
  if (!hasValidPersistedUsername(settings)) return false;
  const hasName = String(settings.clinicalDisplayName || user?.clinical_name || "").trim();
  const hasSala = String(settings.clinicalSala || user?.sala || "").trim();
  return !!hasName && !!hasSala;
}
function needsLocalOnlyProfile(settings) {
  if (!isClinicalLocalOnlyMode(settings)) return false;
  return settings.clinicalRegistered !== true;
}
function needsLanProfile(settings, user) {
  if (hasPersistedClinicalProfile(settings, user)) return false;
  if (needsClinicalLanProfileGate(settings)) return true;
  if (isLocalOnlyPlaceholderUsername(user?.username)) return true;
  if (needsUsernameClaim()) return true;
  if (!String(user?.clinical_name || settings.clinicalDisplayName || "").trim()) return true;
  if (!String(user?.sala || settings.clinicalSala || "").trim()) return true;
  return false;
}
function needsCloudRegistration(settings, _user) {
  return isCloudSalaUpgradePending(settings);
}
function pickSettledUsername(settings, user) {
  return normalizeUsername(user?.username || settings.clinicalUsername || "") || void 0;
}
function pickSettledDisplayName(settings, user) {
  return String(user?.clinical_name || settings.clinicalDisplayName || "").trim() || void 0;
}
function pickSettledRank(settings, user) {
  return String(user?.rank || settings.clinicalRank || "").trim() || void 0;
}
function pickSettledSala(settings, user) {
  return String(user?.sala || settings.clinicalSala || "").trim() || void 0;
}
function markJoinedTeamProfileSettled(settings, user) {
  persistClinicalUserBinding({
    userId: user?.user_id,
    username: pickSettledUsername(settings, user),
    displayName: pickSettledDisplayName(settings, user),
    rank: pickSettledRank(settings, user),
    sala: pickSettledSala(settings, user),
    registered: true,
    lanProfileGateComplete: true
  });
}
function needsProfileOnboarding() {
  if (!isDbMode()) return false;
  if (!clinicalSessionContext.user?.user_id) return true;
  if (hasJoinedClinicalTeam()) {
    const settings2 = readRpcSettings();
    syncSessionFromPersistedProfile(settings2, clinicalSessionContext.user);
    markJoinedTeamProfileSettled(settings2, clinicalSessionContext.user);
    if (needsCloudRegistration(settings2, clinicalSessionContext.user)) return true;
    return false;
  }
  if (needsClinicalSyncModeChoice()) return true;
  const settings = readRpcSettings();
  const user = clinicalSessionContext.user;
  if (hasPersistedClinicalProfile(settings, user)) {
    syncSessionFromPersistedProfile(settings, user);
    if (needsCloudRegistration(settings, user)) return true;
    return false;
  }
  if (needsLocalOnlyProfile(settings)) return true;
  return needsLanProfile(settings, user);
}
function needsClinicalOnboarding() {
  return needsProfileOnboarding();
}
function needsTeamOnboardingStep() {
  if (!isDbMode()) return false;
  if (hasJoinedClinicalTeam()) return false;
  if (needsProfileOnboarding()) return false;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;
  return needsTeamOnboarding();
}
function needsOnboardingShell() {
  if (hasJoinedClinicalTeam()) return false;
  return needsProfileOnboarding() || needsTeamOnboardingStep();
}

export {
  getClientId,
  hasJoinedClinicalTeam,
  needsUsernameClaim,
  needsTeamOnboarding,
  needsClinicalSyncModeChoice,
  hasPersistedClinicalProfile,
  needsLocalOnlyProfile,
  needsProfileOnboarding,
  needsClinicalOnboarding,
  needsTeamOnboardingStep,
  needsOnboardingShell
};
//# sourceMappingURL=/js/chunks/chunk-GNLW4YFR.js.map
