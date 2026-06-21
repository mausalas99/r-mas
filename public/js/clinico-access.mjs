/**
 * Acceso a la guía clínica (Manejo): thin barrel — re-exports all public APIs.
 */

import { runEvaluateClinicalScope } from './clinico-access-scope/evaluate-clinical-scope.mjs';

export { normalizeServiceKey } from './clinico-access-shared.mjs';

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

export {
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
} from './clinico-access-cycle.mjs';

export {
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
} from './clinico-access-patient.mjs';

export {
  patientMatchesTeam,
  getJoinedTeams,
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
} from './clinico-access-teams.mjs';

export {
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
} from './clinico-access-guardia.mjs';

export { ENTREGA_PHASE_LS_KEY, readEntregaPhaseActive } from './clinico-access-entrega.mjs';

/** @param {object} user @param {object} patient @param {object|null} activeGuardia @param {object|null} context */
export function isPatientReadableInClinicalScope(user, patient, activeGuardia = null, context = null) {
  const scope = evaluateClinicalScope(user, patient, activeGuardia, context);
  return scope.readable === true;
}

/**
 * @param {{ user_id?: string, rank?: string, sala?: string }|null|undefined} currentUser
 * @param {{ id?: string, service?: string, sub_area?: string, interconsult_type?: string, sala?: string }|null|undefined} targetPatient
 * @param {{ covering_user_id?: string, source_team_id?: string }|null|undefined} activeGuardia
 * @param {{
 *   teams?: object[],
 *   guardias?: object[],
 *   cycle?: object|null,
 *   assignments?: object[],
 *   salaGuardiaToday?: object[],
 *   guardiaMode?: boolean,
 *   entregaPhaseActive?: boolean,
 *   now?: string|Date,
 * }|null|undefined} [context]
 */
export function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  return runEvaluateClinicalScope(currentUser, targetPatient, activeGuardia, context);
}
