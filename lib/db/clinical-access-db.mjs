export {
  ensureClinicalUser,
  findClinicalUserByUsername,
  resolveBootstrapClinicalUser,
  attachClinicalIdentityByUsername,
  listClinicalUsers,
  touchClinicalUserActivity,
  appendClinicalUserActivityLog,
  listClinicalUserActivityHistoryByIds,
  getClinicalProfile,
  claimUsername,
  upsertClinicalProfile,
  findUserByPublicKey,
  resolveClinicalUserByUsername,
  provisionClinicalUserFromCloudIdentity,
  setClinicalUserProfileFromAdmin,
} from './clinical-access-users.mjs';

export {
  listDirectoryUsers,
  getMembershipRemovals,
  persistMembershipRemovals,
  recordMembershipRemoval,
  getMembershipRejoins,
  persistMembershipRejoins,
  recordMembershipRejoin,
  clearMembershipRejoin,
  clearMembershipRemoval,
  applyMembershipRemovals,
  getArchivedTeamsMeta,
  persistArchivedTeamsMeta,
  recordTeamArchive,
  getResolvedGuardiasMeta,
  rememberResolvedGuardia,
  applyResolvedGuardiasFromSnapshot,
  getDeletedUserIds,
  purgeClinicalUserFromDb,
  purgeMembershipMetaForUser,
  applyDeletedUsersFromSnapshot,
  deleteDirectoryUser,
} from './clinical-access-directory.mjs';

export {
  upsertRotationCycle,
  getActiveRotationCycle,
  archiveRotationAndTeams,
} from './clinical-access-rotation.mjs';

export {
  ensureClinicalPatientRow,
  fetchPatientTeamAssignments,
  fetchActivePatientTeamId,
  assignPatientToTeam,
  fetchIncomingAssignments,
  loadCensusPatientIdSet,
  buildActivePatientCountByTeam,
  buildLanAssignmentCountByTeam,
} from './clinical-access-assignments.mjs';

export {
  upsertActiveGuardia,
  fetchActiveGuardias,
  fetchOrphanActiveGuardias,
  resolveActiveGuardia,
  touchActiveGuardiaVitalsCheck,
  completeActiveGuardiaPendiente,
} from './clinical-access-guardia.mjs';

export {
  createTeam,
  listActiveTeams,
  listRotationVisibleTeams,
  listTeamsForRenderer,
  hasCurrentRotationTeams,
  resolveRotationActiveForNewTeam,
  listArchivedTeams,
  clearTeamGuardiaToday,
  effectiveTeamSala,
  withEffectiveTeamSala,
  SOFT_MAX_TEAMS_PER_SALA,
  SOFT_MAX_R1_PER_TEAM,
  countTeamsInEffectiveSala,
  getSalaTeamCountWarning,
  userHasR1MembershipInEffectiveSala,
  promoteTeamLeader,
  getTeamById,
  assertCanManageTeamRoster,
  updateTeam,
  archiveTeam,
  findUserTeamForAutoAssign,
  listTeamMembers,
} from './clinical-access-teams-core.mjs';

export {
  joinTeam,
  migrateTeamMemberships,
  validateSalaTeamMembership,
  getSalaTeamMembershipWarnings,
  addTeamMember,
  memberHasActiveGuardiaForTeam,
  removeTeamMember,
  setTeamGuardiaToday,
  getTeamGuardiaToday,
} from './clinical-access-teams-membership.mjs';

export {
  resolveTeamByInviteCode,
  listTeamsBySala,
  getInternoScopeContext,
  getClinicalScopeContext,
} from './clinical-access-teams-query.mjs';

export {
  normalizeInternoSala,
  listSalaInternoAccess,
  getSalaInternoAccess,
  rotateSalaInternoToken,
  setSalaInternoActive,
  verifySalaInternoToken,
} from './clinical-access-interno.mjs';

export {
  listEntregaTemplates,
  saveEntregaTemplateUser,
  saveEntregaTemplateTeam,
  deleteEntregaTemplate,
} from './clinical-access-entrega.mjs';

