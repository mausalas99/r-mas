import { resolveMembershipCycleForUser } from '../../clinico-access.mjs';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';

/**
 * @param {import('../../preload.js').ElectronAPI} api
 * @param {ReturnType<import('./panel-admin-equipos-row-persist.mjs').readEquiposRowDraft>} draft
 */
async function persistClinicalAdminProfile(api, draft) {
  const callerUserId = String(clinicalSessionContext.user?.user_id || '');
  const profileRes = await api.dbClinicalUserAdminProfile({
    callerUserId,
    username: String(draft.username || '').trim(),
    displayName: draft.displayName,
    rank: draft.rank,
    sala: draft.sala || undefined,
  });
  if (!profileRes?.ok || !profileRes?.user?.user_id) {
    return { ok: false, error: profileRes?.error || 'No se pudo guardar el perfil clínico.' };
  }
  return { ok: true, userId: String(profileRes.user.user_id) };
}

/**
 * @param {import('../../preload.js').ElectronAPI} api
 * @param {ReturnType<import('./panel-admin-equipos-row-persist.mjs').readEquiposRowDraft>} draft
 */
async function provisionClinicalCloudUser(api, draft) {
  const callerUserId = String(clinicalSessionContext.user?.user_id || '');
  const prov = await api.dbClinicalUserProvisionCloud({
    callerUserId,
    username: String(draft.username || '').trim(),
    displayName: draft.displayName,
    rank: draft.rank,
  });
  if (!prov?.ok || !prov?.user?.user_id) {
    return { ok: false, error: prov?.error || 'No se pudo crear el perfil clínico.' };
  }
  return { ok: true, userId: String(prov.user.user_id) };
}

/**
 * @param {import('../../preload.js').ElectronAPI} api
 * @param {ReturnType<import('./panel-admin-equipos-row-persist.mjs').readEquiposRowDraft>} draft
 */
export async function resolveClinicalProfileUserId(api, draft) {
  if (typeof api.dbClinicalUserAdminProfile === 'function') {
    return persistClinicalAdminProfile(api, draft);
  }

  const existingId = String(draft.userId || '').trim();
  if (existingId) return { ok: true, userId: existingId };

  if (typeof api.dbClinicalUserProvisionCloud !== 'function') {
    return { ok: false, error: 'No se pudo guardar el perfil clínico.' };
  }
  return provisionClinicalCloudUser(api, draft);
}

/**
 * @param {import('../../preload.js').ElectronAPI} api
 * @param {ReturnType<import('./panel-admin-equipos-row-persist.mjs').readEquiposRowDraft>} draft
 * @param {string} resolvedUserId
 */
export async function assignDraftToTeam(api, draft, resolvedUserId) {
  if (!draft.teamId) {
    return { ok: true, assigned: false, warnings: [] };
  }
  if (!draft.subAreaFraction) {
    return { ok: false, error: 'Elige el ciclo de @' + draft.username + '.' };
  }
  if (typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    return { ok: false, error: 'No se pudo asignar (base clínica no disponible).' };
  }

  const res = await api.dbClinicalTeamsMemberAdd({
    teamId: draft.teamId,
    userId: resolvedUserId,
    username: resolvedUserId ? undefined : draft.username,
    subAreaFraction: draft.subAreaFraction,
    exclusive: true,
  });
  if (!res || res.ok === false) {
    return { ok: false, error: res?.error || 'No se asignó a @' + draft.username + '.' };
  }
  return {
    ok: true,
    assigned: true,
    movedFrom: Number(res.movedFrom || 0),
    warnings: Array.isArray(res.warnings) ? res.warnings : [],
  };
}

/** @returns {import('../../preload.js').ElectronAPI | null} */
export function equiposDbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {unknown} el */
function isSelectLike(el) {
  return (
    !!el &&
    typeof el === 'object' &&
    'value' in el &&
    typeof /** @type {{ selectedIndex?: unknown }} */ (el).selectedIndex === 'number'
  );
}

/** @param {unknown} el */
function selectValue(el) {
  if (!isSelectLike(el)) return '';
  return String(/** @type {{ value?: unknown }} */ (el).value || '').trim();
}

/** @param {HTMLElement | null | undefined} row */
export function readEquiposRowRank(row) {
  const rankSel = row?.querySelector?.('.cloud-sync-admin-equipos-rank');
  const fromSelect = selectValue(rankSel);
  if (fromSelect) return fromSelect;
  return String(row?.getAttribute?.('data-user-rank') || 'R1').trim() || 'R1';
}

/** @param {HTMLElement | null | undefined} row */
export function readEquiposRowSala(row) {
  const fromSelect = selectValue(row?.querySelector?.('.cloud-sync-admin-equipos-user-sala'));
  if (fromSelect) return fromSelect;
  return String(row?.getAttribute?.('data-sala') || '').trim();
}

/**
 * Snapshot of a row's pending assign/rank fields (DOM → payload).
 * @param {HTMLElement} row
 * @param {object[]} teams
 */
export function readEquiposRowDraft(row, teams) {
  const username = String(
    row.getAttribute('data-cloud-username') || row.getAttribute('data-username') || ''
  ).trim();
  const displayName = String(row.getAttribute('data-cloud-display') || '').trim();
  const userId = String(row.getAttribute('data-user-id') || '').trim();
  const sala = readEquiposRowSala(row);
  const rank = readEquiposRowRank(row);
  const teamId = selectValue(row.querySelector('.cloud-sync-admin-equipos-team'));
  let subAreaFraction = selectValue(row.querySelector('.cloud-sync-admin-equipos-cycle'));
  const team = (teams || []).find((t) => String(t.team_id) === teamId) || null;
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, rank);
  }
  return { username, displayName, userId, sala, rank, teamId, subAreaFraction, team, row };
}

/**
 * Persist rank (+ optional team membership) for one draft. No UI reload.
 * @param {ReturnType<typeof equiposDbApi>} api
 * @param {ReturnType<typeof readEquiposRowDraft>} draft
 */
export async function persistEquiposRowDraft(api, draft) {
  if (!api) return { ok: false, error: 'Base clínica no disponible.' };
  if (!String(draft.username || '').trim()) return { ok: false, error: 'Usuario inválido.' };

  const profile = await resolveClinicalProfileUserId(api, draft);
  if (!profile.ok) return { ok: false, error: profile.error };

  const assign = await assignDraftToTeam(api, draft, profile.userId);
  if (!assign.ok) return { ok: false, error: assign.error };

  return {
    ok: true,
    resolvedUserId: profile.userId,
    assigned: assign.assigned,
    movedFrom: assign.movedFrom,
    warnings: assign.warnings,
  };
}
