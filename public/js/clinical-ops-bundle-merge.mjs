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

function mergeTeamsData(localRows, incomingRows) {
  const localById = indexBy(localRows, 'team_id');
  const incomingById = indexBy(incomingRows, 'team_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);
  const out = [];
  for (const teamId of allIds) {
    const winner = pickLastWriteRow(localById.get(teamId), incomingById.get(teamId), 'created_at');
    if (winner) out.push({ ...winner });
  }
  return out;
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

function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

function isValidUsernameFormat(raw) {
  return /^[a-z][a-z0-9_]{2,31}$/.test(normalizeUsername(raw));
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
    const handle = normalizeUsername(row.username);
    if (!handle || !isValidUsernameFormat(handle)) continue;
    const uid = String(row.user_id);
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
        }
      : { ...row, username: handle };
    byUserId.set(uid, merged);
    byUsername.set(handle, merged);
  }
  return [...byUserId.values()];
}

/** @param {object|null} local @param {object|null} incoming */
export function mergeClinicalOpsSnapshotsData(local, incoming) {
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
  const mergedTeams = mergeTeamsData(local.teams || [], incoming.teams || []);
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
    team_membership_rejoins,
    team_membership_removals,
    team_membership: filterMembershipAfterRemovals(
      filterMembershipForDeletedUsers(
        mergeTeamMembershipData(local.team_membership || [], incoming.team_membership || []),
        deletedSet
      ),
      team_membership_removals
    ),
    active_guardias: mergeActiveGuardiasData(
      local.active_guardias || [],
      incoming.active_guardias || []
    ),
    clinical_users: mergedClinicalUsers,
    clinical_users_deleted,
  };
}

/** @param {object[]} sources */
export function mergeClinicalOpsFromSourcesData(sources) {
  let merged = null;
  for (const src of sources || []) {
    const snap = src && src.clinicalOps;
    if (!snap || typeof snap !== 'object') continue;
    merged = merged ? mergeClinicalOpsSnapshotsData(merged, snap) : { ...snap };
  }
  return merged;
}
