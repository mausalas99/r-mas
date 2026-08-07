import {
  filterJoinedTeams,
  hasElevatedTeamPrivileges,
  isCloudSalaUpgradePending
} from "/mobile/js/chunks/chunk-4RWHEAJO.js";
import {
  clinicalSessionContext,
  isDbMode
} from "/mobile/js/chunks/chunk-TRTQ4CW2.js";
import {
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  isLocalOnlyPlaceholderUsername,
  needsClinicalLanProfileGate,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-CCQC427D.js";
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";

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
function syncSessionFromPersistedProfile(settings, user) {
  if (!user) return;
  const cachedUser = normalizeUsername(String(settings.clinicalUsername || ""));
  const current = normalizeUsername(user.username || "");
  const currentNeedsHandle = !current || !isValidUsernameFormat(current) || isLegacyMachineUsername(current, getClientId()) || isLocalOnlyPlaceholderUsername(current);
  if (cachedUser && isValidUsernameFormat(cachedUser) && currentNeedsHandle) {
    user.username = cachedUser;
  }
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
function markJoinedTeamProfileSettled(settings, user) {
  const username = normalizeUsername(user?.username || settings.clinicalUsername || "") || void 0;
  const displayName = String(user?.clinical_name || settings.clinicalDisplayName || "").trim() || void 0;
  const rank = String(user?.rank || settings.clinicalRank || "").trim() || void 0;
  const sala = String(user?.sala || settings.clinicalSala || "").trim() || void 0;
  persistClinicalUserBinding({
    userId: user?.user_id,
    username,
    displayName,
    rank,
    sala,
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
//# sourceMappingURL=/js/chunks/chunk-LZJH44EB.js.map
