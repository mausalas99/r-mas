import { buildInternoBoardDto } from '../../../../lib/interno/interno-board.mjs';
import { resolveInternoBoardPatients } from '../../../../lib/interno/interno-scope.mjs';
import { getSalaInternoAccess } from './auth.js';
import { loadRoomState, resolveRoomForSala } from './room-resolve.js';
import { normalizeInternoSala } from './sala-slug.js';

/** @param {unknown} clinicalOps */
export function buildInternoScopeFromClinicalOps(clinicalOps) {
  if (!clinicalOps || typeof clinicalOps !== 'object') {
    return { teams: [], salaGuardiaToday: [] };
  }
  const membership = Array.isArray(clinicalOps.team_membership)
    ? clinicalOps.team_membership
    : [];
  /** @type {Map<string, object[]>} */
  const membersByTeam = new Map();
  for (const row of membership) {
    const teamId = String(row?.team_id || '').trim();
    if (!teamId) continue;
    if (!membersByTeam.has(teamId)) membersByTeam.set(teamId, []);
    membersByTeam.get(teamId).push(row);
  }
  const teams = (clinicalOps.teams || []).map((team) => ({
    ...team,
    members: membersByTeam.get(String(team.team_id || '')) || [],
  }));
  return {
    teams,
    salaGuardiaToday: clinicalOps.team_guardia_today || [],
  };
}

/** @param {object[]} entries */
export function censusPatientIdsFromEntries(entries) {
  return new Set(
    (entries || [])
      .map((entry) => String(entry?.id || '').trim())
      .filter(Boolean)
  );
}

/** @param {object[]} entries */
export function entriesToPatients(entries) {
  return (entries || []).filter((entry) => entry?.id).map((entry) => ({ ...entry }));
}

/** @param {object|null|undefined} board @param {string} patientId */
export function boardIncludesPatient(board, patientId) {
  return !!board?.patients?.some((row) => String(row.id) === String(patientId));
}

/**
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 */
export async function readInternoBoard(env, db, sala) {
  const normalized = normalizeInternoSala(sala);
  if (!normalized) return null;

  const access = await getSalaInternoAccess(db, normalized);
  if (!access || access.is_active !== 1) {
    return {
      sala: normalized,
      active: false,
      inactive: true,
      summary: { total: 0 },
      patients: [],
    };
  }

  const room = await resolveRoomForSala(db, normalized);
  if (!room) {
    return {
      sala: normalized,
      active: true,
      summary: { total: 0, vitalsOverdue: 0, vitalsDueSoon: 0, signosMonitored: 0 },
      patients: [],
    };
  }

  const state = await loadRoomState(env, db, String(room.id));
  const clinicalOps = state?.clinicalOps || null;
  const activeGuardias = (clinicalOps?.active_guardias || []).filter(
    (row) => String(row?.status || 'Active') === 'Active'
  );
  const scope = buildInternoScopeFromClinicalOps(clinicalOps);
  const patients = resolveInternoBoardPatients(
    entriesToPatients(state?.entries || []),
    activeGuardias,
    normalized,
    scope,
    { censusPatientIds: censusPatientIdsFromEntries(state?.entries || []) }
  );

  const guardiasByPatientId = new Map();
  for (const guardia of activeGuardias) {
    guardiasByPatientId.set(String(guardia.patient_id), guardia);
  }

  return buildInternoBoardDto(normalized, patients, guardiasByPatientId);
}

/**
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 * @param {string} patientId
 */
export async function assertInternoPatientOnBoard(env, db, sala, patientId) {
  const board = await readInternoBoard(env, db, sala);
  if (!board?.active) {
    return { error: Response.json({ error: 'interno_inactive' }, { status: 403 }) };
  }
  if (!boardIncludesPatient(board, patientId)) {
    return { error: Response.json({ error: 'patient_out_of_scope' }, { status: 403 }) };
  }
  return { board, room: await resolveRoomForSala(db, sala) };
}
