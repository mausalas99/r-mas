import { decodeRoomState } from './crypto-at-rest.js';
import { SyncError } from './errors.js';
import { resolveActiveRoomForUser } from './rooms.js';
import { userFromAuthHeader } from './session.js';
import { filterLabSidecarsForMobilePull, resolveLabSetMs } from './mobile-lab-window.js';
import { resolvePatientTeamIdFromAssignments } from '../../../lib/clinical-scope/team-membership.mjs';

/**
 * Accept ?auth= (mobile URL convention) in addition to Authorization: Bearer.
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {Request} request
 */
async function userFromPaseRequest(db, request) {
  const url = new URL(request.url);
  const authParam = String(url.searchParams.get('auth') || '').trim();
  if (authParam) {
    return userFromAuthHeader(
      db,
      new Request(request.url, { headers: { Authorization: `Bearer ${authParam}` } })
    );
  }
  return userFromAuthHeader(db, request);
}

/**
 * Find the clinical user_id for the session username in clinicalOps.clinical_users[].
 * @param {unknown[] | null | undefined} clinicalUsers
 * @param {string} username
 */
function resolveClinicalUserId(clinicalUsers, username) {
  const needle = String(username || '').toLowerCase().trim();
  if (!needle || !Array.isArray(clinicalUsers)) return null;
  const found = clinicalUsers.find(
    (u) => String(u?.username || '').toLowerCase().trim() === needle
  );
  return found ? String(found.user_id || found.id || '').trim() || null : null;
}

/**
 * Return the set of team_ids where the clinical user is a member.
 * Respects team_membership_removals (leave tombstones).
 * @param {unknown[] | null | undefined} membership
 * @param {unknown[] | null | undefined} removals
 * @param {string | null} clinicalUserId
 */
function resolveUserTeamIds(membership, removals, clinicalUserId) {
  if (!clinicalUserId) return new Set();
  const removed = new Set();
  for (const r of removals || []) {
    if (String(r?.user_id || '').trim() === clinicalUserId) {
      removed.add(String(r?.team_id || '').trim());
    }
  }
  const teams = new Set();
  for (const m of membership || []) {
    const tid = String(m?.team_id || '').trim();
    const uid = String(m?.user_id || '').trim();
    if (uid === clinicalUserId && tid && !removed.has(tid)) teams.add(tid);
  }
  return teams;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {Record<string, unknown>} sidecarMap filtered to the 3-day window
 */
export function buildPatientSummary(entry, sidecarMap) {
  const fields = entry.fields && typeof entry.fields === 'object' ? entry.fields : {};
  const labs = Object.values(sidecarMap)
    .filter((s) => s && typeof s === 'object')
    .sort((a, b) => (resolveLabSetMs(b) ?? 0) - (resolveLabSetMs(a) ?? 0));
  return {
    id: String(entry.id),
    nombre: String(fields.nombre || entry.nombre || '').trim(),
    cama: String(fields.cama || entry.cama || '').trim(),
    expediente: String(fields.registro || entry.registro || '').trim(),
    labs,
  };
}

/**
 * GET /api/sync/v1/pase-labs
 *
 * Returns only the patients assigned to the authenticated user's team(s),
 * with their lab sidecars from the last 3 calendar days (all draws, newest-first).
 *
 * Query params:
 *   - auth=<token>   → same token as in the R+ mobile URL (alternative to Bearer header)
 *   - teamId=<id>    → optional override: filter to a specific team instead of user's teams
 *
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database, WORKER_DATA_KEY?: string }} env
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function handlePaseLabs(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET') {
    throw new SyncError('not_found', 'Método no permitido.');
  }
  const db = env.DB;
  if (!db) throw new SyncError('error', 'Base de datos no configurada.');

  const user = await userFromPaseRequest(db, request);
  if (!user) throw new SyncError('auth_required', 'Sesión inválida o expirada.');

  const room = await resolveActiveRoomForUser(db, user);
  if (!room) {
    throw new SyncError('not_found', 'Sin sala nube activa. Únete desde escritorio primero.');
  }

  const row = await db
    .prepare('SELECT ciphertext, iv FROM room_state WHERE room_id = ?')
    .bind(room.id)
    .first();
  if (!row) throw new SyncError('not_found', 'Estado de sala vacío.');

  const state = await decodeRoomState(env, row.ciphertext, row.iv);
  const entries = Array.isArray(state?.entries) ? state.entries : [];
  const rawSidecars =
    state?.labSidecars && typeof state.labSidecars === 'object' ? state.labSidecars : {};
  const tombstones = state?.tombstones || {};
  const clinicalOps =
    state?.clinicalOps && typeof state.clinicalOps === 'object' ? state.clinicalOps : {};

  // Resolve which team IDs the authenticated user belongs to
  const url = new URL(request.url);
  const forcedTeamId = String(url.searchParams.get('teamId') || '').trim();
  let activeTeamIds;
  if (forcedTeamId) {
    activeTeamIds = new Set([forcedTeamId]);
  } else {
    const clinicalUserId = resolveClinicalUserId(clinicalOps.clinical_users, user.username);
    activeTeamIds = resolveUserTeamIds(
      clinicalOps.team_membership,
      clinicalOps.team_membership_removals,
      clinicalUserId
    );
  }

  const assignments = Array.isArray(clinicalOps.patient_team_assignment)
    ? clinicalOps.patient_team_assignment
    : [];
  const nowIso = new Date().toISOString();
  const filteredSidecars = filterLabSidecarsForMobilePull(rawSidecars);

  const patients = entries
    .filter((e) => {
      if (!e?.id || tombstones[String(e.id)]) return false;
      const assignedTeam = resolvePatientTeamIdFromAssignments(e.id, assignments, nowIso);
      return assignedTeam && activeTeamIds.has(assignedTeam);
    })
    .map((e) => buildPatientSummary(e, filteredSidecars[String(e.id)] || {}));

  return Response.json({ room: { id: room.id, name: room.name }, patients }, { headers: CORS_HEADERS });
}
