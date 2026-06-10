'use strict';

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    if (row && row[key] != null) map.set(String(row[key]), row);
  }
  return map;
}

function pickLastWriteRow(localRow, incomingRow, tsField) {
  if (!localRow) return incomingRow || null;
  if (!incomingRow) return localRow;
  const a = String(localRow[tsField] || '');
  const b = String(incomingRow[tsField] || '');
  return b >= a ? incomingRow : localRow;
}

function teamRowVersion(row) {
  if (!row) return '';
  const stamps = [row.archived_at, row.updated_at, row.created_at]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return stamps.sort().pop() || '';
}

function pickTeamMergeWinner(localRow, incomingRow) {
  if (!localRow) return incomingRow || null;
  if (!incomingRow) return localRow;
  const a = teamRowVersion(localRow);
  const b = teamRowVersion(incomingRow);
  return b >= a ? incomingRow : localRow;
}

function mergeTeamsArchivedData(localRows, incomingRows) {
  const map = new Map();
  for (const row of [...(localRows || []), ...(incomingRows || [])]) {
    const teamId = String(row?.team_id || '').trim();
    const archivedAt = String(row?.archived_at || '').trim();
    if (!teamId || !archivedAt) continue;
    const prev = map.get(teamId);
    if (!prev || archivedAt >= String(prev.archived_at || '')) {
      map.set(teamId, { team_id: teamId, archived_at: archivedAt });
    }
  }
  return [...map.values()];
}

function applyArchivedTeamTombstonesToTeams(teams, tombstones) {
  const byId = indexBy(tombstones, 'team_id');
  return (teams || []).map((team) => {
    const teamId = String(team?.team_id || '').trim();
    const tomb = byId.get(teamId);
    if (!tomb) return team;
    const tombAt = String(tomb.archived_at || '');
    const rowAt = String(team.archived_at || '');
    if (!rowAt || tombAt >= rowAt) {
      return { ...team, archived_at: tombAt, rotation_active: 0 };
    }
    return team;
  });
}

function mergeTeamsData(localRows, incomingRows) {
  const localById = indexBy(localRows, 'team_id');
  const incomingById = indexBy(incomingRows, 'team_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);
  const out = [];
  for (const teamId of allIds) {
    const winner = pickTeamMergeWinner(localById.get(teamId), incomingById.get(teamId));
    if (winner) out.push({ ...winner });
  }
  return out;
}

function archivedTeamIdSet(teams, tombstones) {
  const ids = new Set();
  for (const row of teams || []) {
    if (row?.archived_at) ids.add(String(row.team_id || '').trim());
  }
  for (const row of tombstones || []) {
    const teamId = String(row?.team_id || '').trim();
    if (teamId) ids.add(teamId);
  }
  return ids;
}

function filterMembershipForArchivedTeams(rows, archivedTeamIds) {
  if (!archivedTeamIds?.size) return rows || [];
  return (rows || []).filter((row) => {
    const teamId = String(row?.team_id || '').trim();
    return teamId && !archivedTeamIds.has(teamId);
  });
}

function membershipPairKey(row) {
  const teamId = String(row?.team_id || '').trim();
  const userId = String(row?.user_id || '').trim();
  if (!teamId || !userId) return '';
  return `${teamId}\0${userId}`;
}

function buildMembershipPairKeySet(rows) {
  const keys = new Set();
  for (const row of rows || []) {
    const key = membershipPairKey(row);
    if (key) keys.add(key);
  }
  return keys;
}

function mergeMembershipRemovalsData(localRows, incomingRows) {
  const map = new Map();
  for (const row of [...(localRows || []), ...(incomingRows || [])]) {
    if (!row?.team_id || !row?.user_id) continue;
    const teamId = String(row.team_id);
    const userId = String(row.user_id);
    const removedAt = String(row.removed_at || '').trim() || new Date(0).toISOString();
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || removedAt >= String(prev.removed_at || '')) {
      map.set(key, { team_id: teamId, user_id: userId, removed_at: removedAt });
    }
  }
  return [...map.values()];
}

function mergeMembershipRejoinsData(localRows, incomingRows) {
  const map = new Map();
  for (const row of [...(localRows || []), ...(incomingRows || [])]) {
    if (!row?.team_id || !row?.user_id) continue;
    const teamId = String(row.team_id);
    const userId = String(row.user_id);
    const joinedAt = String(row.joined_at || '').trim() || new Date(0).toISOString();
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || joinedAt >= String(prev.joined_at || '')) {
      map.set(key, { team_id: teamId, user_id: userId, joined_at: joinedAt });
    }
  }
  return [...map.values()];
}

function reconcileMembershipRemovalsData(local, removals, rejoins) {
  const localMembershipKeys = buildMembershipPairKeySet(local?.team_membership);
  const localRemovalKeys = buildMembershipPairKeySet(local?.team_membership_removals);
  const rejoinByKey = new Map();
  for (const row of rejoins || []) {
    const key = membershipPairKey(row);
    if (!key) continue;
    const joinedAt = String(row.joined_at || '');
    const prev = rejoinByKey.get(key);
    if (!prev || joinedAt >= String(prev.joined_at || '')) {
      rejoinByKey.set(key, row);
    }
  }
  return (removals || []).filter((row) => {
    const key = membershipPairKey(row);
    if (!key) return false;
    if (localMembershipKeys.has(key) && !localRemovalKeys.has(key)) return false;
    const rejoin = rejoinByKey.get(key);
    const removedAt = String(row.removed_at || '');
    const joinedAt = String(rejoin?.joined_at || '');
    if (rejoin && joinedAt && removedAt && joinedAt >= removedAt) return false;
    return true;
  });
}

function pruneStaleMembershipRemovalsData(removals, deletedSet, clinicalUsers, teams) {
  const userIds = new Set(
    (clinicalUsers || [])
      .map((row) => String(row?.user_id || '').trim())
      .filter(Boolean)
  );
  const teamIds = new Set(
    (teams || []).map((row) => String(row?.team_id || '').trim()).filter(Boolean)
  );
  return (removals || []).filter((row) => {
    const userId = String(row?.user_id || '').trim();
    const teamId = String(row?.team_id || '').trim();
    if (!userId || !teamId) return false;
    if (deletedSet.has(userId)) return false;
    if (!userIds.has(userId)) return false;
    if (!teamIds.has(teamId)) return false;
    return true;
  });
}

function filterMembershipForDeletedUsers(rows, deletedSet) {
  if (!deletedSet?.size) return rows || [];
  return (rows || []).filter((row) => {
    const userId = String(row?.user_id || '').trim();
    return userId && !deletedSet.has(userId);
  });
}

function filterMembershipAfterRemovals(rows, removals) {
  if (!removals?.length) return rows || [];
  const keys = new Set(removals.map((row) => `${row.team_id}\0${row.user_id}`));
  return (rows || []).filter((row) => {
    if (!row?.team_id || !row?.user_id) return false;
    return !keys.has(`${row.team_id}\0${row.user_id}`);
  });
}

function mergeTeamMembershipData(localRows, incomingRows) {
  const map = new Map();
  for (const row of localRows || []) {
    if (!row?.team_id || !row?.user_id) continue;
    map.set(`${row.team_id}\0${row.user_id}`, { ...row });
  }
  for (const row of incomingRows || []) {
    if (!row?.team_id || !row?.user_id) continue;
    const key = `${row.team_id}\0${row.user_id}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...row });
      continue;
    }
    const fraction =
      row.sub_area_fraction != null && String(row.sub_area_fraction).trim()
        ? String(row.sub_area_fraction).trim()
        : prev.sub_area_fraction ?? null;
    map.set(key, { ...prev, ...row, sub_area_fraction: fraction });
  }
  return [...map.values()];
}

function mergeRotationCyclesData(localRows, incomingRows) {
  const byId = indexBy(localRows, 'cycle_id');
  for (const row of incomingRows || []) {
    if (row && row.cycle_id) byId.set(String(row.cycle_id), { ...row });
  }
  return [...byId.values()];
}

function mergePatientTeamAssignmentsData(localRows, incomingRows) {
  const map = new Map();
  for (const row of localRows || []) {
    if (!row?.patient_id || !row?.team_id) continue;
    map.set(`${row.patient_id}\0${row.team_id}`, { ...row });
  }
  for (const row of incomingRows || []) {
    if (!row?.patient_id || !row?.team_id) continue;
    const key = `${row.patient_id}\0${row.team_id}`;
    if (!map.has(key)) map.set(key, { ...row });
  }
  return [...map.values()];
}

function mergeTeamGuardiaTodayData(localRows, incomingRows) {
  const localByTeam = indexBy(localRows, 'team_id');
  const incomingByTeam = indexBy(incomingRows, 'team_id');
  const allTeams = new Set([...localByTeam.keys(), ...incomingByTeam.keys()]);
  const out = [];
  for (const teamId of allTeams) {
    const winner = pickLastWriteRow(localByTeam.get(teamId), incomingByTeam.get(teamId), 'declared_at');
    if (winner) out.push({ ...winner });
  }
  return out;
}

function mergeActiveGuardiasData(localRows, incomingRows) {
  const localByPatient = indexBy(localRows, 'patient_id');
  const incomingByPatient = indexBy(incomingRows, 'patient_id');
  const allPatients = new Set([...localByPatient.keys(), ...incomingByPatient.keys()]);
  const out = [];
  for (const patientId of allPatients) {
    const winner = pickLastWriteRow(
      localByPatient.get(patientId),
      incomingByPatient.get(patientId),
      'assigned_at'
    );
    if (winner) out.push({ ...winner });
  }
  return out;
}

function mergeResolvedGuardiasData(localRows, incomingRows) {
  const byPatient = new Map();
  for (const list of [localRows, incomingRows]) {
    for (const row of list || []) {
      const pid = String(row?.patient_id || '').trim();
      const at = String(row?.assigned_at || '').trim();
      if (!pid || !at) continue;
      const prev = byPatient.get(pid);
      if (!prev || at >= String(prev.assigned_at || '')) {
        byPatient.set(pid, {
          patient_id: pid,
          guardia_id: row?.guardia_id ? String(row.guardia_id) : undefined,
          assigned_at: at,
        });
      }
    }
  }
  return [...byPatient.values()]
    .sort((a, b) => String(a.assigned_at).localeCompare(String(b.assigned_at)))
    .slice(-200);
}

function filterActiveGuardiasByResolved(activeRows, resolvedRows) {
  const resolvedByPatient = indexBy(resolvedRows, 'patient_id');
  return (activeRows || []).filter((row) => {
    const pid = String(row?.patient_id || '').trim();
    if (!pid) return false;
    const tomb = resolvedByPatient.get(pid);
    if (!tomb) return true;
    return String(row?.assigned_at || '') > String(tomb.assigned_at || '');
  });
}

function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

function isValidUsernameFormat(raw) {
  return /^[a-z][a-z0-9_]{2,31}$/.test(normalizeUsername(raw));
}

function peerStubUsernameForUserId(userId) {
  const compact = String(userId || '')
    .replace(/-/g, '')
    .toLowerCase();
  let base = ('peer_' + compact.slice(0, 20)).replace(/[^a-z0-9_]/g, 'x');
  if (!/^[a-z][a-z0-9_]{2,31}$/.test(base)) {
    base = 'peer_' + (compact.slice(0, 8).replace(/[^a-z0-9]/g, 'x') || 'user');
  }
  return base;
}

function resolveIncomingClinicalUserHandle(row, byUserId) {
  const uid = String(row.user_id);
  let handle = normalizeUsername(row.username);
  if (handle && isValidUsernameFormat(handle)) return handle;
  const clinicalName = String(row.clinical_name || '').trim();
  if (!clinicalName) return '';
  const prev = byUserId.get(uid);
  const prevHandle = prev ? normalizeUsername(prev.username) : '';
  if (prevHandle && isValidUsernameFormat(prevHandle)) return prevHandle;
  if (prevHandle && /^peer_[a-z0-9_]+$/.test(prevHandle)) return prevHandle;
  return peerStubUsernameForUserId(uid);
}

function mergeClinicalUsersDeletedData(localIds, incomingIds) {
  const set = new Set();
  for (const id of localIds || []) {
    const uid = String(id || '').trim();
    if (uid) set.add(uid);
  }
  for (const id of incomingIds || []) {
    const uid = String(id || '').trim();
    if (uid) set.add(uid);
  }
  return [...set];
}

function mergeLastActivityIso(a, b) {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  if (!left) return right || null;
  if (!right) return left;
  return left >= right ? left : right;
}

function mergeClinicalUsersData(localRows, incomingRows) {
  const byUsername = new Map();
  const byUserId = new Map();
  for (const row of localRows || []) {
    if (!row?.user_id) continue;
    byUserId.set(String(row.user_id), { ...row });
    const handle = normalizeUsername(row.username);
    if (handle && isValidUsernameFormat(handle)) byUsername.set(handle, { ...row });
  }
  for (const row of incomingRows || []) {
    if (!row?.user_id) continue;
    const uid = String(row.user_id);
    const handle = resolveIncomingClinicalUserHandle(row, byUserId);
    if (!handle) continue;
    const existingByHandle = byUsername.get(handle);
    if (existingByHandle && existingByHandle.user_id !== uid) {
      const prevByUid = byUserId.get(uid) || null;
      const mergedByUid = prevByUid
        ? {
            ...prevByUid,
            rank: row.rank ?? prevByUid.rank,
            clinical_name: row.clinical_name ?? prevByUid.clinical_name,
            sala: row.sala ?? prevByUid.sala,
            is_program_admin:
              row.is_program_admin != null ? row.is_program_admin : prevByUid.is_program_admin,
            last_activity_at: mergeLastActivityIso(prevByUid.last_activity_at, row.last_activity_at),
          }
        : { ...row, username: prevByUid ? prevByUid.username : row.username };
      byUserId.set(uid, mergedByUid);
      continue;
    }
    const prev = byUserId.get(uid) || existingByHandle || null;
    const merged = prev
      ? {
          ...prev,
          username: handle,
          rank: row.rank ?? prev.rank,
          clinical_name: row.clinical_name ?? prev.clinical_name,
          sala: row.sala ?? prev.sala,
          is_program_admin:
            row.is_program_admin != null ? row.is_program_admin : prev.is_program_admin,
          last_activity_at: mergeLastActivityIso(prev.last_activity_at, row.last_activity_at),
        }
      : { ...row, username: handle };
    byUserId.set(uid, merged);
    byUsername.set(handle, merged);
  }
  return [...byUserId.values()];
}

/**
 * Union-merge two clinicalOps snapshot payloads (no DB).
 * @param {object|null} local
 * @param {object|null} incoming
 * @returns {object|null}
 */
function mergeClinicalOpsSnapshotsData(local, incoming) {
  if (!local) return incoming && typeof incoming === 'object' ? { ...incoming } : null;
  if (!incoming || typeof incoming !== 'object') return { ...local };

  const remoteNueva = incoming.rotationNuevaAt ? String(incoming.rotationNuevaAt) : '';
  const localNueva = local.rotationNuevaAt ? String(local.rotationNuevaAt) : '';
  if (remoteNueva && (!localNueva || remoteNueva > localNueva)) {
    const clinical_users_deleted = mergeClinicalUsersDeletedData(
      local.clinical_users_deleted || [],
      incoming.clinical_users_deleted || []
    );
    const deletedSet = new Set(clinical_users_deleted);
    return {
      ...incoming,
      exportedAt:
        String(incoming.exportedAt || '') >= String(local.exportedAt || '')
          ? incoming.exportedAt
          : local.exportedAt,
      clinical_users_deleted,
      // Peers on older builds may omit clinical_users; never drop registered handles.
      clinical_users: mergeClinicalUsersData(
        local.clinical_users || [],
        incoming.clinical_users || []
      ).filter((row) => !deletedSet.has(String(row?.user_id || ''))),
    };
  }

  const exportedAt =
    String(incoming.exportedAt || '') >= String(local.exportedAt || '')
      ? incoming.exportedAt
      : local.exportedAt;

  const clinical_users_deleted = mergeClinicalUsersDeletedData(
    local.clinical_users_deleted || [],
    incoming.clinical_users_deleted || []
  );
  const deletedSet = new Set(clinical_users_deleted);
  const team_membership_rejoins = mergeMembershipRejoinsData(
    local.team_membership_rejoins || [],
    incoming.team_membership_rejoins || []
  );
  const teams_archived = mergeTeamsArchivedData(
    local.teams_archived || [],
    incoming.teams_archived || []
  );
  let mergedTeams = mergeTeamsData(local.teams || [], incoming.teams || []);
  mergedTeams = applyArchivedTeamTombstonesToTeams(mergedTeams, teams_archived);
  const archivedTeamIds = archivedTeamIdSet(mergedTeams, teams_archived);
  const mergedClinicalUsers = mergeClinicalUsersData(
    local.clinical_users || [],
    incoming.clinical_users || []
  ).filter((row) => !deletedSet.has(String(row?.user_id || '')));
  const team_membership_removals = pruneStaleMembershipRemovalsData(
    reconcileMembershipRemovalsData(
      local,
      mergeMembershipRemovalsData(
        local.team_membership_removals || [],
        incoming.team_membership_removals || []
      ),
      team_membership_rejoins
    ),
    deletedSet,
    mergedClinicalUsers,
    mergedTeams
  );
  const active_guardias_resolved = mergeResolvedGuardiasData(
    local.active_guardias_resolved || [],
    incoming.active_guardias_resolved || []
  );

  return {
    version: Math.max(Number(local.version || 1), Number(incoming.version || 1)),
    exportedAt,
    rotationNuevaAt: localNueva || remoteNueva || null,
    rotation_cycles: mergeRotationCyclesData(
      local.rotation_cycles || [],
      incoming.rotation_cycles || []
    ),
    patient_team_assignment: mergePatientTeamAssignmentsData(
      local.patient_team_assignment || [],
      incoming.patient_team_assignment || []
    ),
    team_guardia_today: mergeTeamGuardiaTodayData(
      local.team_guardia_today || [],
      incoming.team_guardia_today || []
    ),
    teams: mergedTeams,
    teams_archived,
    team_membership_rejoins,
    team_membership_removals,
    team_membership: filterMembershipAfterRemovals(
      filterMembershipForArchivedTeams(
        filterMembershipForDeletedUsers(
          mergeTeamMembershipData(local.team_membership || [], incoming.team_membership || []),
          deletedSet
        ),
        archivedTeamIds
      ),
      team_membership_removals
    ),
    active_guardias: filterActiveGuardiasByResolved(
      mergeActiveGuardiasData(local.active_guardias || [], incoming.active_guardias || []),
      active_guardias_resolved
    ),
    active_guardias_resolved,
    clinical_users: mergedClinicalUsers,
    clinical_users_deleted,
  };
}

/**
 * Fold many LAN bundle clinicalOps snapshots into one union snapshot.
 * @param {object[]} sources
 */
function mergeClinicalOpsFromSourcesData(sources) {
  let merged = null;
  for (const src of sources || []) {
    const snap = src && src.clinicalOps;
    if (!snap || typeof snap !== 'object') continue;
    merged = merged ? mergeClinicalOpsSnapshotsData(merged, snap) : { ...snap };
  }
  return merged;
}

module.exports = {
  mergeClinicalUsersData,
  mergeClinicalUsersDeletedData,
  mergeClinicalOpsSnapshotsData,
  mergeClinicalOpsFromSourcesData,
};
