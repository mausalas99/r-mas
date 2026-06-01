/**
 * Wires clinical access modules into the running app (Guardia grid, session, signing).
 */
import { isDbMode } from './db-storage-bridge.mjs';
import { isGuardiaMode } from './features/chrome.mjs';
import { patients } from './app-state.mjs';
import { evaluateClinicalScope } from './clinico-access.mjs';
import { signClinicalChange, verifyIncomingPeerChange } from './features/crypto-signer.mjs';
import { renderGuardiaBoard } from './features/guardia-board.mjs';
import {
  BackgroundVitalsMonitorLoop,
  ClientSessionInactivityLocker,
} from './features/session-manager.mjs';

/** @type {{ user: object|null, guardias: object[], guardiasMap: Map<string, object>, teams: object[], scopeContext: object|null, decryptedPrivateKeyPem: string|null, lastBlockHashByPatient: Map<string, string> }} */
export const clinicalSessionContext = {
  user: null,
  guardias: [],
  guardiasMap: new Map(),
  teams: [],
  scopeContext: null,
  decryptedPrivateKeyPem: null,
  lastBlockHashByPatient: new Map(),
};

/** @type {BackgroundVitalsMonitorLoop|null} */
let vitalsLoop = null;
/** @type {ClientSessionInactivityLocker|null} */
let sessionLocker = null;

function electronApi() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
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
export async function bootstrapClinicalAccess(settings, clientId) {
  if (!isDbMode()) return false;
  const api = electronApi();
  if (!api || typeof api.dbClinicalAccessBootstrap !== 'function') return false;

  const res = await api.dbClinicalAccessBootstrap({
    clientId,
    rank: resolveClinicalRank(settings, clientId),
  });
  if (!res || res.ok === false) return false;

  clinicalSessionContext.user = {
    user_id: res.user.userId,
    username: res.user.username,
    rank: res.user.rank,
    public_key: res.user.publicKeyPem,
  };
  clinicalSessionContext.decryptedPrivateKeyPem = res.user.privateKeyPem || null;
  clinicalSessionContext.guardias = Array.isArray(res.guardias) ? res.guardias : [];
  clinicalSessionContext.guardiasMap = buildGuardiasMap(clinicalSessionContext.guardias);
  await fetchClinicalTeamsFromDb();
  await fetchClinicalScopeContextFromDb();
  return true;
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 * @param {string} clientId
 */
export async function initClinicalAccessRuntime(settings, clientId) {
  const ok = await bootstrapClinicalAccess(settings, clientId);
  if (!ok) return;

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
    String(clinicalSessionContext.user?.user_id || clientId)
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

/** @returns {object} */
export function getClinicalScopeContextForEvaluate() {
  const cached = clinicalSessionContext.scopeContext;
  if (cached && typeof cached === 'object') {
    return {
      teams: Array.isArray(cached.teams) ? cached.teams : clinicalSessionContext.teams,
      guardias: Array.isArray(cached.guardias)
        ? cached.guardias
        : clinicalSessionContext.guardias,
      cycle: cached.cycle ?? null,
      assignments: Array.isArray(cached.assignments) ? cached.assignments : [],
      salaGuardiaToday: Array.isArray(cached.salaGuardiaToday) ? cached.salaGuardiaToday : [],
      now: cached.now || new Date().toISOString(),
    };
  }
  return {
    teams: clinicalSessionContext.teams,
    guardias: clinicalSessionContext.guardias,
    cycle: null,
    assignments: [],
    salaGuardiaToday: [],
    now: new Date().toISOString(),
  };
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
