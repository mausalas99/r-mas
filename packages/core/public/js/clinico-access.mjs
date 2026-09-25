/**
 * Acceso a la guía clínica (Manejo): renderer façade over lib/clinical-scope.
 * Pure domain APIs live in lib/clinical-scope; unlock/modal, LS entrega default,
 * and the team-filter kill-switch stay renderer-local.
 */

import {
  evaluateClinicalScope,
  readEntregaPhaseActive as readEntregaPhaseActivePure,
} from '../../lib/clinical-scope/index.mjs';

export {
  normalizeServiceKey,
  isSalaWardService,
  usesSalaR1LinePicker,
  getCycleLetterOptionsForRank,
  getCycleConfig,
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  letterIndexForTeam,
  isOnCallToday,
  activeCycleLetterForDate,
  isIncomingPreviewWindow,
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
  patientMatchesTeam,
  getJoinedTeams,
  getJoinedTeamsForUser,
  userHasJoinedClinicalTeams,
  patientHasExplicitTeamAssignment,
  resolvePatientTeamIdFromAssignments,
  patientAssignedToTeam,
  patientInJoinedTeamScope,
  patientCoveredByGuardia,
  isActiveGuardiaCoveringUser,
  teamForMemberCycle,
  isMemberOnCallToday,
  isTeamRankOnCallToday,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
  patientMatchesAnyJoinedTeam,
  r3ExtendedStructuralAccess,
  R4_GUARDIA_SECTOR_ORDER,
  resolveR4GuardiaSectorLabel,
  isR4MacroPatient,
  hasSalaGuardiaDeclaredForLetter,
  computeSalaAbcdefDeficitWrite,
  salaOnCallR1,
  userIsOnGuardiaCallToday,
  userIsOnCallForLanHost,
  salaOnCallR2,
  teamGuardiaOverride,
  canR2SalaAbcdefDeficitWrite,
  ENTREGA_PHASE_LS_KEY,
  evaluateClinicalScope,
} from '../../lib/clinical-scope/index.mjs';

export {
  CLINICO_UNLOCK_PHRASE,
  normalizeClinicoUnlockPhrase,
  matchesClinicoUnlockPhrase,
  isClinicoUnlocked,
  isClinicoAccessHidden,
  openClinicoUnlockModal,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  clinicoAccessWindowHandlers,
} from './clinico-access-unlock.mjs';

/** @param {Storage|undefined} storage */
export function readEntregaPhaseActive(storage = globalThis.localStorage) {
  return readEntregaPhaseActivePure(storage);
}

/**
 * TEMPORARY kill switch: when true, team-based patient scope is bypassed and every
 * patient is treated as readable, regardless of team assignment/rank rules below.
 * Flip back to `false` to restore normal team-based filtering.
 */
export const TEMP_DISABLE_TEAM_BASED_FILTERING = false;

/** @param {object} user @param {object} patient @param {object|null} activeGuardia @param {object|null} context */
export function isPatientReadableInClinicalScope(user, patient, activeGuardia = null, context = null) {
  if (TEMP_DISABLE_TEAM_BASED_FILTERING) return true;
  const scope = evaluateClinicalScope(user, patient, activeGuardia, context);
  return scope.readable === true;
}
