import {
  isPatientVisibleOnMobileTeamMirror,
  patientForScopeEvaluate,
  shouldFilterPatientsByJoinedTeam,
  shouldUseElevatedPatientCensus
} from "/mobile/js/chunks/chunk-FHDPZLZP.js";
import {
  isPatientReadableInClinicalScope
} from "/mobile/js/chunks/chunk-GPBMQXYE.js";

// public/js/patient-team-scope.mjs
function isPatientInLanTeamSyncScope(user, patient, activeGuardia = null, context = null) {
  if (!user?.user_id || !patient?.id) return false;
  if (shouldFilterPatientsByJoinedTeam(user)) {
    return isPatientVisibleOnMobileTeamMirror(user, patient, context, activeGuardia);
  }
  if (shouldUseElevatedPatientCensus(user)) return true;
  return isPatientReadableInClinicalScope(user, patient, activeGuardia, context);
}
function filterPatientEntriesForLanTeamScope(entries, user, context, guardiasMap) {
  if (!user?.user_id) return [];
  return (entries || []).filter((entry) => {
    const patient = entry?.patient;
    if (!patient?.id) return false;
    const mapped = patientForScopeEvaluate(patient);
    const activeGuardia = guardiasMap && typeof guardiasMap.get === "function" ? guardiasMap.get(String(patient.id)) || null : null;
    return isPatientInLanTeamSyncScope(user, mapped, activeGuardia, context);
  });
}

export {
  filterPatientEntriesForLanTeamScope
};
//# sourceMappingURL=/js/chunks/chunk-MRCCGBKF.js.map
