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
