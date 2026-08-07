import {
  formatBhExtrasDisplayLine,
  formatCultivoCondensedForCopy,
  isCitoquimInterpretacionResLabChunk,
  isParsedCultivoHeaderLine,
  parseCuentaFromCultivoChunkLines,
  sanitizeResLabsChunks
} from "/mobile/js/chunks/chunk-N74FWNUD.js";
import {
  buildTextSkeletonPanel
} from "/mobile/js/chunks/chunk-PAAJVTB4.js";
import {
  isHemodynamicallyUnstable,
  isTempFebrile,
  isTempFeverPeak
} from "/mobile/js/chunks/chunk-AKP3FGXS.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WD3AJTQB.js";
import {
  ensureClinicalDbUnlocked,
  getClinicalBootDelays
} from "/mobile/js/chunks/chunk-T5EKEMCK.js";
import {
  captureClinicalTeamsPanelDraft,
  closeCreateTeamPanelAfterSuccess,
  isClinicalTeamsPanelUserInteracting,
  restoreClinicalTeamsPanelDraft
} from "/mobile/js/chunks/chunk-M75YYGQZ.js";
import {
  LAN_PROFILE_PUSH_FAILED_MSG,
  isBenignLanPushSkipCode
} from "/mobile/js/chunks/chunk-SFXEUBWR.js";
import {
  refreshRpcDateFields
} from "/mobile/js/chunks/chunk-56R66ES7.js";
import {
  pushCloudClinicalOpsNow,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-3NNHG3MC.js";
import {
  getUiDensity,
  isGuardiaMode,
  setUiDensity
} from "/mobile/js/chunks/chunk-PD77VH7Y.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  INSULIN_RESCATE_NM_LABEL,
  appendEventualidad,
  balanceTurno,
  computeDietKcalTotal,
  deriveSnapshot,
  diagnosticosTextForCenso,
  ensureMonitoreo,
  ensurePatientDiagnosticos,
  eventualidadDateToIso,
  filterNewEventualidades,
  findEventualidadEntry,
  formatAccesoFechaDisplay,
  formatAccesosForCenso,
  formatDaySubLabel,
  groupEntriesByDay,
  indicaciones,
  isDietaAyuno,
  isDietaSuplemento,
  isInsulinRescateMedicationItem,
  isNutritionMedicationItem,
  labHistory,
  migratePatientMonitoreo,
  normalizeEventualidadText,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  notes,
  parseFechaLabToMs,
  patients,
  removeEventualidad,
  resolveDietWeightKg,
  rt,
  saveState,
  setPatients,
  sortLabHistoryChronological,
  toClinicalHistoryText,
  toEventualidadDateValue,
  updateEventualidad
} from "/mobile/js/chunks/chunk-TWV6UAYK.js";
import {
  computeIoBalanceFromIngEgr,
  diuresisValueFromParts,
  formatEaVitalPointShorthand,
  formatIoClauseForSoap,
  gluPointMs,
  ioNumericEgressTotal,
  isIoNumericValue,
  normalizeEvacAbbrev,
  normalizeIoNcAbbrev,
  parseIoEgresoLine,
  parseIoEvacField,
  parseIoIngresoField,
  serializeEgrPartsToFormText,
  toEaSalidaText,
  vitalAlteredTimeForDisplay
} from "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  esc,
  escapeAttr,
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  normalizeTodoPriority
} from "/mobile/js/chunks/chunk-ZQE77EGT.js";
import {
  storage
} from "/mobile/js/chunks/chunk-WXZVVY5M.js";
import {
  showToast
} from "/mobile/js/chunks/chunk-T4WWDITM.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-QWJHEGH4.js";
import {
  isClinicalLocalOnlyMode,
  persistClinicalUserBinding,
  readRpcSettings,
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import {
  collectClinicalLsSnapshot
} from "/mobile/js/chunks/chunk-J76D6PFX.js";
import {
  isCloudSyncActive
} from "/mobile/js/chunks/chunk-WUQ6BLHZ.js";
import {
  isCloudSala,
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncRoomSnapshot,
  getCloudSyncToken
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";
import {
  CLINICAL_SALA_VALUES,
  activeCycleLetterForDate,
  clinicalServiceForSala,
  computeSalaAbcdefDeficitWrite,
  evaluateClinicalScope,
  formatMemberCycleLabel,
  getCycleFieldMetaForTeamCreate,
  getCycleLetterOptionsForRank,
  getCycleLettersForTeamCreate,
  getJoinedTeams,
  getJoinedTeamsForUser,
  getTeamCompositionLimits,
  inferMembershipCycleForJoin,
  isActiveGuardiaCoveringUser,
  isMemberOnCallToday,
  isOnCallToday,
  isPatientReadableInClinicalScope,
  isSalaWardService,
  isTeamRankOnCallToday,
  migratePatientsClinicalSala,
  patientCoveredByGuardia,
  patientHasExplicitTeamAssignment,
  patientMatchesAnyJoinedTeam,
  patientMatchesTeam,
  readEntregaPhaseActive,
  resolveMembershipCycleForUser,
  resolvePatientSala,
  resolvePatientTeamIdFromAssignments,
  salaOnCallR1,
  salaOnCallR2,
  serviceUsesStructuredComposition,
  stampPatientClinicalSala,
  userIsOnGuardiaCallToday,
  usesSalaR1LinePicker,
  validateTeamRankSlot
} from "/mobile/js/chunks/chunk-GPBMQXYE.js";
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
  shouldClaimClinicalUsername
} from "/mobile/js/chunks/chunk-LQTSNMET.js";
import {
  clinicalSessionContext,
  isDbMode,
  isWebClinicalClient,
  resolveClinicalSessionUserId
} from "/mobile/js/chunks/chunk-NMJNQQZG.js";
import {
  flushPendingClinicalOpsLanSnapshot,
  getClinicalOpsTrace,
  recordClinicalOpsTrace
} from "/mobile/js/chunks/chunk-PIQOYX4G.js";

// public/js/clinical-access-runtime/state.mjs
var vitalsLoop = null;
var sessionLocker = null;
function setVitalsLoop(loop) {
  vitalsLoop = loop;
}
function setSessionLocker(locker) {
  sessionLocker = locker;
}
var clinicalAccessBootDone = false;
var clinicalAccessBootWaiters = [];
function setClinicalAccessBootDone(value) {
  clinicalAccessBootDone = value;
}
function setClinicalAccessBootWaiters(waiters) {
  clinicalAccessBootWaiters = waiters;
}
var lastClinicalActivityTouchAt = 0;
var CLINICAL_ACTIVITY_TOUCH_MIN_MS = 60 * 1e3;
var clinicalActivityLanPushTimer = null;
function setLastClinicalActivityTouchAt(value) {
  lastClinicalActivityTouchAt = value;
}
function setClinicalActivityLanPushTimer(timer) {
  clinicalActivityLanPushTimer = timer;
}
var refreshClinicalPatientListForScopeInFlight = null;
function setRefreshClinicalPatientListForScopeInFlight(value) {
  refreshClinicalPatientListForScopeInFlight = value;
}
var clinicalOpsSyncedRefreshTimer = null;
function setClinicalOpsSyncedRefreshTimer(timer) {
  clinicalOpsSyncedRefreshTimer = timer;
}
function resetClinicalSessionContext() {
  clinicalSessionContext.user = null;
  clinicalSessionContext.guardias = [];
  clinicalSessionContext.guardiasMap = /* @__PURE__ */ new Map();
  clinicalSessionContext.orphanGuardias = [];
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
  clinicalSessionContext.decryptedPrivateKeyPem = null;
}

// public/js/clinical-access-runtime/boot-ready.mjs
function markClinicalAccessBootReady() {
  if (clinicalAccessBootDone) return;
  setClinicalAccessBootDone(true);
  const waiters = clinicalAccessBootWaiters;
  setClinicalAccessBootWaiters([]);
  for (const resolve of waiters) resolve();
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("rpc-clinical-access-ready"));
  }
}
function waitForClinicalAccessReady() {
  if (!isDbMode() || clinicalAccessBootDone) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 2e4);
    clinicalAccessBootWaiters.push(function() {
      clearTimeout(timer);
      resolve();
    });
  });
}

// public/js/clinical-privileges.mjs
function shouldEnforceTeamPatientMirror() {
  return isMobileWeb() || isWebClinicalClient();
}
function shouldUseCloudTeamPatientMirror(user) {
  if (shouldEnforceTeamPatientMirror()) return false;
  if (shouldUseElevatedPatientCensus(user)) return false;
  return isCloudSyncActive();
}
function shouldFilterPatientsByJoinedTeam(user) {
  if (shouldEnforceTeamPatientMirror()) return true;
  return shouldUseCloudTeamPatientMirror(user);
}
var CLINICAL_RANKS = /* @__PURE__ */ new Set(["R1", "R2", "R3", "R4"]);
function hasProgramAdminPrivileges(user) {
  if (!user) return false;
  if (user.is_program_admin === 1 || user.is_program_admin === true) return true;
  return String(user.rank || "") === "Admin";
}
function effectiveClinicalRank(user) {
  const rank = String(user?.rank || "R1");
  if (CLINICAL_RANKS.has(rank)) return rank;
  if (rank === "Admin") return "R1";
  return "R1";
}
function canConfigureRotation(user) {
  const rank = effectiveClinicalRank(user);
  if (rank === "R4") return true;
  return hasProgramAdminPrivileges(user);
}
function hasElevatedTeamPrivileges(user) {
  if (!user) return false;
  if (hasProgramAdminPrivileges(user)) return true;
  return effectiveClinicalRank(user) === "R4";
}
function shouldUseElevatedPatientCensus(user) {
  if (!hasElevatedTeamPrivileges(user)) return false;
  if (shouldEnforceTeamPatientMirror()) return false;
  return true;
}
function shouldShowClinicalCensusFilters(user) {
  if (!user?.user_id) return false;
  if (shouldUseElevatedPatientCensus(user)) return true;
  return shouldFilterPatientsByJoinedTeam(user);
}
function canViewLanUserDirectory(user) {
  return hasElevatedTeamPrivileges(user);
}
function canManageTeamRoster(user) {
  return hasElevatedTeamPrivileges(user);
}
function canDeleteLanDirectoryUser(user) {
  return canManageTeamRoster(user);
}

// public/js/clinical-scope-teams.mjs
function clinicalUsersById(snapshot) {
  const deleted = new Set((snapshot?.clinical_users_deleted || []).map((id) => String(id)));
  const map = /* @__PURE__ */ new Map();
  for (const row of snapshot?.clinical_users || []) {
    const id = String(row?.user_id || "").trim();
    if (!id || deleted.has(id)) continue;
    map.set(id, row);
  }
  return map;
}
function membershipRemovalKeys(snapshot) {
  const keys = /* @__PURE__ */ new Set();
  for (const row of snapshot?.team_membership_removals || []) {
    const teamId = String(row?.team_id || "").trim();
    const userId = String(row?.user_id || "").trim();
    if (teamId && userId) keys.add(`${teamId}\0${userId}`);
  }
  return keys;
}
function archivedTeamIds(snapshot) {
  const ids = /* @__PURE__ */ new Set();
  for (const row of snapshot?.teams || []) {
    if (row?.archived_at) ids.add(String(row.team_id || "").trim());
  }
  for (const row of snapshot?.teams_archived || []) {
    const id = String(row?.team_id || "").trim();
    if (id) ids.add(id);
  }
  return ids;
}
function effectiveTeamSala(team, usersById) {
  const direct = String(team?.sala || "").trim();
  if (direct) return direct;
  const createdBy = String(team?.created_by || "").trim();
  if (!createdBy) return "";
  const creator = usersById.get(createdBy);
  return creator?.sala ? String(creator.sala).trim() : "";
}
function buildTeamMemberRow(row, usersById) {
  const teamId = String(row?.team_id || "").trim();
  const userId = String(row?.user_id || "").trim();
  const profile = usersById.get(userId) || {};
  return {
    team_id: teamId,
    user_id: userId,
    sub_area_fraction: row.sub_area_fraction ?? null,
    username: profile.username ?? null,
    rank: profile.rank ?? null,
    clinical_name: profile.clinical_name ?? null
  };
}
function indexTeamMembers(snapshot, archived, removals) {
  const usersById = clinicalUsersById(snapshot);
  const membersByTeam = /* @__PURE__ */ new Map();
  for (const row of snapshot?.team_membership || []) {
    const teamId = String(row?.team_id || "").trim();
    const userId = String(row?.user_id || "").trim();
    if (!teamId || !userId || archived.has(teamId)) continue;
    if (removals.has(`${teamId}\0${userId}`)) continue;
    if (!membersByTeam.has(teamId)) membersByTeam.set(teamId, []);
    membersByTeam.get(teamId).push(buildTeamMemberRow(row, usersById));
  }
  return { usersById, membersByTeam };
}
function buildTeamsWithMembers(snapshot) {
  const archived = archivedTeamIds(snapshot);
  const removals = membershipRemovalKeys(snapshot);
  const { usersById, membersByTeam } = indexTeamMembers(snapshot, archived, removals);
  return (snapshot?.teams || []).filter((team) => {
    const teamId = String(team?.team_id || "").trim();
    return teamId && !archived.has(teamId);
  }).map((team) => {
    const teamId = String(team.team_id || "");
    const sala = effectiveTeamSala(team, usersById) || team.sala || null;
    return {
      ...team,
      sala,
      members: membersByTeam.get(teamId) || []
    };
  });
}

// public/js/clinical-scope-from-ops.mjs
function activeRotationCycle(snapshot) {
  const rows = (snapshot?.rotation_cycles || []).filter((row) => !row?.archived_at);
  if (!rows.length) return null;
  rows.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  return rows[0];
}
function activeGuardiasFromSnapshot(snapshot) {
  const resolved = new Set(
    (snapshot?.active_guardias_resolved || []).map((row) => String(row?.guardia_id || ""))
  );
  return (snapshot?.active_guardias || []).filter((row) => {
    const guardiaId = String(row?.guardia_id || "");
    if (!guardiaId || resolved.has(guardiaId)) return false;
    return String(row?.status || "Active") === "Active";
  });
}
function resolveClinicalUserRowFromOpsSnapshot(snapshot, hints = {}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const users = snapshot.clinical_users || [];
  const deleted = new Set((snapshot.clinical_users_deleted || []).map((id) => String(id)));
  const uid = String(hints.userId || "").trim();
  const uname = normalizeUsername(String(hints.username || "").replace(/^@/, ""));
  if (uid && !deleted.has(uid)) {
    const byId = users.find((row) => String(row?.user_id || "") === uid);
    if (byId) return byId;
  }
  if (uname) {
    const byUsername = users.find((row) => {
      const id = String(row?.user_id || "");
      if (!id || deleted.has(id)) return false;
      return normalizeUsername(row?.username) === uname;
    });
    if (byUsername) return byUsername;
  }
  if (uid) {
    const uidAsUsername = users.find((row) => {
      const id = String(row?.user_id || "");
      if (!id || deleted.has(id)) return false;
      return normalizeUsername(row?.username) === normalizeUsername(uid);
    });
    if (uidAsUsername) return uidAsUsername;
  }
  return null;
}
function buildClinicalScopeContextFromOpsSnapshot(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const deleted = new Set((snapshot.clinical_users_deleted || []).map((id) => String(id)));
  const users = (snapshot.clinical_users || []).filter((row) => {
    const id = String(row?.user_id || "");
    return id && !deleted.has(id);
  });
  return {
    teams: buildTeamsWithMembers(snapshot),
    guardias: activeGuardiasFromSnapshot(snapshot),
    cycle: activeRotationCycle(snapshot),
    assignments: Array.isArray(snapshot.patient_team_assignment) ? snapshot.patient_team_assignment.slice() : [],
    salaGuardiaToday: Array.isArray(snapshot.team_guardia_today) ? snapshot.team_guardia_today.slice() : [],
    users,
    guardiaMode: !!options.guardiaMode,
    entregaPhaseActive: !!options.entregaPhaseActive,
    enforceTeamPatientScope: !!options.enforceTeamPatientScope,
    now: options.now || (/* @__PURE__ */ new Date()).toISOString()
  };
}

// public/js/mobile-team-patient-scope.mjs
function joinedTeamIdsForUser(teams, userOrUserId) {
  const ids = /* @__PURE__ */ new Set();
  const joined = typeof userOrUserId === "string" ? getJoinedTeams(teams || [], userOrUserId) : getJoinedTeamsForUser(teams || [], userOrUserId || "");
  for (const team of joined) {
    const tid = String(team?.team_id || "").trim();
    if (tid) ids.add(tid);
  }
  return ids;
}
function isPatientAssignedToJoinedTeam(patientId, scopeContext, userOrUserId) {
  const joinedIds = joinedTeamIdsForUser(scopeContext?.teams, userOrUserId);
  if (!joinedIds.size) return false;
  const now = scopeContext?.now || (/* @__PURE__ */ new Date()).toISOString();
  const teamId = resolvePatientTeamIdFromAssignments(
    patientId,
    scopeContext?.assignments || [],
    now
  );
  return !!(teamId && joinedIds.has(teamId));
}
function isPatientVisibleOnMobileTeamMirror(user, patient, scopeContext, activeGuardia) {
  if (!user?.user_id || !patient?.id) return false;
  const pid = String(patient.id);
  const userId = String(user.user_id);
  if (isPatientAssignedToJoinedTeam(pid, scopeContext, user)) return true;
  if (activeGuardia && isActiveGuardiaCoveringUser(userId, activeGuardia)) return true;
  const guardias = Array.isArray(scopeContext?.guardias) ? scopeContext.guardias : [];
  return patientCoveredByGuardia(pid, userId, guardias);
}
function filterPatientsForMobileTeamMirror(patients2, user, scopeContext, guardiasMap) {
  if (!user?.user_id) return [];
  return (patients2 || []).filter((p) => {
    if (!p?.id) return false;
    const activeGuardia = guardiasMap && typeof guardiasMap.get === "function" ? guardiasMap.get(String(p.id)) || null : null;
    return isPatientVisibleOnMobileTeamMirror(user, p, scopeContext, activeGuardia);
  });
}
function patientRowForTeamMatch(patient) {
  return {
    id: String(patient?.id || ""),
    service: String(patient?.servicio || patient?.service || ""),
    sub_area: String(patient?.area || patient?.sub_area || ""),
    sala: patient?.sala
  };
}
function isUnassignedStructuralMatchOnJoinedTeam(user, patient, scopeContext) {
  const pid = String(patient?.id || "");
  if (!pid || patientHasExplicitTeamAssignment(pid, scopeContext?.assignments || [])) return false;
  const joined = getJoinedTeamsForUser(scopeContext?.teams || [], user);
  if (!joined.length) return false;
  return patientMatchesAnyJoinedTeam(patientRowForTeamMatch(patient), joined, String(user.user_id));
}
function isPatientVisibleOnDesktopCloudTeamScope(user, patient, scopeContext, activeGuardia) {
  if (!user?.user_id || !patient?.id) return false;
  if (isPatientVisibleOnMobileTeamMirror(user, patient, scopeContext, activeGuardia)) return true;
  return isUnassignedStructuralMatchOnJoinedTeam(user, patient, scopeContext);
}
function filterPatientsForDesktopCloudTeamScope(patients2, user, scopeContext, guardiasMap) {
  if (!user?.user_id) return [];
  return (patients2 || []).filter((p) => {
    if (!p?.id) return false;
    const activeGuardia = guardiasMap && typeof guardiasMap.get === "function" ? guardiasMap.get(String(p.id)) || null : null;
    return isPatientVisibleOnDesktopCloudTeamScope(user, p, scopeContext, activeGuardia);
  });
}

// lib/entrega/entrega-vitals-plan-core.mjs
function defaultFrequencySpec() {
  return { mode: "routine" };
}
function normalizeUntilTime(raw) {
  if (raw == null || raw === "") return null;
  const m = String(raw).trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const hh = Math.min(23, Math.max(0, Number(m[1])));
  const mm = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function clampHours(n) {
  const h = Math.round(Number(n));
  if (!Number.isFinite(h)) return 2;
  return Math.min(24, Math.max(1, h));
}
function clampShiftTimes(n) {
  const t = Math.round(Number(n));
  if (!Number.isFinite(t)) return 1;
  return Math.min(3, Math.max(1, t));
}

// lib/entrega/entrega-vitals-frequency-parse.mjs
var STRUCTURED_DB = /* @__PURE__ */ new Set(["None", "1h", "2h", "4h", "Shift_Once"]);
function clampHoursLocal(n) {
  return clampHours(n);
}
function clampShiftTimesLocal(n) {
  return clampShiftTimes(n);
}
function normalizeFrequencyObject(o) {
  const mode = String(o.mode || "routine");
  const untilTime = normalizeUntilTime(o.untilTime);
  if (mode === "interval") {
    return {
      mode: "interval",
      hours: clampHoursLocal(o.hours ?? 2),
      ...untilTime ? { untilTime } : {}
    };
  }
  if (mode === "shift") {
    return {
      mode: "shift",
      timesPerShift: clampShiftTimesLocal(o.timesPerShift ?? 1),
      ...untilTime ? { untilTime } : {}
    };
  }
  return defaultFrequencySpec();
}
function normalizeFrequencyLegacyString(t) {
  if (!t || t === "None") return defaultFrequencySpec();
  if (t === "Shift_Once") return { mode: "shift", timesPerShift: 1 };
  if (STRUCTURED_DB.has(t) && t.endsWith("h")) {
    return { mode: "interval", hours: clampHoursLocal(Number(t.replace("h", ""))) };
  }
  const lower = t.toLowerCase();
  if (/turno|por\s+turno/i.test(lower)) {
    const m = lower.match(/(\d+)\s*[x×]/);
    return { mode: "shift", timesPerShift: clampShiftTimesLocal(m ? Number(m[1]) : 1) };
  }
  const cada = lower.match(/cada\s*(\d+)\s*h|(\d+)\s*h|q\s*(\d+)\s*h|q(\d+)h/);
  if (cada) {
    const n = Number(cada[1] || cada[2] || cada[3] || cada[4]);
    return { mode: "interval", hours: clampHoursLocal(n) };
  }
  if (/rutina|evoluci[oó]n/i.test(lower)) return defaultFrequencySpec();
  return defaultFrequencySpec();
}

// lib/entrega/entrega-vitals-plan.mjs
var HOUR_PRESETS = [1, 2, 3, 4, 6, 8];
var VITALS_FREQ_HOUR_PRESETS = HOUR_PRESETS;
var VITALS_FREQ_SHIFT_OPTIONS = [1, 2, 3];
var VITALS_METRIC_KEYS = ["ta", "fc", "fr", "temp", "sat", "glu"];
var VITALS_METRIC_LABELS = {
  ta: "TA",
  fc: "FC",
  fr: "FR",
  temp: "Temp",
  sat: "Sat O\u2082",
  glu: "Glucometr\xEDa"
};
var DEFAULT_METRICS = Object.fromEntries(VITALS_METRIC_KEYS.map((k) => [k, true]));
function defaultVitalsPlan() {
  return { frequency: defaultFrequencySpec(), metrics: { ...DEFAULT_METRICS } };
}
function normalizeFrequencySpec(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeFrequencyObject(raw);
  }
  return normalizeFrequencyLegacyString(String(raw ?? "").trim());
}
function isVitalsFrequencyPaused(spec, now = /* @__PURE__ */ new Date()) {
  const norm = normalizeFrequencySpec(spec);
  if (!norm.untilTime) return false;
  const [hh, mm] = norm.untilTime.split(":").map(Number);
  const untilMins = hh * 60 + mm;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (untilMins < 12 * 60 && nowMins >= 12 * 60) return false;
  return nowMins >= untilMins;
}
function frequencyIntervalMs(spec) {
  const norm = normalizeFrequencySpec(spec);
  if (norm.mode === "interval") return clampHours(norm.hours ?? 2) * 36e5;
  if (norm.mode === "shift") {
    const times = clampShiftTimes(norm.timesPerShift ?? 1);
    return Math.floor(8 * 36e5 / times);
  }
  return null;
}
function vitalsFrequencyForDb(spec) {
  const norm = normalizeFrequencySpec(spec);
  if (norm.mode === "routine") return "None";
  if (norm.mode === "shift") return "Shift_Once";
  const h = clampHours(norm.hours ?? 2);
  if (h === 1) return "1h";
  if (h === 2) return "2h";
  if (h === 4) return "4h";
  return "None";
}
function untilSuffix(untilTime) {
  return untilTime ? ` \xB7 hasta ${untilTime}` : "";
}
function frequencyDisplayLabel(spec, now = /* @__PURE__ */ new Date()) {
  const norm = normalizeFrequencySpec(spec);
  if (isVitalsFrequencyPaused(norm, now)) {
    return `Finalizado${norm.untilTime ? ` (${norm.untilTime})` : ""}`;
  }
  if (norm.mode === "routine") return "Sin signos programados";
  if (norm.mode === "interval") {
    return `Cada ${clampHours(norm.hours ?? 2)} h${untilSuffix(norm.untilTime)}`;
  }
  const times = clampShiftTimes(norm.timesPerShift ?? 1);
  const base = times === 1 ? "1\xD7 por turno" : `${times}\xD7 por turno`;
  return `${base}${untilSuffix(norm.untilTime)}`;
}
function normalizeVitalsPlan(plan) {
  const base = defaultVitalsPlan();
  if (!plan || typeof plan !== "object") return base;
  const p = (
    /** @type {{ frequency?: unknown, metrics?: Record<string, boolean> }} */
    plan
  );
  base.frequency = normalizeFrequencySpec(p.frequency);
  for (const key of VITALS_METRIC_KEYS) {
    if (p.metrics && typeof p.metrics[key] === "boolean") {
      base.metrics[key] = p.metrics[key];
    }
  }
  return base;
}
function isStructuredVitalsFrequency(spec) {
  const norm = normalizeFrequencySpec(spec);
  return norm.mode === "interval" || norm.mode === "shift";
}
function vitalsStructuredMonitoringEnabled(plan) {
  const norm = normalizeVitalsPlan(plan);
  if (!VITALS_METRIC_KEYS.some((k) => norm.metrics[k])) return false;
  return isStructuredVitalsFrequency(norm.frequency);
}
function vitalsPlanSummary(plan) {
  const norm = normalizeVitalsPlan(plan);
  const enabled = VITALS_METRIC_KEYS.filter((k) => norm.metrics[k]);
  if (!enabled.length) return "Sin signos solicitados";
  const freqLabel = norm.frequency.mode === "routine" ? "sin signos en interno" : frequencyDisplayLabel(norm.frequency).toLowerCase();
  if (norm.frequency.mode === "routine") {
    return enabled.length ? `${enabled.map((k) => VITALS_METRIC_LABELS[k]).join(", ")} \xB7 ${freqLabel}` : "Sin signos en interno";
  }
  return `${enabled.map((k) => VITALS_METRIC_LABELS[k]).join(", ")} \xB7 ${freqLabel}`;
}

// lib/interno/vitals-banner.mjs
function calcVitalsBannerForSpec(last, frequencySpec) {
  const spec = normalizeFrequencySpec(frequencySpec);
  const label = frequencyDisplayLabel(spec);
  if (isVitalsFrequencyPaused(spec)) {
    return { str: label, cls: "nominal-gray" };
  }
  const ms = frequencyIntervalMs(spec);
  if (!ms) {
    return { str: label, cls: "nominal-gray" };
  }
  const due = new Date(last || Date.now()).getTime() + ms;
  const diff = due - Date.now();
  if (diff <= 0) return { str: "Signos vencidos", cls: "breached" };
  const mins = Math.floor(diff / 6e4);
  if (mins <= 15) {
    return { str: `Toca en: ${mins} min`, cls: "warning" };
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { str: `Toca en: ${h}h ${m}m`, cls: "nominal" };
}

// lib/entrega/entrega-handoff-vasopressor-core.mjs
var VASOPRESSOR_AGENTS = [
  { value: "norepinefrina", label: "Norepinefrina", short: "Nore" },
  { value: "vasopresina", label: "Vasopresina", short: "Vasopresina" }
];
var VASOPRESSOR_UNIT_LABELS = {
  mcg_kg_min: "mcg/kg/min",
  mcg_min: "mcg/min",
  ui_min: "UI/min"
};
var VASOPRESSOR_INFUSION_DEFAULTS = {
  norepinefrina: { dose: "0.05", unit: "mcg_kg_min" },
  vasopresina: { dose: "0.03", unit: "ui_min" }
};
var AGENT_ALIASES = {
  norepinefrina: "norepinefrina",
  nore: "norepinefrina",
  vasopresina: "vasopresina"
};
function normalizeVasopressorAgent(agent) {
  const key = String(agent || "").trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (key.includes("vasopres")) return "vasopresina";
  if (key.includes("nore") || key.includes("levophed")) return "norepinefrina";
  return AGENT_ALIASES[key] || "";
}
function defaultVasopressorInfusion(agent) {
  const norm = normalizeVasopressorAgent(agent);
  return VASOPRESSOR_INFUSION_DEFAULTS[norm] || {
    dose: "",
    unit: "mcg_kg_min"
  };
}
function coerceVasopressorUnit(agent, unit) {
  const normAgent = normalizeVasopressorAgent(agent);
  if (normAgent === "vasopresina") return "ui_min";
  if (unit === "mcg_min" || unit === "mcg_kg_min") return unit;
  return "mcg_kg_min";
}
function parseVasopressorRate(rate) {
  const raw = String(rate || "").trim();
  if (!raw) return { dose: "", unit: "mcg_kg_min" };
  const ui = raw.match(/([\d.]+)\s*UI\s*\/\s*min/i);
  if (ui) return { dose: ui[1], unit: "ui_min" };
  const perKg = raw.match(/([\d.]+)\s*mcg\s*\/\s*kg\s*\/\s*min/i);
  if (perKg) return { dose: perKg[1], unit: "mcg_kg_min" };
  const perMin = raw.match(/([\d.]+)\s*mcg\s*\/\s*min/i);
  if (perMin) return { dose: perMin[1], unit: "mcg_min" };
  const num2 = raw.match(/([\d.]+)/);
  return { dose: num2 ? num2[1] : "", unit: "mcg_kg_min" };
}
function formatVasopressorInfusion(vas) {
  const agent = normalizeVasopressorAgent(vas?.agent);
  const dose = String(vas?.dose || "").trim();
  const unit = coerceVasopressorUnit(agent, vas?.unit);
  if (!dose) return "";
  const agentLabel = VASOPRESSOR_AGENTS.find((a) => a.value === agent)?.short || VASOPRESSOR_AGENTS.find((a) => a.value === agent)?.label || "";
  const unitLabel = VASOPRESSOR_UNIT_LABELS[unit] || "";
  return [agentLabel, dose, unitLabel].filter(Boolean).join(" ");
}

// lib/entrega/entrega-handoff-vasopressor.mjs
function isVasopressorActive(vas) {
  return vas != null && "active" in vas ? !!vas.active : !!(vas?.agent || vas?.dose || vas?.rate);
}
function resolveVasopressorDose(vas, agent) {
  let dose = String(vas?.dose || "").trim();
  let unit = coerceVasopressorUnit(agent, vas?.unit);
  if (!dose && vas?.rate) {
    const parsed = parseVasopressorRate(vas.rate);
    dose = parsed.dose;
    if (!vas?.unit) unit = parsed.unit;
  }
  return { dose, unit };
}
function applyVasopressorDefaults(active, agent, dose) {
  let resolvedAgent = agent;
  let resolvedDose = dose;
  let unit = coerceVasopressorUnit(resolvedAgent, "");
  if (active && resolvedAgent && !resolvedDose) {
    const defaults = defaultVasopressorInfusion(resolvedAgent);
    resolvedDose = defaults.dose;
    unit = defaults.unit;
  }
  if (active && !resolvedAgent) {
    resolvedAgent = "norepinefrina";
    const defaults = defaultVasopressorInfusion(resolvedAgent);
    if (!resolvedDose) resolvedDose = defaults.dose;
    unit = defaults.unit;
  }
  return { agent: resolvedAgent, dose: resolvedDose, unit };
}
function normalizeVasopressor(vas) {
  const active = isVasopressorActive(vas);
  let agent = normalizeVasopressorAgent(vas?.agent);
  const { dose: parsedDose, unit: parsedUnit } = resolveVasopressorDose(vas, agent);
  const defaults = applyVasopressorDefaults(active, agent, parsedDose);
  agent = defaults.agent;
  const dose = defaults.dose || parsedDose;
  const unit = coerceVasopressorUnit(agent, parsedUnit || defaults.unit);
  return {
    active,
    agent,
    dose,
    unit,
    rate: formatVasopressorInfusion({ agent, dose, unit })
  };
}

// lib/entrega/entrega-handoff-context.mjs
var CLINICAL_STATUS_OPTIONS = [
  { value: "", label: "\u2014 Seleccionar \u2014" },
  { value: "stable", label: "Estable" },
  { value: "unstable", label: "Inestable" },
  { value: "critical", label: "Cr\xEDtico / deterioro" },
  { value: "postop", label: "Postoperatorio inmediato" }
];
var VENTILATION_MODES = [
  { value: "", label: "\u2014 Sin especificar \u2014" },
  { value: "room_air", label: "Ambiente / c\xE1nula nasal" },
  { value: "hfnc", label: "Alto flujo (LAF)" },
  { value: "niv", label: "VMNI" },
  { value: "invasive", label: "VMI" },
  { value: "other", label: "Otro soporte" }
];
function defaultHandoffContext() {
  const vaso = normalizeVasopressor({ active: false, agent: "norepinefrina" });
  return {
    clinicalStatus: "",
    signedRefusal: false,
    show: false,
    vasopressor: vaso,
    ventilation: { active: false, mode: "", fio2: "", settings: "" },
    notes: ""
  };
}
function normalizeVentilation(vent) {
  return {
    active: !!(vent.active || vent.mode || vent.fio2 || vent.settings),
    mode: String(vent.mode || "").trim(),
    fio2: String(vent.fio2 || "").trim(),
    settings: String(vent.settings || "").trim()
  };
}
function normalizeHandoffContext(raw, hints = {}) {
  const base = defaultHandoffContext();
  if (!raw || typeof raw !== "object") {
    if (hints.signedRefusal) base.signedRefusal = true;
    return base;
  }
  const vent = raw.ventilation && typeof raw.ventilation === "object" ? raw.ventilation : {};
  const status = String(raw.clinicalStatus || "");
  const allowed = new Set(CLINICAL_STATUS_OPTIONS.map((o) => o.value));
  return {
    clinicalStatus: allowed.has(status) ? status : "",
    signedRefusal: !!(raw.signedRefusal ?? hints.signedRefusal),
    show: !!(raw.show ?? raw.shock),
    vasopressor: normalizeVasopressor(raw.vasopressor),
    ventilation: normalizeVentilation(vent),
    notes: String(raw.notes || "").trim()
  };
}
function handoffContextSummary(ctx) {
  const norm = normalizeHandoffContext(ctx);
  const parts = [];
  const statusLabel = CLINICAL_STATUS_OPTIONS.find((o) => o.value === norm.clinicalStatus)?.label;
  if (statusLabel && norm.clinicalStatus) parts.push(statusLabel);
  if (norm.signedRefusal) parts.push("Negativas firmadas");
  if (norm.show) parts.push("Show");
  if (norm.vasopressor.active) {
    const v = formatVasopressorInfusion(norm.vasopressor);
    parts.push(v ? `Vasopresor: ${v}` : "Vasopresor");
  }
  if (norm.ventilation.active) {
    const modeLabel = VENTILATION_MODES.find((m) => m.value === norm.ventilation.mode)?.label;
    const v = [modeLabel, norm.ventilation.fio2 && `FiO\u2082 ${norm.ventilation.fio2}`].filter(Boolean).join(" \xB7 ");
    parts.push(v || "Ventilaci\xF3n");
  }
  if (norm.notes) parts.push(norm.notes);
  return parts.length ? parts.join(" \xB7 ") : "Sin resumen cl\xEDnico";
}

// lib/entrega/entrega-pendientes-parse.mjs
function newItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function emptyPendientesDoc() {
  return {
    version: 2,
    vitalsPlan: defaultVitalsPlan(),
    handoffContext: defaultHandoffContext(),
    items: []
  };
}
function normalizePendientesV2(parsed) {
  const census = parsed.patientCensus && typeof parsed.patientCensus === "object" ? {
    nombre: String(parsed.patientCensus.nombre || "").trim(),
    cuarto: String(parsed.patientCensus.cuarto || "").trim(),
    cama: String(parsed.patientCensus.cama || "").trim(),
    sala: String(parsed.patientCensus.sala || "").trim()
  } : null;
  return {
    version: 2,
    vitalsPlan: normalizeVitalsPlan(parsed.vitalsPlan),
    handoffContext: normalizeHandoffContext(parsed.handoffContext),
    ...census && (census.nombre || census.cuarto || census.cama) ? { patientCensus: census } : {},
    items: parsed.items.filter(Boolean)
  };
}
function normalizePendientesLegacyArray(lines) {
  return {
    version: 2,
    vitalsPlan: defaultVitalsPlan(),
    handoffContext: defaultHandoffContext(),
    items: lines.map((line) => String(line).trim()).filter(Boolean).map((text) => ({
      id: newItemId(),
      type: "legacy_text",
      text,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      completedAt: null
    }))
  };
}

// lib/entrega/entrega-pendientes.mjs
function newItemId2() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function createProcedimientoItem(partial) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: newItemId2(),
    type: "procedimiento",
    kind: partial.kind === "imagen" ? "imagen" : "otro",
    label: String(partial.label || "").trim(),
    scheduledAt: partial.scheduledAt || null,
    comentado: !!partial.comentado,
    autorizado: !!partial.autorizado,
    agendado: !!partial.agendado,
    requires: {
      familiar: !!partial.requires?.familiar,
      consentimiento: !!partial.requires?.consentimiento,
      anestesia: !!partial.requires?.anestesia
    },
    lockedBase: !!partial.lockedBase,
    createdBy: partial.createdBy || null,
    updatedAt: now,
    completedAt: null,
    completedBy: null
  };
}
function normalizePendientesJson(raw) {
  if (raw == null || raw === "") return emptyPendientesDoc();
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return emptyPendientesDoc();
  }
  if (parsed && parsed.version === 2 && Array.isArray(parsed.items)) {
    return normalizePendientesV2(parsed);
  }
  if (Array.isArray(parsed)) {
    return normalizePendientesLegacyArray(parsed);
  }
  return emptyPendientesDoc();
}
function buildEntregaPatientCensus(patient) {
  if (!patient || typeof patient !== "object") return null;
  const nombre = String(patient.nombre || patient.name || "").trim();
  const cuarto = String(patient.cuarto || "").trim();
  const cama = String(patient.cama || "").trim();
  const sala = String(patient.sala || "").trim();
  if (!nombre && !cuarto && !cama) return null;
  return { nombre, cuarto, cama, sala };
}
function serializePendientesJson(doc) {
  return JSON.stringify(normalizePendientesJson(doc));
}
function listActiveProcedimientos(doc) {
  return normalizePendientesJson(doc).items.filter(
    (it) => (it.type === "procedimiento" || it.type === "legacy_text") && !it.completedAt
  );
}
function pendingRequirementBadges(item) {
  const badges = [];
  if (item.requires?.consentimiento && !item.autorizado) badges.push("consentimiento");
  if (item.requires?.anestesia && !item.agendado) badges.push("anestesia");
  if (item.requires?.familiar && !item.comentado) badges.push("familiar");
  return badges;
}
function canDeletePendienteItem(item, actor) {
  if (actor.role === "diurno") return true;
  if (actor.role === "guardia") return !item.lockedBase;
  return false;
}

// lib/patient-bed-sort-key.mjs
function parseBedLabelSortKey(bedLabel) {
  if (!bedLabel || bedLabel === "\u2014") return null;
  const nums = bedLabel.match(/\d+/g);
  if (!nums?.length) return null;
  const n0 = parseInt(nums[0], 10);
  const n1 = nums.length > 1 ? parseInt(nums[1], 10) : 0;
  if (!Number.isFinite(n0)) return null;
  return n0 * 1e3 + (Number.isFinite(n1) ? n1 : 0);
}
function parseRoomBedSortKey(cuarto, cama) {
  const room = parseInt(String(cuarto || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(room)) return null;
  const bed = parseInt(String(cama || "").replace(/\D/g, ""), 10);
  return room * 1e3 + (Number.isFinite(bed) ? bed : 0);
}

// lib/patient-bed-sort.mjs
function patientBedSortKey(patient) {
  const fromRoom = parseRoomBedSortKey(patient?.cuarto, patient?.cama);
  if (fromRoom != null) return fromRoom;
  const bedLabel = String(patient?.bed_label || patient?.bedLabel || "").trim();
  const fromLabel = parseBedLabelSortKey(bedLabel);
  if (fromLabel != null) return fromLabel;
  return 999999;
}
function comparePatientsByBed(a, b) {
  const ka = patientBedSortKey(a);
  const kb = patientBedSortKey(b);
  if (ka !== kb) return ka - kb;
  return String(a?.nombre || a?.name || "").localeCompare(String(b?.nombre || b?.name || ""), "es");
}

// lib/patient-priority-sort.mjs
function patientClinicalPriorityRank(patient, guardiaMeta) {
  const g = guardiaMeta || {};
  if (g.is_critical === 1 || g.is_critical === true || patient?.isCritical) return 0;
  let status = "";
  if (g.pendientes_json) {
    const doc = normalizePendientesJson(g.pendientes_json);
    status = normalizeHandoffContext(doc.handoffContext).clinicalStatus;
  }
  if (status === "critical") return 0;
  if (status === "unstable") return 1;
  return 2;
}
function guardiaMetaForPatient(patient, guardiasMap) {
  const id = String(patient?.id || "");
  if (!id) return patient?.guardiaMeta || {};
  return guardiasMap?.get?.(id) || patient?.guardiaMeta || {};
}
function comparePatientsByPriorityThenBed(a, b, guardiasMap) {
  const ra = patientClinicalPriorityRank(a, guardiaMetaForPatient(a, guardiasMap));
  const rb = patientClinicalPriorityRank(b, guardiaMetaForPatient(b, guardiasMap));
  if (ra !== rb) return ra - rb;
  return comparePatientsByBed(a, b);
}
function sortPatientsByPriorityThenBed(patients2, guardiasMap) {
  return [...patients2 || []].sort((a, b) => comparePatientsByPriorityThenBed(a, b, guardiasMap));
}

// lib/interno/interno-board.mjs
function abbreviatePatientName(name) {
  const raw = String(name || "").trim().toUpperCase();
  if (!raw) return "\u2014";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 12);
  const last = parts[0];
  const firstInitial = parts[parts.length - 1].charAt(0);
  return `${last} ${firstInitial}.`.slice(0, 18);
}

// lib/entrega/entrega-chip-markers.mjs
var ENTREGA_CHIP_MARKERS = [
  { id: "critico", label: "CR", title: "Paciente cr\xEDtico" },
  { id: "negativas", label: "NF", title: "Negativas firmadas" },
  { id: "show", label: "SH", title: "Show" }
];
function entregaChipMarkerIds(guardia) {
  const critical = !!(guardia?.is_critical === 1 || guardia?.is_critical === true);
  const handoff = normalizeHandoffContext(
    normalizePendientesJson(guardia?.pendientes_json).handoffContext
  );
  const ids = [];
  if (critical) ids.push("critico");
  if (handoff.signedRefusal) ids.push("negativas");
  if (handoff.show) ids.push("show");
  return ids;
}
function resolveEntregaChipMarkers(markerIds) {
  const set = new Set(markerIds);
  return ENTREGA_CHIP_MARKERS.filter((m) => set.has(m.id));
}
function escAttr(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function buildEntregaMarkerSymbolsHtml(markerIds) {
  const markers = resolveEntregaChipMarkers(markerIds);
  if (!markers.length) return "";
  const chips = markers.map(
    (m) => `<span class="patient-chip-symbol patient-chip-symbol--${m.id}" title="${escAttr(m.title)}">${m.label}</span>`
  ).join("");
  return `<div class="patient-chip-symbols" role="group" aria-label="Marcadores de entrega">${chips}</div>`;
}

// public/js/features/unified-patient-grid-chip-html.mjs
function escapeChipAttr(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function vitalsBannerForGuardia(meta) {
  const doc = normalizePendientesJson(meta?.pendientes_json);
  return calcVitalsBannerForSpec(
    meta?.last_vitals_check,
    doc.vitalsPlan?.frequency ?? meta?.vitals_frequency
  );
}
function resolveChipVitalsSpec(meta) {
  if (meta?.pendientes_json) {
    return normalizePendientesJson(meta.pendientes_json).vitalsPlan?.frequency ?? meta?.vitals_frequency ?? null;
  }
  return meta?.vitals_frequency ?? null;
}
function patientChipBadgesHtml(p, meta, critical) {
  const dnr = p.negativa_maniobras_firmada ? '<span class="dnr-badge">DNR</span>' : "";
  const markerIds = Array.isArray(p.entregaMarkers) ? p.entregaMarkers : entregaChipMarkerIds(meta);
  const markerSymbols = buildEntregaMarkerSymbolsHtml(markerIds);
  const criticalHint = critical ? '<span class="patient-chip-critical-hint" title="Paciente cr\xEDtico">Cr\xEDtico</span>' : "";
  return markerSymbols + dnr + criticalHint;
}
function patientChipNameHtml(p) {
  const nameRaw = String(p.name || "").trim();
  const nameDisplay = nameRaw ? abbreviatePatientName(nameRaw) : "\u2014";
  const nameTitle = nameRaw ? escapeChipAttr(nameRaw) : "";
  return {
    display: nameDisplay,
    titleAttr: nameTitle ? ` title="${nameTitle}"` : ""
  };
}
function patientChipPendingLabel(pending) {
  if (pending <= 0) return "";
  return `<span class="patient-chip-tasks">${pending} pend.${pending === 1 ? "" : "s"}</span>`;
}
function patientChipLabsHtml(labsRaw) {
  const trimmed = String(labsRaw || "").trim();
  if (!trimmed || trimmed === "\u2014" || trimmed === "-") return "";
  return '<span class="patient-chip-labs" title="' + escapeChipAttr(trimmed) + '">' + trimmed + "</span>";
}
function patientChipFooterHtml(pending, labsRaw) {
  const pendingHtml = patientChipPendingLabel(pending);
  const labsHtml = patientChipLabsHtml(labsRaw);
  if (!pendingHtml && !labsHtml) return "";
  return '<div class="patient-chip-footer">' + pendingHtml + labsHtml + "</div>";
}
function buildPatientChipInnerHtml(p, g) {
  const meta = p.guardiaMeta || g;
  const critical = !!(p.isCritical || meta?.is_critical);
  const vitals = vitalsBannerForGuardia(meta);
  const bed = p.bed_label ? p.bed_label : "\u2014";
  const bedTitle = p.bed_label ? escapeChipAttr("Cama " + p.bed_label) : "";
  const name = patientChipNameHtml(p);
  const dx = String(p.dxText || "Sin diagn\xF3stico registrado");
  const pending = Number(p.pendingCount || 0);
  const labsRaw = String(p.labsSnippet || "").trim();
  const vitalsTitle = escapeChipAttr(vitals.str);
  const dxTitle = escapeChipAttr(dx);
  return {
    critical,
    innerHtml: '<div class="patient-chip-head"><span class="patient-chip-bed"' + (bedTitle ? ' title="' + bedTitle + '"' : "") + ">" + bed + '</span><div class="patient-chip-badges">' + patientChipBadgesHtml(p, meta, critical) + '</div></div><p class="patient-chip-name"' + name.titleAttr + ">" + name.display + '</p><p class="patient-chip-dx" title="' + dxTitle + '">' + dx + '</p><div class="patient-chip-vitals vitals-banner ' + vitals.cls + '" title="' + vitalsTitle + '"><span class="patient-chip-vitals__text">' + vitals.str + "</span></div>" + patientChipFooterHtml(pending, labsRaw),
    vitalsSpec: resolveChipVitalsSpec(meta),
    vitalsLast: String(meta?.last_vitals_check ?? "")
  };
}

// public/js/features/clinical-census-filters-ui.mjs
var CLINICAL_CENSUS_FILTERS_COLLAPSED_LS = "rpc.clinicalCensusFiltersCollapsed";
var CLINICAL_CENSUS_FILTER_TEAM_LS = "rpc.clinicalCensusFilterTeam";
var CENSUS_TEAM_FILTER_ALL = "__all__";
var CENSUS_TEAM_FILTER_UNASSIGNED = "__unassigned__";
function joinedTeamsForUser(teams, user) {
  const uid = String(user?.user_id || "");
  if (!uid) return [];
  return (teams || []).filter(
    (team) => (team.members || []).some((m) => String(m.user_id) === uid)
  );
}
function resolveActiveTeamFilterId(user, teams) {
  const joined = joinedTeamsForUser(teams, user);
  if (!joined.length) return "";
  if (joined.length === 1) return String(joined[0].team_id || "");
  const sala = String(user?.sala || "").trim();
  const inSala = joined.find((t) => String(t.sala || "") === sala);
  return String((inSala || joined[0]).team_id || "");
}
function readElevatedTeamFilterPreference(storage2 = globalThis.localStorage) {
  try {
    const raw = storage2?.getItem(CLINICAL_CENSUS_FILTER_TEAM_LS);
    if (raw === CENSUS_TEAM_FILTER_ALL) return { pinned: true, teamId: "" };
    if (raw) return { pinned: true, teamId: String(raw) };
  } catch (_e) {
    void _e;
  }
  return { pinned: false, teamId: "" };
}
function writeElevatedTeamFilterPreference(teamId, storage2 = globalThis.localStorage) {
  try {
    storage2?.setItem(
      CLINICAL_CENSUS_FILTER_TEAM_LS,
      teamId ? String(teamId) : CENSUS_TEAM_FILTER_ALL
    );
  } catch (_e) {
    void _e;
  }
}
function resolveElevatedTeamFilterId(user, teams, storage2 = globalThis.localStorage) {
  const pref = readElevatedTeamFilterPreference(storage2);
  if (pref.pinned) return pref.teamId;
  return "";
}
function censusFiltersUseFullTeamCatalog(user) {
  if (!shouldEnforceTeamPatientMirror()) return true;
  return hasElevatedTeamPrivileges(user);
}
function censusTeamCatalogForFilters(user, teams, salaFilter) {
  const salaScoped = filterTeamsForCensusSala(teams, salaFilter);
  if (censusFiltersUseFullTeamCatalog(user)) return salaScoped;
  return filterJoinedTeams(salaScoped, user);
}
function resolveCensusTeamFilterId(user, teamsForCatalog, priorTeamId = "", storage2 = globalThis.localStorage) {
  const prior = String(priorTeamId ?? "");
  const pref = readElevatedTeamFilterPreference(storage2);
  if (pref.pinned) return pref.teamId;
  if (prior) return prior;
  if (shouldEnforceTeamPatientMirror() && !censusFiltersUseFullTeamCatalog(user)) {
    return resolveActiveTeamFilterId(user, teamsForCatalog);
  }
  return resolveElevatedTeamFilterId(user, teamsForCatalog, storage2);
}
function isTeamIdInCensusCatalog(teamId, teams) {
  if (!teamId || teamId === CENSUS_TEAM_FILTER_UNASSIGNED) return true;
  return (teams || []).some((t) => String(t.team_id || "") === String(teamId));
}
function filterTeamsForCensusSala(teams, salaFilter) {
  const list = Array.isArray(teams) ? teams : [];
  const sala = String(salaFilter || "").trim();
  if (!sala || sala === "__all__") return list;
  return list.filter((t) => String(t.sala || "").trim() === sala);
}
function reconcileCensusTeamFilterForSala(teamId, teamsForSala) {
  const tid = String(teamId || "");
  if (!tid || tid === CENSUS_TEAM_FILTER_UNASSIGNED) return tid;
  if (isTeamIdInCensusCatalog(tid, teamsForSala)) return tid;
  return "";
}
function readCensusFiltersCollapsed(storage2 = globalThis.localStorage) {
  try {
    return storage2?.getItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS) === "1";
  } catch {
    return false;
  }
}
function writeCensusFiltersCollapsed(collapsed, storage2 = globalThis.localStorage) {
  try {
    if (collapsed) storage2?.setItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS, "1");
    else storage2?.removeItem(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS);
  } catch (_e) {
    void _e;
  }
}

// public/js/features/patients-clinical-filter.mjs
function patientForScopeEvaluate(p) {
  return {
    id: String(p?.id || ""),
    service: String(p?.servicio || p?.service || ""),
    sub_area: String(p?.area || p?.sub_area || ""),
    sala: p?.sala,
    interconsult_type: p?.interconsult_type
  };
}
function filterPatientsForClinicalSidebar(patients2, user, scopeContext, guardiasMap) {
  if (!user?.user_id) return shouldFilterPatientsByJoinedTeam(user) ? [] : patients2 || [];
  if (shouldFilterPatientsByJoinedTeam(user)) {
    if (shouldEnforceTeamPatientMirror()) {
      return filterPatientsForMobileTeamMirror(patients2, user, scopeContext, guardiasMap);
    }
    return filterPatientsForDesktopCloudTeamScope(patients2, user, scopeContext, guardiasMap);
  }
  if (shouldUseElevatedPatientCensus(user)) return patients2 || [];
  return (patients2 || []).filter((p) => {
    if (!p) return false;
    const mapped = patientForScopeEvaluate(p);
    const activeGuardia = guardiasMap && typeof guardiasMap.get === "function" ? guardiasMap.get(String(p.id)) || null : null;
    return isPatientReadableInClinicalScope(user, mapped, activeGuardia, scopeContext);
  });
}
function patientMatchesCensusTeamFilter(patient, teamId, teams, assignments, now) {
  const tid = String(teamId || "");
  if (!tid) return true;
  const patientId = String(patient?.id || "");
  if (tid === CENSUS_TEAM_FILTER_UNASSIGNED) {
    if (patient._noExplicitTeamAssignment != null) return patient._noExplicitTeamAssignment;
    return !patientHasExplicitTeamAssignment(patientId, assignments);
  }
  const team = (teams || []).find((t) => String(t.team_id || "") === tid);
  if (!team) return false;
  if (patient._filterTeamId != null) return patient._filterTeamId === tid;
  const assigned = resolvePatientTeamIdFromAssignments(patientId, assignments, now);
  if (assigned) return assigned === tid;
  return patientMatchesTeam(patientForScopeEvaluate(patient), team);
}
function resolvePatientCensusTeamId(patient, teams, assignments, now) {
  const patientId = String(patient?.id || "");
  const assigned = resolvePatientTeamIdFromAssignments(patientId, assignments, now);
  if (assigned) return assigned;
  const mapped = patientForScopeEvaluate(patient);
  for (const team of teams || []) {
    if (patientMatchesTeam(mapped, team)) {
      return String(team.team_id || "");
    }
  }
  return "";
}
function patientMatchesCensusSalaFilter(patient, sala, teams, assignments, now) {
  const target = String(sala || "").trim();
  if (!target) return true;
  if (String(patient?.sala || "").trim() === target) return true;
  if (resolvePatientSala(patient) === target) return true;
  const assignedTeamId = resolvePatientTeamIdFromAssignments(
    String(patient?.id || ""),
    assignments,
    now
  );
  if (!assignedTeamId) return false;
  const team = (teams || []).find((t) => String(t.team_id || "") === assignedTeamId);
  return String(team?.sala || "").trim() === target;
}
function applyElevatedPatientFilters(patients2, filters, ctx = {}) {
  let list = patients2 || [];
  const sala = filters.sala;
  const teams = ctx.teams || [];
  const assignments = ctx.assignments || [];
  const now = ctx.now || (/* @__PURE__ */ new Date()).toISOString();
  if (sala && sala !== "__all__") {
    list = list.filter((p) => patientMatchesCensusSalaFilter(p, sala, teams, assignments, now));
  }
  if (filters?.teamId === CENSUS_TEAM_FILTER_UNASSIGNED) {
    list = list.filter(
      (p) => patientMatchesCensusTeamFilter(p, CENSUS_TEAM_FILTER_UNASSIGNED, teams, assignments, now)
    );
  } else if (filters?.teamId) {
    list = list.filter(
      (p) => patientMatchesCensusTeamFilter(p, filters.teamId, teams, assignments, now)
    );
  }
  if (filters?.service) {
    const q = String(filters.service).toLowerCase();
    list = list.filter((p) => String(p.servicio || "").toLowerCase().includes(q));
  }
  return list;
}
function tagPatientsForTeamFilter(list, ctx = {}) {
  const assignments = ctx.assignments || [];
  const teams = ctx.teams || [];
  const now = ctx.now || (/* @__PURE__ */ new Date()).toISOString();
  for (const p of list) {
    if (!p) continue;
    p._filterTeamId = resolvePatientCensusTeamId(p, teams, assignments, now);
    p._noExplicitTeamAssignment = !patientHasExplicitTeamAssignment(
      String(p.id || ""),
      assignments
    );
  }
  return list;
}
function filterPatientsForGuardiaSalaScope(basePatients, user, scopeContext, guardiasMap) {
  const soloEntregados = !!(scopeContext && scopeContext.guardiaMode);
  const guardiaScope = {
    ...scopeContext || {},
    guardiaMode: true,
    enforceTeamPatientScope: soloEntregados
  };
  return (basePatients || []).filter(function(p) {
    if (!p) return false;
    const mapped = patientForScopeEvaluate(p);
    const activeGuardia = guardiasMap && typeof guardiasMap.get === "function" ? guardiasMap.get(String(p.id)) || null : null;
    return isPatientReadableInClinicalScope(user, mapped, activeGuardia, guardiaScope);
  });
}
function filterPatientsForGuardiaCensus(basePatients, user, scopeContext, guardiasMap, elevatedFilters = {}) {
  if (!user?.user_id) return basePatients || [];
  let visible;
  if (shouldUseElevatedPatientCensus(user)) {
    visible = basePatients || [];
  } else if (shouldEnforceTeamPatientMirror()) {
    visible = filterPatientsForClinicalSidebar(basePatients, user, scopeContext, guardiasMap);
  } else {
    visible = filterPatientsForGuardiaSalaScope(basePatients, user, scopeContext, guardiasMap);
  }
  const filterCtx = {
    teams: scopeContext.teams || [],
    assignments: scopeContext.assignments || [],
    now: scopeContext.now || (/* @__PURE__ */ new Date()).toISOString()
  };
  tagPatientsForTeamFilter(visible, filterCtx);
  return applyElevatedPatientFilters(visible, elevatedFilters, filterCtx);
}

// public/js/features/unified-patient-grid-team-groups.mjs
var GUARDIA_UNASSIGNED_TEAM_LABEL = "Sin equipo asignado";
function guardiaTeamGroupLabel(team) {
  const name = String(team?.name || team?.service || "").trim();
  return name || "Equipo";
}
function orderedTeamIdsWithPatients(teams, byTeamId) {
  const list = (teams || []).filter((t) => t && byTeamId.has(String(t.team_id || "")));
  list.sort((a, b) => {
    const salaA = String(a.sala || "").trim();
    const salaB = String(b.sala || "").trim();
    const ia = CLINICAL_SALA_VALUES.indexOf(salaA);
    const ib = CLINICAL_SALA_VALUES.indexOf(salaB);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    if (salaA !== salaB) return salaA.localeCompare(salaB, "es");
    return guardiaTeamGroupLabel(a).localeCompare(guardiaTeamGroupLabel(b), "es");
  });
  return list.map((t) => String(t.team_id || ""));
}
function partitionPatientsByTeam(patients2, teams, assignments, now) {
  const byTeamId = /* @__PURE__ */ new Map();
  const unassigned = [];
  for (const patient of patients2 || []) {
    if (!patient?.id) continue;
    const teamId = "censusTeamId" in patient ? String(patient.censusTeamId || "") : resolvePatientCensusTeamId(patient, teams, assignments, now);
    if (!teamId) {
      unassigned.push(patient);
      continue;
    }
    if (!byTeamId.has(teamId)) byTeamId.set(teamId, []);
    byTeamId.get(teamId).push(patient);
  }
  return { byTeamId, unassigned };
}
function buildKnownTeamGroups(teams, byTeamId, teamById) {
  const groups = [];
  for (const teamId of orderedTeamIdsWithPatients(teams, byTeamId)) {
    const team = teamById.get(teamId);
    groups.push({
      teamId,
      label: team ? guardiaTeamGroupLabel(team) : "Equipo",
      patients: byTeamId.get(teamId) || []
    });
    byTeamId.delete(teamId);
  }
  return groups;
}
function buildOrphanTeamGroups(byTeamId) {
  const groups = [];
  const orphanIds = [...byTeamId.keys()].sort((a, b) => a.localeCompare(b, "es"));
  for (const teamId of orphanIds) {
    groups.push({
      teamId,
      label: "Equipo",
      patients: byTeamId.get(teamId) || []
    });
  }
  return groups;
}
function buildGuardiaTeamCensusGroups(patients2, ctx = {}) {
  const teams = ctx.teams || [];
  const assignments = ctx.assignments || [];
  const now = ctx.now || (/* @__PURE__ */ new Date()).toISOString();
  const teamById = new Map(
    teams.filter((t) => t && t.team_id).map((t) => [String(t.team_id), t])
  );
  const { byTeamId, unassigned } = partitionPatientsByTeam(patients2, teams, assignments, now);
  const groups = buildKnownTeamGroups(teams, byTeamId, teamById);
  groups.push(...buildOrphanTeamGroups(byTeamId));
  if (unassigned.length) {
    groups.push({
      teamId: "",
      label: GUARDIA_UNASSIGNED_TEAM_LABEL,
      patients: unassigned
    });
  }
  return groups;
}

// public/js/features/unified-patient-grid-board.mjs
var R4_FOLLOWUP_PIN_LABEL = "Interconsultas \u2014 Seguimiento";
function filterR4FollowUpPinPatients(patients2) {
  return patients2.filter(
    (p) => p.interconsult_type === "Follow-up" && p.interconsult_status !== "Resolved"
  );
}
var UnifiedPatientGridBoard = class {
  /**
   * @param {string} domGridContainerId
   * @param {'GUARDIA'|'HANDOFF'} [appViewContext]
   */
  constructor(domGridContainerId, appViewContext = "GUARDIA") {
    this.container = typeof document !== "undefined" ? document.getElementById(domGridContainerId) : null;
    this.context = appViewContext;
    this.chipOpensEntrega = false;
    this.chipGuardiaPatientMenu = false;
    this.onChipClick = null;
  }
  /**
   * @param {'GUARDIA'|'HANDOFF'} appViewContext
   */
  setViewContext(appViewContext) {
    this.context = appViewContext === "HANDOFF" ? "HANDOFF" : "GUARDIA";
  }
  /**
   * @param {string} patientId
   */
  handleChipClick(patientId) {
    const id = String(patientId || "");
    if (!id) return;
    if (this.context === "HANDOFF" || this.chipOpensEntrega || this.chipGuardiaPatientMenu) {
      if (typeof this.onChipClick === "function") {
        this.onChipClick(id);
      }
      return;
    }
    const selectFn = (typeof window !== "undefined" && typeof window.selectPatient === "function" ? window.selectPatient : null) || (typeof globalThis.selectPatient === "function" ? globalThis.selectPatient : null);
    if (selectFn) selectFn(id);
  }
  /**
   * @param {Array<{ id: string, bed_label?: string, name?: string, service?: string, sub_area?: string, negativa_maniobras_firmada?: number, dxText?: string, pendingCount?: number, labsSnippet?: string, isCritical?: boolean, guardiaMeta?: object, censusTeamId?: string }>} patients
   * @param {Map<string, { is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }>} guardiasMap
   * @param {string} [userRank]
   * @param {{ teams?: object[], assignments?: object[], now?: string|Date|number }} [groupCtx]
   */
  drawCensusGrid(patients2, guardiasMap, userRank = "R1", groupCtx = {}) {
    if (!this.container) return;
    this.container.innerHTML = "";
    this.container.classList.add("patient-chips-grid", "patient-chips-grid--guardia");
    if (userRank === "R4") {
      this.drawElevatedTeamCensus(patients2, guardiasMap, groupCtx);
      return;
    }
    this.renderBatch(patients2, guardiasMap);
  }
  /**
   * @param {object[]} patients
   * @param {Map<string, object>} guardiasMap
   * @param {{ teams?: object[], assignments?: object[], now?: string|Date|number }} groupCtx
   */
  drawElevatedTeamCensus(patients2, guardiasMap, groupCtx) {
    const followUpPatients = filterR4FollowUpPinPatients(patients2);
    const followUpIds = new Set(followUpPatients.map((p) => p.id));
    if (followUpPatients.length > 0) {
      this.appendDivider(R4_FOLLOWUP_PIN_LABEL);
      this.renderBatch(followUpPatients, guardiasMap);
    }
    const rest = (patients2 || []).filter((p) => p?.id && !followUpIds.has(p.id));
    const groups = buildGuardiaTeamCensusGroups(rest, groupCtx);
    for (const group of groups) {
      if (!group.patients.length) continue;
      this.appendDivider(group.label);
      this.renderBatch(group.patients, guardiasMap);
    }
  }
  /**
   * @param {Array<{ id: string }>} patients
   * @param {Map<string, { is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }>} guardiasMap
   */
  renderBatch(patients2, guardiasMap) {
    const sorted = sortPatientsByPriorityThenBed(patients2, guardiasMap);
    sorted.forEach((p) => {
      if (this.container) {
        this.container.appendChild(this.compileChip(p, guardiasMap.get(p.id)));
      }
    });
  }
  /** @param {string} label */
  appendDivider(label) {
    if (!this.container) return;
    const div = document.createElement("div");
    div.className = "r4-section-divider";
    div.textContent = label;
    this.container.appendChild(div);
  }
  startVitalsTicker() {
    this.stopVitalsTicker();
    if (!this.container) return;
    this._vitalsTickerId = setInterval(() => {
      if (!this.container) return;
      this.container.querySelectorAll("[data-vitals-spec]").forEach((card) => {
        const specRaw = card.dataset.vitalsSpec;
        const last = card.dataset.vitalsLast || "";
        let spec = null;
        try {
          spec = specRaw ? JSON.parse(specRaw) : null;
        } catch (_e) {
          void _e;
        }
        const banner = calcVitalsBannerForSpec(last || null, spec);
        const el = card.querySelector(".patient-chip-vitals");
        if (!el) return;
        const textEl = el.querySelector(".patient-chip-vitals__text");
        if (textEl) textEl.textContent = banner.str;
        el.className = `patient-chip-vitals vitals-banner ${banner.cls}`;
      });
    }, 6e4);
  }
  stopVitalsTicker() {
    if (this._vitalsTickerId != null) {
      clearInterval(this._vitalsTickerId);
      this._vitalsTickerId = null;
    }
  }
  /**
   * @param {{ id: string, bed_label?: string, name?: string, negativa_maniobras_firmada?: number, dxText?: string, pendingCount?: number, labsSnippet?: string, isCritical?: boolean, guardiaMeta?: { last_vitals_check?: string, vitals_frequency?: string, is_critical?: number } }} p
   * @param {{ is_critical?: number, last_vitals_check?: string, vitals_frequency?: string }|undefined} g
   */
  compileChip(p, g) {
    const chip = buildPatientChipInnerHtml(p, g);
    const card = document.createElement("div");
    card.className = "patient-chip-card" + (chip.critical ? " priority-critical" : "");
    card.setAttribute("data-patient-id", p.id);
    card.dataset.vitalsSpec = JSON.stringify(chip.vitalsSpec ?? null);
    card.dataset.vitalsLast = chip.vitalsLast;
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    card.innerHTML = chip.innerHtml;
    card.addEventListener("click", () => {
      this.handleChipClick(p.id);
    });
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this.handleChipClick(p.id);
      }
    });
    return card;
  }
};

// public/js/features/clinical-rotation-config-submit.mjs
function dbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function readRotationConfigFormValues() {
  return {
    monthEndAt: String(document.getElementById("rotation-config-month-end")?.value || "").trim(),
    effectiveAt: String(document.getElementById("rotation-config-effective")?.value || "").trim(),
    previewDays: Number(document.getElementById("rotation-config-preview-days")?.value || 2)
  };
}
async function submitRotationConfigForm(toast9) {
  const { monthEndAt, effectiveAt, previewDays } = readRotationConfigFormValues();
  if (!monthEndAt || !effectiveAt) {
    toast9("Indica fin de mes y fecha de vigencia.", "error");
    return { ok: false };
  }
  const api2 = dbApi();
  if (!api2 || typeof api2.dbRotationCycleUpsert !== "function") {
    toast9("Base de datos no disponible.", "error");
    return { ok: false };
  }
  const res = await api2.dbRotationCycleUpsert({
    monthEndAt,
    effectiveAt,
    previewDays,
    createdBy: clinicalSessionContext.user?.user_id
  });
  if (!res || res.ok === false) {
    toast9(res?.error || "No se guard\xF3 la configuraci\xF3n.", "error");
    return { ok: false };
  }
  return { ok: true };
}

// public/js/features/clinical-rotation-rejoin-modal.mjs
var EVER_JOINED_KEY = "rpc-clinical-ever-joined-team";
var PENDING_REJOIN_KEY = "rpc-rotation-rejoin-pending";
var wired = false;
var lastJoinedCount = null;
function markClinicalEverJoinedTeam() {
  try {
    localStorage.setItem(EVER_JOINED_KEY, "1");
  } catch {
  }
}
function hasClinicalEverJoinedTeam() {
  try {
    return localStorage.getItem(EVER_JOINED_KEY) === "1";
  } catch {
    return false;
  }
}
function setRotationRejoinPending(pending) {
  try {
    if (pending) localStorage.setItem(PENDING_REJOIN_KEY, "1");
    else localStorage.removeItem(PENDING_REJOIN_KEY);
  } catch {
  }
}
function isRotationRejoinPending() {
  try {
    return localStorage.getItem(PENDING_REJOIN_KEY) === "1";
  } catch {
    return false;
  }
}
function shouldOfferRotationRejoin(opts = {}) {
  if (opts.localOnly) return false;
  const joined = Number(opts.joinedCount || 0);
  if (joined > 0) return false;
  if (opts.force) return true;
  if (opts.pending) return true;
  return !!opts.everJoined;
}
function buildRotationRejoinLeadHtml(user) {
  const elevated = hasElevatedTeamPrivileges(user);
  const sala = String(user?.sala || "").trim();
  if (elevated) {
    return "<p>Se archivaron los equipos del mes anterior" + (sala ? ` en <strong>${escapeHtml(sala)}</strong>` : "") + ". Confirma tu sala y <strong>crea o publica</strong> los equipos nuevos en Mi rotaci\xF3n para que el resto se una.</p>";
  }
  return "<p>Hay <strong>nueva rotaci\xF3n</strong>: los equipos anteriores ya no est\xE1n activos" + (sala ? ` (sala actual: <strong>${escapeHtml(sala)}</strong>)` : "") + ". Confirma tu sala del mes y \xFAnete a tu equipo en Mi rotaci\xF3n.</p>";
}
function currentJoinedCount() {
  return filterJoinedTeams(clinicalSessionContext.teams || [], clinicalSessionContext.user).length;
}
function backdropEl() {
  return document.getElementById("rotation-rejoin-backdrop");
}
function fillSalaSelect() {
  const select = document.getElementById("rotation-rejoin-sala");
  if (!(select instanceof HTMLSelectElement)) return;
  const current = String(clinicalSessionContext.user?.sala || "").trim();
  select.innerHTML = '<option value="">\u2014 Seleccionar sala \u2014</option>' + CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}"${s === current ? " selected" : ""}>${escapeHtml(s)}</option>`
  ).join("");
}
function fillLead() {
  const lead = document.getElementById("rotation-rejoin-lead");
  if (lead) lead.innerHTML = buildRotationRejoinLeadHtml(clinicalSessionContext.user);
}
function closeRotationRejoinModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
function openRotationRejoinModal() {
  const bd = backdropEl();
  if (!bd) return;
  fillLead();
  fillSalaSelect();
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  const select = document.getElementById("rotation-rejoin-sala");
  if (select instanceof HTMLSelectElement) select.focus();
}
async function maybeShowRotationRejoinModal(opts = {}) {
  if (typeof document === "undefined") return false;
  if (isClinicalLocalOnlyMode(readRpcSettings())) return false;
  try {
    await fetchClinicalTeamsFromDb();
  } catch {
  }
  const joinedCount = currentJoinedCount();
  lastJoinedCount = joinedCount;
  if (joinedCount > 0) {
    markClinicalEverJoinedTeam();
    setRotationRejoinPending(false);
    closeRotationRejoinModal();
    return false;
  }
  const offer = shouldOfferRotationRejoin({
    force: !!opts.force,
    joinedCount,
    everJoined: hasClinicalEverJoinedTeam(),
    pending: isRotationRejoinPending(),
    localOnly: false
  });
  if (!offer) return false;
  setRotationRejoinPending(true);
  openRotationRejoinModal();
  try {
    const main = await import("/mobile/js/chunks/clinical-onboarding-main-ZM6SYRA6.js");
    await main.refreshMainClinicalOnboardingIfNeeded?.();
  } catch {
  }
  return true;
}
async function persistSalaFromModal() {
  const select = document.getElementById("rotation-rejoin-sala");
  const sala = select instanceof HTMLSelectElement ? String(select.value || "").trim() : "";
  if (!sala) return { ok: false, error: "Elige tu sala." };
  const { persistProfileFromPanel: persistProfileFromPanel2 } = await import("/mobile/js/chunks/teams-roster-profile-persist-GOZFR6UO.js");
  const user = clinicalSessionContext.user || {};
  const ok = await persistProfileFromPanel2({
    clinicalName: String(user.clinical_name || ""),
    rank: String(user.rank || "R1"),
    sala,
    username: String(user.username || "")
  });
  return ok ? { ok: true, sala } : { ok: false, error: "No se pudo guardar la sala." };
}
async function handleOpenMiRotacion() {
  const saved = await persistSalaFromModal();
  if (!saved.ok) {
    if (typeof window.showToast === "function") window.showToast(saved.error || "Elige tu sala.", "error");
    return;
  }
  closeRotationRejoinModal();
  const { openClinicalTeamsPanel: openClinicalTeamsPanel2 } = await import("/mobile/js/chunks/teams-roster-YA5DDHZ5.js");
  await openClinicalTeamsPanel2();
}
async function onClinicalOpsMaybeRotationRejoin() {
  try {
    await fetchClinicalTeamsFromDb();
  } catch {
    return;
  }
  const n = currentJoinedCount();
  if (lastJoinedCount == null) {
    lastJoinedCount = n;
    if (n > 0) markClinicalEverJoinedTeam();
    if (n === 0 && (hasClinicalEverJoinedTeam() || isRotationRejoinPending())) {
      await maybeShowRotationRejoinModal();
    }
    return;
  }
  if (lastJoinedCount > 0 && n === 0) {
    setRotationRejoinPending(true);
    lastJoinedCount = 0;
    await maybeShowRotationRejoinModal({ force: true });
    return;
  }
  lastJoinedCount = n;
  if (n > 0) {
    markClinicalEverJoinedTeam();
    setRotationRejoinPending(false);
    closeRotationRejoinModal();
  }
}
function wireRotationRejoinModal() {
  if (wired || typeof document === "undefined") return;
  wired = true;
  const bd = backdropEl();
  if (bd) {
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) closeRotationRejoinModal();
    });
  }
  document.getElementById("rotation-rejoin-later")?.addEventListener("click", () => {
    closeRotationRejoinModal();
  });
  document.getElementById("rotation-rejoin-open")?.addEventListener("click", () => {
    void handleOpenMiRotacion();
  });
  document.addEventListener("rpc-guardia-rotation-changed", () => {
    void maybeShowRotationRejoinModal({ force: true });
  });
  document.addEventListener("rpc-clinical-ops-synced", () => {
    void onClinicalOpsMaybeRotationRejoin();
  });
  document.addEventListener("rpc-clinical-teams-changed", () => {
    const n = currentJoinedCount();
    if (n > 0) {
      markClinicalEverJoinedTeam();
      setRotationRejoinPending(false);
      closeRotationRejoinModal();
      lastJoinedCount = n;
    }
  });
}

// public/js/features/clinical-rotation.mjs
function toMillis(value) {
  if (value == null) return NaN;
  if (value instanceof Date) return value.getTime();
  return new Date(String(value)).getTime();
}
function isIncomingPreviewWindow(cycle, nowDate) {
  if (!cycle?.preview_start_at || !cycle?.effective_at) return false;
  const now = toMillis(nowDate);
  const start = toMillis(cycle.preview_start_at);
  const end = toMillis(cycle.effective_at);
  if (!Number.isFinite(now) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return now >= start && now < end;
}
function isChartLockedForPatient(assignment, nowDate) {
  if (!assignment?.effective_at) return false;
  const now = toMillis(nowDate);
  const effective = toMillis(assignment.effective_at);
  if (!Number.isFinite(now) || !Number.isFinite(effective)) return false;
  return now < effective;
}
function formatEffectiveLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso || "");
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function toast(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function dbApi2() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function canConfigureRotation2() {
  return canConfigureRotation(clinicalSessionContext.user);
}
function assignmentChipLabel(row) {
  const bed = String(row.bed_label || "").trim() || "\u2014";
  const dx = String(row.prognosis_classification || row.dxText || "").trim() || "Sin dx";
  return { bed, dx };
}
function renderIncomingStrip(assignments, opts = {}) {
  const host = document.getElementById("guardia-incoming-strip");
  if (!host) return;
  const rows = Array.isArray(assignments) ? assignments : [];
  if (!rows.length) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const chips = rows.map((row) => {
    const id = String(row.patient_id || row.id || "");
    const { bed, dx } = assignmentChipLabel(row);
    const locked = isChartLockedForPatient(row, now);
    return `<button type="button" class="guardia-incoming-chip" data-patient-id="${escapeAttr(id)}" data-effective-at="${escapeAttr(String(row.effective_at || ""))}" aria-label="Paciente entrante ${escapeAttr(bed)}, ${escapeAttr(dx)}${locked ? ", bloqueado hasta vigencia" : ""}">
        <span class="guardia-incoming-chip-bed">${escapeHtml(bed)}</span>
        <span class="guardia-incoming-chip-dx">${escapeHtml(dx)}</span>
      </button>`;
  }).join("");
  host.hidden = false;
  host.innerHTML = `
    <details class="guardia-incoming-details" open>
      <summary class="guardia-incoming-summary">Incoming <span class="guardia-incoming-count">${rows.length}</span></summary>
      <p class="guardia-incoming-hint">Vista previa de entregas \u2014 el expediente se abre al llegar la fecha de vigencia.</p>
      <div class="guardia-incoming-chips" role="list">${chips}</div>
    </details>`;
  const onLockedClick = opts.onLockedClick;
  host.querySelectorAll(".guardia-incoming-chip").forEach((btn, idx) => {
    const row = rows[idx];
    if (!btn || !row) return;
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (isChartLockedForPatient(row, /* @__PURE__ */ new Date())) {
        if (typeof onLockedClick === "function") onLockedClick(row);
        else toast(`Disponible el ${formatEffectiveLabel(String(row.effective_at || ""))}`, "info");
        return;
      }
    });
  });
}
function rotationModalEl() {
  return document.getElementById("guardia-rotation-config-backdrop");
}
function openRotationConfigModal() {
  if (!canConfigureRotation2()) {
    toast("Solo R4 o Admin pueden configurar la rotaci\xF3n.", "error");
    return;
  }
  const bd = rotationModalEl();
  if (!bd) return;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  const monthEnd = document.getElementById("rotation-config-month-end");
  if (monthEnd) monthEnd.focus();
}
function closeRotationConfigModal() {
  const bd = rotationModalEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
function wireRotationConfigFormOnce() {
  const form = document.getElementById("guardia-rotation-config-form");
  if (!form || form._rpcRotationConfigWired) return;
  form._rpcRotationConfigWired = true;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!canConfigureRotation2()) {
      toast("Solo R4 o Admin pueden configurar la rotaci\xF3n.", "error");
      return;
    }
    const res = await submitRotationConfigForm(toast);
    if (!res.ok) return;
    closeRotationConfigModal();
    toast("Configuraci\xF3n de rotaci\xF3n guardada.", "success");
    document.dispatchEvent(new CustomEvent("rpc-guardia-rotation-changed"));
  });
}
async function confirmNuevaRotacion() {
  const ok = window.confirm(
    "\xBFIniciar nueva rotaci\xF3n?\n\n\u2022 Se archivan todos los equipos activos\n\u2022 Se limpian las guardias del d\xEDa\n\u2022 Los residentes deben volver a crear equipos\n\nEsta acci\xF3n no se puede deshacer."
  );
  if (!ok) return { ok: false, cancelled: true };
  const api2 = dbApi2();
  const nuevaFn = api2 && (api2.dbRotationNueva || api2.rotationNueva);
  if (typeof nuevaFn !== "function") {
    toast("Base de datos no disponible.", "error");
    return { ok: false };
  }
  const res = await nuevaFn.call(api2, { userId: clinicalSessionContext.user?.user_id });
  if (!res || res.ok === false) {
    toast(res?.error || "No se aplic\xF3 la nueva rotaci\xF3n.", "error");
    return { ok: false };
  }
  toast("Nueva rotaci\xF3n aplicada. Cada residente debe unirse a su equipo nuevo.", "success");
  setRotationRejoinPending(true);
  try {
    await fetchClinicalTeamsFromDb();
  } catch {
  }
  const sala = String(clinicalSessionContext.user?.sala || "").trim();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { force: true, sala } }));
  document.dispatchEvent(new CustomEvent("rpc-guardia-rotation-changed"));
  try {
    const { publishClinicalTeamsAfterChange: publishClinicalTeamsAfterChange2 } = await import("/mobile/js/chunks/teams-guardia-bridge-FK2GGSR4.js");
    void publishClinicalTeamsAfterChange2({ sala });
  } catch {
  }
  await maybeShowRotationRejoinModal({ force: true });
  return { ok: true };
}
var rotationControlsWired = false;
function syncRotationConfigButton() {
  const configBtn = document.getElementById("btn-rotation-config-open");
  if (!configBtn) return;
  const allowed = canConfigureRotation2();
  configBtn.hidden = !allowed;
  configBtn.disabled = false;
  configBtn.title = allowed ? "Calendario de rotaci\xF3n del servicio (fin de mes, vigencia, vista previa)" : "";
}
function syncGuardiaRotationToolbar() {
  syncRotationConfigButton();
}
function wireRotationConfigOpenControl(root = document) {
  const btn = root.querySelector("#btn-rotation-config-open");
  if (!btn || btn._rpcRotationConfigOpenWired) return;
  btn._rpcRotationConfigOpenWired = true;
  btn.addEventListener("click", () => openRotationConfigModal());
}
function wireGuardiaRotationControls() {
  if (rotationControlsWired) return;
  rotationControlsWired = true;
  wireRotationConfigFormOnce();
  syncRotationConfigButton();
  wireRotationConfigOpenControl();
  wireRotationRejoinModal();
  void import("/mobile/js/chunks/teams-roster-inherit-patients-modal-4XQSLOCL.js").then(
    (m) => m.wireInheritPatientsModal()
  );
  const bd = rotationModalEl();
  if (bd) {
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) closeRotationConfigModal();
    });
  }
  const cancelBtn = document.getElementById("btn-rotation-config-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeRotationConfigModal());
}
function wireNuevaRotacionControl(root = document) {
  const btn = root.querySelector("#btn-nueva-rotacion");
  if (!btn || btn._rpcNuevaRotacionWired) return;
  btn._rpcNuevaRotacionWired = true;
  btn.addEventListener("click", () => void confirmNuevaRotacion());
}
async function syncGuardiaIncomingStrip(settings) {
  void settings;
  wireGuardiaRotationControls();
  const host = document.getElementById("guardia-incoming-strip");
  if (!host) return;
  const cycle = await fetchActiveRotationCycleFromDb();
  if (!cycle || !isIncomingPreviewWindow(cycle, /* @__PURE__ */ new Date())) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const assignments = await fetchIncomingAssignmentsFromDb();
  renderIncomingStrip(assignments, {
    onLockedClick: (row) => {
      toast(`Disponible el ${formatEffectiveLabel(String(row.effective_at || ""))}`, "info");
    }
  });
}

// public/js/features/clinical-panel-host.mjs
function getClinicalTeamsPanelHost() {
  const bd = document.getElementById("clinical-teams-backdrop");
  if (bd) {
    const scoped = bd.querySelector("#clinical-teams-panel-body");
    if (scoped) return scoped;
  }
  return document.getElementById("clinical-teams-panel-body");
}
function setClinicalTeamsPanelLoading() {
  const host = getClinicalTeamsPanelHost();
  if (host) {
    host.innerHTML = buildTextSkeletonPanel("clinical-teams-skeleton skel-panel", 3);
  }
}
function showClinicalTeamsPanelShell() {
  const bd = document.getElementById("clinical-teams-backdrop");
  if (!bd) return false;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  document.body.classList.add("clinical-teams-modal-open");
  setClinicalTeamsPanelLoading();
  return true;
}
function setClinicalTeamsPanelError(message) {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  host.innerHTML = `
    <p class="clinical-registration-error">${escapeHtml(message)}</p>
    <p class="clinical-teams-lead">Cierra este di\xE1logo y vuelve a abrir <strong>Mi rotaci\xF3n</strong>. Si sigue vac\xEDo, reinicia R+ por completo (Cmd+Q).</p>`;
}
async function safeRenderClinicalTeamsPanel(renderFn) {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  setClinicalTeamsPanelLoading();
  try {
    await renderFn(host);
  } catch (err) {
    console.error("[Mi rotaci\xF3n]", err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : "Error al cargar Mi rotaci\xF3n."
    );
  }
}
function delayMs(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function tryAutoOpenClinicalDb() {
  if (!isDbMode() || typeof window === "undefined") return false;
  const api2 = window.rplusDb || window.electronAPI;
  if (!api2 || typeof api2.dbAutoUnlock !== "function") return false;
  try {
    const res = await api2.dbAutoUnlock({ lsSnapshot: collectClinicalLsSnapshot() });
    return !!(res && res.ok !== false && res.state === "unlocked");
  } catch {
    return false;
  }
}
async function attemptClinicalPanelSessionWithDelays(settings, clientId, delaysMs) {
  async function attemptSession() {
    if (clinicalSessionContext.user?.user_id) return true;
    await tryAutoOpenClinicalDb();
    if (clinicalSessionContext.user?.user_id) return true;
    const ok = await bootstrapClinicalAccess(settings, clientId);
    return !!(ok && clinicalSessionContext.user?.user_id);
  }
  for (const ms of delaysMs) {
    if (ms > 0) await delayMs(ms);
    if (await attemptSession()) return true;
  }
  return false;
}
var INTERACTIVE_SESSION_DELAYS_MS = [0, 50, 150, 400];
async function ensureClinicalPanelSession(opts = {}) {
  if (clinicalSessionContext.user?.user_id) return true;
  if (!isDbMode()) return false;
  const settings = readRpcSettings();
  const clientId = resolveClinicalClientId(settings);
  const bootDelays = opts.interactive ? INTERACTIVE_SESSION_DELAYS_MS : getClinicalBootDelays();
  const dbReady = await ensureClinicalDbUnlocked();
  if (!dbReady.unlocked) return false;
  if (await attemptClinicalPanelSessionWithDelays(settings, clientId, bootDelays)) {
    return true;
  }
  try {
    const { applyClinicalDbUnlockCompletion } = await import("/mobile/js/chunks/db-unlock-EMEENIHK.js");
    await applyClinicalDbUnlockCompletion({ refreshOnboarding: false });
  } catch (err) {
    console.warn("[Mi rotaci\xF3n] clinical session recovery:", err && err.message);
  }
  if (clinicalSessionContext.user?.user_id) return true;
  await ensureClinicalDbUnlocked();
  return attemptClinicalPanelSessionWithDelays(settings, clientId, bootDelays);
}

// public/js/features/clinical-teams/teams-roster-lan-dom.mjs
function lanUsersModalBackdropEl() {
  return document.getElementById("clinical-lan-users-backdrop");
}
function lanUsersModalBodyEl() {
  return document.getElementById("clinical-lan-users-panel-body");
}
function isLanDirectoryModalOpen() {
  const bd = lanUsersModalBackdropEl();
  return !!(bd && bd.classList.contains("open"));
}

// public/js/features/clinical-teams/lan-directory-filters.mjs
function matchesQueryFilter(meta, filters) {
  const q = String(filters.query || "").trim().toLowerCase();
  return !q || String(meta.search || "").includes(q);
}
function matchesActivityFilter(meta, filters) {
  const activity = filters.activity || "all";
  if (activity === "active" && meta.activityTier !== "active") return false;
  if (activity === "inactive" && meta.activityTier === "active") return false;
  return true;
}
function matchesStatusFilter(meta, filters) {
  const status = filters.status || "all";
  if (status === "unassigned" && meta.hasTeam) return false;
  if (status === "assigned" && !meta.hasTeam) return false;
  return true;
}
function matchesSalaFilter(meta, filters) {
  const sala = String(filters.sala || "").trim();
  return !sala || String(meta.sala || "").trim() === sala;
}
function lanDirectoryUserMatchesFilters(meta, filters) {
  return matchesQueryFilter(meta, filters) && matchesActivityFilter(meta, filters) && matchesStatusFilter(meta, filters) && matchesSalaFilter(meta, filters);
}

// public/js/features/clinical-teams/teams-roster-lan-state.mjs
var lanDirRt = {
  teams: [],
  collapsedRanks: /* @__PURE__ */ new Set(),
  expandedRanks: /* @__PURE__ */ new Set(),
  lastFingerprint: "",
  lanPullLastAt: 0,
  ipcLastAt: 0,
  freezeAutoRefresh: false,
  filterQuery: "",
  filterStatus: "all",
  filterSala: "",
  filterActivity: "all"
};
var LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD = 4;
var LAN_DIRECTORY_IPC_MIN_MS = 4e3;
var LAN_DIRECTORY_FILTER_SELECT_IDS = /* @__PURE__ */ new Set([
  "clinical-lan-directory-status-filter",
  "clinical-lan-directory-sala-filter",
  "clinical-lan-directory-activity-filter"
]);
var LAN_USER_RANK_ORDER = ["R1", "R2", "R3", "R4", "Admin"];

// public/js/features/clinical-teams/teams-roster-lan-filters.mjs
function lanRankGroupKey(rank) {
  return String(rank || "").trim() || "Otros";
}
function shouldLanRankGroupOpen(rank, userCount) {
  const key = lanRankGroupKey(rank);
  if (lanDirRt.collapsedRanks.has(key)) return false;
  if (lanDirRt.expandedRanks.has(key)) return true;
  return userCount <= LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD;
}
function captureLanDirectoryCollapseState(host) {
  host.querySelectorAll("details.clinical-lan-rank-group").forEach((el) => {
    const key = String(el.dataset.lanRankGroup || "").trim();
    if (!key) return;
    const count = Number(el.dataset.lanRankCount) || 0;
    if (el.open) {
      lanDirRt.collapsedRanks.delete(key);
      if (count > LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD) {
        lanDirRt.expandedRanks.add(key);
      }
    } else {
      lanDirRt.collapsedRanks.add(key);
      lanDirRt.expandedRanks.delete(key);
    }
  });
}
function lanDirectorySalaFilterOptions(users, teams) {
  const salas = new Set(CLINICAL_SALAS);
  for (const u of users || []) {
    const sala = String(u?.sala || "").trim();
    if (sala) salas.add(sala);
  }
  for (const t of teams || []) {
    const sala = String(t?.sala || "").trim();
    if (sala) salas.add(sala);
  }
  return [...salas].sort((a, b) => a.localeCompare(b, "es"));
}
function renderLanDirectoryToolbarHtml(users, teams) {
  const salas = lanDirectorySalaFilterOptions(users, teams);
  const salaOptions = salas.map(
    (s) => `<option value="${escapeAttr(s)}"${lanDirRt.filterSala === s ? " selected" : ""}>${escapeHtml(s)}</option>`
  ).join("");
  const statusSelected = (value) => lanDirRt.filterStatus === value ? " selected" : "";
  const activitySelected = (value) => lanDirRt.filterActivity === value ? " selected" : "";
  return `
    <div class="clinical-lan-directory-toolbar">
      <label class="clinical-lan-directory-search-wrap">
        <span class="visually-hidden">Buscar usuario</span>
        <input type="search" id="clinical-lan-directory-search" class="profile-input clinical-lan-directory-search" placeholder="Buscar @usuario o nombre\u2026" value="${escapeAttr(lanDirRt.filterQuery)}" autocomplete="off">
      </label>
      <label class="clinical-lan-directory-filter">
        <span class="clinical-lan-directory-filter-label">Actividad</span>
        <select id="clinical-lan-directory-activity-filter" class="profile-input">
          <option value="all"${activitySelected("all")}>Todas</option>
          <option value="active"${activitySelected("active")}>Activos (24 h)</option>
          <option value="inactive"${activitySelected("inactive")}>Inactivos</option>
        </select>
      </label>
      <label class="clinical-lan-directory-filter">
        <span class="clinical-lan-directory-filter-label">Equipo</span>
        <select id="clinical-lan-directory-status-filter" class="profile-input">
          <option value="all"${statusSelected("all")}>Todos</option>
          <option value="unassigned"${statusSelected("unassigned")}>Sin equipo</option>
          <option value="assigned"${statusSelected("assigned")}>Con equipo</option>
        </select>
      </label>
      <label class="clinical-lan-directory-filter">
        <span class="clinical-lan-directory-filter-label">Sala</span>
        <select id="clinical-lan-directory-sala-filter" class="profile-input">
          <option value=""${lanDirRt.filterSala ? "" : " selected"}>Todas</option>
          ${salaOptions}
        </select>
      </label>
      <span class="clinical-lan-directory-match-count" aria-live="polite"></span>
    </div>`;
}
function applyLanDirectoryFilters(host) {
  const searchEl = host.querySelector("#clinical-lan-directory-search");
  const statusEl = host.querySelector("#clinical-lan-directory-status-filter");
  const salaEl = host.querySelector("#clinical-lan-directory-sala-filter");
  const activityEl = host.querySelector("#clinical-lan-directory-activity-filter");
  const countEl = host.querySelector(".clinical-lan-directory-match-count");
  if (searchEl instanceof HTMLInputElement) lanDirRt.filterQuery = searchEl.value;
  if (statusEl instanceof HTMLSelectElement) lanDirRt.filterStatus = statusEl.value;
  if (salaEl instanceof HTMLSelectElement) lanDirRt.filterSala = salaEl.value;
  if (activityEl instanceof HTMLSelectElement) lanDirRt.filterActivity = activityEl.value;
  const filters = {
    query: lanDirRt.filterQuery,
    status: lanDirRt.filterStatus,
    sala: lanDirRt.filterSala,
    activity: lanDirRt.filterActivity
  };
  let visible = 0;
  let total = 0;
  host.querySelectorAll(".clinical-lan-user-card").forEach((card) => {
    total += 1;
    const show = lanDirectoryUserMatchesFilters(
      {
        search: card.dataset.search || "",
        hasTeam: card.dataset.hasTeam === "1",
        sala: card.dataset.sala || "",
        activityTier: card.dataset.activityTier || "unknown"
      },
      filters
    );
    card.hidden = !show;
    card.classList.toggle("clinical-lan-user-card--filtered-out", !show);
    if (show) visible += 1;
  });
  host.querySelectorAll(".clinical-lan-rank-group").forEach((group) => {
    const cards = group.querySelectorAll(".clinical-lan-user-card");
    let visibleInGroup = 0;
    for (const card of cards) {
      if (!card.hidden) visibleInGroup += 1;
    }
    const groupCountEl = group.querySelector(".clinical-lan-rank-group-count");
    const totalInGroup = cards.length;
    if (groupCountEl) {
      groupCountEl.textContent = visibleInGroup === totalInGroup ? String(totalInGroup) : `${visibleInGroup}/${totalInGroup}`;
    }
    const anyVisible = visibleInGroup > 0;
    group.hidden = !anyVisible;
    group.classList.toggle("clinical-lan-rank-group--filtered-out", !anyVisible);
  });
  if (countEl) {
    countEl.textContent = visible === total ? `${total} usuarios` : `Mostrando ${visible} de ${total}`;
  }
}
function runLanDirectoryFiltersFromUi() {
  const host = lanUsersModalBodyEl();
  if (host?.querySelector(".clinical-lan-rank-groups")) applyLanDirectoryFilters(host);
}
function bindLanDirectoryFilterControls(host) {
  if (!host) return;
  if (host._lanDirFilterAbort) host._lanDirFilterAbort.abort();
  const ac = new AbortController();
  host._lanDirFilterAbort = ac;
  const { signal } = ac;
  const apply = () => applyLanDirectoryFilters(host);
  const searchEl = host.querySelector("#clinical-lan-directory-search");
  if (searchEl instanceof HTMLInputElement) {
    searchEl.addEventListener("input", apply, { signal });
    searchEl.addEventListener("search", apply, { signal });
  }
  for (const id of LAN_DIRECTORY_FILTER_SELECT_IDS) {
    const el = host.querySelector(`#${id}`);
    if (el instanceof HTMLSelectElement) el.addEventListener("change", apply, { signal });
  }
}
function ensureLanDirectoryFilterDelegation() {
  const bd = lanUsersModalBackdropEl();
  if (!bd || bd._rpcLanDirFilterDelegated) return;
  bd._rpcLanDirFilterDelegated = true;
  bd.addEventListener("input", (ev) => {
    if (!(ev.target instanceof HTMLInputElement)) return;
    if (ev.target.id !== "clinical-lan-directory-search") return;
    runLanDirectoryFiltersFromUi();
  });
  bd.addEventListener("change", (ev) => {
    if (!(ev.target instanceof HTMLSelectElement)) return;
    if (!LAN_DIRECTORY_FILTER_SELECT_IDS.has(ev.target.id)) return;
    runLanDirectoryFiltersFromUi();
  });
}

// lib/clinical-user-activity.mjs
var CLINICAL_USER_ACTIVITY_ACTIVE_MS = 24 * 60 * 60 * 1e3;
var CLINICAL_USER_ACTIVITY_RECENT_MS = 7 * 24 * 60 * 60 * 1e3;
function clinicalUserActivityTier(iso, nowMs = Date.now()) {
  const raw = String(iso || "").trim();
  if (!raw) return "unknown";
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts)) return "unknown";
  const age = nowMs - ts;
  if (age < 0) return "active";
  if (age <= CLINICAL_USER_ACTIVITY_ACTIVE_MS) return "active";
  if (age <= CLINICAL_USER_ACTIVITY_RECENT_MS) return "recent";
  return "stale";
}
function formatClinicalUserActivityAbsolute(iso) {
  const raw = String(iso || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  } catch {
    return raw;
  }
}
function formatClinicalUserLastActivity(iso, nowMs = Date.now()) {
  const tier = clinicalUserActivityTier(iso, nowMs);
  if (tier === "unknown") return "Sin actividad registrada";
  const ts = new Date(String(iso)).getTime();
  const diffMin = Math.floor((nowMs - ts) / 6e4);
  if (diffMin < 1) return "\xDAltima: ahora";
  if (diffMin < 60) return `\xDAltima: hace ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) {
    const mins = diffMin % 60;
    return mins ? `\xDAltima: hace ${hours} h ${mins} min` : `\xDAltima: hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return "\xDAltima: ayer";
  if (days < 7) return `\xDAltima: hace ${days} d`;
  return `\xDAltima: hace ${days} d`;
}
function formatClinicalUserActivityBadge(iso, nowMs = Date.now()) {
  const relative = formatClinicalUserLastActivity(iso, nowMs);
  const abs = formatClinicalUserActivityAbsolute(iso);
  if (!abs) return relative;
  return `${relative} \xB7 ${abs}`;
}
function clinicalUserActivityLabel(tier) {
  if (tier === "active") return "Hoy";
  if (tier === "recent") return "7 d";
  if (tier === "stale") return "Antigua";
  return "Sin registro";
}
function clinicalUserActivitySourceLabel(source) {
  const s = String(source || "").trim();
  if (s === "seed_created" || s === "created") return "Creado";
  if (s === "seed_last") return "Hist\xF3rico";
  if (s === "session") return "Sesi\xF3n";
  if (s === "save") return "Guardado";
  if (s === "claim") return "Registro";
  if (s === "sync") return "Sync";
  return s || "Uso";
}
function clinicalUserActivityHistoryEntries(history, maxPoints = 8) {
  const list = Array.isArray(history) ? history.slice() : [];
  if (!list.length) return { entries: [], total: 0, more: 0 };
  const max = Math.max(1, Number(maxPoints) || 8);
  const entries = list.slice(0, max).reverse().map((ev) => ({
    at: String(ev?.at || "").trim(),
    source: clinicalUserActivitySourceLabel(ev?.source || ""),
    atLabel: formatClinicalUserActivityAbsolute(ev?.at)
  })).filter((ev) => ev.atLabel || ev.source);
  return {
    entries,
    total: list.length,
    more: Math.max(0, list.length - max)
  };
}
function formatClinicalUserActivityHistory(history, maxPoints = 8) {
  const { entries, more } = clinicalUserActivityHistoryEntries(history, maxPoints);
  if (!entries.length) return "";
  const points = entries.map((ev) => {
    if (!ev.atLabel) return ev.source;
    return ev.source + " " + ev.atLabel;
  });
  const suffix = more > 0 ? " \xB7 +" + more : "";
  return "Historial: " + points.join(" \xB7 ") + suffix;
}

// public/js/features/clinical-teams/teams-roster-lan-row-html.mjs
function lanUserSearchHaystack(u, placement) {
  return [
    u?.username,
    u?.clinical_name,
    u?.sala,
    u?.rank,
    placement?.teamName,
    placement?.teamSala,
    placement?.cycle
  ].map((part) => String(part || "").trim()).filter(Boolean).join(" ").toLowerCase();
}
function formatLanUserPlacementLabel(placement, userRank) {
  if (!placement?.teamId) return "Sin equipo asignado";
  const parts = [placement.teamName || "Equipo"];
  if (placement.teamSala) parts.push(placement.teamSala);
  if (placement.cycle) {
    parts.push(formatLanCycleOptionLabel(placement.cycle, userRank || placement.rank));
  }
  return parts.join(" \xB7 ");
}
function renderLanUserHandleCell(u) {
  const rawHandle = normalizeUsername(u.username || "");
  const handleValid = isValidUsernameFormat(rawHandle) && !u.lanDirectoryPending;
  return handleValid ? `<span class="clinical-lan-users-handle">@${escapeHtml(rawHandle)}</span>` : `<span class="clinical-lan-users-handle clinical-lan-users-handle--pending" title="Falta registrar @usuario en Mi rotaci\xF3n">sin @usuario</span>`;
}
function renderLanUserPlacementShort(placement, userRank) {
  const hasTeam = Boolean(placement?.teamId);
  if (!hasTeam) {
    return '<span class="clinical-lan-users-placement clinical-lan-users-placement--none">Sin equipo asignado</span>';
  }
  return escapeHtml(
    [placement.teamName, placement.cycle ? formatLanCycleOptionLabel(placement.cycle, userRank) : ""].filter(Boolean).join(" \xB7 ")
  );
}
function lanUserCardActivityMeta(u) {
  const activityIso = String(u.last_activity_at || "").trim();
  const activityTier = clinicalUserActivityTier(activityIso);
  return {
    activityIso,
    activityTier,
    activityLabel: escapeHtml(clinicalUserActivityLabel(activityTier)),
    activityDetail: escapeHtml(formatClinicalUserLastActivity(activityIso))
  };
}
function lanUserCardAssignMeta(u, placement, teamList, userRank) {
  const userId = escapeAttr(String(u.user_id || ""));
  const teamOptions = renderLanAssignTeamOptionsHtml(teamList, placement?.teamId);
  const cycleOptions = placement?.cycle ? `<option value="${escapeAttr(placement.cycle)}" selected>${escapeHtml(formatLanCycleOptionLabel(placement.cycle, userRank))}</option>` : '<option value="">\u2014 Ciclo \u2014</option>';
  return { userId, teamOptions, cycleOptions };
}
function assembleLanUserRowArticle(ctx) {
  const {
    u,
    userId,
    rawUserId,
    name,
    rankRaw,
    placement,
    placementLabel,
    teamOptions,
    cycleOptions,
    placementShort,
    activityTier,
    activityLabel,
    activityDetail,
    searchHaystack,
    salaAttr,
    deleteBtnClass,
    deleteBtnAttrs,
    salaLabel
  } = ctx;
  return `<article class="clinical-lan-user-card clinical-lan-user-row" data-user-id="${userId}" data-user-rank="${rankRaw}" data-preferred-cycle="${escapeAttr(placement?.cycle || "")}" data-sala="${salaAttr}" data-has-team="${placement?.teamId ? "1" : "0"}" data-activity-tier="${escapeAttr(activityTier)}" data-search="${searchHaystack}">
    <div class="clinical-lan-user-card-main">
      <div class="clinical-lan-user-card-identity">
        ${renderLanUserHandleCell(u)}
        <span class="clinical-lan-users-name" title="${name}">${name}</span>
        <span class="clinical-lan-user-sala-chip">${salaLabel}</span>
        <span class="clinical-lan-user-activity-chip clinical-lan-user-activity-chip--${escapeAttr(activityTier)}" title="${activityDetail}">${activityLabel}</span>
      </div>
      <p class="clinical-lan-user-card-placement" title="${placementLabel}">${placementShort}</p>
      <p class="clinical-lan-user-card-activity">${activityDetail}</p>
    </div>
    <div class="clinical-lan-user-card-assign">
      <label class="visually-hidden" for="clinical-lan-team-${userId}">Equipo</label>
      <select id="clinical-lan-team-${userId}" class="profile-input clinical-lan-assign-team" title="Asignar equipo">${teamOptions}</select>
      <label class="visually-hidden" for="clinical-lan-cycle-${userId}">Ciclo</label>
      <select id="clinical-lan-cycle-${userId}" class="profile-input clinical-lan-assign-cycle" title="Ciclo del integrante" ${placement?.teamId ? "" : "disabled"}>
        ${cycleOptions}
      </select>
      <span class="clinical-lan-assign-actions" role="group" aria-label="Acciones">
        <button type="button" class="btn-save clinical-lan-assign-btn" data-user-id="${userId}">Asignar</button>
        <button type="button" class="btn-med-secondary clinical-lan-delete-user-btn${deleteBtnClass}" data-user-id="${userId}" data-user-label="${escapeAttr(String(u.clinical_name || normalizeUsername(u.username || "") || rawUserId))}" title="Quitar de la base cl\xEDnica (se publica por R+ Cloud)"${deleteBtnAttrs}>Quitar</button>
      </span>
    </div>
  </article>`;
}
function renderLanUserRowHtml(u, teamList, opts = {}) {
  const rawUserId = String(u.user_id || "").trim();
  const canDelete = !!opts.canDelete && rawUserId && rawUserId !== String(opts.callerUserId || "").trim();
  const name = escapeHtml(String(u.clinical_name || "").trim() || "Sin nombre");
  const rankRaw = escapeAttr(String(u.rank || "R1"));
  const userRank = String(u.rank || "R1");
  const salaLabel = escapeHtml(String(u.sala || "").trim() || "\u2014");
  const placement = resolveLanUserPlacement(u.user_id, teamList);
  const placementLabel = escapeHtml(formatLanUserPlacementLabel(placement, userRank));
  const { userId, teamOptions, cycleOptions } = lanUserCardAssignMeta(u, placement, teamList, userRank);
  const placementShort = renderLanUserPlacementShort(placement, userRank);
  const { activityIso, activityTier, activityLabel, activityDetail } = lanUserCardActivityMeta(u);
  const searchHaystack = escapeAttr(
    `${lanUserSearchHaystack(u, placement)} ${formatClinicalUserLastActivity(activityIso)}`.toLowerCase()
  );
  const salaAttr = escapeAttr(String(u.sala || "").trim());
  const deleteBtnClass = canDelete ? "" : " clinical-lan-delete-user-btn--placeholder";
  const deleteBtnAttrs = canDelete ? "" : ' disabled tabindex="-1" aria-hidden="true"';
  return assembleLanUserRowArticle({
    u,
    userId,
    rawUserId,
    name,
    rankRaw,
    userRank,
    salaLabel,
    placement,
    placementLabel,
    teamOptions,
    cycleOptions,
    placementShort,
    activityTier,
    activityLabel,
    activityDetail,
    searchHaystack,
    salaAttr,
    deleteBtnClass,
    deleteBtnAttrs
  });
}

// public/js/features/clinical-teams/teams-roster-lan-render.mjs
function renderLanUsersDirectoryTopButtonHtml(user) {
  if (!canViewLanUserDirectory(user)) return "";
  return `<button type="button" class="btn-med-secondary clinical-teams-open-lan-users-btn" id="btn-open-lan-users-directory">Directorio LAN</button>`;
}
function renderLanUsersDirectoryEntryHtml(user) {
  return renderLanUsersDirectoryTopButtonHtml(user);
}
function cycleLettersForAssign(team, userRank) {
  const service = String(team?.service || "Sala");
  const rank = String(userRank || "R1");
  return getCycleLetterOptionsForRank(service, rank);
}
function renderLanAssignTeamOptionsHtml(teams, selectedTeamId) {
  const list = Array.isArray(teams) ? teams : [];
  const selected = String(selectedTeamId || "").trim();
  if (!list.length) {
    return '<option value="">\u2014 Sin equipos \u2014</option>';
  }
  return '<option value="">\u2014 Equipo \u2014</option>' + list.map((team) => {
    const id = escapeAttr(String(team.team_id || ""));
    const label = escapeHtml(
      `${String(team.name || "Equipo").trim()} \xB7 ${String(team.sala || "").trim() || "Sala"}`
    );
    const members = Array.isArray(team.members) ? team.members.length : 0;
    const isSelected = selected && id === selected ? " selected" : "";
    return `<option value="${id}"${isSelected}>${label} (${members})</option>`;
  }).join("");
}
function resolveLanUserPlacement(userId, teams) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  for (const team of teams || []) {
    const member = (team.members || []).find((m) => String(m.user_id || "") === uid);
    if (!member) continue;
    return {
      teamId: String(team.team_id || ""),
      teamName: String(team.name || "Equipo").trim(),
      teamSala: String(team.sala || "").trim(),
      cycle: String(member.sub_area_fraction || "").trim(),
      rank: String(member.rank || "")
    };
  }
  return null;
}
function groupLanUsersByRank(users) {
  const groups = new Map(LAN_USER_RANK_ORDER.map((rank) => [rank, []]));
  const other = [];
  for (const user of users) {
    const rank = String(user?.rank || "R1");
    if (groups.has(rank)) groups.get(rank).push(user);
    else other.push(user);
  }
  return { groups, other };
}
function formatLanCycleOptionLabel(letter, userRank) {
  const frac = String(letter || "").trim();
  if (!frac) return "\u2014 Ciclo \u2014";
  const rank = String(userRank || "").trim();
  if (/^[A-D][12]$/i.test(frac)) return `Subciclo R1 \xB7 ${frac.toUpperCase()}`;
  if (rank === "R1") return `Subciclo R1 \xB7 ${frac}`;
  if (rank === "R2") return `Ciclo R2 \xB7 ${frac}`;
  if (rank === "R3") return `Ciclo R3 \xB7 ${frac}`;
  if (rank === "R4") return `Ciclo R4 \xB7 ${frac}`;
  if (/^[A-F]$/i.test(frac)) return `Ciclo R2 \xB7 ${frac}`;
  return `Ciclo \xB7 ${frac}`;
}
function renderLanDirectoryEmptyStateHtml(users) {
  const trace = getClinicalOpsTrace();
  const lastGet = trace.find(function(e) {
    return e.boundary === "get" && e.data && e.data.ok === true;
  });
  const lastMerge = trace.find(function(e) {
    return e.boundary === "merge";
  });
  const hostUsers = Number(lastGet?.data?.incomingUsers || 0);
  const mergeDeferred = lastMerge?.data?.deferred === true || lastMerge?.data?.code === "DB_LOCKED";
  let hostHint = "";
  if (hostUsers > 0 && (!users || !users.length)) {
    if (mergeDeferred) {
      hostHint = '<p class="clinical-teams-empty">El anfitri\xF3n reporta <strong>' + hostUsers + "</strong> perfil(es) registrados, pero la base cl\xEDnica no pudo fusionarlos (sesi\xF3n bloqueada). Desbloquea la base cl\xEDnica y pulsa <strong>Actualizar desde \u21C4</strong>.</p>";
    } else {
      hostHint = '<p class="clinical-teams-empty">El anfitri\xF3n ya tiene <strong>' + hostUsers + "</strong> perfil(es) en \u21C4, pero a\xFAn no aparecen en esta Mac. Con LiveSync conectado, pulsa <strong>Actualizar desde \u21C4</strong>.</p>";
    }
  }
  return hostHint + '<p class="clinical-teams-empty">A\xFAn no hay otros @usuario en esta Mac. Cada residente debe conectarse a tu LAN, abrir <strong>\u21C4 \u2192 Unirse</strong> en la misma sala y guardar <strong>Mi rotaci\xF3n \u2192 Guardar perfil</strong>. Luego los asignas al equipo desde aqu\xED (no hace falta que ya tengan equipo).</p>';
}
function renderLanUsersModalBodyHtml(users, teams, opts = {}) {
  const list = Array.isArray(users) ? users : [];
  const teamList = Array.isArray(teams) ? teams : [];
  const rowOpts = {
    canDelete: !!opts.canDelete,
    callerUserId: String(opts.callerUserId || "")
  };
  if (!list.length) {
    return renderLanDirectoryEmptyStateHtml(list);
  }
  const { groups, other } = groupLanUsersByRank(list);
  const rankSections = LAN_USER_RANK_ORDER.map((rank) => {
    const usersInRank = groups.get(rank) || [];
    if (!usersInRank.length) return "";
    const openAttr = shouldLanRankGroupOpen(rank, usersInRank.length) ? " open" : "";
    return `<details class="clinical-lan-rank-group"${openAttr} data-lan-rank-group="${escapeAttr(rank)}" data-lan-rank-count="${usersInRank.length}">
      <summary class="clinical-lan-rank-group-summary">
        <span class="clinical-lan-rank-group-title">${escapeHtml(rank)}</span>
        <span class="clinical-lan-rank-group-count">${usersInRank.length}</span>
      </summary>
      <div class="clinical-lan-user-cards">
        ${usersInRank.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join("")}
      </div>
    </details>`;
  }).join("");
  const otherSection = other.length ? `<details class="clinical-lan-rank-group"${shouldLanRankGroupOpen("Otros", other.length) ? " open" : ""} data-lan-rank-group="Otros" data-lan-rank-count="${other.length}">
        <summary class="clinical-lan-rank-group-summary">
          <span class="clinical-lan-rank-group-title">Otros</span>
          <span class="clinical-lan-rank-group-count">${other.length}</span>
        </summary>
        <div class="clinical-lan-user-cards">
          ${other.map((u) => renderLanUserRowHtml(u, teamList, rowOpts)).join("")}
        </div>
      </details>` : "";
  const teamsHint = teamList.length ? "" : '<p class="clinical-teams-empty">Crea un equipo vac\xEDo en Mi rotaci\xF3n para poder asignar residentes.</p>';
  return `
    <div class="clinical-lan-directory-head">
      <p class="clinical-lan-users-modal-lead">Asigna residentes a equipos activos en esta Mac. <strong>Actualizar desde \u21C4</strong> trae usuarios de todas las salas (Sala 1\u2013E, Interconsultas, UX, Eme, etc.).
        <button type="button" class="btn-med-secondary clinical-lan-directory-refresh-btn">Actualizar desde \u21C4</button>
      </p>
      ${renderLanDirectoryToolbarHtml(list, teamList)}
    </div>
    ${teamsHint}
    <div class="clinical-lan-rank-groups">${rankSections}${otherSection}</div>`;
}

// public/js/features/clinical-teams/teams-guardia-bridge.mjs
async function publishClinicalTeamsToLan() {
  try {
    const mod = await import("/mobile/js/chunks/mutate-bridge-clinical-ops-2EDFEEJT.js");
    if (typeof mod.pushCloudClinicalOpsNow === "function") {
      return mod.pushCloudClinicalOpsNow();
    }
  } catch {
  }
  return { ok: false, code: "NO_CLOUD" };
}
function toastTeamLanPublishResult(lanPush, localOkMessage) {
  if (!lanPush) {
    toast2(localOkMessage, "success");
    return;
  }
  if (lanPush.ok && (lanPush.code === "QUEUED" || lanPush.channels && lanPush.channels.outbox)) {
    toast2(
      `${localOkMessage} Se publicar\xE1 a la sala cuando vuelva la red (cola \u21C4).`,
      "info"
    );
    return;
  }
  if (lanPush.ok) {
    if (lanPush.code === "CONFLICT_RESOLVED") {
      toast2(`${localOkMessage} Directorio alineado con el servidor.`, "success");
      return;
    }
    if (lanPush.channels && lanPush.channels.http) {
      toast2(`${localOkMessage} Publicado en sala \u21C4.`, "success");
      return;
    }
    toast2(localOkMessage, "success");
    return;
  }
  if (isBenignLanPushSkipCode(lanPush.code)) {
    toast2(`${localOkMessage} (solo en esta Mac hasta conectar sala \u21C4).`, "info");
    return;
  }
  toast2(LAN_PROFILE_PUSH_FAILED_MSG, "warn");
}
var CLOUD_CLINICAL_OPS_PULL_MIN_MS = 12e3;
var cloudClinicalOpsPullLastAt = 0;
var cloudClinicalOpsPullInFlight = null;
function resolveCloudDirectorySalas(options = {}) {
  const salas = /* @__PURE__ */ new Set();
  const browse = normalizeCloudSala(options.sala || options.browseSala || "");
  const home = normalizeCloudSala(options.homeSala || "");
  if (browse && browse !== "__all__") salas.add(browse);
  if (home) salas.add(home);
  return [...salas];
}
async function pullClinicalOpsFromCloudRoom(options = {}) {
  const force = !!options.force;
  const now = Date.now();
  if (!force && now - cloudClinicalOpsPullLastAt < CLOUD_CLINICAL_OPS_PULL_MIN_MS) {
    return false;
  }
  if (cloudClinicalOpsPullInFlight) return cloudClinicalOpsPullInFlight;
  cloudClinicalOpsPullInFlight = (async () => {
    try {
      const { isCloudSala: isCloudSala2 } = await import("/mobile/js/chunks/sala-allowlist-CLAAQJPF.js");
      const { clinicalSessionContext: clinicalSessionContext2 } = await import("/mobile/js/chunks/clinical-access-runtime-KABKCTTJ.js");
      const { getCloudSyncToken: getCloudSyncToken2 } = await import("/mobile/js/chunks/settings-KQZK5HV5.js");
      if (!getCloudSyncToken2()) return false;
      const salas = resolveCloudDirectorySalas({
        sala: options.sala,
        browseSala: options.browseSala,
        homeSala: options.homeSala || clinicalSessionContext2.user?.sala
      }).filter((s) => isCloudSala2(s));
      if (!salas.length) {
        const { autostartCloudSyncIfConfigured } = await import("/mobile/js/chunks/autostart-JF46HKXI.js");
        const rtMod = await import("/mobile/js/chunks/panel-conexion-runtime-KHXXXXTG.js");
        let runtime = rtMod.getSharedNubeRuntime();
        if (!runtime) runtime = await autostartCloudSyncIfConfigured();
        if (!runtime || typeof runtime.syncCycle !== "function") return false;
        await runtime.syncCycle();
        return true;
      }
      const { pullClinicalOpsForSala } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-756KA6DY.js");
      const pullOpts = force ? { since: 0 } : {};
      const results = await Promise.all(
        salas.map((sala) => pullClinicalOpsForSala(sala, pullOpts).catch(() => null))
      );
      return results.some((res) => res?.ok);
    } catch {
      return false;
    } finally {
      cloudClinicalOpsPullLastAt = Date.now();
      cloudClinicalOpsPullInFlight = null;
    }
  })();
  return cloudClinicalOpsPullInFlight;
}
function scheduleBackgroundClinicalOpsPush(options = {}) {
  void (async () => {
    try {
      const { pushClinicalOpsForSalas, listLocalTeamSalas } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-756KA6DY.js");
      const salas = resolveCloudDirectorySalas(options);
      const teamSalas = await listLocalTeamSalas();
      const targets = [.../* @__PURE__ */ new Set([...salas, ...teamSalas])].filter(Boolean);
      if (targets.length) await pushClinicalOpsForSalas(targets);
    } catch {
    }
  })();
}
async function refreshClinicalOpsDirectory(options = {}) {
  if (isCloudSyncActive()) {
    const pulled = await pullClinicalOpsFromCloudRoom(options);
    if (options.push !== false) scheduleBackgroundClinicalOpsPush(options);
    return pulled || true;
  }
  return pullClinicalOpsFromLanRoom(options);
}
async function publishClinicalTeamsAfterChange(options = {}) {
  if (isCloudSyncActive()) {
    try {
      const { pushClinicalOpsForSala, pushClinicalOpsForSalas, listLocalTeamSalas } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-756KA6DY.js");
      const sala = normalizeCloudSala(options.sala || "");
      const push = sala ? await pushClinicalOpsForSala(sala) : await pushClinicalOpsForSalas(await listLocalTeamSalas());
      if (push?.ok) return { ok: true, channel: "nube" };
    } catch {
    }
  }
  return publishClinicalTeamsToLan();
}
async function pullClinicalOpsFromLanRoom(_options = {}) {
  return false;
}
async function resolveLocalUserIdByLanHandle(handle) {
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalUserLookup !== "function") return "";
  const res = await api2.dbClinicalUserLookup({ username: handle });
  return res?.ok && res.user?.user_id ? String(res.user.user_id) : "";
}

// public/js/features/clinical-teams/teams-roster-lan-assign.mjs
function resolveLanAssignDefaultCycle(team, userId, userRank, rowPreferred, letters) {
  let defaultCycle = team ? resolveMembershipCycleForUser(team, userId, userRank) : letters[0] || "A";
  if (rowPreferred && letters.includes(rowPreferred)) defaultCycle = rowPreferred;
  return defaultCycle;
}
function syncLanAssignCycleSelect(teamSelect, preferredCycle = "") {
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const row = teamSelect.closest(".clinical-lan-user-row");
  const cycleSelect = row?.querySelector(".clinical-lan-assign-cycle");
  if (!(cycleSelect instanceof HTMLSelectElement)) return;
  const teamId = String(teamSelect.value || "").trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">\u2014 Ciclo \u2014</option>';
    cycleSelect.disabled = true;
    return;
  }
  const team = lanDirRt.teams.find((t) => String(t.team_id) === teamId);
  const userId = String(row?.dataset.userId || "").trim();
  const userRank = String(row?.dataset.userRank || "R1");
  const letters = team ? cycleLettersForAssign(team, userRank) : [];
  const rowPreferred = String(preferredCycle || row?.dataset.preferredCycle || "").trim();
  const defaultCycle = resolveLanAssignDefaultCycle(team, userId, userRank, rowPreferred, letters);
  cycleSelect.innerHTML = letters.map((letter) => {
    const label = formatLanCycleOptionLabel(letter, userRank);
    return `<option value="${escapeAttr(letter)}" ${letter === defaultCycle ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
  cycleSelect.disabled = letters.length === 0;
  cycleSelect.value = defaultCycle;
}
function initLanUserRowAssignState(row) {
  const teamSelect = row.querySelector(".clinical-lan-assign-team");
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const preferred = String(row.dataset.preferredCycle || "").trim();
  syncLanAssignCycleSelect(teamSelect, preferred);
}
async function handleLanAssignUserToTeam(userId, teamId, subAreaFraction) {
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsMemberAdd !== "function") {
    toast2("No se pudo asignar.", "error");
    return false;
  }
  const res = await api2.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se asign\xF3 al equipo.", "error");
    return false;
  }
  if (Array.isArray(res.warnings) && res.warnings[0]) {
    toast2(String(res.warnings[0]), "warn");
  }
  return true;
}
async function handleLanDeleteDirectoryUserClick(btn) {
  const userId = String(btn.dataset.userId || "").trim();
  if (!userId) return;
  const label = String(btn.dataset.userLabel || "").trim() || userId;
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalUserDelete !== "function") {
    toast2("Eliminar usuarios requiere R+ de escritorio con base cl\xEDnica desbloqueada.", "error");
    return;
  }
  const confirmed = window.confirm(
    `\xBFEliminar a \xAB${label}\xBB de la base cl\xEDnica en esta Mac?

Desaparecer\xE1 del directorio. Las dem\xE1s R+ en la misma sala Nube lo quitar\xE1n al sincronizar.`
  );
  if (!confirmed) return;
  btn.disabled = true;
  const res = await api2.dbClinicalUserDelete({
    targetUserId: userId,
    callerUserId: currentUserId()
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast2(res?.error || "No se pudo eliminar el usuario.", "error");
    return;
  }
  toast2("Usuario eliminado de esta Mac.", "success");
  const { isBenignLanPushSkipCode: isBenignLanPushSkipCode2 } = await import("/mobile/js/chunks/clinical-profile-cloud-stubs-GF7A2CZZ.js");
  const lanPush = await publishClinicalTeamsToLan();
  if (!lanPush.ok && !isBenignLanPushSkipCode2(lanPush.code)) {
    toast2(
      "Usuario eliminado aqu\xED, pero no se pudo publicar el cambio a la sala \u21C4. Revisa la conexi\xF3n.",
      "warning"
    );
  }
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  const { reloadLanUsersDirectoryAfterMutation } = await import("/mobile/js/chunks/teams-roster-lan-load-BBKPTP47.js");
  await reloadLanUsersDirectoryAfterMutation();
}
function readLanAssignRowSelection(btn) {
  const row = btn.closest(".clinical-lan-user-row");
  if (!row) return null;
  const userId = String(btn.dataset.userId || row.dataset.userId || "").trim();
  const teamSelect = row.querySelector(".clinical-lan-assign-team");
  const cycleSelect = row.querySelector(".clinical-lan-assign-cycle");
  const teamId = teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || "").trim() : "";
  let subAreaFraction = cycleSelect instanceof HTMLSelectElement ? String(cycleSelect.value || "").trim() : "";
  const userRank = String(row.dataset.userRank || "R1");
  return { row, userId, teamId, subAreaFraction, userRank };
}
async function handleLanAssignButtonClick(btn) {
  if (!(btn instanceof HTMLButtonElement)) return;
  const selection = readLanAssignRowSelection(btn);
  if (!selection) return;
  const { userId, teamId, subAreaFraction: initialCycle, userRank } = selection;
  let subAreaFraction = initialCycle;
  if (!userId || !teamId) {
    toast2("Elige un equipo.", "error");
    return;
  }
  const team = lanDirRt.teams.find((t) => String(t.team_id) === teamId);
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, userRank);
  }
  if (!subAreaFraction) {
    toast2("Elige el ciclo del integrante.", "error");
    return;
  }
  const wasMember = Boolean(
    team?.members?.some((m) => String(m.user_id || "") === userId)
  );
  btn.disabled = true;
  const ok = await handleLanAssignUserToTeam(userId, teamId, subAreaFraction);
  btn.disabled = false;
  if (!ok) return;
  toast2(wasMember ? "Ciclo actualizado." : "Integrante asignado al equipo.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  try {
    const { scheduleCloudSyncPush: scheduleCloudSyncPush2 } = await import("/mobile/js/chunks/mutate-bridge-7CJF23JI.js");
    scheduleCloudSyncPush2();
  } catch {
  }
  await fetchClinicalTeamsFromDb();
  const { reloadLanUsersDirectoryAfterMutation } = await import("/mobile/js/chunks/teams-roster-lan-load-BBKPTP47.js");
  await reloadLanUsersDirectoryAfterMutation();
}

// public/js/features/clinical-teams/teams-roster-lan-load.mjs
function buildLanDirectoryFingerprint(users, teams) {
  const userPart = (users || []).map(
    (u) => `${String(u.user_id || "")}	${String(u.username || "")}	${String(u.rank || "")}	${String(u.clinical_name || "")}	${String(u.sala || "")}	${String(u.last_activity_at || "")}`
  ).sort().join("\n");
  const teamPart = (teams || []).map((t) => {
    const members = (t.members || []).map((m) => `${String(m.user_id || "")}:${String(m.sub_area_fraction || "")}`).sort().join(",");
    return `${String(t.team_id || "")}	${members}`;
  }).sort().join("\n");
  return `${userPart}::${teamPart}`;
}
async function reloadLanUsersDirectoryPreservingUi(options = {}) {
  const host = lanUsersModalBodyEl();
  if (!host || !isLanDirectoryModalOpen()) return;
  if (!options.force && isLanDirectoryUserInteracting()) return;
  lanDirRt.lastFingerprint = "";
  captureLanDirectoryCollapseState(host);
  const draft = captureLanDirectoryDraftState(host);
  await loadLanUsersDirectoryIntoHost(host, {
    forceRender: true,
    forceIpc: options.forceIpc !== false
  });
  restoreLanDirectoryDraftState(host, draft);
}
async function fetchLanDirectoryLists(api2, callerUserId) {
  return Promise.all([
    api2.dbClinicalUsersList({ callerUserId }),
    typeof api2.dbClinicalTeamsList === "function" ? api2.dbClinicalTeamsList() : Promise.resolve(null)
  ]);
}
function shouldSkipLanDirectoryIpcRefresh(options, host, now) {
  return !options.forceIpc && lanDirRt.freezeAutoRefresh && now - lanDirRt.ipcLastAt < LAN_DIRECTORY_IPC_MIN_MS && host.querySelector(".clinical-lan-rank-groups");
}
function paintLanDirectoryHost(host, users, sessionUser) {
  host.innerHTML = renderLanUsersModalBodyHtml(users, lanDirRt.teams, {
    canDelete: canDeleteLanDirectoryUser(sessionUser),
    callerUserId: currentUserId()
  });
  host.querySelectorAll(".clinical-lan-user-row").forEach((row) => initLanUserRowAssignState(row));
  bindLanDirectoryFilterControls(host);
  applyLanDirectoryFilters(host);
  const title = document.getElementById("clinical-lan-users-title");
  const pending = users.filter((u) => u && u.lanDirectoryPending).length;
  recordClinicalOpsTrace("display", {
    directoryCount: users.length,
    lanDirectoryPending: pending
  });
  if (title) title.textContent = `Directorio de usuarios (${users.length})`;
}
function shouldReuseLanDirectoryFingerprint(host, fingerprint, options) {
  return !options.forceRender && fingerprint === lanDirRt.lastFingerprint && host.querySelector(".clinical-lan-rank-groups");
}
async function loadLanDirectoryData_(api2, callerUserId) {
  const [usersRes, teamsRes] = await fetchLanDirectoryLists(api2, callerUserId);
  return { usersRes, teamsRes };
}
function renderLanDirectoryLoadError(host, message) {
  host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(message || "No se pudo cargar el directorio.")}</p>`;
}
async function loadLanUsersDirectoryIntoHost(host, options = {}) {
  const now = Date.now();
  if (shouldSkipLanDirectoryIpcRefresh(options, host, now)) return;
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalUsersList !== "function") {
    renderLanDirectoryLoadError(
      host,
      "Directorio solo en la app de escritorio R+ (base cl\xEDnica desbloqueada). En iPad/m\xF3vil usa el censo de R+ Cloud; Mi rotaci\xF3n con directorio requiere Mac."
    );
    return;
  }
  lanDirRt.ipcLastAt = now;
  const { usersRes, teamsRes } = await loadLanDirectoryData_(api2, currentUserId());
  if (!usersRes?.ok) {
    renderLanDirectoryLoadError(host, usersRes?.error);
    return;
  }
  lanDirRt.teams = teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];
  const users = Array.isArray(usersRes.users) ? usersRes.users : [];
  const fingerprint = buildLanDirectoryFingerprint(users, lanDirRt.teams);
  if (shouldReuseLanDirectoryFingerprint(host, fingerprint, options)) {
    const title = document.getElementById("clinical-lan-users-title");
    if (title) title.textContent = `Directorio de usuarios (${users.length})`;
    applyLanDirectoryFilters(host);
    return;
  }
  lanDirRt.lastFingerprint = fingerprint;
  paintLanDirectoryHost(host, users, clinicalSessionContext.user || {});
}
function isLanDirectoryUserInteracting() {
  const bd = lanUsersModalBackdropEl();
  if (!bd?.classList.contains("open")) return false;
  const active = document.activeElement;
  if (active instanceof HTMLElement && bd.contains(active)) {
    if (active.closest(
      ".clinical-lan-assign-team, .clinical-lan-assign-cycle, .clinical-lan-assign-btn, .clinical-lan-delete-user-btn, .clinical-lan-rank-group-summary, .clinical-lan-directory-refresh-btn, .clinical-lan-directory-search, #clinical-lan-directory-status-filter, #clinical-lan-directory-sala-filter, #clinical-lan-directory-activity-filter"
    )) {
      return true;
    }
  }
  if (active instanceof HTMLSelectElement && bd.contains(active)) return true;
  if (active instanceof HTMLOptionElement && active.parentElement instanceof HTMLSelectElement && bd.contains(active.parentElement)) {
    return true;
  }
  return false;
}
function captureLanDirectoryDraftState(host) {
  const draft = /* @__PURE__ */ new Map();
  host.querySelectorAll(".clinical-lan-user-row").forEach((row) => {
    const uid = String(row.dataset.userId || "").trim();
    if (!uid) return;
    const teamEl = row.querySelector(".clinical-lan-assign-team");
    const cycleEl = row.querySelector(".clinical-lan-assign-cycle");
    draft.set(uid, {
      team: teamEl instanceof HTMLSelectElement ? String(teamEl.value || "") : "",
      cycle: cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || "") : ""
    });
  });
  return draft;
}
function restoreLanDirectoryDraftState(host, draft) {
  if (!draft || !draft.size) return;
  host.querySelectorAll(".clinical-lan-user-row").forEach((row) => {
    const uid = String(row.dataset.userId || "").trim();
    const saved = draft.get(uid);
    if (!saved) return;
    const teamSelect = row.querySelector(".clinical-lan-assign-team");
    if (teamSelect instanceof HTMLSelectElement && saved.team) {
      teamSelect.value = saved.team;
      syncLanAssignCycleSelect(teamSelect, saved.cycle);
      if (saved.cycle) {
        const cycleSelect = row.querySelector(".clinical-lan-assign-cycle");
        if (cycleSelect instanceof HTMLSelectElement) {
          cycleSelect.value = saved.cycle;
        }
      }
    }
  });
}
async function refreshLanDirectoryFromHostUi(options = {}) {
  const host = lanUsersModalBodyEl();
  if (!host || !isLanDirectoryModalOpen()) return;
  const btn = host.querySelector(".clinical-lan-directory-refresh-btn");
  if (btn instanceof HTMLButtonElement) btn.disabled = true;
  try {
    if (options.pullFromHost !== false) {
      await pullLanDirectoryFromHostIfDue({ force: !!options.forcePull });
    }
    await reloadLanUsersDirectoryPreservingUi({ force: true, forceIpc: true });
  } finally {
    if (btn instanceof HTMLButtonElement) btn.disabled = false;
  }
}
async function pullLanDirectoryFromHostIfDue() {
  return false;
}

// public/js/features/clinical-teams/teams-roster-lan-modal.mjs
async function openLanUsersDirectoryModal() {
  const user = clinicalSessionContext.user || {};
  if (!canViewLanUserDirectory(user)) {
    toast2(
      "Solo R4, Admin o quien tenga privilegios de administraci\xF3n puede abrir el directorio de usuarios.",
      "warn"
    );
    return;
  }
  const bd = lanUsersModalBackdropEl();
  const host = lanUsersModalBodyEl();
  if (!bd || !host) {
    console.error("[Directorio LAN] Falta #clinical-lan-users-backdrop o #clinical-lan-users-panel-body");
    toast2(
      "No se pudo abrir el directorio (falta el di\xE1logo en la UI). Ejecuta npm run build:ui y reinicia R+.",
      "error"
    );
    return;
  }
  host.innerHTML = '<p class="clinical-teams-empty">Cargando directorio\u2026</p>';
  document.body.classList.add("clinical-lan-directory-open");
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  lanDirRt.lastFingerprint = "";
  lanDirRt.freezeAutoRefresh = true;
  ensureLanDirectoryFilterDelegation();
  touchClinicalSessionActivity({ force: true });
  try {
    await pullLanDirectoryFromHostIfDue({ force: true });
    await loadLanUsersDirectoryIntoHost(host, { forceRender: true, forceIpc: true });
    const pendingSnap = await flushPendingClinicalOpsLanSnapshot();
    if (pendingSnap?.changed) {
      await loadLanUsersDirectoryIntoHost(host, { forceRender: true, forceIpc: true });
    }
  } catch (err) {
    console.error("[Directorio LAN]", err);
    host.innerHTML = `<p class="clinical-teams-empty">${escapeHtml(
      err instanceof Error ? err.message : "No se pudo cargar el directorio."
    )}</p>`;
  }
}
function closeLanUsersDirectoryModal() {
  lanDirRt.freezeAutoRefresh = false;
  lanDirRt.lastFingerprint = "";
  const bd = lanUsersModalBackdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  document.body.classList.remove("clinical-lan-directory-open");
}

// public/js/features/clinical-teams/teams-roster-lan-wire.mjs
function wireLanDirectoryActivityRefresh() {
  if (typeof document === "undefined" || document._rpcLanDirActivityRefreshWired) return;
  document._rpcLanDirActivityRefreshWired = true;
  document.addEventListener("rpc-clinical-user-activity-touched", () => {
    if (!isLanDirectoryModalOpen()) return;
    const host = lanUsersModalBodyEl();
    if (!host?.querySelector(".clinical-lan-rank-groups")) return;
    void reloadLanUsersDirectoryPreservingUi();
  });
}
function wireLanDirectoryOpenButtons(panelHost) {
  if (panelHost && !panelHost._rpcLanDirOpenDelegated) {
    panelHost._rpcLanDirOpenDelegated = true;
    panelHost.addEventListener("click", (ev) => {
      const openBtn2 = ev.target instanceof Element ? ev.target.closest("#btn-open-lan-users-directory, .clinical-teams-open-lan-users-btn") : null;
      if (!openBtn2) return;
      ev.preventDefault();
      void openLanUsersDirectoryModal();
    });
  }
  const openBtn = document.getElementById("btn-open-lan-users-directory");
  if (openBtn && !openBtn._rpcLanDirOpenWired) {
    openBtn._rpcLanDirOpenWired = true;
    openBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void openLanUsersDirectoryModal();
    });
  }
}
function wireLanDirectoryModalChrome() {
  const bd = lanUsersModalBackdropEl();
  if (bd && !bd._rpcLanUsersBackdropWired) {
    bd._rpcLanUsersBackdropWired = true;
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) closeLanUsersDirectoryModal();
    });
  }
  const closeBtn = document.getElementById("btn-clinical-lan-users-close");
  if (closeBtn && !closeBtn._rpcLanUsersCloseWired) {
    closeBtn._rpcLanUsersCloseWired = true;
    closeBtn.addEventListener("click", () => closeLanUsersDirectoryModal());
  }
}
function wireLanDirectoryHostInteractions(host) {
  if (!host || host._rpcLanUsersAssignWired) return;
  host._rpcLanUsersAssignWired = true;
  host.addEventListener(
    "toggle",
    (ev) => {
      const details = ev.target;
      if (!(details instanceof HTMLDetailsElement)) return;
      if (!details.classList.contains("clinical-lan-rank-group")) return;
      const key = String(details.dataset.lanRankGroup || "").trim();
      if (!key) return;
      const count = Number(details.dataset.lanRankCount) || 0;
      if (details.open) {
        lanDirRt.collapsedRanks.delete(key);
        if (count > LAN_DIRECTORY_RANK_AUTO_COLLAPSE_THRESHOLD) {
          lanDirRt.expandedRanks.add(key);
        }
      } else {
        lanDirRt.collapsedRanks.add(key);
        lanDirRt.expandedRanks.delete(key);
      }
    },
    true
  );
  host.addEventListener("change", (ev) => {
    const teamSelect = ev.target instanceof Element ? ev.target.closest(".clinical-lan-assign-team") : null;
    if (teamSelect) syncLanAssignCycleSelect(teamSelect);
  });
  host.addEventListener("click", (ev) => {
    const refreshBtn = ev.target instanceof Element ? ev.target.closest(".clinical-lan-directory-refresh-btn") : null;
    if (refreshBtn) {
      void refreshLanDirectoryFromHostUi({ forcePull: true });
      return;
    }
    const delBtn = ev.target instanceof Element ? ev.target.closest(".clinical-lan-delete-user-btn") : null;
    if (delBtn) {
      void handleLanDeleteDirectoryUserClick(delBtn);
      return;
    }
    const btn = ev.target instanceof Element ? ev.target.closest(".clinical-lan-assign-btn") : null;
    if (btn) void handleLanAssignButtonClick(btn);
  });
}
function wireLanUsersDirectoryControls() {
  wireLanDirectoryActivityRefresh();
  const panelHost = getClinicalTeamsPanelHost();
  wireLanDirectoryOpenButtons(panelHost);
  wireLanDirectoryModalChrome();
  ensureLanDirectoryFilterDelegation();
  const host = lanUsersModalBodyEl();
  if (host) bindLanDirectoryFilterControls(host);
  wireLanDirectoryHostInteractions(host);
}

// public/js/clinical-team-invite.mjs
var INVITE_CODE_MIN_LEN = 6;
function teamInviteCode(teamId) {
  return String(teamId || "").replace(/-/g, "").slice(0, 8).toLowerCase();
}
function normalizeTeamInviteCode(raw) {
  return String(raw || "").trim().toLowerCase().replace(/[^a-f0-9-]/g, "").replace(/-/g, "");
}
function isLikelyLanBearerToken(raw) {
  const norm = normalizeTeamInviteCode(raw);
  return norm.length >= 32;
}
function parseClinicalTeamJoinQuery(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const codeParam = String(params.get("code") || "").trim();
  if (codeParam && isLikelyLanBearerToken(codeParam)) {
    return { teamId: "", inviteCode: "" };
  }
  const joinCode = normalizeTeamInviteCode(
    params.get("joinCode") || params.get("teamCode") || params.get("code") || ""
  );
  if (joinCode.length >= INVITE_CODE_MIN_LEN) {
    return { teamId: "", inviteCode: joinCode };
  }
  const teamId = String(params.get("joinTeam") || params.get("clinicalTeam") || "").trim();
  return {
    teamId,
    inviteCode: teamId ? teamInviteCode(teamId) : ""
  };
}
function resolveTeamIdFromInviteCode(code, teams) {
  const norm = normalizeTeamInviteCode(code);
  if (norm.length < INVITE_CODE_MIN_LEN) return "";
  const fullUuid = norm.length >= 32 ? norm.slice(0, 32) : norm;
  const list = Array.isArray(teams) ? teams : [];
  const matches = list.filter((t) => {
    const id = String(t?.team_id || "").replace(/-/g, "").toLowerCase();
    return id === fullUuid || id.startsWith(norm);
  });
  if (matches.length === 1) return String(matches[0].team_id || "");
  return "";
}
function diagnoseInviteCodeFailure(code, teams) {
  const norm = normalizeTeamInviteCode(code);
  if (!norm) return { reason: "empty" };
  if (isLikelyLanBearerToken(norm)) return { reason: "lan_bearer" };
  if (norm.length < INVITE_CODE_MIN_LEN) return { reason: "too_short" };
  const fullUuid = norm.length >= 32 ? norm.slice(0, 32) : norm;
  const list = Array.isArray(teams) ? teams : [];
  const matches = list.filter((t) => {
    const id = String(t?.team_id || "").replace(/-/g, "").toLowerCase();
    return id === fullUuid || id.startsWith(norm);
  });
  if (matches.length > 1) return { reason: "ambiguous", matchCount: matches.length };
  if (matches.length === 1) return { reason: "ok", teamId: String(matches[0].team_id || "") };
  return { reason: "not_in_db" };
}
function inviteCodeFailureMessage(diag) {
  switch (diag?.reason) {
    case "lan_bearer":
      return "Ese valor es el c\xF3digo LAN de la sala (Wi\u2011Fi), no el c\xF3digo de equipo. En la invitaci\xF3n busca \xABC\xF3digo de equipo\xBB (8 caracteres, p. ej. 2017936e).";
    case "too_short":
      return "C\xF3digo demasiado corto. Copia los 8 caracteres del recuadro \xABC\xF3digo de equipo\xBB en Mi rotaci\xF3n.";
    case "ambiguous":
      return `Hay ${diag.matchCount || 2} equipos con ese prefijo en esta Mac. Pide al R2 el c\xF3digo completo o que te agregue desde el directorio de usuarios.`;
    case "not_in_db":
      return "Este equipo a\xFAn no est\xE1 en tu base. Con\xE9ctate a la misma sala \u21C4, abre Mi rotaci\xF3n de nuevo (sincroniza) y reintenta; o pide que te agreguen por @usuario.";
    case "empty":
      return "Escribe el c\xF3digo de equipo.";
    default:
      return "C\xF3digo no v\xE1lido o equipo no est\xE1 en esta base.";
  }
}
function resolveClinicalInviteLanHostUrl() {
  if (typeof window === "undefined") return "";
  try {
    const cfg = JSON.parse(localStorage.getItem("rpc-lan-config") || "{}");
    const host = String(cfg?.hostUrl || "").trim().replace(/\/+$/, "");
    if (!host) return "";
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) return "";
    return host;
  } catch {
    return "";
  }
}
function isClinicalTeamJoinDesktopApp() {
  if (typeof window === "undefined") return false;
  return !!(window.electronAPI || window.rplusDb);
}
function buildClinicalTeamInviteMessage(team) {
  const name = String(team?.name || "Equipo").trim();
  const sala = String(team?.sala || "").trim();
  const code = teamInviteCode(team?.team_id);
  const lanHost = resolveClinicalInviteLanHostUrl();
  const lines = [
    `Invitaci\xF3n al equipo \xAB${name}\xBB${sala ? ` \xB7 ${sala}` : ""} en R+`,
    "",
    `C\xF3digo de equipo: ${code}`,
    "",
    "En la app R+ del Mac (no Safari):",
    "1. Abre Mi rotaci\xF3n",
    "2. \xABUnirte con c\xF3digo de equipo\xBB \u2192 pega el c\xF3digo",
    "3. Elige tu subciclo (R1) o letra (R2) y confirma",
    "",
    "El enlace web no une al equipo cl\xEDnico; Safari/iPad solo sirve para censo LAN."
  ];
  if (lanHost) {
    lines.push("", `Sala en vivo (opcional): ${lanHost}`);
  }
  return lines.join("\n");
}
var BROWSER_GATE_ID = "clinical-team-invite-browser-gate";
function mountClinicalTeamInviteBrowserGate(code) {
  if (typeof document === "undefined") return;
  const normalized = normalizeTeamInviteCode(code);
  if (!normalized || isClinicalTeamJoinDesktopApp()) return;
  if (document.getElementById(BROWSER_GATE_ID)) return;
  const wrap = document.createElement("div");
  wrap.id = BROWSER_GATE_ID;
  wrap.className = "clinical-team-invite-browser-gate";
  wrap.setAttribute("role", "alertdialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.innerHTML = `
    <div class="clinical-team-invite-browser-gate-card">
      <h2>\xDAnete desde la app R+ en Mac</h2>
      <p>Los enlaces en Safari no agregan al equipo cl\xEDnico (solo la app de escritorio con tu base de datos).</p>
      <p class="clinical-team-invite-browser-gate-code">C\xF3digo: <strong>${normalized}</strong></p>
      <ol>
        <li>Abre la aplicaci\xF3n <strong>R+</strong> en tu Mac (no el navegador).</li>
        <li>Ve a <strong>Mi rotaci\xF3n</strong>.</li>
        <li>En <strong>Unirte con c\xF3digo de equipo</strong>, pega: <code>${normalized}</code></li>
      </ol>
      <button type="button" class="btn-save" id="clinical-team-invite-browser-gate-dismiss">Entendido</button>
    </div>`;
  document.body.appendChild(wrap);
  const btn = document.getElementById("clinical-team-invite-browser-gate-dismiss");
  if (btn) {
    btn.addEventListener("click", () => {
      wrap.remove();
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("joinTeam");
        url.searchParams.delete("joinCode");
        url.searchParams.delete("clinicalTeam");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      } catch (_e) {
        void _e;
      }
    });
  }
}
function tryMountClinicalTeamInviteBrowserGate(search) {
  const parsed = parseClinicalTeamJoinQuery(search || (typeof location !== "undefined" ? location.search : ""));
  const code = parsed.inviteCode || (parsed.teamId ? teamInviteCode(parsed.teamId) : "");
  if (code) mountClinicalTeamInviteBrowserGate(code);
}

// public/js/features/clinical-teams/teams-roster-team-cards.mjs
function countLocalCensusPatientsForTeam(teamId, assignments, now) {
  const tid = String(teamId || "");
  if (!tid) return 0;
  let count = 0;
  for (const p of patients || []) {
    if (!p?.id) continue;
    if (resolvePatientTeamIdFromAssignments(String(p.id), assignments, now) === tid) count += 1;
  }
  return count;
}
function renderTeamMetaLine(team) {
  const parts = [];
  const sala = String(team.sala || "").trim();
  const service = String(team.service || "").trim();
  if (sala) parts.push(sala);
  if (service && service.toLowerCase() !== "sala") parts.push(service);
  if (!parts.length) return "";
  return `<p class="clinical-teams-card-meta">${parts.map((p) => escapeHtml(p)).join(" \xB7 ")}</p>`;
}
function formatTeamPatientCountMessage(onDevice, assignedLan) {
  if (onDevice <= 0 && assignedLan > 0) {
    return assignedLan === 1 ? "1 asignado en la red \u2014 sincronizando expediente\u2026" : `${assignedLan} asignados en la red \u2014 sincronizando expedientes\u2026`;
  }
  if (assignedLan > onDevice && assignedLan > 0) {
    const pending = assignedLan - onDevice;
    const visible = onDevice === 1 ? "1 paciente en censo" : `${onDevice} pacientes en censo`;
    const waiting = pending === 1 ? "1 asignado en la red sin expediente aqu\xED" : `${pending} asignados en la red sin expediente aqu\xED`;
    return `${visible} \xB7 ${waiting}`;
  }
  return onDevice === 1 ? "1 paciente en censo" : `${onDevice} pacientes en censo`;
}
function renderTeamPatientCountLine(team) {
  const teamId = String(team?.team_id || "");
  const ctx = getClinicalScopeContextForEvaluate();
  const assignments = Array.isArray(ctx?.assignments) ? ctx.assignments : [];
  const now = ctx?.now || (/* @__PURE__ */ new Date()).toISOString();
  const onDevice = countLocalCensusPatientsForTeam(teamId, assignments, now);
  const assignedLan = Math.max(
    Number(team?.lanAssignmentCount) || 0,
    Number(team?.patientCount) || 0
  );
  if (onDevice <= 0 && assignedLan <= 0) return "";
  const label = formatTeamPatientCountMessage(onDevice, assignedLan);
  return `<p class="clinical-teams-card-meta clinical-teams-card-patients">${escapeHtml(label)}</p>`;
}
function renderCycleSelectForRank(team, rank, current, selectId) {
  const service = String(team.service || "Sala");
  const id = selectId || "clinical-cycle-select";
  const cur = String(current || "").trim();
  const letters = getCycleLetterOptionsForRank(service, rank);
  const opts = letters.map(
    (l) => `<option value="${escapeAttr(l)}" ${l === cur ? "selected" : ""}>${escapeHtml(l)}</option>`
  ).join("");
  return `<select id="${escapeAttr(id)}" class="profile-input clinical-teams-cycle-select" required>${opts}</select>`;
}
function renderAddMemberCycleSelect(team) {
  const teamId = String(team.team_id || "");
  const service = String(team.service || "Sala");
  const id = `clinical-add-cycle-${teamId}`;
  if (!isSalaWardService(service)) {
    const letters = getCycleLetterOptionsForRank(service, "R2");
    return `<select id="${escapeAttr(id)}" class="profile-input clinical-teams-add-member-cycle" required>
      ${letters.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join("")}
    </select>`;
  }
  const r2 = getCycleLettersForTeamCreate("Sala", "R2");
  const r1a = getCycleLettersForTeamCreate("Sala", "R1", 0);
  const r1b = getCycleLettersForTeamCreate("Sala", "R1", 1);
  return `<select id="${escapeAttr(id)}" class="profile-input clinical-teams-add-member-cycle" required>
    <optgroup label="R2 \xB7 A\u2013F">${r2.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join("")}</optgroup>
    <optgroup label="R1 \xB7 primera l\xEDnea">${r1a.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join("")}</optgroup>
    <optgroup label="R1 \xB7 segunda l\xEDnea">${r1b.map((l) => `<option value="${escapeAttr(l)}">${escapeHtml(l)}</option>`).join("")}</optgroup>
  </select>`;
}
function renderMemberRemoveButton(m, handle, memberUserId, opts) {
  const canRemove = opts.canRemove && opts.teamId && memberUserId && memberUserId !== String(opts.callerUserId || "").trim();
  if (!canRemove) return "";
  return `<button type="button" class="btn-med-secondary clinical-teams-member-remove-btn" data-user-id="${escapeAttr(memberUserId)}" data-team-id="${escapeAttr(String(opts.teamId))}" data-user-label="${escapeAttr(String(m.clinical_name || handle || memberUserId))}" title="Quitar del equipo y de la base cl\xEDnica">Quitar</button>`;
}
function renderMemberRow(m, opts = {}) {
  const handle = escapeHtml(m.username || m.user_id);
  const name = String(m.clinical_name || "").trim();
  const rank = escapeHtml(effectiveClinicalRank({ rank: m.rank }));
  const displayName = name ? escapeHtml(name) : handle;
  const cycle = formatMemberCycleLabel(m);
  const meta = name ? `@${handle} \xB7 ${rank}` : rank;
  const cycleHtml = cycle ? `<span class="clinical-teams-member-cycle">${escapeHtml(cycle)}</span>` : "";
  const memberUserId = String(m.user_id || "").trim();
  const removeBtn = renderMemberRemoveButton(m, handle, memberUserId, opts);
  return `<li class="clinical-teams-member-row">
    <span class="clinical-teams-member-row-name">${displayName}</span>
    <span class="clinical-teams-member-row-meta">${meta}${cycleHtml ? ` \xB7 ${cycleHtml}` : ""}</span>
    ${removeBtn}
  </li>`;
}
function renderMembersBlock(members, { compact = false, teamId = "" } = {}) {
  const list = Array.isArray(members) ? members : [];
  const count = list.length;
  const canRemove = !!teamId && canManageTeamRoster(clinicalSessionContext.user);
  const callerUserId = String(clinicalSessionContext.user?.user_id || "");
  const rows = count ? list.map((m) => renderMemberRow(m, { canRemove, teamId, callerUserId })).join("") : '<li class="clinical-teams-empty clinical-teams-empty--inline">Sin integrantes</li>';
  const heading = count === 1 ? "Integrantes (1)" : `Integrantes (${count})`;
  const listHtml = `<ul class="clinical-teams-member-rows">${rows}</ul>`;
  const tid = String(teamId || "").trim();
  if (!tid) {
    return `
    <div class="clinical-teams-card-members${compact ? " clinical-teams-card-members--compact" : ""}">
      <h6 class="clinical-teams-members-heading">${heading}</h6>
      ${listHtml}
    </div>`;
  }
  return renderClinicalTeamsCollapsible({
    collapseKey: `card.${tid}.members`,
    defaultOpen: true,
    className: `clinical-teams-collapse--card-block clinical-teams-card-members${compact ? " clinical-teams-card-members--compact" : ""}`,
    summaryHtml: `<span class="clinical-teams-members-heading">${heading}</span>`,
    bodyHtml: listHtml
  });
}
function renderMyCycleEditBlock(team, user) {
  const teamId = String(team.team_id || "");
  const userId = String(user?.user_id || "");
  const handle = normalizeUsername(user?.username || "");
  const members = Array.isArray(team.members) ? team.members : [];
  const me = members.find((m) => {
    if (userId && String(m.user_id) === userId) return true;
    if (handle && normalizeUsername(m.username || "") === handle) return true;
    return false;
  });
  if (!me) return "";
  const rank = effectiveClinicalRank({ rank: me.rank });
  const current = String(me.sub_area_fraction || "").trim();
  const selectId = `clinical-my-cycle-${teamId}`;
  const service = String(team.service || "Sala");
  const hint = isSalaWardService(service) ? rank === "R2" ? "Tu letra A\u2013F en el ciclo de sala." : rank === "R1" ? "Tu subciclo (A1\u2013D1 o A2\u2013D2), independiente del resto del equipo." : "Letra de rotaci\xF3n para este servicio." : "Letra de rotaci\xF3n A\u2013D (misma para todos los rangos en este servicio).";
  const formHtml = `
      <form class="clinical-teams-my-cycle-form" data-team-id="${escapeAttr(teamId)}">
        <p class="clinical-teams-hint">${escapeHtml(hint)}</p>
        <div class="clinical-teams-my-cycle-row">
          <label class="visually-hidden" for="${escapeAttr(selectId)}">Mi ciclo</label>
          ${renderCycleSelectForRank(team, rank, current, selectId)}
          <button type="submit" class="btn-save">Guardar</button>
        </div>
      </form>`;
  return renderClinicalTeamsCollapsible({
    collapseKey: `card.${teamId}.cycle`,
    defaultOpen: true,
    className: "clinical-teams-collapse--card-block clinical-teams-my-cycle-box",
    summaryHtml: '<span class="clinical-teams-my-cycle-title">Mi ciclo en este equipo</span>',
    bodyHtml: formHtml
  });
}
function renderInheritPatientsBox(team) {
  const teamId = escapeAttr(String(team.team_id || ""));
  const teamName = escapeAttr(String(team.name || "Equipo"));
  return `
    <div class="clinical-teams-inherit-box">
      <button type="button" class="btn-med-secondary clinical-teams-inherit-btn ui-pressable" data-team-id="${teamId}" data-team-name="${teamName}" title="Traer pacientes del equipo del mes anterior">
        Heredar pacientes del mes anterior\u2026
      </button>
    </div>`;
}
function renderLeaveTeamBox(team) {
  const teamId = escapeAttr(String(team.team_id || ""));
  const teamName = escapeAttr(String(team.name || "este equipo"));
  return `
    <div class="clinical-teams-leave-box">
      <button type="button" class="btn-med-secondary clinical-teams-leave-btn" data-team-id="${teamId}" data-team-name="${teamName}">
        Salir del equipo
      </button>
    </div>`;
}
function renderTeamManageActionsHtml(team) {
  const teamId = escapeAttr(String(team.team_id || ""));
  const teamNameAttr = escapeAttr(String(team.name || "Equipo"));
  return `
    <div class="clinical-teams-manage-actions">
      <button type="button" class="btn-med-secondary clinical-teams-edit-btn" data-team-id="${teamId}">Editar</button>
      <button type="button" class="btn-med-secondary clinical-teams-delete-btn" data-team-id="${teamId}" data-team-name="${teamNameAttr}">Eliminar</button>
    </div>`;
}
function renderTeamEditPanelHtml(team) {
  const teamId = escapeAttr(String(team.team_id || ""));
  const name = escapeHtml(String(team.name || ""));
  const sala = String(team.sala || "").trim();
  return `
    <div class="clinical-teams-edit-panel" hidden data-team-id="${teamId}">
      <form class="clinical-teams-edit-form" data-team-id="${teamId}">
        <div class="field-group">
          <label for="clinical-edit-name-${teamId}">Nombre del equipo</label>
          <input id="clinical-edit-name-${teamId}" type="text" class="profile-input clinical-teams-edit-name" value="${name}" required>
        </div>
        <div class="field-group">
          <label for="clinical-edit-sala-${teamId}">Sala</label>
          <select id="clinical-edit-sala-${teamId}" class="profile-input clinical-teams-edit-sala" required>
            ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}" ${sala === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("")}
          </select>
        </div>
        <div class="clinical-teams-edit-form-actions">
          <button type="submit" class="btn-save">Guardar cambios</button>
          <button type="button" class="btn-med-secondary clinical-teams-edit-cancel">Cancelar</button>
        </div>
      </form>
    </div>`;
}
function renderTeamManageBlock(team) {
  const user = clinicalSessionContext.user || {};
  if (!canManageTeamRoster(user)) return { actionsHtml: "", editPanelHtml: "" };
  return {
    actionsHtml: renderTeamManageActionsHtml(team),
    editPanelHtml: renderTeamEditPanelHtml(team)
  };
}
function renderTeamInviteCollapsible(team, teamId) {
  const tid = String(teamId || team?.team_id || "").trim();
  const inviteBody = `
        <p class="clinical-teams-invite-code-line">C\xF3digo para invitar: <code class="clinical-teams-invite-code">${escapeHtml(teamInviteCode(tid))}</code></p>
        <div class="clinical-teams-invite-link-row">
          <button type="button" class="btn-med-secondary clinical-teams-copy-invite-btn" data-team-id="${escapeAttr(tid)}">Copiar invitaci\xF3n</button>
          <p class="clinical-teams-invite-hint">Incluye el c\xF3digo e instrucciones para <strong>Mi rotaci\xF3n</strong> en la app R+ del Mac (no Safari).</p>
        </div>
        <form class="clinical-teams-add-member-form" data-team-id="${escapeAttr(tid)}" data-team-service="${escapeAttr(team.service || "")}">
          <p class="clinical-teams-add-member-label">Agregar integrante</p>
          <div class="clinical-teams-add-member-fields">
            <div class="field-group clinical-teams-add-member-user">
              <label for="clinical-add-member-${escapeAttr(tid)}">@usuario</label>
              <input id="clinical-add-member-${escapeAttr(tid)}" type="text" class="profile-input clinical-teams-add-member-input" placeholder="sin @" required aria-describedby="clinical-add-hint-${escapeAttr(tid)}">
            </div>
            <div class="field-group clinical-teams-add-cycle-group">
              <label for="clinical-add-cycle-${escapeAttr(tid)}">Ciclo del integrante</label>
              ${renderAddMemberCycleSelect(team)}
            </div>
            <button type="submit" class="btn-save clinical-teams-btn-add">Agregar</button>
          </div>
          <p class="clinical-teams-invite-hint" id="clinical-add-hint-${escapeAttr(tid)}">Debe existir en Mi rotaci\xF3n (@usuario, sin @). Cada R1/R2 lleva su propio ciclo (D1, D2, A\u2013F).</p>
        </form>`;
  return renderClinicalTeamsCollapsible({
    collapseKey: `card.${tid}.invite`,
    defaultOpen: false,
    className: "clinical-teams-collapse--card-block clinical-teams-invite-box",
    summaryHtml: '<span class="clinical-teams-invite-summary">Invitar y agregar integrantes</span>',
    bodyHtml: inviteBody
  });
}
function renderJoinedTeamCard(team) {
  const user = clinicalSessionContext.user || {};
  const teamId = String(team.team_id || "");
  const members = Array.isArray(team.members) ? team.members : [];
  const manage = renderTeamManageBlock(team);
  return `
    <article class="clinical-teams-card clinical-teams-card--mine" data-team-id="${escapeAttr(teamId)}">
      <div class="clinical-teams-card-top${manage.actionsHtml ? " clinical-teams-card-top--directory" : ""}">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Residente l\xEDder</p>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || "Equipo")}</h5>
          ${renderTeamMetaLine(team)}
          ${renderTeamPatientCountLine(team)}
        </div>
        ${manage.actionsHtml ? `<div class="clinical-teams-card-actions">${manage.actionsHtml}</div>` : ""}
      </div>
      ${manage.editPanelHtml}
      ${renderMembersBlock(members, { teamId })}
      ${renderMyCycleEditBlock(team, user)}
      ${renderInheritPatientsBox(team)}
      ${renderLeaveTeamBox(team)}
      ${renderTeamInviteCollapsible(team, teamId)}
    </article>`;
}
function renderDirectoryTeamCard(team, opts = {}) {
  const teamId = String(team.team_id || "");
  const members = Array.isArray(team.members) ? team.members : [];
  const joinBtn = opts.joinBtnHtml || "";
  const joinHint = opts.joinHintHtml || "";
  const manage = opts.manageHtml || "";
  const editPanel = opts.editPanelHtml || "";
  const actionButtons = [joinBtn, manage].filter(Boolean).join("");
  return `
    <article class="clinical-teams-card clinical-teams-card--directory" data-team-id="${escapeAttr(teamId)}">
      <div class="clinical-teams-card-top clinical-teams-card-top--directory">
        <div class="clinical-teams-card-top-text">
          <p class="clinical-teams-card-eyebrow">Equipo en sala</p>
          <h5 class="clinical-teams-card-title">${escapeHtml(team.name || "")}</h5>
          ${renderTeamMetaLine(team)}
          ${renderTeamPatientCountLine(team)}
        </div>
        ${actionButtons ? `<div class="clinical-teams-card-actions">${actionButtons}</div>` : ""}
      </div>
      ${joinHint ? `<p class="clinical-teams-card-join-reason">${escapeHtml(joinHint)}</p>` : ""}
      ${editPanel}
      ${renderMembersBlock(members, { compact: true, teamId })}
    </article>`;
}

// public/js/features/clinical-teams/teams-roster-create.mjs
function compositionHintForService(service) {
  if (!serviceUsesStructuredComposition(service)) return "";
  const limits = getTeamCompositionLimits(service);
  if (!limits) return "";
  const parts = [];
  if (limits.r1) parts.push(`${limits.r1} R1`);
  if (limits.r2) parts.push(`${limits.r2} R2`);
  if (limits.r3) parts.push(`${limits.r3} R3`);
  return parts.length ? `<p class="clinical-teams-hint clinical-teams-composition-hint">Composici\xF3n: ${parts.join(", ")}.</p>` : "";
}
function setR1LineGroupVisible(visible) {
  const r1LineGroup = document.getElementById("clinical-team-r1-line-group");
  if (!r1LineGroup) return;
  r1LineGroup.hidden = !visible;
  r1LineGroup.style.display = visible ? "" : "none";
}
function syncCreateTeamServiceFromSala() {
  const salaSelect = document.getElementById("clinical-team-create-sala");
  const serviceSelect = document.getElementById("clinical-team-create-service");
  const userSala = String(clinicalSessionContext.user?.sala || "").trim();
  if (salaSelect && userSala && !String(salaSelect.value || "").trim()) {
    salaSelect.value = userSala;
  }
  const sala = String(salaSelect?.value || userSala || "").trim();
  const mapped = clinicalServiceForSala(sala);
  if (serviceSelect && mapped) {
    serviceSelect.value = mapped;
  }
  syncCreateTeamCycleField();
}
function updateCreateTeamCycleLabels(meta, service) {
  const label = document.getElementById("clinical-team-create-day-label");
  const hint = document.getElementById("clinical-team-create-day-hint");
  const compositionHint = document.getElementById("clinical-team-composition-hint");
  if (label) label.textContent = meta.label;
  if (hint) hint.textContent = meta.hint;
  if (compositionHint) compositionHint.innerHTML = compositionHintForService(service);
}
function refreshCreateTeamDayOptions(daySelect, letters, prev) {
  if (!daySelect) return;
  daySelect.innerHTML = letters.map((letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`).join("");
  if (prev && letters.includes(prev)) daySelect.value = prev;
}
function readCreateTeamCycleContext() {
  const sala = String(
    document.getElementById("clinical-team-create-sala")?.value || clinicalSessionContext.user?.sala || ""
  ).trim();
  const service = String(document.getElementById("clinical-team-create-service")?.value || "Sala");
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const r1Line = Number(document.getElementById("clinical-team-create-r1-line")?.value || 0);
  return { sala, service, rank, r1Line };
}
function syncCreateTeamCycleField() {
  const { sala, service, rank, r1Line } = readCreateTeamCycleContext();
  const showR1Line = rank === "R1" && usesSalaR1LinePicker(service, sala);
  const meta = getCycleFieldMetaForTeamCreate(service, rank, showR1Line && r1Line === 1 ? 1 : 0);
  const daySelect = document.getElementById("clinical-team-create-day");
  setR1LineGroupVisible(showR1Line);
  updateCreateTeamCycleLabels(meta, service);
  const prev = String(daySelect?.value || "");
  const letters = showR1Line && rank === "R1" ? getCycleLettersForTeamCreate(service, rank, r1Line === 1 ? 1 : 0) : getCycleLetterOptionsForRank(service, rank);
  refreshCreateTeamDayOptions(daySelect, letters, prev);
}
function renderCreateTeamForm() {
  const user = clinicalSessionContext.user || {};
  if (canManageTeamRoster(user)) {
    return renderCreateTeamFormElevated(user);
  }
  return renderCreateTeamFormStandard();
}
function renderCreateTeamFormElevated(user) {
  const homeSala = String(user?.sala || "").trim();
  return `
    <form id="clinical-team-create-form" class="clinical-teams-create-form clinical-teams-create-form--elevated">
      <div class="field-group">
        <label for="clinical-team-create-name">Nombre del equipo</label>
        <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Equipo A \xB7 Dr. Guti\xE9rrez" required>
        ${hintHtml("Solo el nombre; sin integrantes todav\xEDa.")}
      </div>
      <div class="field-group">
        <label for="clinical-team-create-sala">Sala</label>
        <select id="clinical-team-create-sala" class="profile-input" required>
          <option value="">\u2014 Seleccionar sala \u2014</option>
          ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}" ${homeSala === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("")}
        </select>
      </div>
      <p class="clinical-teams-hint clinical-teams-create-elevated-hint">Asigna residentes despu\xE9s desde <strong>Directorio de usuarios LAN</strong>.</p>
      <div class="modal-actions clinical-teams-create-submit-wrap">
        <button type="submit" class="btn-save">Crear equipo vac\xEDo</button>
        <button type="button" class="btn-med-secondary clinical-teams-create-cancel">Cancelar</button>
      </div>
    </form>`;
}
function renderCreateTeamFormStandard() {
  const userSala = String(clinicalSessionContext.user?.sala || "").trim();
  const defaultService = clinicalServiceForSala(userSala) || CLINICAL_TEAM_SERVICES[0];
  const serviceOptions = CLINICAL_TEAM_SERVICES.map(
    (svc) => `<option value="${escapeAttr(svc)}" ${svc === defaultService ? "selected" : ""}>${escapeHtml(svc)}</option>`
  ).join("");
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const defaultLetters = getCycleLetterOptionsForRank(defaultService, rank);
  const defaultMeta = getCycleFieldMetaForTeamCreate(defaultService, rank, 0);
  const letterOptions = defaultLetters.map((letter) => `<option value="${escapeAttr(letter)}">${escapeHtml(letter)}</option>`).join("");
  const showR1Line = rank === "R1" && usesSalaR1LinePicker(defaultService, userSala);
  return `
    <form id="clinical-team-create-form" class="clinical-teams-create-form">
      <div class="field-group" id="clinical-team-sala-group">
        <label for="clinical-team-create-sala">Sala</label>
        <select id="clinical-team-create-sala" class="profile-input">
          <option value="">\u2014 Seleccionar sala \u2014</option>
          ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}" ${s === userSala ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("")}
        </select>
      </div>
      <div class="field-group">
        <label for="clinical-team-create-name">Nombre del equipo (residente l\xEDder)</label>
        <input id="clinical-team-create-name" type="text" class="profile-input" placeholder="Dr. Guti\xE9rrez" required>
      </div>
      <div class="field-group" id="clinical-team-r1-line-group" ${showR1Line ? "" : 'hidden style="display:none"'}>
        <label for="clinical-team-create-r1-line">L\xEDnea R1 en el equipo</label>
        <select id="clinical-team-create-r1-line" class="profile-input">
          <option value="0">Primera l\xEDnea \xB7 A1\u2013D1</option>
          <option value="1">Segunda l\xEDnea \xB7 A2\u2013D2</option>
        </select>
      </div>
      <div class="clinical-teams-create-service-row">
        <div class="field-group">
          <label for="clinical-team-create-service">Servicio</label>
          <select id="clinical-team-create-service" class="profile-input" required>${serviceOptions}</select>
        </div>
        <div class="field-group">
          <label id="clinical-team-create-day-label" for="clinical-team-create-day">${escapeHtml(defaultMeta.label)}</label>
          <select id="clinical-team-create-day" class="profile-input" required>${letterOptions}</select>
        </div>
      </div>
      <p id="clinical-team-create-day-hint" class="clinical-teams-hint clinical-teams-create-cycle-hint">${escapeHtml(defaultMeta.hint)}</p>
      <div id="clinical-team-composition-hint">${compositionHintForService(defaultService)}</div>
      <div class="modal-actions clinical-teams-create-submit-wrap">
        <button type="submit" class="btn-save">Crear equipo</button>
        <button type="button" class="btn-med-secondary clinical-teams-create-cancel">Cancelar</button>
      </div>
    </form>`;
}
function renderCreateTeamSectionHtml() {
  const user = clinicalSessionContext.user || {};
  const elevatedCreate = canManageTeamRoster(user);
  const openLabel = elevatedCreate ? "Crear equipo vac\xEDo" : "Crear nuevo equipo";
  const lanDirBtn = renderLanUsersDirectoryTopButtonHtml(user);
  const actionsClass = lanDirBtn ? "clinical-teams-top-actions clinical-teams-top-actions--split" : "clinical-teams-top-actions";
  return `
    <section class="clinical-teams-section clinical-teams-section--create">
      <div class="${actionsClass}">
        <button type="button" id="btn-clinical-team-create-open" class="btn-save clinical-teams-create-open-btn">${escapeHtml(openLabel)}</button>
        ${lanDirBtn}
      </div>
      <div id="clinical-team-create-panel" class="clinical-teams-create-panel" hidden>
        ${renderCreateTeamForm()}
      </div>
    </section>`;
}
function renderJoinWithCodeSectionHtml() {
  const joinForm = `
      <form id="clinical-team-join-code-form" class="clinical-teams-join-code-form">
        <div class="clinical-teams-invite-row clinical-teams-join-code-code-row">
          <label class="visually-hidden" for="clinical-team-join-code-input">C\xF3digo de equipo</label>
          <input id="clinical-team-join-code-input" type="text" class="profile-input" placeholder="ej. 2017936e" maxlength="36" autocomplete="off" required>
        </div>
        <div class="field-group clinical-teams-add-cycle-group">
          <label for="clinical-team-join-code-cycle">Tu ciclo al unirte</label>
          ${renderCycleSelectForRank(
    {
      service: clinicalServiceForSala(clinicalSessionContext.user?.sala) || "Sala",
      team_id: "join"
    },
    effectiveClinicalRank(clinicalSessionContext.user),
    "",
    "clinical-team-join-code-cycle"
  )}
        </div>
        <div class="clinical-teams-join-submit-wrap">
          <button type="submit" class="btn-save">Unirme</button>
        </div>
      </form>`;
  return `
    <section class="clinical-teams-section clinical-teams-section--join-code">
      ${renderClinicalTeamsCollapsible({
    collapseKey: "section.joinCode",
    defaultOpen: false,
    className: "clinical-teams-collapse--section",
    summaryHtml: `
          <h4 class="clinical-teams-section-title">Unirte con c\xF3digo de equipo</h4>
          <p class="clinical-teams-section-desc">Pega el c\xF3digo que te envi\xF3 tu R2 (8 caracteres). <strong>No</strong> pegues aqu\xED el enlace \u21C4 de sala (<code>http://\u2026/join/req_\u2026</code>) \u2014 ese va en <strong>Wi\u2011Fi \u2192 Conexi\xF3n guardia</strong>.</p>`,
    bodyHtml: joinForm
  })}
    </section>`;
}

// public/js/features/clinical-teams/teams-roster-directory.mjs
async function resolveLanTeamMemberHintHtml(joinedTeams) {
  const teams = Array.isArray(joinedTeams) ? joinedTeams : [];
  if (!teams.length) return "";
  const soloTeams = teams.every((team) => {
    const members = Array.isArray(team?.members) ? team.members : [];
    return members.length <= 1;
  });
  if (!soloTeams) return "";
  try {
    if (!isCloudSyncActive()) return "";
    const { getCloudSyncRoomId } = await import("/mobile/js/chunks/settings-KQZK5HV5.js");
    const roomId = String(getCloudSyncRoomId() || "").trim();
    if (!roomId) {
      return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">Abre \u21C4 y con\xE9ctate a <strong>R+ Cloud</strong> en la sala de guardia. Los residentes deben iniciar sesi\xF3n Nube, unirse a la misma sala y registrar <strong>@usuario</strong> antes de que puedas asignarlos a un equipo.</p>`;
    }
    const canDir = canViewLanUserDirectory(clinicalSessionContext.user || {});
    if (canDir) {
      return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">Est\xE1s en sala Nube pero el directorio a\xFAn no lista a otros. Cada Mac debe entrar en \u21C4 con R+ Cloud, misma sala y <strong>Guardar perfil</strong> con @usuario; despu\xE9s aparecen aqu\xED y t\xFA los asignas al equipo (no al rev\xE9s).</p>`;
    }
    return `<p class="clinical-teams-section-desc clinical-teams-lan-member-hint">En <strong>Integrantes</strong> ver\xE1s compa\xF1eros cuando el admin te asigne a un equipo desde el directorio. Mientras tanto: \u21C4 \u2192 misma sala Nube, @usuario guardado.</p>`;
  } catch {
    return "";
  }
}
function resolveBrowseSala(elevated, homeSala) {
  if (!elevated) return homeSala;
  try {
    const stored = localStorage.getItem(BROWSE_SALA_LS);
    if (stored === "__all__") return "__all__";
    if (stored && CLINICAL_SALAS.includes(stored)) return stored;
  } catch (_e) {
    void _e;
  }
  if (!homeSala) return "__all__";
  return homeSala;
}
function buildDirectoryEmptyMessage(elevated, browseSala, homeSala) {
  const label = browseSala === "__all__" ? "ninguna sala" : escapeHtml(String(browseSala || homeSala));
  const userSala = String(clinicalSessionContext.user?.sala || homeSala || "").trim();
  if (isCloudSala(userSala) && !getCloudSyncToken()) {
    return "Falta sesi\xF3n Nube. Vuelve al paso anterior y guarda tu perfil con <strong>contrase\xF1a Nube</strong>, o inicia sesi\xF3n en <strong>\u21C4 Conexi\xF3n</strong>.";
  }
  if (isCloudSala(userSala) && getCloudSyncToken() && !isCloudSyncActive()) {
    return `Conecta la sala en <strong>\u21C4 Conexi\xF3n</strong> para traer equipos de ${label}, o crea uno con el bot\xF3n de arriba.`;
  }
  if (elevated) {
    return `No hay otros equipos en ${label}. Los tuyos aparecen arriba.`;
  }
  return `No hay otros equipos disponibles en ${label}. Pide c\xF3digo a tu R2 o espera asignaci\xF3n en Nube.`;
}
function buildDirectorySectionTitle(elevated, browseSala) {
  if (!elevated) return `Otros equipos \xB7 ${escapeHtml(browseSala)}`;
  if (browseSala === "__all__") return "Explorar \xB7 todas las salas";
  return `Explorar \xB7 ${escapeHtml(browseSala)}`;
}
function buildDirectoryBrowseControl(elevated, browseSala) {
  if (!elevated) return "";
  return `<label class="clinical-teams-browse-label" for="clinical-browse-sala">Sala</label>
        <select id="clinical-browse-sala" class="profile-input clinical-teams-browse-select" aria-label="Explorar equipos por sala">
          ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}" ${browseSala === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("")}
          <option value="__all__" ${browseSala === "__all__" ? "selected" : ""}>Todas las salas</option>
        </select>`;
}
function renderDirectoryTeamEntry(team, elevated) {
  const teamId = String(team.team_id || "");
  let joinBtn = "";
  let joinHint = "";
  if (team.joinEligible) {
    joinBtn = `<button type="button" class="btn-med-secondary clinical-teams-join-btn" data-team-id="${escapeAttr(teamId)}">Unirme</button>`;
    if (team.joinWarning) joinHint = String(team.joinWarning);
  } else if (team.joinReason) {
    joinHint = String(team.joinReason);
  }
  const manage = elevated ? renderTeamManageBlock(team) : { actionsHtml: "", editPanelHtml: "" };
  return renderDirectoryTeamCard(team, {
    joinBtnHtml: joinBtn,
    joinHintHtml: joinHint,
    manageHtml: manage.actionsHtml,
    editPanelHtml: manage.editPanelHtml
  });
}
async function renderDirectorySectionHtml(opts) {
  const { userId, elevated, browseSala, homeSala } = opts;
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsListBySala !== "function") return "";
  const listOpts = elevated && browseSala === "__all__" ? { sala: "", forUserId: userId, allSalas: true } : { sala: browseSala || homeSala, forUserId: userId };
  const res = await api2.dbClinicalTeamsListBySala(listOpts);
  const directory = (res?.ok && Array.isArray(res.teams) ? res.teams : []).filter((t) => !t.isMember);
  const browseControl = buildDirectoryBrowseControl(elevated, browseSala);
  const sectionTitle = buildDirectorySectionTitle(elevated, browseSala || homeSala);
  const sectionIntro = `
        <h4 class="clinical-teams-section-title">${sectionTitle}</h4>
        <p class="clinical-teams-section-desc">Equipos de la sala a los que puedes unirte.</p>`;
  const headRow = browseControl ? `<div class="clinical-teams-section-head-row clinical-teams-collapse-summary-head">
        <div class="clinical-teams-section-intro">${sectionIntro}</div>
        <div class="clinical-teams-collapse-summary-actions">${browseControl}</div>
      </div>` : `<div class="clinical-teams-section-intro">${sectionIntro}</div>`;
  if (!directory.length) {
    const emptyMsg = buildDirectoryEmptyMessage(elevated, browseSala, homeSala);
    return `<section class="clinical-teams-section clinical-teams-section--directory">
      ${renderClinicalTeamsCollapsible({
      collapseKey: "section.directory",
      defaultOpen: true,
      className: "clinical-teams-collapse--section",
      summaryHtml: headRow,
      bodyHtml: `<p class="clinical-teams-empty">${emptyMsg}</p>`
    })}
    </section>`;
  }
  const cards = directory.map((team) => renderDirectoryTeamEntry(team, elevated)).join("");
  return `
    <section class="clinical-teams-section clinical-teams-section--directory">
      ${renderClinicalTeamsCollapsible({
    collapseKey: "section.directory",
    defaultOpen: true,
    className: "clinical-teams-collapse--section",
    summaryHtml: headRow,
    bodyHtml: `<div class="clinical-teams-list">${cards}</div>`
  })}
    </section>`;
}

// public/js/features/clinical-teams/teams-roster-panel-build.mjs
function resolveDisplayLanHandle(user, usernameForInput) {
  const saved = normalizeUsername(user?.username || "");
  if (saved && isValidUsernameFormat(saved)) return saved;
  const draft = normalizeUsername(usernameForInput || "");
  if (draft && isValidUsernameFormat(draft)) return draft;
  return "";
}
async function resolveClinicalTeamsPanelContext(user, joined) {
  let clientId = "";
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    clientId = String(settings.clientId || "");
  } catch (_e) {
    void _e;
  }
  const rawUsername = String(user.username || "");
  const legacyUsername = isLegacyMachineUsername(rawUsername, clientId);
  const { needsClinicalLanProfileGate, ensureLanProfileGateDeviceReset } = await import("/mobile/js/chunks/clinical-settings-VUNDYSKU.js");
  settings = ensureLanProfileGateDeviceReset(settings);
  const profileGatePending = needsClinicalLanProfileGate(settings);
  const usernameForInput = profileGatePending ? "" : legacyUsername ? String(settings.clinicalUsername || "").trim() : rawUsername;
  const displayHandle = resolveDisplayLanHandle(user, usernameForInput);
  const savedHandle = normalizeUsername(user.username || "");
  const rank = effectiveClinicalRank(user);
  const programAdmin = hasProgramAdminPrivileges(user);
  const canViewLanUsers = canViewLanUserDirectory(user);
  const sala = String(user.sala || "").trim();
  return {
    legacyUsername,
    profileGatePending,
    usernameForInput,
    displayHandle,
    savedHandle,
    rank,
    programAdmin,
    canViewLanUsers,
    sala,
    joined
  };
}
function buildClinicalTeamsHandleHint(ctx) {
  if (!ctx.displayHandle) return "";
  return `<p class="clinical-teams-lead clinical-teams-handle-hint">Tu @usuario: <strong>@${escapeHtml(ctx.displayHandle)}</strong> \u2014 comp\xE1rtelo para que te agreguen a un equipo.${ctx.savedHandle !== ctx.displayHandle ? " Pulsa <strong>Guardar perfil</strong> para publicarlo en R+ Cloud." : ""}</p>`;
}
function buildClinicalProfileSectionHtml(ctx, user) {
  const clinicalName = ctx.profileGatePending ? "" : escapeHtml(user.clinical_name || "");
  const legacyBanner = ctx.legacyUsername ? '<p class="clinical-teams-legacy-banner">Registra tu @usuario (obligatorio). Sin esto no apareces en equipos ni entregas.</p>' : "";
  const lanDirectoryNote = ctx.canViewLanUsers ? "" : `<p class="clinical-teams-lan-directory-note">El directorio completo de usuarios lo abren <strong>R4</strong>, <strong>Admin</strong> o quien tenga <strong>privilegios de administraci\xF3n</strong>. Al registrar <strong>@usuario</strong> con\xE9ctate a <strong>R+ Cloud</strong> en \u21C4; R+ publica tu perfil al guardar.</p>`;
  const profileHandleBanner = ctx.displayHandle ? `<p class="clinical-teams-profile-handle">Visible en R+ Cloud como <strong>@${escapeHtml(ctx.displayHandle)}</strong></p>` : "";
  return `
    <div class="clinical-teams-profile-panel clinical-teams-rank-section">
      <h5 class="clinical-teams-subsection-title">Mi perfil y rango</h5>
      ${legacyBanner}
      ${profileHandleBanner}
      ${lanDirectoryNote}
      <form id="clinical-profile-form" class="clinical-teams-create-form" novalidate>
        <div class="field-group">
          <label for="clinical-profile-username">Usuario (@usuario) *</label>
          <input id="clinical-profile-username" type="text" class="profile-input"
            value="${escapeAttr(ctx.usernameForInput)}"
            placeholder="ej. drmendoza" autocomplete="off" spellcheck="false"
            pattern="[a-z][a-z0-9_]{2,31}" required>
          ${hintHtml("@usuario: min\xFAsculas, sin espacios \u2014 p. ej. drmendoza. No es tu nombre en guardia.")}
        </div>
        <div class="field-group">
          <label for="clinical-profile-name">Nombre en guardia</label>
          <input id="clinical-profile-name" type="text" class="profile-input" value="${clinicalName}" required>
        </div>
        <div class="field-group">
          <label for="clinical-profile-rank">Rango cl\xEDnico</label>
          <select id="clinical-profile-rank" class="profile-input">
            ${["R1", "R2", "R3", "R4"].map(
    (r) => `<option value="${r}" ${r === ctx.rank ? "selected" : ""}>${r}</option>`
  ).join("")}
          </select>
          ${hintHtml("Equipos, entregas y alcance cl\xEDnico.")}
        </div>
        <div class="field-group">
          <label class="clinical-teams-guardia-label">
            <input type="checkbox" id="clinical-profile-admin" ${ctx.programAdmin ? "checked" : ""}>
            <span>Privilegios de administraci\xF3n</span>
          </label>
          ${hintHtml("Requiere tu c\xF3digo al activar. Acceso total al programa: rotaci\xF3n, censo global y directorio de usuarios.")}
        </div>
        <div class="field-group">
          <label for="clinical-profile-sala">${ctx.programAdmin ? "Mi sala (rango cl\xEDnico)" : "Sala"}</label>
          <select id="clinical-profile-sala" class="profile-input" required>
            <option value="">\u2014 Seleccionar \u2014</option>
            ${CLINICAL_SALAS.map(
    (s) => `<option value="${escapeAttr(s)}" ${ctx.sala === s ? "selected" : ""}>${escapeHtml(s)}</option>`
  ).join("")}
          </select>
          ${ctx.programAdmin ? hintHtml("Tu equipo y entregas usan esta sala; abajo puedes explorar otras.") : ""}
        </div>
        <div class="modal-actions clinical-teams-profile-save">
          <button type="submit" class="btn-save">Guardar perfil</button>
        </div>
      </form>
    </div>`;
}
function buildJoinedTeamsSectionHtml(ctx, joinedHtml, lanMemberHint) {
  return `
    <section class="clinical-teams-section clinical-teams-section--joined">
      ${renderClinicalTeamsCollapsible({
    collapseKey: "section.joined",
    defaultOpen: true,
    className: "clinical-teams-collapse--section",
    summaryHtml: `
          <h4 class="clinical-teams-section-title">Mis equipos</h4>
          <p class="clinical-teams-section-desc">Equipos donde ya eres integrante.</p>`,
    bodyHtml: `${lanMemberHint}<div class="clinical-teams-list">${joinedHtml}</div>`
  })}
    </section>`;
}
function buildRotationAdminSectionHtml(user) {
  if (!canConfigureRotation(user)) return "";
  return `
    <section class="clinical-teams-section clinical-teams-section--rotation" aria-label="Cambiar de rotaci\xF3n">
      <div class="clinical-teams-rotation-card">
        <h4 class="clinical-teams-section-title">Cambiar de rotaci\xF3n</h4>
        <p class="clinical-teams-section-desc">Mes nuevo o cambio de equipos del servicio. Archiva equipos activos y limpia guardias del d\xEDa; los residentes vuelven a crear o unirse.</p>
        <div class="clinical-teams-advanced-rotation-actions">
          <button type="button" id="btn-nueva-rotacion" class="btn-med-secondary clinical-teams-nueva-rotacion-btn">Iniciar nueva rotaci\xF3n\u2026</button>
          <button type="button" id="btn-rotation-config-open" class="btn-med-secondary">Calendario de vigencia\u2026</button>
        </div>
      </div>
    </section>`;
}
function buildClinicalTeamsConfigSectionHtml(profileSection) {
  return `
    <section class="clinical-teams-section clinical-teams-section--more">
      ${renderClinicalTeamsCollapsible({
    collapseKey: "section.config",
    defaultOpen: false,
    className: "clinical-teams-collapse--section",
    summaryHtml: `
          <h4 class="clinical-teams-section-title">Configuraci\xF3n</h4>
          <p class="clinical-teams-section-desc">Perfil cl\xEDnico y rango.</p>`,
    bodyHtml: profileSection
  })}
    </section>`;
}
function buildJoinedTeamsEmptyHtml(displayHandle) {
  return `<p class="clinical-teams-empty clinical-teams-empty--section">A\xFAn no perteneces a ning\xFAn equipo. ${displayHandle ? "Pide que te agreguen con tu @usuario o " : ""}explora equipos en tu sala abajo.</p>`;
}

// public/js/features/clinical-teams/teams-roster-panel.mjs
async function renderClinicalTeamsPanel(opts = {}) {
  const silent = !!opts.silent;
  const skipLanPull = !!opts.skipLanPull || silent;
  if (silent) {
    const host = getClinicalTeamsPanelHost();
    if (!host) return;
    try {
      await renderClinicalTeamsPanelInto(host, {
        skipLanPull,
        preserveDraft: opts.preserveDraft !== false
      });
    } catch (err) {
      console.error("[Mi rotaci\xF3n]", err);
      setClinicalTeamsPanelError(
        err instanceof Error ? err.message : "Error al cargar Mi rotaci\xF3n."
      );
    }
    return;
  }
  await safeRenderClinicalTeamsPanel(async (host) => {
    await renderClinicalTeamsPanelInto(host, { skipLanPull: false });
  });
}
async function tryReconcileTeamMemberships() {
  const userId = currentUserId();
  const user = clinicalSessionContext.user;
  if (!userId || !user) return false;
  let joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  if (joined.length) return false;
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalMembershipMigrate !== "function") return false;
  const settings = readRpcSettings();
  const fromUserId = String(settings.clinicalStaleDeviceUserId || "");
  if (!fromUserId || fromUserId === userId) return false;
  const res = await api2.dbClinicalMembershipMigrate({ fromUserId, toUserId: userId });
  if (!res?.ok) return false;
  await fetchClinicalTeamsFromDb();
  joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  return joined.length > 0;
}
async function maybeRefreshClinicalOpsDirectory(skipPull, browseSala, homeSala) {
  if (skipPull) return;
  const ok = await refreshClinicalOpsDirectory({
    timeoutMs: 12e3,
    browseSala,
    homeSala
  });
  const bd = document.getElementById("clinical-teams-backdrop");
  if (!ok || !bd?.classList.contains("open")) return;
  if (isClinicalTeamsPanelUserInteracting()) return;
  void renderClinicalTeamsPanel({ silent: true, skipLanPull: true, preserveDraft: true });
}
async function renderClinicalTeamsPanelInto(host, opts = {}) {
  const userId = currentUserId();
  if (!userId) {
    host.innerHTML = '<p class="clinical-teams-lead">Activa la sesi\xF3n cl\xEDnica para gestionar equipos.</p>';
    return;
  }
  const draft = opts.preserveDraft ? captureClinicalTeamsPanelDraft(host) : null;
  const user = clinicalSessionContext.user || {};
  const preBrowseSala = resolveBrowseSala(hasElevatedTeamPrivileges(user), String(user.sala || ""));
  await maybeRefreshClinicalOpsDirectory(opts.skipLanPull, preBrowseSala, String(user.sala || ""));
  await fetchClinicalTeamsFromDb();
  await tryReconcileTeamMemberships();
  const joined = filterJoinedTeams(clinicalSessionContext.teams, user);
  const ctx = await resolveClinicalTeamsPanelContext(user, joined);
  const elevated = hasElevatedTeamPrivileges(user);
  const joinedHtml = joined.length ? joined.map((team) => renderJoinedTeamCard(team)).join("") : buildJoinedTeamsEmptyHtml(ctx.displayHandle);
  const profileSection = buildClinicalProfileSectionHtml(ctx, user);
  const browseSala = resolveBrowseSala(elevated, ctx.sala);
  const joinCodeSection = renderJoinWithCodeSectionHtml();
  const lanMemberHint = await resolveLanTeamMemberHintHtml(joined);
  const directorySection = await renderDirectorySectionHtml({
    userId,
    elevated,
    browseSala,
    homeSala: ctx.sala
  });
  host.innerHTML = `
    ${buildClinicalTeamsHandleHint(ctx)}
    ${buildRotationAdminSectionHtml(user)}
    ${renderCreateTeamSectionHtml()}
    ${buildJoinedTeamsSectionHtml(ctx, joinedHtml, lanMemberHint)}
    ${directorySection}
    ${joinCodeSection}
    ${buildClinicalTeamsConfigSectionHtml(profileSection)}`;
  wireLanUsersDirectoryControls();
  syncRotationConfigButton();
  wireRotationConfigOpenControl(host);
  wireNuevaRotacionControl(host);
  const { wireRenderedClinicalTeamsPanel: wireRenderedClinicalTeamsPanel2 } = await import("/mobile/js/chunks/teams-roster-interactions-WUOGI2MY.js");
  wireRenderedClinicalTeamsPanel2(elevated);
  restoreClinicalTeamsPanelDraft(host, draft);
}

// public/js/features/clinical-teams/teams-roster-shell.mjs
function teamsModalEl() {
  return document.getElementById("clinical-teams-backdrop");
}
function isClinicalTeamsPanelOpen() {
  const bd = teamsModalEl();
  return !!(bd && bd.classList.contains("open"));
}
async function refreshTeamsUiAfterChange(opts = {}) {
  const { isLanDirectoryModalOpen: isLanDirectoryModalOpen2 } = await import("/mobile/js/chunks/teams-roster-lan-MDLEKJXB.js");
  if (isLanDirectoryModalOpen2()) return;
  const { refreshClinicalPatientListForScope: refreshClinicalPatientListForScope2 } = await import("/mobile/js/chunks/clinical-access-runtime-KABKCTTJ.js");
  await refreshClinicalPatientListForScope2({ allowLanPull: true });
  import("/mobile/js/chunks/clinical-rotation-entry-2SRV3X5Y.js").then((m) => m.syncClinicalRotationEntryChrome());
  if (isClinicalTeamsPanelOpen()) {
    if (!opts.force) {
      const { isClinicalTeamsPanelUserInteracting: isClinicalTeamsPanelUserInteracting2 } = await import("/mobile/js/chunks/teams-roster-panel-draft-G5ETCWQP.js");
      if (isClinicalTeamsPanelUserInteracting2()) return;
    }
    await renderClinicalTeamsPanel({ silent: true, skipLanPull: true, preserveDraft: !opts.force });
  }
}
async function openClinicalTeamsPanel(opts = {}) {
  const bd = teamsModalEl();
  if (!bd) return;
  showClinicalTeamsPanelShell();
  try {
    const { wireClinicalTeamsModalChrome: wireClinicalTeamsModalChrome2 } = await import("/mobile/js/chunks/teams-roster-modal-chrome-PS6OL6BV.js");
    wireClinicalTeamsModalChrome2();
  } catch {
  }
  void import("/mobile/js/chunks/cloud-mobile-lan-strip-ZXR3OTYP.js").then((m) => {
    if (typeof m.stopLanAutoDiscovery === "function") m.stopLanAutoDiscovery();
  }).catch(() => {
  });
  const sessionOk = await ensureClinicalPanelSession({ interactive: true });
  if (!sessionOk) {
    closeClinicalTeamsPanel();
    const mainMod = await import("/mobile/js/chunks/clinical-onboarding-main-ZM6SYRA6.js");
    const msg = await mainMod.describeOnboardingSessionBlock();
    if (typeof window.showToast === "function") {
      window.showToast(msg, "error");
    }
    if (!opts.skipProfileGate && !mainMod.focusMainClinicalOnboarding()) {
      await mainMod.showMainClinicalOnboarding();
    }
    return;
  }
  try {
    if (!opts.skipProfileGate) {
      const { needsClinicalOnboarding } = await import("/mobile/js/chunks/clinical-onboarding-TRAOJJVA.js");
      if (needsClinicalOnboarding()) {
        closeClinicalTeamsPanel();
        const mainMod = await import("/mobile/js/chunks/clinical-onboarding-main-ZM6SYRA6.js");
        await mainMod.showMainClinicalOnboarding();
        mainMod.focusMainClinicalOnboarding();
        return;
      }
    }
  } catch (err) {
    console.error("[Mi rotaci\xF3n]", err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : "No se pudo abrir Mi rotaci\xF3n."
    );
    return;
  }
  try {
    await renderClinicalTeamsPanel();
    const panelBody = getClinicalTeamsPanelHost();
    if (panelBody) panelBody.scrollTop = 0;
  } catch (err) {
    console.error("[Mi rotaci\xF3n]", err);
    setClinicalTeamsPanelError(
      err instanceof Error ? err.message : "No se pudo abrir Mi rotaci\xF3n."
    );
  }
}
function closeClinicalTeamsPanel() {
  const bd = teamsModalEl();
  if (!bd) return;
  closeModalAnimated(bd, function() {
    document.body.classList.remove("clinical-teams-modal-open");
    void import("/mobile/js/chunks/cloud-mobile-lan-strip-ZXR3OTYP.js").then((m) => {
      if (typeof m.startLanAutoDiscovery === "function") m.startLanAutoDiscovery();
    }).catch(() => {
    });
  });
}

// public/js/features/clinical-teams/teams-roster-manage.mjs
function closeTeamEditPanels(exceptPanel) {
  document.querySelectorAll(".clinical-teams-edit-panel").forEach((panel) => {
    if (exceptPanel && panel === exceptPanel) return;
    panel.hidden = true;
  });
}
function teamManageDelegationRoot() {
  return document.getElementById("clinical-teams-panel-body") || teamsModalEl()?.querySelector(".clinical-teams-modal") || null;
}
function wireTeamManageModalDelegation() {
  const root = teamManageDelegationRoot();
  if (!root || root._rpcTeamManageDelegated) return;
  root._rpcTeamManageDelegated = true;
  root.addEventListener("click", (ev) => {
    const target = ev.target instanceof Element ? ev.target : null;
    if (!target) return;
    const leaveBtn = target.closest(".clinical-teams-leave-btn");
    if (leaveBtn instanceof HTMLButtonElement) {
      void handleLeaveTeamClick(leaveBtn);
      return;
    }
    if (!canManageTeamRoster(clinicalSessionContext.user)) return;
    const editBtn = target.closest(".clinical-teams-edit-btn");
    if (editBtn) {
      const card = editBtn.closest(".clinical-teams-card");
      const panel = card?.querySelector(".clinical-teams-edit-panel");
      if (panel instanceof HTMLElement) {
        closeTeamEditPanels(panel);
        panel.hidden = !panel.hidden;
      }
      return;
    }
    const cancelBtn = target.closest(".clinical-teams-edit-cancel");
    if (cancelBtn) {
      const panel = cancelBtn.closest(".clinical-teams-edit-panel");
      if (panel instanceof HTMLElement) panel.hidden = true;
      return;
    }
    const deleteBtn = target.closest(".clinical-teams-delete-btn");
    if (deleteBtn instanceof HTMLButtonElement) {
      void handleDeleteTeamClick(deleteBtn);
      return;
    }
    const removeMemberBtn = target.closest(".clinical-teams-member-remove-btn");
    if (removeMemberBtn instanceof HTMLButtonElement) {
      void handleRemoveMemberClick(removeMemberBtn);
    }
  });
}
async function handleRemoveMemberClick(btn) {
  const targetUserId = String(btn.dataset.userId || "").trim();
  const label = String(btn.dataset.userLabel || "").trim() || targetUserId;
  if (!targetUserId) return;
  const ok = window.confirm(
    `\xBFQuitar a \xAB${label}\xBB del equipo y de la base cl\xEDnica en esta Mac?

Desaparecer\xE1 de Integrantes al sincronizar clinicalOps con la sala.`
  );
  if (!ok) return;
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalUserDelete !== "function") {
    toast2("Quitar integrantes requiere R+ de escritorio con base cl\xEDnica desbloqueada.", "error");
    return;
  }
  btn.disabled = true;
  const res = await api2.dbClinicalUserDelete({
    targetUserId,
    callerUserId: currentUserId()
  });
  btn.disabled = false;
  if (!res?.ok) {
    toast2(res?.error || "No se pudo quitar el integrante.", "error");
    return;
  }
  toast2("Integrante quitado.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}
async function handleLeaveTeamClick(btn) {
  const teamId = String(btn.dataset.teamId || "").trim();
  const teamName = String(btn.dataset.teamName || "este equipo").trim();
  const userId = currentUserId();
  if (!teamId || !userId) return;
  const ok = window.confirm(
    `\xBFSalir del equipo \xAB${teamName}\xBB?

Dejar\xE1s de ver los pacientes asignados a ese equipo en Mi rotaci\xF3n.`
  );
  if (!ok) return;
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsMemberRemove !== "function") {
    toast2("No se pudo salir del equipo.", "error");
    return;
  }
  btn.disabled = true;
  const res = await api2.dbClinicalTeamsMemberRemove({ teamId, userId });
  btn.disabled = false;
  if (!res || res.ok === false) {
    toast2(String(res?.error || "No se pudo salir del equipo."), "error");
    return;
  }
  toast2("Saliste del equipo.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
  await refreshTeamsUiAfterChange();
}
async function handleDeleteTeamClick(btn) {
  const teamId = String(btn.dataset.teamId || "").trim();
  const teamName = String(btn.dataset.teamName || "este equipo").trim();
  if (!teamId) return;
  const ok = window.confirm(
    `\xBFEliminar el equipo \xAB${teamName}\xBB?

Se quitar\xE1n sus integrantes. Esta acci\xF3n no se puede deshacer.`
  );
  if (!ok) return;
  const userId = currentUserId();
  const api2 = dbApi3();
  if (!userId || !api2 || typeof api2.dbClinicalTeamsArchive !== "function") {
    toast2("No se pudo eliminar el equipo.", "error");
    return;
  }
  btn.disabled = true;
  const res = await api2.dbClinicalTeamsArchive({ teamId, callerUserId: userId });
  btn.disabled = false;
  if (!res || res.ok === false) {
    toast2(res?.error || "No se elimin\xF3 el equipo.", "error");
    return;
  }
  toast2("Equipo eliminado.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
}
async function handleEditTeamSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || "").trim();
  const nameInput = form.querySelector(".clinical-teams-edit-name");
  const salaSelect = form.querySelector(".clinical-teams-edit-sala");
  const name = nameInput instanceof HTMLInputElement ? String(nameInput.value || "").trim() : "";
  const sala = salaSelect instanceof HTMLSelectElement ? String(salaSelect.value || "").trim() : "";
  if (!teamId || !name || !sala) {
    toast2("Indica nombre y sala.", "error");
    return;
  }
  const userId = currentUserId();
  const api2 = dbApi3();
  if (!userId || !api2 || typeof api2.dbClinicalTeamsUpdate !== "function") {
    toast2("No se pudo guardar el equipo.", "error");
    return;
  }
  await submitTeamEdit(api2, { teamId, name, sala, userId, form });
}
async function submitTeamEdit(api2, { teamId, name, sala, userId, form }) {
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = true;
  const res = await api2.dbClinicalTeamsUpdate({
    teamId,
    name,
    sala,
    callerUserId: userId
  });
  if (submitBtn instanceof HTMLButtonElement) submitBtn.disabled = false;
  if (!res || res.ok === false) {
    toast2(res?.error || "No se guard\xF3 el equipo.", "error");
    return;
  }
  toast2("Equipo actualizado.", "success");
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  await publishClinicalTeamsToLan();
}

// lib/admin-access-code.mjs
var ADMIN_ACCESS_CODE = "Msg170699";
function verifyAdminAccessCode(input) {
  return String(input ?? "").trim() === ADMIN_ACCESS_CODE;
}

// public/js/features/clinical-teams/teams-roster-profile-claim.mjs
function clientIdFromSettings() {
  try {
    return String(JSON.parse(localStorage.getItem("rpc-settings") || "{}").clientId || "");
  } catch {
    return "";
  }
}
async function confirmUsernameChange(currentUsername, username) {
  if (!currentUsername || isLegacyMachineUsername(currentUsername, clientIdFromSettings())) {
    return true;
  }
  return window.confirm(
    `\xBFCambiar tu usuario de @${currentUsername} a @${username}? Los equipos ver\xE1n el nuevo nombre.`
  );
}
async function tryResumeExistingUsername(username, errMsg) {
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch (_e) {
    void _e;
  }
  const resume = window.confirm(
    `El usuario @${username} ya existe.

\xBFRecuperar tu cuenta en este dispositivo?`
  );
  if (!resume) {
    toast2(errMsg, "error");
    return false;
  }
  const resumeRes = await resumeClinicalIdentityByUsername(
    username,
    settings,
    clientIdFromSettings()
  );
  if (!resumeRes.ok) {
    toast2(resumeRes.error || errMsg, "error");
    return false;
  }
  return true;
}
async function submitUsernameClaim(userId, username) {
  const api2 = dbApi3();
  if (typeof api2.dbClinicalUsernameClaim !== "function") {
    toast2("No se pudo guardar el @usuario.", "error");
    return false;
  }
  const claimRes = await api2.dbClinicalUsernameClaim({ userId, username });
  if (claimRes?.ok) return true;
  const errMsg = String(claimRes?.error || "");
  if (/ya está en uso/i.test(errMsg)) {
    return tryResumeExistingUsername(username, errMsg);
  }
  toast2(errMsg || "No se pudo guardar el usuario.", "error");
  return false;
}
async function claimClinicalUsernameIfNeeded(username, sala) {
  const userId = currentUserId();
  const api2 = dbApi3();
  const currentUsername = normalizeUsername(clinicalSessionContext.user?.username || "");
  const usernameWillChange = shouldClaimClinicalUsername(
    currentUsername,
    username,
    clientIdFromSettings()
  );
  if (!usernameWillChange) return null;
  if (!userId || !api2) return false;
  const { assertLanRoomForUsernameRegister } = await import("/mobile/js/chunks/clinical-profile-cloud-stubs-GF7A2CZZ.js");
  await assertLanRoomForUsernameRegister({ sala });
  if (!await confirmUsernameChange(currentUsername, username)) return false;
  const claimed = await submitUsernameClaim(userId, username);
  if (!claimed) return false;
  if (clinicalSessionContext.user) clinicalSessionContext.user.username = username;
  return true;
}

// public/js/features/cloud-sync/cloud-sala-upgrade.mjs
var CLOUD_SALA_UPGRADE_KEY = "cloudSyncSalaUpgrade";
function isCloudSalaUpgradePending(settings = readRpcSettings()) {
  return String(settings?.[CLOUD_SALA_UPGRADE_KEY] || "") === "pending";
}
function setCloudSalaUpgradePending(value) {
  const s = readRpcSettings();
  if (value) s[CLOUD_SALA_UPGRADE_KEY] = "pending";
  else delete s[CLOUD_SALA_UPGRADE_KEY];
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(s));
  } catch {
  }
  return s;
}
function clearCloudSalaUpgradePending() {
  return setCloudSalaUpgradePending(false);
}
function maybeMarkCloudSalaUpgrade(_prevSala, _nextSala) {
  return false;
}

// public/js/features/clinical-teams/teams-roster-profile-persist.mjs
function syncProgramAdminFlag(isProgramAdmin, res) {
  if (!clinicalSessionContext.user) return;
  if (isProgramAdmin !== void 0) {
    clinicalSessionContext.user.is_program_admin = isProgramAdmin ? 1 : 0;
    return;
  }
  if (res.profile?.is_program_admin != null) {
    clinicalSessionContext.user.is_program_admin = res.profile.is_program_admin === 1 ? 1 : 0;
  }
}
function applyProfileUpsertToSession(res, { rank, sala, clinicalName, isProgramAdmin }) {
  if (!clinicalSessionContext.user) return;
  const savedRank = String(res.profile?.rank || rank || "");
  clinicalSessionContext.user.rank = savedRank === "Admin" ? "R1" : savedRank || clinicalSessionContext.user.rank;
  if (sala != null) clinicalSessionContext.user.sala = sala;
  if (clinicalName) clinicalSessionContext.user.clinical_name = clinicalName;
  if (res.profile?.username) clinicalSessionContext.user.username = res.profile.username;
  syncProgramAdminFlag(isProgramAdmin, res);
  if (String(res.profile?.rank || "") === "Admin") {
    clinicalSessionContext.user.is_program_admin = 1;
  }
}
function buildProfileBinding({ userId, username, clinicalName, rank, sala, isProgramAdmin }) {
  const settings = readRpcSettings();
  const binding = {
    userId,
    username: username || settings.clinicalUsername,
    displayName: clinicalName || settings.clinicalDisplayName,
    rank: rank || settings.clinicalRank,
    sala: sala ?? settings.clinicalSala,
    isProgramAdmin,
    registered: true
  };
  if (!isClinicalLocalOnlyMode(settings)) {
    binding.lanProfileGateComplete = true;
  }
  return binding;
}
async function persistProfileFromPanel(fields) {
  const userId = currentUserId();
  const api2 = dbApi3();
  if (!userId || !api2 || typeof api2.dbClinicalProfileUpsert !== "function") {
    toast2("Base de datos no disponible.", "error");
    return false;
  }
  const prevSala = String(clinicalSessionContext.user?.sala || readRpcSettings().clinicalSala || "");
  const nextSala = String(fields.sala ?? prevSala);
  const upgraded = maybeMarkCloudSalaUpgrade(prevSala, nextSala);
  const ok = await submitProfileUpsert(api2, userId, fields);
  if (ok && upgraded) {
    toast2("Sala Nube: completa el registro de contrase\xF1a.", "info");
    try {
      const main = await import("/mobile/js/chunks/clinical-onboarding-main-ZM6SYRA6.js");
      await main.refreshMainClinicalOnboardingIfNeeded?.();
    } catch {
    }
  }
  return ok;
}
async function submitProfileUpsert(api2, userId, fields) {
  const res = await api2.dbClinicalProfileUpsert({
    userId,
    clinicalName: fields.clinicalName || clinicalSessionContext.user?.clinical_name || "",
    rank: fields.rank || effectiveClinicalRank(clinicalSessionContext.user),
    sala: fields.sala ?? clinicalSessionContext.user?.sala ?? null,
    isProgramAdmin: fields.isProgramAdmin,
    adminAccessCode: fields.adminAccessCode ?? void 0
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se guard\xF3 el perfil.", "error");
    return false;
  }
  persistClinicalUserBinding(buildProfileBinding({ userId, ...fields }));
  applyProfileUpsertToSession(res, fields);
  return true;
}

// public/js/features/clinical-teams/teams-roster-profile.mjs
function readProfileFormFields() {
  return {
    username: normalizeUsername(
      String(document.getElementById("clinical-profile-username")?.value || "")
    ),
    rank: String(document.getElementById("clinical-profile-rank")?.value || "R1"),
    sala: String(document.getElementById("clinical-profile-sala")?.value || ""),
    clinicalName: String(document.getElementById("clinical-profile-name")?.value || "").trim(),
    adminCb: document.getElementById("clinical-profile-admin")
  };
}
async function resolveProgramAdminChange(adminCb, wasProgramAdmin) {
  const wantsProgramAdmin = adminCb instanceof HTMLInputElement ? adminCb.checked : false;
  if (wantsProgramAdmin === wasProgramAdmin) {
    return { isProgramAdmin: void 0, adminAccessCode: null, wantsProgramAdmin, wasProgramAdmin };
  }
  if (!wantsProgramAdmin) {
    return { isProgramAdmin: false, adminAccessCode: null, wantsProgramAdmin, wasProgramAdmin };
  }
  if (!isAdminAccessGrantedThisSession()) {
    const code = await promptAdminAccessCode();
    if (!code || !verifyAdminAccessCode(code)) {
      if (adminCb instanceof HTMLInputElement) adminCb.checked = wasProgramAdmin;
      if (code != null) toast2("C\xF3digo incorrecto.", "error");
      return null;
    }
    rememberAdminAccessCode(code);
  }
  return {
    isProgramAdmin: true,
    adminAccessCode: getVerifiedAdminAccessCode(),
    wantsProgramAdmin,
    wasProgramAdmin
  };
}
async function toastProfileSaveResult({ msg, usernameWillChange, sala }) {
  const { flushClinicalProfileToLan } = await import("/mobile/js/chunks/clinical-profile-cloud-stubs-GF7A2CZZ.js");
  const lanPush = await flushClinicalProfileToLan({ sala });
  if (!lanPush.ok && !isBenignLanPushSkipCode(lanPush.code)) {
    toast2(LAN_PROFILE_PUSH_FAILED_MSG, "warning");
  } else if (usernameWillChange && lanPush.ok) {
    toast2(`${msg} @usuario publicado en la sala \u21C4.`, "success");
  } else {
    toast2(msg, "success");
  }
}
async function handleProfileFormSubmit(ev) {
  ev.preventDefault();
  const fields = readProfileFormFields();
  const wasProgramAdmin = hasProgramAdminPrivileges(clinicalSessionContext.user);
  const adminChange = await resolveProgramAdminChange(fields.adminCb, wasProgramAdmin);
  if (!adminChange) return;
  if (!isValidUsernameFormat(fields.username)) {
    toast2("Usuario inv\xE1lido. Usa 3\u201332 caracteres en min\xFAsculas: letras, n\xFAmeros y _.", "error");
    return;
  }
  if (!fields.clinicalName) {
    toast2("Escribe tu nombre en guardia.", "error");
    return;
  }
  if (!currentUserId() || !dbApi3()) {
    toast2("Sesi\xF3n cl\xEDnica no disponible. Desbloquea la base de datos.", "error");
    return;
  }
  const claimResult = await claimClinicalUsernameIfNeeded(fields.username, fields.sala);
  if (claimResult === false) return;
  const usernameWillChange = claimResult === true;
  const ok = await persistProfileFromPanel({
    rank: fields.rank,
    sala: fields.sala,
    clinicalName: fields.clinicalName,
    isProgramAdmin: adminChange.isProgramAdmin,
    username: fields.username,
    adminAccessCode: adminChange.adminAccessCode
  });
  if (!ok) return;
  await refreshClinicalUserProfile();
  const msg = adminChange.wantsProgramAdmin && (adminChange.isProgramAdmin === true || adminChange.wasProgramAdmin) ? "Perfil guardado. Privilegios de administraci\xF3n activos." : "Perfil guardado.";
  await toastProfileSaveResult({ msg, usernameWillChange, sala: fields.sala });
  syncRotationConfigButton();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { force: true } }));
  void import("/mobile/js/chunks/mutate-bridge-clinical-ops-2EDFEEJT.js").then((mod) => {
    if (typeof mod.pushCloudClinicalOpsNow === "function") void mod.pushCloudClinicalOpsNow();
  }).catch(() => {
  });
  void import("/mobile/js/chunks/patients-FRNAP5DS.js").then((m) => m.renderPatientList()).catch(() => {
  });
}

// public/js/features/clinical-teams/team-select-options.mjs
function teamOptionHtml(team, selectedTeamId) {
  const id = String(team?.team_id || "");
  const label = String(team?.name || team?.service || "Equipo").trim() || "Equipo";
  const sel = id && id === String(selectedTeamId || "") ? " selected" : "";
  return '<option value="' + esc(id) + '"' + sel + ">" + esc(label) + "</option>";
}
function sortTeamsForSelect(teams) {
  return (teams || []).slice().sort((a, b) => {
    const ca = String(a.sub_area_fraction || "").localeCompare(String(b.sub_area_fraction || ""), "es");
    if (ca) return ca;
    const nameA = String(a.name || a.service || "").trim();
    const nameB = String(b.name || b.service || "").trim();
    return nameA.localeCompare(nameB, "es");
  });
}
function buildTeamSelectOptions(teams, selectedTeamId, opts = {}) {
  const list = Array.isArray(teams) ? teams : [];
  if (!opts.groupBySala) {
    return sortTeamsForSelect(list).map((team) => teamOptionHtml(team, selectedTeamId)).join("");
  }
  const bySala = /* @__PURE__ */ new Map();
  for (const team of list) {
    const teamSala = String(team?.sala || "").trim() || "Sin sala";
    if (!bySala.has(teamSala)) bySala.set(teamSala, []);
    bySala.get(teamSala).push(team);
  }
  const salaOrder = [
    ...CLINICAL_SALA_VALUES.filter((s) => bySala.has(s)),
    ...[...bySala.keys()].filter((s) => !CLINICAL_SALA_VALUES.includes(s)).sort((a, b) => a.localeCompare(b, "es"))
  ];
  return salaOrder.map((sala) => {
    const optsHtml = sortTeamsForSelect(bySala.get(sala) || []).map((team) => teamOptionHtml(team, selectedTeamId)).join("");
    return '<optgroup label="' + esc(sala) + '">' + optsHtml + "</optgroup>";
  }).join("");
}

// public/js/patient-team-assign-ui.mjs
function dbApi4() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function assignableTeamsForUser(user) {
  const teams = clinicalSessionContext.teams || [];
  if (!user?.user_id) return [];
  if (hasElevatedTeamPrivileges(user)) return teams.filter((t) => t && t.team_id);
  return filterJoinedTeams(teams, user);
}
function shouldGroupAssignableTeamsBySala(user) {
  return hasElevatedTeamPrivileges(user);
}
function teamLabelById(teamId) {
  const id = String(teamId || "").trim();
  if (!id) return "";
  const teams = [
    ...clinicalSessionContext.teams || [],
    ...clinicalSessionContext.scopeContext?.teams || [],
    ...clinicalSessionContext.scopeContext?.teams_archived || []
  ];
  const team = teams.find((t) => String(t?.team_id) === id);
  if (!team) return `Equipo archivado (${id.slice(0, 8)}\u2026)`;
  const name = String(team.name || team.service || "Equipo").trim() || "Equipo";
  return team.archived_at ? `${name} (archivado)` : name;
}
function activePatientTeamId(patientId) {
  const ctx = getClinicalScopeContextForEvaluate();
  return resolvePatientTeamIdFromAssignments(
    String(patientId || ""),
    ctx.assignments || [],
    ctx.now || (/* @__PURE__ */ new Date()).toISOString()
  );
}
async function notifyPatientTeamAssigned(pid, tid) {
  syncLocalPatientSalaFromTeamAssignment(pid, tid);
  await fetchClinicalScopeContextFromDb();
  const lan = await import("/mobile/js/chunks/mutate-bridge-7CJF23JI.js").catch(() => null);
  if (lan?.pushClinicalOpsLanNow) await lan.pushClinicalOpsLanNow();
  try {
    const cloud = await import("/mobile/js/chunks/mutate-bridge-7CJF23JI.js");
    if (typeof cloud.scheduleCloudSyncPush === "function") cloud.scheduleCloudSyncPush();
  } catch {
  }
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("rpc-patient-team-assigned", { detail: { patientId: pid, teamId: tid } }));
    document.dispatchEvent(
      new CustomEvent("rpc-clinical-teams-changed", {
        detail: { source: "patient-team-assign", sala: clinicalSessionContext.user?.sala }
      })
    );
  }
}
function syncLocalPatientSalaFromTeamAssignment(patientId, teamId) {
  const pid = String(patientId || "").trim();
  const tid = String(teamId || "").trim();
  if (!pid || !tid) return;
  const patient = (patients || []).find((p) => String(p?.id) === pid);
  if (!patient) return;
  const team = (clinicalSessionContext.teams || []).find((t) => String(t?.team_id) === tid);
  if (!team) return;
  const prev = String(patient.sala || "").trim();
  stampPatientClinicalSala(patient, clinicalSessionContext.user, { team });
  if (String(patient.sala || "").trim() !== prev) saveState();
}
async function assignPatientToTeamClinical(patientId, teamId) {
  const api2 = dbApi4();
  const pid = String(patientId || "").trim();
  const tid = String(teamId || "").trim();
  if (!api2 || !pid || !tid || typeof api2.dbClinicalAssignPatientToTeam !== "function") {
    return { ok: false, error: "not_available" };
  }
  try {
    const res = await api2.dbClinicalAssignPatientToTeam({
      patientId: pid,
      teamId: tid,
      effectiveAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (!res || res.ok === false) return { ok: false, error: res?.error || "assign_failed" };
    await notifyPatientTeamAssigned(pid, tid);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : "assign_failed" };
  }
}
function defaultPatientRegistrationTeamId(user) {
  const teams = assignableTeamsForUser(user);
  if (!teams.length) return "";
  if (teams.length === 1) return String(teams[0].team_id || "");
  const preferred = resolveActiveTeamFilterId(user, clinicalSessionContext.teams || []);
  if (preferred && teams.some((t) => String(t.team_id) === preferred)) return preferred;
  return "";
}
function syncPatientRegistrationTeamSelect(selectedTeamId) {
  if (typeof document === "undefined") return;
  const group = document.getElementById("m-team-group");
  const select = document.getElementById("m-team");
  if (!group || !select) return;
  const user = clinicalSessionContext.user;
  const teams = assignableTeamsForUser(user);
  if (!teams.length) {
    group.style.display = "none";
    select.innerHTML = '<option value="">\u2014 Sin asignar \u2014</option>';
    select.value = "";
    return;
  }
  group.style.display = "";
  const selected = String(selectedTeamId || defaultPatientRegistrationTeamId(user) || "");
  select.innerHTML = '<option value="">\u2014 Sin asignar \u2014</option>' + buildTeamSelectOptions(teams, selected, {
    groupBySala: shouldGroupAssignableTeamsBySala(user)
  });
  select.value = selected;
}
function readPatientRegistrationTeamId() {
  if (typeof document === "undefined") return "";
  const group = document.getElementById("m-team-group");
  const select = document.getElementById("m-team");
  if (!group || group.style.display === "none" || !(select instanceof HTMLSelectElement)) return "";
  return String(select.value || "").trim();
}
function buildPatientTeamAssignSectionHtml(patient) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id || !patient?.id) return "";
  const patientId = String(patient.id);
  const teamId = activePatientTeamId(patientId);
  const joinedTeams = assignableTeamsForUser(user);
  if (!joinedTeams.length) {
    const readOnly = teamId ? '<input type="text" class="field-readonly" readonly value="' + esc(teamLabelById(teamId)) + '" aria-label="Equipo asignado">' : '<p class="profile-hint profile-hint--field">Sin equipo asignado.</p>';
    return '<div class="field-group patient-team-assign-block"><label>Equipo</label>' + readOnly + '<p class="profile-hint profile-hint--field">\xDAnete a un equipo en <strong>Mi rotaci\xF3n</strong> para cambiar la asignaci\xF3n.</p></div>';
  }
  const placeholder = teamId ? "\u2014 Cambiar equipo \u2014" : "\u2014 Asignar a equipo \u2014";
  const hint = teamId ? "Cambia el equipo si el paciente cambi\xF3 de cubeta. Solo el equipo activo ver\xE1 el caso en \u21C4." : "Al asignar, el paciente solo ser\xE1 visible para ese equipo en la red \u21C4.";
  const groupBySala = shouldGroupAssignableTeamsBySala(user);
  return '<div class="field-group patient-team-assign-block"><label for="patient-team-assign-select">Equipo</label><select id="patient-team-assign-select" class="profile-input patient-team-assign-select" onchange="onPatientTeamAssignChange(this.value)"><option value="">' + esc(placeholder) + "</option>" + buildTeamSelectOptions(joinedTeams, teamId, { groupBySala }) + "</select>" + (teamId ? '<p class="profile-hint profile-hint--field">Equipo actual: <strong>' + esc(teamLabelById(teamId)) + "</strong></p>" : "") + '<p class="profile-hint profile-hint--field">' + hint + "</p></div>";
}
function activePatientIdFromDom() {
  const wrap = document.getElementById("patient-data-form");
  if (wrap && wrap.dataset.patientId) return String(wrap.dataset.patientId);
  const mount = document.getElementById("exp-datos-modal-mount") || document.querySelector(".exp-datos-mount");
  if (mount && mount.dataset.patientId) return String(mount.dataset.patientId);
  return "";
}
async function onPatientTeamAssignChange(teamId) {
  const patientId = activePatientIdFromDom();
  const tid = String(teamId || "").trim();
  if (!patientId || !tid) return;
  const prevTeamId = activePatientTeamId(patientId);
  if (prevTeamId && prevTeamId === tid) return;
  const res = await assignPatientToTeamClinical(patientId, tid);
  if (res.ok) {
    if (typeof window !== "undefined" && typeof window.renderPatientDataPane === "function") {
      window.renderPatientDataPane();
    }
    const patientsMod = await import("/mobile/js/chunks/patients-FRNAP5DS.js").catch(() => null);
    if (patientsMod && typeof patientsMod.renderPatientList === "function") {
      patientsMod.renderPatientList();
    }
    const label = teamLabelById(tid);
    const msg = prevTeamId ? "Equipo actualizado a \xAB" + label + "\xBB" : "Paciente asignado a \xAB" + label + "\xBB";
    await notifyAssignToast(msg, "success");
    return;
  }
  await notifyAssignToast("No se pudo cambiar el equipo", "error");
}
async function notifyAssignToast(msg, type) {
  try {
    const shell = await import("/mobile/js/chunks/app-shell-UFTFFCNV.js");
    if (typeof shell.showToast === "function") shell.showToast(msg, type);
  } catch (_e) {
    void _e;
  }
}
function wirePatientTeamAssignRefresh() {
  if (typeof document === "undefined" || document._patientTeamAssignRefreshWired) return;
  document._patientTeamAssignRefreshWired = true;
  const rerender = function() {
    if (typeof window !== "undefined" && typeof window.renderPatientDataPane === "function") {
      window.renderPatientDataPane();
    }
  };
  document.addEventListener("rpc-clinical-teams-changed", rerender);
  document.addEventListener("rpc-clinical-ops-synced", rerender);
  document.addEventListener("rpc-patient-team-assigned", rerender);
}
var patientTeamAssignWindowHandlers = {
  onPatientTeamAssignChange
};

// public/js/features/clinical-teams/teams-roster-bring-patients.mjs
function listBringableLocalPatients(teamId, localPatients = patients) {
  const tid = String(teamId || "").trim();
  if (!tid) return [];
  const user = clinicalSessionContext.user;
  const myJoinedIds = joinedTeamIdsForUser(clinicalSessionContext.teams || [], user);
  myJoinedIds.add(tid);
  const rows = Array.isArray(localPatients) ? localPatients : [];
  return rows.filter((p) => {
    const pid = String(p?.id || "").trim();
    if (!pid) return false;
    const current = activePatientTeamId(pid);
    if (!current) return true;
    if (current === tid) return false;
    if (myJoinedIds.has(current)) return false;
    return true;
  });
}
function buildBringPatientsConfirmMessage(list, teamName) {
  const n = list.length;
  const label = String(teamName || "tu equipo").trim() || "tu equipo";
  const preview = list.slice(0, 8).map((p) => `\u2022 ${String(p.nombre || "Sin nombre").trim()} \xB7 ${String(p.registro || "s/reg").trim()}`).join("\n");
  const more = n > 8 ? `
\u2026 y ${n - 8} m\xE1s` : "";
  const noun = n === 1 ? "paciente local" : "pacientes locales";
  return `Tienes ${n} ${noun} que en Nube no quedan ligados a tu equipo (pasa al cambiar de LAN a Nube o con equipos nuevos).

\xBFAsignarlos a \xAB${label}\xBB para que no desaparezcan del censo?

` + preview + more + "\n\nCancelar = unirte sin mover pacientes.";
}
async function assignBringablePatientsToTeam(patientIds, teamId, deps = {}) {
  const tid = String(teamId || "").trim();
  const assign = typeof deps.assign === "function" ? deps.assign : assignPatientToTeamClinical;
  let claimed = 0;
  const errors = [];
  if (!tid) return { claimed: 0, errors: ["Sin equipo"] };
  for (const rawId of patientIds || []) {
    const pid = String(rawId || "").trim();
    if (!pid) continue;
    try {
      const res = await assign(pid, tid);
      if (res && res.ok === false) errors.push(pid);
      else if (res === false) errors.push(pid);
      else claimed += 1;
    } catch (err) {
      errors.push(pid + ": " + (err?.message || "error"));
    }
  }
  return { claimed, errors };
}
async function fetchScopeForBringPatients(skipFetch) {
  if (skipFetch || typeof fetchClinicalScopeContextFromDb !== "function") return;
  try {
    await fetchClinicalScopeContextFromDb();
  } catch {
  }
}
function shouldUseInheritModal(deps) {
  return deps.useModal !== false && typeof deps.confirm !== "function" && typeof document !== "undefined";
}
async function tryOpenInheritPatientsModal(tid, teamName) {
  const { openInheritPatientsModal, wireInheritPatientsModal } = await import("/mobile/js/chunks/teams-roster-inherit-patients-modal-4XQSLOCL.js");
  wireInheritPatientsModal();
  return openInheritPatientsModal({ teamId: tid, teamName });
}
function toastBringPatientsResult(claimed, errors) {
  if (typeof document === "undefined") return;
  if (claimed > 0) {
    toast2(
      claimed === 1 ? "1 paciente heredado a tu equipo." : `${claimed} pacientes heredados a tu equipo.`,
      "success"
    );
  }
  if (errors.length) {
    toast2(`No se pudieron heredar ${errors.length} paciente(s).`, "warn");
  }
}
function resolveBringPatientsConfirm(deps) {
  if (typeof deps.confirm === "function") return deps.confirm;
  return (msg) => typeof window !== "undefined" ? window.confirm(msg) : false;
}
async function confirmAndAssignBringablePatients(tid, teamName, list, deps) {
  const confirmFn = resolveBringPatientsConfirm(deps);
  const ok = confirmFn(buildBringPatientsConfirmMessage(list, teamName));
  if (!ok) return { offered: true, claimed: 0, skipped: true };
  const ids = list.map((p) => String(p.id));
  const { claimed, errors } = await assignBringablePatientsToTeam(ids, tid, {
    assign: deps.assign
  });
  toastBringPatientsResult(claimed, errors);
  return { offered: true, claimed, errors };
}
async function offerBringPatientsAfterTeamJoin(teamId, teamName, deps = {}) {
  const tid = String(teamId || "").trim();
  if (!tid) return { offered: false, claimed: 0 };
  await fetchScopeForBringPatients(deps.skipFetch);
  const list = listBringableLocalPatients(tid);
  if (!list.length) return { offered: false, claimed: 0 };
  if (shouldUseInheritModal(deps)) {
    try {
      return await tryOpenInheritPatientsModal(tid, teamName);
    } catch {
    }
  }
  return confirmAndAssignBringablePatients(tid, teamName, list, deps);
}

// public/js/features/clinical-teams/teams-roster-submit.mjs
function teamSalaForId(teamId) {
  const team = (clinicalSessionContext.teams || []).find(
    (row) => String(row.team_id) === String(teamId || "")
  );
  return String(team?.sala || clinicalSessionContext.user?.sala || "").trim();
}
function readCreateTeamBasics() {
  const name = String(document.getElementById("clinical-team-create-name")?.value || "").trim();
  let sala = String(document.getElementById("clinical-team-create-sala")?.value || "").trim();
  if (!sala) sala = String(clinicalSessionContext.user?.sala || "").trim();
  return { name, sala, userId: currentUserId() };
}
async function createElevatedTeam(api2, { name, sala, userId }) {
  const res = await api2.dbClinicalTeamsCreate({
    name,
    service: clinicalServiceForSala(sala) || "Sala",
    onCallDayIndex: 0,
    sala,
    teamLeaderName: name,
    createdBy: userId
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se cre\xF3 el equipo.", "error");
    return;
  }
  closeCreateTeamPanelAfterSuccess();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { force: true, sala } }));
  const lanPush = await publishClinicalTeamsAfterChange({ sala });
  toastTeamLanPublishResult(
    lanPush,
    "Equipo vac\xEDo creado. Asigna integrantes desde el directorio de usuarios."
  );
}
async function autoJoinCreatorToTeam(api2, teamId, userId, cycleLetter) {
  if (!teamId || typeof api2.dbClinicalTeamsMemberAdd !== "function") return;
  const addRes = await api2.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction: cycleLetter
  });
  if (!addRes || addRes.ok === false) {
    toast2(addRes?.error || "Equipo creado pero no se pudo unir autom\xE1ticamente.", "error");
  }
}
async function createStandardTeam(api2, { name, sala, userId }) {
  let service = String(document.getElementById("clinical-team-create-service")?.value || "").trim();
  const mappedService = clinicalServiceForSala(sala);
  if (mappedService && mappedService !== "Sala") {
    service = mappedService;
  }
  const cycleLetter = String(document.getElementById("clinical-team-create-day")?.value || "A").trim();
  if (!service) {
    toast2("Indica nombre y servicio.", "error");
    return;
  }
  const res = await api2.dbClinicalTeamsCreate({
    name,
    service,
    subAreaFraction: cycleLetter,
    onCallDayIndex: 0,
    sala,
    teamLeaderName: name,
    createdBy: userId
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se cre\xF3 el equipo.", "error");
    return;
  }
  const teamId = String(res.team?.team_id || "");
  await autoJoinCreatorToTeam(api2, teamId, userId, cycleLetter);
  closeCreateTeamPanelAfterSuccess();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { force: true, sala } }));
  const lanPush = await publishClinicalTeamsAfterChange({ sala });
  toastTeamLanPublishResult(lanPush, "Equipo creado.");
  if (teamId) {
    markClinicalEverJoinedTeam();
    await offerBringPatientsAfterTeamJoin(teamId, name);
  }
}
async function handleCreateTeamSubmit(ev) {
  ev.preventDefault();
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsCreate !== "function") {
    toast2("Base de datos no disponible.", "error");
    return;
  }
  const { name, sala, userId } = readCreateTeamBasics();
  if (!name) {
    toast2("Indica el nombre del equipo.", "error");
    return;
  }
  if (!sala) {
    toast2("Selecciona la sala del equipo.", "error");
    return;
  }
  if (canManageTeamRoster(clinicalSessionContext.user)) {
    await createElevatedTeam(api2, { name, sala, userId });
    return;
  }
  await createStandardTeam(api2, { name, sala, userId });
}
async function handleAddMemberSubmit(ev, form) {
  ev.preventDefault();
  const parsed = parseAddMemberForm(form);
  if (!parsed.ok) {
    toast2(parsed.error, "error");
    return;
  }
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsMemberAdd !== "function") {
    toast2("Base de datos no disponible.", "error");
    return;
  }
  const partnerUserId = await resolvePartnerUserIdForAdd(parsed.handle);
  if (!partnerUserId) {
    toast2(
      `No encontramos a @${parsed.handle} en esta Mac. En su R+: Mi rotaci\xF3n \u2192 @usuario \u2192 Guardar perfil (con la misma sala \u21C4). Luego abre Directorio LAN aqu\xED o reintenta.`,
      "error"
    );
    return;
  }
  const res = await api2.dbClinicalTeamsMemberAdd({
    teamId: parsed.teamId,
    userId: partnerUserId,
    subAreaFraction: parsed.subAreaFraction
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se agreg\xF3 el miembro.", "error");
    return;
  }
  toast2("Miembro agregado.", "success");
  if (parsed.usernameInput instanceof HTMLInputElement) parsed.usernameInput.value = "";
  const sala = teamSalaForId(parsed.teamId);
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { sala } }));
  await publishClinicalTeamsAfterChange({ sala });
  await refreshTeamsUiAfterChange();
}
function parseAddMemberForm(form) {
  const teamId = String(form.dataset.teamId || "");
  const usernameInput = form.querySelector(".clinical-teams-add-member-input");
  const username = usernameInput instanceof HTMLInputElement ? String(usernameInput.value || "").trim() : "";
  if (!teamId || !username) {
    return { ok: false, error: "Escribe el username del residente." };
  }
  const handle = normalizeUsername(username);
  if (!isValidUsernameFormat(handle)) {
    return {
      ok: false,
      error: "Usuario inv\xE1lido. Usa 3\u201332 caracteres: letras min\xFAsculas, n\xFAmeros y _ (sin @)."
    };
  }
  const cycleEl = form.querySelector(".clinical-teams-add-member-cycle");
  const subAreaFraction = cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || "").trim() : "";
  if (!subAreaFraction) {
    return { ok: false, error: "Elige el ciclo del integrante." };
  }
  return { ok: true, teamId, handle, subAreaFraction, usernameInput };
}
async function resolvePartnerUserIdForAdd(handle) {
  let partnerUserId = await resolveLocalUserIdByLanHandle(handle);
  if (partnerUserId) return partnerUserId;
  await pullClinicalOpsFromLanRoom({ force: true });
  await fetchClinicalTeamsFromDb();
  return resolveLocalUserIdByLanHandle(handle);
}
async function handleMyCycleSubmit(ev, form) {
  ev.preventDefault();
  const teamId = String(form.dataset.teamId || "");
  const userId = currentUserId();
  const select = form.querySelector(".clinical-teams-cycle-select");
  const subAreaFraction = select instanceof HTMLSelectElement ? String(select.value || "").trim() : "";
  if (!teamId || !userId || !subAreaFraction) {
    toast2("Elige tu ciclo.", "error");
    return;
  }
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsMemberAdd !== "function") {
    toast2("Base de datos no disponible.", "error");
    return;
  }
  const res = await api2.dbClinicalTeamsMemberAdd({
    teamId,
    userId,
    subAreaFraction
  });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se guard\xF3 el ciclo.", "error");
    return;
  }
  toast2("Ciclo actualizado.", "success");
  const sala = teamSalaForId(teamId);
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { sala } }));
  await publishClinicalTeamsAfterChange({ sala });
  await refreshTeamsUiAfterChange();
}

// public/js/features/estado-actual-diet-text.mjs
function upperVal(v) {
  return v ? String(v).toUpperCase() : "___";
}
function numPlaceholder(v) {
  return v !== "" && v != null ? String(v) : "___";
}
function formatNmDietClause(fields, kcalDisplay, opts) {
  opts = opts || {};
  fields = fields || {};
  if (isDietaAyuno(fields.dieta)) return "DIETA AYUNO";
  if (isDietaSuplemento(fields.dieta)) return "DIETA SUPLEMENTO";
  var proteinClause = "";
  if (opts.includeProtein !== false && fields.proteinG != null && String(fields.proteinG).trim() !== "") {
    proteinClause = " + " + numPlaceholder(fields.proteinG) + " GR PROTEINA";
  }
  return "DIETA " + upperVal(fields.dieta) + " CALCULADA A " + numPlaceholder(fields.kcalKg) + " KCAL/KG (" + numPlaceholder(kcalDisplay) + " KCAL)" + proteinClause;
}

// public/js/features/estado-actual-glu-rescue.mjs
var RESCATE_TIER_RE = /\b(\d{2,3})\s*[-–—]\s*(\d{2,3})\b(?:\s*(?:MG\/DL|MG\s*\/\s*DL|MGDL|DESTROX(?:IAS)?|GLUCOSA)?)?\s*[:\s,;]*(\d+(?:[.,]\d+)?)\s*(?:UI|U\.?I\.?|UNIDADES?)\b/gi;
var RESCATE_UNITS_ENTRE_RE = /(\d+(?:[.,]\d+)?)\s*(?:UI|U\.?I\.?|UNIDADES?)\b[\s\S]*?ENTRE\s+(\d{2,3})\s*[-–—]\s*(\d{2,3})/gi;
var RESCATE_UNITS_GT_RE = /(\d+(?:[.,]\d+)?)\s*(?:UI|U\.?I\.?|UNIDADES?)\b[\s\S]*?>\s*(\d{2,3})/gi;
function pushRescateTier(tiers, minMgDl, maxMgDl, units) {
  if (!Number.isFinite(minMgDl) || !Number.isFinite(maxMgDl) || !Number.isFinite(units)) return;
  if (minMgDl >= maxMgDl || units <= 0) return;
  tiers.push({ minMgDl, maxMgDl, units });
}
function parseInsulinRescateCriteria(text) {
  var s = String(text || "");
  if (!s.trim()) return [];
  var tiers = [];
  var re = new RegExp(RESCATE_TIER_RE.source, "gi");
  var m;
  while ((m = re.exec(s)) !== null) {
    pushRescateTier(
      tiers,
      Number(m[1]),
      Number(m[2]),
      Number(String(m[3]).replace(",", "."))
    );
  }
  var entreRe = new RegExp(RESCATE_UNITS_ENTRE_RE.source, "gi");
  while ((m = entreRe.exec(s)) !== null) {
    pushRescateTier(
      tiers,
      Number(m[2]),
      Number(m[3]),
      Number(String(m[1]).replace(",", "."))
    );
  }
  var gtRe = new RegExp(RESCATE_UNITS_GT_RE.source, "gi");
  while ((m = gtRe.exec(s)) !== null) {
    var threshold = Number(m[2]);
    pushRescateTier(tiers, threshold, threshold + 200, Number(String(m[1]).replace(",", ".")));
  }
  return tiers;
}
function collectRecetaBlockText(block) {
  if (!block) return "";
  var parts = [String(block.pasteRaw || "")];
  if (Array.isArray(block.items)) {
    block.items.forEach(function(item) {
      if (!item || typeof item !== "object") return;
      var it = item;
      parts.push(String(it.nombreRaw || ""));
      parts.push(String(it.dosisRaw || ""));
      parts.push(String(it.frecuenciaRaw || ""));
      parts.push(String(it.viaRaw || ""));
    });
  }
  return parts.join("\n");
}
function insulinRescateCriteriaFromRecetaBlock(block) {
  return parseInsulinRescateCriteria(collectRecetaBlockText(block));
}
function patientHasInsulinRescatesInReceta(block) {
  return insulinRescateCriteriaFromRecetaBlock(block).length > 0;
}
function formatInsulinRescatesClause(glucometrias, opts) {
  const glus = Array.isArray(glucometrias) ? glucometrias : [];
  const hasGlu = glus.some(function(g) {
    return g && g.value != null && g.value !== "";
  });
  if (!hasGlu) return "";
  const applied = glus.filter(function(g) {
    if (!g || typeof g !== "object") return false;
    const u = Number(
      /** @type {{ rescueUnits?: unknown }} */
      g.rescueUnits
    );
    return Number.isFinite(u) && u > 0;
  });
  if (applied.length) return "";
  opts = opts || {};
  if (opts.rescatesInSome === false) return "";
  return "RESCATES DE INSULINA DISPONIBLES";
}

// public/js/features/estado-actual-med-soap-split.mjs
function parseMedPipeItems(fieldVal) {
  if (fieldVal == null || !String(fieldVal).trim()) return [];
  return String(fieldVal).split(" | ").map(function(s) {
    return String(s).trim();
  }).filter(Boolean);
}
function joinMedPipeItems(items) {
  return (items || []).map(function(s) {
    return String(s).trim();
  }).filter(Boolean).join(" | ");
}
var ANTIEMETIC_LINE_RE = /\b(ONDANSETRON|GRANISETRON|PALONOSETRON|METOCLOPRAMIDA|DROPERIDOL|DIMENHIDRINATO|BUTILHIOSCINA|BROMURO\s+DE\s+BUTILHIOSCINA|BUSCAPINA)\b/i;
var INSULIN_NM_LINE_RE = /\b(INSULINA|GLARGINA|DEGLUDEC|DETEMIR|NPH|ASPARTA|LISPRO|GLULISINA|HUMANA\s+RAPIDA)\b/i;
var RESCATE_NM_LINE_RE = /\bRESCATES\s+DE\s+INSULINA\b/i;
function partitionAnalgesiaForSoap(fieldVal) {
  var analgesia = [];
  var antiemeticos = [];
  parseMedPipeItems(fieldVal).forEach(function(line) {
    if (ANTIEMETIC_LINE_RE.test(line)) antiemeticos.push(line);
    else analgesia.push(line);
  });
  return { analgesia: joinMedPipeItems(analgesia), antiemeticos: joinMedPipeItems(antiemeticos) };
}
function partitionNmMedsForSoap(fieldVal) {
  var other = [];
  var insulin = [];
  var rescatesDisponibles = false;
  parseMedPipeItems(fieldVal).forEach(function(line) {
    if (RESCATE_NM_LINE_RE.test(line)) {
      rescatesDisponibles = true;
      return;
    }
    if (INSULIN_NM_LINE_RE.test(line)) insulin.push(line);
    else other.push(line);
  });
  return {
    other: joinMedPipeItems(other),
    insulin: joinMedPipeItems(insulin),
    rescatesDisponibles
  };
}

// public/js/features/estado-actual-text-build.mjs
var TEMP_PICO_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1e3;
function num(v) {
  return v !== "" && v != null ? String(v) : "___";
}
function resolveTempPeakAtLabel(snapAlt, tempPeakAt) {
  if (tempPeakAt && tempPeakAt.recordedAt) {
    var timeHm = tempPeakAt.time != null && String(tempPeakAt.time).trim() ? String(tempPeakAt.time) : snapAlt.tempPeak || "";
    return formatEaVitalPointShorthand(tempPeakAt.recordedAt, timeHm);
  }
  return vitalAlteredTimeForDisplay(snapAlt.tempPeak);
}
function shouldDocumentTempPeak(tempPeak, tempActual, tempPeakAt, now) {
  if (tempPeak == null || tempPeak === "") return false;
  if (String(tempPeak) === String(tempActual)) return false;
  if (!isTempFeverPeak(tempPeak)) return false;
  if (!tempPeakAt || !tempPeakAt.recordedAt) return true;
  var peakMs = gluPointMs(
    String(tempPeakAt.recordedAt),
    tempPeakAt.time != null ? String(tempPeakAt.time) : ""
  );
  if (!peakMs) return true;
  var ref = now instanceof Date && !isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  return ref.getTime() - peakMs <= TEMP_PICO_MAX_AGE_MS;
}
function buildHiTempClause(v, snapAlt, tempPeakAt, now) {
  var tempActual = v.temp;
  var tempPeak = v.tempPeak;
  var hiTemp = "TEMPERATURA " + num(tempActual) + " \xB0C";
  if (shouldDocumentTempPeak(tempPeak, tempActual, tempPeakAt, now)) {
    hiTemp += " (PICO " + num(tempPeak) + " \xB0C";
    var peakLabel = resolveTempPeakAtLabel(snapAlt, tempPeakAt);
    if (peakLabel) hiTemp += " @ " + peakLabel;
    hiTemp += ")";
  } else {
    var curTime = vitalAlteredTimeForDisplay(snapAlt.temp);
    if (curTime) hiTemp += " @ " + curTime;
  }
  return hiTemp;
}
function medsListForSoap(fieldVal, joiner) {
  if (fieldVal == null || !String(fieldVal).trim()) return "";
  return String(fieldVal).split(" | ").map(function(part) {
    return String(part).trim();
  }).filter(Boolean).map(function(part) {
    return part.toUpperCase();
  }).join(joiner);
}
function medsClauseOrEmpty(fieldVal) {
  return medsListForSoap(fieldVal, ", ");
}
var SOAP_EMPTY_MED_FALLBACK = "NINGUNO";
function soapMedCategorySegment(label, clause, opts) {
  var val = clause != null ? String(clause).trim() : "";
  if (val) return label + ": " + val;
  if (opts && opts.always) return label + ": " + SOAP_EMPTY_MED_FALLBACK;
  return "";
}
function joinSoapMedSegments(segments, joiner) {
  return (segments || []).map(function(s) {
    return s != null ? String(s).trim() : "";
  }).filter(Boolean).join(joiner != null ? joiner : " | ");
}
var SOPORTE_MAP = {
  "Aire ambiente": "AL AIRE AMBIENTE",
  "Puntillas nasales": "POR PUNTILLAS NASALES",
  "Alto flujo": "POR ALTO FLUJO",
  "VM no invasiva": "CON VENTILACI\xD3N MEC\xC1NICA NO INVASIVA",
  Traqueostom\u00EDa: "CON TRAQUEOSTOM\xCDA"
};
function resolveSoporteClause(ec) {
  var soporteKey = ec.soporte != null ? String(ec.soporte) : "";
  return SOPORTE_MAP[soporteKey] || "AL AIRE AMBIENTE";
}
function resolveFebrilLabel(v) {
  return isTempFebrile(v.temp) ? "FEBRIL" : "AFEBRIL";
}
function resolveHemodynamicLabel(v, ec) {
  return isHemodynamicallyUnstable(v, ec.vasop) ? "INESTABLE" : "ESTABLE";
}
function formatGluSoapSegment(gg) {
  if (!gg || typeof gg !== "object") return "";
  var rescueUnits = Number(gg.rescueUnits);
  var hasRescue = Number.isFinite(rescueUnits) && rescueUnits > 0;
  if (hasRescue && gg.value != null && gg.value !== "") {
    return num(gg.value) + ", " + num(rescueUnits) + "UI";
  }
  var gv = gg.postRescueValue != null && gg.postRescueValue !== "" ? gg.postRescueValue : gg.value;
  if (gv == null || gv === "") return "";
  return num(gv);
}
function collectGluDisplayValues(glSrc) {
  var gluParts = [];
  for (var gi = 0; gi < glSrc.length; gi++) {
    var seg = formatGluSoapSegment(glSrc[gi]);
    if (seg) gluParts.push(seg);
  }
  return gluParts;
}
function buildBombaClause(bombaSrc, algorithmNumber) {
  var bombaParts = [];
  for (var bi = 0; bi < bombaSrc.length; bi++) {
    var bb = bombaSrc[bi];
    if (!bb || typeof bb !== "object") continue;
    var seg = num(bb.value);
    if (bb.units != null && bb.units !== "") seg += " (" + num(bb.units) + " U)";
    bombaParts.push(seg);
  }
  var alg = algorithmNumber != null && Number.isFinite(Number(algorithmNumber)) ? Number(algorithmNumber) : null;
  var prefix = alg != null ? "BOMBA DE INSULINA EN ALGORITMO " + alg : "BOMBA DE INSULINA";
  if (bombaParts.length > 0) {
    return " || " + prefix + " (" + bombaParts.join(", ") + ")";
  }
  if (alg != null) return " || " + prefix;
  return "";
}
function resolveKcalDisplay(ec, options) {
  options = options || {};
  var weightKg = isDietaSuplemento(ec.dieta) ? null : resolveDietWeightKg({ patientPeso: options.patientPeso, pesoRef: ec.pesoRef });
  var kcalComputed = weightKg != null ? computeDietKcalTotal(ec.kcalKg, weightKg) : null;
  if (kcalComputed != null) return String(kcalComputed);
  return ec.kcal != null && ec.kcal !== "" ? String(ec.kcal) : "";
}
function buildNmClause(ec, kcalDisplay, snapIo, btTurno, glSrc, bombaSrc, opts) {
  opts = opts || {};
  var ioClause = formatIoClauseForSoap(snapIo, btTurno);
  var gluParts = collectGluDisplayValues(glSrc);
  var bombaClause = buildBombaClause(bombaSrc, opts.bombaAlgoritmo);
  var nmPartition = partitionNmMedsForSoap(ec.nm);
  var nmOtherClause = medsListForSoap(nmPartition.other, " || ");
  var nmInsulinClause = medsListForSoap(nmPartition.insulin, ", ");
  var hasAppliedRescates = glSrc.some(function(g) {
    if (!g || typeof g !== "object") return false;
    var u = Number(
      /** @type {{ rescueUnits?: unknown }} */
      g.rescueUnits
    );
    return Number.isFinite(u) && u > 0;
  });
  var nmParts = [formatNmDietClause(ec, kcalDisplay, { includeProtein: true })];
  if (nmOtherClause) nmParts.push(nmOtherClause);
  nmParts.push(ioClause);
  if (gluParts.length) {
    var gluHasRescueFmt = gluParts.some(function(p) {
      return /UI$/.test(p);
    });
    var gluSuffix = gluHasRescueFmt ? "" : " MG/DL";
    nmParts.push("GLUCOMETR\xCDAS CAPILARES (" + gluParts.join(", ") + gluSuffix + ")");
  }
  if (bombaClause) nmParts.push(bombaClause.replace(/^\s*\|\|\s*/, ""));
  else if (!hasAppliedRescates) {
    var rescatesClause = nmPartition.rescatesDisponibles ? "RESCATES DE INSULINA DISPONIBLES" : formatInsulinRescatesClause(glSrc, { rescatesInSome: opts.rescatesInSome });
    if (rescatesClause) nmParts.push(rescatesClause);
  }
  if (nmInsulinClause) nmParts.push("INSULINA: " + nmInsulinClause);
  return nmParts.join(" || ");
}
function assembleSoapLines(ec, v, soporte, hiTemp, nmClause) {
  var analgesiaSplit = partitionAnalgesiaForSoap(ec.analgesia);
  var analgesiaClause = medsClauseOrEmpty(analgesiaSplit.analgesia);
  var antiemeticosClause = medsClauseOrEmpty(ec.antiemeticos || analgesiaSplit.antiemeticos);
  var sedacionClause = medsClauseOrEmpty(ec.sedacion);
  var antiepilepticosClause = medsClauseOrEmpty(ec.antiepilepticos);
  var antiparkinsonianosClause = medsClauseOrEmpty(ec.antiparkinsonianos);
  var antidotosClause = medsClauseOrEmpty(ec.antidotos);
  var viaAereaClause = medsClauseOrEmpty(ec.viaAerea);
  var vasopClause = medsClauseOrEmpty(ec.vasop);
  var nMeds = joinSoapMedSegments([
    soapMedCategorySegment("ANALGESIA", analgesiaClause),
    soapMedCategorySegment("ANTIEMETICOS", antiemeticosClause),
    soapMedCategorySegment("SEDACION", sedacionClause),
    soapMedCategorySegment("ANTIEPILEPTICOS", antiepilepticosClause),
    soapMedCategorySegment("ANTIPARKINSONIANOS", antiparkinsonianosClause),
    soapMedCategorySegment("ANTIDOTOS", antidotosClause)
  ]);
  var hdMeds = joinSoapMedSegments([
    soapMedCategorySegment("VASOPRESORES", vasopClause, { always: true }),
    soapMedCategorySegment("ANTIHIPERTENSIVOS", medsClauseOrEmpty(ec.antihta), { always: true }),
    soapMedCategorySegment("TROMBOPROFILAXIS", medsClauseOrEmpty(ec.antitromboticos), {
      always: true
    }),
    soapMedCategorySegment("ANTICOAGULACION", medsClauseOrEmpty(ec.anticoagulacion)),
    soapMedCategorySegment("ANTIARRITMICOS", medsClauseOrEmpty(ec.antiarritmicos)),
    soapMedCategorySegment("DIUR\xC9TICOS", medsClauseOrEmpty(ec.diureticos)),
    soapMedCategorySegment("ESTATINAS", medsClauseOrEmpty(ec.estatinas))
  ]);
  var hiMeds = joinSoapMedSegments([
    soapMedCategorySegment("ANTIBIOTICOTERAPIA", medsClauseOrEmpty(ec.abx), { always: true }),
    soapMedCategorySegment("TRANSFUSIONES", medsClauseOrEmpty(ec.transfusiones))
  ]);
  return [
    "N: FOUR " + num(ec.four) + "/16 PUNTOS, SIN DATOS DE FOCALIZACI\xD3N, ORIENTADO EN " + num(ec.esferas) + " ESFERAS, ALERTA" + (nMeds ? " || " + nMeds : ""),
    "V: FR " + num(v.fr) + " RPM, SATO2 " + num(v.sat) + "% " + soporte + " | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS" + (viaAereaClause ? " || VIA AEREA: " + viaAereaClause : ""),
    "HD: " + resolveHemodynamicLabel(v, ec) + ", TA " + num(v.tas) + "/" + num(v.tad) + " MMHG, FC " + num(v.fc) + " LPM || " + hdMeds,
    "HI: " + resolveFebrilLabel(v) + ", " + hiTemp + " || " + hiMeds,
    "NM: " + nmClause
  ];
}

// public/js/features/soap-legacy-field-map.mjs
var SOAP_LEGACY_FIELD_IDS = {
  analgesia: "soap-analgesia",
  antiemeticos: "soap-antiemeticos",
  sedacion: "soap-sedacion",
  antiepilepticos: "soap-antiepilepticos",
  antiparkinsonianos: "soap-antiparkinsonianos",
  antidotos: "soap-antidotos",
  viaAerea: "soap-via-aerea",
  antihta: "soap-antihta",
  diuretico: "soap-diureticos",
  diureticos: "soap-diureticos",
  antitromboticos: "soap-antitromboticos",
  anticoagulacion: "soap-anticoagulacion",
  antiarritmicos: "soap-antiarritmicos",
  estatinas: "soap-estatinas",
  abx: "soap-abx",
  transfusiones: "soap-transfusiones",
  vasop: "soap-vasop",
  nm: "soap-nm-soporte"
};
function soapLegacyFieldIdForCategory(cat) {
  return SOAP_LEGACY_FIELD_IDS[
    /** @type {keyof typeof SOAP_LEGACY_FIELD_IDS} */
    cat
  ] || null;
}
var SOAP_LEGACY_MED_FIELD_IDS = Object.values(SOAP_LEGACY_FIELD_IDS);

// public/js/features/soap-estado.mjs
var rt2 = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  getSettings() {
    return {};
  }
};
function registerSoapEstadoRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt2, ctx);
}
function mergeSoapMedField(fieldId, fragment) {
  var el = document.getElementById(fieldId);
  if (!el || !fragment) return;
  var f = String(fragment).trim();
  if (!f) return;
  var cur = el.value.trim();
  el.value = cur ? cur + " | " + f : f;
}
function openSOAPModalDirect() {
  var bd = document.getElementById("soap-modal-backdrop");
  if (bd) bd.classList.add("open");
}
async function copyToClipboardSafe(text) {
  var t = text == null ? "" : String(text);
  if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.writeClipboardText === "function") {
    try {
      if (await window.electronAPI.writeClipboardText(t)) return true;
    } catch (_e) {
      void _e;
    }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch (_e) {
    void _e;
  }
  try {
    var ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
function openSOAPModal() {
  var activeId = rt2.getActiveId();
  if (!activeId) {
    rt2.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var existing = notes[activeId] && notes[activeId].evolucion ? notes[activeId].evolucion.trim() : "";
  if (existing) {
    var backdrop = document.createElement("div");
    backdrop.className = "lab-conflict-backdrop";
    backdrop.id = "soap-confirm-backdrop";
    backdrop.innerHTML = `<div class="lab-conflict-modal"><h3>\xBFReemplazar evoluci\xF3n?</h3><p>La evoluci\xF3n ya tiene contenido. \xBFReemplazarlo con la plantilla?</p><div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button onclick="document.getElementById('soap-confirm-backdrop').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Cancelar</button><button onclick="document.getElementById('soap-confirm-backdrop').remove();document.getElementById('soap-modal-backdrop').classList.add('open')" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Reemplazar</button></div></div>`;
    document.body.appendChild(backdrop);
  } else {
    document.getElementById("soap-modal-backdrop").classList.add("open");
  }
}
function closeSOAPModal() {
  closeModalAnimated(document.getElementById("soap-modal-backdrop"));
  [
    "soap-s",
    "soap-four",
    "soap-esferas",
    "soap-fr",
    "soap-sat",
    "soap-tas",
    "soap-tad",
    "soap-fc",
    "soap-temp",
    "soap-dieta",
    "soap-kcalkg",
    "soap-kcal",
    "soap-peso",
    "soap-ing",
    "soap-egr",
    "soap-balance",
    "soap-glu1",
    "soap-glu2",
    "soap-glu3",
    "soap-insulina",
    "soap-rescates-insulina"
  ].concat(SOAP_LEGACY_MED_FIELD_IDS).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  var sel = document.getElementById("soap-soporte");
  if (sel) sel.selectedIndex = 0;
  document.body.removeAttribute("data-estado-actual-mode");
  var title = document.getElementById("soap-modal-title-text");
  if (title) title.textContent = "Plantilla de Evoluci\xF3n";
}
function openEstadoActualModal() {
  var activeId = rt2.getActiveId();
  if (!activeId) {
    rt2.showToast("Selecciona un paciente primero", "error");
    return;
  }
  if (isModeSala(rt2.getSettings())) {
    if (typeof rt2.navigateToEstadoActualPanel === "function") {
      rt2.navigateToEstadoActualPanel();
    }
    return;
  }
  document.body.setAttribute("data-estado-actual-mode", "true");
  var title = document.getElementById("soap-modal-title-text");
  if (title) title.textContent = "Estado Actual";
  var s = document.getElementById("soap-s");
  if (s) s.value = "";
  document.getElementById("soap-modal-backdrop").classList.add("open");
}
function estadoActualTextForCopy() {
  var s = document.getElementById("soap-s");
  if (s) s.value = "";
  return buildSOAPText().replace(/^\s*\n+/, "");
}
async function estadoActualOnlyGuardar() {
  if (!rt2.getActiveId()) return;
  if (isModeSala(rt2.getSettings())) {
    var gSave = typeof globalThis !== "undefined" ? globalThis : {};
    if (typeof gSave.estadoActualGuardar === "function") {
      gSave.estadoActualGuardar();
      closeSOAPModal();
      return;
    }
  }
  var activeId = rt2.getActiveId();
  var patient = patients.find(function(p) {
    return p.id === activeId;
  });
  if (!patient) return;
  var text = estadoActualTextForCopy();
  if (!text.trim()) {
    rt2.showToast("No hay texto para guardar", "error");
    return;
  }
  migratePatientMonitoreo(patient);
  ensureMonitoreo(patient);
  patient.monitoreo.textoGuardado = {
    text,
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveState();
  renderEstadoActualBar();
  rt2.showToast("Estado Actual guardado \u2713", "success");
  closeSOAPModal();
}
async function estadoActualSaveAndCopy() {
  var activeId = rt2.getActiveId();
  if (!activeId) return;
  if (isModeSala(rt2.getSettings())) {
    var gSave = typeof globalThis !== "undefined" ? globalThis : {};
    if (typeof gSave.estadoActualGuardarCopiar === "function") {
      await gSave.estadoActualGuardarCopiar();
      closeSOAPModal();
      return;
    }
  }
  var patient = patients.find(function(p) {
    return p.id === activeId;
  });
  if (!patient) return;
  var text = estadoActualTextForCopy();
  migratePatientMonitoreo(patient);
  ensureMonitoreo(patient);
  patient.monitoreo.textoGuardado = {
    text,
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveState();
  renderEstadoActualBar();
  var ok = await copyToClipboardSafe(text);
  rt2.showToast(
    ok ? "Estado Actual guardado y copiado \u2713" : "Guardado, pero no se pudo copiar",
    ok ? "success" : "error"
  );
  closeSOAPModal();
}
function renderEstadoActualBar() {
  var meta = document.getElementById("estado-actual-meta");
  if (!meta) return;
  var sala = isModeSala(rt2.getSettings());
  var activeId = rt2.getActiveId();
  if (!sala || !activeId) {
    meta.textContent = "";
    return;
  }
  var patient = patients.find(function(p) {
    return p.id === activeId;
  });
  if (patient) {
    migratePatientMonitoreo(patient);
  }
  var tg = patient && patient.monitoreo && patient.monitoreo.textoGuardado;
  if (tg && tg.savedAt) {
    var d = new Date(tg.savedAt);
    if (!isNaN(d.getTime())) {
      var label = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() + " \xB7 " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      meta.textContent = "Guardado " + label;
      return;
    }
  }
  meta.textContent = "";
}
function updateSOAPBalance() {
  var ing = parseFloat(document.getElementById("soap-ing").value);
  var egr = parseFloat(document.getElementById("soap-egr").value);
  var bal = document.getElementById("soap-balance");
  if (!isNaN(ing) && !isNaN(egr)) {
    var diff = ing - egr;
    bal.value = (diff > 0 ? "+" : "") + diff;
  } else {
    bal.value = "";
  }
}
function soapFieldValue(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : "";
}
function soapUpperOrBlank(v) {
  return v ? v.toUpperCase() : "___";
}
function soapNumOrBlank(v) {
  return v !== "" ? v : "___";
}
function soapBalanceText(ing, egr) {
  if (!ing || !egr) return "___";
  var d = parseFloat(ing) - parseFloat(egr);
  return (d > 0 ? "+" : "") + d;
}
var SOAP_SOPORTE_MAP = {
  "Aire ambiente": "AL AIRE AMBIENTE",
  "Puntillas nasales": "POR PUNTILLAS NASALES",
  "Alto flujo": "POR ALTO FLUJO",
  "VM no invasiva": "CON VENTILACI\xD3N MEC\xC1NICA NO INVASIVA",
  Traqueostom\u00EDa: "CON TRAQUEOSTOM\xCDA"
};
function legacyMedsClause(fieldId, g) {
  var v = g(fieldId);
  return v ? v.toUpperCase() : "";
}
function collectSoapLegacyMedClauses(g) {
  return {
    analgesia: legacyMedsClause("soap-analgesia", g),
    antiemeticos: legacyMedsClause("soap-antiemeticos", g),
    sedacion: legacyMedsClause("soap-sedacion", g),
    antiepilepticos: legacyMedsClause("soap-antiepilepticos", g),
    antiparkinsonianos: legacyMedsClause("soap-antiparkinsonianos", g),
    antidotos: legacyMedsClause("soap-antidotos", g),
    viaAerea: legacyMedsClause("soap-via-aerea", g),
    vasop: legacyMedsClause("soap-vasop", g),
    antihta: legacyMedsClause("soap-antihta", g),
    antitromboticos: legacyMedsClause("soap-antitromboticos", g),
    anticoagulacion: legacyMedsClause("soap-anticoagulacion", g),
    antiarritmicos: legacyMedsClause("soap-antiarritmicos", g),
    diureticos: legacyMedsClause("soap-diureticos", g),
    estatinas: legacyMedsClause("soap-estatinas", g),
    abx: legacyMedsClause("soap-abx", g),
    transfusiones: legacyMedsClause("soap-transfusiones", g),
    nmSoporte: legacyMedsClause("soap-nm-soporte", g),
    insulina: legacyMedsClause("soap-insulina", g),
    rescatesInsulina: legacyMedsClause("soap-rescates-insulina", g)
  };
}
function buildSoapNmParts(g, num2, ing, egr, balance, meds) {
  var nmParts = [
    formatNmDietClause({ dieta: g("soap-dieta"), kcalKg: g("soap-kcalkg") }, g("soap-kcal"), {
      includeProtein: false
    })
  ];
  if (meds.nmSoporte) nmParts.push(meds.nmSoporte);
  nmParts.push(
    "INGRESOS " + num2(ing) + " CC, DIURESIS " + num2(egr) + " CC, BALANCE " + balance + " CC"
  );
  var glu1 = g("soap-glu1");
  var glu2 = g("soap-glu2");
  var glu3 = g("soap-glu3");
  if (glu1 || glu2 || glu3) {
    nmParts.push(
      "GLUCOMETR\xCDAS CAPILARES (" + num2(glu1) + ", " + num2(glu2) + ", " + num2(glu3) + " MG/DL)"
    );
  }
  if (meds.rescatesInsulina) nmParts.push(meds.rescatesInsulina);
  if (meds.insulina) nmParts.push("INSULINA: " + meds.insulina);
  return nmParts;
}
function buildSoapObjectiveLines(g, val, num2, soporte, ing, egr, balance) {
  var meds = collectSoapLegacyMedClauses(g);
  var nmParts = buildSoapNmParts(g, num2, ing, egr, balance, meds);
  var nMeds = joinSoapMedSegments([
    soapMedCategorySegment("ANALGESIA", meds.analgesia),
    soapMedCategorySegment("ANTIEMETICOS", meds.antiemeticos),
    soapMedCategorySegment("SEDACION", meds.sedacion),
    soapMedCategorySegment("ANTIEPILEPTICOS", meds.antiepilepticos),
    soapMedCategorySegment("ANTIPARKINSONIANOS", meds.antiparkinsonianos),
    soapMedCategorySegment("ANTIDOTOS", meds.antidotos)
  ]);
  var hdMeds = joinSoapMedSegments([
    soapMedCategorySegment("VASOPRESORES", meds.vasop, { always: true }),
    soapMedCategorySegment("ANTIHIPERTENSIVOS", meds.antihta, { always: true }),
    soapMedCategorySegment("TROMBOPROFILAXIS", meds.antitromboticos, { always: true }),
    soapMedCategorySegment("ANTICOAGULACION", meds.anticoagulacion),
    soapMedCategorySegment("ANTIARRITMICOS", meds.antiarritmicos),
    soapMedCategorySegment("DIUR\xC9TICOS", meds.diureticos),
    soapMedCategorySegment("ESTATINAS", meds.estatinas)
  ]);
  var hiMeds = joinSoapMedSegments([
    soapMedCategorySegment("ANTIBIOTICOTERAPIA", meds.abx, { always: true }),
    soapMedCategorySegment("TRANSFUSIONES", meds.transfusiones)
  ]);
  return [
    "N: FOUR " + num2(g("soap-four")) + "/16 PUNTOS, SIN DATOS DE FOCALIZACI\xD3N, ORIENTADO EN " + num2(g("soap-esferas")) + " ESFERAS, ALERTA" + (nMeds ? " || " + nMeds : ""),
    "V: FR " + num2(g("soap-fr")) + " RPM, SATO2 " + num2(g("soap-sat")) + "% " + soporte + " | SIN DATOS DE DIFICULTAD RESPIRATORIA || CAMPOS PULMONARES BIEN VENTILADOS" + (meds.viaAerea ? " || VIA AEREA: " + meds.viaAerea : ""),
    "HD: ESTABLE, TA " + num2(g("soap-tas")) + "/" + num2(g("soap-tad")) + " MMHG, FC " + num2(g("soap-fc")) + " LPM || " + hdMeds,
    "HI: AFEBRIL, TEMPERATURA " + num2(g("soap-temp")) + " \xB0C || " + hiMeds,
    "NM: " + nmParts.join(" || ")
  ];
}
function buildSOAPText() {
  var g = soapFieldValue;
  var val = soapUpperOrBlank;
  var num2 = soapNumOrBlank;
  var soporte = SOAP_SOPORTE_MAP[g("soap-soporte")] || "AL AIRE AMBIENTE";
  var ing = g("soap-ing");
  var egr = g("soap-egr");
  var balance = soapBalanceText(ing, egr);
  var lines = [];
  var subj = g("soap-s");
  if (subj) {
    lines.push("S: " + subj);
    lines.push("");
  }
  lines.push.apply(lines, buildSoapObjectiveLines(g, val, num2, soporte, ing, egr, balance));
  return lines.join("\n");
}
function insertSOAPText() {
  var activeId = rt2.getActiveId();
  if (!activeId) {
    rt2.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var text = buildSOAPText();
  if (!notes[activeId]) notes[activeId] = {};
  notes[activeId].evolucion = text;
  saveState();
  var el = document.querySelector('#note-form textarea[oninput*="evolucion"]');
  if (el) el.value = text;
  closeSOAPModal();
  rt2.showToast("Plantilla insertada \u2713", "success");
}
function renderEstadoActualButton() {
}
var windowHandlers = {
  closeSOAPModal,
  insertSOAPText,
  updateSOAPBalance,
  openSOAPModal,
  openEstadoActualModal,
  estadoActualOnlyGuardar,
  estadoActualSaveAndCopy
};

// public/js/features/clinical-teams/teams-roster-join-handler.mjs
function toastJoinSlotWarnings(team, rank) {
  const slotWarn = validateTeamRankSlot(team?.service || "", rank, team?.members || []);
  if (slotWarn) toast2(slotWarn, "warn");
  else if (team?.joinWarning) toast2(String(team.joinWarning), "warn");
}
async function joinClinicalTeamByButton(teamId) {
  const userId = currentUserId();
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsJoin !== "function") {
    toast2("No se pudo unir al equipo.", "error");
    return;
  }
  const team = (clinicalSessionContext.teams || []).find((t) => String(t.team_id) === teamId);
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const cycle = inferMembershipCycleForJoin(team || {}, rank);
  toastJoinSlotWarnings(team, rank);
  const res = await api2.dbClinicalTeamsJoin({ teamId, userId, subAreaFraction: cycle });
  if (!res || res.ok === false) {
    toast2(res?.error || "No se pudo unir al equipo.", "error");
    return;
  }
  toastTeamWarnings(res.warnings);
  toast2("Te uniste al equipo.", "success");
  markClinicalEverJoinedTeam();
  const sala = String(team?.sala || clinicalSessionContext.user?.sala || "").trim();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { sala } }));
  void publishClinicalTeamsAfterChange({ sala });
  void import("/mobile/js/chunks/ensure-turn-room-WY2PQ5VC.js").then(
    ({ ensureTurnRoomAfterTeamJoin }) => ensureTurnRoomAfterTeamJoin(toast2)
  );
  await offerBringPatientsAfterTeamJoin(teamId, team?.name || "");
}

// public/js/features/clinical-teams/teams-roster-interactions.mjs
function syncSalaFieldVisibility() {
  syncCreateTeamServiceFromSala();
}
function wireAdminCheckboxGate() {
  const cb = document.getElementById("clinical-profile-admin");
  if (!(cb instanceof HTMLInputElement) || cb._rpcAdminGateWired) return;
  cb._rpcAdminGateWired = true;
  const hadAdminOnLoad = cb.checked || hasProgramAdminPrivileges(clinicalSessionContext.user);
  if (hadAdminOnLoad) {
    markAdminAccessGrantedThisSession();
  }
  cb.addEventListener("click", (ev) => {
    if (cb.checked) {
      clearAdminAccessGrant();
      return;
    }
    if (isAdminAccessGrantedThisSession()) return;
    ev.preventDefault();
    void promptAdminAccessCode().then((code) => {
      if (code && verifyAdminAccessCode(code)) {
        cb.checked = true;
        rememberAdminAccessCode(code);
        return;
      }
      cb.checked = false;
      if (code != null) toast2("C\xF3digo incorrecto.", "error");
    });
  });
}
function wireCreateTeamPanel() {
  const openBtn = document.getElementById("btn-clinical-team-create-open");
  const panel = document.getElementById("clinical-team-create-panel");
  if (!(openBtn instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;
  if (openBtn._rpcCreateOpenWired) return;
  openBtn._rpcCreateOpenWired = true;
  const showPanel = () => {
    panel.hidden = false;
    openBtn.hidden = true;
    syncCreateTeamServiceFromSala();
    const firstField = panel.querySelector("input, select, textarea");
    if (firstField instanceof HTMLElement) firstField.focus();
  };
  const hidePanel = () => {
    panel.hidden = true;
    openBtn.hidden = false;
  };
  openBtn.addEventListener("click", showPanel);
  panel.querySelectorAll(".clinical-teams-create-cancel").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcCreateCancelWired) return;
    btn._rpcCreateCancelWired = true;
    btn.addEventListener("click", hidePanel);
  });
}
function wireClinicalTeamsPanelInteractions() {
  syncSalaFieldVisibility();
  wireCreateTeamPanel();
  wireAdminCheckboxGate();
  const salaSelect = document.getElementById("clinical-team-create-sala");
  if (salaSelect && !salaSelect._rpcSalaWired) {
    salaSelect._rpcSalaWired = true;
    salaSelect.addEventListener("change", () => syncCreateTeamServiceFromSala());
  }
  const serviceSelect = document.getElementById("clinical-team-create-service");
  if (serviceSelect && !serviceSelect._rpcServiceWired) {
    serviceSelect._rpcServiceWired = true;
    serviceSelect.addEventListener("change", () => syncCreateTeamCycleField());
  }
  const r1LineSelect = document.getElementById("clinical-team-create-r1-line");
  if (r1LineSelect && !r1LineSelect._rpcR1LineWired) {
    r1LineSelect._rpcR1LineWired = true;
    r1LineSelect.addEventListener("change", () => syncCreateTeamCycleField());
  }
}
function wireBrowseSalaControl(elevated) {
  if (!elevated) return;
  const select = document.getElementById("clinical-browse-sala");
  if (!select || select._rpcBrowseWired) return;
  select._rpcBrowseWired = true;
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(BROWSE_SALA_LS, String(select.value || ""));
    } catch (_e) {
      void _e;
    }
    void renderClinicalTeamsPanel({ silent: true, skipLanPull: true, preserveDraft: true });
  });
}
function wireJoinButtons() {
  document.querySelectorAll(".clinical-teams-join-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcJoinWired) return;
    btn._rpcJoinWired = true;
    btn.addEventListener("click", async () => {
      await joinClinicalTeamByButton(String(btn.dataset.teamId || ""));
    });
  });
}
function wireInheritPatientsButtons() {
  document.querySelectorAll(".clinical-teams-inherit-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcInheritWired) return;
    btn._rpcInheritWired = true;
    btn.addEventListener("click", async () => {
      const teamId = String(btn.dataset.teamId || "");
      const teamName = String(btn.dataset.teamName || "");
      const { openInheritPatientsModal, wireInheritPatientsModal } = await import("/mobile/js/chunks/teams-roster-inherit-patients-modal-4XQSLOCL.js");
      wireInheritPatientsModal();
      const res = await openInheritPatientsModal({ teamId, teamName });
      if (res && res.offered === false) {
        toast2("No hay pacientes locales del mes anterior para heredar.", "info");
      }
    });
  });
}
function wireCopyInviteButtons() {
  document.querySelectorAll(".clinical-teams-copy-invite-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._rpcInviteWired) return;
    btn._rpcInviteWired = true;
    btn.addEventListener("click", () => {
      const teamId = String(btn.dataset.teamId || "");
      const team = (clinicalSessionContext.teams || []).find(
        (t) => String(t.team_id) === teamId
      );
      if (!team) {
        toast2("Equipo no encontrado.", "error");
        return;
      }
      const text = buildClinicalTeamInviteMessage(team);
      void copyToClipboardSafe(text).then((ok) => {
        toast2(
          ok ? "Invitaci\xF3n copiada. P\xE9gala en WhatsApp o correo." : "No se pudo copiar.",
          ok ? "success" : "error"
        );
      });
    });
  });
}
function wireClinicalTeamsCollapsePersistence() {
  const host = getClinicalTeamsPanelHost();
  if (!host) return;
  host.querySelectorAll("details.clinical-teams-collapse[data-collapse-key]").forEach((el) => {
    if (!(el instanceof HTMLDetailsElement) || el._rpcCollapseWired) return;
    el._rpcCollapseWired = true;
    el.addEventListener("toggle", () => {
      const key = String(el.dataset.collapseKey || "").trim();
      if (!key) return;
      writeClinicalTeamsCollapseOpen(key, el.open);
    });
  });
  host.querySelectorAll(".clinical-teams-collapse-summary-actions").forEach((wrap) => {
    if (!(wrap instanceof HTMLElement) || wrap._rpcCollapseActionsWired) return;
    wrap._rpcCollapseActionsWired = true;
    wrap.addEventListener("click", (ev) => ev.stopPropagation());
    wrap.addEventListener("mousedown", (ev) => ev.stopPropagation());
  });
}
function wireRenderedClinicalTeamsPanel(elevated) {
  wireClinicalTeamsPanelInteractions();
  wireJoinButtons();
  wireInheritPatientsButtons();
  wireCopyInviteButtons();
  wireBrowseSalaControl(elevated);
  wireClinicalTeamsCollapsePersistence();
}

// public/js/mobile-join-link.mjs
function isLanSalaInvitePaste(text) {
  const t = String(text || "").trim();
  return /\/join\//i.test(t) || /[?&]code=/i.test(t);
}

// public/js/features/clinical-teams/teams-invite-resolve.mjs
function resolveTeamIdFromLocalTeams(raw) {
  if (raw.includes("-") && raw.length > 20) return raw;
  return resolveTeamIdFromInviteCode(raw, clinicalSessionContext.teams || []);
}
async function resolveTeamIdFromLanDirectory(raw) {
  try {
    const { pullClinicalOpsFromCloudRoom: pullClinicalOpsFromCloudRoom2 } = await import("/mobile/js/chunks/teams-guardia-bridge-FK2GGSR4.js");
    await pullClinicalOpsFromCloudRoom2({ timeoutMs: 8e3, force: true });
    const { fetchClinicalTeamsFromDb: fetchClinicalTeamsFromDb2 } = await import("/mobile/js/chunks/clinical-access-runtime-KABKCTTJ.js");
    await fetchClinicalTeamsFromDb2();
    return resolveTeamIdFromInviteCode(raw, clinicalSessionContext.teams || []);
  } catch {
    return "";
  }
}
async function resolveTeamIdFromDbCode(raw) {
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamResolveCode !== "function") return "";
  const res = await api2.dbClinicalTeamResolveCode({ code: normalizeTeamInviteCode(raw) });
  if (!res?.ok || !res.team?.team_id) return "";
  await fetchClinicalTeamsFromDb();
  return String(res.team.team_id);
}
async function resolveTeamIdForInviteInput(codeOrId) {
  const raw = String(codeOrId || "").trim();
  if (!raw) return "";
  await fetchClinicalTeamsFromDb();
  let teamId = resolveTeamIdFromLocalTeams(raw);
  if (!teamId) teamId = await resolveTeamIdFromLanDirectory(raw);
  if (!teamId) teamId = await resolveTeamIdFromDbCode(raw);
  return teamId;
}

// public/js/features/clinical-teams/teams-invite.mjs
function findTeamForJoin(teamId) {
  return (clinicalSessionContext.teams || []).find((t) => String(t.team_id) === teamId);
}
function isAlreadyJoinedTeam(teamId) {
  return filterJoinedTeams(clinicalSessionContext.teams, clinicalSessionContext.user).some(
    (t) => String(t.team_id) === teamId
  );
}
async function openTeamsPanelAfterAlreadyJoined() {
  toast2("Ya perteneces a este equipo.", "info");
  const { openClinicalTeamsPanel: openClinicalTeamsPanel2 } = await import("/mobile/js/chunks/teams-roster-YA5DDHZ5.js");
  await openClinicalTeamsPanel2();
}
async function finalizeSuccessfulTeamJoin(team, teamId, cycle) {
  toast2(`Te uniste al equipo ${team.name || ""} (ciclo ${cycle}).`, "success");
  markClinicalEverJoinedTeam();
  const sala = String(team?.sala || clinicalSessionContext.user?.sala || "").trim();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed", { detail: { sala } }));
  await publishClinicalTeamsAfterChange({ sala });
  void import("/mobile/js/chunks/ensure-turn-room-WY2PQ5VC.js").then(
    ({ ensureTurnRoomAfterTeamJoin }) => ensureTurnRoomAfterTeamJoin(toast2)
  );
  await offerBringPatientsAfterTeamJoin(teamId, team.name || "");
  const { refreshTeamsUiAfterChange: refreshTeamsUiAfterChange2 } = await import("/mobile/js/chunks/teams-roster-YA5DDHZ5.js");
  await refreshTeamsUiAfterChange2();
}
async function joinTeamById(teamId, subAreaFraction) {
  const userId = currentUserId();
  if (!userId || !teamId) return false;
  await fetchClinicalTeamsFromDb();
  const team = findTeamForJoin(teamId);
  if (!team) {
    toast2("Equipo no encontrado en esta base de datos.", "error");
    return false;
  }
  if (isAlreadyJoinedTeam(teamId)) {
    await openTeamsPanelAfterAlreadyJoined();
    return true;
  }
  const api2 = dbApi3();
  if (!api2 || typeof api2.dbClinicalTeamsJoin !== "function") {
    toast2("Base de datos no disponible.", "error");
    return false;
  }
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const cycle = subAreaFraction || inferMembershipCycleForJoin(team, rank);
  const res = await api2.dbClinicalTeamsJoin({ teamId, userId, subAreaFraction: cycle });
  if (!res?.ok) {
    toast2(res?.error || "No se pudo unir al equipo.", "error");
    return false;
  }
  await finalizeSuccessfulTeamJoin(team, teamId, cycle);
  return true;
}
async function redirectLanInviteFromTeamJoinField(raw) {
  const text = String(raw || "").trim();
  if (!text) return false;
  const { openConnectionDropdown } = await import("/mobile/js/chunks/panel-chrome-6JPJGLJB.js");
  if (typeof openConnectionDropdown === "function") openConnectionDropdown();
  toast2("LiveSync LAN retirado \u2014 usa Nube en \u21C4 Conexi\xF3n.", "info");
  return true;
}
async function handleJoinWithCodeSubmit(ev) {
  ev.preventDefault();
  const input = document.getElementById("clinical-team-join-code-input");
  const cycleEl = document.getElementById("clinical-team-join-code-cycle");
  const code = input instanceof HTMLInputElement ? input.value : "";
  const subAreaFraction = cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || "").trim() : "";
  if (isLanSalaInvitePaste(code)) {
    await redirectLanInviteFromTeamJoinField(code);
    return;
  }
  const teamId = await resolveTeamIdForInviteInput(code);
  if (!teamId) {
    await fetchClinicalTeamsFromDb();
    const diag = diagnoseInviteCodeFailure(code, clinicalSessionContext.teams || []);
    toast2(inviteCodeFailureMessage(diag), "error");
    return;
  }
  await joinTeamById(teamId, subAreaFraction);
}
function clearClinicalTeamJoinQueryParams() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("joinTeam");
    url.searchParams.delete("joinCode");
    url.searchParams.delete("clinicalTeam");
    url.searchParams.delete("teamCode");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  } catch (_e) {
    void _e;
  }
}
async function consumeClinicalTeamJoinFromUrl() {
  if (typeof window === "undefined" || !isClinicalTeamJoinDesktopApp()) {
    tryMountClinicalTeamInviteBrowserGate();
    return;
  }
  const parsed = parseClinicalTeamJoinQuery(window.location.search);
  if (!parsed.teamId && !parsed.inviteCode) return;
  const sessionOk = await ensureClinicalPanelSession();
  if (!sessionOk) return;
  const { openClinicalTeamsPanel: openClinicalTeamsPanel2 } = await import("/mobile/js/chunks/teams-roster-YA5DDHZ5.js");
  await openClinicalTeamsPanel2();
  const input = document.getElementById("clinical-team-join-code-input");
  if (input instanceof HTMLInputElement && parsed.inviteCode) {
    input.value = parsed.inviteCode;
  }
  const teamId = parsed.teamId || await resolveTeamIdForInviteInput(parsed.inviteCode);
  if (!teamId) {
    toast2("Pega el c\xF3digo en Mi rotaci\xF3n y pulsa Unirme.", "info");
    clearClinicalTeamJoinQueryParams();
    return;
  }
  const cycleEl = document.getElementById("clinical-team-join-code-cycle");
  const subAreaFraction = cycleEl instanceof HTMLSelectElement ? String(cycleEl.value || "").trim() : "";
  await joinTeamById(teamId, subAreaFraction);
  clearClinicalTeamJoinQueryParams();
}

// public/js/features/clinical-teams/teams-roster-modal-chrome.mjs
function teamsModalBackdrop() {
  return document.getElementById("clinical-teams-backdrop");
}
function loadRoster() {
  return import("/mobile/js/chunks/teams-roster-YA5DDHZ5.js");
}
function wireClinicalTeamsModalChrome() {
  const bd = teamsModalBackdrop();
  if (bd) {
    if (!bd._rpcTeamsBackdropClick) {
      bd._rpcTeamsBackdropClick = true;
      bd.addEventListener("click", (ev) => {
        if (ev.target === bd) {
          void loadRoster().then((m) => m.closeClinicalTeamsPanel());
        }
      });
    }
    if (!bd._rpcTeamsSubmitDelegated) {
      bd._rpcTeamsSubmitDelegated = true;
      bd.addEventListener("submit", (ev) => {
        const form = ev.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (form.id === "clinical-profile-form") {
          ev.preventDefault();
          void loadRoster().then((m) => m.handleProfileFormSubmit(ev));
        } else if (form.id === "clinical-team-create-form") {
          ev.preventDefault();
          void loadRoster().then((m) => m.handleCreateTeamSubmit(ev));
        } else if (form.classList.contains("clinical-teams-add-member-form")) {
          ev.preventDefault();
          void loadRoster().then((m) => m.handleAddMemberSubmit(ev, form));
        } else if (form.classList.contains("clinical-teams-my-cycle-form")) {
          ev.preventDefault();
          void loadRoster().then((m) => m.handleMyCycleSubmit(ev, form));
        } else if (form.id === "clinical-team-join-code-form") {
          ev.preventDefault();
          void handleJoinWithCodeSubmit(ev);
        } else if (form.classList.contains("clinical-teams-edit-form")) {
          ev.preventDefault();
          void loadRoster().then((m) => m.handleEditTeamSubmit(ev, form));
        }
      });
    }
  }
  const closeBtn = document.getElementById("btn-clinical-teams-close");
  if (closeBtn && !closeBtn._rpcCloseWired) {
    closeBtn._rpcCloseWired = true;
    closeBtn.addEventListener("click", () => {
      void loadRoster().then((m) => m.closeClinicalTeamsPanel());
    });
  }
  if (!document._rpcClinicalTeamsEscapeWired) {
    document._rpcClinicalTeamsEscapeWired = true;
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;
      const lanBd = lanUsersModalBackdropEl();
      if (lanBd?.classList.contains("open")) {
        closeLanUsersDirectoryModal();
        return;
      }
      const adminBd = adminCodeModalBackdropEl();
      if (adminBd?.classList.contains("open")) {
        cancelAdminCodeModal();
        return;
      }
      const teamsBd = teamsModalBackdrop();
      if (teamsBd?.classList.contains("open")) {
        void loadRoster().then((m) => m.closeClinicalTeamsPanel());
      }
    });
  }
  wireLanUsersDirectoryControls();
  wireAdminCodeModalControls();
  void loadRoster().then((m) => m.wireTeamManageModalDelegation());
}

// public/js/features/clinical-teams/index.mjs
var teamsControlsWired = false;
function wireClinicalTeamsControls() {
  void import("/mobile/js/chunks/teams-roster-modal-chrome-PS6OL6BV.js").then((m) => m.wireClinicalTeamsModalChrome());
  if (teamsControlsWired) return;
  teamsControlsWired = true;
  import("/mobile/js/chunks/clinical-rotation-entry-2SRV3X5Y.js").then((mod) => {
    mod.wireClinicalRotationEntryControls();
    mod.syncClinicalRotationEntryChrome();
  });
  void import("/mobile/js/chunks/clinical-rotation-EUEWE7JI.js").then((mod) => {
    if (typeof mod.wireGuardiaRotationControls === "function") mod.wireGuardiaRotationControls();
  });
  if (!document._rpcClinicalTeamsChangedWired) {
    document._rpcClinicalTeamsChangedWired = true;
    document.addEventListener("rpc-clinical-teams-changed", (ev) => {
      void refreshTeamsUiAfterChange({ force: !!ev.detail?.force });
    });
  }
  if (!document._rpcClinicalOpsSyncedTeamsWired) {
    document._rpcClinicalOpsSyncedTeamsWired = true;
    let opsSyncedTeamsRefreshTimer = null;
    document.addEventListener("rpc-clinical-ops-synced", () => {
      if (opsSyncedTeamsRefreshTimer) clearTimeout(opsSyncedTeamsRefreshTimer);
      opsSyncedTeamsRefreshTimer = setTimeout(() => {
        opsSyncedTeamsRefreshTimer = null;
        void refreshTeamsUiAfterChange();
      }, 300);
    });
  }
}

// public/js/features/entrega-modal-ui/entrega-modal-state.mjs
var entregaDraft = {
  items: [],
  actor: null,
  sourceTeamId: "",
  vitalsPlan: defaultVitalsPlan(),
  handoffContext: defaultHandoffContext()
};
var entregaUiFlags = {
  procWired: false,
  handoffWired: false
};

// public/js/features/entrega-modal-ui/entrega-modal-time.mjs
function formatHHmm(scheduledAt) {
  if (!scheduledAt) return "";
  const d = new Date(scheduledAt);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const m = String(scheduledAt).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : "";
}
function scheduledAtFromTimeInput(hhmm) {
  const t = String(hhmm || "").trim();
  if (!t) return null;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = /* @__PURE__ */ new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function defaultProcedureTimeHHmm() {
  const d = /* @__PURE__ */ new Date();
  let mins = Math.ceil(d.getMinutes() / 5) * 5;
  if (mins >= 60) {
    d.setHours(d.getHours() + 1);
    mins = 0;
  }
  d.setMinutes(mins, 0, 0);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function parseTimeParts(hhmm) {
  const t = formatHHmm(hhmm) || String(hhmm || "").trim();
  if (!t || !/^\d{1,2}:\d{1,2}$/.test(t)) return { hour: "", minute: "" };
  const [hour, minute] = t.split(":");
  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(minute).padStart(2, "0")
  };
}
function buildHourSelectOptions(selected, opts = {}) {
  const allowBlank = opts.allowBlank !== false;
  let html = allowBlank ? '<option value="">\u2014</option>' : "";
  for (let h = 0; h < 24; h += 1) {
    const v = String(h).padStart(2, "0");
    html += `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`;
  }
  return html;
}
function buildMinuteSelectOptions(selected, opts = {}) {
  const allowBlank = opts.allowBlank !== false;
  let html = allowBlank ? '<option value="">\u2014</option>' : "";
  const stepSet = /* @__PURE__ */ new Set();
  for (let m = 0; m < 60; m += 5) {
    const v = String(m).padStart(2, "0");
    stepSet.add(v);
    html += `<option value="${v}"${v === selected ? " selected" : ""}>${v}</option>`;
  }
  if (selected && !stepSet.has(selected)) {
    html += `<option value="${selected}" selected>${selected}</option>`;
  }
  return html;
}
function buildTimeSelectMarkup(hhmm, opts = {}) {
  const resolved = hhmm || (opts.allowBlank === false ? defaultProcedureTimeHHmm() : "");
  const { hour, minute } = parseTimeParts(resolved);
  const hourName = opts.hourName || "entrega-proc-hour";
  const minuteName = opts.minuteName || "entrega-proc-minute";
  const ariaLabel = opts.ariaLabel || "Hora programada";
  const selectOpts = { allowBlank: opts.allowBlank !== false };
  const disabled = opts.disabled ? " disabled" : "";
  const wrapClass = [opts.picker ? "entrega-time-picker" : "entrega-time-combo", opts.wrapperClass].filter(Boolean).join(" ");
  const wrapId = opts.wrapperId ? ` id="${opts.wrapperId}"` : "";
  return `<div class="${wrapClass}"${wrapId} role="group" aria-label="${escapeHtml(ariaLabel)}">
    <div class="entrega-time-picker__part">
      <span class="entrega-time-picker__hint">H</span>
      <select name="${hourName}" class="profile-input entrega-time-select" aria-label="Hora"${disabled}>${buildHourSelectOptions(hour, selectOpts)}</select>
    </div>
    <span class="entrega-time-sep" aria-hidden="true">:</span>
    <div class="entrega-time-picker__part">
      <span class="entrega-time-picker__hint">M</span>
      <select name="${minuteName}" class="profile-input entrega-time-select" aria-label="Minutos"${disabled}>${buildMinuteSelectOptions(minute, selectOpts)}</select>
    </div>
  </div>`;
}
function readTimeFromForm(formEl) {
  const hour = String(formEl.querySelector('[name="entrega-proc-hour"]')?.value || "").trim();
  const minute = String(formEl.querySelector('[name="entrega-proc-minute"]')?.value || "").trim();
  if (!hour && !minute) return "";
  if (hour && minute) return `${hour}:${minute}`;
  if (hour) return `${hour}:00`;
  return `00:${minute}`;
}

// public/js/features/entrega-modal-ui/entrega-modal-handoff.mjs
function checkPill(name, label, checked, extraClass = "", inputId = "") {
  const cls = ["entrega-check-pill", extraClass].filter(Boolean).join(" ");
  const idAttr = inputId ? ` id="${escapeHtml(inputId)}"` : "";
  return `<label class="${cls}">
    <input type="checkbox" name="${name}"${idAttr} ${checked ? "checked" : ""}>
    <span>${escapeHtml(label)}</span>
  </label>`;
}
function updateHandoffSummaryLine() {
  const text = handoffContextSummary(entregaDraft.handoffContext);
  const summary = document.getElementById("entrega-handoff-summary");
  const display = text === "Sin resumen cl\xEDnico" ? "" : text;
  if (summary) summary.textContent = display;
}
function syncHandoffSupportCards(host) {
  const vasoOn = !!host.querySelector('[name="entrega-vaso-active"]')?.checked;
  const ventOn = !!host.querySelector('[name="entrega-vent-active"]')?.checked;
  host.querySelector('[data-handoff-card="vasopressor"]')?.classList.toggle("is-active", vasoOn);
  host.querySelector('[data-handoff-card="ventilation"]')?.classList.toggle("is-active", ventOn);
  host.querySelector('[data-handoff-detail="vasopressor"]')?.classList.toggle("is-hidden", !vasoOn);
  host.querySelector('[data-handoff-detail="ventilation"]')?.classList.toggle("is-hidden", !ventOn);
}
function readVasoUnitFromDom(host) {
  const agent = normalizeVasopressorAgent(
    host.querySelector("#entrega-vaso-agent")?.value || ""
  );
  if (agent === "vasopresina") return "ui_min";
  const selected = host.querySelector("[data-vaso-unit].is-selected");
  const unit = selected?.getAttribute("data-vaso-unit");
  if (unit === "mcg_min" || unit === "mcg_kg_min") return unit;
  return "mcg_kg_min";
}
function syncVasoUnitUi(host, unit) {
  const agent = normalizeVasopressorAgent(
    host.querySelector("#entrega-vaso-agent")?.value || ""
  );
  const coerced = coerceVasopressorUnit(agent, unit);
  const chipsRow = host.querySelector("[data-vaso-unit-chips]");
  const fixedRow = host.querySelector("[data-vaso-unit-fixed]");
  const isVaso = agent === "vasopresina";
  chipsRow?.classList.toggle("is-hidden", isVaso);
  fixedRow?.classList.toggle("is-hidden", !isVaso);
  host.querySelectorAll("[data-vaso-unit]").forEach((btn) => {
    const u = btn.getAttribute("data-vaso-unit");
    btn.classList.toggle("is-selected", !isVaso && u === coerced);
  });
}
function applyVasoAgentDefaults(host, opts = {}) {
  const agent = normalizeVasopressorAgent(
    host.querySelector("#entrega-vaso-agent")?.value || "norepinefrina"
  );
  const doseInp = host.querySelector("#entrega-vaso-dose");
  const defaults = defaultVasopressorInfusion(agent);
  if (opts.applyDefaults || !String(doseInp?.value || "").trim()) {
    if (doseInp) doseInp.value = defaults.dose;
  }
  syncVasoUnitUi(host, defaults.unit);
}
function buildVasoDoseMarkup(vas) {
  const agent = normalizeVasopressorAgent(vas.agent) || "norepinefrina";
  const unit = coerceVasopressorUnit(agent, vas.unit);
  const dose = String(vas.dose || defaultVasopressorInfusion(agent).dose);
  const agentOpts = VASOPRESSOR_AGENTS.map(
    (a) => `<option value="${escapeHtml(a.value)}"${a.value === agent ? " selected" : ""}>${escapeHtml(a.label)}</option>`
  ).join("");
  const unitChips = ["mcg_kg_min", "mcg_min"].map((u) => {
    const label = VASOPRESSOR_UNIT_LABELS[u];
    return `<button type="button" class="entrega-freq-chip entrega-vaso-unit-pill${unit === u && agent !== "vasopresina" ? " is-selected" : ""}" data-vaso-unit="${u}">${escapeHtml(label)}</button>`;
  }).join("");
  const isVaso = agent === "vasopresina";
  return `
    <div class="entrega-vaso-dose">
      <div class="field-group">
        <label for="entrega-vaso-agent">Agente</label>
        <select id="entrega-vaso-agent" class="profile-input">${agentOpts}</select>
      </div>
      <div class="field-group entrega-vaso-dose-row">
        <label for="entrega-vaso-dose">Infusi\xF3n</label>
        <div class="entrega-vaso-dose-input-wrap">
          <input id="entrega-vaso-dose" class="profile-input entrega-vaso-dose-input" type="number"
            inputmode="decimal" step="0.01" min="0" placeholder="${escapeHtml(
    VASOPRESSOR_INFUSION_DEFAULTS[agent]?.dose || "0.05"
  )}" value="${escapeHtml(dose)}">
          <div class="entrega-vaso-unit-inline" role="group" aria-label="Unidad de infusi\xF3n">
            <div class="entrega-vaso-unit-chips${isVaso ? " is-hidden" : ""}" data-vaso-unit-chips>${unitChips}</div>
            <span class="entrega-vaso-unit-pill-fixed${isVaso ? "" : " is-hidden"}" data-vaso-unit-fixed>${escapeHtml(VASOPRESSOR_UNIT_LABELS.ui_min)}</span>
          </div>
        </div>
      </div>
    </div>`;
}
function readHandoffSupportFromDom(host) {
  return {
    vasopressor: {
      active: !!host.querySelector('[name="entrega-vaso-active"]')?.checked,
      agent: normalizeVasopressorAgent(host.querySelector("#entrega-vaso-agent")?.value || ""),
      dose: String(host.querySelector("#entrega-vaso-dose")?.value || "").trim(),
      unit: readVasoUnitFromDom(host)
    },
    ventilation: {
      active: !!host.querySelector('[name="entrega-vent-active"]')?.checked,
      mode: String(host.querySelector("#entrega-vent-mode")?.value || "").trim(),
      fio2: String(host.querySelector("#entrega-vent-fio2")?.value || "").trim(),
      settings: String(host.querySelector("#entrega-vent-settings")?.value || "").trim()
    }
  };
}
function readHandoffFieldsFromDom(host) {
  const support = readHandoffSupportFromDom(host);
  return {
    clinicalStatus: String(host.querySelector("#entrega-clinical-status")?.value || ""),
    signedRefusal: !!host.querySelector("#entrega-signed-refusal")?.checked,
    show: !!host.querySelector("#entrega-show")?.checked,
    ...support,
    notes: String(host.querySelector("#entrega-handoff-notes")?.value || "").trim()
  };
}
function syncHandoffDraftFromDom(host) {
  entregaDraft.handoffContext = normalizeHandoffContext(readHandoffFieldsFromDom(host));
  syncHandoffSupportCards(host);
  updateHandoffSummaryLine();
}
function buildClinicalStatusMarkup(ctx) {
  const norm = normalizeHandoffContext(ctx);
  const statusOpts = CLINICAL_STATUS_OPTIONS.map(
    (o) => `<option value="${escapeHtml(o.value)}"${o.value === norm.clinicalStatus ? " selected" : ""}>${escapeHtml(o.label)}</option>`
  ).join("");
  return `
    <label for="entrega-clinical-status">Estado general</label>
    <select id="entrega-clinical-status" class="profile-input">${statusOpts}</select>`;
}
function buildHandoffPanelMarkup(ctx, isCritical) {
  const norm = normalizeHandoffContext(ctx);
  const ventModes = VENTILATION_MODES.map(
    (m) => `<option value="${escapeHtml(m.value)}"${m.value === norm.ventilation.mode ? " selected" : ""}>${escapeHtml(m.label)}</option>`
  ).join("");
  return `
    <div class="entrega-markers-block">
      <span class="entrega-field-label">Marcadores</span>
      <div class="entrega-check-pills entrega-markers-pills">
        ${checkPill("entrega-critical", "Paciente cr\xEDtico", isCritical, "entrega-check-pill--alert", "entrega-critical")}
        ${checkPill("entrega-signed-refusal", "Negativas firmadas", norm.signedRefusal, "entrega-check-pill--alert", "entrega-signed-refusal")}
        ${checkPill("entrega-show", "Show", norm.show, "entrega-check-pill--alert", "entrega-show")}
      </div>
    </div>
    <div class="entrega-section-divider" aria-hidden="true">Soporte \xB7 Signos vitales</div>
    <div class="entrega-middle-row">
      <div class="entrega-support-stack">
        <div class="entrega-handoff-support-card${norm.vasopressor.active ? " is-active" : ""}" data-handoff-card="vasopressor">
          <div class="entrega-handoff-support-card__head">
            ${checkPill("entrega-vaso-active", "Vasopresor", norm.vasopressor.active)}
          </div>
          <div class="entrega-handoff-support-detail${norm.vasopressor.active ? "" : " is-hidden"}" data-handoff-detail="vasopressor">
            ${buildVasoDoseMarkup(norm.vasopressor)}
          </div>
        </div>
        <div class="entrega-handoff-support-card${norm.ventilation.active ? " is-active" : ""}" data-handoff-card="ventilation">
          <div class="entrega-handoff-support-card__head">
            ${checkPill("entrega-vent-active", "Ventilaci\xF3n / soporte resp.", norm.ventilation.active)}
          </div>
          <div class="entrega-handoff-support-detail${norm.ventilation.active ? "" : " is-hidden"}" data-handoff-detail="ventilation">
            <div class="field-group">
              <label for="entrega-vent-mode">Modalidad</label>
              <select id="entrega-vent-mode" class="profile-input">${ventModes}</select>
            </div>
            <div class="field-group">
              <label for="entrega-vent-fio2">FiO\u2082 / flujo</label>
              <input id="entrega-vent-fio2" class="profile-input" type="text" placeholder="ej. 40% \xB7 50 L/min" value="${escapeHtml(norm.ventilation.fio2)}">
            </div>
            <div class="field-group">
              <label for="entrega-vent-settings">Par\xE1metros</label>
              <input id="entrega-vent-settings" class="profile-input" type="text" placeholder="PEEP, VT, presiones\u2026" value="${escapeHtml(norm.ventilation.settings)}">
            </div>
          </div>
        </div>
      </div>
      <div class="entrega-vitals-col" aria-label="Signos vitales en guardia">
        <div id="entrega-vitals-panel" class="entrega-vitals-panel"></div>
      </div>
    </div>
    <div class="field-group entrega-handoff-notes">
      <label for="entrega-handoff-notes">Notas breves de entrega</label>
      <textarea id="entrega-handoff-notes" class="profile-input entrega-handoff-notes-input" maxlength="240" rows="2" placeholder="Antecedentes relevantes para la guardia\u2026">${escapeHtml(norm.notes)}</textarea>
    </div>`;
}
function handoffDomRoot() {
  return document.getElementById("entrega-form") || document.getElementById("entrega-modal");
}
function wireHandoffPanelOnce() {
  if (entregaUiFlags.handoffWired) return;
  const root = handoffDomRoot();
  if (!root) return;
  entregaUiFlags.handoffWired = true;
  root.addEventListener("change", (ev) => {
    if (!ev.target?.closest("#entrega-handoff-panel, #entrega-clinical-status-slot")) return;
    const host = handoffDomRoot();
    if (!host) return;
    if (ev.target?.id === "entrega-vaso-agent") {
      applyVasoAgentDefaults(host, { applyDefaults: true });
    }
    if (ev.target?.name === "entrega-vaso-active" && ev.target.checked) {
      applyVasoAgentDefaults(host, { applyDefaults: true });
    }
    syncHandoffDraftFromDom(host);
  });
  root.addEventListener("input", (ev) => {
    if (!ev.target?.closest("#entrega-handoff-panel, #entrega-clinical-status-slot")) return;
    syncHandoffDraftFromDom(handoffDomRoot());
  });
  root.addEventListener("click", (ev) => {
    const unitBtn = ev.target.closest("[data-vaso-unit]");
    if (!unitBtn || unitBtn.classList.contains("is-hidden")) return;
    const host = handoffDomRoot();
    if (!host) return;
    host.querySelectorAll("[data-vaso-unit]").forEach((btn) => {
      btn.classList.toggle("is-selected", btn === unitBtn);
    });
    syncVasoUnitUi(host, unitBtn.getAttribute("data-vaso-unit") || "mcg_kg_min");
    syncHandoffDraftFromDom(host);
  });
}
function mountEntregaHandoffPanel(handoffContext, opts = {}) {
  wireHandoffPanelOnce();
  entregaDraft.handoffContext = normalizeHandoffContext(handoffContext, {
    signedRefusal: !!opts.signedRefusal
  });
  const statusSlot = document.getElementById("entrega-clinical-status-slot");
  if (statusSlot) statusSlot.innerHTML = buildClinicalStatusMarkup(entregaDraft.handoffContext);
  const host = document.getElementById("entrega-handoff-panel");
  if (!host) return;
  host.innerHTML = buildHandoffPanelMarkup(entregaDraft.handoffContext, !!opts.isCritical);
  const domRoot = handoffDomRoot() || host;
  syncHandoffSupportCards(domRoot);
  applyVasoAgentDefaults(domRoot);
  updateHandoffSummaryLine();
}
function readEntregaHandoffContext() {
  const host = handoffDomRoot();
  if (host?.querySelector("#entrega-handoff-panel")?.innerHTML) syncHandoffDraftFromDom(host);
  return normalizeHandoffContext(entregaDraft.handoffContext);
}
function readEntregaCriticalFromHandoff() {
  const host = document.getElementById("entrega-handoff-panel");
  if (!host) return false;
  const input = host.querySelector("#entrega-critical");
  return input instanceof HTMLInputElement ? input.checked : false;
}

// public/js/features/entrega-modal-ui/entrega-modal-procedures.mjs
var BADGE_LABELS = {
  consentimiento: "Consent",
  anestesia: "Anest",
  familiar: "Familiar"
};
function toast3(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function renderBadgeChips(item) {
  const badges = pendingRequirementBadges(item);
  if (!badges.length) return "";
  return badges.map(
    (b) => `<span class="entrega-proc-chip entrega-proc-chip--req">${escapeHtml(BADGE_LABELS[b] || b)}</span>`
  ).join("");
}
function renderStatusChips(item) {
  const chips = [];
  if (item.comentado) chips.push('<span class="entrega-proc-chip">Comentado</span>');
  if (item.autorizado) chips.push('<span class="entrega-proc-chip">Autorizado</span>');
  if (item.agendado) chips.push('<span class="entrega-proc-chip">Agendado</span>');
  if (item.lockedBase) chips.push('<span class="entrega-proc-chip entrega-proc-chip--lock">Base</span>');
  return chips.join("");
}
function ensureProcDetailsOpen() {
  const details = document.querySelector("#entrega-modal-backdrop .entrega-proc-details");
  if (details instanceof HTMLDetailsElement && !details.open) details.open = true;
}
function renderProcList() {
  const list = document.getElementById("entrega-proc-list");
  if (!list || !entregaDraft.actor) return;
  if (entregaDraft.items.length) ensureProcDetailsOpen();
  if (!entregaDraft.items.length) {
    list.innerHTML = '<li class="entrega-proc-empty">Sin procedimientos. Usa + Agregar.</li>';
    return;
  }
  list.innerHTML = entregaDraft.items.map((item) => {
    if (item.type === "legacy_text") {
      const canDel2 = canDeletePendienteItem(item, entregaDraft.actor);
      return `<li class="entrega-proc-card entrega-proc-card--legacy" data-item-id="${escapeHtml(item.id)}">
          <div class="entrega-proc-card-main">
            <span class="entrega-proc-label">${escapeHtml(item.text || "")}</span>
            <span class="entrega-proc-meta">Texto legado</span>
          </div>
          ${canDel2 ? `<button type="button" class="btn-med-secondary entrega-proc-delete" data-action="delete">Eliminar</button>` : ""}
        </li>`;
    }
    if (item.type !== "procedimiento") return "";
    const time = formatHHmm(item.scheduledAt);
    const canDel = canDeletePendienteItem(item, entregaDraft.actor);
    const kindLabel = item.kind === "imagen" ? "Imagen" : "Otro";
    const flagRow = `
        <div class="entrega-proc-flags">
          <label><input type="checkbox" data-flag="comentado" ${item.comentado ? "checked" : ""}> Comentado</label>
          <label><input type="checkbox" data-flag="autorizado" ${item.autorizado ? "checked" : ""}> Autorizado</label>
          <label><input type="checkbox" data-flag="agendado" ${item.agendado ? "checked" : ""}> Agendado</label>
        </div>`;
    return `<li class="entrega-proc-card" data-item-id="${escapeHtml(item.id)}">
        <div class="entrega-proc-card-main">
          <div class="entrega-proc-title-row">
            <span class="entrega-proc-label">${escapeHtml(item.label)}</span>
            ${time ? `<span class="entrega-proc-time">${escapeHtml(time)}</span>` : ""}
            <span class="entrega-proc-kind">${escapeHtml(kindLabel)}</span>
          </div>
          <div class="entrega-proc-chips">${renderStatusChips(item)}${renderBadgeChips(item)}</div>
          ${flagRow}
        </div>
        ${canDel ? `<button type="button" class="btn-med-secondary entrega-proc-delete" data-action="delete">Eliminar</button>` : ""}
      </li>`;
  }).join("");
}
function updateItemFlags(itemId, flag, checked) {
  entregaDraft.items = entregaDraft.items.map((it) => {
    if (it.id !== itemId || it.type !== "procedimiento") return it;
    return {
      ...it,
      [flag]: !!checked,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  renderProcList();
}
function deleteItem(itemId) {
  const item = entregaDraft.items.find((it) => it.id === itemId);
  if (!item || !entregaDraft.actor || !canDeletePendienteItem(item, entregaDraft.actor)) {
    toast3("No puedes eliminar este procedimiento.", "error");
    return;
  }
  entregaDraft.items = entregaDraft.items.filter((it) => it.id !== itemId);
  renderProcList();
}
function readFormFields(formEl) {
  const kindRaw = formEl.querySelector('[name="entrega-proc-kind"]')?.value;
  const kind = kindRaw === "otro" ? "otro" : "imagen";
  const label = String(formEl.querySelector('[name="entrega-proc-label"]')?.value || "").trim();
  const time = readTimeFromForm(formEl);
  return {
    kind,
    label,
    scheduledAt: scheduledAtFromTimeInput(time),
    comentado: !!formEl.querySelector('[name="entrega-proc-comentado"]')?.checked,
    autorizado: !!formEl.querySelector('[name="entrega-proc-autorizado"]')?.checked,
    agendado: !!formEl.querySelector('[name="entrega-proc-agendado"]')?.checked,
    requires: {
      familiar: !!formEl.querySelector('[name="entrega-req-familiar"]')?.checked,
      consentimiento: !!formEl.querySelector('[name="entrega-req-consentimiento"]')?.checked,
      anestesia: !!formEl.querySelector('[name="entrega-req-anestesia"]')?.checked
    }
  };
}
function buildAddFormMarkup(prefill = null) {
  const p = prefill || {};
  const timeVal = p.scheduledAt ? formatHHmm(p.scheduledAt) : "";
  const kindIsOtro = p.kind === "otro";
  return `
    <div class="entrega-inline-form" role="group" aria-label="Agregar procedimiento">
      <div class="entrega-inline-form__head">
        <h4 class="entrega-inline-form__title">Nuevo procedimiento</h4>
        <button type="button" class="entrega-inline-form__close" data-action="cancel-form" aria-label="Cerrar">\xD7</button>
      </div>
      <div class="entrega-inline-form__grid">
        <div class="field-group">
          <label for="entrega-proc-kind">Tipo</label>
          <select id="entrega-proc-kind" name="entrega-proc-kind" class="profile-input">
            <option value="imagen" ${kindIsOtro ? "" : "selected"}>Imagen</option>
            <option value="otro" ${kindIsOtro ? "selected" : ""}>Otro</option>
          </select>
        </div>
        <div class="field-group entrega-inline-form__label-wide">
          <label for="entrega-proc-label">Descripci\xF3n</label>
          <input id="entrega-proc-label" name="entrega-proc-label" class="profile-input" type="text" required placeholder="Ej. TAC t\xF3rax, endoscopia\u2026" value="${escapeHtml(p.label || "")}">
        </div>
        <div class="field-group entrega-inline-form__time">
          <span class="entrega-field-label-block">Hora</span>
          ${buildTimeSelectMarkup(timeVal, { allowBlank: false, picker: true })}
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Estado</span>
        <div class="entrega-check-pills">
          ${checkPill("entrega-proc-comentado", "Comentado", p.comentado)}
          ${checkPill("entrega-proc-autorizado", "Autorizado", p.autorizado)}
          ${checkPill("entrega-proc-agendado", "Agendado", p.agendado)}
        </div>
      </div>
      <div class="entrega-check-section">
        <span class="entrega-check-section__label">Requiere</span>
        <div class="entrega-check-pills">
          ${checkPill("entrega-req-familiar", "Familiar", p.requires?.familiar)}
          ${checkPill("entrega-req-consentimiento", "Consentimiento", p.requires?.consentimiento)}
          ${checkPill("entrega-req-anestesia", "Anestesia", p.requires?.anestesia)}
        </div>
      </div>
      <div class="entrega-inline-form__foot">
        <div class="entrega-inline-form__foot-actions entrega-inline-form__foot-actions--end">
          <button type="button" class="btn-cancel" data-action="cancel-form">Cancelar</button>
          <button type="button" class="btn-save" data-action="add-item">A\xF1adir</button>
        </div>
      </div>
    </div>`;
}
function showAddForm(prefill = null) {
  ensureProcDetailsOpen();
  const wrap = document.getElementById("entrega-proc-form");
  if (!wrap) return;
  wrap.innerHTML = buildAddFormMarkup(prefill);
  wrap.classList.remove("hidden");
  wrap.setAttribute("aria-hidden", "false");
  wrap.querySelector('[name="entrega-proc-label"]')?.focus();
}
function hideAddForm() {
  const wrap = document.getElementById("entrega-proc-form");
  if (!wrap) return;
  wrap.innerHTML = "";
  wrap.classList.add("hidden");
  wrap.setAttribute("aria-hidden", "true");
}
function addItemFromForm(formEl) {
  if (!entregaDraft.actor) {
    toast3("No se pudo agregar el procedimiento. Cierra y vuelve a abrir la entrega.", "error");
    return;
  }
  const fields = readFormFields(formEl);
  if (!fields.label) {
    toast3("Indica la etiqueta del procedimiento.", "error");
    return;
  }
  const item = createProcedimientoItem({
    ...fields,
    lockedBase: entregaDraft.actor.role === "diurno",
    createdBy: entregaDraft.actor.userId ? { userId: entregaDraft.actor.userId, rank: entregaDraft.actor.rank || "" } : null
  });
  entregaDraft.items.push(item);
  hideAddForm();
  renderProcList();
}
function entregaProcEventRoot() {
  return document.getElementById("entrega-modal") || document.getElementById("entrega-form");
}
function wireProcUiOnce() {
  if (entregaUiFlags.procWired) return;
  const root = entregaProcEventRoot();
  if (!root) return;
  entregaUiFlags.procWired = true;
  root.addEventListener("click", (ev) => {
    if (ev.target.closest("#btn-entrega-add-proc")) {
      ev.preventDefault();
      showAddForm();
    }
  });
  root.addEventListener("click", (ev) => {
    const delBtn = ev.target.closest('#entrega-proc-list [data-action="delete"]');
    if (!delBtn) return;
    const card = delBtn.closest("[data-item-id]");
    const id = card?.getAttribute("data-item-id");
    if (id) deleteItem(id);
  });
  root.addEventListener("change", (ev) => {
    const input = ev.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.flag) return;
    if (!input.closest("#entrega-proc-list")) return;
    const card = input.closest("[data-item-id]");
    const id = card?.getAttribute("data-item-id");
    if (id) updateItemFlags(id, input.dataset.flag, input.checked);
  });
  root.addEventListener("click", (ev) => {
    const btn = ev.target.closest("#entrega-proc-form [data-action]");
    if (!btn) return;
    const formWrap = document.getElementById("entrega-proc-form");
    if (!formWrap) return;
    const action = btn.getAttribute("data-action");
    const inner = formWrap.querySelector(".entrega-inline-form");
    if (action === "cancel-form") {
      hideAddForm();
      return;
    }
    if (!inner) return;
    if (action === "add-item") addItemFromForm(inner);
  });
  const teamSelect = document.getElementById("entrega-source-team");
  if (teamSelect && !teamSelect._rpcEntregaTeamWired) {
    teamSelect._rpcEntregaTeamWired = true;
    teamSelect.addEventListener("change", (ev) => {
      entregaDraft.sourceTeamId = String(ev.target?.value || "");
    });
  }
}

// public/js/features/entrega-modal-ui/entrega-modal-vitals-render.mjs
function buildVitalsFreqPanelsMarkup(buildUntilMarkup, uiMode, freq) {
  const hourChips = VITALS_FREQ_HOUR_PRESETS.map(
    (h) => `<button type="button" class="entrega-freq-chip${freq.mode === "interval" && freq.hours === h ? " is-selected" : ""}" data-freq-hours="${h}">${h} h</button>`
  ).join("");
  const shiftChips = VITALS_FREQ_SHIFT_OPTIONS.map(
    (t) => `<button type="button" class="entrega-freq-chip${freq.mode === "shift" && freq.timesPerShift === t ? " is-selected" : ""}" data-freq-shift="${t}">${t}\xD7</button>`
  ).join("");
  const hoursVal = freq.mode === "interval" ? freq.hours ?? 2 : 2;
  const untilInterval = buildUntilMarkup(freq.mode === "interval" ? freq.untilTime : null, "interval");
  const untilShift = buildUntilMarkup(freq.mode === "shift" ? freq.untilTime : null, "shift");
  return `<div class="entrega-vitals-freq-detail-slot" aria-hidden="false">
              <div class="entrega-freq-panel${uiMode === "interval" ? "" : " is-hidden"}" id="entrega-freq-interval-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Atajos</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Atajos cada N horas">${hourChips}</div>
                  </div>
                  <div class="entrega-freq-detail__row-split">
                    <div class="entrega-freq-detail__cell">
                      <span class="entrega-freq-detail__cell-label">Cada</span>
                      <div class="entrega-freq-stepper" role="group" aria-label="Intervalo en horas">
                        <button type="button" class="entrega-freq-step" data-hours-dec aria-label="Menos horas">\u2212</button>
                        <input type="number" id="entrega-vitals-hours" class="entrega-freq-hours-input" min="1" max="24" step="1" inputmode="numeric" value="${hoursVal}" aria-label="Cada cu\xE1ntas horas">
                        <button type="button" class="entrega-freq-step" data-hours-inc aria-label="M\xE1s horas">+</button>
                      </div>
                      <span class="entrega-freq-interval-suffix">horas</span>
                    </div>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">${untilInterval}</div>
                  </div>
                </div>
              </div>
              <div class="entrega-freq-panel${uiMode === "shift" ? "" : " is-hidden"}" id="entrega-freq-shift-panel">
                <div class="entrega-freq-detail-card">
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Veces</span>
                    <div class="entrega-freq-chips" role="group" aria-label="Veces por turno">${shiftChips}</div>
                  </div>
                  <div class="entrega-freq-detail__row">
                    <span class="entrega-freq-detail__row-label">Fin</span>
                    <div class="entrega-freq-detail__cell entrega-freq-detail__cell--until">${untilShift}</div>
                  </div>
                </div>
              </div>
              <p class="entrega-freq-routine-hint is-hidden" id="entrega-freq-routine-hint">No aparece en internos para signos vitales. Si agregas un estudio pendiente, s\xED se listar\xE1 ah\xED.</p>
            </div>`;
}
function buildVitalsPanelMarkup(plan, buildUntilMarkup) {
  const freq = plan.frequency;
  const metricChecks = VITALS_METRIC_KEYS.map(
    (key) => `<label class="entrega-check-pill"><input type="checkbox" data-vital-metric="${key}" ${plan.metrics[key] ? "checked" : ""}><span>${escapeHtml(VITALS_METRIC_LABELS[key])}</span></label>`
  ).join("");
  const uiMode = freq.mode === "shift" ? "shift" : freq.mode === "routine" ? "routine" : "interval";
  const modeLabels = { interval: "Intervalo", shift: "Por turno", routine: "Sin signos" };
  const modePills = ["interval", "shift", "routine"].map(
    (mode) => `<label class="entrega-check-pill entrega-freq-mode-pill">
          <input type="radio" name="entrega-freq-mode" value="${mode}" ${uiMode === mode ? "checked" : ""}>
          <span>${modeLabels[mode]}</span>
        </label>`
  ).join("");
  const freqPanels = buildVitalsFreqPanelsMarkup(buildUntilMarkup, uiMode, freq);
  return `<div class="entrega-vitals-form">
      <div class="entrega-vitals-form__scroll">
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-metrics-label">
          <span class="entrega-field-label" id="entrega-vitals-metrics-label">Par\xE1metros</span>
          <div class="entrega-check-pills entrega-vitals-metrics" role="group" aria-labelledby="entrega-vitals-metrics-label">${metricChecks}</div>
        </section>
        <section class="entrega-vitals-section" aria-labelledby="entrega-vitals-freq-label">
          <span class="entrega-field-label" id="entrega-vitals-freq-label">Frecuencia</span>
          <div class="entrega-vitals-freq" role="group" aria-labelledby="entrega-vitals-freq-label">
            <div class="entrega-freq-segment entrega-check-pills entrega-freq-modes" role="radiogroup" aria-label="Modo de frecuencia">${modePills}</div>
            ${freqPanels}
          </div>
        </section>
      </div>
      <p class="entrega-vitals-summary" id="entrega-vitals-summary" role="status">${escapeHtml(vitalsPlanSummary(plan))}</p>
    </div>`;
}
function wireVitalsPanelControls(host, api2) {
  host.querySelectorAll("[data-vital-metric]").forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.getAttribute("data-vital-metric");
      if (!key) return;
      entregaDraft.vitalsPlan = normalizeVitalsPlan({
        ...entregaDraft.vitalsPlan,
        metrics: { ...entregaDraft.vitalsPlan.metrics, [key]: input.checked }
      });
      api2.updateVitalsSummary();
    });
  });
  host.querySelectorAll('input[name="entrega-freq-mode"]').forEach((input) => {
    input.addEventListener("change", () => {
      const mode = String(input.value || "interval");
      if (mode === "routine") {
        entregaDraft.vitalsPlan = normalizeVitalsPlan({
          ...entregaDraft.vitalsPlan,
          frequency: defaultFrequencySpec()
        });
      } else if (mode === "shift") {
        const cur = normalizeFrequencySpec(entregaDraft.vitalsPlan.frequency);
        entregaDraft.vitalsPlan = normalizeVitalsPlan({
          ...entregaDraft.vitalsPlan,
          frequency: normalizeFrequencySpec({ mode: "shift", timesPerShift: 1, untilTime: cur.untilTime })
        });
      } else {
        entregaDraft.vitalsPlan = normalizeVitalsPlan({
          ...entregaDraft.vitalsPlan,
          frequency: api2.mergeIntervalFrequency({ hours: 2 })
        });
      }
      api2.syncVitalsFreqUi(host);
    });
  });
  host.querySelectorAll("[data-freq-hours]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const hours = Number(btn.getAttribute("data-freq-hours") || 2);
      entregaDraft.vitalsPlan = normalizeVitalsPlan({
        ...entregaDraft.vitalsPlan,
        frequency: api2.mergeIntervalFrequency({ hours })
      });
      api2.syncVitalsFreqUi(host);
    });
  });
  host.querySelectorAll("[data-freq-shift]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const timesPerShift = Number(btn.getAttribute("data-freq-shift") || 1);
      const cur = normalizeFrequencySpec(entregaDraft.vitalsPlan.frequency);
      entregaDraft.vitalsPlan = normalizeVitalsPlan({
        ...entregaDraft.vitalsPlan,
        frequency: normalizeFrequencySpec({ mode: "shift", timesPerShift, untilTime: cur.untilTime })
      });
      api2.syncVitalsFreqUi(host);
    });
  });
  api2.wireVitalsUntilPanel(host, host.querySelector("#entrega-freq-interval-panel"));
  api2.wireVitalsUntilPanel(host, host.querySelector("#entrega-freq-shift-panel"));
  const hoursInp = host.querySelector("#entrega-vitals-hours");
  const bumpHours = (delta) => {
    const cur = Number(hoursInp?.value || 2);
    const next = Math.min(24, Math.max(1, cur + delta));
    if (hoursInp) hoursInp.value = String(next);
    entregaDraft.vitalsPlan = normalizeVitalsPlan({
      ...entregaDraft.vitalsPlan,
      frequency: api2.mergeIntervalFrequency({ hours: next })
    });
    host.querySelectorAll("[data-freq-hours]").forEach((chip) => {
      chip.classList.toggle("is-selected", Number(chip.getAttribute("data-freq-hours")) === next);
    });
    api2.updateVitalsSummary();
  };
  host.querySelector("[data-hours-dec]")?.addEventListener("click", () => bumpHours(-1));
  host.querySelector("[data-hours-inc]")?.addEventListener("click", () => bumpHours(1));
  hoursInp?.addEventListener("change", () => api2.syncFrequencyDraftFromDom(host));
  hoursInp?.addEventListener("input", () => api2.syncFrequencyDraftFromDom(host));
}

// public/js/features/entrega-modal-ui/entrega-modal-vitals.mjs
function updateVitalsSummary() {
  const summary = document.getElementById("entrega-vitals-summary");
  if (summary) summary.textContent = vitalsPlanSummary(entregaDraft.vitalsPlan);
}
function mergeIntervalFrequency(patch) {
  const cur = normalizeFrequencySpec(entregaDraft.vitalsPlan.frequency);
  const base = cur.mode === "interval" ? cur : { mode: "interval", hours: 2 };
  return normalizeFrequencySpec({ ...base, mode: "interval", ...patch });
}
function buildVitalsUntilTimeMarkup(hhmm, scope) {
  const enabled = !!hhmm;
  return `
    <div class="entrega-freq-until">
      <label class="entrega-check-pill entrega-freq-until-toggle">
        <input type="checkbox" data-vitals-until-enable${enabled ? " checked" : ""}>
        <span>Detener a las</span>
      </label>
      ${buildTimeSelectMarkup(hhmm || "07:00", {
    hourName: `entrega-vitals-until-hour-${scope}`,
    minuteName: `entrega-vitals-until-minute-${scope}`,
    ariaLabel: "Hora de fin",
    allowBlank: false,
    picker: true,
    wrapperClass: `entrega-freq-until-time entrega-time-picker--compact${enabled ? "" : " is-disabled"}`,
    disabled: !enabled
  })}
    </div>`;
}
function activeVitalsFreqPanel(host) {
  return host.querySelector("#entrega-freq-interval-panel:not(.is-hidden)") || host.querySelector("#entrega-freq-shift-panel:not(.is-hidden)");
}
function readVitalsUntilTimeFromHost(host) {
  const panel = activeVitalsFreqPanel(host);
  if (!panel) return null;
  if (!panel.querySelector("[data-vitals-until-enable]")?.checked) return null;
  const hour = String(
    panel.querySelector('[name^="entrega-vitals-until-hour"]')?.value || ""
  ).trim();
  const minute = String(
    panel.querySelector('[name^="entrega-vitals-until-minute"]')?.value || ""
  ).trim();
  if (!hour || !minute) return null;
  return normalizeUntilTime(`${hour}:${minute}`);
}
function wireVitalsUntilPanel(host, panel) {
  if (!panel) return;
  const untilEnable = panel.querySelector("[data-vitals-until-enable]");
  const untilTimeWrap = panel.querySelector(".entrega-freq-until-time");
  const setUntilEnabled = (on) => {
    untilTimeWrap?.classList.toggle("is-disabled", !on);
    untilTimeWrap?.querySelectorAll("select").forEach((sel) => {
      sel.disabled = !on;
    });
    if (on) {
      const hSel = panel.querySelector('[name^="entrega-vitals-until-hour"]');
      const mSel = panel.querySelector('[name^="entrega-vitals-until-minute"]');
      if (hSel && !hSel.value) hSel.value = "07";
      if (mSel && !mSel.value) mSel.value = "00";
    }
    syncFrequencyDraftFromDom(host);
  };
  untilEnable?.addEventListener("change", () => setUntilEnabled(!!untilEnable.checked));
  untilTimeWrap?.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", () => syncFrequencyDraftFromDom(host));
  });
}
function readFrequencyFromDom(host) {
  const mode = String(
    host.querySelector('input[name="entrega-freq-mode"]:checked')?.value || "interval"
  );
  if (mode === "routine") return defaultFrequencySpec();
  const untilTime = readVitalsUntilTimeFromHost(host);
  if (mode === "shift") {
    const chip = host.querySelector("[data-freq-shift].is-selected");
    const times = Number(chip?.getAttribute("data-freq-shift") || 1);
    return normalizeFrequencySpec({
      mode: "shift",
      timesPerShift: times,
      untilTime
    });
  }
  const hours = Number(host.querySelector("#entrega-vitals-hours")?.value || 2);
  return normalizeFrequencySpec({
    mode: "interval",
    hours,
    untilTime
  });
}
function syncFrequencyDraftFromDom(host) {
  entregaDraft.vitalsPlan = normalizeVitalsPlan({
    ...entregaDraft.vitalsPlan,
    frequency: readFrequencyFromDom(host)
  });
  updateVitalsSummary();
}
function syncVitalsFreqUi(host) {
  const freq = normalizeFrequencySpec(entregaDraft.vitalsPlan.frequency);
  const mode = freq.mode;
  host.querySelectorAll('input[name="entrega-freq-mode"]').forEach((input) => {
    if (input instanceof HTMLInputElement) input.checked = input.value === mode;
  });
  host.querySelector("#entrega-freq-interval-panel")?.classList.toggle("is-hidden", mode !== "interval");
  host.querySelector("#entrega-freq-shift-panel")?.classList.toggle("is-hidden", mode !== "shift");
  host.querySelector("#entrega-freq-routine-hint")?.classList.toggle("is-hidden", mode !== "routine");
  const slot = host.querySelector(".entrega-vitals-freq-detail-slot");
  slot?.setAttribute("aria-hidden", "false");
  if (mode === "interval") {
    const hours = freq.mode === "interval" ? freq.hours ?? 2 : 2;
    const hoursInp = host.querySelector("#entrega-vitals-hours");
    if (hoursInp instanceof HTMLInputElement) hoursInp.value = String(hours);
    host.querySelectorAll("[data-freq-hours]").forEach((chip) => {
      chip.classList.toggle(
        "is-selected",
        Number(chip.getAttribute("data-freq-hours")) === hours
      );
    });
  }
  if (mode === "shift") {
    const times = freq.mode === "shift" ? freq.timesPerShift ?? 1 : 1;
    host.querySelectorAll("[data-freq-shift]").forEach((chip) => {
      chip.classList.toggle(
        "is-selected",
        Number(chip.getAttribute("data-freq-shift")) === times
      );
    });
  }
  updateVitalsSummary();
}
function renderVitalsPanel() {
  const host = document.getElementById("entrega-vitals-panel");
  if (!host) return;
  const plan = normalizeVitalsPlan(entregaDraft.vitalsPlan);
  entregaDraft.vitalsPlan = plan;
  host.innerHTML = buildVitalsPanelMarkup(plan, buildVitalsUntilTimeMarkup);
  wireVitalsPanelControls(host, {
    mergeIntervalFrequency,
    syncVitalsFreqUi,
    syncFrequencyDraftFromDom,
    updateVitalsSummary,
    wireVitalsUntilPanel
  });
}
function readEntregaVitalsPlan() {
  const host = document.getElementById("entrega-vitals-panel");
  if (!host) return normalizeVitalsPlan(entregaDraft.vitalsPlan);
  const metrics = { ...entregaDraft.vitalsPlan.metrics };
  host.querySelectorAll("[data-vital-metric]").forEach((input) => {
    const key = input.getAttribute("data-vital-metric");
    if (key) metrics[key] = !!input.checked;
  });
  return normalizeVitalsPlan({ frequency: readFrequencyFromDom(host), metrics });
}
function mountEntregaVitalsPanel(opts = {}) {
  if (opts.vitalsPlan) {
    entregaDraft.vitalsPlan = normalizeVitalsPlan(opts.vitalsPlan);
  } else if (opts.vitalsFrequency) {
    entregaDraft.vitalsPlan = normalizeVitalsPlan({
      ...defaultVitalsPlan(),
      frequency: normalizeFrequencySpec(opts.vitalsFrequency)
    });
  } else {
    entregaDraft.vitalsPlan = normalizeVitalsPlan({
      ...defaultVitalsPlan(),
      frequency: { mode: "interval", hours: 2 }
    });
  }
  renderVitalsPanel();
}

// public/js/features/entrega-modal-ui.mjs
function resolveEntregaActorRole(currentUser, existingGuardia) {
  const userId = String(currentUser?.user_id || currentUser?.userId || "");
  const coveringUserId = String(existingGuardia?.covering_user_id || "");
  const hasGuardia = !!(existingGuardia?.guardia_id || existingGuardia?.guardiaId);
  const isCoveringReceiver = hasGuardia && coveringUserId !== "" && coveringUserId === userId;
  return {
    role: isCoveringReceiver ? "guardia" : "diurno",
    userId,
    rank: String(currentUser?.rank || "")
  };
}
function getEntregaDraftItems() {
  return entregaDraft.items.slice();
}
function resetEntregaModalUi() {
  entregaDraft.items = [];
  entregaDraft.actor = null;
  entregaDraft.sourceTeamId = "";
  entregaDraft.vitalsPlan = defaultVitalsPlan();
  entregaDraft.handoffContext = defaultHandoffContext();
  const statusSlot = document.getElementById("entrega-clinical-status-slot");
  if (statusSlot) statusSlot.innerHTML = "";
  const handoffPanel = document.getElementById("entrega-handoff-panel");
  if (handoffPanel) handoffPanel.innerHTML = "";
  const handoffSummary = document.getElementById("entrega-handoff-summary");
  if (handoffSummary) handoffSummary.textContent = "";
  const list = document.getElementById("entrega-proc-list");
  const formWrap = document.getElementById("entrega-proc-form");
  if (list) list.innerHTML = "";
  if (formWrap) {
    formWrap.innerHTML = "";
    formWrap.classList.add("hidden");
    formWrap.setAttribute("aria-hidden", "true");
  }
}
async function mountEntregaPendientesUi(opts) {
  wireProcUiOnce();
  entregaDraft.actor = opts.actor;
  entregaDraft.sourceTeamId = String(opts.sourceTeamId || "");
  const doc = normalizePendientesJson(opts.pendientesJson || "");
  entregaDraft.items = doc.items.slice();
  mountEntregaHandoffPanel(doc.handoffContext, {
    isCritical: !!opts.isCritical,
    signedRefusal: !!opts.signedRefusal
  });
  mountEntregaVitalsPanel({
    vitalsPlan: doc.vitalsPlan,
    vitalsFrequency: opts.vitalsFrequency
  });
  hideAddForm();
  renderProcList();
}

// public/js/features/clinical-entrega/clinical-entrega-constants.mjs
var GUARDIA_GRID_MODE_KEY = "guardia.gridMode";
var ENTREGA_PHASE_KEY = "guardia.entregaPhase";

// public/js/features/clinical-entrega/clinical-entrega-util.mjs
function normalizeUsers(users) {
  return (users || []).map((u) => ({
    user_id: String(u.user_id || u.userId || ""),
    username: String(u.username || ""),
    rank: String(u.rank || ""),
    clinical_name: String(u.clinical_name || "")
  })).filter((u) => u.user_id);
}
function userOptionLabel(u) {
  const handle = String(u.username || u.user_id || "");
  const name = String(u.clinical_name || "").trim();
  const rank = String(u.rank || "");
  return name ? `${handle} \xB7 ${name} (${rank})` : `${handle} (${rank})`;
}
function uniqueByUserId(list) {
  const seen = /* @__PURE__ */ new Set();
  return list.filter((u) => {
    if (seen.has(u.user_id)) return false;
    seen.add(u.user_id);
    return true;
  });
}
function dbApi5() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function setEntregaToolbarStatus(msg, isError = false) {
  const status = document.getElementById("guardia-entrega-phase-status");
  if (!status) return;
  if (!msg) {
    status.hidden = true;
    status.textContent = "";
    status.classList.remove("guardia-entrega-phase-status--error");
    return;
  }
  status.hidden = false;
  status.textContent = msg;
  status.classList.toggle("guardia-entrega-phase-status--error", isError);
}
function toast4(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
    return;
  }
  setEntregaToolbarStatus(msg, type === "error");
}
function normalizeEntregaPatientRow(row, id) {
  return {
    ...row,
    id: String(row.id || row.patient_id || id),
    name: row.name || row.nombre,
    nombre: row.nombre || row.name,
    servicio: row.servicio || row.service,
    service: row.service || row.servicio,
    area: row.area || row.sub_area,
    sub_area: row.sub_area || row.area
  };
}
function resolveEntregaPatientRow(patientId) {
  const id = String(patientId || "");
  if (!id) return null;
  const row = (patients || []).find((p) => String(p.id) === id) || (clinicalSessionContext.scopeContext?.patients || []).find(
    (p) => String(p.id || p.patient_id) === id
  ) || null;
  if (!row) return null;
  return normalizeEntregaPatientRow(row, id);
}
function clinicalDbApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function entregaModalEl() {
  return document.getElementById("entrega-modal-backdrop");
}

// public/js/features/guardia-hoy-modal-render.mjs
function teamCycleOnCallLabel(team, now, viewerUserId) {
  const r1s = (team.members || []).filter((m) => m.rank === "R1");
  const viewerOnCycle = viewerUserId && r1s.some(
    (m) => String(m.user_id) === String(viewerUserId) && isMemberOnCallToday(m, team, "R1", now)
  );
  if (viewerOnCycle) return "Tu turno de ciclo hoy";
  if (isTeamRankOnCallToday(team, "R1", now)) return "Turno de ciclo hoy";
  return "Fuera de ciclo hoy";
}
function r1OptionLabel(member, team) {
  const name = member.clinical_name || member.username || member.user_id;
  const cycle = String(
    member.sub_area_fraction || resolveMembershipCycleForUser(team, member.user_id, "R1") || ""
  ).trim();
  return cycle ? `${name} \xB7 ${cycle}` : String(name);
}
function defaultR1PickUserId(team, r1Members, now, userId, salaGuardiaToday) {
  const tid = String(team.team_id || "");
  const declared = (salaGuardiaToday || []).find((g) => String(g.team_id) === tid)?.user_id;
  if (declared) return String(declared);
  const onCycle = r1Members.find((m) => isMemberOnCallToday(m, team, "R1", now));
  if (onCycle?.user_id) return String(onCycle.user_id);
  if (r1Members.some((m) => String(m.user_id) === userId)) return userId;
  return String(r1Members[0]?.user_id || "");
}
function buildR1SelectOptions(r1Members, team, now, pickUserId) {
  return r1Members.map((m) => {
    const label = r1OptionLabel(m, team);
    const onMemberCycle = isMemberOnCallToday(m, team, "R1", now);
    const suffix = onMemberCycle ? " \u2014 ciclo hoy" : "";
    const sel = String(m.user_id) === pickUserId ? " selected" : "";
    return `<option value="${String(m.user_id)}"${sel}>${label}${suffix}</option>`;
  }).join("");
}
function buildViewerSelfAction(team, r1Members, rank, userId, now) {
  const isViewerR1 = rank === "R1" && r1Members.some((m) => String(m.user_id) === userId);
  if (!isViewerR1) return "";
  const viewerOnCycle = r1Members.some(
    (m) => String(m.user_id) === userId && isMemberOnCallToday(m, team, "R1", now)
  );
  if (viewerOnCycle) {
    return '<p class="guardia-hoy-on-cycle-note">Tu subciclo toca hoy; confirma o contin\xFAa sin guardar.</p>';
  }
  return `<button type="button" class="btn-med-secondary guardia-hoy-self-btn" data-team-id="${String(
    team.team_id
  )}">Activar guardia hoy (yo)</button>`;
}
function buildGuardiaHoyTeamRowHtml(team, ctx) {
  const { now, userId, rank, salaGuardiaToday } = ctx;
  const r1Members = (team.members || []).filter((m) => m.rank === "R1");
  if (!r1Members.length) return "";
  const cycleLabel = teamCycleOnCallLabel(team, now, userId);
  const onCycle = isTeamRankOnCallToday(team, "R1", now);
  const pickUserId = defaultR1PickUserId(team, r1Members, now, userId, salaGuardiaToday);
  const opts = buildR1SelectOptions(r1Members, team, now, pickUserId);
  const selfAction = buildViewerSelfAction(team, r1Members, rank, userId, now);
  return `
        <div class="guardia-hoy-team-row" data-team-id="${String(team.team_id)}">
          <div class="guardia-hoy-team-head">
            <strong>${String(team.name || team.sub_area_fraction || "Equipo")}</strong>
            <span class="guardia-hoy-cycle-badge${onCycle ? " is-on-cycle" : ""}">${cycleLabel}</span>
          </div>
          <label class="guardia-hoy-select-label">
            R1 de guardia
            <select class="profile-input guardia-hoy-r1-select" data-team-id="${String(team.team_id)}">
              ${opts}
            </select>
          </label>
          ${selfAction}
        </div>`;
}
function buildGuardiaHoyModalBodyHtml(salaTeams, ctx) {
  const { now } = ctx;
  const todayLetter = ctx.todayLetter;
  const dayNum = now.getDate();
  const rows = salaTeams.map((team) => buildGuardiaHoyTeamRowHtml(team, ctx)).filter(Boolean).join("");
  const cycleBanner = todayLetter ? `<p class="guardia-hoy-cycle-today">Hoy (d\xEDa ${dayNum}) toca subciclo <strong>${todayLetter}</strong> en Sala.</p>` : "";
  return cycleBanner + (rows || '<p class="guardia-hoy-empty">No hay equipos R1 en esta sala. Puedes continuar y elegir R1 en cada paciente.</p>');
}

// public/js/host-meta-stub.mjs
async function syncLanHostClinicalMetaToDisk() {
}

// public/js/features/guardia-hoy-modal-handlers.mjs
function dbApi6() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast5(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
async function persistGuardiaSelections(selects) {
  const api2 = dbApi6();
  if (!api2?.dbClinicalTeamsGuardiaSet) {
    toast5("Base cl\xEDnica no disponible.", "error");
    return { ok: false, activated: false };
  }
  const list = [...selects];
  if (!list.length) return { ok: true, activated: false };
  let activated = false;
  for (const sel of list) {
    const teamId = String(sel.getAttribute("data-team-id") || "");
    const pickUserId = String(sel.value || "");
    if (!teamId || !pickUserId) continue;
    const res = await api2.dbClinicalTeamsGuardiaSet({ teamId, userId: pickUserId });
    if (!res?.ok) {
      toast5(res?.error || "No se guard\xF3 la guardia.", "error");
      return { ok: false, activated: false };
    }
    activated = true;
  }
  await fetchClinicalScopeContextFromDb();
  document.dispatchEvent(new CustomEvent("rpc-clinical-teams-changed"));
  if (activated) {
    await syncLanHostClinicalMetaToDisk();
    const lanPush = await publishClinicalTeamsToLan();
    toastTeamLanPublishResult(lanPush, "Guardia hoy activada.");
  }
  return { ok: true, activated };
}
function wireSelfActivateButtons(body, userId, finish, persistGuardiaSelectionsFn) {
  let selfBusy = false;
  body.querySelectorAll(".guardia-hoy-self-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (selfBusy) return;
      void (async () => {
        const tid = String(btn.getAttribute("data-team-id") || "");
        const sel = body.querySelector(`select.guardia-hoy-r1-select[data-team-id="${tid}"]`);
        if (!sel) {
          toast5("No se encontr\xF3 el equipo.", "error");
          return;
        }
        sel.value = userId;
        selfBusy = true;
        const prevLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Activando\u2026";
        try {
          const result = await persistGuardiaSelectionsFn([sel]);
          if (!result.ok) return;
          finish({ proceed: true, activated: result.activated });
        } finally {
          selfBusy = false;
          btn.disabled = false;
          btn.textContent = prevLabel;
        }
      })();
    });
  });
}
function bindGuardiaHoyModalActions({ bd, body, form, userId }) {
  return new Promise((resolve) => {
    const cleanup = () => {
      bd.classList.remove("open");
      bd.setAttribute("aria-hidden", "true");
      form.removeEventListener("submit", onSubmit);
      document.getElementById("guardia-hoy-btn-skip")?.removeEventListener("click", onSkip);
      document.getElementById("guardia-hoy-btn-cancel")?.removeEventListener("click", onCancel);
      bd.removeEventListener("click", onBackdrop);
      body.querySelectorAll(".guardia-hoy-self-btn").forEach((btn) => {
        btn.replaceWith(btn.cloneNode(true));
      });
    };
    const finish = (result) => {
      cleanup();
      resolve(result);
    };
    const onSkip = () => finish({ proceed: true, activated: false });
    const onCancel = () => finish({ proceed: false });
    const onBackdrop = (ev) => {
      if (ev.target === bd) onCancel();
    };
    wireSelfActivateButtons(body, userId, finish, persistGuardiaSelections);
    const onSubmit = async (ev) => {
      ev.preventDefault();
      const selects = body.querySelectorAll("select.guardia-hoy-r1-select");
      if (!selects.length) {
        finish({ proceed: true, activated: false });
        return;
      }
      const result = await persistGuardiaSelections(selects);
      if (!result.ok) {
        finish({ proceed: false });
        return;
      }
      finish({ proceed: true, activated: result.activated });
    };
    form.addEventListener("submit", onSubmit);
    document.getElementById("guardia-hoy-btn-skip")?.addEventListener("click", onSkip);
    document.getElementById("guardia-hoy-btn-cancel")?.addEventListener("click", onCancel);
    bd.addEventListener("click", onBackdrop);
  });
}

// public/js/features/guardia-hoy-modal.mjs
function mergeSalaGuardiaTodayRows(teams, salaGuardiaToday) {
  const rows = Array.isArray(salaGuardiaToday) ? salaGuardiaToday.map((r) => ({ ...r })) : [];
  const seen = new Set(rows.map((r) => String(r.team_id || "")));
  for (const t of teams || []) {
    const tid = String(t.team_id || "");
    if (!tid || seen.has(tid)) continue;
    const uid = t?.guardia_today?.user_id;
    if (!uid) continue;
    rows.push({
      team_id: tid,
      user_id: String(uid),
      declared_at: t.guardia_today.declared_at
    });
    seen.add(tid);
  }
  return rows;
}
function modalBackdrop() {
  return document.getElementById("guardia-hoy-modal-backdrop");
}
function shouldPromptGuardiaHoy(ctx) {
  const sala = String(ctx.sala || "").trim();
  const userId = String(ctx.userId || "");
  if (!sala || !userId) return false;
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(teams, ctx.salaGuardiaToday);
  const now = /* @__PURE__ */ new Date();
  const onCall = salaOnCallR1(teams, sala, now, salaGuardiaToday);
  const rank = String(ctx.rank || effectiveClinicalRank(clinicalSessionContext.user) || "R1");
  if (onCall.length === 0) return true;
  if (rank !== "R1") return true;
  const joined = getJoinedTeams(teams, userId).filter((t) => String(t.sala || "") === sala);
  const isCovering = onCall.some((r) => String(r.user_id) === userId);
  const hasR1Team = joined.some(
    (t) => (t.members || []).some((m) => String(m.user_id) === userId && m.rank === "R1")
  );
  if (hasR1Team && !isCovering) return true;
  return false;
}
function ensureGuardiaHoyBeforeEntrega(ctx) {
  if (!shouldPromptGuardiaHoy(ctx)) {
    return Promise.resolve({ proceed: true, activated: false });
  }
  return openGuardiaHoyModal(ctx).then((res) => ({
    proceed: !!res?.proceed,
    activated: !!res?.activated
  }));
}
function openGuardiaHoyModal(ctx) {
  const bd = modalBackdrop();
  const body = document.getElementById("guardia-hoy-modal-body");
  const form = document.getElementById("guardia-hoy-form");
  if (!bd || !body || !form) return Promise.resolve({ proceed: true });
  const sala = String(ctx.sala || "").trim();
  const userId = String(ctx.userId || "");
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const rank = String(ctx.rank || effectiveClinicalRank(clinicalSessionContext.user) || "R1");
  const now = /* @__PURE__ */ new Date();
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(teams, ctx.salaGuardiaToday);
  const salaTeams = teams.filter((t) => String(t.sala || "") === sala);
  const renderCtx = {
    now,
    userId,
    rank,
    salaGuardiaToday,
    todayLetter: activeCycleLetterForDate("Sala", "R1", now)
  };
  body.innerHTML = buildGuardiaHoyModalBodyHtml(salaTeams, renderCtx);
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  return bindGuardiaHoyModalActions({ bd, body, form, userId });
}

// public/js/features/clinical-entrega/clinical-entrega-targets-rank.mjs
function listEntregaTargetsR3(all, teamList, now) {
  const suggestedIds = /* @__PURE__ */ new Set();
  teamList.forEach((team) => {
    if (!isOnCallToday(team, "R3", now)) return;
    (team.members || []).forEach((m) => {
      if (m?.user_id) suggestedIds.add(String(m.user_id));
    });
  });
  const targets = all.filter((u) => suggestedIds.has(u.user_id));
  return {
    flow: "r3_suggest",
    targets: targets.length ? uniqueByUserId(targets) : all
  };
}
function listEntregaTargetsR2(all, teamList, now) {
  const r2GuardiaIds = new Set(salaOnCallR2(teamList, now).map((r) => r.user_id));
  const r2GuardiaUsers = all.filter((u) => r2GuardiaIds.has(u.user_id));
  const r4s = all.filter((u) => u.rank === "R4");
  const targets = uniqueByUserId([...r2GuardiaUsers, ...r4s]);
  return { flow: "r2_handoff", targets: targets.length ? targets : all };
}
function listEntregaTargetsR1(all, teamList, joinedTeams, now) {
  let userSala = "";
  for (const t of joinedTeams) {
    const sala = String(t.sala || "").trim();
    if (sala) {
      userSala = sala;
      break;
    }
  }
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    teamList,
    clinicalSessionContext.salaGuardiaToday || []
  );
  const onCallIds = new Set(
    (userSala ? salaOnCallR1(teamList, userSala, now, salaGuardiaToday) : []).map(
      (r) => String(r.user_id)
    )
  );
  const onCallTargets = all.filter((u) => u.rank === "R1" && onCallIds.has(u.user_id));
  const joinedIds = new Set(joinedTeams.map((t) => String(t.team_id)));
  const fractions = new Set(
    joinedTeams.map((t) => String(t.sub_area_fraction || "").trim()).filter(Boolean)
  );
  const peerTargets = all.filter((u) => {
    if (u.rank !== "R1") return false;
    return teamList.some((team) => {
      const member = (team.members || []).some((m) => String(m.user_id) === u.user_id);
      if (!member) return false;
      if (joinedIds.has(String(team.team_id))) return true;
      const frac = String(team.sub_area_fraction || "").trim();
      return frac && fractions.has(frac);
    });
  });
  const targets = uniqueByUserId([...onCallTargets, ...peerTargets]);
  return { flow: "r1", targets: targets.length ? targets : all };
}

// public/js/features/clinical-entrega/clinical-entrega-targets.mjs
function ensureEntregaTargetUser(targetList, users, userId, fallbackLabel = "") {
  const id = String(userId || "").trim();
  if (!id || targetList.some((u) => u.user_id === id)) return targetList;
  const match = normalizeUsers(users).find((u) => u.user_id === id);
  if (match) return [match, ...targetList];
  return [
    {
      user_id: id,
      username: fallbackLabel || "Residente de guardia",
      rank: "R1",
      clinical_name: ""
    },
    ...targetList
  ];
}
function collectEntregaScopeUsers(scopeContext, teams, sessionUser = null) {
  const parts = [];
  if (Array.isArray(scopeContext?.users)) parts.push(...scopeContext.users);
  for (const team of teams || []) {
    for (const m of team.members || []) {
      if (!m?.user_id) continue;
      parts.push({
        user_id: m.user_id,
        username: m.username,
        rank: m.rank,
        clinical_name: m.clinical_name
      });
    }
  }
  if (sessionUser?.user_id) parts.push(sessionUser);
  return uniqueByUserId(normalizeUsers(parts));
}
function listEntregaTargets(rank, teams, users, salaDeficit, opts = {}) {
  const currentUserId2 = String(opts.currentUserId || "");
  const now = opts.now ? new Date(String(opts.now)) : /* @__PURE__ */ new Date();
  const all = normalizeUsers(users);
  const teamList = Array.isArray(teams) ? teams : [];
  const rankNorm = String(rank || "R1");
  const joinedTeams = currentUserId2 ? getJoinedTeams(teamList, currentUserId2) : [];
  if (rankNorm === "R3") return listEntregaTargetsR3(all, teamList, now);
  if (rankNorm === "R2") return listEntregaTargetsR2(all, teamList, now);
  if (rankNorm === "R1") return listEntregaTargetsR1(all, teamList, joinedTeams, now);
  return { flow: "generic", targets: all };
}

// public/js/features/clinical-entrega/clinical-entrega-team.mjs
async function lookupEntregaCensusTeamId(patientId, patientRow, teams, assignments, now) {
  let row = patientRow;
  if (row) {
    tagPatientsForTeamFilter([row], {
      teams,
      assignments,
      now: typeof now === "string" ? now : now.toISOString()
    });
  }
  const fromScope = resolveEntregaCensusTeamId(patientId, row, teams, assignments, now);
  if (fromScope) return fromScope;
  const api2 = clinicalDbApi();
  if (api2 && typeof api2.dbPatientActiveTeamId === "function") {
    try {
      const res = await api2.dbPatientActiveTeamId({
        patientId: String(patientId || ""),
        nowIso: typeof now === "string" ? now : now.toISOString()
      });
      if (res?.ok && res.teamId) return String(res.teamId);
    } catch {
    }
  }
  return "";
}
function resolveEntregaSourceTeamId(patientId, patientRow, teams, assignments, existingGuardia, fallbackUserId = "") {
  const censusTeamId = resolveEntregaCensusTeamId(
    patientId,
    patientRow,
    teams,
    assignments,
    /* @__PURE__ */ new Date()
  );
  if (censusTeamId) return censusTeamId;
  if (existingGuardia?.source_team_id) {
    return String(existingGuardia.source_team_id);
  }
  return resolveDefaultSourceTeamIdForUser(teams, fallbackUserId);
}
function resolveEntregaCensusTeamId(patientId, patientRow, teams, assignments, now = /* @__PURE__ */ new Date()) {
  const pid = String(patientId || "");
  if (!pid) return "";
  const mapped = patientForScopeEvaluate(patientRow || { id: pid });
  const fromCensus = resolvePatientCensusTeamId(mapped, teams, assignments || [], now);
  if (fromCensus) return fromCensus;
  return String(patientRow?._filterTeamId || "").trim();
}
function entregaSourceTeamHint(opts = {}) {
  if (opts.hasCensusAssignment) {
    return "Equipo al que est\xE1 asignado este paciente en el censo (no el R1 de guardia).";
  }
  if (opts.hasExistingSourceTeam) {
    return "Equipo de la entrega anterior \u2014 confirma si sigue siendo el correcto.";
  }
  return "Sin asignaci\xF3n en censo \u2014 confirma el equipo del paciente antes de entregar.";
}
function resolveDefaultSourceTeamIdForUser(teams, userId) {
  const joined = getJoinedTeams(teams, String(userId || ""));
  if (joined[0]?.team_id) return String(joined[0].team_id);
  if (teams[0]?.team_id) return String(teams[0].team_id);
  return "";
}
function entregaTeamOptionLabel(team) {
  if (!team?.team_id) return "";
  const name = String(team.name || "").trim() || "Equipo";
  const service = String(team.service || "").trim();
  return service ? `${name} \xB7 ${service}` : name;
}
function findEntregaTeamById(teamId, teams) {
  const tid = String(teamId || "");
  if (!tid) return null;
  return (teams || []).find((t) => String(t?.team_id) === tid) || null;
}
function entregaSourceTeamSelectOptions(srcTeamId, teams, userId, user = null) {
  const tid = String(srcTeamId || "").trim();
  const allTeams = (teams || []).filter((t) => t?.team_id);
  const joined = getJoinedTeams(allTeams, userId);
  const base = hasElevatedTeamPrivileges(user || clinicalSessionContext.user) ? allTeams : joined.length ? joined : allTeams;
  if (!tid) return base;
  if (base.some((t) => String(t.team_id) === tid)) return base;
  const found = findEntregaTeamById(tid, teams);
  if (found) return [found, ...base];
  return [{ team_id: tid, name: teamLabelById(tid) }, ...base];
}

// public/js/features/clinical-census-filters-state.mjs
var elevatedPatientFilters = { sala: "__all__", teamId: "", service: "" };

// public/js/features/entrega-roster-panel.mjs
var PANEL_ID = "entrega-roster-panel";
var WARN_SVG = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`;
var LUNG_SVG = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 4.5 7 13 7 13s7-8.5 7-13a7 7 0 00-7-7z"/></svg>`;
var ACTIVE_SVG = `<svg width="7" height="7" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>`;
var STATUS_LABELS = {
  critical: "Cr\xEDtico",
  unstable: "Inestable",
  stable: "Estable",
  postop: "Postoperatorio",
  "": "\u2014"
};
var STATUS_CLASS = {
  critical: "roster-sbadge--critical",
  unstable: "roster-sbadge--unstable",
  stable: "roster-sbadge--stable",
  postop: "roster-sbadge--stable",
  "": "roster-sbadge--none"
};
function rowContextSummary(g) {
  if (!g?.pendientes_json) return null;
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  const summary = handoffContextSummary(ctx);
  if (summary !== "Sin resumen cl\xEDnico") return summary;
  if (vitalsStructuredMonitoringEnabled(doc.vitalsPlan)) {
    const n2 = listActiveProcedimientos(doc).length;
    return n2 > 0 ? `Signos vitales \xB7 ${n2} estudio(s)` : "Signos vitales configurados";
  }
  const n = listActiveProcedimientos(doc).length;
  return n > 0 ? `${n} estudio(s) pendiente(s)` : null;
}
function rowIcons(g) {
  if (!g?.pendientes_json) return "";
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  const flags = [];
  if (ctx.vasopressor.active) flags.push(`<span class="roster-icon-flag">${WARN_SVG} Vaso</span>`);
  if (ctx.ventilation.active) flags.push(`<span class="roster-icon-flag">${LUNG_SVG} Vent</span>`);
  return flags.join("");
}
function rowStatus(g) {
  if (!g?.pendientes_json) return "";
  const doc = normalizePendientesJson(g.pendientes_json);
  const ctx = normalizeHandoffContext(doc.handoffContext);
  return ctx.clinicalStatus || "";
}
function ensureRosterHost() {
  let host = document.getElementById(PANEL_ID);
  if (host?.closest('#profile-modal, .modal-backdrop[aria-hidden="true"]')) {
    document.body.appendChild(host);
  }
  if (!host) {
    host = document.createElement("div");
    host.id = PANEL_ID;
    host.className = "entrega-roster-panel-host";
    document.body.appendChild(host);
  }
  return host;
}
function isEntregaRosterOpen() {
  const host = document.getElementById(PANEL_ID);
  return !!(host && host.innerHTML.trim());
}
var TURNO_STARTED_KEY = "guardia.turnoStartedAt";
function renderRosterRow(p, guardiasMap) {
  const g = guardiasMap.get(p.id);
  const summary = rowContextSummary(g);
  const icons = rowIcons(g);
  const status = rowStatus(g);
  const label = STATUS_LABELS[status] || "\u2014";
  const cls = STATUS_CLASS[status] || "roster-sbadge--none";
  const hasCtx = !!summary;
  return `
      <div class="roster-row${hasCtx ? " roster-row--ctx" : ""}" data-patient-id="${p.id}" role="button" tabindex="0">
        <div class="roster-row-bed">${p.bed_label || "\u2014"}</div>
        <div class="roster-row-body">
          <div class="roster-row-name">${p.name || "\u2014"}</div>
          <div class="roster-row-dx">${String(p.diagnosticosText || p.service || "").toUpperCase() || "\u2014"}</div>
          ${summary ? `<div class="roster-row-ctx">${summary}</div>` : `<div class="roster-row-empty">Sin contexto \u2014 toca para completar</div>`}
        </div>
        <div class="roster-row-right">
          <span class="roster-sbadge ${cls}">${label}</span>
          <div class="roster-icon-flags">${icons}</div>
        </div>
      </div>`;
}
function buildRosterPanelHtml(censusPatients, critical, stable, guardiasMap) {
  const renderRow = (p) => renderRosterRow(p, guardiasMap);
  return `
    <div class="roster-panel">
      <div class="roster-panel-header">
        <div class="roster-panel-title">Entrega</div>
        <div class="roster-panel-sub">Sala \xB7 ${censusPatients.length} pacientes</div>
        <span class="roster-active-badge">${ACTIVE_SVG} Activa</span>
      </div>
      <div class="roster-list">
        ${critical.length ? `<div class="roster-section">Cr\xEDticos</div>${critical.map(renderRow).join("")}` : ""}
        ${stable.length ? `<div class="roster-section">Estables</div>${stable.map(renderRow).join("")}` : ""}
      </div>
      <div class="roster-panel-footer modal-actions">
        <button type="button" class="btn-cancel roster-foot-btn" id="roster-btn-cancel">Cancelar</button>
        <button type="button" class="btn-save roster-foot-btn" id="roster-btn-confirm">Confirmar entrega</button>
      </div>
    </div>`;
}
function wireRosterRows(host, guardiasMap, rosterPatientIds, settings) {
  host.querySelectorAll(".roster-row").forEach((row) => {
    const patientId = row.dataset.patientId;
    const open = () => {
      const g = guardiasMap.get(patientId);
      const patientIndex = rosterPatientIds.indexOf(String(patientId));
      const openModal = typeof window !== "undefined" ? window.appShell?.openEntregaModal : null;
      if (typeof openModal !== "function") {
        window.showToast?.("No se pudo abrir la entrega.", "error");
        return;
      }
      openModal({
        patientId,
        guardiaId: g?.guardia_id ? String(g.guardia_id) : void 0,
        patientIndex: patientIndex >= 0 ? patientIndex : void 0,
        patientTotal: rosterPatientIds.length,
        rosterPatientIds,
        onConfirm: () => {
          void refreshGuardiaCensusFromDb(settings);
          openEntregaRosterPanel(settings);
        }
      });
    };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        open();
      }
    });
  });
}
function rosterHasSavedEntregas(guardiasMap) {
  let totalEstudios = 0;
  let patientsWithSignos = 0;
  for (const g of guardiasMap.values()) {
    if (!g?.pendientes_json) continue;
    const doc = normalizePendientesJson(g.pendientes_json);
    totalEstudios += listActiveProcedimientos(doc).length;
    if (vitalsStructuredMonitoringEnabled(doc.vitalsPlan)) patientsWithSignos += 1;
  }
  return totalEstudios > 0 || patientsWithSignos > 0;
}
function wireRosterFooter(guardiasMap) {
  document.getElementById("roster-btn-cancel")?.addEventListener("click", () => {
    void (async () => {
      closeEntregaRosterPanel();
      const { endEntregaPhase: endEntregaPhase2 } = await import("/mobile/js/chunks/clinical-entrega-CKPZGXS4.js");
      endEntregaPhase2();
      window.dispatchEvent(new CustomEvent("guardia:entrega-ended"));
    })();
  });
  document.getElementById("roster-btn-confirm")?.addEventListener("click", () => {
    void (async () => {
      if (!rosterHasSavedEntregas(guardiasMap)) {
        const proceed = window.confirm(
          "No hay entregas guardadas con signos vitales ni estudios.\n\nLos internos (MIP) solo ven pacientes entregados al R1 de guardia. Abre cada paciente, configura signos (y procedimientos si aplica) y pulsa Guardar entrega.\n\n\xBFIniciar turno activo de todos modos?"
        );
        if (!proceed) return;
      }
      closeEntregaRosterPanel();
      const { endEntregaPhase: endEntregaPhase2 } = await import("/mobile/js/chunks/clinical-entrega-CKPZGXS4.js");
      endEntregaPhase2();
      activateTurnoActivo();
      window.dispatchEvent(new CustomEvent("guardia:turno-activo"));
    })();
  });
}
function rosterScopePatients(guardiasMap) {
  const basePatients = patients.filter((p) => p && p.id && !p.isDemo && !p.archived);
  const scopeContext = clinicalSessionContext.scopeContext || getClinicalScopeContextForEvaluate() || {};
  const scoped = filterPatientsForGuardiaCensus(
    basePatients,
    clinicalSessionContext.user,
    scopeContext,
    guardiasMap,
    elevatedPatientFilters
  );
  return sortPatientsByPriorityThenBed(
    scoped.map((p) => ({ ...mapPatientForGuardiaGrid(p), _raw: p })),
    guardiasMap
  );
}
async function openEntregaRosterPanel(settings) {
  await refreshGuardiaCensusFromDb(settings);
  const host = ensureRosterHost();
  document.documentElement.classList.add("guardia-entrega-roster-open");
  const guardiasMap = clinicalSessionContext.guardiasMap;
  const censusPatients = rosterScopePatients(guardiasMap);
  const critical = censusPatients.filter(
    (p) => patientClinicalPriorityRank(p, guardiasMap.get(p.id)) < 2
  );
  const stable = censusPatients.filter(
    (p) => patientClinicalPriorityRank(p, guardiasMap.get(p.id)) >= 2
  );
  host.innerHTML = buildRosterPanelHtml(censusPatients, critical, stable, guardiasMap);
  const rosterPatientIds = censusPatients.map((p) => String(p.id));
  wireRosterRows(host, guardiasMap, rosterPatientIds, settings);
  wireRosterFooter(guardiasMap);
}
function closeEntregaRosterPanel() {
  const host = document.getElementById(PANEL_ID);
  if (host) host.innerHTML = "";
  host?.removeAttribute("style");
  document.documentElement.classList.remove("guardia-entrega-roster-open");
}
function activateTurnoActivo() {
  try {
    localStorage.setItem("guardia.turnoActive", "1");
    if (!localStorage.getItem(TURNO_STARTED_KEY)) {
      localStorage.setItem(TURNO_STARTED_KEY, (/* @__PURE__ */ new Date()).toISOString());
    }
  } catch {
  }
}
function deactivateTurnoActivo() {
  try {
    localStorage.removeItem("guardia.turnoActive");
    localStorage.removeItem(TURNO_STARTED_KEY);
  } catch {
  }
}
function getTurnoStartedAt() {
  try {
    const raw = localStorage.getItem(TURNO_STARTED_KEY);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
function isTurnoActivo() {
  try {
    return !!localStorage.getItem("guardia.turnoActive");
  } catch {
    return false;
  }
}

// public/js/features/clinical-entrega/clinical-entrega-phase-helpers.mjs
function activatorIsEntregaShiftReceiver(opts, userId, rank, teams, now, salaGuardiaToday) {
  return !!userId && (opts.guardiaActivated || opts.guardiaMode || userIsOnGuardiaCallToday(userId, rank, teams, now, salaGuardiaToday));
}
function buildActivatorCoveringPayload(userId, teams, users, sala, now, salaGuardiaToday) {
  const onCall = salaOnCallR1(teams, sala, now, salaGuardiaToday);
  const teamRow = onCall.find((r) => String(r.user_id) === userId);
  const joined = getJoinedTeams(teams, userId);
  const teamInSala = joined.find((t) => String(t.sala || "") === sala) || joined[0];
  const u = normalizeUsers(users).find((x) => x.user_id === userId);
  return {
    coveringUserId: userId,
    teamId: String(teamRow?.team_id || teamInSala?.team_id || ""),
    sala,
    coveringLabel: u ? userOptionLabel(u) : userId
  };
}
function resolveActivatorEntregaCovering(opts) {
  const userId = String(opts.userId || "");
  const teams = opts.teams || [];
  const users = opts.users || [];
  const sala = String(opts.sala || "").trim();
  const salaGuardiaToday = opts.salaGuardiaToday || [];
  const rank = String(opts.rank || effectiveClinicalRank(clinicalSessionContext.user) || "R1");
  const now = opts.now ? new Date(opts.now) : /* @__PURE__ */ new Date();
  if (!activatorIsEntregaShiftReceiver(opts, userId, rank, teams, now, salaGuardiaToday)) {
    return null;
  }
  return buildActivatorCoveringPayload(userId, teams, users, sala, now, salaGuardiaToday);
}

// public/js/features/clinical-entrega/clinical-entrega-phase.mjs
function resolveR1GuardiaCovering(teams, users, sala, now = /* @__PURE__ */ new Date(), salaGuardiaToday = [], preferredUserId = "") {
  const salaNorm = String(sala || "").trim();
  if (!salaNorm) return null;
  const onCall = salaOnCallR1(teams, salaNorm, now, salaGuardiaToday);
  if (!onCall.length) return null;
  const pref = String(preferredUserId || "");
  const pick2 = pref && onCall.find((r) => String(r.user_id) === pref) || onCall[0];
  const u = normalizeUsers(users).find((x) => x.user_id === String(pick2.user_id));
  return {
    coveringUserId: String(pick2.user_id),
    teamId: String(pick2.team_id || ""),
    sala: salaNorm,
    coveringLabel: u ? userOptionLabel(u) : String(pick2.user_id)
  };
}
function resolveEntregaPhaseCovering(opts) {
  const activatorCovering = resolveActivatorEntregaCovering(opts);
  if (activatorCovering) return activatorCovering;
  const userId = String(opts.userId || "");
  const teams = opts.teams || [];
  const users = opts.users || [];
  const sala = String(opts.sala || "").trim();
  const salaGuardiaToday = opts.salaGuardiaToday || [];
  const now = opts.now ? new Date(opts.now) : /* @__PURE__ */ new Date();
  return resolveR1GuardiaCovering(teams, users, sala, now, salaGuardiaToday, userId);
}
function resolveUserSalaForEntrega(teams, userId) {
  const fromProfile = String(clinicalSessionContext.user?.sala || "").trim();
  if (fromProfile) return fromProfile;
  const joined = getJoinedTeams(teams || [], userId);
  for (const t of joined) {
    const sala = String(t.sala || "").trim();
    if (sala) return sala;
  }
  return "";
}
function getEntregaPhase() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ENTREGA_PHASE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.active) return o;
  } catch (_e) {
    void _e;
  }
  return null;
}
function isEntregaPhaseActive() {
  return !!getEntregaPhase()?.active;
}
function getEntregaPhaseCoveringUserId() {
  return String(getEntregaPhase()?.coveringUserId || "");
}
function startEntregaPhase(covering) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(GUARDIA_GRID_MODE_KEY);
    localStorage.setItem(
      ENTREGA_PHASE_KEY,
      JSON.stringify({
        active: true,
        coveringUserId: String(covering.coveringUserId || ""),
        sala: String(covering.sala || ""),
        coveringLabel: String(covering.coveringLabel || ""),
        teamId: String(covering.teamId || ""),
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  } catch {
  }
}
function endEntregaPhase() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(ENTREGA_PHASE_KEY);
    localStorage.removeItem(GUARDIA_GRID_MODE_KEY);
  } catch (_e) {
    void _e;
  }
}
function endEntregaPhaseFlow(opts = {}) {
  endEntregaPhase();
  closeEntregaRosterPanel();
  setEntregaToolbarStatus("");
  toast4("Fase de entrega finalizada.", "info");
  opts.renderGuardiaBoard?.(opts.settings);
  return { active: false };
}
async function prepareEntregaPhaseCovering_(_opts) {
  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const userId = String(clinicalSessionContext.user?.user_id || "");
  const sala = resolveUserSalaForEntrega(teams, userId);
  if (!sala) {
    const msg = "Indica tu Sala en el perfil cl\xEDnico o \xFAnete a un equipo de Sala.";
    setEntregaToolbarStatus(msg, true);
    toast4(msg, "error");
    return null;
  }
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    teams,
    ctx.salaGuardiaToday || clinicalSessionContext.salaGuardiaToday || []
  );
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const guardiaProceed = await ensureGuardiaHoyBeforeEntrega({
    teams,
    sala,
    userId,
    rank,
    salaGuardiaToday
  });
  if (!guardiaProceed?.proceed) return null;
  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const freshTeams = clinicalSessionContext.teams || teams;
  const freshSalaGuardia = mergeSalaGuardiaTodayRows(
    freshTeams,
    clinicalSessionContext.salaGuardiaToday || ctx.salaGuardiaToday || []
  );
  const covering = resolveEntregaPhaseCovering({
    userId,
    rank,
    users,
    teams: freshTeams,
    sala,
    salaGuardiaToday: freshSalaGuardia,
    guardiaActivated: !!guardiaProceed.activated,
    guardiaMode: !!clinicalSessionContext.guardiaMode
  });
  return { sala, covering };
}
async function beginEntregaPhaseFlow(opts = {}) {
  const prepared = await prepareEntregaPhaseCovering_(opts);
  if (!prepared) return { active: false };
  startEntregaPhase(
    prepared.covering || {
      coveringUserId: "",
      teamId: "",
      sala: prepared.sala,
      coveringLabel: ""
    }
  );
  setEntregaToolbarStatus("");
  openEntregaRosterPanel(opts.settings);
  opts.renderGuardiaBoard?.(opts.settings);
  return { active: true, covering: prepared.covering || null };
}
function toggleEntregaPhase(opts = {}) {
  const wantsExit = opts.exit === true;
  if (isEntregaPhaseActive()) {
    if (wantsExit && isEntregaRosterOpen()) {
      return endEntregaPhaseFlow(opts);
    }
    if (!isEntregaRosterOpen()) {
      openEntregaRosterPanel(opts.settings);
      opts.renderGuardiaBoard?.(opts.settings);
      return { active: true, resumed: true };
    }
    if (wantsExit) {
      return endEntregaPhaseFlow(opts);
    }
  }
  return beginEntregaPhaseFlow(opts);
}
function loadGuardiaGridViewContext() {
  if (isEntregaPhaseActive()) return "HANDOFF";
  try {
    const mode = String(localStorage.getItem(GUARDIA_GRID_MODE_KEY) || "censo").toLowerCase();
    if (mode === "entrega") return "HANDOFF";
  } catch (_e) {
    void _e;
  }
  return "GUARDIA";
}
function saveGuardiaGridMode(mode) {
  if (mode === "entrega") {
    toggleEntregaPhase();
    return;
  }
  endEntregaPhase();
}

// public/js/features/clinical-entrega/clinical-entrega-submit-helpers.mjs
function resolveEntregaFormCoveringUserId(patientId, existing) {
  const phaseCovering = getEntregaPhaseCoveringUserId();
  return String(
    document.getElementById("entrega-covering-user")?.value || phaseCovering || existing?.covering_user_id || ""
  );
}
function resolveEntregaFormSourceTeamId(patientId, existing, _coveringUserId) {
  const scopeCtx = getClinicalScopeContextForEvaluate();
  const teamsForSubmit = clinicalSessionContext.teams || scopeCtx.teams || [];
  const assignmentsForSubmit = scopeCtx.assignments || [];
  return String(document.getElementById("entrega-source-team")?.value || "") || resolveEntregaSourceTeamId(
    patientId,
    resolveEntregaPatientRow(patientId),
    teamsForSubmit,
    assignmentsForSubmit,
    existing,
    String(clinicalSessionContext.user?.user_id || "")
  );
}
function buildEntregaSubmitPayload(patientId, guardiaId, existing) {
  const coveringUserId = resolveEntregaFormCoveringUserId(patientId, existing);
  const sourceTeamId = resolveEntregaFormSourceTeamId(patientId, existing, coveringUserId);
  const patientCensus = buildEntregaPatientCensus(resolveEntregaPatientRow(patientId));
  const vitalsPlan = readEntregaVitalsPlan();
  const handoffContext = readEntregaHandoffContext();
  const pendientesJson = serializePendientesJson({
    version: 2,
    vitalsPlan,
    handoffContext,
    ...patientCensus ? { patientCensus } : {},
    items: getEntregaDraftItems()
  });
  return {
    patientId,
    guardiaId,
    coveringUserId,
    sourceTeamId,
    isCritical: readEntregaCriticalFromHandoff(),
    pendientesJson,
    vitalsFrequency: vitalsFrequencyForDb(vitalsPlan.frequency)
  };
}

// public/js/features/clinical-entrega/clinical-entrega-submit.mjs
async function syncEntregaLanAfterSave_(_patientId) {
  try {
    await pushCloudClinicalOpsNow();
    scheduleCloudSyncPush();
  } catch {
  }
}
async function submitEntregaAssignment(payload) {
  const api2 = dbApi5();
  if (!api2 || typeof api2.dbGuardiaUpsert !== "function") {
    throw new Error("Base cl\xEDnica no disponible");
  }
  const patientId = String(payload.patientId || "");
  const deltaData = {
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    isCritical: !!payload.isCritical,
    pendientesJson: payload.pendientesJson || "[]",
    vitalsFrequency: payload.vitalsFrequency || "None"
  };
  await signOutgoingLiveSyncMutation(
    { patientId, entityId: patientId, data: deltaData, op: "entrega.assign" },
    "entrega.assign"
  );
  const res = await api2.dbGuardiaUpsert({
    patientId,
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    guardiaId: payload.guardiaId,
    isCritical: payload.isCritical ? 1 : 0,
    pendientesJson: payload.pendientesJson || "[]",
    vitalsFrequency: payload.vitalsFrequency || "None"
  });
  if (!res || res.ok === false) {
    throw new Error(res?.error || "No se guard\xF3 la entrega");
  }
  await syncEntregaLanAfterSave_(patientId);
  return res.guardia;
}
function collectEntregaFormPayload(form) {
  if (!form) return { ok: false, error: "Formulario de entrega no disponible" };
  const patientId = String(form.dataset.patientId || "");
  if (!patientId) return { ok: false, error: "Paciente no seleccionado" };
  const guardiaId = form.dataset.guardiaId ? String(form.dataset.guardiaId) : void 0;
  const existingGuardia = guardiaId ? clinicalSessionContext.guardias.find((g) => String(g.guardia_id) === guardiaId) : clinicalSessionContext.guardiasMap.get(patientId);
  const payload = buildEntregaSubmitPayload(patientId, guardiaId, existingGuardia);
  if (!payload.coveringUserId || !payload.sourceTeamId) {
    return { ok: false, error: "Selecciona R1 de guardia y equipo del paciente." };
  }
  return { ok: true, payload };
}
async function persistEntregaFormState(form, opts = {}) {
  const collected = collectEntregaFormPayload(form);
  if (!collected.ok) return collected;
  try {
    const guardia = await submitEntregaAssignment(collected.payload);
    if (guardia?.guardia_id && form) {
      form.dataset.guardiaId = String(guardia.guardia_id);
    }
    await refreshGuardiaCensusFromDb(null);
    import("/mobile/js/chunks/mutation-registry-stub-GZ4P7S3G.js").then(function(m) {
      m.lanMutationRegistry.dispatchLanMutation("entrega", collected.payload.patientId);
    });
    if (!opts.silent) toast4("Entrega registrada.", "success");
    return { ok: true, guardia };
  } catch (err) {
    const error = err?.message || "Error al registrar entrega";
    if (!opts.silent) toast4(error, "error");
    return { ok: false, error };
  }
}

// public/js/features/clinical-entrega/clinical-entrega-modal.mjs
var entregaFormWired = false;
var entregaNavBusy = false;
function wireEntregaFormOnce() {
  if (entregaFormWired) return;
  entregaFormWired = true;
  const form = document.getElementById("entrega-form");
  const cancelBtn = document.getElementById("btn-entrega-cancel");
  const bd = entregaModalEl();
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeEntregaModal());
  if (bd) {
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) closeEntregaModal();
    });
  }
  const navPrev = document.getElementById("entrega-nav-prev");
  const navNext = document.getElementById("entrega-nav-next");
  const navigateRosterPatient = async (delta) => {
    if (entregaNavBusy) return;
    const entregaForm = document.getElementById("entrega-form");
    const ids = entregaForm?._entregaRosterIds;
    const idx = entregaForm?._entregaPatientIndex;
    if (!ids?.length || !Number.isFinite(idx)) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= ids.length) return;
    entregaNavBusy = true;
    try {
      const saved = await persistEntregaFormState(entregaForm, { silent: true });
      if (!saved.ok) {
        toast4(saved.error || "Completa R1 y equipo antes de cambiar de paciente.", "error");
        return;
      }
      openEntregaModal({
        patientId: String(ids[nextIdx]),
        patientIndex: nextIdx,
        patientTotal: ids.length,
        rosterPatientIds: ids,
        onConfirm: entregaForm._entregaOnConfirm
      });
    } finally {
      entregaNavBusy = false;
    }
  };
  navPrev?.addEventListener("click", () => void navigateRosterPatient(-1));
  navNext?.addEventListener("click", () => void navigateRosterPatient(1));
  if (!form) return;
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const rosterMode = Array.isArray(form._entregaRosterIds) && form._entregaRosterIds.length > 0;
    const saved = await persistEntregaFormState(form, { silent: rosterMode });
    if (!saved.ok) return;
    if (rosterMode) {
      toast4("Paciente guardado.", "success");
      return;
    }
    const onConfirm = form._entregaOnConfirm;
    closeEntregaModal();
    if (typeof onConfirm === "function") onConfirm();
  });
}
function openEntregaModal(opts) {
  void openEntregaModalAsync(opts);
}
function populateEntregaNavNameDx_(opts, patient) {
  const navName = document.getElementById("entrega-modal-nav-name");
  const navDx = document.getElementById("entrega-modal-nav-dx");
  if (navName) {
    const bed = patient?.bed_label || patient?.bed || "\u2014";
    const name = String(patient?.name || "").trim();
    navName.textContent = name ? `${name} \xB7 Cama ${bed}` : "\u2014";
  }
  if (navDx) {
    navDx.textContent = patient ? String(patient.diagnosticosText || patient.service || "").toUpperCase() : "";
  }
}
function populateEntregaNavRoster_(opts, phaseActive) {
  const navCounter = document.getElementById("entrega-modal-nav-counter");
  const activeBadge = document.getElementById("entrega-modal-active-badge");
  const navPrev = document.getElementById("entrega-nav-prev");
  const navNext = document.getElementById("entrega-nav-next");
  if (navCounter) {
    const idx = opts?.patientIndex;
    const total = opts?.patientTotal;
    navCounter.textContent = Number.isFinite(idx) && Number.isFinite(total) && total > 0 ? `${idx + 1} de ${total}` : "";
  }
  if (activeBadge) activeBadge.classList.toggle("hidden", !phaseActive);
  const rosterIdx = Number.isFinite(opts?.patientIndex) ? opts.patientIndex : -1;
  const rosterTotal = Array.isArray(opts?.rosterPatientIds) ? opts.rosterPatientIds.length : 0;
  if (navPrev) navPrev.disabled = rosterIdx <= 0;
  if (navNext) navNext.disabled = rosterIdx < 0 || rosterIdx >= rosterTotal - 1;
}
function populateEntregaNavChrome_(opts, patient, phaseActive) {
  populateEntregaNavNameDx_(opts, patient);
  populateEntregaNavRoster_(opts, phaseActive);
}
function resolvePreferredEntregaCovering_(params) {
  const { existing, phaseCovering, teams, users, userId, rank, salaGuardiaToday } = params;
  let preferred = existing?.covering_user_id ? String(existing.covering_user_id) : phaseCovering || "";
  if (preferred || existing) return preferred;
  const salaForCover = resolveUserSalaForEntrega(teams, userId);
  const mergedGuardia = mergeSalaGuardiaTodayRows(teams, salaGuardiaToday);
  const phaseCoveringResolved = salaForCover && resolveEntregaPhaseCovering({
    userId,
    rank,
    users,
    teams,
    sala: salaForCover,
    salaGuardiaToday: mergedGuardia,
    guardiaActivated: false,
    guardiaMode: !!clinicalSessionContext.guardiaMode
  });
  if (phaseCoveringResolved?.coveringUserId === userId) return userId;
  return phaseCoveringResolved?.coveringUserId || preferred;
}
function buildEntregaCoveringState_(params) {
  const {
    existing,
    phase,
    phaseCovering,
    teams,
    users,
    userId,
    rank,
    salaGuardiaToday,
    salaDeficit
  } = params;
  const { targets, flow } = listEntregaTargets(rank, teams, users, salaDeficit, { currentUserId: userId });
  const hideR1Picker = !!(phase?.active && phaseCovering);
  const preferred = resolvePreferredEntregaCovering_({
    existing,
    phaseCovering,
    teams,
    users,
    userId,
    rank,
    salaGuardiaToday
  });
  let targetList = [...targets];
  for (const id of [preferred, phaseCovering]) {
    targetList = ensureEntregaTargetUser(targetList, users, id, phase?.coveringLabel || "");
  }
  const resolvedPreferred = preferred || targetList[0]?.user_id || "";
  return { targetList, flow, hideR1Picker, preferred: resolvedPreferred };
}
function populateEntregaCoveringSelect_(params) {
  const { targetList, preferred, hideR1Picker, phase } = params;
  const select = document.getElementById("entrega-covering-user");
  const coverHint = document.getElementById("entrega-covering-hint");
  if (!select) return;
  select.innerHTML = targetList.map((u) => `<option value="${u.user_id}">${userOptionLabel(u)}</option>`).join("");
  if (preferred) select.value = preferred;
  if (hideR1Picker) {
    select.disabled = true;
    select.removeAttribute("required");
    if (coverHint) {
      const label = phase?.coveringLabel || select.selectedOptions?.[0]?.textContent || "";
      coverHint.textContent = label ? `R1 de guardia de este turno: ${label}` : "R1 de guardia fijado al activar el turno.";
      coverHint.classList.remove("hidden");
    }
  } else {
    select.disabled = false;
    select.setAttribute("required", "");
    if (coverHint) {
      coverHint.textContent = "Residente de guardia que asumir\xE1 la cobertura nocturna de este paciente.";
    }
  }
}
async function populateEntregaSourceTeam_(params) {
  const { patientId, patientRow, teams, existing, userId } = params;
  const teamSelect = document.getElementById("entrega-source-team");
  const srcTeamHint = document.getElementById("entrega-source-team-hint");
  if (!teamSelect) return "";
  const scopeCtx = getClinicalScopeContextForEvaluate();
  const ctx = clinicalSessionContext.scopeContext || {};
  const assignments = scopeCtx.assignments || ctx.assignments || [];
  const censusTeamId = await lookupEntregaCensusTeamId(
    patientId,
    patientRow,
    teams,
    assignments,
    scopeCtx.now || /* @__PURE__ */ new Date()
  );
  const hasCensusAssignment = !!censusTeamId;
  const hasExistingSourceTeam = !!existing?.source_team_id;
  const srcTeamId = resolveEntregaSourceTeamId(
    patientId,
    patientRow,
    teams,
    assignments,
    existing,
    userId
  );
  const teamHintText = entregaSourceTeamHint({ hasCensusAssignment, hasExistingSourceTeam });
  const srcTeam = findEntregaTeamById(srcTeamId, teams);
  const censusLabel = srcTeam ? entregaTeamOptionLabel(srcTeam) : srcTeamId ? teamLabelById(srcTeamId) : "";
  if (hasCensusAssignment && srcTeamId && censusLabel) {
    teamSelect.innerHTML = `<option value="${srcTeamId}">${censusLabel}</option>`;
    teamSelect.value = String(srcTeamId);
    teamSelect.disabled = true;
    teamSelect.removeAttribute("required");
  } else {
    const teamOptions = entregaSourceTeamSelectOptions(
      srcTeamId,
      teams,
      userId,
      clinicalSessionContext.user
    );
    teamSelect.innerHTML = teamOptions.map((t) => `<option value="${t.team_id}">${entregaTeamOptionLabel(t)}</option>`).join("");
    teamSelect.disabled = false;
    teamSelect.setAttribute("required", "");
    if (srcTeamId) teamSelect.value = srcTeamId;
  }
  if (srcTeamHint) {
    srcTeamHint.textContent = teamHintText;
    srcTeamHint.classList.remove("hidden");
  }
  return srcTeamId;
}
function populateEntregaFlowHint_(flow) {
  const hint = document.getElementById("entrega-flow-hint");
  if (!hint) return;
  const flowLabels = {
    r2: "R2: mismo servicio, R4, o cubridores Sala en d\xE9ficit.",
    r2_handoff: "R2: selecciona R4 de Sala y R2 de guardia (dos entregas separadas).",
    r3_suggest: "R3: sugeridos por d\xEDa de guardia del equipo (confirma).",
    generic: "Cualquier usuario registrado."
  };
  if (flow === "r1") {
    hint.textContent = "";
    hint.hidden = true;
    return;
  }
  hint.textContent = flowLabels[flow] || flowLabels.generic;
  hint.hidden = false;
}
function setEntregaModalTitle_(existing, guardiaId, actor) {
  const title = document.getElementById("entrega-modal-title");
  if (!title) return;
  if (guardiaId || existing?.guardia_id) {
    title.textContent = actor.role === "guardia" ? "Pendientes de guardia" : "Actualizar entrega";
  } else if (clinicalSessionContext.guardiaMode) {
    title.textContent = "Entrega / pendientes";
  } else {
    title.textContent = "Nueva entrega";
  }
}
function showEntregaModal_(bd, hideR1Picker, teamSelect, select) {
  const coverHint = document.getElementById("entrega-covering-hint");
  if (coverHint) coverHint.classList.toggle("hidden", !coverHint.textContent?.trim());
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  if (hideR1Picker) teamSelect?.focus();
  else select?.focus();
}
async function finalizeEntregaModalOpen_(params) {
  const { bd, existing, guardiaId, patientRow, srcTeamId, hideR1Picker, teamSelect, select } = params;
  const actor = resolveEntregaActorRole(clinicalSessionContext.user, existing);
  await mountEntregaPendientesUi({
    actor,
    pendientesJson: existing?.pendientes_json,
    sourceTeamId: srcTeamId,
    vitalsFrequency: existing?.vitals_frequency,
    isCritical: !!existing?.is_critical,
    signedRefusal: !!Number(patientRow?.negativa_maniobras_firmada)
  });
  setEntregaModalTitle_(existing, guardiaId, actor);
  showEntregaModal_(bd, hideR1Picker, teamSelect, select);
}
async function guardEntregaPatientSwitch_(bd, form, patientId) {
  const priorPatientId = String(form.dataset.patientId || "");
  const switchingPatient = bd.classList.contains("open") && priorPatientId && patientId && priorPatientId !== patientId && Array.isArray(form._entregaRosterIds) && form._entregaRosterIds.length > 0;
  if (!switchingPatient) return true;
  const saved = await persistEntregaFormState(form, { silent: true });
  if (saved.ok) return true;
  toast4(saved.error || "Completa R1 y equipo antes de cambiar de paciente.", "error");
  return false;
}
function bindEntregaFormDataset_(form, opts, patientId, guardiaId) {
  form.dataset.patientId = patientId;
  if (guardiaId) form.dataset.guardiaId = guardiaId;
  else delete form.dataset.guardiaId;
  form._entregaOnConfirm = typeof opts?.onConfirm === "function" ? opts.onConfirm : null;
  form._entregaRosterIds = Array.isArray(opts?.rosterPatientIds) ? opts.rosterPatientIds.slice() : null;
  form._entregaPatientIndex = Number.isFinite(opts?.patientIndex) ? opts.patientIndex : null;
}
async function loadEntregaModalContext_(opts) {
  await refreshGuardiaCensusFromDb(null);
  await fetchClinicalScopeContextFromDb();
  const patientId = String(opts?.patientId || "");
  const guardiaId = opts?.guardiaId ? String(opts.guardiaId) : "";
  const existing = guardiaId ? clinicalSessionContext.guardias.find((g) => String(g.guardia_id) === guardiaId) : clinicalSessionContext.guardiasMap.get(patientId);
  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const salaGuardiaToday = Array.isArray(ctx.salaGuardiaToday) ? ctx.salaGuardiaToday : [];
  const userId = String(clinicalSessionContext.user?.user_id || "");
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const salaDeficit = computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, userId, /* @__PURE__ */ new Date());
  const phase = getEntregaPhase();
  const phaseCovering = getEntregaPhaseCoveringUserId();
  const coveringState = buildEntregaCoveringState_({
    existing,
    phase,
    phaseCovering,
    teams,
    users,
    userId,
    rank,
    salaGuardiaToday,
    salaDeficit
  });
  return {
    patientId,
    guardiaId,
    existing,
    teams,
    userId,
    coveringState,
    patient: resolveEntregaPatientRow(patientId)
  };
}
async function openEntregaModalAsync(opts) {
  wireEntregaFormOnce();
  const bd = entregaModalEl();
  const form = document.getElementById("entrega-form");
  if (!bd || !form) return;
  const patientId = String(opts?.patientId || "");
  if (!await guardEntregaPatientSwitch_(bd, form, patientId)) return;
  const modalCtx = await loadEntregaModalContext_(opts);
  bindEntregaFormDataset_(form, opts, modalCtx.patientId, modalCtx.guardiaId);
  populateEntregaNavChrome_(opts, modalCtx.patient, !!getEntregaPhase()?.active);
  const { targetList, flow, hideR1Picker, preferred } = modalCtx.coveringState;
  form.querySelector(".entrega-top-strip")?.classList.toggle("entrega-top-strip--phase-covering-set", hideR1Picker);
  populateEntregaCoveringSelect_({ targetList, preferred, hideR1Picker, phase: getEntregaPhase() });
  const patientRow = modalCtx.patient || resolveEntregaPatientRow(modalCtx.patientId);
  const srcTeamId = await populateEntregaSourceTeam_({
    patientId: modalCtx.patientId,
    patientRow,
    teams: modalCtx.teams,
    existing: modalCtx.existing,
    userId: modalCtx.userId
  });
  populateEntregaFlowHint_(flow);
  await finalizeEntregaModalOpen_({
    bd,
    form,
    existing: modalCtx.existing,
    guardiaId: modalCtx.guardiaId,
    patientRow,
    srcTeamId,
    hideR1Picker,
    teamSelect: document.getElementById("entrega-source-team"),
    select: document.getElementById("entrega-covering-user")
  });
}
function closeEntregaModal() {
  const bd = entregaModalEl();
  if (!bd) return;
  closeModalAnimated(bd, function() {
    resetEntregaModalUi();
    const form = document.getElementById("entrega-form");
    if (form) form._entregaOnConfirm = null;
  });
}

// public/js/features/clinical-entrega.mjs
function resolveEntregaActorRole2(currentUser, existingGuardia) {
  return resolveEntregaActorRole(currentUser, existingGuardia);
}

// public/js/features/guardia-fin-turno-model.mjs
function patientLabelForFinTurno(patient, patientId) {
  var id = String(patientId || "").trim();
  if (!patient || typeof patient !== "object") {
    return id ? "Paciente " + id.slice(0, 8) : "Paciente";
  }
  var bed = [patient.cuarto, patient.cama].filter(Boolean).join("-");
  if (!bed && patient.bed_label) bed = String(patient.bed_label).trim();
  var name = String(patient.name || patient.nombre || "").trim();
  var label = [bed, name].filter(Boolean).join(" \xB7 ");
  return label || (id ? "Paciente " + id.slice(0, 8) : "Paciente");
}
function indexPatientsById(patients2) {
  var patientById = /* @__PURE__ */ new Map();
  (patients2 || []).forEach(function(p) {
    if (!p || typeof p !== "object" || !/** @type {any} */
    p.id) return;
    patientById.set(
      String(
        /** @type {any} */
        p.id
      ),
      /** @type {any} */
      p
    );
  });
  return patientById;
}
function emptyFinTurnoGroup(labelFn, sourceTeamId) {
  var tid = String(sourceTeamId || "").trim();
  return {
    sourceTeamId: tid,
    teamLabel: tid ? labelFn(tid) || "Equipo" : "Sin equipo / otros",
    openCount: 0,
    patients: (
      /** @type {any[]} */
      []
    )
  };
}
function openCoveringPayload(g, coveringUserId) {
  if (String(g.status || "Active") !== "Active") return null;
  if (coveringUserId && String(g.covering_user_id || "") !== coveringUserId) return null;
  var items = listActiveProcedimientos(normalizePendientesJson(g.pendientes_json));
  if (!items.length) return null;
  var patientId = String(g.patient_id || "").trim();
  if (!patientId) return null;
  return {
    patientId,
    guardiaId: String(g.guardia_id || "").trim(),
    sourceTeamId: String(g.source_team_id || "").trim(),
    items
  };
}
function appendOpenCovering(groups, labelFn, patientById, g, coveringUserId) {
  var payload = openCoveringPayload(g, coveringUserId);
  if (!payload) return;
  var key = payload.sourceTeamId || "__none__";
  var group = groups.get(key);
  if (!group) {
    group = emptyFinTurnoGroup(labelFn, payload.sourceTeamId);
    groups.set(key, group);
  }
  group.patients.push({
    patientId: payload.patientId,
    guardiaId: payload.guardiaId,
    patientLabel: patientLabelForFinTurno(patientById.get(payload.patientId) || null, payload.patientId),
    itemLabels: payload.items.map(function(it) {
      return String(
        /** @type {any} */
        it.label || ""
      ).trim();
    }).filter(Boolean)
  });
  group.openCount += payload.items.length;
}
function collectOpenPendientesBySourceTeam(guardias, patients2, opts) {
  var coveringUserId = String(opts && opts.coveringUserId || "").trim();
  var labelFn = opts && typeof opts.teamLabelById === "function" ? opts.teamLabelById : function(id) {
    return id ? "Equipo " + String(id).slice(0, 8) : "Sin equipo / otros";
  };
  var patientById = indexPatientsById(patients2);
  var groups = /* @__PURE__ */ new Map();
  (guardias || []).forEach(function(g) {
    if (!g || typeof g !== "object") return;
    appendOpenCovering(
      groups,
      labelFn,
      patientById,
      /** @type {any} */
      g,
      coveringUserId
    );
  });
  return Array.from(groups.values()).sort(function(a, b) {
    if (a.sourceTeamId && !b.sourceTeamId) return -1;
    if (!a.sourceTeamId && b.sourceTeamId) return 1;
    return String(a.teamLabel).localeCompare(String(b.teamLabel), "es");
  });
}
function summarizeFinTurnoGroups(groups) {
  var list = Array.isArray(groups) ? groups : [];
  var openCount = 0;
  for (var i = 0; i < list.length; i++) openCount += Number(list[i].openCount) || 0;
  return { openCount, teamCount: list.length };
}
async function resolveGuardiasForSourceTeam(group, deps) {
  var patients2 = group && group.patients || [];
  var resolveOne = deps && deps.resolveOne;
  if (typeof resolveOne !== "function") {
    return { resolved: 0, total: patients2.length, failed: patients2.length };
  }
  var resolved = 0;
  var failed = 0;
  for (var i = 0; i < patients2.length; i++) {
    var row = patients2[i];
    try {
      var res = await resolveOne({
        patientId: row.patientId,
        guardiaId: row.guardiaId
      });
      if (res && res.ok !== false && res.resolved) resolved += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { resolved, total: patients2.length, failed };
}

// public/js/features/guardia-fin-turno-html.mjs
function buildFinTurnoSheetHtml(groups) {
  var summary = summarizeFinTurnoGroups(groups);
  var lead = summary.openCount + " pendiente" + (summary.openCount === 1 ? "" : "s") + " abierto" + (summary.openCount === 1 ? "" : "s") + " \xB7 " + summary.teamCount + " equipo" + (summary.teamCount === 1 ? "" : "s");
  var rows = (groups || []).map(function(g) {
    var metaParts = [];
    (g.patients || []).forEach(function(p) {
      var items = (p.itemLabels || []).join(", ") || "estudio abierto";
      metaParts.push(escapeHtml(p.patientLabel) + " \xB7 " + escapeHtml(items));
    });
    var teamKey = g.sourceTeamId || "__none__";
    return '<li class="guardia-fin-turno-row"><div class="guardia-fin-turno-row-main"><strong class="guardia-fin-turno-team">' + escapeHtml(g.teamLabel) + '</strong><span class="guardia-fin-turno-meta">' + metaParts.join("<br>") + '</span></div><button type="button" class="btn-med-primary guardia-fin-turno-send" data-source-team="' + escapeHtml(teamKey) + '">Enviar ' + g.openCount + "</button></li>";
  }).join("");
  return '<p class="guardia-fin-turno-lead">' + escapeHtml(lead) + '</p><p class="guardia-fin-turno-hint">Env\xEDa a los equipos de origen (handoff diurno) para liberar la cobertura. El reloj del turno ya se apag\xF3; los pendientes no se borran solos.</p><ul class="guardia-fin-turno-list">' + rows + "</ul>";
}

// public/js/features/guardia-fin-turno-modal.mjs
var wired2 = false;
function toast6(msg, type) {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type || "info");
  }
}
function backdropEl2() {
  return typeof document !== "undefined" ? document.getElementById("guardia-fin-turno-backdrop") : null;
}
function bodyEl() {
  return typeof document !== "undefined" ? document.getElementById("guardia-fin-turno-body") : null;
}
function dbApi7() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}
function closeFinTurnoSheet() {
  var bd = backdropEl2();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  bd._rpcFinTurnoGroups = null;
  var body = bodyEl();
  if (body) body.innerHTML = "";
}
function openFinTurnoSheet(groups, opts) {
  wireFinTurnoSheet();
  var bd = backdropEl2();
  var body = bodyEl();
  if (!bd || !body) {
    toast6("No se pudo abrir el cierre de guardia.", "error");
    return false;
  }
  bd._rpcFinTurnoGroups = groups;
  bd._rpcFinTurnoSettings = opts && opts.settings != null ? opts.settings : null;
  body.innerHTML = buildFinTurnoSheetHtml(groups);
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  return true;
}
async function sendGroupByTeamKey(teamKey, settings) {
  var bd = backdropEl2();
  var groups = bd && bd._rpcFinTurnoGroups || [];
  var group = groups.find(function(g) {
    var key = g.sourceTeamId || "__none__";
    return key === teamKey;
  });
  if (!group) return;
  var api2 = dbApi7();
  if (!api2 || typeof api2.dbGuardiaResolve !== "function") {
    toast6("Base cl\xEDnica no disponible.", "error");
    return;
  }
  var result = await resolveGuardiasForSourceTeam(group, {
    resolveOne: function(opts) {
      return api2.dbGuardiaResolve(opts);
    }
  });
  try {
    await pushCloudClinicalOpsNow();
  } catch {
  }
  await refreshGuardiaCensusFromDb(settings);
  if (result.resolved > 0) {
    toast6(
      result.resolved === 1 ? "1 cobertura enviada al equipo de origen." : result.resolved + " coberturas enviadas al equipo de origen.",
      "success"
    );
  }
  if (result.failed > 0) {
    toast6("No se pudieron enviar " + result.failed + ".", "warn");
  }
  var uid = String(clinicalSessionContext.user?.user_id || "");
  var next = collectOpenPendientesBySourceTeam(
    clinicalSessionContext.guardias || [],
    patients,
    { coveringUserId: uid, teamLabelById }
  );
  if (!next.length) {
    closeFinTurnoSheet();
    return;
  }
  openFinTurnoSheet(next, { settings });
}
function wireFinTurnoSheet() {
  if (wired2 || typeof document === "undefined") return;
  var bd = backdropEl2();
  if (!bd) return;
  wired2 = true;
  bd.addEventListener("click", function(ev) {
    if (ev.target === bd) closeFinTurnoSheet();
  });
  document.addEventListener("click", function(ev) {
    var t = ev.target;
    if (!t || typeof t.closest !== "function") return;
    if (t.closest("#guardia-fin-turno-dismiss") || t.closest("#guardia-fin-turno-cancel")) {
      ev.preventDefault();
      closeFinTurnoSheet();
      return;
    }
    var sendBtn = t.closest(".guardia-fin-turno-send");
    if (sendBtn && bd.classList.contains("open")) {
      ev.preventDefault();
      var key = String(sendBtn.getAttribute("data-source-team") || "");
      var settings = bd._rpcFinTurnoSettings;
      sendBtn.disabled = true;
      void sendGroupByTeamKey(key, settings).finally(function() {
        sendBtn.disabled = false;
      });
    }
  });
}
function finalizeGuardiaTurno(callbacks) {
  var uid = String(clinicalSessionContext.user?.user_id || "");
  var groups = collectOpenPendientesBySourceTeam(
    clinicalSessionContext.guardias || [],
    patients,
    { coveringUserId: uid, teamLabelById }
  );
  deactivateTurnoActivo();
  if (typeof callbacks?.stopTurnoClock === "function") callbacks.stopTurnoClock();
  callbacks?.renderGuardiaBoard?.(callbacks.settings);
  if (!groups.length) {
    toast6("Turno finalizado.", "success");
    return { openedSheet: false, groups };
  }
  openFinTurnoSheet(groups, { settings: callbacks?.settings });
  return { openedSheet: true, groups };
}

// public/js/features/guardia-phase-bar.mjs
var CLOCK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
var LIVE_SVG = `<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>`;
var clockTimer = null;
function formatTurnoElapsed(startedAt) {
  if (!startedAt) return "\u2014";
  const mins = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 6e4));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function stopTurnoClock() {
  if (clockTimer != null) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}
function startTurnoClock(clockEl) {
  stopTurnoClock();
  if (!clockEl) return;
  const tick = () => {
    clockEl.textContent = formatTurnoElapsed(getTurnoStartedAt());
  };
  tick();
  clockTimer = window.setInterval(tick, 3e4);
}
var phaseBarWired = false;
function wireGuardiaPhaseBar(callbacks) {
  if (phaseBarWired || typeof document === "undefined") return;
  phaseBarWired = true;
  document.addEventListener("click", (ev) => {
    const startTurnoBtn = ev.target?.closest?.("#guardia-btn-iniciar-turno");
    if (startTurnoBtn) {
      ev.preventDefault();
      activateTurnoActivo();
      window.dispatchEvent(new CustomEvent("guardia:turno-activo"));
      return;
    }
    const endTurnoBtn = ev.target?.closest?.("#guardia-btn-finalizar-turno");
    if (endTurnoBtn) {
      ev.preventDefault();
      finalizeGuardiaTurno({
        settings: callbacks.settings,
        renderGuardiaBoard: callbacks.renderGuardiaBoard,
        stopTurnoClock
      });
      return;
    }
    const entregaBtn = ev.target?.closest?.("#guardia-btn-iniciar-entrega");
    if (entregaBtn) {
      ev.preventDefault();
      if (typeof callbacks.onBeginEntrega === "function") {
        void callbacks.onBeginEntrega();
        return;
      }
      void beginEntregaPhaseFlow({
        settings: callbacks.settings,
        renderGuardiaBoard: callbacks.renderGuardiaBoard
      });
    }
  });
}
function syncGuardiaPhaseBar(opts) {
  wireGuardiaPhaseBar(opts);
  const host = document.getElementById("guardia-phase-bar");
  if (!host) return;
  if (opts.rosterOpen) {
    host.hidden = true;
    host.innerHTML = "";
    stopTurnoClock();
    return;
  }
  if (opts.turnoActivo) {
    host.hidden = false;
    host.className = "guardia-phase-bar guardia-phase-bar--turno";
    host.innerHTML = `
      <div class="guardia-phase-bar-main">
        <span class="guardia-turno-badge">${LIVE_SVG} Turno activo</span>
        <span class="guardia-turno-clock" id="guardia-turno-clock" title="Tiempo de turno">${CLOCK_SVG}<span class="guardia-turno-clock-value">\u2014</span></span>
      </div>
      <div class="guardia-phase-bar-actions">
        <button type="button" class="btn-guardia-phase-end" id="guardia-btn-finalizar-turno">Finalizar turno</button>
      </div>`;
    startTurnoClock(host.querySelector("#guardia-turno-clock .guardia-turno-clock-value"));
    return;
  }
  stopTurnoClock();
  host.hidden = true;
  host.innerHTML = "";
}
function teardownGuardiaPhaseBar() {
  stopTurnoClock();
  const host = document.getElementById("guardia-phase-bar");
  if (host) {
    host.hidden = true;
    host.innerHTML = "";
  }
}

// public/js/features/guardia-vitals-feed.mjs
var ALERT_SVG = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
var VITALS_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 6e4);
  if (diff < 1) return "ahora";
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
function isInTurnoSession(ts, turnoStart) {
  if (!ts || !turnoStart) return true;
  const t = new Date(ts).getTime();
  return Number.isFinite(t) && t >= turnoStart.getTime();
}
function entryHasAlerts(entry) {
  return !!(entry?.alteredAt && Object.keys(entry.alteredAt).length > 0);
}
function fmtVal(key, value, alteredAt = {}) {
  const v = value != null ? String(value) : "\u2014";
  if (alteredAt[key]) return `<span class="vfeed-altered">${v}</span>`;
  return v;
}
function medicionRecordedAt(entry) {
  return String(entry?.recordedAt || entry?.registeredAt || entry?.createdAt || "");
}
function medicionVitals(entry) {
  return entry?.vitals && typeof entry.vitals === "object" ? entry.vitals : entry?.values && typeof entry.values === "object" ? entry.values : {};
}
function patientBedLabel(p) {
  const joined = [p?.cuarto, p?.cama].filter(Boolean).join("-");
  return joined || String(p?.bed_label || "\u2014");
}
function buildVitalsLine(entry) {
  const v = medicionVitals(entry);
  const alt = entry?.alteredAt || {};
  const parts = [];
  if (v.ta != null) parts.push(`TA ${fmtVal("ta", v.ta, alt)}`);
  if (v.fc != null) parts.push(`FC ${fmtVal("fc", v.fc, alt)}`);
  if (v.fr != null) parts.push(`FR ${fmtVal("fr", v.fr, alt)}`);
  if (v.temp != null) parts.push(`T ${fmtVal("temp", v.temp, alt)}`);
  if (v.sat != null) parts.push(`Sat ${fmtVal("sat", v.sat, alt)}`);
  return parts.join(" \xB7 ") || "\u2014";
}
function collectRecentVitals(patients2, turnoStart) {
  return patients2.map((p) => {
    const hist = Array.isArray(p.monitoreo?.historial) ? p.monitoreo.historial : [];
    if (!hist.length) return null;
    const last = hist[hist.length - 1];
    const registeredAt = medicionRecordedAt(last);
    if (!isInTurnoSession(registeredAt, turnoStart)) return null;
    return {
      id: p.id,
      bed: patientBedLabel(p),
      name: abbreviatePatientName(String(p.nombre || p.name || "")),
      line: buildVitalsLine(last),
      hasAlerts: entryHasAlerts(last),
      registeredAt
    };
  }).filter(Boolean).sort((a, b) => {
    if (a.hasAlerts !== b.hasAlerts) return a.hasAlerts ? -1 : 1;
    return (b.registeredAt || "").localeCompare(a.registeredAt || "");
  });
}
function scrollToPatientChip(patientId) {
  const card = document.querySelector(`.patient-chip-card[data-patient-id="${patientId}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  card.classList.add("patient-chip-card--pulse");
  window.setTimeout(() => card.classList.remove("patient-chip-card--pulse"), 1200);
}
var vitalsFeedWired = false;
function wireVitalsFeedClicks() {
  if (vitalsFeedWired || typeof document === "undefined") return;
  vitalsFeedWired = true;
  document.addEventListener("click", (ev) => {
    const chip = ev.target?.closest?.(".vfeed-chip[data-patient-id]");
    if (!chip) return;
    scrollToPatientChip(String(chip.getAttribute("data-patient-id") || ""));
  });
}
function renderGuardiaVitalsFeed(patients2, censusIds = []) {
  wireVitalsFeedClicks();
  const host = document.getElementById("guardia-vitals-feed");
  if (!host) return;
  const turnoStart = getTurnoStartedAt();
  const items = collectRecentVitals(patients2, turnoStart);
  const censusCount = censusIds.length;
  if (!items.length) {
    host.innerHTML = `
      <div class="vfeed-header">
        ${VITALS_SVG}
        <span class="vfeed-title">Signos en este turno</span>
      </div>
      <div class="vfeed-empty" role="status">
        <span class="empty-state-title">Sin registros desde que iniciaste el turno</span>
        ${censusCount ? `<span class="empty-state-lead">${censusCount} paciente${censusCount === 1 ? "" : "s"} en censo \u2014 los chips de abajo muestran cu\xE1ndo toca tomar signos.</span>` : ""}
      </div>`;
    return;
  }
  const chips = items.map(
    (item) => `
    <button type="button" class="vfeed-chip${item.hasAlerts ? " vfeed-chip--alert" : ""}" data-patient-id="${item.id}" title="Ir a ${item.name}">
      <span class="vfeed-chip-bed">Cama ${item.bed}</span>
      <span class="vfeed-chip-name">${item.name}</span>
      <span class="vfeed-chip-vals">${item.line}</span>
      <span class="vfeed-chip-meta">
        ${item.hasAlerts ? `<span class="vfeed-chip-alert">${ALERT_SVG}</span>` : ""}
        <span class="vfeed-chip-time">hace ${timeAgo(item.registeredAt)}</span>
      </span>
    </button>`
  ).join("");
  host.innerHTML = `
    <div class="vfeed-header">
      ${VITALS_SVG}
      <span class="vfeed-title">Signos en este turno</span>
      <span class="vfeed-count">${items.length} registro${items.length === 1 ? "" : "s"}</span>
      <span class="vfeed-live-dot" aria-hidden="true" title="Actualizaci\xF3n en vivo"></span>
    </div>
    <div class="vfeed-strip" role="list">${chips}</div>
    <p class="vfeed-footnote">Toca un chip para localizar al paciente en el censo.</p>`;
}

// public/js/features/session-manager.mjs
var FREQ_MS = {
  "1h": 36e5,
  "2h": 72e5,
  "4h": 4 * 36e5,
  Shift_Once: 8 * 36e5
};
function vitalsMonitorAlertState(row) {
  const doc = normalizePendientesJson(row?.pendientes_json);
  const plan = normalizeVitalsPlan(doc.vitalsPlan);
  const hasMetrics = VITALS_METRIC_KEYS.some((k) => plan.metrics[k]);
  if (!hasMetrics) return null;
  const freqSpec = normalizeFrequencySpec(plan.frequency ?? row?.vitals_frequency);
  if (isVitalsFrequencyPaused(freqSpec)) return null;
  const ms = frequencyIntervalMs(freqSpec);
  if (!ms) return null;
  const due = new Date(row?.last_vitals_check || Date.now()).getTime() + ms;
  const diff = due - Date.now();
  const freqLabel = frequencyDisplayLabel(freqSpec);
  if (diff <= 0) return { level: "overdue", freqLabel };
  if (diff <= 15 * 6e4) return { level: "warning", freqLabel };
  return null;
}
function resolvePatientLabelForNotify(row, resolveLabel) {
  const id = String(row?.patient_id || "");
  const resolved = typeof resolveLabel === "function" ? String(resolveLabel(id, row) || "").trim() : "";
  return resolved || id;
}
var BackgroundVitalsMonitorLoop = class {
  /**
   * @param {{ all: (sql: string, params?: unknown[]) => Promise<Array<{ patient_id: string, last_vitals_check: string, vitals_frequency: string }>> }} db
   * @param {string} userId
   * @param {{ notify?: (title: string, body: string) => void, intervalMs?: number, resolvePatientLabel?: (patientId: string, row: object) => string }} [opts]
   */
  constructor(db, userId, opts = {}) {
    this.db = db;
    this.userId = userId;
    this.shouldMonitorVitals = opts.shouldMonitorVitals;
    this.resolvePatientLabel = opts.resolvePatientLabel;
    this.notify = opts.notify || ((title, body) => {
      if (typeof Notification !== "undefined") {
        new Notification(title, { body });
      }
    });
    this.intervalMs = opts.intervalMs ?? 6e4;
    this._timer = null;
    this._lastAlertLevel = /* @__PURE__ */ new Map();
  }
  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this.scan(), this.intervalMs);
  }
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
  async scan() {
    if (typeof this.shouldMonitorVitals === "function" && !this.shouldMonitorVitals()) {
      this._lastAlertLevel.clear();
      return;
    }
    const rows = await this.db.all(
      "SELECT patient_id, last_vitals_check, vitals_frequency, pendientes_json FROM active_guardias WHERE covering_user_id = ? AND status = 'Active'",
      [this.userId]
    );
    const seen = /* @__PURE__ */ new Set();
    rows.forEach((r) => {
      const patientId = String(r.patient_id || "");
      if (!patientId) return;
      seen.add(patientId);
      const alert = vitalsMonitorAlertState(r);
      if (!alert) {
        this._lastAlertLevel.delete(patientId);
        return;
      }
      if (this._lastAlertLevel.get(patientId) === alert.level) return;
      this._lastAlertLevel.set(patientId, alert.level);
      const who = resolvePatientLabelForNotify(r, this.resolvePatientLabel);
      if (alert.level === "overdue") {
        this.notify(
          "CRITICAL: Overdue",
          `${who}: control de signos (${alert.freqLabel}) vencido.`
        );
      } else {
        this.notify(
          "Warning: Check Soon",
          `${who}: ventana (${alert.freqLabel}) cierra en 15 min.`
        );
      }
    });
    for (const id of this._lastAlertLevel.keys()) {
      if (!seen.has(id)) this._lastAlertLevel.delete(id);
    }
  }
};
var ClientSessionInactivityLocker = class {
  /**
   * @param {number} [mins]
   * @param {string} [overlayId]
   */
  constructor(mins = 10, overlayId) {
    this.timeout = mins * 6e4;
    this.el = typeof document !== "undefined" && overlayId ? document.getElementById(overlayId) : null;
    this.handle = null;
    this.ctx = null;
    this._listeners = [];
  }
  /** @param {{ decryptedPrivateKeyPem?: string|null }} ctx */
  start(ctx) {
    this.ctx = ctx;
    if (typeof window === "undefined") return;
    ["mousemove", "keydown", "click"].forEach((event) => {
      const fn = () => this.reset();
      window.addEventListener(event, fn);
      this._listeners.push({ event, fn });
    });
    this.reset();
  }
  stop() {
    if (typeof window !== "undefined") {
      this._listeners.forEach(({ event, fn }) => window.removeEventListener(event, fn));
    }
    this._listeners = [];
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }
  reset() {
    if (this.handle) clearTimeout(this.handle);
    this.handle = setTimeout(() => {
      if (this.ctx) this.ctx.decryptedPrivateKeyPem = null;
      if (this.el) this.el.classList.add("active-lock-view-overlay");
    }, this.timeout);
  }
};

// public/js/guardia-orphan-entregas.mjs
function dbApi8() {
  return typeof window !== "undefined" ? window.rplusDb || window.electronAPI || null : null;
}
function toast7(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function patientInLocalCensus(patientId) {
  const id = String(patientId || "").trim();
  if (!id) return false;
  return patients.some((p) => p && String(p.id) === id);
}
function vitalsHintForRow(row) {
  const alert = vitalsMonitorAlertState(row);
  if (!alert) return "Sin alerta de signos activa";
  if (alert.level === "overdue") {
    return `Signos vencidos (${alert.freqLabel})`;
  }
  return `Signos pronto (${alert.freqLabel})`;
}
function renderOrphanEntregasStrip(rows, opts = {}) {
  const host = document.getElementById("guardia-orphan-entregas-strip");
  if (!host) return;
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  const cards = list.map((row) => {
    const patientId = String(row.patient_id || "");
    const guardiaId = String(row.guardia_id || "");
    const vitalsHint = vitalsHintForRow(row);
    const shortId = patientId.length > 14 ? `${patientId.slice(0, 6)}\u2026${patientId.slice(-4)}` : patientId;
    return `<li class="guardia-orphan-row">
        <div class="guardia-orphan-row-main">
          <span class="guardia-orphan-id" title="${escapeAttr(patientId)}">${escapeHtml(shortId)}</span>
          <span class="guardia-orphan-vitals">${escapeHtml(vitalsHint)}</span>
        </div>
        <div class="guardia-orphan-row-actions">
          <button type="button" class="btn-med-secondary guardia-orphan-open-btn"
            data-patient-id="${escapeAttr(patientId)}"
            data-guardia-id="${escapeAttr(guardiaId)}">Abrir</button>
          <button type="button" class="btn-med-secondary guardia-orphan-delete-btn"
            data-patient-id="${escapeAttr(patientId)}"
            data-guardia-id="${escapeAttr(guardiaId)}">Eliminar del servidor</button>
        </div>
      </li>`;
  }).join("");
  host.hidden = false;
  host.innerHTML = `
    <details class="guardia-orphan-details" open>
      <summary class="guardia-orphan-summary">
        Entregas sin expediente local
        <span class="guardia-orphan-count">${list.length}</span>
      </summary>
      <p class="guardia-orphan-hint">
        Estas entregas siguen en \u21C4 pero el paciente ya no est\xE1 en tu censo.
        Abrir recupera el expediente del anfitri\xF3n cuando sea posible; Eliminar del servidor borra el paciente en \u21C4 y libera la entrega.
      </p>
      <ul class="guardia-orphan-list">${cards}</ul>
    </details>`;
  host.querySelectorAll(".guardia-orphan-open-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._orphanOpenWired) return;
    btn._orphanOpenWired = true;
    btn.addEventListener("click", () => {
      void openOrphanEntrega(btn, opts.settings ?? null);
    });
  });
  host.querySelectorAll(".guardia-orphan-delete-btn").forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement) || btn._orphanDeleteWired) return;
    btn._orphanDeleteWired = true;
    btn.addEventListener("click", () => {
      void deleteOrphanFromServer(btn, opts.settings ?? null);
    });
  });
}
async function tryRestoreOrphanPatientFromLan(patientId) {
  if (patientInLocalCensus(patientId)) return;
  const lan = await import("/mobile/js/chunks/mutate-bridge-7CJF23JI.js");
  if (typeof lan.getActiveLiveSyncRoomId !== "function" || !lan.getActiveLiveSyncRoomId()) return;
  const restored = typeof lan.restoreLanPatientFromHost === "function" ? await lan.restoreLanPatientFromHost(patientId) : null;
  if (restored?.ok) {
    toast7("Expediente recuperado del anfitri\xF3n.", "success");
    return;
  }
  if (restored?.error === "patient_not_on_host") {
    toast7("El anfitri\xF3n no tiene este expediente; se abre la entrega con datos limitados.", "warn");
    return;
  }
  if (restored && !restored.ok) {
    toast7("No se pudo recuperar el expediente del anfitri\xF3n.", "warn");
  }
}
async function openEntregaForOrphan(patientId, guardiaId) {
  const entrega = await import("/mobile/js/chunks/clinical-entrega-CKPZGXS4.js");
  if (typeof entrega.openEntregaModal !== "function") return;
  entrega.openEntregaModal({ patientId, guardiaId });
}
function selectOrphanPatientIfLocal(patientId) {
  if (!patientInLocalCensus(patientId)) return;
  if (typeof window.selectPatient === "function") {
    window.selectPatient(patientId);
  }
}
async function openOrphanEntrega(btn, settings) {
  const patientId = String(btn.dataset.patientId || "").trim();
  const guardiaId = String(btn.dataset.guardiaId || "").trim();
  if (!patientId && !guardiaId) return;
  btn.disabled = true;
  try {
    await tryRestoreOrphanPatientFromLan(patientId);
    await openEntregaForOrphan(patientId, guardiaId);
    selectOrphanPatientIfLocal(patientId);
  } finally {
    btn.disabled = false;
    await refreshGuardiaCensusFromDb(settings);
    syncOrphanEntregasStrip(settings);
  }
}
async function purgeOrphanPatientOnHost(patientId) {
  const lan = await import("/mobile/js/chunks/mutate-bridge-7CJF23JI.js");
  const onLan = typeof lan.getActiveLiveSyncRoomId === "function" && !!lan.getActiveLiveSyncRoomId();
  if (!onLan || typeof lan.purgeLanPatientFromHost !== "function") {
    toast7("Sin conexi\xF3n \u21C4; solo se liberar\xE1 la entrega en esta Mac.", "info");
    return false;
  }
  const purge = await lan.purgeLanPatientFromHost(patientId);
  if (purge?.ok) {
    if (!purge.hadHostRow) {
      toast7("No hab\xEDa expediente en el anfitri\xF3n; se liberar\xE1 solo la entrega.", "info");
    }
  } else if (purge?.error === "owned_by_other_client") {
    toast7("El expediente pertenece a otro equipo LAN; solo se liberar\xE1 la entrega local.", "info");
  } else if (purge?.error === "not_configured") {
    toast7("Sin conexi\xF3n \u21C4 activa; solo se liberar\xE1 la entrega local.", "warn");
  } else {
    toast7("No se pudo borrar del anfitri\xF3n; se liberar\xE1 la entrega local.", "warn");
  }
  if (typeof lan.pushClinicalOpsLanNow === "function") {
    await lan.pushClinicalOpsLanNow();
  }
  return !!purge?.ok;
}
async function removeOrphanPatientLocally(patientId) {
  if (!patientInLocalCensus(patientId)) return;
  const lanMod = await import("/mobile/js/chunks/mutate-bridge-7CJF23JI.js");
  if (typeof lanMod.removePatientLocally === "function") {
    lanMod.removePatientLocally(patientId);
  }
  saveState({ immediate: true });
}
async function deleteOrphanFromServer(btn, settings) {
  const patientId = String(btn.dataset.patientId || "").trim();
  const guardiaId = String(btn.dataset.guardiaId || "").trim();
  if (!patientId && !guardiaId) return;
  const ok = window.confirm(
    "\xBFEliminar este paciente del anfitri\xF3n \u21C4 y liberar la entrega?\n\nSe borrar\xE1 el expediente en la red local y dejar\xE1 de asignarte el paciente. Esta acci\xF3n no se puede deshacer."
  );
  if (!ok) return;
  const api2 = dbApi8();
  if (!api2 || typeof api2.dbGuardiaResolve !== "function") {
    toast7("Base cl\xEDnica no disponible.", "error");
    return;
  }
  btn.disabled = true;
  let hostPurged = false;
  try {
    const res = await api2.dbGuardiaResolve({ patientId, guardiaId });
    if (!res?.ok || !res.resolved) {
      toast7(res?.error || "No se liber\xF3 la entrega.", "error");
      return;
    }
    hostPurged = await purgeOrphanPatientOnHost(patientId);
    await removeOrphanPatientLocally(patientId);
    toast7(
      hostPurged ? "Paciente eliminado del servidor y entrega liberada." : "Entrega liberada.",
      "success"
    );
    await refreshGuardiaCensusFromDb(settings);
    syncOrphanEntregasStrip(settings);
  } finally {
    btn.disabled = false;
  }
}
function syncOrphanEntregasStrip(settings) {
  renderOrphanEntregasStrip(clinicalSessionContext.orphanGuardias || [], { settings });
}

// public/js/features/eventualidades-panel-html.mjs
function daySectionIsOpen(dayGroup, editingId, dayOpenPrefs) {
  if (dayOpenPrefs.has(dayGroup.day)) return dayOpenPrefs.get(dayGroup.day);
  if (dayGroup.isToday) return true;
  if (editingId && dayGroup.entries.some(function(e) {
    return e && String(e.id) === String(editingId);
  })) {
    return true;
  }
  return false;
}
function renderEntryCard(entry, editingId) {
  const isEditing = editingId && String(entry.id) === String(editingId);
  return '<article class="ev-card' + (isEditing ? " ev-card--editing" : "") + '" data-entry-id="' + esc(entry.id) + '"><p class="ev-card__text">' + esc(normalizeEventualidadText(entry.text)) + '</p><footer class="ev-card__foot"><div class="ev-card__actions"><button type="button" class="ev-card__edit" data-ev-edit="' + esc(entry.id) + '" aria-label="Editar eventualidad">Editar</button><button type="button" class="ev-card__delete" data-ev-delete="' + esc(entry.id) + '" aria-label="Eliminar eventualidad">Eliminar</button></div></footer></article>';
}
function renderDaySection(dayGroup, editingId, now, dayOpenPrefs) {
  const n = dayGroup.entries.length;
  const countLabel = n === 1 ? "1 registro" : n + " registros";
  const subLabel = formatDaySubLabel(dayGroup.day, now);
  const todayClass = dayGroup.isToday ? " ev-day--today" : "";
  const isOpen = daySectionIsOpen(dayGroup, editingId, dayOpenPrefs);
  return '<details class="ev-day' + todayClass + '"' + (isOpen ? " open" : "") + ' data-day="' + esc(dayGroup.day) + '"><summary class="ev-day__summary"><span class="ev-day__chevron" aria-hidden="true"></span><div class="ev-day__titles"><span class="ev-day__pill">' + esc(dayGroup.label) + "</span>" + (subLabel ? '<span class="ev-day__date">' + esc(subLabel) + "</span>" : "") + '</div><span class="ev-day__count">' + esc(countLabel) + '</span></summary><div class="ev-day__panel">' + dayGroup.entries.map(function(e) {
    return renderEntryCard(e, editingId);
  }).join("") + "</div></details>";
}
function renderNoteCompose(editingEntry) {
  const isEdit = !!editingEntry;
  const atValue = isEdit ? toEventualidadDateValue(editingEntry.at) : toEventualidadDateValue(/* @__PURE__ */ new Date());
  const textValue = isEdit ? String(editingEntry.text || "") : "";
  return '<footer class="ev-compose" data-ev-mode="note"><div class="ev-compose__card' + (isEdit ? " ev-compose__card--edit" : "") + '"><div class="ev-compose__pane" data-ev-pane="note"><div class="ev-compose__top"><label class="ev-compose__label" for="eventualidades-input">' + (isEdit ? "Editar eventualidad" : "Nueva eventualidad") + '</label><div class="ev-compose__date-slot"><input type="date" id="eventualidades-at" class="rpc-date-input" value="' + esc(atValue) + '" title="Fecha de la eventualidad" aria-label="Fecha de la eventualidad"></div></div><textarea id="eventualidades-input" class="ev-compose__input" rows="2" placeholder="Describe lo ocurrido\u2026">' + esc(textValue) + '</textarea><div class="ev-compose__actions"><span class="ev-compose__hint">' + (isEdit ? "Puedes cambiar la fecha y el texto" : "Elige una fecha anterior si aplica") + '</span><div class="ev-compose__btns">' + (isEdit ? '<button type="button" class="ea-btn ea-btn--ghost ev-compose__cancel" id="eventualidades-cancel">Cancelar</button>' : "") + '<button type="button" class="ea-btn ea-btn--primary ev-compose__submit" id="eventualidades-add">' + (isEdit ? "Guardar" : "Agregar") + "</button></div></div></div></div></footer>";
}
function buildEventualidadesPanelHtml(byDay, hasEntries, editingEntry, _store, _mode, ctx) {
  var editingId = ctx.editingEntryId;
  var dayOpenPrefs = ctx.dayOpenPrefs;
  var timelineInner = !hasEntries ? '<p class="ev-empty">A\xFAn no hay eventualidades. Agr\xE9galas abajo.</p>' : '<div class="ev-timeline__days">' + byDay.map(function(day) {
    return renderDaySection(day, editingId, /* @__PURE__ */ new Date(), dayOpenPrefs);
  }).join("") + "</div>";
  return '<div class="ev-panel" data-ev-view="note"><header class="ev-panel__head"><p class="ev-panel__hint">Bit\xE1cora cronol\xF3gica de la hospitalizaci\xF3n, agrupada por d\xEDa.</p></header><div class="ev-timeline' + (!hasEntries ? " ev-timeline--empty" : "") + '" role="feed" aria-label="Eventualidades por d\xEDa" data-ev-timeline="note">' + timelineInner + "</div>" + renderNoteCompose(editingEntry) + "</div>";
}

// public/js/features/eventualidades-render.mjs
function touchPatientLanUpdatedAt(patientId) {
  const p = patients.find(function(row) {
    return String(row.id) === String(patientId);
  });
  if (p) p.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
var _editingEntryId = null;
var _dayOpenPrefs = /* @__PURE__ */ new Map();
function wireEventualidadesUppercase(input) {
  if (!input || input.dataset.evUpperWired === "1") return;
  input.dataset.evUpperWired = "1";
  input.style.textTransform = "uppercase";
  input.addEventListener("input", function() {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const upper = toClinicalHistoryText(input.value);
    if (upper !== input.value) {
      input.value = upper;
      if (start != null && end != null) {
        input.setSelectionRange(start, end);
      }
    }
  });
}
function activePatient() {
  const id = rt.getActiveId();
  if (!id) return null;
  return patients.find(function(p) {
    return String(p.id) === String(id);
  });
}
function ensureEventualidades(patient) {
  if (!patient.eventualidades || typeof patient.eventualidades !== "object") {
    patient.eventualidades = { entries: [], labsText: "" };
  }
  if (!Array.isArray(patient.eventualidades.entries)) {
    patient.eventualidades.entries = [];
  }
  if (patient.eventualidades.labsText == null) {
    patient.eventualidades.labsText = "";
  }
  return patient.eventualidades;
}
async function savePatientEventualidad(patient, text, atIso) {
  if (!patient) return { ok: false, reason: "no-patient" };
  const store = ensureEventualidades(patient);
  const next = appendEventualidad(store, text, "", atIso);
  if (next.entries.length === store.entries.length) {
    return { ok: false, reason: "empty" };
  }
  return persistEventualidades(patient, next);
}
async function persistEventualidades(patient, store) {
  const next = store && typeof store === "object" ? Object.assign({}, store, {
    updatedAt: store.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
  }) : { entries: [], updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  patient.eventualidades = next;
  touchPatientLanUpdatedAt(patient.id);
  await saveState({ immediate: true });
  touchClinicalSessionActivity({ force: true });
  scheduleCloudSyncPush();
  return { ok: true };
}
function wireEventualidadesDayToggles(mountEl) {
  mountEl.querySelectorAll(".ev-day").forEach(function(dayEl) {
    dayEl.addEventListener("toggle", function() {
      const key = dayEl.getAttribute("data-day");
      if (key) _dayOpenPrefs.set(key, dayEl.open);
    });
  });
}
function deleteConfirmMessage(row) {
  const preview = row ? String(row.text || "").trim().slice(0, 80) : "";
  if (!preview) return "\xBFEliminar esta eventualidad?";
  return "\xBFEliminar esta eventualidad?\n\n\u201C" + preview + (preview.length >= 80 ? "\u2026" : "") + "\u201D";
}
function wireEventualidadesTimeline(mountEl, patient, store) {
  const timeline = mountEl.querySelector(".ev-timeline");
  if (!timeline) return;
  timeline.addEventListener("click", function(ev) {
    const delBtn = ev.target.closest("[data-ev-delete]");
    if (delBtn) {
      const delId = delBtn.getAttribute("data-ev-delete");
      if (!delId) return;
      const row = findEventualidadEntry(store, delId);
      if (!confirm(deleteConfirmMessage(row))) return;
      void (async function() {
        const next = removeEventualidad(store, delId);
        if (_editingEntryId === delId) _editingEntryId = null;
        const out = await persistEventualidades(patient, next);
        if (out && out.ok) {
          rt.showToast("Eventualidad eliminada.", "success");
          renderEventualidadesPanel(mountEl);
        }
      })();
      return;
    }
    const btn = ev.target.closest("[data-ev-edit]");
    if (!btn) return;
    const id = btn.getAttribute("data-ev-edit");
    if (!id) return;
    _editingEntryId = id;
    renderEventualidadesPanel(mountEl);
    const compose = mountEl.querySelector(".ev-compose");
    if (compose && compose.scrollIntoView) {
      compose.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
}
function wireEventualidadesCompose(mountEl, patient, store) {
  const addBtn = mountEl.querySelector("#eventualidades-add");
  const input = mountEl.querySelector("#eventualidades-input");
  const atInput = mountEl.querySelector("#eventualidades-at");
  const cancelBtn = mountEl.querySelector("#eventualidades-cancel");
  if (!addBtn || !input || !atInput) return;
  function readAtIso() {
    return eventualidadDateToIso(atInput.value);
  }
  async function submitEntry() {
    const text = input.value;
    const atIso = readAtIso();
    let next;
    if (_editingEntryId) {
      next = updateEventualidad(store, _editingEntryId, { text, at: atIso });
    } else {
      next = appendEventualidad(store, text, "", atIso);
    }
    const out = await persistEventualidades(patient, next);
    if (out && out.ok) {
      const wasEdit = !!_editingEntryId;
      _editingEntryId = null;
      rt.showToast(wasEdit ? "Eventualidad actualizada." : "Eventualidad guardada.", "success");
      renderEventualidadesPanel(mountEl);
    }
  }
  addBtn.onclick = function() {
    void submitEntry();
  };
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      _editingEntryId = null;
      renderEventualidadesPanel(mountEl);
    };
  }
  input.addEventListener("keydown", function(ev) {
    if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void submitEntry();
    }
    if (ev.key === "Escape" && _editingEntryId) {
      ev.preventDefault();
      _editingEntryId = null;
      renderEventualidadesPanel(mountEl);
    }
  });
}
function renderEventualidadesPanel(mountEl) {
  if (!mountEl) return;
  const patient = activePatient();
  if (!patient) {
    mountEl.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  const store = ensureEventualidades(patient);
  const editingEntry = _editingEntryId ? findEventualidadEntry(store, _editingEntryId) : null;
  if (_editingEntryId && !editingEntry) _editingEntryId = null;
  const byDay = groupEntriesByDay(store.entries);
  const hasEntries = byDay.length > 0;
  mountEl.innerHTML = buildEventualidadesPanelHtml(
    byDay,
    hasEntries,
    editingEntry,
    store,
    "note",
    {
      editingEntryId: _editingEntryId,
      composeMode: "note",
      dayOpenPrefs: _dayOpenPrefs
    }
  );
  refreshRpcDateFields(mountEl);
  wireEventualidadesUppercase(mountEl.querySelector("#eventualidades-input"));
  wireEventualidadesDayToggles(mountEl);
  wireEventualidadesCompose(mountEl, patient, store);
  wireEventualidadesTimeline(mountEl, patient, store);
}
function invalidateEventualidadesPanel() {
  _editingEntryId = null;
  _dayOpenPrefs.clear();
}

// public/js/features/eventualidades-drive.mjs
async function applyDriveImportEventualidades(patient, incoming) {
  if (!patient) return { ok: false, added: 0, skipped: 0 };
  let store = ensureEventualidades(patient);
  const { toAdd, skipped } = filterNewEventualidades(store.entries, incoming || []);
  for (let i = 0; i < toAdd.length; i += 1) {
    store = appendEventualidad(store, toAdd[i].text, "", toAdd[i].at);
  }
  if (!toAdd.length) return { ok: true, added: 0, skipped };
  patient.eventualidades = store;
  await saveState({ immediate: true });
  touchClinicalSessionActivity({ force: true });
  if (isCloudSyncActive()) scheduleCloudSyncPush();
  return { ok: true, added: toAdd.length, skipped };
}

// public/js/features/guardia-patient-action-sheet.mjs
var dismissWired = false;
function toast8(msg, type = "info") {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, type);
  }
}
function backdropEl3() {
  return document.getElementById("guardia-patient-action-backdrop");
}
function bodyEl2() {
  return document.getElementById("guardia-patient-action-body");
}
function findPatient(patientId) {
  const id = String(patientId || "");
  return patients.find(function(p) {
    return p && String(p.id) === id;
  }) || null;
}
function shouldShowGuardiaPatientActionMenu(ctx) {
  const turnoActivo = !!ctx?.turnoActivo;
  const entregaActive = !!ctx?.entregaActive;
  if (entregaActive && !turnoActivo) return false;
  return turnoActivo;
}
function closeGuardiaPatientActionSheet() {
  const bd = backdropEl3();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("guardia-patient-action-open");
  const body = bodyEl2();
  if (body) body.innerHTML = "";
}
function openBackdrop() {
  const bd = backdropEl3();
  if (!bd) return false;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("guardia-patient-action-open");
  return true;
}
function wireUppercaseTextarea(textarea) {
  if (!textarea || textarea.dataset.guardiaEvUpperWired === "1") return;
  textarea.dataset.guardiaEvUpperWired = "1";
  textarea.style.textTransform = "uppercase";
  textarea.addEventListener("input", function() {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const upper = toClinicalHistoryText(textarea.value);
    if (upper !== textarea.value) {
      textarea.value = upper;
      if (start != null && end != null) textarea.setSelectionRange(start, end);
    }
  });
}
function resolveGlobalFn(name) {
  if (typeof window !== "undefined" && typeof window[name] === "function") {
    return window[name];
  }
  if (typeof globalThis[name] === "function") return globalThis[name];
  return null;
}
function openPatientChart(patientId) {
  const selectFn = resolveGlobalFn("selectPatient");
  if (selectFn) selectFn(patientId);
  const openSectionFn = resolveGlobalFn("openPaseSectionInNormal");
  if (openSectionFn) {
    openSectionFn("expediente");
    return;
  }
  if (getUiDensity() === "guardia") setUiDensity("normal");
}
function renderMenuStep(patientId, patientLabel) {
  const body = bodyEl2();
  if (!body) return;
  body.innerHTML = '<p class="guardia-patient-action-lead">Elige una acci\xF3n para este paciente.</p><div class="guardia-patient-action-list" role="menu"><button type="button" class="guardia-patient-action-item" data-action="chart"><span class="guardia-patient-action-item__title">Abrir expediente</span><span class="guardia-patient-action-item__hint">Ver historia, estado actual y m\xE1s</span></button><button type="button" class="guardia-patient-action-item" data-action="eventualidad"><span class="guardia-patient-action-item__title">Registrar eventualidad</span><span class="guardia-patient-action-item__hint">Nota breve visible para el equipo en LAN</span></button></div>';
  body.querySelector('[data-action="chart"]')?.addEventListener("click", function() {
    closeGuardiaPatientActionSheet();
    openPatientChart(patientId);
  });
  body.querySelector('[data-action="eventualidad"]')?.addEventListener("click", function() {
    renderEventualidadStep(patientId, patientLabel);
  });
}
function renderEventualidadStep(patientId, patientLabel) {
  const body = bodyEl2();
  const title = document.getElementById("guardia-patient-action-title");
  if (!body) return;
  if (title) title.textContent = "Registrar eventualidad";
  body.innerHTML = '<p class="guardia-patient-action-lead">' + escapeHtml(patientLabel || "Paciente") + '</p><div class="field-group guardia-patient-action-field"><label for="guardia-patient-action-ev-input">\xBFQu\xE9 ocurri\xF3?</label><textarea id="guardia-patient-action-ev-input" class="profile-input guardia-patient-action-textarea" rows="3" maxlength="480" placeholder="Describe lo ocurrido en el turno\u2026"></textarea></div><div class="modal-actions guardia-patient-action-actions"><button type="button" class="btn-cancel" id="guardia-patient-action-back">Volver</button><button type="button" class="btn-save" id="guardia-patient-action-save">Guardar</button></div>';
  const input = body.querySelector("#guardia-patient-action-ev-input");
  wireUppercaseTextarea(input);
  input?.focus();
  body.querySelector("#guardia-patient-action-back")?.addEventListener("click", function() {
    const titleEl = document.getElementById("guardia-patient-action-title");
    if (titleEl) titleEl.textContent = patientLabel;
    renderMenuStep(patientId, patientLabel);
  });
  body.querySelector("#guardia-patient-action-save")?.addEventListener("click", function() {
    void submitEventualidad(patientId, patientLabel, input?.value || "");
  });
  input?.addEventListener("keydown", function(ev) {
    if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void submitEventualidad(patientId, patientLabel, input.value || "");
    }
  });
}
function wireCancelButton() {
  const cancelBtn = document.getElementById("guardia-patient-action-cancel");
  if (!cancelBtn || cancelBtn.dataset.guardiaActionWired === "1") return;
  cancelBtn.dataset.guardiaActionWired = "1";
  cancelBtn.addEventListener("click", closeGuardiaPatientActionSheet);
}
async function submitEventualidad(patientId, patientLabel, rawText) {
  const text = normalizeEventualidadText(rawText);
  if (!text) {
    toast8("Escribe la eventualidad antes de guardar.", "error");
    return;
  }
  const patient = findPatient(patientId);
  if (!patient) {
    toast8("Paciente no encontrado.", "error");
    closeGuardiaPatientActionSheet();
    return;
  }
  const saveBtn = document.getElementById("guardia-patient-action-save");
  if (saveBtn) saveBtn.disabled = true;
  try {
    const out = await savePatientEventualidad(patient, text);
    if (!out?.ok) {
      toast8("No se pudo guardar la eventualidad.", "error");
      return;
    }
    toast8("Eventualidad guardada.", "success");
    closeGuardiaPatientActionSheet();
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}
function openGuardiaPatientActionSheet(opts) {
  const patientId = String(opts?.patientId || "");
  if (!patientId) return;
  if (!openBackdrop()) {
    openPatientChart(patientId);
    return;
  }
  wireCancelButton();
  const patient = findPatient(patientId);
  const patientLabel = String(opts?.patientLabel || "").trim() || String(patient?.name || "").trim() || "Paciente";
  const title = document.getElementById("guardia-patient-action-title");
  if (title) title.textContent = patientLabel;
  renderMenuStep(patientId, patientLabel);
}
function wireGuardiaPatientActionSheetDismiss() {
  if (dismissWired || typeof document === "undefined") return;
  dismissWired = true;
  wireCancelButton();
  const bd = backdropEl3();
  if (bd) {
    bd.addEventListener("click", function(ev) {
      if (!bd.classList.contains("open")) return;
      if (ev.target !== bd) return;
      closeGuardiaPatientActionSheet();
    });
  }
  document.addEventListener(
    "keydown",
    function(ev) {
      if (ev.key !== "Escape" && ev.key !== "Esc") return;
      const el = backdropEl3();
      if (!el || !el.classList.contains("open")) return;
      closeGuardiaPatientActionSheet();
      ev.preventDefault();
      ev.stopPropagation();
    },
    true
  );
}

// public/js/features/guardia-census-empty.mjs
function resolveGuardiaCensusEmptyCopy(opts) {
  var filterOn = !!(opts && opts.filterOn);
  if (filterOn) {
    return {
      title: "No hay pacientes en este alcance",
      lead: "Prueba \xABCenso: todos\xBB, o confirma que ya te entregaron en Nube. Si acabas de rotar, abre Mi rotaci\xF3n.",
      actionLabel: "Ver censo completo",
      actionId: "btn-guardia-census-show-all"
    };
  }
  return {
    title: "No hay pacientes visibles",
    lead: "Confirma que est\xE1s en Nube con sala y equipo correctos. Si acabas de rotar, abre Mi rotaci\xF3n.",
    actionLabel: null,
    actionId: null
  };
}
function buildGuardiaCensusEmptyHtml(opts) {
  var copy = resolveGuardiaCensusEmptyCopy(opts);
  var action = copy.actionId && copy.actionLabel ? '<div class="guardia-census-empty-actions"><button type="button" class="btn-med-primary" id="' + copy.actionId + '">' + copy.actionLabel + "</button></div>" : "";
  return '<div class="empty-state empty-state--compact guardia-census-empty" role="status"><h3 class="empty-state-title">' + copy.title + '</h3><p class="empty-state-lead">' + copy.lead + "</p>" + action + "</div>";
}
function renderGuardiaCensusEmpty(container, opts) {
  if (!container) return;
  var filterOn = !!(opts && opts.filterOn);
  container.innerHTML = buildGuardiaCensusEmptyHtml({ filterOn });
  container.classList.add("patient-chips-grid", "patient-chips-grid--guardia");
  var btn = container.querySelector("#btn-guardia-census-show-all");
  if (btn && opts && typeof opts.onShowAll === "function") {
    btn.addEventListener("click", function() {
      opts.onShowAll();
    });
  }
}

// public/js/features/guardia-trust-strip.mjs
function roomSalaTurn(room, userSala) {
  var sala = String(room && room.sala || userSala || "").trim();
  var turn = String(room && room.turnKey || "").trim();
  return [sala, turn].filter(Boolean).join(" \xB7 ");
}
function resolveGuardiaTrustStripModel(input) {
  var cloudActive = !!(input && input.cloudActive);
  var teamName = String(input && input.teamName || "").trim();
  var salaTurn = roomSalaTurn(
    input && input.room || null,
    String(input && input.userSala || "").trim()
  );
  var chips = [
    cloudActive ? { label: "Nube \xB7 conectado", tone: "ok" } : { label: "Sin Nube", tone: "warn" }
  ];
  if (salaTurn) chips.push({ label: salaTurn, tone: "muted" });
  chips.push({ label: teamName || "Sin equipo", tone: "muted" });
  return { connected: cloudActive, chips };
}
function buildGuardiaTrustStripFromSession() {
  var user = clinicalSessionContext.user || {};
  var joined = filterJoinedTeams(clinicalSessionContext.teams || [], user);
  var team = joined[0] || null;
  return resolveGuardiaTrustStripModel({
    cloudActive: isCloudSyncActive(),
    room: getCloudSyncRoomSnapshot(),
    userSala: String(user.sala || "").trim(),
    teamName: team ? String(team.name || team.service || "").trim() : ""
  });
}
function buildGuardiaTrustStripHtml(model) {
  var chips = model && model.chips || [];
  return chips.map(function(c) {
    var tone = c.tone === "ok" ? "ok" : c.tone === "warn" ? "warn" : "muted";
    var dot = tone === "ok" ? '<span class="guardia-trust-dot" aria-hidden="true"></span>' : "";
    return '<span class="guardia-trust-chip guardia-trust-chip--' + tone + '">' + dot + escapeHtml(c.label) + "</span>";
  }).join("");
}
function syncGuardiaTrustStrip() {
  if (typeof document === "undefined") return;
  var host = document.getElementById("guardia-trust-strip");
  if (!host) return;
  var model = buildGuardiaTrustStripFromSession();
  host.innerHTML = buildGuardiaTrustStripHtml(model);
  host.hidden = false;
  host.setAttribute("aria-label", "Estado Nube, sala y equipo");
}

// public/js/guardia-mode-sync-ui.mjs
var GUARDIA_MODE_LABEL_OFF = "Censo: todos";
var GUARDIA_MODE_LABEL_ON = "Censo: solo entregados";
var GUARDIA_MODE_TOGGLE_TITLE = "Filtro de la grilla: todos los pacientes en tu alcance o solo los entregados a ti (independiente del bot\xF3n Entrega).";
var GUARDIA_CENSUS_FILTER_HINT_ON = "Solo pacientes que te entregaron en este turno.";
var GUARDIA_CENSUS_FILTER_HINT_OFF = "Todos los pacientes en tu alcance cl\xEDnico.";
function syncGuardiaModeDom(active) {
  if (typeof document === "undefined") return;
  const boardBtn = document.getElementById("btn-guardia-mode-toggle");
  if (boardBtn) {
    boardBtn.setAttribute("aria-pressed", String(active));
    boardBtn.setAttribute("title", GUARDIA_MODE_TOGGLE_TITLE);
    boardBtn.setAttribute(
      "aria-label",
      `${active ? GUARDIA_CENSUS_FILTER_HINT_ON : GUARDIA_CENSUS_FILTER_HINT_OFF} ${active ? GUARDIA_MODE_LABEL_ON : GUARDIA_MODE_LABEL_OFF}`
    );
    boardBtn.classList.toggle("is-active", active);
    const label = boardBtn.querySelector(".guardia-mode-label");
    if (label) label.textContent = active ? GUARDIA_MODE_LABEL_ON : GUARDIA_MODE_LABEL_OFF;
  }
  const filterHint = document.getElementById("guardia-census-filter-hint");
  if (filterHint) {
    filterHint.textContent = active ? GUARDIA_CENSUS_FILTER_HINT_ON : GUARDIA_CENSUS_FILTER_HINT_OFF;
  }
}
function rerenderGuardiaBoardIfRequested(opts) {
  if (!opts.rerenderBoard) return;
  const render = opts.renderGuardiaBoard;
  if (typeof render === "function") {
    render(opts.settings);
    return;
  }
  if (typeof globalThis.renderGuardiaBoard !== "function") return;
  let settings = opts.settings;
  if (!settings) {
    try {
      settings = JSON.parse(localStorage.getItem("rpc-settings") || "{}");
    } catch {
      settings = {};
    }
  }
  globalThis.renderGuardiaBoard(settings);
}

// public/js/guardia-mode-sync.mjs
function setGuardiaMode(active, opts = {}) {
  clinicalSessionContext.guardiaMode = !!active;
  syncGuardiaModeUI(opts);
}
function syncGuardiaModeUI(opts = {}) {
  const active = !!clinicalSessionContext.guardiaMode;
  syncGuardiaModeDom(active);
  rerenderGuardiaBoardIfRequested(opts);
}
function toggleGuardiaMode(opts = {}) {
  setGuardiaMode(!clinicalSessionContext.guardiaMode, { ...opts, rerenderBoard: true });
}

// lib/entrega/guardia-chip-critical.mjs
function isGuardiaChipCritical(guardia) {
  if (!guardia) return false;
  const critical = !!(guardia.is_critical === 1 || guardia.is_critical === true);
  const pendientesDoc = normalizePendientesJson(guardia.pendientes_json);
  const handoff = normalizeHandoffContext(pendientesDoc.handoffContext);
  return critical || handoff.vasopressor.active || handoff.ventilation.active;
}

// public/js/features/guardia-board-state.mjs
var _gridBoard = null;
var _appShellInstalled = false;
var _entregaControlsInstalled = false;
var _guardiaViewBootstrapped = false;
var _elevatedFullWardPullScheduled = false;
var _entregaClickBusy = false;
function getGridBoard() {
  return _gridBoard;
}
function setGridBoard(board) {
  _gridBoard = board;
}
function isAppShellInstalled() {
  return _appShellInstalled;
}
function markAppShellInstalled() {
  _appShellInstalled = true;
}
function isEntregaControlsInstalled() {
  return _entregaControlsInstalled;
}
function markEntregaControlsInstalled() {
  _entregaControlsInstalled = true;
}
function isGuardiaViewBootstrapped() {
  return _guardiaViewBootstrapped;
}
function setGuardiaViewBootstrapped(value) {
  _guardiaViewBootstrapped = !!value;
}
function isElevatedFullWardPullScheduled() {
  return _elevatedFullWardPullScheduled;
}
function markElevatedFullWardPullScheduled() {
  _elevatedFullWardPullScheduled = true;
}
function isEntregaClickBusy() {
  return _entregaClickBusy;
}
function setEntregaClickBusy(value) {
  _entregaClickBusy = !!value;
}

// public/js/features/guardia-board-chrome.mjs
function resolveGuardiaGridRank(user) {
  if (hasElevatedTeamPrivileges(user)) return "R4";
  const raw = String(user?.rank || "").trim();
  if (raw === "R4") return "R4";
  return effectiveClinicalRank(user);
}
async function bootstrapGuardiaViewOnEnter(settings) {
  const userId = String(clinicalSessionContext.user?.user_id || "");
  if (!userId) return;
  const teams = clinicalSessionContext.teams || [];
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const now = /* @__PURE__ */ new Date();
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    teams,
    clinicalSessionContext.salaGuardiaToday || []
  );
  const onCallReceiver = userIsOnGuardiaCallToday(
    userId,
    rank,
    teams,
    now,
    salaGuardiaToday
  );
  if (onCallReceiver) {
    setGuardiaMode(true, { settings, renderGuardiaBoard, rerenderBoard: true });
  }
}
async function bootstrapGuardiaCensusData(settings) {
  await refreshGuardiaCensusFromDb(settings);
  await ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 3e3 });
  if (isGuardiaMode()) renderGuardiaBoard(settings);
}
function guardiaBoardSettings() {
  try {
    if (typeof window !== "undefined" && typeof window.loadSettings === "function") {
      return window.loadSettings();
    }
  } catch (_e) {
    void _e;
  }
  return null;
}
function handleEntregaPhaseButtonClick() {
  if (isEntregaClickBusy()) return;
  setEntregaClickBusy(true);
  void (async () => {
    try {
      await toggleEntregaPhase({
        settings: guardiaBoardSettings(),
        renderGuardiaBoard
      });
      syncEntregaPhaseChrome();
    } finally {
      setEntregaClickBusy(false);
    }
  })();
}
function installGuardiaEntregaControls() {
  if (isEntregaControlsInstalled() || typeof document === "undefined") return;
  markEntregaControlsInstalled();
  if (typeof window !== "undefined") {
    window.appShell = window.appShell || {};
    window.appShell.toggleEntregaPhase = handleEntregaPhaseButtonClick;
  }
  syncEntregaPhaseChrome();
}
function installGuardiaAppShell() {
  if (isAppShellInstalled() || typeof window === "undefined") return;
  markAppShellInstalled();
  wireGuardiaPatientActionSheetDismiss();
  installGuardiaEntregaControls();
  window.appShell = window.appShell || {};
  window.appShell.openEntregaModal = openEntregaModal;
  window.appShell.toggleEntregaPhase = handleEntregaPhaseButtonClick;
  window.addEventListener("guardia:turno-activo", () => {
    renderGuardiaBoard(null);
  });
  window.addEventListener("guardia:entrega-ended", () => {
    syncEntregaPhaseChrome();
    renderGuardiaBoard(null);
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installGuardiaEntregaControls, { once: true });
  } else {
    installGuardiaEntregaControls();
  }
}
function syncEntregaPhaseChrome(opts = {}) {
  const btn = document.getElementById("btn-guardia-entrega-phase");
  const status = document.getElementById("guardia-entrega-phase-status");
  const phase = getEntregaPhase();
  const active = !!phase?.active;
  const rosterOpen = opts.rosterOpen ?? isEntregaRosterOpen();
  if (btn) {
    btn.hidden = !!rosterOpen;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.textContent = "Entrega";
    btn.title = active ? "Continuar entrega \u2014 listado de pacientes" : opts.turnoActivo ? "Documentar entrega \u2014 abre el listado por paciente" : "Iniciar entrega al R1 de guardia de tu sala";
  }
  if (status) {
    if (active && phase?.coveringLabel && !rosterOpen) {
      status.hidden = false;
      status.textContent = `Entregando a ${phase.coveringLabel} \xB7 pulsa Entrega para abrir el listado`;
    } else {
      status.hidden = true;
      status.textContent = "";
    }
  }
}
function wireGuardiaEntregaPhaseButton(_settings) {
  installGuardiaEntregaControls();
  const btn = document.getElementById("btn-guardia-entrega-phase");
  if (!btn || btn._guardiaEntregaWired) return;
  btn._guardiaEntregaWired = true;
  btn.addEventListener("click", () => handleEntregaPhaseButtonClick());
  syncEntregaPhaseChrome();
}
function pendingTodoCount(pid) {
  return storage.getTodos(pid).filter((t) => !t.completed).length;
}
function labsSnippetForPatient(pid) {
  const history = storage.getLabHistory();
  const rows = Array.isArray(history[pid]) ? history[pid] : [];
  if (!rows.length) return "";
  const last = rows[rows.length - 1];
  const text = String(last?.text || last?.raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const line = text.split("\n").find((l) => /★|crit|alter|↑|↓/i.test(l)) || text.split("\n")[0] || text;
  return line.slice(0, 48);
}
function enrichPatientForGuardiaCard(p, guardiasMap, teamCtx = {}) {
  const base = mapPatientForGuardiaGrid(p);
  const g = guardiasMap.get(base.id);
  const dxList = Array.isArray(p.diagnosticosList) ? p.diagnosticosList : [];
  const dxText = diagnosticosTextForCenso(dxList, { max: 2 }) || String(p.diagnosticosText || p.motivo || "").trim() || "Sin diagn\xF3stico registrado";
  const pendingCount = g?.pendientes_json ? listActiveProcedimientos(normalizePendientesJson(g.pendientes_json)).length : 0;
  const isCritical = isGuardiaChipCritical(g);
  const entregaMarkers = g ? entregaChipMarkerIds(g) : [];
  const teams = teamCtx.teams || [];
  const assignments = teamCtx.assignments || [];
  const now = teamCtx.now || (/* @__PURE__ */ new Date()).toISOString();
  const censusTeamId = resolvePatientCensusTeamId(p, teams, assignments, now);
  const team = censusTeamId ? teams.find((t) => String(t?.team_id || "") === censusTeamId) : null;
  return {
    ...base,
    dxText: dxText.toUpperCase(),
    pendingCount,
    labsSnippet: labsSnippetForPatient(base.id),
    isCritical,
    entregaMarkers,
    guardiaMeta: g,
    censusTeamId,
    censusTeamLabel: censusTeamId ? guardiaTeamGroupLabel(team) : GUARDIA_UNASSIGNED_TEAM_LABEL,
    // Keep chart fields for team / sala structural match in the grid.
    sala: p.sala,
    servicio: p.servicio,
    area: p.area
  };
}
function computeGuardiaSummary(censusPatients, guardiasMap) {
  let critical = 0;
  let pending = 0;
  let vitalsMonitored = 0;
  let vitalsOverdue = 0;
  let vitalsDueSoon = 0;
  censusPatients.forEach((p) => {
    const meta = guardiasMap.get(p.id) || p.guardiaMeta || {};
    if (p.isCritical) critical += 1;
    pending += p.pendingCount || 0;
    const doc = normalizePendientesJson(meta?.pendientes_json);
    if (vitalsStructuredMonitoringEnabled(doc.vitalsPlan)) vitalsMonitored += 1;
    const banner = vitalsBannerForGuardia(meta);
    if (banner.cls === "breached") vitalsOverdue += 1;
    else if (banner.cls === "warning") vitalsDueSoon += 1;
  });
  return {
    total: censusPatients.length,
    critical,
    pending,
    vitalsMonitored,
    vitalsOverdue,
    vitalsDueSoon
  };
}
function renderGuardiaSummaryTiles(summary, opts = {}) {
  const host = document.getElementById("guardia-summary");
  if (!host) return;
  const vitalsTitle = summary.vitalsMonitored > 0 ? `${summary.vitalsMonitored} con monitoreo de signos` + (summary.vitalsOverdue > 0 ? ` \xB7 ${summary.vitalsOverdue} vencido${summary.vitalsOverdue === 1 ? "" : "s"}` : summary.vitalsDueSoon > 0 ? ` \xB7 ${summary.vitalsDueSoon} pronto` : "") : "Sin plan de signos en entregas guardadas";
  const stats = [
    {
      value: summary.total,
      label: "censo",
      title: opts.turnoActivo ? "En censo \u2014 turno activo" : "En censo \u2014 tu alcance"
    },
    {
      value: summary.critical,
      label: "cr\xEDticos",
      hot: summary.critical > 0,
      title: "Cr\xEDticos \u2014 revisar primero"
    },
    {
      value: summary.vitalsMonitored || 0,
      label: "signos",
      hot: summary.vitalsOverdue > 0,
      warn: !summary.vitalsOverdue && summary.vitalsDueSoon > 0,
      title: vitalsTitle
    },
    {
      value: summary.pending,
      label: "estudios",
      title: "Estudios pendientes de entrega"
    }
  ];
  host.innerHTML = stats.map((stat) => {
    const classes = ["guardia-stat"];
    if (stat.hot) classes.push("guardia-stat--hot");
    else if (stat.warn) classes.push("guardia-stat--warn");
    return `<div class="${classes.join(" ")}" title="${stat.title}"><span class="guardia-stat-value">${stat.value}</span><span class="guardia-stat-label">${stat.label}</span></div>`;
  }).join("");
}
function renderGuardiaCensusHead(count, state) {
  const host = document.getElementById("guardia-census-head");
  if (!host) return;
  const parts = [];
  if (state.critical > 0) parts.push(`${state.critical} cr\xEDtico${state.critical === 1 ? "" : "s"}`);
  if (state.vitalsOverdue > 0) {
    parts.push(`${state.vitalsOverdue} signo${state.vitalsOverdue === 1 ? "" : "s"} vencido${state.vitalsOverdue === 1 ? "" : "s"}`);
  }
  const byTeam = hasElevatedTeamPrivileges(clinicalSessionContext.user);
  const sortHint = parts.length ? `${parts.join(" \xB7 ")} arriba \xB7 por cama` : byTeam ? "Agrupados por equipo \xB7 cr\xEDticos e inestables arriba \xB7 por cama" : "Orden por cama \xB7 cr\xEDticos e inestables arriba";
  host.innerHTML = `
    <div class="guardia-census-head-inner">
      <div class="guardia-census-head-main">
        <h2 class="guardia-section-title">
          <span class="guardia-section-title-label">Pacientes</span>
          <span class="guardia-census-count">${count}</span>
        </h2>
        <p class="guardia-section-sub">${sortHint}</p>
      </div>
    </div>`;
  appendGuardiaLearnNudge(host);
}
function syncGuardiaLearnNudgeChrome() {
  const host = document.getElementById("guardia-census-head");
  if (!host) return;
  void import("/mobile/js/chunks/guardia-v7-progress-HEBQAL2C.js").then(function(progressMod) {
    const inner = host.querySelector(".guardia-census-head-inner");
    if (!inner) return;
    const btn = inner.querySelector(".guardia-learn-nudge-btn");
    if (progressMod.isGuardiaV7TrackComplete()) btn?.remove();
  });
}
function appendGuardiaLearnNudge(host) {
  void Promise.all([
    import("/mobile/js/chunks/guardia-v7-progress-HEBQAL2C.js"),
    import("/mobile/js/chunks/learn-hub-TVBSABBF.js")
  ]).then(function(mods) {
    const progressMod = mods[0];
    const hubMod = mods[1];
    const inner = host.querySelector(".guardia-census-head-inner");
    if (!inner) return;
    const existing = inner.querySelector(".guardia-learn-nudge-btn");
    if (progressMod.isGuardiaV7TrackComplete()) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const summary = progressMod.guardiaV7ProgressSummary();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-med-secondary guardia-learn-nudge-btn";
    btn.textContent = `Gu\xEDa guardia ${summary.completed}/${summary.total}`;
    btn.title = "Abrir cap\xEDtulos de guardia en el Centro de aprendizaje";
    btn.addEventListener("click", function() {
      if (typeof hubMod.openLearnHub === "function") {
        hubMod.openLearnHub({ focusTrack: "guardia-v7" });
      }
    });
    inner.appendChild(btn);
  });
}
function wireGuardiaModeToggle(settings) {
  const btn = document.getElementById("btn-guardia-mode-toggle");
  if (!btn || btn._rpcGuardiaModeWired) return;
  btn._rpcGuardiaModeWired = true;
  syncGuardiaModeUI();
  btn.addEventListener("click", () => {
    toggleGuardiaMode({
      settings,
      renderGuardiaBoard
    });
  });
}
function syncGuardiaBoardChrome(state) {
  const scroll = document.getElementById("guardia-board-scroll");
  if (scroll) {
    scroll.classList.toggle("guardia-board-scroll--turno", state.turnoActivo);
    scroll.classList.toggle("guardia-board-scroll--roster", state.rosterOpen);
  }
  const filterHint = document.getElementById("guardia-census-filter-hint");
  const scopePanel = document.getElementById("guardia-census-scope");
  const vitalsSection = document.getElementById("guardia-vitals-section");
  const metricsPanel = document.getElementById("guardia-metrics-panel");
  if (metricsPanel) metricsPanel.hidden = !!state.rosterOpen;
  if (vitalsSection) vitalsSection.hidden = !state.turnoActivo || !!state.rosterOpen;
  if (filterHint) {
    const elevated = hasElevatedTeamPrivileges(clinicalSessionContext.user);
    const alcanceOn = !!clinicalSessionContext.guardiaMode;
    filterHint.textContent = alcanceOn ? "Solo pacientes que te entregaron en este turno." : elevated ? "Censo completo del servicio \u2014 acota con Filtros censo arriba." : state.turnoActivo ? "Todos los pacientes en tu alcance durante el turno." : "Todos los pacientes en tu alcance cl\xEDnico.";
    filterHint.classList.toggle("visually-hidden", !elevated && !alcanceOn);
  }
  if (scopePanel) {
    scopePanel.classList.toggle("guardia-census-scope--narrow", !!clinicalSessionContext.guardiaMode);
  }
  syncEntregaPhaseChrome({ rosterOpen: state.rosterOpen, turnoActivo: state.turnoActivo });
  syncGuardiaPhaseBar({
    ...state,
    onBeginEntrega: handleEntregaPhaseButtonClick
  });
}

// public/js/features/guardia-board-render.mjs
function clearInactiveGuardiaBoard() {
  setGuardiaViewBootstrapped(false);
  teardownGuardiaPhaseBar();
  document.documentElement.classList.remove("guardia-entrega-roster-open");
}
function ensureGuardiaBoardBootstrapped(settings) {
  installGuardiaAppShell();
  void import("/mobile/js/chunks/clinical-rotation-entry-2SRV3X5Y.js").then((mod) => {
    mod.syncClinicalRotationEntryChrome?.();
  });
  if (!isGuardiaViewBootstrapped()) {
    setGuardiaViewBootstrapped(true);
    void bootstrapGuardiaViewOnEnter(settings);
    void bootstrapGuardiaCensusData(settings);
  }
  wireGuardiaEntregaPhaseButton(settings);
  syncEntregaPhaseChrome();
}
function maybeOpenEntregaRoster(settings, entregaActive, turnoActivo) {
  if (!entregaActive || turnoActivo) return;
  const rosterHost = document.getElementById("entrega-roster-panel");
  if (rosterHost && !rosterHost.innerHTML.trim()) {
    openEntregaRosterPanel(settings);
  }
}
function scheduleElevatedWardPullIfNeeded(user) {
  if (!hasElevatedTeamPrivileges(user) || elevatedPatientFilters.teamId || isElevatedFullWardPullScheduled()) {
    return;
  }
  markElevatedFullWardPullScheduled();
  void ensureElevatedWardCensusOnDevice({
    allowLanPull: true,
    lanPullDelayMs: 3e3,
    teamFilterId: ""
  });
}
function buildGuardiaScopeContext() {
  const now = /* @__PURE__ */ new Date();
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    clinicalSessionContext.teams || [],
    clinicalSessionContext.salaGuardiaToday || []
  );
  const userId = String(clinicalSessionContext.user?.user_id || "");
  const clinicalRank = effectiveClinicalRank(clinicalSessionContext.user);
  const onCallGuardiaReceiver = userIsOnGuardiaCallToday(
    userId,
    clinicalRank,
    clinicalSessionContext.teams || [],
    now,
    salaGuardiaToday
  );
  const baseScope = getClinicalScopeContextForEvaluate();
  clinicalSessionContext.scopeContext = {
    ...baseScope,
    teams: clinicalSessionContext.teams || baseScope.teams,
    guardias: clinicalSessionContext.guardias || baseScope.guardias,
    salaGuardiaToday,
    guardiaMode: clinicalSessionContext.guardiaMode,
    onCallGuardiaReceiver,
    now
  };
  scheduleElevatedWardPullIfNeeded(clinicalSessionContext.user);
  return { salaGuardiaToday, onCallGuardiaReceiver };
}
function buildGuardiaCensusPatients(guardiasMap, gridViewContext) {
  let scopedPatients = patients.filter((p) => p && p.id && !p.isDemo && !p.archived);
  if (gridViewContext === "GUARDIA") {
    scopedPatients = filterPatientsForGuardiaCensus(
      scopedPatients,
      clinicalSessionContext.user,
      clinicalSessionContext.scopeContext,
      guardiasMap,
      elevatedPatientFilters
    );
  }
  const scope = clinicalSessionContext.scopeContext || getClinicalScopeContextForEvaluate();
  const teams = scope.teams || clinicalSessionContext.teams || [];
  const assignments = scope.assignments || [];
  const now = scope.now || (/* @__PURE__ */ new Date()).toISOString();
  return scopedPatients.map(
    (p) => enrichPatientForGuardiaCard(p, guardiasMap, { teams, assignments, now })
  );
}
function renderGuardiaVitalsIfTurno(turnoActivo, censusPatientIds) {
  if (!turnoActivo) return;
  renderGuardiaVitalsFeed(
    patients.filter((p) => p && p.id && !p.isDemo && !p.archived),
    censusPatientIds
  );
}
function ensureGuardiaGridBoard(gridViewContext) {
  const board = getGridBoard();
  if (!board) {
    setGridBoard(new UnifiedPatientGridBoard("guardia-census-grid", gridViewContext));
    return;
  }
  board.setViewContext(gridViewContext);
}
function wireGuardiaGridBoard({
  censusPatients,
  guardiasMap,
  gridRank,
  gridViewContext,
  turnoActivo,
  entregaActive,
  onCallGuardiaReceiver,
  settings
}) {
  const board = getGridBoard();
  if (!board) return;
  const showPatientActionMenu = shouldShowGuardiaPatientActionMenu({
    turnoActivo,
    entregaActive,
    onCallGuardiaReceiver,
    gridViewContext
  });
  board.chipOpensEntrega = !turnoActivo;
  board.chipGuardiaPatientMenu = showPatientActionMenu;
  board.onChipClick = (patientId) => {
    if (!turnoActivo) {
      const guardia = guardiasMap.get(patientId);
      openEntregaModal({
        patientId,
        guardiaId: guardia?.guardia_id,
        onConfirm: () => {
          void refreshGuardiaCensusFromDb(settings);
        }
      });
      return;
    }
    if (showPatientActionMenu) {
      const row = censusPatients.find((p) => String(p.id) === String(patientId));
      openGuardiaPatientActionSheet({
        patientId,
        patientLabel: row?.name ? String(row.name) : void 0
      });
    }
  };
  if (!censusPatients.length) {
    renderGuardiaCensusEmpty(board.container, {
      // clinicalSessionContext.guardiaMode = census filter «solo entregados» (not Guardia view).
      filterOn: !!clinicalSessionContext.guardiaMode,
      onShowAll: () => {
        setGuardiaMode(false, { settings, renderGuardiaBoard, rerenderBoard: true });
      }
    });
    board.stopVitalsTicker();
    return;
  }
  const scope = clinicalSessionContext.scopeContext || getClinicalScopeContextForEvaluate();
  board.drawCensusGrid(censusPatients, guardiasMap, gridRank, {
    teams: scope.teams || clinicalSessionContext.teams || [],
    assignments: scope.assignments || [],
    now: scope.now || (/* @__PURE__ */ new Date()).toISOString()
  });
  board.startVitalsTicker();
}
function renderGuardiaBoard(settings) {
  if (!isGuardiaMode()) {
    clearInactiveGuardiaBoard();
    return;
  }
  ensureGuardiaBoardBootstrapped(settings);
  const root = document.getElementById("appcontent-guardia");
  if (!root || root.getAttribute("aria-hidden") === "true") return;
  const guardiasMap = clinicalSessionContext.guardiasMap.size ? clinicalSessionContext.guardiasMap : buildGuardiasMap(clinicalSessionContext.guardias);
  const entregaActive = isEntregaPhaseActive();
  const turnoActivo = isTurnoActivo();
  const rosterOpen = isEntregaRosterOpen();
  const gridViewContext = loadGuardiaGridViewContext();
  wireGuardiaModeToggle(settings);
  syncGuardiaRotationToolbar();
  syncGuardiaTrustStrip();
  syncGuardiaBoardChrome({
    turnoActivo,
    entregaActive,
    rosterOpen,
    settings,
    renderGuardiaBoard
  });
  maybeOpenEntregaRoster(settings, entregaActive, turnoActivo);
  buildGuardiaScopeContext();
  const censusPatients = buildGuardiaCensusPatients(guardiasMap, gridViewContext);
  const summary = computeGuardiaSummary(censusPatients, guardiasMap);
  renderGuardiaSummaryTiles(summary, { turnoActivo });
  renderGuardiaCensusHead(censusPatients.length, {
    turnoActivo,
    entregaActive,
    vitalsOverdue: summary.vitalsOverdue,
    critical: summary.critical
  });
  renderGuardiaVitalsIfTurno(
    turnoActivo,
    censusPatients.map((p) => p.id)
  );
  void syncGuardiaIncomingStrip(settings);
  syncOrphanEntregasStrip(settings);
  wireClinicalTeamsControls();
  ensureGuardiaGridBoard(gridViewContext);
  wireGuardiaGridBoard({
    censusPatients,
    guardiasMap,
    gridRank: resolveGuardiaGridRank(clinicalSessionContext.user),
    gridViewContext,
    turnoActivo,
    entregaActive,
    onCallGuardiaReceiver: clinicalSessionContext.scopeContext?.onCallGuardiaReceiver,
    settings
  });
}

// public/js/features/guardia-board.mjs
function syncGuardiaModeButtonVisibility() {
  const show = isDbMode();
  const btn = document.querySelector('#header-mode-seg .header-mode-seg-btn[data-mode="guardia"]');
  if (btn) {
    if (show) btn.removeAttribute("hidden");
    else btn.setAttribute("hidden", "");
  }
}
if (typeof document !== "undefined" && !document._rpcInternoVitalsSyncedWired) {
  document._rpcInternoVitalsSyncedWired = true;
  document.addEventListener("rpc-interno-vitals-synced", () => {
    if (!isGuardiaMode()) return;
    void refreshGuardiaCensusFromDb().then(() => renderGuardiaBoard(null));
  });
}

// public/js/clinical-access-runtime/electron-api.mjs
function electronApi() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}

// public/js/clinical-access-runtime/scope-db.mjs
async function fetchClinicalScopeContextFromDb() {
  const api2 = electronApi();
  const userId = clinicalSessionContext.user?.user_id;
  if (!api2 || typeof api2.dbClinicalScopeContext !== "function" || !userId) {
    return clinicalSessionContext.scopeContext ?? null;
  }
  const res = await api2.dbClinicalScopeContext({ userId });
  if (!res || res.ok === false) {
    clinicalSessionContext.scopeContext = null;
    return null;
  }
  clinicalSessionContext.scopeContext = res.context ?? null;
  if (Array.isArray(res.context?.teams)) {
    clinicalSessionContext.teams = res.context.teams;
  }
  return clinicalSessionContext.scopeContext;
}
async function fetchClinicalTeamsFromDb() {
  const api2 = electronApi();
  if (!api2 || typeof api2.dbClinicalTeamsList !== "function") {
    clinicalSessionContext.teams = [];
    return [];
  }
  const res = await api2.dbClinicalTeamsList();
  if (!res || res.ok === false) {
    clinicalSessionContext.teams = [];
    return [];
  }
  const teams = Array.isArray(res.teams) ? res.teams : [];
  clinicalSessionContext.teams = teams;
  return teams;
}
async function fetchActiveRotationCycleFromDb() {
  const api2 = electronApi();
  if (!api2 || typeof api2.dbRotationCycleGet !== "function") return null;
  const res = await api2.dbRotationCycleGet();
  if (!res || res.ok === false) return null;
  return res.cycle ?? null;
}
async function fetchIncomingAssignmentsFromDb() {
  const api2 = electronApi();
  if (!api2 || typeof api2.dbRotationIncomingAssignments !== "function") return [];
  const res = await api2.dbRotationIncomingAssignments();
  if (!res || res.ok === false) return [];
  return Array.isArray(res.assignments) ? res.assignments : [];
}

// public/js/censo-meds-format.mjs
function medTitle(nombreRaw) {
  var s = String(nombreRaw || "").trim();
  if (!s) return "";
  s = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  var chunk = (s.split(/\s+(?=\d)/)[0] || "").trim();
  return (chunk || s).slice(0, 80).toUpperCase();
}
function formatDia(diaTratamiento) {
  if (diaTratamiento == null || diaTratamiento === "") return "";
  var n = Number(diaTratamiento);
  if (!Number.isFinite(n) || n < 0) return "";
  return "D\xEDa " + String(Math.floor(n));
}
function formatCensoMedsFromReceta(block) {
  if (!block) return "";
  var lines = [];
  var items = Array.isArray(block.items) ? block.items : [];
  var rescateAdded = false;
  items.forEach(function(it) {
    if (!it || it.suspendido) return;
    if (isNutritionMedicationItem(it)) return;
    if (isInsulinRescateMedicationItem(it)) {
      if (!rescateAdded) {
        lines.push(INSULIN_RESCATE_NM_LABEL);
        rescateAdded = true;
      }
      return;
    }
    var name = medTitle(it.nombreRaw);
    if (!name) return;
    var dia = formatDia(it.diaTratamiento);
    lines.push(dia ? name + " \xB7 " + dia : name);
  });
  return lines.join("\n");
}

// public/js/cultivo-block-core.mjs
var CULTIVO_BASE_START_PATTERNS = [
  /^CULTIVO\b/i,
  null,
  /^BACTERIOLOGIA\b/i,
  /^UROCULTIVO\b/i,
  /^HEMOCULTIVO\b/i,
  /^FUNGICULTIVO\b/i,
  /^TINCION\s+DE\s+GRAM/i,
  /^CATETER\b/i,
  /^ATB\b/i,
  /^Cuenta:/i,
  /^[•\u2022\u00B7]\s*/,
  /^Cultivos$/i
];
var LAB_SECTION_BASE = /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS|SEROL|GS|HECES|LIPASA|TROP|TIR|ENDO|CARD|FE|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)\b/i;
function matchesAnyPattern(t, patterns) {
  for (var i = 0; i < patterns.length; i++) {
    var p = patterns[i];
    if (p === null) {
      if (isParsedCultivoHeaderLine(t)) return true;
    } else if (p.test(t)) {
      return true;
    }
  }
  return false;
}
function matchesAllCapsSiteHeader(t) {
  if (t.indexOf("	") !== -1) return false;
  if (!/^[A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ]+){1,4}$/.test(t)) return false;
  var ws = t.split(/\s+/).filter(Boolean);
  if (ws.length < 2 || ws[0].length < 5 || ws[1].length < 3) return false;
  if (/^(INTERCONSULTA|SALA|SERVICIO|UNIDAD|PACIENTE|HOSPITAL|AREA|CONTROL|DEPARTAMENTO)/i.test(ws[0])) {
    return false;
  }
  if (/^(CARDIOLOGIA|CIRUGIA|URGENCIAS|INTERNA|MEDICINA|PEDIATRIA|NEFROLOGIA|HEMATOLOGIA)$/i.test(ws[1])) {
    return false;
  }
  return true;
}
function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (matchesAnyPattern(t, CULTIVO_BASE_START_PATTERNS)) return true;
  if (matchesAllCapsSiteHeader(t)) return true;
  return false;
}
function isLabSectionHeaderLine(s) {
  return LAB_SECTION_BASE.test(String(s).trim());
}
function splitResLabsByTipo(rows) {
  var labs = [];
  var cultivo = [];
  var inCultivo = false;
  (rows || []).forEach(function(row) {
    var raw = row == null ? "" : row;
    var s = String(raw).trim();
    if (isLabSectionHeaderLine(s)) {
      inCultivo = false;
      labs.push(raw);
      return;
    }
    if (inCultivo) {
      cultivo.push(raw);
      return;
    }
    if (isCultivoBlockStartLine(s)) {
      inCultivo = true;
      cultivo.push(raw);
      return;
    }
    labs.push(raw);
  });
  return { labs, cultivo };
}
function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || "").replace(/\s+/g, " ").trim();
  var beforeColon = (s.split(":")[0] || s).toUpperCase();
  if (/^HEMOCULTIVO\b/.test(beforeColon)) return "hemo";
  if (/^UROCULTIVO\b/.test(beforeColon)) return "uro";
  if (/^FUNGICULTIVO\b/.test(beforeColon)) return "fungi";
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return "gram";
  if (/^CATETER\b/.test(beforeColon)) return "cateter";
  return "otro";
}
function completePartialFechaForCultivo(dm, set) {
  if (!dm) return "";
  var parts = String(dm).trim().split("/");
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? "20" + parts[2] : parts[2];
    var joined = parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = (/* @__PURE__ */ new Date()).getFullYear();
  if (set && set.fecha && set.fecha !== "Anterior") {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, "");
    if (typeof ms === "number" && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y;
}
function cultureBlockLooksNegative(left, right) {
  var L = (left + " " + right).toUpperCase();
  if (!String(right || "").trim()) return true;
  return /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(
    L
  );
}
function germHintFromCultivoHeadLine(headLine) {
  var line = String(headLine || "").replace(/\s+/g, " ").trim();
  var colon = line.lastIndexOf(":");
  if (colon >= 0) {
    var right = line.slice(colon + 1).trim();
    if (right) return right;
  }
  return line;
}
function germQueryFromCultivoChunkHead(headLine) {
  var h = germHintFromCultivoHeadLine(headLine);
  var base = h.split(/\s*·\s*/)[0].trim();
  return base || h;
}
function isCultureTableHeaderLine(t) {
  return isParsedCultivoHeaderLine(t);
}
function parseCultureHeaderLeftRight(line) {
  var colon = line.indexOf(":");
  return {
    left: colon >= 0 ? line.slice(0, colon).trim() : line,
    right: colon >= 0 ? line.slice(colon + 1).trim() : ""
  };
}
function parseCultureSitioAndFecha(left, set) {
  var fechaMuestra = "";
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (!dm) return { fechaMuestra, sitio };
  fechaMuestra = completePartialFechaForCultivo(dm[1], set);
  sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, "").trim();
  return { fechaMuestra, sitio };
}
function resolveCultureOrganismo(left, right) {
  var organismo = right.replace(/\s+/g, " ").trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = "Negativo";
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = "Negativo";
  else if (!organismo) organismo = "\u2014";
  return { organismo, negativo };
}
function cultureSortKeyMs(sortMs, fechaMuestra) {
  if (!fechaMuestra) return sortMs;
  var fmNorm = normalizeFechaLabHistory(fechaMuestra) || fechaMuestra;
  var fmParsed = parseFechaLabToMs(fmNorm, "");
  if (typeof fmParsed === "number" && isFinite(fmParsed)) return fmParsed;
  return sortMs;
}
function cultureSetSortMs(set) {
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs === "number" && isFinite(sortMs)) return sortMs;
  return 0;
}
function parseCultureBlockFromLineArray(lines, set, seq) {
  var rawHeader = String(lines[0] || "");
  var line = rawHeader.replace(/\s+/g, " ").trim();
  var lr = parseCultureHeaderLeftRight(line);
  var sf = parseCultureSitioAndFecha(lr.left, set);
  var org = resolveCultureOrganismo(lr.left, lr.right);
  var sortMs = cultureSetSortMs(set);
  return {
    row: {
      fechaMuestra: sf.fechaMuestra || "\u2014",
      sitio: sf.sitio || "\u2014",
      organismo: org.organismo,
      cuenta: parseCuentaFromCultivoChunkLines(lines.slice(1)) || "",
      negativo: org.negativo,
      sortMs,
      sortKeyMs: cultureSortKeyMs(sortMs, sf.fechaMuestra),
      tipoKey: classifyCultureTipoKeyFromHeaderLine(rawHeader),
      labSetId: set && set.id != null ? set.id : "",
      _seq: typeof seq === "number" ? seq : 0
    }
  };
}
function normalizeCultivoOrganismoQuery(organismoQuery) {
  return String(organismoQuery || "").replace(/\s+/g, " ").trim().toUpperCase();
}
function cultivoChunkMatchesQuery(head, q) {
  var gq = germQueryFromCultivoChunkHead(head).replace(/\s+/g, " ").trim().toUpperCase();
  if (!gq) return false;
  if (gq === q || gq.indexOf(q) !== -1 || q.indexOf(gq) !== -1) return true;
  var gTok = gq.split(/\s+/).filter(Boolean)[0] || "";
  var qTok = q.split(/\s+/).filter(Boolean)[0] || "";
  return gTok.length > 3 && qTok.length > 3 && (gTok === qTok || gq.indexOf(qTok) === 0 || q.indexOf(gTok) === 0);
}
function splitCultivoEntryChunks(entry) {
  return String(entry || "").split(/\n\n+/).map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function findCultivoChunkInSet(set, organismoQuery) {
  if (!set || !set.resLabs) return null;
  var q = normalizeCultivoOrganismoQuery(organismoQuery);
  if (!q || q === "\u2014") return null;
  var cult = splitResLabsByTipo(set.resLabs).cultivo;
  for (var ei = 0; ei < cult.length; ei++) {
    var chunks = splitCultivoEntryChunks(cult[ei]);
    for (var ci = 0; ci < chunks.length; ci++) {
      var head = chunks[ci].split(/\n/)[0] || "";
      if (cultivoChunkMatchesQuery(head, q)) return chunks[ci];
    }
  }
  return null;
}

// public/js/censo-cultivo-format.mjs
function buildLabSetDateLine(set) {
  if (!set) return "";
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim();
  var rawHora = normalizeHoraLabHistory(set.hora);
  if (!rawDate) return "";
  return rawHora ? rawDate + " " + rawHora.slice(0, 5) : rawDate;
}
var CENSO_MAX_CULTIVO_REPORTS = 3;
function extractCultivoTableRowsFromLabHistory(history) {
  var rows = [];
  var seq = 0;
  sortLabHistoryChronological(history || []).forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = splitResLabsByTipo(set.resLabs).cultivo;
    cult.forEach(function(chunk) {
      var sections = String(chunk || "").split(/\n\n+/).map(function(s) {
        return s.trim();
      }).filter(Boolean);
      sections.forEach(function(sec) {
        var lines = sec.split(/\r?\n/).map(function(l) {
          return l.replace(/\*+$/g, "").trim();
        }).filter(function(l) {
          return l;
        });
        if (!lines.length) return;
        if (!isCultureTableHeaderLine(lines[0])) return;
        rows.push(parseCultureBlockFromLineArray(lines, set, seq++).row);
      });
    });
  });
  return rows;
}
function filterCultivoRowsSignificantFlip(rows) {
  function seriesKey(r) {
    return (r.tipoKey || "otro") + "" + String(r.sitio || "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  var bySeries = /* @__PURE__ */ Object.create(null);
  rows.forEach(function(r) {
    var k = seriesKey(r);
    if (!bySeries[k]) bySeries[k] = [];
    bySeries[k].push(r);
  });
  var out = [];
  Object.keys(bySeries).forEach(function(k) {
    var arr = bySeries[k].slice().sort(function(a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return da - db;
      return (a._seq || 0) - (b._seq || 0);
    });
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (!r.negativo) {
        out.push(r);
        continue;
      }
      var prev = arr[i - 1];
      var next = arr[i + 1];
      if (prev && !prev.negativo || next && !next.negativo) out.push(r);
    }
  });
  return out;
}
function formatCultivosForCenso(labHistory2, maxReports) {
  var max = maxReports != null ? maxReports : CENSO_MAX_CULTIVO_REPORTS;
  var flat = extractCultivoTableRowsFromLabHistory(labHistory2);
  var display = filterCultivoRowsSignificantFlip(flat);
  display.sort(function(a, b) {
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (db !== da) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
  if (!display.length) return "";
  var setById = /* @__PURE__ */ Object.create(null);
  (labHistory2 || []).forEach(function(set2) {
    if (set2 && set2.id != null) setById[String(set2.id)] = set2;
  });
  var blocks = [];
  for (var i = 0; i < display.length && blocks.length < max; i++) {
    var r = display[i];
    var set = setById[String(r.labSetId)];
    if (!set) continue;
    var chunk = findCultivoChunkInSet(set, r.organismo);
    if (!chunk) continue;
    var text = formatCultivoCondensedForCopy(chunk, buildLabSetDateLine(set) || "");
    if (text.trim()) blocks.push(text.trim());
  }
  return blocks.join("\n\n");
}

// public/js/censo-table-style.mjs
var CENSO_LAB_PANEL_CODES = "BH|QS|ELECTROLITOS|PFHs|PFH|GASES|COAG|ORINA|ESC|LIPASA|PROCALCITONINA|HCG|TROP|GS|SEROL";
var LAB_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
var LAB_DATE_LEAD_RE = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+)$/;
var LAB_PANEL_LINE_RE = new RegExp(
  "^(" + CENSO_LAB_PANEL_CODES + ")\\s*(?:[:\xB7]|\\s)",
  "i"
);
var SIGNOS_LABEL_RE = /^[A-Z0-9°]+\s*:/;
function normalizeCensoPanelLine(line) {
  var s = String(line || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.replace(/^([A-Za-z0-9]+)\s*:\s*/, "$1 \xB7 ");
}
function splitCensoLabPanelsLine(text) {
  var s = String(text || "").trim();
  if (!s) return [];
  var splitRe = new RegExp(
    "(?=\\b(?:" + CENSO_LAB_PANEL_CODES + ")\\s*(?:[:\xB7]|\\s))",
    "gi"
  );
  var parts = s.split(splitRe).map(function(p) {
    return normalizeCensoPanelLine(p);
  });
  parts = parts.filter(Boolean);
  return parts.length ? parts : [normalizeCensoPanelLine(s)];
}
function reflowLabsForCensoDisplay(lines) {
  var out = [];
  (lines || []).forEach(function(line) {
    var s = String(line || "").trim();
    if (!s) return;
    var lead = s.match(LAB_DATE_LEAD_RE);
    if (lead) {
      out.push(lead[1]);
      s = lead[2];
    } else if (LAB_DATE_RE.test(s)) {
      out.push(s);
      return;
    }
    splitCensoLabPanelsLine(s).forEach(function(row) {
      out.push(row);
    });
  });
  return out;
}
function classifyCensoTableLine(line, colKey, lineIndex) {
  var s = String(line || "").trim();
  if (!s || s === "\u2014") return "default";
  if (colKey === "paciente") {
    return lineIndex === 0 ? "emphasis" : "muted";
  }
  if (colKey === "labs") {
    if (LAB_DATE_RE.test(s)) return "lab-date";
    if (LAB_PANEL_LINE_RE.test(s)) return "lab-panel";
    return "default";
  }
  if ((colKey === "signos" || colKey === "io") && SIGNOS_LABEL_RE.test(s)) {
    return "label-led";
  }
  if (colKey === "dx") return "emphasis";
  return "default";
}

// public/js/censo-labs-format-lines.mjs
var PANEL_ORDER = ["BH", "QS", "ELECTROLITOS", "PFHs", "GASES", "COAG", "ORINA", "OTRO"];
function formatLabPair(key, val) {
  if (val == null || val === "") return "";
  var v = String(val).trim();
  if (!v) return "";
  return key + " " + v;
}
function linesFromParsedSection(section, keys) {
  if (!section || typeof section !== "object") return [];
  var parts = [];
  (keys || Object.keys(section)).forEach(function(k) {
    var line = formatLabPair(k, section[k]);
    if (line) parts.push(line);
  });
  return parts;
}
function pushLabTextLines(lines, text) {
  String(text || "").split(/\r?\n/).forEach(function(subline) {
    var cleaned = subline.replace(/\t/g, " ").replace(/  +/g, " ").trim();
    if (cleaned) lines.push(cleaned);
  });
}
function linesFromParsedBySectionFull(pb) {
  var blockLines = [];
  var seen = /* @__PURE__ */ Object.create(null);
  PANEL_ORDER.forEach(function(panelName) {
    seen[panelName] = true;
    var sec = pb[panelName] || pb[panelName.toLowerCase()];
    if (!sec && panelName === "OTRO") return;
    var panelLines = linesFromParsedSection(sec, null);
    if (panelLines.length) {
      blockLines.push(panelName + " \xB7 " + panelLines.join("  "));
    }
  });
  Object.keys(pb).forEach(function(panelName) {
    if (seen[panelName] || seen[panelName.toLowerCase()]) return;
    var sec = pb[panelName];
    if (!sec || typeof sec !== "object" || Array.isArray(sec)) return;
    var panelLines = linesFromParsedSection(sec, null);
    if (panelLines.length) {
      blockLines.push(panelName + " \xB7 " + panelLines.join("  "));
    }
  });
  return blockLines;
}

// public/js/censo-labs-format-compact.mjs
function appendLabChunks(lines, set, sp) {
  var bhExtDone = false;
  sp.labs.forEach(function(chunk) {
    if (isCitoquimInterpretacionResLabChunk(chunk)) return;
    pushLabTextLines(lines, chunk);
    if (!bhExtDone && set.bhExtras && typeof set.bhExtras === "object") {
      var ext = formatBhExtrasDisplayLine(set.bhExtras, set.sourceText);
      if (ext) {
        pushLabTextLines(lines, ext);
        bhExtDone = true;
      }
    }
  });
}
function appendParsedSection(lines, set) {
  var pb = set.parsedBySection || set.parsed || null;
  if (!pb || typeof pb !== "object" || Array.isArray(pb)) return;
  linesFromParsedBySectionFull(pb).forEach(function(ln) {
    lines.push(ln);
  });
}
function formatLabsForCensoCompactBody(sets) {
  var sorted = sortLabHistoryChronological(sets || []).slice(0, 1);
  if (!sorted.length) return [];
  var set = sorted[0];
  var fecha = set.fecha && set.fecha !== "Anterior" ? String(set.fecha).trim() : "";
  var lines = [];
  if (fecha) lines.push(fecha);
  var cleanResLabs = sanitizeResLabsChunks(set.resLabs || []);
  var sp = splitResLabsByTipo(cleanResLabs);
  var hasLabChunks = sp.labs.some(function(r) {
    return String(r || "").trim();
  });
  if (hasLabChunks) appendLabChunks(lines, set, sp);
  else appendParsedSection(lines, set);
  if (!lines.length || fecha && lines.length === 1) return [];
  return reflowLabsForCensoDisplay(lines.map(normalizeCensoPanelLine));
}

// public/js/censo-labs-format.mjs
function formatLabsForCensoCompact(sets) {
  return formatLabsForCensoCompactBody(sets);
}

// public/js/censo-pendientes-format.mjs
var CENSO_PENDIENTES_TIERS = ["alta", "media", "baja"];
function formatPendientesForCenso(todos, maxCount) {
  maxCount = maxCount == null ? 3 : maxCount;
  var open = (todos || []).filter(function(t) {
    return t && !t.completed && String(t.text || "").trim();
  });
  if (!open.length) return [];
  for (var i = 0; i < CENSO_PENDIENTES_TIERS.length; i++) {
    var tier = CENSO_PENDIENTES_TIERS[i];
    var matched = open.filter(function(t) {
      return normalizeTodoPriority(t.priority) === tier;
    });
    if (!matched.length) continue;
    matched.sort(comparePendientesForCenso);
    return matched.slice(0, maxCount).map(function(t) {
      return String(t.text).trim();
    });
  }
  return [];
}
function comparePendientesForCenso(a, b) {
  if (a.createdAt && b.createdAt) {
    return String(b.createdAt).localeCompare(String(a.createdAt));
  }
  return 0;
}

// public/js/features/estado-actual-parse-variants.mjs
var SOPORTE_FROM_TAIL = [
  [/VM\s+NO\s+INVASIVA|VMNI|VNI/i, "VM no invasiva"],
  [/TRAQUEOSTOM[ÍI]A|\bTQT\b/i, "Traqueostom\xEDa"],
  [/ALTO\s+FLUJO|OAF\b/i, "Alto flujo"],
  [/PUNTILLAS?\s+NASALES?|C[Nn]?\s*AF/i, "Puntillas nasales"],
  [/AIRE\s+AMBIENTE|\bAA\b/i, "Aire ambiente"]
];
function soporteFromSatTail(tail) {
  var s = String(tail || "").trim();
  if (!s) return null;
  var u = s.toUpperCase();
  for (var i = 0; i < SOPORTE_FROM_TAIL.length; i++) {
    if (SOPORTE_FROM_TAIL[i][0].test(u)) return SOPORTE_FROM_TAIL[i][1];
  }
  return null;
}
function parseSatLineVariants(line) {
  var m = line.match(
    /^(?:SATURACI(?:O|Ó)N(?:\s+O2)?|SAT(?:O2)?|SPO2)\s*:?\s*([\d.,]+)\s*%?\s*(.*)$/i
  );
  if (!m) return null;
  var n = Number(String(m[1]).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return { value: n, soporteHint: soporteFromSatTail(m[2]) };
}
function stripVitalUnitSuffix(raw) {
  return String(raw || "").replace(/\s*(?:LPM|RPM|X\/MIN|\/MIN|MMHG|MM\s*HG|MG\/DL|CC|ML)\s*$/i, "").trim();
}

// public/js/features/estado-actual-parser.mjs
function parseNumberToken(raw) {
  if (raw == null) return null;
  var s = String(raw).trim().replace(/\s/g, "").replace(/,/g, "");
  if (!s) return null;
  var n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function parseGlucometriaToken(token) {
  var s = String(token || "").trim();
  if (!s) return null;
  var m = s.match(/^([\d.,]+)(?:\s*(?:@|\s)\s*(\d{1,2}:\d{2}))?$/i);
  if (!m) {
    m = s.match(/^([\d.,]+)\s*\(\s*(\d{1,2}:\d{2})\s*\)$/i);
  }
  if (!m) return null;
  var value = parseNumberToken(m[1]);
  if (value == null) return null;
  var out = { value };
  if (m[2]) {
    var parts = m[2].split(":");
    out.time = pad2(parts[0]) + ":" + pad2(parts[1]);
  }
  return out;
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function splitGlucoseList(rest) {
  var s = String(rest || "").replace(/\s*MG\s*\/?\s*DL\s*$/i, "").trim();
  if (!s) return [];
  var tokens = [];
  var buf = "";
  var depth = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (ch === "(") {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      if (buf.trim()) tokens.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) tokens.push(buf.trim());
  return tokens;
}
function parseTempLine(line) {
  var m = line.match(
    /^(?:T[°º]?\s*:?|TEMP(?:ERATURA)?\s*:?)\s*([\d.,]+)\s*(?:°\s*C|°C)?(?:\s*(?:@|\s|-|a\s+las?\s+)?\s*(\d{1,2}:\d{2}))?/i
  );
  if (!m) return null;
  var temp = parseNumberToken(m[1]);
  if (temp == null) return null;
  var out = { temp };
  if (m[2]) {
    var p = m[2].split(":");
    out.time = pad2(p[0]) + ":" + pad2(p[1]);
  }
  return out;
}
function parseVitalLine(trimmed, result) {
  var temp = parseTempLine(trimmed);
  if (temp) {
    result.vitals.temp = temp.temp;
    if (temp.time) result.alteredAt.temp = temp.time;
    result.recognized.push("temp");
    return true;
  }
  var fc = trimmed.match(/^(?:FC|F\.?\s*C\.?)\s*:?\s*([\d.,]+)/i);
  if (fc) {
    result.vitals.fc = parseNumberToken(stripVitalUnitSuffix(fc[1]));
    result.recognized.push("fc");
    return true;
  }
  var fr = trimmed.match(/^(?:FR|F\.?\s*R\.?)\s*:?\s*([\d.,]+)/i);
  if (fr) {
    result.vitals.fr = parseNumberToken(stripVitalUnitSuffix(fr[1]));
    result.recognized.push("fr");
    return true;
  }
  var sat = parseSatLineVariants(trimmed);
  if (sat != null) {
    result.vitals.sat = sat.value;
    if (sat.soporteHint) result.soporteHint = sat.soporteHint;
    result.recognized.push("sat");
    return true;
  }
  var ta = trimmed.match(/^(?:TA|T\.?\s*A\.?)\s*:?\s*([\d.,]+)\s*\/\s*([\d.,]+)/i);
  if (ta) {
    result.vitals.tas = parseNumberToken(ta[1]);
    result.vitals.tad = parseNumberToken(ta[2]);
    result.recognized.push("ta");
    return true;
  }
  return false;
}
function parseDxtLine(trimmed, result) {
  var dxt = trimmed.match(/^(?:DXT|DESTROX(?:IAS)?|GLUCOMETR(?:ÍA|IA)?(?:S)?)\s*:?\s*(.+)$/i);
  if (!dxt) return false;
  var tokens = splitGlucoseList(dxt[1]);
  for (var i = 0; i < tokens.length; i++) {
    var g = parseGlucometriaToken(tokens[i]);
    if (g) result.glucometrias.push(g);
  }
  if (tokens.length && !result.glucometrias.length) {
    result.warnings.push("No se pudieron leer valores DXT en: " + dxt[1]);
  } else {
    result.recognized.push("dxt");
  }
  return true;
}
function parseIoLine(trimmed, result) {
  var ing = trimmed.match(/^(?:I|ING(?:RESOS)?)\s*:?\s*(.+)$/i);
  if (ing) {
    result.io.ing = parseIoIngresoField(ing[1]);
    result.recognized.push("ing");
    return true;
  }
  var evac = trimmed.match(/^(?:EVAC|EVACUAC(?:IONES)?)\s*:?\s*(.+)$/i);
  if (evac) {
    result.io.evac = parseIoEvacField(evac[1]);
    result.recognized.push("evac");
    return true;
  }
  var egr = trimmed.match(/^(?:E(?!VAC)|EGR(?:ESOS)?)\s*:?\s*(.+)$/i);
  if (egr) {
    var egrBody = String(egr[1]).trim();
    if (/^(?:NC|NO\s+CUANTIFICADA)$/i.test(egrBody)) {
      result.io.egrParts = [{ kind: "diuresis", label: "DIURESIS", value: "NC" }];
    } else {
      result.io.egrParts = parseIoEgresoLine(egrBody);
    }
    result.io.egr = diuresisValueFromParts(result.io.egrParts);
    result.recognized.push("egr");
    return true;
  }
  var bal = trimmed.match(/^(?:B|BAL(?:ANCE)?)\s*:?\s*(.+)$/i);
  if (bal) {
    result.recognized.push("balance-ignored");
    return true;
  }
  return false;
}
function parseLine(line, result) {
  var trimmed = String(line || "").trim();
  if (!trimmed) return;
  if (parseVitalLine(trimmed, result)) return;
  if (parseDxtLine(trimmed, result)) return;
  if (parseIoLine(trimmed, result)) return;
  result.warnings.push("L\xEDnea no reconocida: " + trimmed);
}
function scanInlineTemp(text, result) {
  if (result.recognized.indexOf("temp") >= 0) return;
  var t = text.match(/(?:T[°º]?\s*:?|TEMP(?:ERATURA)?\s*:?)\s*([\d.,]+)/i);
  if (!t) return;
  result.vitals.temp = parseNumberToken(t[1]);
  result.recognized.push("temp");
}
function scanInlineFc(text, result) {
  if (result.recognized.indexOf("fc") >= 0) return;
  var fc = text.match(/\bFC\s*:?\s*([\d.,]+)/i);
  if (!fc) return;
  result.vitals.fc = parseNumberToken(fc[1]);
  result.recognized.push("fc");
}
function scanInlineFr(text, result) {
  if (result.recognized.indexOf("fr") >= 0) return;
  var fr = text.match(/\bFR\s*:?\s*([\d.,]+)/i);
  if (!fr) return;
  result.vitals.fr = parseNumberToken(fr[1]);
  result.recognized.push("fr");
}
function scanInlineSat(text, result) {
  if (result.recognized.indexOf("sat") >= 0) return;
  var satM = text.match(
    /^(?:SATURACI(?:O|Ó)N(?:\s+O2)?|SAT(?:O2)?|SPO2)\s*:?\s*([\d.,]+)\s*%?\s*(.*)$/im
  );
  if (!satM) return;
  var satInline = parseSatLineVariants(satM[0]);
  if (!satInline) return;
  result.vitals.sat = satInline.value;
  if (satInline.soporteHint) result.soporteHint = satInline.soporteHint;
  result.recognized.push("sat");
}
function scanInlineTa(text, result) {
  if (result.recognized.indexOf("ta") >= 0) return;
  var ta = text.match(/\bTA\s*:?\s*([\d.,]+)\s*\/\s*([\d.,]+)/i);
  if (!ta) return;
  result.vitals.tas = parseNumberToken(ta[1]);
  result.vitals.tad = parseNumberToken(ta[2]);
  result.recognized.push("ta");
}
function scanInlineDxt(text, result) {
  if (result.recognized.indexOf("dxt") >= 0) return;
  var dxt = text.match(/\b(?:DXT|DESTROX(?:IAS)?)\s*:?\s*([^|\n]+?)(?:\s*(?:\||$)|\s+I\s*:|\s+E\s*:)/i);
  if (!dxt) dxt = text.match(/\b(?:DXT|DESTROX(?:IAS)?)\s*:?\s*(.+)$/im);
  if (!dxt) return;
  var tokens = splitGlucoseList(dxt[1]);
  for (var i = 0; i < tokens.length; i++) {
    var g = parseGlucometriaToken(tokens[i]);
    if (g) result.glucometrias.push(g);
  }
  if (result.glucometrias.length) result.recognized.push("dxt");
}
function scanInlineIng(text, result) {
  if (result.recognized.indexOf("ing") >= 0) return;
  var ing = text.match(/\bI\s*:?\s*([\d.,]+)/i);
  if (!ing) return;
  result.io.ing = parseIoIngresoField(ing[1]);
  result.recognized.push("ing");
}
function scanInlineEgr(text, result) {
  if (result.recognized.indexOf("egr") >= 0) return;
  var egr = text.match(/\bE\s*:?\s*(.+?)(?:\s*$)/im);
  if (!egr) return;
  result.io.egrParts = parseIoEgresoLine(egr[1]);
  result.io.egr = diuresisValueFromParts(result.io.egrParts);
  result.recognized.push("egr");
}
function scanInlineEvac(text, result) {
  if (result.recognized.indexOf("evac") >= 0) return;
  var evac = text.match(/\bEVAC(?:UAC(?:IONES)?)?\s*:?\s*(.+?)(?:\s*$)/im);
  if (!evac) return;
  result.io.evac = parseIoEvacField(evac[1]);
  result.recognized.push("evac");
}
function scanInlinePatterns(text, result) {
  scanInlineTemp(text, result);
  scanInlineFc(text, result);
  scanInlineFr(text, result);
  scanInlineSat(text, result);
  scanInlineTa(text, result);
  scanInlineDxt(text, result);
  scanInlineIng(text, result);
  scanInlineEgr(text, result);
  scanInlineEvac(text, result);
}
function parseEstadoActualPaste(raw) {
  var text = String(raw == null ? "" : raw).trim();
  var vitals = {
    tas: null,
    tad: null,
    fc: null,
    fr: null,
    temp: null,
    sat: null
  };
  var alteredAt = {};
  var glucometrias = [];
  var io = { ing: null, egr: null, egrParts: [], evac: null };
  var recognized = [];
  var warnings = [];
  if (!text) {
    return {
      ok: false,
      error: "Pega el texto de monitoreo",
      vitals,
      alteredAt,
      glucometrias,
      io,
      recognized,
      warnings
    };
  }
  var result = {
    ok: true,
    vitals,
    alteredAt,
    glucometrias,
    io,
    recognized,
    warnings,
    soporteHint: null
  };
  var lines = text.split(/\r?\n/).map(function(l) {
    return l.trim();
  });
  var nonEmpty = lines.filter(Boolean);
  if (!nonEmpty.length) nonEmpty = [text];
  for (var i = 0; i < nonEmpty.length; i++) {
    parseLine(nonEmpty[i], result);
  }
  if (!result.recognized.length) {
    scanInlinePatterns(text, result);
  }
  var hasData = result.recognized.length > 0 || Object.keys(result.vitals).some(function(k) {
    return result.vitals[k] != null;
  }) || result.glucometrias.length > 0 || result.io.ing != null || result.io.egr != null || result.io.egrParts && result.io.egrParts.length > 0 || result.io.evac != null;
  if (!hasData) {
    result.ok = false;
    result.error = "No se reconoci\xF3 ning\xFAn campo (T\xB0, FC, TA, DXT, I, E\u2026)";
  }
  return result;
}
function formatPreviewVitals(parsed, parts) {
  if (parsed.vitals.temp != null) {
    parts.push("TEMP " + parsed.vitals.temp + " \xB0C" + (parsed.alteredAt.temp ? " @ " + parsed.alteredAt.temp : ""));
  }
  if (parsed.vitals.fc != null) parts.push("FC " + parsed.vitals.fc + " LPM");
  if (parsed.vitals.fr != null) parts.push("FR " + parsed.vitals.fr + " RPM");
  if (parsed.vitals.sat != null) {
    var satLine = "SATURACION " + parsed.vitals.sat + "%";
    if (parsed.soporteHint) satLine += " " + toEaSalidaText(parsed.soporteHint);
    parts.push(satLine);
  }
  if (parsed.vitals.tas != null || parsed.vitals.tad != null) {
    parts.push("TA " + (parsed.vitals.tas ?? "\u2014") + "/" + (parsed.vitals.tad ?? "\u2014") + " MMHG");
  }
}
function formatPreviewIo(parsed, parts) {
  if (parsed.glucometrias.length) {
    parts.push(
      "DXT " + parsed.glucometrias.map(function(g) {
        return String(g.value) + (g.time ? "@" + g.time : "");
      }).join(", ") + " MG/DL"
    );
  }
  if (parsed.io.ing != null) parts.push("I " + parsed.io.ing + " CC");
  if (parsed.io.egrParts && parsed.io.egrParts.length) {
    parts.push("E " + serializeEgrPartsToFormText(parsed.io.egrParts));
  } else if (parsed.io.egr != null) {
    parts.push("E " + toEaSalidaText(parsed.io.egr));
  }
  if (parsed.io.evac != null) parts.push("EVAC " + toEaSalidaText(parsed.io.evac));
}
function formatEstadoActualParsePreview(parsed) {
  if (!parsed || !parsed.ok) {
    return toEaSalidaText(parsed && parsed.error ? parsed.error : "Sin datos");
  }
  var parts = [];
  formatPreviewVitals(parsed, parts);
  formatPreviewIo(parsed, parts);
  if (parsed.recognized.indexOf("balance-ignored") >= 0) {
    parts.push("B (CALCULADO AL APLICAR)");
  }
  if (parsed.warnings.length) {
    parts.push("AVISOS: " + parsed.warnings.join("; "));
  }
  return toEaSalidaText(parts.length ? parts.join(" \xB7 ") : "Sin campos detectados");
}

// public/js/censo-signos-format.mjs
var SOPORTE_LABEL = {
  "Aire ambiente": "AL AIRE AMBIENTE",
  "Puntillas nasales": "POR PUNTILLAS NASALES",
  "Alto flujo": "POR ALTO FLUJO",
  "VM no invasiva": "CON VENTILACI\xD3N MEC\xC1NICA NO INVASIVA",
  Traqueostom\u00EDa: "CON TRAQUEOSTOM\xCDA"
};
function formatCc(n) {
  if (!isIoNumericValue(n)) return null;
  return Number(n).toLocaleString("es-MX") + " CC";
}
function formatEgresoShort(raw, egrParts) {
  if (Array.isArray(egrParts) && egrParts.length) {
    var allNc = egrParts.every(function(p) {
      return p && (p.value === "NC" || String(p.value).toUpperCase() === "NC");
    });
    if (allNc) return "NO CUANTIFICADA";
    var serialized = serializeEgrPartsToFormText(egrParts);
    if (serialized) return toEaSalidaText(serialized);
  }
  if (raw == null || raw === "") return "";
  var norm = normalizeIoNcAbbrev(raw);
  if (norm === "NC") return "NO CUANTIFICADA";
  if (isIoNumericValue(norm)) return formatCc(norm) || String(norm);
  if (/no\s+cuantificad/i.test(String(raw))) return "NO CUANTIFICADA";
  return toEaSalidaText(raw);
}
function formatEvacShort(evac) {
  if (evac == null || evac === "") return "";
  var norm = normalizeEvacAbbrev(evac);
  if (norm === "NC") return "NO REPORTADAS";
  if (isIoNumericValue(evac)) {
    return Number(evac).toLocaleString("es-MX");
  }
  if (/no\s+reportad|sin\s+evac/i.test(String(evac))) return "NO REPORTADAS";
  return toEaSalidaText(evac);
}
function ioSnapshotHasContent(io) {
  return io.ing != null && io.ing !== "" || io.egr != null && io.egr !== "" || Array.isArray(io.egrParts) && io.egrParts.length > 0 || io.evac != null && io.evac !== "";
}
function formatBalanceShort(io, balTurno) {
  io = io && typeof io === "object" ? io : {};
  if (!ioSnapshotHasContent(io)) return "";
  if (balTurno != null && balTurno !== "" && Number.isFinite(Number(balTurno))) {
    var n = Number(balTurno);
    return (n > 0 ? "+" : "") + n.toLocaleString("es-MX") + " CC";
  }
  var computed = computeIoBalanceFromIngEgr(io.ing, io);
  if (Number.isFinite(computed)) {
    return (computed > 0 ? "+" : "") + computed.toLocaleString("es-MX") + " CC";
  }
  if (ioNumericEgressTotal(io) == null) return "NC";
  return "";
}
function appendCensoVitalLines(lines, v) {
  if (v.temp != null && v.temp !== "") lines.push("T\xB0: " + v.temp + " \xB0C");
  if (v.fc != null && v.fc !== "") lines.push("FC: " + v.fc + " LPM");
  if (v.fr != null && v.fr !== "") lines.push("FR: " + v.fr + " RPM");
  if (v.tas != null || v.tad != null) {
    lines.push("TA: " + (v.tas != null && v.tas !== "" ? v.tas : "\u2014") + "/" + (v.tad != null && v.tad !== "" ? v.tad : "\u2014") + " MMHG");
  }
}
function resolveCensoGlucometrias(snapshot) {
  if (snapshot && Array.isArray(snapshot.glucometrias) && snapshot.glucometrias.length) {
    return snapshot.glucometrias;
  }
  if (snapshot && Array.isArray(snapshot.bombaInsulina) && snapshot.bombaInsulina.length) {
    return snapshot.bombaInsulina;
  }
  return [];
}
function appendCensoGluLine(lines, glu) {
  if (!glu.length) return;
  var vals = glu.map(function(g) {
    return g && g.value != null && g.value !== "" ? String(g.value) : "";
  }).filter(Boolean).join(", ");
  if (vals) lines.push("DXT: " + vals + " MG/DL");
}
function appendCensoSatLine(lines, v, ctx) {
  if (v.sat == null || v.sat === "") return;
  var soporteKey = ctx.soporte != null ? String(ctx.soporte).trim() : "";
  var soporte = SOPORTE_LABEL[soporteKey] || (ctx.soporteHint ? toEaSalidaText(ctx.soporteHint) : "") || SOPORTE_LABEL["Aire ambiente"];
  lines.push("SAT: " + v.sat + "% " + soporte);
}
function formatCensoSignosColumn(snapshot, ctx) {
  ctx = ctx || {};
  var v = snapshot && snapshot.vitals && typeof snapshot.vitals === "object" ? (
    /** @type {Record<string, unknown>} */
    snapshot.vitals
  ) : {};
  var lines = [];
  appendCensoVitalLines(lines, v);
  appendCensoGluLine(lines, resolveCensoGlucometrias(snapshot));
  appendCensoSatLine(lines, v, ctx);
  return lines;
}
function formatCensoIoColumn(io, balTurno) {
  io = io && typeof io === "object" ? io : {};
  var lines = [];
  if (io.ing != null && io.ing !== "") {
    var ing = formatCc(io.ing);
    if (ing) lines.push("I: " + ing);
  }
  var egrText = formatEgresoShort(
    io.egr,
    /** @type {import('./features/estado-actual-io.mjs').IoEgresoPart[] | undefined} */
    io.egrParts
  );
  if (egrText) lines.push("E: " + egrText);
  else if (ioNumericEgressTotal(io) == null && (io.egr != null || Array.isArray(io.egrParts) && io.egrParts.length)) {
    lines.push("E: NO CUANTIFICADA");
  }
  var bal = formatBalanceShort(io, balTurno);
  if (bal) lines.push("B: " + bal);
  if (io.evac != null && io.evac !== "") {
    lines.push("EVAC: " + formatEvacShort(io.evac));
  }
  return lines;
}
function snapshotHasVitals(v) {
  return ["temp", "fc", "fr", "tas", "tad", "sat"].some(function(k) {
    return v[k] != null && v[k] !== "";
  });
}
function snapshotHasCensoData(snapshot) {
  if (!snapshot) return false;
  var v = snapshot.vitals && typeof snapshot.vitals === "object" ? (
    /** @type {Record<string, unknown>} */
    snapshot.vitals
  ) : {};
  if (snapshotHasVitals(v)) return true;
  if (Array.isArray(snapshot.glucometrias) && snapshot.glucometrias.length) return true;
  if (Array.isArray(snapshot.bombaInsulina) && snapshot.bombaInsulina.length) return true;
  var io = snapshot.io && typeof snapshot.io === "object" ? snapshot.io : {};
  return ioSnapshotHasContent(io);
}
function snapshotFromParsed(parsed) {
  return {
    vitals: parsed.vitals,
    alteredAt: parsed.alteredAt,
    glucometrias: parsed.glucometrias,
    bombaInsulina: [],
    io: parsed.io
  };
}
function resolveCensoMonitoreoSnapshot(patient) {
  ensureMonitoreo(patient);
  var mon = patient.monitoreo || {};
  var snapshot = deriveSnapshot(mon);
  var soporteHint = null;
  if (!snapshotHasCensoData(snapshot)) {
    var tg = mon.textoGuardado;
    var text = tg && tg.text != null ? String(tg.text).trim() : tg && tg.texto != null ? String(tg.texto).trim() : "";
    if (text) {
      var parsed = parseEstadoActualPaste(text);
      if (parsed.ok) {
        snapshot = snapshotFromParsed(parsed);
        soporteHint = parsed.soporteHint || null;
      }
    }
  }
  return { snapshot, soporteHint };
}
function formatCensoSignosIoFromPatient(patient) {
  var resolved = resolveCensoMonitoreoSnapshot(patient);
  var mon = patient.monitoreo || {};
  var ec = mon.estadoClinico && typeof mon.estadoClinico === "object" ? mon.estadoClinico : {};
  var ctx = {
    soporte: ec.soporte,
    soporteHint: resolved.soporteHint
  };
  var bal = balanceTurno(mon);
  var signosLines = formatCensoSignosColumn(resolved.snapshot, ctx);
  var ioLines = formatCensoIoColumn(resolved.snapshot.io, Number.isFinite(bal) ? bal : void 0);
  return {
    signosCol: signosLines.join("\n"),
    ioCol: ioLines.join("\n")
  };
}

// public/js/censo-build-sections.mjs
function splitLines(text) {
  return String(text || "").split(/\r?\n/).map(function(l) {
    return l.trim();
  }).filter(Boolean);
}
function pushSection(sections, label, lines) {
  if (lines && lines.length) sections.push({ label, lines });
}
function medsLines(patient, ctx, pid) {
  var meds = String(patient.censoMedsText || "").trim() || formatCensoMedsFromReceta(
    /** @type {{ items?: unknown[] }} */
    ctx.medRecetaByPatient[pid]
  );
  return splitLines(meds).slice(0, 6);
}
function buildPatientSections(patient, ctx) {
  var pid = String(patient.id);
  var sections = [];
  var dx = diagnosticosTextForCenso(patient.diagnosticosList);
  if (dx && dx !== "\u2014") pushSection(sections, "Diagn\xF3sticos", [dx]);
  pushSection(sections, "ATB / Medicamentos", medsLines(patient, ctx, pid));
  var signosIo = formatCensoSignosIoFromPatient(patient);
  var signosLines = [];
  if (signosIo.signosCol) signosLines.push(signosIo.signosCol);
  if (signosIo.ioCol) signosLines.push(signosIo.ioCol);
  pushSection(sections, "Signos / I-O", signosLines);
  pushSection(sections, "Laboratorios", formatLabsForCensoCompact(ctx.labHistoryByPatient[pid] || []));
  var acc = formatAccesosForCenso(patient);
  if (acc && acc !== "\u2014") pushSection(sections, "Accesos", [acc]);
  var cult = formatCultivosForCenso(ctx.labHistoryByPatient[pid] || []);
  if (cult && cult !== "\u2014") {
    pushSection(sections, "Cultivos", cult.split(/\n\n+/).filter(Boolean));
  }
  pushSection(sections, "Pendientes", formatPendientesForCenso(ctx.todosByPatient[pid] || []));
  return { sections, signosIo };
}

// public/js/censo-header-format.mjs
var CENSO_UBICACION_TORRE = "torre";
var CENSO_TORRE_HU_LABEL = "Torre HU";
var DEFAULT_CENSO_FIMI_LABEL = "FIMI";
function resolveCensoFimiLabel(settings) {
  return String(settings?.censoFimiLabel || "").trim() || DEFAULT_CENSO_FIMI_LABEL;
}
function medTpl(settings) {
  var tpl = settings && settings.medicosPlantilla;
  return tpl && typeof tpl === "object" ? (
    /** @type {Record<string, string>} */
    tpl
  ) : {};
}
function pick(v) {
  return String(v || "").trim();
}
function normalizeCensoUbicacionValue(settings) {
  var st = settings || {};
  var sala = pick(st.censoSala);
  if (sala) {
    if (/^torre/i.test(sala) || sala === CENSO_UBICACION_TORRE) return CENSO_UBICACION_TORRE;
    return sala;
  }
  if (pick(st.censoTorre)) return CENSO_UBICACION_TORRE;
  return "";
}
function formatCensoSalaTitleLine(settings) {
  var ubic = normalizeCensoUbicacionValue(settings);
  if (ubic === CENSO_UBICACION_TORRE) return "Censo de " + CENSO_TORRE_HU_LABEL;
  if (ubic) return "Censo de Sala " + ubic;
  return "Censo de Sala";
}
function resolveCensoEquipoMembers(settings) {
  var st = settings || {};
  var tpl = medTpl(st);
  var legacyR1 = pick(st.residenteR1);
  return {
    r2: pick(st.residenteR2) || pick(tpl.r2),
    r1a: pick(st.residenteR1a) || pick(tpl.r1a) || legacyR1,
    r1b: pick(st.residenteR1b) || pick(tpl.r1b),
    maestro: pick(st.profesorName) || pick(tpl.profesor)
  };
}
function formatCensoEquipoLine(settings) {
  var m = resolveCensoEquipoMembers(settings);
  return [m.r2, m.r1a, m.r1b, m.maestro].filter(Boolean).join(" \xB7 ");
}
function buildCensoDocumentHeader(settings) {
  var ubic = normalizeCensoUbicacionValue(settings);
  var isTorre = ubic === CENSO_UBICACION_TORRE;
  return {
    titleLine: formatCensoSalaTitleLine(settings),
    equipoLine: formatCensoEquipoLine(settings),
    ubicacion: isTorre ? CENSO_TORRE_HU_LABEL : ubic,
    sala: isTorre ? "" : ubic,
    torre: isTorre ? CENSO_TORRE_HU_LABEL : ""
  };
}

// public/js/censo-build.mjs
function formatCensusMonthLabel(date) {
  var d = date || /* @__PURE__ */ new Date();
  var mes = d.toLocaleString("es-MX", { month: "long" }).toUpperCase();
  return mes + " " + d.getFullYear();
}
function formatCensusDateLabel(date) {
  var d = date || /* @__PURE__ */ new Date();
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}
function sortPatientsForCensus(patients2) {
  return (patients2 || []).slice().sort(comparePatientsByBed);
}
function flattenRowForCompactPdf(sections) {
  var pick2 = function(label) {
    var sec = sections.find(function(s) {
      return s.label === label;
    });
    return sec ? sec.lines.join("\n") : "";
  };
  return {
    dx: pick2("Diagn\xF3sticos"),
    meds: pick2("ATB / Medicamentos"),
    signos: pick2("Signos / I-O"),
    signosCol: "",
    ioCol: "",
    labs: pick2("Laboratorios"),
    accesos: pick2("Accesos"),
    cultivos: pick2("Cultivos"),
    pendientes: pick2("Pendientes")
  };
}
function normalizeCensoCamaNumber(cama) {
  var s = String(cama ?? "").trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) {
    var n = parseInt(s, 10);
    if (!n) return "";
    return String(n);
  }
  return s;
}
function parseCamaCellForCenso(text) {
  var raw = String(text || "").trim();
  if (!raw || raw === "\u2014") return { cuarto: "", cama: "" };
  var lines = raw.replace(/\r/g, "").split("\n").map(function(l) {
    return l.trim();
  }).filter(Boolean);
  if (lines.length >= 2) {
    return { cuarto: lines[0], cama: normalizeCensoCamaNumber(lines[1]) };
  }
  var one = lines[0] || "";
  var dash = one.indexOf("-");
  if (dash >= 0) {
    return {
      cuarto: one.slice(0, dash).trim(),
      cama: normalizeCensoCamaNumber(one.slice(dash + 1))
    };
  }
  var slash = one.split(/\//).map(function(l) {
    return l.trim();
  });
  if (slash.length >= 2) {
    return { cuarto: slash[0], cama: normalizeCensoCamaNumber(slash[1]) };
  }
  return { cuarto: one, cama: "" };
}
function formatCamaCellLabel(parts) {
  var cuarto = String(parts.cuarto || "").trim();
  var cama = String(parts.cama || "").trim();
  if (!cuarto && !cama) return "\u2014";
  if (cuarto && cama) return cuarto + "-" + cama;
  return cuarto || cama;
}
function formatCamaCellForCenso(patient) {
  var cuarto = String(patient.cuarto || "").trim();
  var cama = normalizeCensoCamaNumber(patient.cama);
  return formatCamaCellLabel({ cuarto, cama });
}
function formatPatientNameForCenso(name) {
  var s = String(name || "").replace(/\s+/g, " ").trim();
  return s || "\u2014";
}
function formatPacienteMetaForCenso(patient, settings) {
  var lines = [];
  if (patient.registro) lines.push(String(patient.registro).trim());
  if (patient.edad) lines.push(String(patient.edad).trim() + " a\xF1os");
  var fiux = formatAccesoFechaDisplay(patient.fiuxFecha);
  if (fiux) lines.push("FIUX: " + fiux);
  var fimi = formatAccesoFechaDisplay(patient.fimiFecha);
  if (fimi) {
    var fimiLabel = resolveCensoFimiLabel(settings || {});
    lines.push(fimiLabel + ": " + fimi);
  }
  return lines.join("\n");
}
function buildCensusPayload(opts) {
  var settings = opts.settings || {};
  var now = opts.now || /* @__PURE__ */ new Date();
  var includeArchived = !!opts.includeArchived;
  var list = (opts.patients || []).filter(function(p) {
    return p && (includeArchived || !p.archived);
  });
  var sorted = sortPatientsForCensus(list);
  var servicio = String(settings.defaultServicio || sorted[0]?.servicio || "GUARDIA").trim();
  var docHead = buildCensoDocumentHeader(settings);
  var equipo = resolveCensoEquipoMembers(settings);
  var header = {
    mes: formatCensusMonthLabel(now),
    fecha: formatCensusDateLabel(now),
    titleLine: docHead.titleLine,
    equipoLine: docHead.equipoLine,
    sala: docHead.sala,
    torre: docHead.torre,
    profesor: equipo.maestro,
    doctor: String(settings.doctorName || "").trim(),
    r2: equipo.r2,
    r1: equipo.r1a,
    r1a: equipo.r1a,
    r1b: equipo.r1b,
    maestro: equipo.maestro,
    servicio
  };
  var ctx = {
    medRecetaByPatient: opts.medRecetaByPatient,
    labHistoryByPatient: opts.labHistoryByPatient,
    todosByPatient: opts.todosByPatient
  };
  var rows = sorted.map(function(patient, idx) {
    ensurePatientDiagnosticos(patient);
    var cama = formatCamaCellForCenso(patient);
    var built = buildPatientSections(patient, ctx);
    var flat = flattenRowForCompactPdf(built.sections);
    return {
      num: String(idx + 1),
      cama,
      pacienteNombre: formatPatientNameForCenso(patient.nombre),
      pacienteMeta: formatPacienteMetaForCenso(patient, settings),
      sections: built.sections,
      dx: flat.dx,
      meds: flat.meds,
      signos: flat.signos,
      signosCol: built.signosIo.signosCol,
      ioCol: built.signosIo.ioCol,
      labs: flat.labs,
      accesos: flat.accesos,
      cultivos: flat.cultivos,
      pendientes: flat.pendientes
    };
  });
  return { header, rows, servicio };
}

// public/js/clinical-access-runtime/guardia-grid.mjs
function mapPatientForGuardiaGrid(p) {
  const bed_label = formatCamaCellForCenso(p) || "\u2014";
  return {
    id: String(p.id),
    bed_label,
    name: String(p.nombre || ""),
    service: String(p.servicio || p.area || ""),
    sub_area: String(p.area || ""),
    negativa_maniobras_firmada: Number(p.negativa_maniobras_firmada || 0),
    interconsult_type: String(p.interconsult_type || "None"),
    interconsult_status: String(p.interconsult_status || "Pending")
  };
}
function buildGuardiasMap(guardias) {
  const map = /* @__PURE__ */ new Map();
  (guardias || []).forEach((g) => {
    if (g && g.patient_id) map.set(String(g.patient_id), g);
  });
  return map;
}
function syncGuardiaCensusPanelVisibility(_settings) {
  const legacyPanel = document.getElementById("guardia-census-panel");
  if (legacyPanel) legacyPanel.hidden = true;
}
async function renderGuardiaCensusGrid(settings) {
  if (isGuardiaMode()) renderGuardiaBoard(settings);
}
async function refreshGuardiaCensusFromDb(settings) {
  if (!isDbMode() || !clinicalSessionContext.user) return;
  const api2 = electronApi();
  if (!api2 || typeof api2.dbGuardiaCensus !== "function") return;
  const res = await api2.dbGuardiaCensus({ userId: clinicalSessionContext.user.user_id });
  if (!res || res.ok === false) return;
  clinicalSessionContext.guardias = Array.isArray(res.guardias) ? res.guardias : [];
  clinicalSessionContext.guardiasMap = buildGuardiasMap(clinicalSessionContext.guardias);
  clinicalSessionContext.orphanGuardias = Array.isArray(res.orphans) ? res.orphans : [];
  await fetchClinicalTeamsFromDb();
  await fetchClinicalScopeContextFromDb();
  await renderGuardiaCensusGrid(settings);
}

// public/js/clinical-access-runtime/scope-lan-user.mjs
function normalizeLanOpsRank(resolvedRank, sessionRank) {
  const rank = String(resolvedRank || sessionRank || "R1").trim() || "R1";
  return rank === "Admin" ? "R1" : rank;
}
function resolvedIsProgramAdmin(resolved) {
  return resolved.is_program_admin === 1 || resolved.is_program_admin === true ? 1 : 0;
}
function buildLanOpsSessionUser(resolved, sessionUser) {
  return {
    user_id: String(resolved.user_id),
    username: resolved.username ?? sessionUser?.username ?? null,
    rank: normalizeLanOpsRank(resolved.rank, sessionUser?.rank),
    sala: resolved.sala ?? sessionUser?.sala ?? null,
    clinical_name: resolved.clinical_name ?? sessionUser?.clinical_name ?? null,
    is_program_admin: resolvedIsProgramAdmin(resolved)
  };
}
function persistLanOpsUserBinding(nextUser) {
  persistClinicalUserBinding({
    userId: nextUser.user_id,
    username: nextUser.username || void 0,
    rank: nextUser.rank,
    sala: nextUser.sala,
    displayName: nextUser.clinical_name || void 0,
    isProgramAdmin: nextUser.is_program_admin === 1,
    registered: true
  });
}
function applyLanOpsResolvedUser(snapshot, sessionUser) {
  const settings = readRpcSettings();
  const resolved = resolveClinicalUserRowFromOpsSnapshot(snapshot, {
    userId: sessionUser?.user_id || settings.clinicalUserId,
    username: sessionUser?.username || settings.clinicalUsername
  });
  if (!resolved) return false;
  const nextUser = buildLanOpsSessionUser(resolved, sessionUser);
  clinicalSessionContext.user = nextUser;
  persistLanOpsUserBinding(nextUser);
  return true;
}
function invalidateMobileSidebarPatientCache() {
  if (typeof document === "undefined") return;
  void import("/mobile/js/chunks/patients-FRNAP5DS.js").then((mod) => {
    if (typeof mod.invalidateMobileSidebarPatientCache === "function") {
      mod.invalidateMobileSidebarPatientCache();
    }
  }).catch(() => {
  });
}

// public/js/clinical-access-runtime/scope-evaluate.mjs
function scopeContextForEvaluateFromParts(parts) {
  const enforceTeamPatientScope = parts.enforceTeamPatientScope != null ? !!parts.enforceTeamPatientScope : shouldEnforceTeamPatientMirror();
  return {
    teams: parts.teams,
    guardias: parts.guardias,
    cycle: parts.cycle,
    assignments: parts.assignments,
    salaGuardiaToday: parts.salaGuardiaToday,
    guardiaMode: parts.guardiaMode,
    entregaPhaseActive: parts.entregaPhaseActive,
    enforceTeamPatientScope,
    now: parts.now
  };
}
function getClinicalScopeContextForEvaluate() {
  const cached = clinicalSessionContext.scopeContext;
  if (cached && typeof cached === "object") {
    return scopeContextForEvaluateFromParts({
      teams: Array.isArray(cached.teams) ? cached.teams : clinicalSessionContext.teams,
      guardias: Array.isArray(cached.guardias) ? cached.guardias : clinicalSessionContext.guardias,
      cycle: cached.cycle ?? null,
      assignments: Array.isArray(cached.assignments) ? cached.assignments : [],
      salaGuardiaToday: Array.isArray(cached.salaGuardiaToday) ? cached.salaGuardiaToday : [],
      guardiaMode: cached.guardiaMode != null ? !!cached.guardiaMode : !!clinicalSessionContext.guardiaMode,
      entregaPhaseActive: cached.entregaPhaseActive != null ? !!cached.entregaPhaseActive : readEntregaPhaseActive(),
      enforceTeamPatientScope: shouldEnforceTeamPatientMirror() ? true : cached.enforceTeamPatientScope,
      now: cached.now || (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const fallbackAssignments = Array.isArray(clinicalSessionContext.scopeContext?.assignments) ? clinicalSessionContext.scopeContext.assignments : [];
  return scopeContextForEvaluateFromParts({
    teams: clinicalSessionContext.teams,
    guardias: clinicalSessionContext.guardias,
    cycle: null,
    assignments: fallbackAssignments,
    salaGuardiaToday: [],
    guardiaMode: !!clinicalSessionContext.guardiaMode,
    entregaPhaseActive: readEntregaPhaseActive(),
    enforceTeamPatientScope: shouldEnforceTeamPatientMirror(),
    now: (/* @__PURE__ */ new Date()).toISOString()
  });
}

// public/js/clinical-access-runtime/patient-scope-prune.mjs
function dropPatientSidecars(pid) {
  const id = String(pid || "");
  if (!id) return;
  if (notes[id]) delete notes[id];
  if (indicaciones[id]) delete indicaciones[id];
  if (labHistory[id]) delete labHistory[id];
}
function isReadyToPrunePatientsOutsideScope() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return false;
  if (shouldUseElevatedPatientCensus(user)) return false;
  if (!shouldEnforceTeamPatientMirror()) return false;
  const ctx = clinicalSessionContext.scopeContext;
  if (!ctx) return false;
  return joinedTeamIdsForUser(ctx.teams, user).size > 0;
}
function prunePatientsOutsideVisibleScope() {
  if (!isReadyToPrunePatientsOutsideScope()) return 0;
  const user = clinicalSessionContext.user;
  const ctx = getClinicalScopeContextForEvaluate();
  const visible = filterPatientsForClinicalSidebar(
    patients,
    user,
    ctx,
    clinicalSessionContext.guardiasMap
  );
  const visibleIds = new Set(visible.map((p) => String(p?.id || "")).filter(Boolean));
  const removed = Math.max(0, patients.length - visible.length);
  if (!removed) return 0;
  for (const pid of Object.keys(notes)) {
    if (!visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  for (const p of patients) {
    const pid = String(p?.id || "");
    if (pid && !visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  setPatients(visible);
  saveState({ immediate: true });
  return removed;
}

// public/js/clinical-access-runtime/scope-lan.mjs
function isClinicalScopeReadyForLanPatientApply() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return false;
  if (shouldUseElevatedPatientCensus(user)) return true;
  if (!shouldEnforceTeamPatientMirror()) return true;
  const ctx = clinicalSessionContext.scopeContext;
  if (!ctx) return false;
  return joinedTeamIdsForUser(ctx.teams, user).size > 0;
}
function applyLanOpsScopeContext(snapshot) {
  const ctx = buildClinicalScopeContextFromOpsSnapshot(snapshot, {
    guardiaMode: clinicalSessionContext.guardiaMode,
    entregaPhaseActive: readEntregaPhaseActive(),
    enforceTeamPatientScope: true
  });
  if (!ctx) return false;
  clinicalSessionContext.scopeContext = ctx;
  clinicalSessionContext.teams = ctx.teams;
  clinicalSessionContext.guardias = ctx.guardias;
  clinicalSessionContext.guardiasMap = buildGuardiasMap(ctx.guardias);
  return true;
}
function applyClinicalScopeFromLanOpsSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || isDbMode()) return false;
  applyLanOpsResolvedUser(snapshot, clinicalSessionContext.user);
  if (!applyLanOpsScopeContext(snapshot)) return false;
  invalidateMobileSidebarPatientCache();
  return true;
}

// public/js/clinical-access-runtime/census-missing-count.mjs
function countElevatedMissingPatients(assignments, localIds) {
  let missing = 0;
  for (const row of assignments) {
    const pid = String(row?.patient_id || "");
    if (pid && !localIds.has(pid)) missing += 1;
  }
  return missing;
}
async function countTeamMemberMissingPatients(user, teams, assignments, localIds, now) {
  const { filterJoinedTeams: filterJoinedTeams2 } = await import("/mobile/js/chunks/shared-YDBULK6Y.js");
  const { resolvePatientTeamIdFromAssignments: resolvePatientTeamIdFromAssignments2 } = await import("/mobile/js/chunks/clinico-access-IMWORPPW.js");
  const joined = filterJoinedTeams2(teams, user);
  const teamIds = new Set(joined.map((t) => String(t.team_id || "")));
  if (!teamIds.size) return null;
  let missing = 0;
  for (const row of assignments) {
    const pid = String(row?.patient_id || "");
    if (!pid || localIds.has(pid)) continue;
    const teamId = resolvePatientTeamIdFromAssignments2(pid, assignments, now);
    if (teamIds.has(teamId)) missing += 1;
  }
  return missing;
}

// public/js/clinical-access-runtime/census-lan-pull.mjs
async function scheduleLanPatientReconcile(_reason, _delayMs) {
}
async function countMissingAssignedPatients(user, teams, assignments, localIds, now) {
  if (hasElevatedTeamPrivileges(user)) {
    return countElevatedMissingPatients(assignments, localIds);
  }
  const teamMissing = await countTeamMemberMissingPatients(user, teams, assignments, localIds, now);
  return teamMissing == null ? 0 : teamMissing;
}
async function ensureTeamAssignedPatientsOnDevice(options) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return;
  const ctx = getClinicalScopeContextForEvaluate();
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const now = ctx.now || (/* @__PURE__ */ new Date()).toISOString();
  const localIds = new Set((patients || []).map((p) => String(p?.id || "")));
  const missing = await countMissingAssignedPatients(user, teams, assignments, localIds, now);
  if (!missing) return;
  const opts = options || {};
  if (!opts.allowLanPull) return;
  await scheduleLanPatientReconcile("missing-patients", opts.lanPullDelayMs);
}
async function ensureElevatedWardCensusOnDevice(options = {}) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id || !hasElevatedTeamPrivileges(user)) return;
  const teamFilterId = options.teamFilterId != null ? String(options.teamFilterId) : "";
  const viewingAllTeams = !teamFilterId;
  await ensureTeamAssignedPatientsOnDevice(options);
  if (!viewingAllTeams || !options.allowLanPull) return;
  await scheduleLanPatientReconcile(
    "full-ward-census",
    options.lanPullDelayMs != null ? options.lanPullDelayMs : 2e3
  );
}
async function refreshClinicalPatientListForScope(options) {
  if (!clinicalSessionContext.user?.user_id) return;
  if (refreshClinicalPatientListForScopeInFlight) return refreshClinicalPatientListForScopeInFlight;
  const opts = options || {};
  setRefreshClinicalPatientListForScopeInFlight(
    (async function() {
      if (isDbMode()) {
        await fetchClinicalTeamsFromDb();
        await fetchClinicalScopeContextFromDb();
      }
      await ensureTeamAssignedPatientsOnDevice({
        allowLanPull: opts.allowLanPull !== false,
        lanPullDelayMs: opts.lanPullDelayMs
      });
      if (typeof document === "undefined") return;
      try {
        const mod = await import("/mobile/js/chunks/patients-FRNAP5DS.js");
        if (typeof mod.renderPatientList === "function") {
          mod.renderPatientList({ silent: true });
        }
      } catch {
      }
    })().finally(function() {
      setRefreshClinicalPatientListForScopeInFlight(null);
    })
  );
  return refreshClinicalPatientListForScopeInFlight;
}
function rosterChangedFromMergeStats(stats) {
  return Number(stats.assignmentsInserted) > 0 || Number(stats.membershipInserted) > 0 || Number(stats.membershipRejoinsApplied) > 0;
}
async function scheduleHostReconcileAfterOpsMerge() {
}
async function pullHostPatientsAfterOpsMerge(event) {
  const stats = event?.detail?.mergeStats;
  if (!stats || !rosterChangedFromMergeStats(stats)) return;
  try {
    await scheduleHostReconcileAfterOpsMerge();
  } catch {
  }
}
function wireClinicalOpsSyncRefresh() {
  if (typeof document === "undefined" || document._rpcClinicalOpsSyncedRefreshWired) return;
  document._rpcClinicalOpsSyncedRefreshWired = true;
  document.addEventListener("rpc-clinical-ops-synced", (event) => {
    if (document.body.classList.contains("clinical-lan-directory-open")) return;
    if (clinicalOpsSyncedRefreshTimer) clearTimeout(clinicalOpsSyncedRefreshTimer);
    setClinicalOpsSyncedRefreshTimer(
      setTimeout(function() {
        setClinicalOpsSyncedRefreshTimer(null);
        void refreshClinicalPatientListForScope({ allowLanPull: false });
        void pullHostPatientsAfterOpsMerge(event);
      }, 1500)
    );
  });
}

// public/js/clinical-access-runtime/session-activity.mjs
function scheduleClinicalActivityLanPush() {
  if (clinicalActivityLanPushTimer) return;
  setClinicalActivityLanPushTimer(
    setTimeout(() => {
      setClinicalActivityLanPushTimer(null);
      void import("/mobile/js/chunks/mutate-bridge-clinical-ops-2EDFEEJT.js").then((mod) => {
        if (typeof mod.pushCloudClinicalOpsNow === "function") {
          return mod.pushCloudClinicalOpsNow();
        }
      }).catch(() => {
      });
    }, 4e3)
  );
}
async function touchClinicalUserActivityRemote(userId, opts = {}) {
  const api2 = electronApi();
  const uid = String(userId || resolveClinicalSessionUserId() || "").trim();
  if (!api2 || !uid || typeof api2.dbClinicalUserTouch !== "function") return false;
  const now = Date.now();
  if (!opts.force && now - lastClinicalActivityTouchAt < CLINICAL_ACTIVITY_TOUCH_MIN_MS) {
    return false;
  }
  setLastClinicalActivityTouchAt(now);
  try {
    const res = await api2.dbClinicalUserTouch({ userId: uid, callerUserId: uid });
    if (res?.ok === false) return false;
    scheduleClinicalActivityLanPush();
    if (typeof document !== "undefined") {
      document.dispatchEvent(
        new CustomEvent("rpc-clinical-user-activity-touched", { detail: { userId: uid } })
      );
    }
    return true;
  } catch {
    return false;
  }
}
function touchClinicalSessionActivity(opts = {}) {
  const userId = resolveClinicalSessionUserId();
  if (!userId) return;
  void touchClinicalUserActivityRemote(userId, opts);
}

// public/js/clinical-access-runtime/session-user.mjs
function migrateLocalPatientsClinicalSala() {
  const user = clinicalSessionContext.user;
  const settings = readRpcSettings();
  const sala = String(user?.sala || "").trim() || String(settings.clinicalSala || "").trim();
  if (!sala) return 0;
  const actor = user ? { ...user, sala } : { sala };
  const migrated = migratePatientsClinicalSala(patients, actor);
  if (migrated > 0) {
    void saveState({ immediate: true });
    if (typeof document !== "undefined") {
      void import("/mobile/js/chunks/patients-FRNAP5DS.js").then((mod) => mod.renderPatientList({ silent: true })).catch(() => {
      });
    }
  }
  return migrated;
}
function getClinicalUser() {
  return clinicalSessionContext.user;
}
function unlockClinicalSessionOverlay() {
  const overlay = document.getElementById("rpc-clinical-session-lock");
  if (overlay) overlay.classList.remove("active-lock-view-overlay");
}

// public/js/clinical-access-runtime/session-profile.mjs
function applyClinicalProfileToSession(user, profile) {
  user.username = profile.username ?? user.username;
  user.rank = profile.rank ?? user.rank;
  user.sala = profile.sala ?? null;
  user.clinical_name = profile.clinical_name ?? null;
  user.is_program_admin = profile.is_program_admin === 1 ? 1 : 0;
  persistClinicalUserBinding({
    isProgramAdmin: user.is_program_admin === 1,
    sala: profile.sala != null ? String(profile.sala) : void 0
  });
}
async function refreshClinicalUserProfile() {
  const { ensureLanProfileGateDeviceReset } = await import("/mobile/js/chunks/clinical-settings-VUNDYSKU.js");
  ensureLanProfileGateDeviceReset();
  const api2 = electronApi();
  const userId = String(clinicalSessionContext.user?.user_id || "");
  if (!api2 || !userId || typeof api2.dbClinicalProfileGet !== "function") return;
  try {
    const res = await api2.dbClinicalProfileGet({ userId });
    const profile = res?.profile;
    const user = clinicalSessionContext.user;
    if (!profile || !user) return;
    applyClinicalProfileToSession(user, profile);
    void touchClinicalUserActivityRemote(userId);
  } catch {
  }
  migrateLocalPatientsClinicalSala();
}

// public/js/clinical-access-runtime/bootstrap-apply.mjs
async function mergeBootstrapProfileFromDb(userId) {
  const api2 = electronApi();
  if (!api2 || typeof api2.dbClinicalProfileGet !== "function") return;
  try {
    const profileRes = await api2.dbClinicalProfileGet({ userId });
    const profile = profileRes?.profile;
    if (!profile || !clinicalSessionContext.user) return;
    const profileRank = String(profile.rank || "");
    clinicalSessionContext.user.rank = profileRank === "Admin" ? "R1" : profileRank || clinicalSessionContext.user.rank;
    clinicalSessionContext.user.sala = profile.sala ?? null;
    clinicalSessionContext.user.clinical_name = profile.clinical_name ?? null;
    clinicalSessionContext.user.is_program_admin = profile.is_program_admin === 1 || profileRank === "Admin" ? 1 : 0;
    if (profile.sala != null) {
      persistClinicalUserBinding({ sala: String(profile.sala) });
    }
  } catch {
  }
}
function applyBootstrapGuardiaState(res) {
  clinicalSessionContext.decryptedPrivateKeyPem = res.user.privateKeyPem || null;
  clinicalSessionContext.guardias = Array.isArray(res.guardias) ? res.guardias : [];
  clinicalSessionContext.guardiasMap = buildGuardiasMap(clinicalSessionContext.guardias);
  clinicalSessionContext.orphanGuardias = Array.isArray(res.orphans) ? res.orphans : [];
}
function persistBootstrapUserBinding(res) {
  const settings = readRpcSettings();
  const clientId = String(settings.clientId || "");
  const patch = {
    userId: res.user.userId,
    username: res.user.username
  };
  if (isLegacyMachineUsername(res.user.username, clientId)) {
    patch.staleDeviceUserId = res.user.userId;
  }
  persistClinicalUserBinding(patch);
}
async function refreshBootstrapScopeAndCensus() {
  await refreshClinicalUserProfile();
  await fetchClinicalTeamsFromDb();
  await fetchClinicalScopeContextFromDb();
  if (hasElevatedTeamPrivileges(clinicalSessionContext.user)) {
    void ensureElevatedWardCensusOnDevice({
      allowLanPull: true,
      lanPullDelayMs: 8e3,
      teamFilterId: ""
    });
  }
  if (typeof document !== "undefined") {
    void import("/mobile/js/chunks/clinical-profile-cloud-stubs-GF7A2CZZ.js").then((mod) => mod.flushClinicalProfileToLan()).catch(() => {
    });
  }
  migrateLocalPatientsClinicalSala();
}
async function applyBootstrapResult(res) {
  clinicalSessionContext.user = {
    user_id: res.user.userId,
    username: res.user.username,
    rank: res.user.rank,
    is_program_admin: res.user.isProgramAdmin ? 1 : 0,
    public_key: res.user.publicKeyPem
  };
  await mergeBootstrapProfileFromDb(res.user.userId);
  applyBootstrapGuardiaState(res);
  persistBootstrapUserBinding(res);
  await refreshBootstrapScopeAndCensus();
}

// public/js/clinical-access-runtime/bootstrap-rank.mjs
function resolveClinicalRank(settings, clientId) {
  void clientId;
  const rank = settings && settings.clinicalRank ? String(settings.clinicalRank) : "R1";
  const allowed = /* @__PURE__ */ new Set(["R1", "R2", "R3", "R4", "Admin"]);
  return allowed.has(rank) ? rank : "R1";
}

// public/js/clinical-access-runtime/bootstrap-resume.mjs
async function resumeClinicalIdentityViaResumeApi(api2, handle, stored) {
  const previousUserId = String(clinicalSessionContext.user?.user_id || "");
  const staleFromSettings = String(stored.clinicalStaleDeviceUserId || "");
  const fromUserId = previousUserId && previousUserId !== String(stored.clinicalUserId || "") ? previousUserId : staleFromSettings || previousUserId;
  const res = await api2.dbClinicalIdentityResume({
    username: handle,
    fromUserId
  });
  if (!res || res.ok === false) {
    return { ok: false, error: res?.error || "No se pudo recuperar la cuenta." };
  }
  await applyBootstrapResult(res);
  persistClinicalUserBinding({
    userId: res.user.userId,
    username: res.user.username
  });
  if (Number(res.membershipMoved) > 0) {
    await fetchClinicalTeamsFromDb();
  }
  return { ok: true, userId: res.user.userId, membershipMoved: res.membershipMoved };
}
async function resumeClinicalIdentityViaBootstrapApi(api2, handle, stored) {
  const res = await api2.dbClinicalAccessBootstrap({
    clientId: String(stored.clientId || ""),
    rank: resolveClinicalRank(stored, String(stored.clientId || "")),
    preferredUsername: handle,
    preferredUserId: ""
  });
  if (!res || res.ok === false) {
    return { ok: false, error: res?.error || "No se pudo recuperar la cuenta." };
  }
  if (normalizeUsername(res.user.username) !== handle) {
    return {
      ok: false,
      error: "No encontramos ese usuario en esta base de datos."
    };
  }
  await applyBootstrapResult(res);
  return { ok: true, userId: res.user.userId };
}

// public/js/clinical-access-runtime/bootstrap.mjs
async function bootstrapClinicalAccess(settings, clientId) {
  if (!isDbMode()) return false;
  const api2 = electronApi();
  if (!api2 || typeof api2.dbClinicalAccessBootstrap !== "function") return false;
  const stored = settings || readRpcSettings();
  const res = await api2.dbClinicalAccessBootstrap({
    clientId,
    rank: resolveClinicalRank(stored, clientId),
    preferredUserId: String(stored.clinicalUserId || ""),
    preferredUsername: String(stored.clinicalUsername || "")
  });
  if (!res || res.ok === false) return false;
  await applyBootstrapResult(res);
  return true;
}
async function lookupClinicalUserByUsername(username) {
  if (!isDbMode()) return null;
  const api2 = electronApi();
  const handle = normalizeUsername(username);
  if (!api2 || typeof api2.dbClinicalUserLookup !== "function" || !isValidUsernameFormat(handle)) {
    return null;
  }
  try {
    const res = await api2.dbClinicalUserLookup({ username: handle });
    if (!res?.ok || !res.user?.user_id) return null;
    return res.user;
  } catch {
    return null;
  }
}
async function resumeClinicalIdentityByUsername(username, settings, clientId) {
  void clientId;
  if (!isDbMode()) return { ok: false, error: "Base de datos no activa." };
  const api2 = electronApi();
  const handle = normalizeUsername(username);
  if (!api2) {
    return { ok: false, error: "Sesi\xF3n cl\xEDnica no disponible." };
  }
  const stored = settings || readRpcSettings();
  if (typeof api2.dbClinicalIdentityResume === "function") {
    return resumeClinicalIdentityViaResumeApi(api2, handle, stored);
  }
  if (typeof api2.dbClinicalAccessBootstrap !== "function") {
    return { ok: false, error: "Sesi\xF3n cl\xEDnica no disponible." };
  }
  return resumeClinicalIdentityViaBootstrapApi(api2, handle, stored);
}

// public/js/clinical-access-runtime/lifecycle.mjs
async function initClinicalAccessRuntime(settings, clientId) {
  const ok = await bootstrapClinicalAccess(settings, clientId);
  markClinicalAccessBootReady();
  if (!ok) return;
  wireClinicalOpsSyncRefresh();
  if (vitalsLoop) vitalsLoop.stop();
  const nextVitalsLoop = new BackgroundVitalsMonitorLoop(
    {
      all: async (sql, params) => {
        void sql;
        void params;
        const api2 = electronApi();
        if (!api2 || typeof api2.dbGuardiaCensus !== "function") return [];
        const census = await api2.dbGuardiaCensus({ userId: clinicalSessionContext.user?.user_id });
        if (!census || census.ok === false) return [];
        return Array.isArray(census.guardias) ? census.guardias : [];
      }
    },
    String(clinicalSessionContext.user?.user_id || clientId),
    {
      shouldMonitorVitals: () => {
        const uid = String(clinicalSessionContext.user?.user_id || "");
        if (!uid) return false;
        const rank = effectiveClinicalRank(clinicalSessionContext.user);
        const teams = clinicalSessionContext.teams || [];
        const salaGuardiaToday = clinicalSessionContext.salaGuardiaToday || clinicalSessionContext.scopeContext?.salaGuardiaToday || [];
        return userIsOnGuardiaCallToday(uid, rank, teams, /* @__PURE__ */ new Date(), salaGuardiaToday);
      },
      resolvePatientLabel: (patientId) => {
        const p = patients.find((row) => String(row.id) === String(patientId));
        if (!p) return "";
        const name = String(p.nombre || "").trim();
        const bed = [p.cuarto, p.cama].filter(Boolean).join("-");
        if (name && bed) return `${name} (${bed})`;
        return name || bed || "";
      }
    }
  );
  setVitalsLoop(nextVitalsLoop);
  nextVitalsLoop.start();
  if (sessionLocker) sessionLocker.stop();
  const nextSessionLocker = new ClientSessionInactivityLocker(10, "rpc-clinical-session-lock");
  setSessionLocker(nextSessionLocker);
  nextSessionLocker.start(clinicalSessionContext);
  syncGuardiaCensusPanelVisibility(settings);
  if (isGuardiaMode()) renderGuardiaCensusGrid(settings);
}
function stopClinicalAccessRuntime() {
  if (vitalsLoop) {
    vitalsLoop.stop();
    setVitalsLoop(null);
  }
  if (sessionLocker) {
    sessionLocker.stop();
    setSessionLocker(null);
  }
  resetClinicalSessionContext();
}
async function resumeClinicalSession(settings, clientId) {
  await bootstrapClinicalAccess(settings, clientId);
  unlockClinicalSessionOverlay();
  if (sessionLocker) {
    sessionLocker.stop();
    const nextSessionLocker = new ClientSessionInactivityLocker(10, "rpc-clinical-session-lock");
    setSessionLocker(nextSessionLocker);
    nextSessionLocker.start(clinicalSessionContext);
  }
}

// public/js/features/crypto-signer.mjs
function api() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}
async function signClinicalChange(params) {
  const electron = api();
  if (!electron || typeof electron.dbSignClinicalChange !== "function") {
    throw new Error("Clinical signing unavailable in this environment");
  }
  const res = await electron.dbSignClinicalChange(params);
  if (!res || res.ok === false) {
    throw new Error(res?.error || "SIGN_FAILED");
  }
  return res.signed;
}
async function verifyIncomingPeerChange(transactionBody, signatureHex, publicPemKey) {
  const electron = api();
  if (!electron || typeof electron.dbVerifyClinicalChange !== "function") {
    return false;
  }
  const res = await electron.dbVerifyClinicalChange({
    transactionBody,
    signature: signatureHex,
    publicKeyPem: publicPemKey
  });
  return !!(res && res.ok && res.valid);
}

// public/js/clinical-access-runtime/crypto-signing.mjs
function assertClinicalWriteAllowed(patientId, settings) {
  void settings;
  const patient = patients.find((p) => String(p.id) === String(patientId)) || (patientId ? { id: patientId } : null);
  const guardia = patientId ? clinicalSessionContext.guardiasMap.get(String(patientId)) : null;
  const scope = evaluateClinicalScope(
    clinicalSessionContext.user,
    patient,
    guardia,
    getClinicalScopeContextForEvaluate()
  );
  if (!scope.writable) {
    const err = new Error(scope.reasoning || "Clinical write denied");
    err.code = "CLINICAL_ACCESS_DENIED";
    throw err;
  }
  return scope;
}
async function signOutgoingLiveSyncMutation(mutation, actionType) {
  const user = clinicalSessionContext.user;
  const privateKey = clinicalSessionContext.decryptedPrivateKeyPem;
  if (!user || !privateKey || !mutation) return null;
  const patientId = String(mutation.patientId || mutation.entityId || "");
  if (!patientId) return null;
  const deltaData = mutation.data || mutation.changedKeys || mutation;
  const lastBlockHash = clinicalSessionContext.lastBlockHashByPatient.get(patientId) || "genesis";
  const signed = await signClinicalChange({
    userId: user.user_id,
    privateKeyPem: privateKey,
    patientId,
    actionType: actionType || mutation.entityType || "clinical.mutation",
    deltaData,
    lastBlockHash
  });
  clinicalSessionContext.lastBlockHashByPatient.set(patientId, signed.blockHash);
  return signed;
}
async function verifyIncomingClinicalLedger(clinicalLedger, publicKeyPem) {
  if (!clinicalLedger || !publicKeyPem) return false;
  return verifyIncomingPeerChange(
    clinicalLedger.transactionBody,
    clinicalLedger.signature,
    publicKeyPem
  );
}
async function guardAndSignLiveSyncMutation(mutation, envelope) {
  const patientId = mutation?.patientId || mutation?.entityId;
  if (patientId) assertClinicalWriteAllowed(String(patientId));
  const signed = await signOutgoingLiveSyncMutation(mutation, mutation?.op || mutation?.entityType);
  if (signed && envelope && typeof envelope === "object") {
    envelope.clinicalLedger = signed;
  }
  return signed;
}

// public/js/clinical-access-runtime/mobile.mjs
function pruneMobilePatientsOutsideTeamScope() {
  if (!shouldEnforceTeamPatientMirror()) return 0;
  return prunePatientsOutsideVisibleScope();
}
async function refreshDesktopPatientListAfterScopePrune() {
  if (typeof document === "undefined") return;
  try {
    const mod = await import("/mobile/js/chunks/patients-FRNAP5DS.js");
    if (typeof mod.ensureActivePatientInSidebarScope === "function") {
      mod.ensureActivePatientInSidebarScope();
    }
    if (typeof mod.renderPatientList === "function") {
      mod.renderPatientList({ silent: true });
    }
  } catch {
  }
  try {
    const { renderGuardiaCensusGrid: renderGuardiaCensusGrid2 } = await import("/mobile/js/chunks/guardia-grid-VAD5DLOH.js");
    const { rt: rt3 } = await import("/mobile/js/chunks/patients-runtime-state-AKX7ODKY.js");
    renderGuardiaCensusGrid2(rt3.getSettings());
  } catch {
  }
}
async function finalizeMobileLanPatientCensus() {
  if (!shouldEnforceTeamPatientMirror()) return { pruned: 0 };
  const pruned = pruneMobilePatientsOutsideTeamScope();
  if (typeof document === "undefined") return { pruned };
  try {
    const mod = await import("/mobile/js/chunks/patients-FRNAP5DS.js");
    if (typeof mod.invalidateMobileSidebarPatientCache === "function") {
      mod.invalidateMobileSidebarPatientCache();
    }
    if (typeof mod.ensureActivePatientInSidebarScope === "function") {
      mod.ensureActivePatientInSidebarScope();
    }
    if (typeof mod.renderPatientList === "function") {
      mod.renderPatientList({ silent: true });
    }
  } catch {
  }
  return { pruned };
}

// public/js/features/clinical-teams/shared.mjs
var CLINICAL_TEAM_SERVICES = [
  "Sala",
  "Interconsultas",
  "Eme",
  "Torre HU",
  "UX",
  "\xC1rea A/Pensionistas"
];
var CLINICAL_SALAS = CLINICAL_SALA_VALUES;
var BROWSE_SALA_LS = "clinical.browseSala";
var CLINICAL_TEAMS_COLLAPSE_LS_PREFIX = "rpc.clinicalTeamsCollapse.";
function readClinicalTeamsCollapseOpen(key, defaultOpen = true) {
  try {
    const v = localStorage.getItem(CLINICAL_TEAMS_COLLAPSE_LS_PREFIX + key);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch (_e) {
    void _e;
  }
  return defaultOpen;
}
function writeClinicalTeamsCollapseOpen(key, open) {
  try {
    localStorage.setItem(CLINICAL_TEAMS_COLLAPSE_LS_PREFIX + key, open ? "1" : "0");
  } catch (_e) {
    void _e;
  }
}
function renderClinicalTeamsCollapsible(opts) {
  const {
    collapseKey,
    defaultOpen = true,
    summaryHtml,
    bodyHtml,
    className = ""
  } = opts;
  const open = readClinicalTeamsCollapseOpen(collapseKey, defaultOpen);
  const extraClass = className ? ` ${className}` : "";
  return `
    <details class="clinical-teams-collapse${extraClass}" data-collapse-key="${escapeAttr(collapseKey)}"${open ? " open" : ""}>
      <summary class="clinical-teams-collapse-summary">${summaryHtml}</summary>
      <div class="clinical-teams-collapse-body">${bodyHtml}</div>
    </details>`;
}
var adminAccessGrantedThisSession = false;
var verifiedAdminAccessCode = null;
function isAdminAccessGrantedThisSession() {
  return adminAccessGrantedThisSession;
}
function markAdminAccessGrantedThisSession() {
  adminAccessGrantedThisSession = true;
}
function rememberAdminAccessCode(code) {
  adminAccessGrantedThisSession = true;
  verifiedAdminAccessCode = code;
}
function clearAdminAccessGrant() {
  adminAccessGrantedThisSession = false;
  verifiedAdminAccessCode = null;
}
function getVerifiedAdminAccessCode() {
  return verifiedAdminAccessCode;
}
var adminCodePromptResolve = null;
function adminCodeModalBackdropEl() {
  return document.getElementById("clinical-admin-code-backdrop");
}
function closeAdminCodeModal() {
  const bd = adminCodeModalBackdropEl();
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}
function promptAdminAccessCode() {
  const bd = adminCodeModalBackdropEl();
  const input = document.getElementById("clinical-admin-code-input");
  const err = document.getElementById("clinical-admin-code-error");
  if (!bd || !(input instanceof HTMLInputElement)) return Promise.resolve(null);
  input.value = "";
  if (err) {
    err.hidden = true;
    err.textContent = "";
  }
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  input.focus();
  return new Promise((resolve) => {
    adminCodePromptResolve = resolve;
  });
}
function finishAdminCodePrompt(code) {
  closeAdminCodeModal();
  const resolve = adminCodePromptResolve;
  adminCodePromptResolve = null;
  resolve?.(code);
}
function submitAdminCodeModal() {
  const input = document.getElementById("clinical-admin-code-input");
  const err = document.getElementById("clinical-admin-code-error");
  const code = input instanceof HTMLInputElement ? input.value : "";
  if (!verifyAdminAccessCode(code)) {
    if (err) {
      err.textContent = "C\xF3digo incorrecto.";
      err.hidden = false;
    }
    if (input instanceof HTMLInputElement) input.focus();
    return;
  }
  finishAdminCodePrompt(String(code).trim());
}
function cancelAdminCodeModal() {
  finishAdminCodePrompt(null);
}
function wireAdminCodeModalControls() {
  const bd = adminCodeModalBackdropEl();
  if (bd && !bd._rpcAdminCodeBackdropWired) {
    bd._rpcAdminCodeBackdropWired = true;
    bd.addEventListener("click", (ev) => {
      if (ev.target === bd) cancelAdminCodeModal();
    });
  }
  const form = document.getElementById("clinical-admin-code-form");
  if (form && !form._rpcAdminCodeFormWired) {
    form._rpcAdminCodeFormWired = true;
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      submitAdminCodeModal();
    });
  }
  const cancelBtn = document.getElementById("btn-clinical-admin-code-cancel");
  if (cancelBtn && !cancelBtn._rpcAdminCodeCancelWired) {
    cancelBtn._rpcAdminCodeCancelWired = true;
    cancelBtn.addEventListener("click", () => cancelAdminCodeModal());
  }
  const closeBtn = document.getElementById("btn-clinical-admin-code-close");
  if (closeBtn && !closeBtn._rpcAdminCodeCloseWired) {
    closeBtn._rpcAdminCodeCloseWired = true;
    closeBtn.addEventListener("click", () => cancelAdminCodeModal());
  }
}
function dbApi3() {
  if (typeof window === "undefined") return null;
  return window.rplusDb || window.electronAPI || null;
}
function toast2(msg, type = "info") {
  showToast(msg, type);
}
function toastTeamWarnings(warnings) {
  const first = Array.isArray(warnings) ? String(warnings[0] || "").trim() : "";
  if (first) toast2(first, "warn");
}
function hintHtml(text) {
  return `<p class="clinical-teams-hint">${escapeHtml(text)}</p>`;
}
function currentUserId() {
  return String(clinicalSessionContext.user?.user_id || "");
}
function filterJoinedTeams(teams, userOrUserId, usernameHint) {
  let uid = "";
  let handle = "";
  if (userOrUserId && typeof userOrUserId === "object") {
    uid = String(userOrUserId.user_id || "");
    handle = normalizeUsername(userOrUserId.username || "");
  } else {
    uid = String(userOrUserId || "");
    handle = normalizeUsername(usernameHint || "");
  }
  if (!uid && !handle) return [];
  return (teams || []).filter(
    (team) => (team.members || []).some((m) => {
      if (uid && String(m.user_id) === uid) return true;
      if (handle && normalizeUsername(m.username || "") === handle) return true;
      return false;
    })
  );
}
function isUserTeamMember(team, user) {
  const uid = String(user?.user_id || "");
  const handle = normalizeUsername(user?.username || "");
  return (team.members || []).some((m) => {
    if (uid && String(m.user_id) === uid) return true;
    if (handle && normalizeUsername(m.username || "") === handle) return true;
    return false;
  });
}

export {
  markClinicalAccessBootReady,
  waitForClinicalAccessReady,
  shouldEnforceTeamPatientMirror,
  shouldFilterPatientsByJoinedTeam,
  hasProgramAdminPrivileges,
  effectiveClinicalRank,
  hasElevatedTeamPrivileges,
  shouldUseElevatedPatientCensus,
  shouldShowClinicalCensusFilters,
  isPatientVisibleOnMobileTeamMirror,
  CLINICAL_TEAM_SERVICES,
  CLINICAL_SALAS,
  BROWSE_SALA_LS,
  CLINICAL_TEAMS_COLLAPSE_LS_PREFIX,
  readClinicalTeamsCollapseOpen,
  writeClinicalTeamsCollapseOpen,
  renderClinicalTeamsCollapsible,
  isAdminAccessGrantedThisSession,
  markAdminAccessGrantedThisSession,
  rememberAdminAccessCode,
  clearAdminAccessGrant,
  getVerifiedAdminAccessCode,
  adminCodeModalBackdropEl,
  promptAdminAccessCode,
  cancelAdminCodeModal,
  wireAdminCodeModalControls,
  dbApi3 as dbApi,
  toast2 as toast,
  toastTeamWarnings,
  hintHtml,
  currentUserId,
  filterJoinedTeams,
  isUserTeamMember,
  CENSUS_TEAM_FILTER_UNASSIGNED,
  writeElevatedTeamFilterPreference,
  censusFiltersUseFullTeamCatalog,
  censusTeamCatalogForFilters,
  resolveCensusTeamFilterId,
  reconcileCensusTeamFilterForSala,
  readCensusFiltersCollapsed,
  writeCensusFiltersCollapsed,
  patientForScopeEvaluate,
  filterPatientsForGuardiaCensus,
  elevatedPatientFilters,
  buildTeamSelectOptions,
  isCultivoBlockStartLine,
  splitResLabsByTipo,
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  findCultivoChunkInSet,
  lanUsersModalBackdropEl,
  lanUsersModalBodyEl,
  isLanDirectoryModalOpen,
  clinicalUserActivityTier,
  formatClinicalUserLastActivity,
  formatClinicalUserActivityBadge,
  clinicalUserActivityHistoryEntries,
  formatClinicalUserActivityHistory,
  renderLanUsersDirectoryTopButtonHtml,
  renderLanUsersDirectoryEntryHtml,
  resolveLanUserPlacement,
  formatLanCycleOptionLabel,
  publishClinicalTeamsToLan,
  toastTeamLanPublishResult,
  pullClinicalOpsFromCloudRoom,
  refreshClinicalOpsDirectory,
  publishClinicalTeamsAfterChange,
  pullClinicalOpsFromLanRoom,
  resolveLocalUserIdByLanHandle,
  reloadLanUsersDirectoryPreservingUi,
  loadLanUsersDirectoryIntoHost,
  refreshLanDirectoryFromHostUi,
  pullLanDirectoryFromHostIfDue,
  openLanUsersDirectoryModal,
  closeLanUsersDirectoryModal,
  wireLanUsersDirectoryControls,
  tryMountClinicalTeamInviteBrowserGate,
  syncCreateTeamServiceFromSala,
  syncCreateTeamCycleField,
  renderCreateTeamForm,
  renderCreateTeamFormElevated,
  renderCreateTeamFormStandard,
  renderCreateTeamSectionHtml,
  renderJoinWithCodeSectionHtml,
  formatNmDietClause,
  patientHasInsulinRescatesInReceta,
  partitionAnalgesiaForSoap,
  partitionNmMedsForSoap,
  buildHiTempClause,
  medsListForSoap,
  medsClauseOrEmpty,
  SOAP_EMPTY_MED_FALLBACK,
  soapMedCategorySegment,
  resolveSoporteClause,
  resolveKcalDisplay,
  buildNmClause,
  assembleSoapLines,
  soapLegacyFieldIdForCategory,
  registerSoapEstadoRuntime,
  mergeSoapMedField,
  openSOAPModalDirect,
  copyToClipboardSafe,
  closeSOAPModal,
  renderEstadoActualBar,
  renderEstadoActualButton,
  windowHandlers,
  listBringableLocalPatients,
  assignBringablePatientsToTeam,
  wireClinicalTeamsPanelInteractions,
  wireBrowseSalaControl,
  wireJoinButtons,
  wireInheritPatientsButtons,
  wireCopyInviteButtons,
  wireRenderedClinicalTeamsPanel,
  renderClinicalTeamsPanel,
  consumeClinicalTeamJoinFromUrl,
  wireClinicalTeamsModalChrome,
  teamsModalEl,
  refreshTeamsUiAfterChange,
  openClinicalTeamsPanel,
  closeClinicalTeamsPanel,
  wireTeamManageModalDelegation,
  handleEditTeamSubmit,
  isCloudSalaUpgradePending,
  clearCloudSalaUpgradePending,
  persistProfileFromPanel,
  handleProfileFormSubmit,
  handleCreateTeamSubmit,
  handleAddMemberSubmit,
  handleMyCycleSubmit,
  wireClinicalTeamsControls,
  getClinicalTeamsPanelHost,
  setClinicalTeamsPanelLoading,
  showClinicalTeamsPanelShell,
  setClinicalTeamsPanelError,
  safeRenderClinicalTeamsPanel,
  ensureClinicalPanelSession,
  renderEventualidadesPanel,
  invalidateEventualidadesPanel,
  applyDriveImportEventualidades,
  parseEstadoActualPaste,
  formatEstadoActualParsePreview,
  GUARDIA_GRID_MODE_KEY,
  ENTREGA_PHASE_KEY,
  ensureEntregaTargetUser,
  collectEntregaScopeUsers,
  listEntregaTargets,
  resolveEntregaSourceTeamId,
  resolveEntregaCensusTeamId,
  entregaSourceTeamHint,
  entregaSourceTeamSelectOptions,
  resolveR1GuardiaCovering,
  resolveEntregaPhaseCovering,
  resolveUserSalaForEntrega,
  getEntregaPhase,
  isEntregaPhaseActive,
  getEntregaPhaseCoveringUserId,
  startEntregaPhase,
  endEntregaPhase,
  endEntregaPhaseFlow,
  beginEntregaPhaseFlow,
  toggleEntregaPhase,
  loadGuardiaGridViewContext,
  saveGuardiaGridMode,
  submitEntregaAssignment,
  collectEntregaFormPayload,
  persistEntregaFormState,
  openEntregaModal,
  closeEntregaModal,
  resolveEntregaActorRole2 as resolveEntregaActorRole,
  resolveGuardiaTrustStripModel,
  buildGuardiaTrustStripFromSession,
  buildGuardiaTrustStripHtml,
  syncGuardiaTrustStrip,
  isIncomingPreviewWindow,
  isChartLockedForPatient,
  renderIncomingStrip,
  openRotationConfigModal,
  closeRotationConfigModal,
  confirmNuevaRotacion,
  syncRotationConfigButton,
  syncGuardiaRotationToolbar,
  wireRotationConfigOpenControl,
  wireGuardiaRotationControls,
  wireNuevaRotacionControl,
  syncGuardiaIncomingStrip,
  syncGuardiaPhaseBar,
  teardownGuardiaPhaseBar,
  resolveGuardiaGridRank,
  bootstrapGuardiaViewOnEnter,
  bootstrapGuardiaCensusData,
  guardiaBoardSettings,
  handleEntregaPhaseButtonClick,
  installGuardiaEntregaControls,
  installGuardiaAppShell,
  syncEntregaPhaseChrome,
  wireGuardiaEntregaPhaseButton,
  pendingTodoCount,
  labsSnippetForPatient,
  enrichPatientForGuardiaCard,
  computeGuardiaSummary,
  renderGuardiaSummaryTiles,
  renderGuardiaCensusHead,
  syncGuardiaLearnNudgeChrome,
  appendGuardiaLearnNudge,
  wireGuardiaModeToggle,
  syncGuardiaBoardChrome,
  renderGuardiaBoard,
  syncGuardiaModeButtonVisibility,
  formatCensoMedsFromReceta,
  classifyCensoTableLine,
  resolveCensoFimiLabel,
  parseCamaCellForCenso,
  formatCamaCellLabel,
  buildCensusPayload,
  activePatientTeamId,
  assignPatientToTeamClinical,
  syncPatientRegistrationTeamSelect,
  readPatientRegistrationTeamId,
  buildPatientTeamAssignSectionHtml,
  wirePatientTeamAssignRefresh,
  patientTeamAssignWindowHandlers,
  isEntregaRosterOpen,
  openEntregaRosterPanel,
  closeEntregaRosterPanel,
  activateTurnoActivo,
  deactivateTurnoActivo,
  getTurnoStartedAt,
  isTurnoActivo,
  fetchClinicalScopeContextFromDb,
  fetchClinicalTeamsFromDb,
  fetchActiveRotationCycleFromDb,
  fetchIncomingAssignmentsFromDb,
  mapPatientForGuardiaGrid,
  buildGuardiasMap,
  syncGuardiaCensusPanelVisibility,
  renderGuardiaCensusGrid,
  refreshGuardiaCensusFromDb,
  getClinicalScopeContextForEvaluate,
  prunePatientsOutsideVisibleScope,
  isClinicalScopeReadyForLanPatientApply,
  applyClinicalScopeFromLanOpsSnapshot,
  ensureTeamAssignedPatientsOnDevice,
  ensureElevatedWardCensusOnDevice,
  refreshClinicalPatientListForScope,
  wireClinicalOpsSyncRefresh,
  touchClinicalSessionActivity,
  migrateLocalPatientsClinicalSala,
  getClinicalUser,
  unlockClinicalSessionOverlay,
  refreshClinicalUserProfile,
  resolveClinicalRank,
  bootstrapClinicalAccess,
  lookupClinicalUserByUsername,
  resumeClinicalIdentityByUsername,
  initClinicalAccessRuntime,
  stopClinicalAccessRuntime,
  resumeClinicalSession,
  assertClinicalWriteAllowed,
  signOutgoingLiveSyncMutation,
  verifyIncomingClinicalLedger,
  guardAndSignLiveSyncMutation,
  pruneMobilePatientsOutsideTeamScope,
  refreshDesktopPatientListAfterScopePrune,
  finalizeMobileLanPatientCensus
};
//# sourceMappingURL=/js/chunks/chunk-FHDPZLZP.js.map
