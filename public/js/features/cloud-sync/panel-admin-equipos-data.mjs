import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { CLINICAL_SALAS } from '../clinical-teams/shared.mjs';
import {
  adminErrorHtml,
  equiposListHtml,
  equiposSalaOptionsHtml,
} from './panel-admin-equipos-html.mjs';
import { mergeCloudUsersForEquipos } from './panel-admin-equipos-merge.mjs';
import { applyEquiposClientFilters } from './panel-admin-equipos-filters.mjs';
import { sortEquiposRowsForAdmin } from './panel-admin-equipos-sort.mjs';

export { mergeCloudUsersForEquipos } from './panel-admin-equipos-merge.mjs';
export { applyEquiposClientFilters } from './panel-admin-equipos-filters.mjs';
export { sortEquiposRowsForAdmin } from './panel-admin-equipos-sort.mjs';

/** @returns {import('../../preload.js').ElectronAPI | null} */
function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {object[]} teams @param {string} salaFilter */
export function filterTeamsBySala(teams, salaFilter) {
  const list = Array.isArray(teams) ? teams : [];
  const sala = String(salaFilter || '').trim();
  if (!sala) return list;
  return list.filter((t) => String(t.sala || '').trim() === sala);
}

/** @param {HTMLElement} root @param {object[]} teams */
function paintEquiposSalaSelect(root, teams) {
  const sel = root.querySelector('[data-admin-equipos-sala]');
  if (!(sel instanceof HTMLSelectElement)) return;
  const prev = sel.value;
  const fromTeams = [
    ...new Set((teams || []).map((t) => String(t.sala || '').trim()).filter(Boolean)),
  ];
  const extras = fromTeams
    .filter((s) => !CLINICAL_SALAS.includes(s))
    .sort((a, b) => a.localeCompare(b, 'es'));
  sel.innerHTML = equiposSalaOptionsHtml([...CLINICAL_SALAS, ...extras]);
  if (prev) sel.value = prev;
}

/** @param {HTMLElement} root */
export function applyEquiposFiltersFromToolbar(root) {
  const list = root.querySelector('[data-admin-equipos-list]');
  if (!list) return;
  const search = root.querySelector('[data-admin-equipos-search]');
  const salaSel = root.querySelector('[data-admin-equipos-sala]');
  const activitySel = root.querySelector('[data-admin-equipos-activity]');
  const teamSel = root.querySelector('[data-admin-equipos-team-status]');
  applyEquiposClientFilters(list, {
    q: search instanceof HTMLInputElement ? search.value : '',
    sala: salaSel instanceof HTMLSelectElement ? salaSel.value : '',
    activity: activitySel instanceof HTMLSelectElement ? activitySel.value : 'all',
    teamStatus: teamSel instanceof HTMLSelectElement ? teamSel.value : 'all',
  });
}

/**
 * @param {import('../../preload.js').ElectronAPI} api
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 */
async function fetchEquiposAdminPayload(api, getApi) {
  const callerUserId = String(clinicalSessionContext.user?.user_id || '');
  const clinicalPromise =
    typeof api.dbClinicalUsersList === 'function'
      ? api.dbClinicalUsersList({ callerUserId })
      : Promise.resolve({ ok: true, users: [] });
  const [cloudRes, teamsRes, clinicalRes] = await Promise.all([
    getApi().adminUsers(''),
    api.dbClinicalTeamsList(),
    clinicalPromise,
  ]);
  return {
    teams: teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [],
    clinicalUsers: clinicalRes?.ok && Array.isArray(clinicalRes.users) ? clinicalRes.users : [],
    cloudUsers: cloudRes?.users || [],
  };
}

/**
 * @param {HTMLElement} root
 * @param {{ teams: object[], clinicalUsers: object[], cloudUsers: object[] }} payload
 */
function renderEquiposAdminList(root, payload) {
  const rows = sortEquiposRowsForAdmin(
    mergeCloudUsersForEquipos(payload.cloudUsers, payload.clinicalUsers),
    payload.teams
  );
  paintEquiposSalaSelect(root, payload.teams);
  const list = root.querySelector('[data-admin-equipos-list]');
  if (!list) return rows;
  list.innerHTML = equiposListHtml(rows, payload.teams);
  applyEquiposFiltersFromToolbar(root);
  return rows;
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 */
export async function loadAdminEquipos(root, getApi) {
  const list = root.querySelector('[data-admin-equipos-list]');
  if (!list) return;
  list.innerHTML = '<p class="cloud-sync-hint">Cargando…</p>';

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsList !== 'function') {
    list.innerHTML = adminErrorHtml(
      'Asignar equipos requiere R+ de escritorio con base clínica desbloqueada.'
    );
    return;
  }

  try {
    const payload = await fetchEquiposAdminPayload(api, getApi);
    const rows = renderEquiposAdminList(root, payload);
    root.dispatchEvent(
      new CustomEvent('cloud-admin-equipos-loaded', {
        bubbles: true,
        detail: { teams: payload.teams, rows },
      })
    );
  } catch (err) {
    list.innerHTML = adminErrorHtml(
      err?.data?.message || err?.message || 'No se pudieron cargar usuarios y equipos.'
    );
  }
}
