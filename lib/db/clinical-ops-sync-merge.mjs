import { createRequire } from 'node:module';
import {
  archiveRotationAndTeams,
  applyDeletedUsersFromSnapshot,
  applyResolvedGuardiasFromSnapshot,
  applyMembershipRemovals,
  persistMembershipRemovals,
  persistMembershipRejoins,
  persistArchivedTeamsMeta,
  getDeletedUserIds,
  getArchivedTeamsMeta,
  getMembershipRemovals,
  getMembershipRejoins,
} from './clinical-access-db.mjs';
import { exportClinicalOpsSnapshot, stampRotationNuevaAt } from './clinical-ops-sync-export.mjs';
import {
  mergeMembershipRemovalsRows,
  mergeMembershipRejoinsRows,
  mergeTeamsArchivedRows,
} from './clinical-ops-sync-merge-utils.mjs';
import { mergeClinicalUsers, ensureStubUsersReferenced } from './clinical-ops-sync-merge-users.mjs';
import { mergeTeams, applyLanArchivedTeamsToDb } from './clinical-ops-sync-merge-teams.mjs';
import {
  filterIncomingTeamMembership,
  mergeTeamMembership,
  pruneStaleMembershipRemovals,
  reconcileMergedMembershipRemovals,
  remapIncomingTeamMembershipUserIds,
  reconcileExclusiveMembershipFromIncoming,
} from './clinical-ops-sync-merge-membership.mjs';
import { mergeEntregaTemplateUser, mergeEntregaTemplateTeam } from './clinical-ops-sync-merge-entrega.mjs';
import {
  mergePatientTeamAssignments,
  mergeTeamGuardiaToday,
  mergeActiveGuardias,
} from './clinical-ops-sync-merge-guardias.mjs';

const require = createRequire(import.meta.url);
const { mergeClinicalOpsFromSourcesData, mergeClinicalUsersData } = require('./clinical-ops-bundle-merge.cjs');

function createMergeStats(incoming) {
  return {
    incomingUsers: Array.isArray(incoming.clinical_users) ? incoming.clinical_users.length : 0,
    usersInserted: 0,
    usersUpdated: 0,
    usersUpgradedFromStub: 0,
    stubsCreated: 0,
    usersPurgedByTombstone: 0,
    usersResurrectedFromTombstone: 0,
    assignmentsInserted: 0,
    membershipInserted: 0,
    membershipExclusivePruned: 0,
    membershipRemovalsApplied: 0,
    membershipRejoinsApplied: 0,
    rotationNuevaApplied: 0,
    teamsSkipped: 0,
    teamsVisibleAfterMerge: 0,
  };
}

function applyRotationNuevaIfNeeded(db, incoming, local, stats) {
  const remoteNueva = incoming.rotationNuevaAt ? String(incoming.rotationNuevaAt) : '';
  const localNueva = local.rotationNuevaAt ? String(local.rotationNuevaAt) : '';
  let localTeamGuardia = local.team_guardia_today || [];
  if (remoteNueva && (!localNueva || remoteNueva > localNueva)) {
    archiveRotationAndTeams(db);
    stampRotationNuevaAt(db, remoteNueva);
    localTeamGuardia = [];
    if (stats) stats.rotationNuevaApplied = 1;
  }
  return localTeamGuardia;
}

function mergeClinicalUsersPhase(db, incoming, local, stats) {
  const tombstoneStats = applyDeletedUsersFromSnapshot(db, incoming, local);
  stats.usersPurgedByTombstone = tombstoneStats.purged;
  stats.usersResurrectedFromTombstone = tombstoneStats.resurrected;

  const deletedSet = new Set(getDeletedUserIds(db));
  const mergedUsers = mergeClinicalUsersData(local.clinical_users || [], incoming.clinical_users || []);
  const userMergeStats = mergeClinicalUsers(
    db,
    mergedUsers.filter((row) => !deletedSet.has(String(row?.user_id || '')))
  );
  stats.usersInserted = userMergeStats.inserted;
  stats.usersUpdated = userMergeStats.updated;
  stats.usersUpgradedFromStub = userMergeStats.upgradedFromStub;
  stats.stubsCreated = ensureStubUsersReferenced(db, incoming, deletedSet);
  return deletedSet;
}

function mergeMembershipTombstonesPhase(db, local, incoming, deletedSet) {
  // Remap host user_ids → local @username ids (same as team_membership).
  const incomingUsers = incoming.clinical_users || [];
  const incomingRejoins = remapIncomingTeamMembershipUserIds(
    db,
    incoming.team_membership_rejoins || [],
    incomingUsers
  );
  const incomingRemovals = remapIncomingTeamMembershipUserIds(
    db,
    incoming.team_membership_removals || [],
    incomingUsers
  );
  const mergedRejoins = mergeMembershipRejoinsRows(
    local.team_membership_rejoins || getMembershipRejoins(db),
    incomingRejoins
  );
  persistMembershipRejoins(db, mergedRejoins);
  let mergedRemovals = mergeMembershipRemovalsRows(
    local.team_membership_removals || getMembershipRemovals(db),
    incomingRemovals
  );
  mergedRemovals = reconcileMergedMembershipRemovals(local, mergedRemovals, mergedRejoins);
  mergedRemovals = pruneStaleMembershipRemovals(db, mergedRemovals, deletedSet);
  persistMembershipRemovals(db, mergedRemovals);
  return { mergedRemovals, mergedRejoins };
}

function mergeTeamsPhase(db, local, incoming, localTeams, stats) {
  const mergedTeamArchives = mergeTeamsArchivedRows(
    local.teams_archived || getArchivedTeamsMeta(db),
    incoming.teams_archived || []
  );
  persistArchivedTeamsMeta(db, mergedTeamArchives);
  stats.teamsSkipped = mergeTeams(db, localTeams, incoming.teams || []);
  applyLanArchivedTeamsToDb(db, mergedTeamArchives);
  const rows = db.prepare(`SELECT team_id, archived_at, rotation_active FROM teams`).all();
  // Approximate join/roster-picker visibility (unarchived + this rotation) so a
  // pasted Diagnóstico Nube report shows whether a team landed, not just that a
  // merge ran — narrower than the real picker (which also allows early self-join
  // on staged next-rotation teams), so treat this as a floor, not exact.
  stats.teamsVisibleAfterMerge = rows.filter(
    (row) => !row.archived_at && Number(row.rotation_active) === 1
  ).length;
  return new Set(
    rows
      .filter((row) => row.archived_at)
      .map((row) => String(row.team_id || '').trim())
      .filter(Boolean)
  );
}

function mergeAssignmentsAndGuardiasPhase(
  db,
  incoming,
  local,
  localTeamGuardia,
  mergedRemovals,
  removalKeys,
  archivedTeamIds,
  deletedSet,
  stats
) {
  mergeEntregaTemplateUser(db, local.entrega_template_user || [], incoming.entrega_template_user || []);
  mergeEntregaTemplateTeam(db, local.entrega_template_team || [], incoming.entrega_template_team || []);
  const incomingMembership = remapIncomingTeamMembershipUserIds(
    db,
    filterIncomingTeamMembership(
      incoming.team_membership || [],
      deletedSet,
      removalKeys,
      archivedTeamIds
    ),
    incoming.clinical_users || []
  );
  stats.membershipInserted = mergeTeamMembership(db, incomingMembership);
  stats.membershipExclusivePruned = reconcileExclusiveMembershipFromIncoming(
    db,
    incomingMembership
  );
  stats.membershipRemovalsApplied = mergedRemovals.length;
  applyMembershipRemovals(db, mergedRemovals);
  stats.assignmentsInserted = mergePatientTeamAssignments(db, incoming.patient_team_assignment || []);
  mergeTeamGuardiaToday(db, localTeamGuardia, incoming.team_guardia_today || []);
  applyResolvedGuardiasFromSnapshot(db, incoming, local);
  const refreshedLocalGuardias = db
    .prepare(`SELECT * FROM active_guardias WHERE status = 'Active' ORDER BY assigned_at`)
    .all();
  mergeActiveGuardias(db, refreshedLocalGuardias, incoming.active_guardias || []);
}

/**
 * Merge V2 clinical ops tables from a LAN / save-all snapshot.
 *
 * Strategy (see lan-sync.mjs header comment):
 * - team_guardia_today, teams metadata: last-write per row
 * - rotation.nueva: newer rotationNuevaAt triggers archive on peer
 * - patient_team_assignment, team_membership: union + leave tombstones
 *   (team_membership_removals apply even when the peer still has the row)
 * - active_guardias: last-write per patient by assigned_at
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 * @param {object} [localSnapshot]
 */
export function mergeClinicalOpsSnapshot(db, incoming, localSnapshot = null) {
  if (!incoming || typeof incoming !== 'object') return { merged: false };

  const stats = createMergeStats(incoming);
  const local =
    localSnapshot && typeof localSnapshot === 'object'
      ? localSnapshot
      : exportClinicalOpsSnapshot(db);

  const localTeamGuardia = applyRotationNuevaIfNeeded(db, incoming, local, stats);
  // archiveRotationAndTeams() just rewrote archived_at / rotation_active, but `local`
  // was captured before it ran — using the stale rows here makes mergeTeams pick the
  // pre-archive row as the merge winner and silently un-archive last month's rotation.
  const localTeams = stats.rotationNuevaApplied
    ? db.prepare(`SELECT * FROM teams ORDER BY name`).all()
    : local.teams || [];
  const deletedSet = mergeClinicalUsersPhase(db, incoming, local, stats);
  const { mergedRemovals } = mergeMembershipTombstonesPhase(db, local, incoming, deletedSet);
  const archivedTeamIds = mergeTeamsPhase(db, local, incoming, localTeams, stats);
  const removalKeys = new Set(
    mergedRemovals.map((row) => `${row.team_id}\0${row.user_id}`)
  );
  mergeAssignmentsAndGuardiasPhase(
    db,
    incoming,
    local,
    localTeamGuardia,
    mergedRemovals,
    removalKeys,
    archivedTeamIds,
    deletedSet,
    stats
  );

  return { merged: true, stats };
}

/**
 * Pick the newer of two LAN bundle clinicalOps payloads by exportedAt.
 * @param {object[]} sources
 */
export function pickNewerClinicalOpsSnapshot(sources) {
  return mergeClinicalOpsFromSourcesData(sources);
}
