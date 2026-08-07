import {
  getCutoverFlag,
  is79CutoverVersion,
  isCutoverDone,
  isCutoverPending,
  setCutoverFlag
} from "/mobile/js/chunks/chunk-ETN66DDX.js";

// public/js/features/cloud-sync/cutover-snapshot.mjs
var SNAPSHOT_STORAGE_KEY = "rpc-cloud-sync-79-snapshot";
function buildCutoverSnapshot(sources) {
  const ops = sources?.ops && typeof sources.ops === "object" ? sources.ops : {};
  const patients = Array.isArray(sources?.patients) ? sources.patients : [];
  const userById = indexClinicalUsers(ops.clinical_users);
  const membersByTeam = indexMembership(ops.team_membership, userById);
  const teamRows = buildTeamRows(ops.teams, membersByTeam);
  const latestAssign = latestPatientAssignments(ops.patient_team_assignment);
  const patientRows = buildPatientRows(patients, latestAssign, teamRows);
  return {
    version: 1,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    users: [...userById.values()].filter((u) => u.username),
    teams: teamRows,
    patients: patientRows
  };
}
function indexClinicalUsers(clinicalUsers) {
  const list = Array.isArray(clinicalUsers) ? clinicalUsers : [];
  const userById = /* @__PURE__ */ new Map();
  for (const u of list) {
    const id = String(u.user_id || u.id || "").trim();
    if (!id) continue;
    userById.set(id, {
      username: String(u.username || "").trim().toLowerCase(),
      displayName: String(u.clinical_name || u.displayName || "").trim(),
      rank: String(u.rank || "R1").trim() || "R1",
      sala: String(u.sala || "").trim(),
      userId: id
    });
  }
  return userById;
}
function indexMembership(membership, userById) {
  const list = Array.isArray(membership) ? membership : [];
  const membersByTeam = /* @__PURE__ */ new Map();
  for (const m of list) {
    const tid = String(m.team_id || "").trim();
    const uid = String(m.user_id || "").trim();
    if (!tid || !uid) continue;
    if (!membersByTeam.has(tid)) membersByTeam.set(tid, []);
    const u = userById.get(uid);
    if (u?.username) membersByTeam.get(tid).push(u.username);
  }
  return membersByTeam;
}
function buildTeamRows(teams, membersByTeam) {
  const list = Array.isArray(teams) ? teams : [];
  return list.filter((t) => t && !t.archived_at).map((t) => {
    const teamId = String(t.team_id || "").trim();
    return {
      teamId,
      name: String(t.name || "").trim() || teamId,
      sala: String(t.sala || t.service || "").trim(),
      memberUsernames: [...new Set(membersByTeam.get(teamId) || [])]
    };
  }).filter((t) => t.teamId);
}
function latestPatientAssignments(assignments) {
  const list = Array.isArray(assignments) ? assignments : [];
  const latestAssign = /* @__PURE__ */ new Map();
  for (const a of list) {
    const pid = String(a.patient_id || "").trim();
    const tid = String(a.team_id || "").trim();
    const at = String(a.effective_at || a.created_at || "");
    if (!pid || !tid) continue;
    const prev = latestAssign.get(pid);
    if (!prev || at >= prev.at) latestAssign.set(pid, { teamId: tid, at });
  }
  return latestAssign;
}
function buildPatientRows(patients, latestAssign, teamRows) {
  const teamIdToMembers = new Map(teamRows.map((t) => [t.teamId, t.memberUsernames]));
  return patients.map((p) => {
    const id = String(p.id || p.patientId || "").trim();
    const teamId = latestAssign.get(id)?.teamId || String(p.teamId || p.team_id || "").trim();
    const members = teamIdToMembers.get(teamId) || [];
    return {
      id,
      registro: String(p.registro || "").trim(),
      nombre: String(p.nombre || p.name || "").trim(),
      sala: String(p.sala || p.clinicalSala || "").trim(),
      teamId,
      ownerUsername: members[0] || ""
    };
  }).filter((p) => p.id);
}
function saveCutoverSnapshot(snapshot) {
  if (typeof localStorage === "undefined") return false;
  localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
  return true;
}
function loadCutoverSnapshot() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

// public/js/features/cloud-sync/cutover-wipe.mjs
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
async function ensure79CutoverSnapshotAndWipe(deps = {}) {
  const early = earlyCutoverExit();
  if (early) return early;
  const api = deps.api || dbApi();
  const apiErr = validateWipeApi(api);
  if (apiErr) return apiErr;
  const ops = await exportClinicalOps(api);
  if (ops.error) return ops.error;
  const patients = await loadPatientsForSnapshot(deps);
  const snapshot = buildCutoverSnapshot({ ops: ops.value, patients });
  saveCutoverSnapshot(snapshot);
  setCutoverFlag("pending");
  const wipeErr = await runCutoverWipe(api, snapshot);
  if (wipeErr) return wipeErr;
  await refreshRuntimeAfterWipe();
  return { ran: true, snapshot };
}
function earlyCutoverExit() {
  if (isCutoverDone()) return { ran: false, reason: "done" };
  if (!is79CutoverVersion()) return { ran: false, reason: "version" };
  const existing = loadCutoverSnapshot();
  if (existing && getCutoverFlag() === "pending") {
    return { ran: false, reason: "already_pending", snapshot: existing };
  }
  return null;
}
function validateWipeApi(api) {
  if (!api || typeof api.dbClinicalOpsExport !== "function") {
    return { ran: false, reason: "no_api" };
  }
  if (typeof api.dbClinical79CutoverWipe !== "function") {
    return { ran: false, reason: "no_wipe_api" };
  }
  return null;
}
async function exportClinicalOps(api) {
  try {
    const res = await api.dbClinicalOpsExport();
    const value = res?.ok !== false ? res?.snapshot || res : null;
    return { value };
  } catch (err) {
    console.warn("[R+] 7.9 cutover export failed", err);
    return { error: { ran: false, reason: "export_failed" } };
  }
}
async function loadPatientsForSnapshot(deps) {
  try {
    if (typeof deps.getPatients === "function") return deps.getPatients() || [];
    const appState = await import("/mobile/js/chunks/app-state-7F6V77ZU.js");
    return Array.isArray(appState.patients) ? appState.patients : [];
  } catch {
    return [];
  }
}
async function runCutoverWipe(api, snapshot) {
  try {
    const wipeRes = await api.dbClinical79CutoverWipe();
    if (wipeRes?.ok === false) {
      console.warn("[R+] 7.9 cutover wipe failed", wipeRes);
      return { ran: false, reason: "wipe_failed", snapshot };
    }
    return null;
  } catch (err) {
    console.warn("[R+] 7.9 cutover wipe threw", err);
    return { ran: false, reason: "wipe_threw", snapshot };
  }
}
async function refreshRuntimeAfterWipe() {
  try {
    const runtime = await import("/mobile/js/chunks/clinical-access-runtime-D63B6FH7.js");
    if (typeof runtime.initClinicalAccessRuntime !== "function") return;
    const settingsMod = await import("/mobile/js/chunks/clinical-settings-TTE72JQG.js");
    const settings = settingsMod.readRpcSettings();
    const clientId = settingsMod.resolveClinicalClientId(settings);
    await runtime.initClinicalAccessRuntime(settings, clientId);
  } catch {
  }
}

// public/js/features/cloud-sync/cutover-gate.mjs
function shouldShowCutoverWizard(opts) {
  if (!opts) return false;
  if (opts.cutoverDone) return false;
  return Boolean(opts.cutoverPending);
}
async function run79CutoverGate() {
  if (isCutoverDone()) return false;
  if (!is79CutoverVersion() && !isCutoverPending()) return false;
  await ensure79CutoverSnapshotAndWipe();
  void loadCutoverSnapshot();
  return false;
}

export {
  loadCutoverSnapshot,
  shouldShowCutoverWizard,
  run79CutoverGate
};
//# sourceMappingURL=/js/chunks/chunk-GYM4L4N4.js.map
