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
    teams: mergeTeamsData(local.teams || [], incoming.teams || []),
    team_membership: mergeTeamMembershipData(
      local.team_membership || [],
      incoming.team_membership || []
    ),
    active_guardias: mergeActiveGuardiasData(
      local.active_guardias || [],
      incoming.active_guardias || []
    ),
    clinical_users: mergeClinicalUsersData(
      local.clinical_users || [],
      incoming.clinical_users || []
    ).filter((row) => !deletedSet.has(String(row?.user_id || ''))),
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
