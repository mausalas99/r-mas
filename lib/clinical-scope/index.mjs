export { normalizeServiceKey, toMillis } from './shared.mjs';

export {
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
} from './patient-sala.mjs';

export {
  patientMatchesTeam,
  getJoinedTeamsForUser,
  getJoinedTeams,
  userHasJoinedClinicalTeams,
  patientHasExplicitTeamAssignment,
  resolvePatientTeamIdFromAssignments,
  patientAssignedToTeam,
  patientInJoinedTeamScope,
  teamForMemberCycle,
  patientMatchesAnyJoinedTeam,
  r3ExtendedStructuralAccess,
} from './team-membership.mjs';

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
  isMemberOnCallToday,
  isTeamRankOnCallToday,
  inferMembershipCycleForJoin,
  resolveMembershipCycleForUser,
  formatMemberCycleLabel,
} from './cycle-letters.mjs';

export {
  patientCoveredByGuardia,
  isActiveGuardiaCoveringUser,
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
} from './guardia-coverage.mjs';

export {
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
} from './interconsultas.mjs';

export {
  ENTREGA_PHASE_LS_KEY,
  readEntregaPhaseActive,
} from './entrega-phase.mjs';

export {
  evaluateClinicalScope,
  runEvaluateClinicalScope,
} from './evaluate/index.mjs';
