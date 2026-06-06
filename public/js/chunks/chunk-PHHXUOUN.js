// public/js/clinical-ops-bundle-merge.mjs
function indexBy(rows, key) {
  const map = /* @__PURE__ */ new Map();
  for (const row of rows || []) {
    if (row && row[key] != null) map.set(String(row[key]), row);
  }
  return map;
}
function pickLastWriteRow(localRow, incomingRow, tsField) {
  if (!localRow) return incomingRow || null;
  if (!incomingRow) return localRow;
  const a = String(localRow[tsField] || "");
  const b = String(incomingRow[tsField] || "");
  return b >= a ? incomingRow : localRow;
}
function mergeTeamsData(localRows, incomingRows) {
  const localById = indexBy(localRows, "team_id");
  const incomingById = indexBy(incomingRows, "team_id");
  const allIds = /* @__PURE__ */ new Set([...localById.keys(), ...incomingById.keys()]);
  const out = [];
  for (const teamId of allIds) {
    const winner = pickLastWriteRow(localById.get(teamId), incomingById.get(teamId), "created_at");
    if (winner) out.push({ ...winner });
  }
  return out;
}
function membershipPairKey(row) {
  const teamId = String(row?.team_id || "").trim();
  const userId = String(row?.user_id || "").trim();
  if (!teamId || !userId) return "";
  return `${teamId}\0${userId}`;
}
function buildMembershipPairKeySet(rows) {
  const keys = /* @__PURE__ */ new Set();
  for (const row of rows || []) {
    const key = membershipPairKey(row);
    if (key) keys.add(key);
  }
  return keys;
}
function mergeMembershipRemovalsData(localRows, incomingRows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of [...localRows || [], ...incomingRows || []]) {
    if (!row?.team_id || !row?.user_id) continue;
    const teamId = String(row.team_id);
    const userId = String(row.user_id);
    const removedAt = String(row.removed_at || "").trim() || (/* @__PURE__ */ new Date(0)).toISOString();
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || removedAt >= String(prev.removed_at || "")) {
      map.set(key, { team_id: teamId, user_id: userId, removed_at: removedAt });
    }
  }
  return [...map.values()];
}
function mergeMembershipRejoinsData(localRows, incomingRows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of [...localRows || [], ...incomingRows || []]) {
    if (!row?.team_id || !row?.user_id) continue;
    const teamId = String(row.team_id);
    const userId = String(row.user_id);
    const joinedAt = String(row.joined_at || "").trim() || (/* @__PURE__ */ new Date(0)).toISOString();
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || joinedAt >= String(prev.joined_at || "")) {
      map.set(key, { team_id: teamId, user_id: userId, joined_at: joinedAt });
    }
  }
  return [...map.values()];
}
function reconcileMembershipRemovalsData(local, removals, rejoins) {
  const localMembershipKeys = buildMembershipPairKeySet(local?.team_membership);
  const localRemovalKeys = buildMembershipPairKeySet(local?.team_membership_removals);
  const rejoinByKey = /* @__PURE__ */ new Map();
  for (const row of rejoins || []) {
    const key = membershipPairKey(row);
    if (!key) continue;
    const joinedAt = String(row.joined_at || "");
    const prev = rejoinByKey.get(key);
    if (!prev || joinedAt >= String(prev.joined_at || "")) {
      rejoinByKey.set(key, row);
    }
  }
  return (removals || []).filter((row) => {
    const key = membershipPairKey(row);
    if (!key) return false;
    if (localMembershipKeys.has(key) && !localRemovalKeys.has(key)) return false;
    const rejoin = rejoinByKey.get(key);
    const removedAt = String(row.removed_at || "");
    const joinedAt = String(rejoin?.joined_at || "");
    if (rejoin && joinedAt && removedAt && joinedAt >= removedAt) return false;
    return true;
  });
}
function pruneStaleMembershipRemovalsData(removals, deletedSet, clinicalUsers, teams) {
  const userIds = new Set(
    (clinicalUsers || []).map((row) => String(row?.user_id || "").trim()).filter(Boolean)
  );
  const teamIds = new Set(
    (teams || []).map((row) => String(row?.team_id || "").trim()).filter(Boolean)
  );
  return (removals || []).filter((row) => {
    const userId = String(row?.user_id || "").trim();
    const teamId = String(row?.team_id || "").trim();
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
    const userId = String(row?.user_id || "").trim();
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
  const map = /* @__PURE__ */ new Map();
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
    const fraction = row.sub_area_fraction != null && String(row.sub_area_fraction).trim() ? String(row.sub_area_fraction).trim() : prev.sub_area_fraction ?? null;
    map.set(key, { ...prev, ...row, sub_area_fraction: fraction });
  }
  return [...map.values()];
}
function mergeRotationCyclesData(localRows, incomingRows) {
  const byId = indexBy(localRows, "cycle_id");
  for (const row of incomingRows || []) {
    if (row && row.cycle_id) byId.set(String(row.cycle_id), { ...row });
  }
  return [...byId.values()];
}
function mergePatientTeamAssignmentsData(localRows, incomingRows) {
  const map = /* @__PURE__ */ new Map();
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
  const localByTeam = indexBy(localRows, "team_id");
  const incomingByTeam = indexBy(incomingRows, "team_id");
  const allTeams = /* @__PURE__ */ new Set([...localByTeam.keys(), ...incomingByTeam.keys()]);
  const out = [];
  for (const teamId of allTeams) {
    const winner = pickLastWriteRow(localByTeam.get(teamId), incomingByTeam.get(teamId), "declared_at");
    if (winner) out.push({ ...winner });
  }
  return out;
}
function mergeActiveGuardiasData(localRows, incomingRows) {
  const localByPatient = indexBy(localRows, "patient_id");
  const incomingByPatient = indexBy(incomingRows, "patient_id");
  const allPatients = /* @__PURE__ */ new Set([...localByPatient.keys(), ...incomingByPatient.keys()]);
  const out = [];
  for (const patientId of allPatients) {
    const winner = pickLastWriteRow(
      localByPatient.get(patientId),
      incomingByPatient.get(patientId),
      "assigned_at"
    );
    if (winner) out.push({ ...winner });
  }
  return out;
}
function normalizeUsername(raw) {
  return String(raw || "").trim().replace(/^@+/, "").toLowerCase();
}
function isValidUsernameFormat(raw) {
  return /^[a-z][a-z0-9_]{2,31}$/.test(normalizeUsername(raw));
}
function mergeClinicalUsersDeletedData(localIds, incomingIds) {
  const set = /* @__PURE__ */ new Set();
  for (const id of localIds || []) {
    const uid = String(id || "").trim();
    if (uid) set.add(uid);
  }
  for (const id of incomingIds || []) {
    const uid = String(id || "").trim();
    if (uid) set.add(uid);
  }
  return [...set];
}
function mergeClinicalUsersData(localRows, incomingRows) {
  const byUsername = /* @__PURE__ */ new Map();
  const byUserId = /* @__PURE__ */ new Map();
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
      const mergedByUid = prevByUid ? {
        ...prevByUid,
        rank: row.rank ?? prevByUid.rank,
        clinical_name: row.clinical_name ?? prevByUid.clinical_name,
        sala: row.sala ?? prevByUid.sala,
        is_program_admin: row.is_program_admin != null ? row.is_program_admin : prevByUid.is_program_admin
      } : { ...row, username: prevByUid ? prevByUid.username : row.username };
      byUserId.set(uid, mergedByUid);
      continue;
    }
    const prev = byUserId.get(uid) || existingByHandle || null;
    const merged = prev ? {
      ...prev,
      username: handle,
      rank: row.rank ?? prev.rank,
      clinical_name: row.clinical_name ?? prev.clinical_name,
      sala: row.sala ?? prev.sala,
      is_program_admin: row.is_program_admin != null ? row.is_program_admin : prev.is_program_admin
    } : { ...row, username: handle };
    byUserId.set(uid, merged);
    byUsername.set(handle, merged);
  }
  return [...byUserId.values()];
}
function mergeClinicalOpsSnapshotsData(local, incoming) {
  if (!local) return incoming && typeof incoming === "object" ? { ...incoming } : null;
  if (!incoming || typeof incoming !== "object") return { ...local };
  const remoteNueva = incoming.rotationNuevaAt ? String(incoming.rotationNuevaAt) : "";
  const localNueva = local.rotationNuevaAt ? String(local.rotationNuevaAt) : "";
  if (remoteNueva && (!localNueva || remoteNueva > localNueva)) {
    const clinical_users_deleted2 = mergeClinicalUsersDeletedData(
      local.clinical_users_deleted || [],
      incoming.clinical_users_deleted || []
    );
    const deletedSet2 = new Set(clinical_users_deleted2);
    return {
      ...incoming,
      exportedAt: String(incoming.exportedAt || "") >= String(local.exportedAt || "") ? incoming.exportedAt : local.exportedAt,
      clinical_users_deleted: clinical_users_deleted2,
      clinical_users: mergeClinicalUsersData(
        local.clinical_users || [],
        incoming.clinical_users || []
      ).filter((row) => !deletedSet2.has(String(row?.user_id || "")))
    };
  }
  const exportedAt = String(incoming.exportedAt || "") >= String(local.exportedAt || "") ? incoming.exportedAt : local.exportedAt;
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
  ).filter((row) => !deletedSet.has(String(row?.user_id || "")));
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
    clinical_users_deleted
  };
}
function mergeClinicalOpsFromSourcesData(sources) {
  let merged = null;
  for (const src of sources || []) {
    const snap = src && src.clinicalOps;
    if (!snap || typeof snap !== "object") continue;
    merged = merged ? mergeClinicalOpsSnapshotsData(merged, snap) : { ...snap };
  }
  return merged;
}

// public/js/lan-sync-diagnostics.mjs
var MAX_ERRORS = 5;
var MAX_OPS_TRACE = 12;
var lastErrors = [];
var clinicalOpsTrace = [];
function recordLanSyncError(entry) {
  const row = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    op: String(entry && entry.op != null ? entry.op : "unknown"),
    code: String(entry && entry.code != null ? entry.code : ""),
    message: String(entry && entry.message != null ? entry.message : "")
  };
  lastErrors.unshift(row);
  if (lastErrors.length > MAX_ERRORS) lastErrors.length = MAX_ERRORS;
}
function recordClinicalOpsTrace(boundary, data) {
  const row = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    boundary: String(boundary || "unknown"),
    data: data && typeof data === "object" ? { ...data } : {}
  };
  clinicalOpsTrace.unshift(row);
  if (clinicalOpsTrace.length > MAX_OPS_TRACE) clinicalOpsTrace.length = MAX_OPS_TRACE;
}
function getClinicalOpsTrace() {
  return clinicalOpsTrace.map(function(e) {
    return { at: e.at, boundary: e.boundary, data: { ...e.data } };
  });
}
function getLanSyncDiagnostics(deps) {
  const d = deps && typeof deps === "object" ? deps : {};
  const trace = Array.isArray(d.clinicalOpsTrace) && d.clinicalOpsTrace.length ? d.clinicalOpsTrace : getClinicalOpsTrace();
  return {
    hostUrl: String(d.hostUrl || ""),
    pingAt: d.pingAt != null ? d.pingAt : null,
    pingStatus: d.pingStatus != null ? d.pingStatus : null,
    wsSync: !!d.wsSync,
    wsLive: !!d.wsLive,
    liveRoomId: String(d.liveRoomId || ""),
    roomId: String(d.roomId || ""),
    phase: String(d.phase || "offline"),
    bundleRevision: Number(d.bundleRevision || 0),
    outboxCount: Number(d.outboxCount || 0),
    pinnedHost: String(d.pinnedHost || ""),
    teamCodeAligned: d.teamCodeAligned == null ? null : !!d.teamCodeAligned,
    peerHostCount: Number(d.peerHostCount || 0),
    clinicalOpsTrace: trace,
    lastErrors: lastErrors.map(function(e) {
      return { at: e.at, op: e.op, code: e.code, message: e.message };
    })
  };
}
function redactLanSecrets(text) {
  return String(text || "").replace(/Bearer\s+[A-Za-z0-9._+/=-]+/gi, "Bearer ***").replace(/"teamCode"\s*:\s*"[^"]*"/gi, '"teamCode":"***"').replace(/teamCode[=:]\s*[A-Za-z0-9._+/=-]+/gi, "teamCode=***").replace(/"code"\s*:\s*"[A-Za-z0-9._+/=-]{8,}"/gi, '"code":"***"');
}
function formatDiagnosticsReport(diag) {
  const payload = diag && typeof diag === "object" ? diag : getLanSyncDiagnostics();
  return redactLanSecrets(JSON.stringify(payload, null, 2));
}

// public/js/clinical-ops-lan.mjs
var cachedSnapshot = null;
var pendingClinicalOpsSnapshot = null;
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function isClinicalOpsLanAvailable() {
  const api = dbApi();
  return !!(api && typeof api.dbClinicalOpsExport === "function" && typeof api.dbClinicalOpsMerge === "function");
}
async function refreshClinicalOpsSnapshotCache() {
  cachedSnapshot = await collectClinicalOpsForLanSync();
  return cachedSnapshot;
}
async function prepareClinicalOpsForLanSync() {
  if (!isClinicalOpsLanAvailable()) return null;
  return refreshClinicalOpsSnapshotCache();
}
function getCachedClinicalOpsSnapshot() {
  return cachedSnapshot;
}
async function collectClinicalOpsForLanSync() {
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsExport !== "function") return null;
  const res = await api.dbClinicalOpsExport();
  if (!res || res.ok === false) return null;
  const snap = res.snapshot && typeof res.snapshot === "object" ? res.snapshot : null;
  if (snap) {
    recordClinicalOpsTrace("export", {
      usersExported: Array.isArray(snap.clinical_users) ? snap.clinical_users.length : 0,
      teamMembership: Array.isArray(snap.team_membership) ? snap.team_membership.length : 0
    });
  }
  return snap;
}
function clinicalOpsMergeHadChanges(mergeStats) {
  if (!mergeStats || typeof mergeStats !== "object") return false;
  return Object.keys(mergeStats).some((key) => {
    const value = mergeStats[key];
    return typeof value === "number" && value > 0;
  });
}
function deferClinicalOpsLanSnapshot(snapshot) {
  pendingClinicalOpsSnapshot = snapshot;
  recordClinicalOpsTrace("merge", {
    ok: false,
    changed: false,
    deferred: true,
    code: "DB_LOCKED",
    incomingUsers: Array.isArray(snapshot?.clinical_users) ? snapshot.clinical_users.length : 0,
    mergeStats: null
  });
  return { ok: false, changed: false, code: "DB_LOCKED", deferred: true };
}
async function flushPendingClinicalOpsLanSnapshot() {
  if (!pendingClinicalOpsSnapshot) return { ok: true, changed: false };
  const snap = pendingClinicalOpsSnapshot;
  pendingClinicalOpsSnapshot = null;
  return applyClinicalOpsLanSnapshot(snap);
}
async function applyClinicalOpsLanSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return { ok: false, changed: false };
  const api = dbApi();
  if (!api || typeof api.dbClinicalOpsMerge !== "function") return { ok: false, changed: false };
  const res = await api.dbClinicalOpsMerge({ snapshot });
  if (res && res.code === "DB_LOCKED") {
    return deferClinicalOpsLanSnapshot(snapshot);
  }
  const ok = !!(res && res.ok !== false);
  const changed = ok && clinicalOpsMergeHadChanges(res?.mergeStats);
  recordClinicalOpsTrace("merge", {
    ok,
    changed,
    incomingUsers: Array.isArray(snapshot.clinical_users) ? snapshot.clinical_users.length : 0,
    mergeStats: res && res.mergeStats ? res.mergeStats : null,
    code: ok ? void 0 : res?.code,
    error: ok ? void 0 : res?.error
  });
  if (ok && changed && typeof document !== "undefined") {
    document.dispatchEvent(
      new CustomEvent("rpc-clinical-ops-synced", { detail: { mergeStats: res?.mergeStats || null } })
    );
  }
  return { ok, changed, code: ok ? void 0 : res?.code, error: ok ? void 0 : res?.error };
}
function mergeClinicalOpsFromSources(sources) {
  return mergeClinicalOpsFromSourcesData(sources);
}

export {
  recordLanSyncError,
  recordClinicalOpsTrace,
  getLanSyncDiagnostics,
  formatDiagnosticsReport,
  mergeClinicalOpsSnapshotsData,
  isClinicalOpsLanAvailable,
  refreshClinicalOpsSnapshotCache,
  prepareClinicalOpsForLanSync,
  getCachedClinicalOpsSnapshot,
  collectClinicalOpsForLanSync,
  clinicalOpsMergeHadChanges,
  flushPendingClinicalOpsLanSnapshot,
  applyClinicalOpsLanSnapshot,
  mergeClinicalOpsFromSources
};
//# sourceMappingURL=/js/chunks/chunk-PHHXUOUN.js.map
