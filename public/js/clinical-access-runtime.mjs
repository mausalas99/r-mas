/**
 * Wires clinical access modules into the running app (Guardia grid, session, signing).
 */
import { isDbMode } from './db-storage-bridge.mjs';
import { shouldEnforceTeamPatientMirror } from './clinical-privileges.mjs';
import { isMobileWeb } from './mobile-web.mjs';
import { filterPatientsForClinicalSidebar } from './features/patients-clinical-filter.mjs';
import { isGuardiaMode } from './features/chrome.mjs';
import { patients, notes, indicaciones, labHistory, setPatients, saveState } from './app-state.mjs';
import {
  evaluateClinicalScope,
  migratePatientsClinicalSala,
  readEntregaPhaseActive,
  userHasJoinedClinicalTeams,
  userIsOnGuardiaCallToday,
} from './clinico-access.mjs';
import {
  effectiveClinicalRank,
  hasElevatedTeamPrivileges,
  shouldUseElevatedPatientCensus,
} from './clinical-privileges.mjs';
import { signClinicalChange, verifyIncomingPeerChange } from './features/crypto-signer.mjs';
import { renderGuardiaBoard } from './features/guardia-board.mjs';
import {
  BackgroundVitalsMonitorLoop,
  ClientSessionInactivityLocker,
} from './features/session-manager.mjs';
import { persistClinicalUserBinding, readRpcSettings } from './clinical-settings.mjs';
import {
  isLegacyMachineUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from './clinical-username.mjs';
import {
  clinicalSessionContext,
  resolveClinicalSessionUserId,
} from './clinical-session-context.mjs';
import {
  buildClinicalScopeContextFromOpsSnapshot,
  resolveClinicalUserRowFromOpsSnapshot,
} from './clinical-scope-from-ops.mjs';
import { joinedTeamIdsForUser } from './mobile-team-patient-scope.mjs';

export { clinicalSessionContext };

/** @type {BackgroundVitalsMonitorLoop|null} */
let vitalsLoop = null;
/** @type {ClientSessionInactivityLocker|null} */
let sessionLocker = null;

let clinicalAccessBootDone = false;
/** @type {Array<() => void>} */
let clinicalAccessBootWaiters = [];
let lastClinicalActivityTouchAt = 0;
/** Throttle DB writes; clinical saves also touch via IPC save_all. */
const CLINICAL_ACTIVITY_TOUCH_MIN_MS = 60 * 1000;
let clinicalActivityLanPushTimer = null;

/** Unblocks LAN room boot after clinical session + scope hydrate (or timeout). */
export function markClinicalAccessBootReady() {
  if (clinicalAccessBootDone) return;
  clinicalAccessBootDone = true;
  const waiters = clinicalAccessBootWaiters;
  clinicalAccessBootWaiters = [];
  for (const resolve of waiters) resolve();
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('rpc-clinical-access-ready'));
  }
}

export function waitForClinicalAccessReady() {
  if (!isDbMode() || clinicalAccessBootDone) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 20000);
    clinicalAccessBootWaiters.push(function () {
      clearTimeout(timer);
      resolve();
    });
  });
}

/** True when LAN may apply/filter patient bundle rows for the signed-in user. */
export function isClinicalScopeReadyForLanPatientApply() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return false;
  if (shouldUseElevatedPatientCensus(user)) return true;
  const ctx = clinicalSessionContext.scopeContext;
  if (!ctx) return false;
  if (!shouldEnforceTeamPatientMirror()) return true;
  return joinedTeamIdsForUser(ctx.teams, user.user_id).size > 0;
}

/**
 * iPad/PWA: hydrate teams/assignments from LAN clinicalOps (no SQLCipher merge).
 * @param {object|null|undefined} snapshot
 * @returns {boolean}
 */
export function applyClinicalScopeFromLanOpsSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || isDbMode()) return false;
  const sessionUser = clinicalSessionContext.user;
  const settings = readRpcSettings();
  const resolved = resolveClinicalUserRowFromOpsSnapshot(snapshot, {
    userId: sessionUser?.user_id || settings.clinicalUserId,
    username: sessionUser?.username || settings.clinicalUsername,
  });
  if (resolved) {
    const rank = String(resolved.rank || sessionUser?.rank || 'R1').trim() || 'R1';
    const nextUser = {
      user_id: String(resolved.user_id),
      username: resolved.username ?? sessionUser?.username ?? null,
      rank: rank === 'Admin' ? 'R1' : rank,
      sala: resolved.sala ?? sessionUser?.sala ?? null,
      clinical_name: resolved.clinical_name ?? sessionUser?.clinical_name ?? null,
      is_program_admin:
        resolved.is_program_admin === 1 || resolved.is_program_admin === true ? 1 : 0,
    };
    clinicalSessionContext.user = nextUser;
    persistClinicalUserBinding({
      userId: nextUser.user_id,
      username: nextUser.username || undefined,
      rank: nextUser.rank,
      sala: nextUser.sala,
      displayName: nextUser.clinical_name || undefined,
      isProgramAdmin: nextUser.is_program_admin === 1,
      registered: true,
    });
  }
  const ctx = buildClinicalScopeContextFromOpsSnapshot(snapshot, {
    guardiaMode: clinicalSessionContext.guardiaMode,
    entregaPhaseActive: readEntregaPhaseActive(),
    enforceTeamPatientScope: true,
  });
  if (!ctx) return false;
  clinicalSessionContext.scopeContext = ctx;
  clinicalSessionContext.teams = ctx.teams;
  clinicalSessionContext.guardias = ctx.guardias;
  clinicalSessionContext.guardiasMap = buildGuardiasMap(ctx.guardias);
  if (typeof document !== 'undefined') {
    void import('./features/patients.mjs')
      .then((mod) => {
        if (typeof mod.invalidateMobileSidebarPatientCache === 'function') {
          mod.invalidateMobileSidebarPatientCache();
        }
      })
      .catch(() => {});
  }
  return true;
}

/**
 * Sidebar scope is enforced in patientsVisibleInSidebar — do not delete charts from storage.
 * @returns {number} always 0 (legacy callers kept for compatibility)
 */
export function prunePatientsOutsideClinicalScope() {
  return 0;
}

function electronApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 * @param {string} [clientId]
 */
export function resolveClinicalRank(settings, clientId) {
  void clientId;
  const rank = settings && settings.clinicalRank ? String(settings.clinicalRank) : 'R1';
  const allowed = new Set(['R1', 'R2', 'R3', 'R4', 'Admin']);
  return allowed.has(rank) ? rank : 'R1';
}

/** @param {Record<string, unknown>} p */
export function mapPatientForGuardiaGrid(p) {
  const cuarto = p.cuarto != null ? String(p.cuarto) : '';
  const cama = p.cama != null ? String(p.cama) : '';
  return {
    id: String(p.id),
    bed_label: [cuarto, cama].filter(Boolean).join('-'),
    name: String(p.nombre || ''),
    service: String(p.servicio || p.area || ''),
    sub_area: String(p.area || ''),
    negativa_maniobras_firmada: Number(p.negativa_maniobras_firmada || 0),
    interconsult_type: String(p.interconsult_type || 'None'),
    interconsult_status: String(p.interconsult_status || 'Pending'),
  };
}

/** @param {object[]} guardias */
export function buildGuardiasMap(guardias) {
  const map = new Map();
  (guardias || []).forEach((g) => {
    if (g && g.patient_id) map.set(String(g.patient_id), g);
  });
  return map;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 * @param {string} clientId
 */
/** @param {object} res Bootstrap IPC payload with `user` and `guardias`. */
async function applyBootstrapResult(res) {
  const api = electronApi();
  clinicalSessionContext.user = {
    user_id: res.user.userId,
    username: res.user.username,
    rank: res.user.rank,
    is_program_admin: res.user.isProgramAdmin ? 1 : 0,
    public_key: res.user.publicKeyPem,
  };
  if (api && typeof api.dbClinicalProfileGet === 'function') {
    try {
      const profileRes = await api.dbClinicalProfileGet({ userId: res.user.userId });
      const profile = profileRes?.profile;
      if (profile && clinicalSessionContext.user) {
        const profileRank = String(profile.rank || '');
        clinicalSessionContext.user.rank =
          profileRank === 'Admin' ? 'R1' : profileRank || clinicalSessionContext.user.rank;
        clinicalSessionContext.user.sala = profile.sala ?? null;
        clinicalSessionContext.user.clinical_name = profile.clinical_name ?? null;
        clinicalSessionContext.user.is_program_admin =
          profile.is_program_admin === 1 || profileRank === 'Admin' ? 1 : 0;
      }
    } catch (_e) {}
  }
  clinicalSessionContext.decryptedPrivateKeyPem = res.user.privateKeyPem || null;
  clinicalSessionContext.guardias = Array.isArray(res.guardias) ? res.guardias : [];
  clinicalSessionContext.guardiasMap = buildGuardiasMap(clinicalSessionContext.guardias);
  clinicalSessionContext.orphanGuardias = Array.isArray(res.orphans) ? res.orphans : [];
  const settings = readRpcSettings();
  const clientId = String(settings.clientId || '');
  const patch = {
    userId: res.user.userId,
    username: res.user.username,
  };
  if (isLegacyMachineUsername(res.user.username, clientId)) {
    patch.staleDeviceUserId = res.user.userId;
  }
  persistClinicalUserBinding(patch);
  await refreshClinicalUserProfile();
  await fetchClinicalTeamsFromDb();
  await fetchClinicalScopeContextFromDb();
  if (hasElevatedTeamPrivileges(clinicalSessionContext.user)) {
    void ensureElevatedWardCensusOnDevice({
      allowLanPull: true,
      lanPullDelayMs: 8000,
      teamFilterId: '',
    });
  }
  if (typeof document !== 'undefined') {
    void import('./clinical-profile-lan-sync.mjs')
      .then((mod) => mod.flushClinicalProfileToLan())
      .catch(() => {});
  }
  migrateLocalPatientsClinicalSala();
}

/** @returns {number} patients tagged with sala */
export function migrateLocalPatientsClinicalSala() {
  const user = clinicalSessionContext.user;
  const settings = readRpcSettings();
  const sala =
    String(user?.sala || '').trim() || String(settings.clinicalSala || '').trim();
  if (!sala) return 0;

  const actor = user ? { ...user, sala } : { sala };
  const migrated = migratePatientsClinicalSala(patients, actor);
  if (migrated > 0) {
    void saveState({ immediate: true });
    if (typeof document !== 'undefined') {
      void import('./features/patients.mjs')
        .then((mod) => mod.renderPatientList({ silent: true }))
        .catch(() => {});
    }
  }
  return migrated;
}

export async function bootstrapClinicalAccess(settings, clientId) {
  if (!isDbMode()) return false;
  const api = electronApi();
  if (!api || typeof api.dbClinicalAccessBootstrap !== 'function') return false;

  const stored = settings || readRpcSettings();
  const res = await api.dbClinicalAccessBootstrap({
    clientId,
    rank: resolveClinicalRank(stored, clientId),
    preferredUserId: String(stored.clinicalUserId || ''),
    preferredUsername: String(stored.clinicalUsername || ''),
  });
  if (!res || res.ok === false) return false;

  await applyBootstrapResult(res);
  return true;
}

/**
 * Resolve a LAN @usuario row in the local DB (exact handle; no device bootstrap).
 * @returns {Promise<{ user_id: string, username?: string }|null>}
 */
export async function lookupClinicalUserByUsername(username) {
  if (!isDbMode()) return null;
  const api = electronApi();
  const handle = normalizeUsername(username);
  if (!api || typeof api.dbClinicalUserLookup !== 'function' || !isValidUsernameFormat(handle)) {
    return null;
  }
  try {
    const res = await api.dbClinicalUserLookup({ username: handle });
    if (!res?.ok || !res.user?.user_id) return null;
    return res.user;
  } catch (_e) {
    return null;
  }
}

/**
 * Reattach this device to an existing LAN username already stored in the DB.
 * @returns {Promise<{ ok: boolean, error?: string, userId?: string }>}
 */
export async function resumeClinicalIdentityByUsername(username, settings, clientId) {
  void clientId;
  if (!isDbMode()) return { ok: false, error: 'Base de datos no activa.' };
  const api = electronApi();
  const handle = normalizeUsername(username);
  if (!api) {
    return { ok: false, error: 'Sesión clínica no disponible.' };
  }
  const stored = settings || readRpcSettings();

  if (typeof api.dbClinicalIdentityResume === 'function') {
    const previousUserId = String(clinicalSessionContext.user?.user_id || '');
    const staleFromSettings = String(stored.clinicalStaleDeviceUserId || '');
    const fromUserId =
      previousUserId && previousUserId !== String(stored.clinicalUserId || '')
        ? previousUserId
        : staleFromSettings || previousUserId;
    const res = await api.dbClinicalIdentityResume({
      username: handle,
      fromUserId,
    });
    if (!res || res.ok === false) {
      return { ok: false, error: res?.error || 'No se pudo recuperar la cuenta.' };
    }
    await applyBootstrapResult(res);
    persistClinicalUserBinding({
      userId: res.user.userId,
      username: res.user.username,
    });
    if (Number(res.membershipMoved) > 0) {
      await fetchClinicalTeamsFromDb();
    }
    return { ok: true, userId: res.user.userId, membershipMoved: res.membershipMoved };
  }

  if (typeof api.dbClinicalAccessBootstrap !== 'function') {
    return { ok: false, error: 'Sesión clínica no disponible.' };
  }
  const res = await api.dbClinicalAccessBootstrap({
    clientId: String(stored.clientId || ''),
    rank: resolveClinicalRank(stored, String(stored.clientId || '')),
    preferredUsername: handle,
    preferredUserId: '',
  });
  if (!res || res.ok === false) {
    return { ok: false, error: res?.error || 'No se pudo recuperar la cuenta.' };
  }
  if (normalizeUsername(res.user.username) !== handle) {
    return {
      ok: false,
      error: 'No encontramos ese usuario en esta base de datos.',
    };
  }
  await applyBootstrapResult(res);
  return { ok: true, userId: res.user.userId };
}

/**
 * @param {string} [userId]
 * @param {{ force?: boolean }} [opts] — force skips throttle (clinical saves)
 */
async function touchClinicalUserActivityRemote(userId, opts = {}) {
  const api = electronApi();
  const uid = String(userId || resolveClinicalSessionUserId() || '').trim();
  if (!api || !uid || typeof api.dbClinicalUserTouch !== 'function') return false;
  const now = Date.now();
  if (!opts.force && now - lastClinicalActivityTouchAt < CLINICAL_ACTIVITY_TOUCH_MIN_MS) {
    return false;
  }
  lastClinicalActivityTouchAt = now;
  try {
    const res = await api.dbClinicalUserTouch({ userId: uid });
    if (res?.ok === false) return false;
    scheduleClinicalActivityLanPush();
    if (typeof document !== 'undefined') {
      document.dispatchEvent(
        new CustomEvent('rpc-clinical-user-activity-touched', { detail: { userId: uid } })
      );
    }
    return true;
  } catch (_e) {
    return false;
  }
}

function scheduleClinicalActivityLanPush() {
  if (clinicalActivityLanPushTimer) return;
  clinicalActivityLanPushTimer = setTimeout(() => {
    clinicalActivityLanPushTimer = null;
    void import('./features/lan-sync.mjs')
      .then((mod) => {
        if (typeof mod.pushClinicalOpsLanNow === 'function') {
          return mod.pushClinicalOpsLanNow();
        }
      })
      .catch(() => {});
  }, 4000);
}

/**
 * Record session activity after clinical edits.
 * @param {{ force?: boolean }} [opts]
 */
export function touchClinicalSessionActivity(opts = {}) {
  const userId = resolveClinicalSessionUserId();
  if (!userId) return;
  void touchClinicalUserActivityRemote(userId, opts);
}

/** Reload username, rank, sala, admin flag from DB into session. */
export async function refreshClinicalUserProfile() {
  const { ensureLanProfileGateDeviceReset } = await import('./clinical-settings.mjs');
  ensureLanProfileGateDeviceReset();
  const api = electronApi();
  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!api || !userId || typeof api.dbClinicalProfileGet !== 'function') return;
  try {
    const res = await api.dbClinicalProfileGet({ userId });
    const profile = res?.profile;
    if (!profile || !clinicalSessionContext.user) return;
    clinicalSessionContext.user.username = profile.username ?? clinicalSessionContext.user.username;
    clinicalSessionContext.user.rank = profile.rank ?? clinicalSessionContext.user.rank;
    clinicalSessionContext.user.sala = profile.sala ?? null;
    clinicalSessionContext.user.clinical_name = profile.clinical_name ?? null;
    clinicalSessionContext.user.is_program_admin =
      profile.is_program_admin === 1 ? 1 : 0;
    persistClinicalUserBinding({
      isProgramAdmin: clinicalSessionContext.user.is_program_admin === 1,
    });
    void touchClinicalUserActivityRemote(userId);
  } catch (_e) {}
  migrateLocalPatientsClinicalSala();
}

/** @param {string} reason @param {number} [delayMs] */
async function scheduleLanPatientReconcile(reason, delayMs) {
  try {
    const lan = await import('./features/lan-sync.mjs');
    if (typeof lan.isLanSessionConfiguredForRest !== 'function' || !lan.isLanSessionConfiguredForRest()) {
      return;
    }
    const rid =
      typeof lan.getActiveLiveSyncRoomId === 'function'
        ? String(lan.getActiveLiveSyncRoomId() || '').trim()
        : '';
    if (!rid) return;
    const push = await import('./features/lan/push.mjs');
    if (typeof push.scheduleReconcileLiveSyncRoom === 'function') {
      push.scheduleReconcileLiveSyncRoom(rid, { reason, delayMs });
    }
  } catch (_e) {}
}

/** Pull host census rows for team assignments missing on this device. */
export async function ensureTeamAssignedPatientsOnDevice(options) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return;
  const ctx = getClinicalScopeContextForEvaluate();
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const now = ctx.now || new Date().toISOString();
  const localIds = new Set((patients || []).map((p) => String(p?.id || '')));
  const elevated = hasElevatedTeamPrivileges(user);
  let missing = 0;

  if (elevated) {
    for (const row of assignments) {
      const pid = String(row?.patient_id || '');
      if (pid && !localIds.has(pid)) missing += 1;
    }
  } else {
    if (!userHasJoinedClinicalTeams(teams, user.user_id)) return;
    const { filterJoinedTeams } = await import('./features/clinical-teams/shared.mjs');
    const { resolvePatientTeamIdFromAssignments } = await import('./clinico-access.mjs');
    const joined = filterJoinedTeams(teams, user);
    const teamIds = new Set(joined.map((t) => String(t.team_id || '')));
    if (!teamIds.size) return;
    for (const row of assignments) {
      const pid = String(row?.patient_id || '');
      if (!pid || localIds.has(pid)) continue;
      const teamId = resolvePatientTeamIdFromAssignments(pid, assignments, now);
      if (teamIds.has(teamId)) missing += 1;
    }
  }
  if (!missing) return;
  const opts = options || {};
  if (!opts.allowLanPull) return;
  await scheduleLanPatientReconcile('missing-patients', opts.lanPullDelayMs);
}

/**
 * Elevated census: reconcile full ward from LAN host when viewing all teams.
 * @param {{ allowLanPull?: boolean, teamFilterId?: string, lanPullDelayMs?: number }} [options]
 */
export async function ensureElevatedWardCensusOnDevice(options = {}) {
  const user = clinicalSessionContext.user;
  if (!user?.user_id || !hasElevatedTeamPrivileges(user)) return;

  const teamFilterId = options.teamFilterId != null ? String(options.teamFilterId) : '';
  const viewingAllTeams = !teamFilterId;

  await ensureTeamAssignedPatientsOnDevice(options);

  if (!viewingAllTeams || !options.allowLanPull) return;
  await scheduleLanPatientReconcile(
    'full-ward-census',
    options.lanPullDelayMs != null ? options.lanPullDelayMs : 2000
  );
}

let refreshClinicalPatientListForScopeInFlight = null;
let clinicalOpsSyncedRefreshTimer = null;

/** Reload teams + scope from DB and re-filter the patient sidebar (LAN join / team roster). */
export async function refreshClinicalPatientListForScope(options) {
  if (!clinicalSessionContext.user?.user_id) return;
  if (refreshClinicalPatientListForScopeInFlight) return refreshClinicalPatientListForScopeInFlight;
  const opts = options || {};
  refreshClinicalPatientListForScopeInFlight = (async function () {
    if (isDbMode()) {
      await fetchClinicalTeamsFromDb();
      await fetchClinicalScopeContextFromDb();
      await ensureTeamAssignedPatientsOnDevice({ allowLanPull: !!opts.allowLanPull });
    }
    if (typeof document === 'undefined') return;
    try {
      const mod = await import('./features/patients.mjs');
      if (typeof mod.renderPatientList === 'function') {
        mod.renderPatientList({ silent: true });
      }
    } catch (_e) {}
  })().finally(function () {
    refreshClinicalPatientListForScopeInFlight = null;
  });
  return refreshClinicalPatientListForScopeInFlight;
}

/** One-shot host bundle pull when new team assignments arrive (not on every no-op merge). */
async function pullHostPatientsAfterAssignmentMerge(event) {
  const stats = event?.detail?.mergeStats;
  if (!stats || !(Number(stats.assignmentsInserted) > 0)) return;
  if (!isDbMode()) return;
  try {
    const lan = await import('./features/lan-sync.mjs');
    if (typeof lan.isLanSessionConfiguredForRest !== 'function' || !lan.isLanSessionConfiguredForRest()) {
      return;
    }
    const rid =
      typeof lan.getActiveLiveSyncRoomId === 'function' ? String(lan.getActiveLiveSyncRoomId() || '').trim() : '';
    if (!rid) return;
    const push = await import('./features/lan/push.mjs');
    if (typeof push.scheduleReconcileLiveSyncRoom === 'function') {
      push.scheduleReconcileLiveSyncRoom(rid, { reason: 'assignment-merge', delayMs: 2000 });
    } else if (typeof push.reconcileLiveSyncRoom === 'function') {
      void push.reconcileLiveSyncRoom(rid, { force: true, reason: 'assignment-merge' });
    }
  } catch (_e) {}
}

export function wireClinicalOpsSyncRefresh() {
  if (typeof document === 'undefined' || document._rpcClinicalOpsSyncedRefreshWired) return;
  document._rpcClinicalOpsSyncedRefreshWired = true;
  document.addEventListener('rpc-clinical-ops-synced', (event) => {
    if (document.body.classList.contains('clinical-lan-directory-open')) return;
    if (clinicalOpsSyncedRefreshTimer) clearTimeout(clinicalOpsSyncedRefreshTimer);
    clinicalOpsSyncedRefreshTimer = setTimeout(function () {
      clinicalOpsSyncedRefreshTimer = null;
      void refreshClinicalPatientListForScope({ allowLanPull: false });
      void pullHostPatientsAfterAssignmentMerge(event);
    }, 1500);
  });
}

export async function initClinicalAccessRuntime(settings, clientId) {
  const ok = await bootstrapClinicalAccess(settings, clientId);
  markClinicalAccessBootReady();
  if (!ok) return;
  wireClinicalOpsSyncRefresh();

  if (vitalsLoop) vitalsLoop.stop();
  vitalsLoop = new BackgroundVitalsMonitorLoop(
    {
      all: async (sql, params) => {
        const api = electronApi();
        if (!api || typeof api.dbGuardiaCensus !== 'function') return [];
        const census = await api.dbGuardiaCensus({ userId: clinicalSessionContext.user?.user_id });
        if (!census || census.ok === false) return [];
        return Array.isArray(census.guardias) ? census.guardias : [];
      },
    },
    String(clinicalSessionContext.user?.user_id || clientId),
    {
      shouldMonitorVitals: () => {
        const uid = String(clinicalSessionContext.user?.user_id || '');
        if (!uid) return false;
        const rank = effectiveClinicalRank(clinicalSessionContext.user);
        const teams = clinicalSessionContext.teams || [];
        const salaGuardiaToday =
          clinicalSessionContext.salaGuardiaToday ||
          clinicalSessionContext.scopeContext?.salaGuardiaToday ||
          [];
        return userIsOnGuardiaCallToday(uid, rank, teams, new Date(), salaGuardiaToday);
      },
      resolvePatientLabel: (patientId) => {
        const p = patients.find((row) => String(row.id) === String(patientId));
        if (!p) return '';
        const name = String(p.nombre || '').trim();
        const bed = [p.cuarto, p.cama].filter(Boolean).join('-');
        if (name && bed) return `${name} (${bed})`;
        return name || bed || '';
      },
    }
  );
  vitalsLoop.start();

  if (sessionLocker) sessionLocker.stop();
  sessionLocker = new ClientSessionInactivityLocker(10, 'rpc-clinical-session-lock');
  sessionLocker.start(clinicalSessionContext);

  syncGuardiaCensusPanelVisibility(settings);
  if (isGuardiaMode()) renderGuardiaBoard(settings);
}

export function stopClinicalAccessRuntime() {
  if (vitalsLoop) {
    vitalsLoop.stop();
    vitalsLoop = null;
  }
  if (sessionLocker) {
    sessionLocker.stop();
    sessionLocker = null;
  }
  clinicalSessionContext.user = null;
  clinicalSessionContext.guardias = [];
  clinicalSessionContext.guardiasMap = new Map();
  clinicalSessionContext.orphanGuardias = [];
  clinicalSessionContext.teams = [];
  clinicalSessionContext.scopeContext = null;
  clinicalSessionContext.decryptedPrivateKeyPem = null;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function syncGuardiaCensusPanelVisibility(_settings) {
  const legacyPanel = document.getElementById('guardia-census-panel');
  if (legacyPanel) legacyPanel.hidden = true;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export async function refreshGuardiaCensusFromDb(settings) {
  if (!isDbMode() || !clinicalSessionContext.user) return;
  const api = electronApi();
  if (!api || typeof api.dbGuardiaCensus !== 'function') return;
  const res = await api.dbGuardiaCensus({ userId: clinicalSessionContext.user.user_id });
  if (!res || res.ok === false) return;
  clinicalSessionContext.guardias = Array.isArray(res.guardias) ? res.guardias : [];
  clinicalSessionContext.guardiasMap = buildGuardiasMap(clinicalSessionContext.guardias);
  clinicalSessionContext.orphanGuardias = Array.isArray(res.orphans) ? res.orphans : [];
  await fetchClinicalTeamsFromDb();
  await fetchClinicalScopeContextFromDb();
  await renderGuardiaCensusGrid(settings);
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export async function renderGuardiaCensusGrid(settings) {
  if (isGuardiaMode()) renderGuardiaBoard(settings);
}

/**
 * @param {string|null|undefined} patientId
 * @param {Record<string, unknown>|null|undefined} [settings]
 */
export function assertClinicalWriteAllowed(patientId, settings) {
  const patient =
    patients.find((p) => String(p.id) === String(patientId)) ||
    (patientId ? { id: patientId } : null);
  const guardia = patientId ? clinicalSessionContext.guardiasMap.get(String(patientId)) : null;
  const scope = evaluateClinicalScope(
    clinicalSessionContext.user,
    patient,
    guardia,
    getClinicalScopeContextForEvaluate()
  );
  if (!scope.writable) {
    const err = new Error(scope.reasoning || 'Clinical write denied');
    err.code = 'CLINICAL_ACCESS_DENIED';
    throw err;
  }
  return scope;
}

/**
 * @param {object} mutation
 * @param {string} actionType
 */
export async function signOutgoingLiveSyncMutation(mutation, actionType) {
  const user = clinicalSessionContext.user;
  const privateKey = clinicalSessionContext.decryptedPrivateKeyPem;
  if (!user || !privateKey || !mutation) return null;

  const patientId = String(mutation.patientId || mutation.entityId || '');
  if (!patientId) return null;

  const deltaData = mutation.data || mutation.changedKeys || mutation;
  const lastBlockHash =
    clinicalSessionContext.lastBlockHashByPatient.get(patientId) || 'genesis';

  const signed = await signClinicalChange({
    userId: user.user_id,
    privateKeyPem: privateKey,
    patientId,
    actionType: actionType || mutation.entityType || 'clinical.mutation',
    deltaData,
    lastBlockHash,
  });

  clinicalSessionContext.lastBlockHashByPatient.set(patientId, signed.blockHash);
  return signed;
}

/**
 * @param {{ transactionBody: object, signature: string }} clinicalLedger
 * @param {string} publicKeyPem
 */
export async function verifyIncomingClinicalLedger(clinicalLedger, publicKeyPem) {
  if (!clinicalLedger || !publicKeyPem) return false;
  return verifyIncomingPeerChange(
    clinicalLedger.transactionBody,
    clinicalLedger.signature,
    publicKeyPem
  );
}

/**
 * @param {object} mutation
 * @param {object} [envelope]
 */
export async function guardAndSignLiveSyncMutation(mutation, envelope) {
  const patientId = mutation?.patientId || mutation?.entityId;
  if (patientId) assertClinicalWriteAllowed(String(patientId));
  const signed = await signOutgoingLiveSyncMutation(mutation, mutation?.op || mutation?.entityType);
  if (signed && envelope && typeof envelope === 'object') {
    envelope.clinicalLedger = signed;
  }
  return signed;
}

export function getClinicalUser() {
  return clinicalSessionContext.user;
}

function scopeContextForEvaluateFromParts(parts) {
  const enforceTeamPatientScope =
    parts.enforceTeamPatientScope != null
      ? !!parts.enforceTeamPatientScope
      : shouldEnforceTeamPatientMirror();
  return {
    teams: parts.teams,
    guardias: parts.guardias,
    cycle: parts.cycle,
    assignments: parts.assignments,
    salaGuardiaToday: parts.salaGuardiaToday,
    guardiaMode: parts.guardiaMode,
    entregaPhaseActive: parts.entregaPhaseActive,
    enforceTeamPatientScope,
    now: parts.now,
  };
}

/** @returns {object} */
export function getClinicalScopeContextForEvaluate() {
  const cached = clinicalSessionContext.scopeContext;
  if (cached && typeof cached === 'object') {
    return scopeContextForEvaluateFromParts({
      teams: Array.isArray(cached.teams) ? cached.teams : clinicalSessionContext.teams,
      guardias: Array.isArray(cached.guardias)
        ? cached.guardias
        : clinicalSessionContext.guardias,
      cycle: cached.cycle ?? null,
      assignments: Array.isArray(cached.assignments) ? cached.assignments : [],
      salaGuardiaToday: Array.isArray(cached.salaGuardiaToday) ? cached.salaGuardiaToday : [],
      guardiaMode:
        cached.guardiaMode != null
          ? !!cached.guardiaMode
          : !!clinicalSessionContext.guardiaMode,
      entregaPhaseActive:
        cached.entregaPhaseActive != null
          ? !!cached.entregaPhaseActive
          : readEntregaPhaseActive(),
      enforceTeamPatientScope: shouldEnforceTeamPatientMirror()
        ? true
        : cached.enforceTeamPatientScope,
      now: cached.now || new Date().toISOString(),
    });
  }
  const fallbackAssignments = Array.isArray(clinicalSessionContext.scopeContext?.assignments)
    ? clinicalSessionContext.scopeContext.assignments
    : [];
  return scopeContextForEvaluateFromParts({
    teams: clinicalSessionContext.teams,
    guardias: clinicalSessionContext.guardias,
    cycle: null,
    assignments: fallbackAssignments,
    salaGuardiaToday: [],
    guardiaMode: !!clinicalSessionContext.guardiaMode,
    entregaPhaseActive: readEntregaPhaseActive(),
    enforceTeamPatientScope: shouldEnforceTeamPatientMirror(),
    now: new Date().toISOString(),
  });
}

function dropPatientSidecars(pid) {
  const id = String(pid || '');
  if (!id) return;
  if (notes[id]) delete notes[id];
  if (indicaciones[id]) delete indicaciones[id];
  if (labHistory[id]) delete labHistory[id];
}

/** Replace in-memory census with team-scoped rows only (web/iPad). */
export function pruneMobilePatientsOutsideTeamScope() {
  if (!shouldEnforceTeamPatientMirror()) return 0;
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return 0;
  if (!isClinicalScopeReadyForLanPatientApply()) {
    const stale = patients.length;
    if (stale > 0) {
      setPatients([]);
      for (const pid of Object.keys(notes)) dropPatientSidecars(pid);
    }
    return stale;
  }
  const ctx = getClinicalScopeContextForEvaluate();
  const visible = filterPatientsForClinicalSidebar(
    patients,
    user,
    ctx,
    clinicalSessionContext.guardiasMap
  );
  const visibleIds = new Set(visible.map((p) => String(p?.id || '')).filter(Boolean));
  const removed = Math.max(0, patients.length - visible.length);
  for (const pid of Object.keys(notes)) {
    if (!visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  for (const p of patients) {
    const pid = String(p?.id || '');
    if (pid && !visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  setPatients(visible);
  return removed;
}

/** Prune + one sidebar refresh after LAN scope/patients settle (avoids 3↔11 flash). */
export async function finalizeMobileLanPatientCensus() {
  if (!shouldEnforceTeamPatientMirror()) return { pruned: 0 };
  const pruned = pruneMobilePatientsOutsideTeamScope();
  if (typeof document === 'undefined') return { pruned };
  try {
    const mod = await import('./features/patients.mjs');
    if (typeof mod.invalidateMobileSidebarPatientCache === 'function') {
      mod.invalidateMobileSidebarPatientCache();
    }
    if (typeof mod.ensureActivePatientInSidebarScope === 'function') {
      mod.ensureActivePatientInSidebarScope();
    }
    if (typeof mod.renderPatientList === 'function') {
      mod.renderPatientList({ silent: true });
    }
  } catch (_e) {}
  return { pruned };
}

/** @returns {Promise<object|null>} */
export async function fetchClinicalScopeContextFromDb() {
  const api = electronApi();
  const userId = clinicalSessionContext.user?.user_id;
  if (!api || typeof api.dbClinicalScopeContext !== 'function' || !userId) {
    clinicalSessionContext.scopeContext = null;
    return null;
  }
  const res = await api.dbClinicalScopeContext({ userId });
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

/** @returns {Promise<object[]>} */
export async function fetchClinicalTeamsFromDb() {
  const api = electronApi();
  if (!api || typeof api.dbClinicalTeamsList !== 'function') {
    clinicalSessionContext.teams = [];
    return [];
  }
  const res = await api.dbClinicalTeamsList();
  if (!res || res.ok === false) {
    clinicalSessionContext.teams = [];
    return [];
  }
  const teams = Array.isArray(res.teams) ? res.teams : [];
  clinicalSessionContext.teams = teams;
  return teams;
}

/** @returns {Promise<object|null>} */
export async function fetchActiveRotationCycleFromDb() {
  const api = electronApi();
  if (!api || typeof api.dbRotationCycleGet !== 'function') return null;
  const res = await api.dbRotationCycleGet();
  if (!res || res.ok === false) return null;
  return res.cycle ?? null;
}

/** @returns {Promise<object[]>} */
export async function fetchIncomingAssignmentsFromDb() {
  const api = electronApi();
  if (!api || typeof api.dbRotationIncomingAssignments !== 'function') return [];
  const res = await api.dbRotationIncomingAssignments();
  if (!res || res.ok === false) return [];
  return Array.isArray(res.assignments) ? res.assignments : [];
}

export function unlockClinicalSessionOverlay() {
  const overlay = document.getElementById('rpc-clinical-session-lock');
  if (overlay) overlay.classList.remove('active-lock-view-overlay');
}

/** @param {Record<string, unknown>|null|undefined} settings @param {string} clientId */
export async function resumeClinicalSession(settings, clientId) {
  await bootstrapClinicalAccess(settings, clientId);
  unlockClinicalSessionOverlay();
  if (sessionLocker) {
    sessionLocker.stop();
    sessionLocker = new ClientSessionInactivityLocker(10, 'rpc-clinical-session-lock');
    sessionLocker.start(clinicalSessionContext);
  }
}
