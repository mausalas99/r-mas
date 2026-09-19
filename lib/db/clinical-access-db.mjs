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
  countTeamsInEffectiveSala,
  getSalaTeamCountWarning,
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

