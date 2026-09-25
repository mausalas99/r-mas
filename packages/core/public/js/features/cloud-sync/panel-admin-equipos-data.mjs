import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { normalizeUsername } from '../../clinical-username.mjs';
import { resolveUserPlacement } from '../clinical-teams/teams-roster-directory-render.mjs';
import { CLINICAL_SALAS } from '../clinical-teams/shared.mjs';
import {
  adminErrorHtml,
  equiposListHtml,
  equiposSalaOptionsHtml,
} from './panel-admin-equipos-html.mjs';
import {
  countVisibleEquiposRows,
  paintEquiposFilterSummary,
} from './panel-admin-equipos-summary.mjs';

export { equiposFilterSummaryText } from './panel-admin-equipos-summary.mjs';

/** @param {HTMLElement} row */
export function rowSalaForFilter(row) {
  const sel = row.querySelector('.cloud-sync-admin-equipos-user-sala');
  if (sel instanceof HTMLSelectElement) return String(sel.value || '').trim();
  return String(row.getAttribute('data-sala') || '').trim();
}

/** @param {string} hay @param {string} term */
function matchesEquiposSearch(hay, term) {
  return !term || hay.includes(term);
}

/** @param {string} rowSala @param {string} salaFilter */
function matchesEquiposSala(rowSala, salaFilter) {
  if (!salaFilter) return true;
  return rowSala === salaFilter;
}

/** @param {string} activityFlag @param {string} activity */
function matchesEquiposActivity(activityFlag, activity) {
  if (activity === 'all') return true;
  if (activity === 'has' || activity === 'active') return activityFlag === 'has';
  if (activity === 'none' || activity === 'inactive') return activityFlag !== 'has';
  return true;
}

/** @param {boolean} hasTeam @param {string} teamStatus */
function matchesEquiposTeamStatus(hasTeam, teamStatus) {
  if (teamStatus === 'all') return true;
  if (teamStatus === 'unassigned') return !hasTeam;
  if (teamStatus === 'assigned') return hasTeam;
  return true;
}

/**
 * @param {HTMLElement} row
 * @param {{ q?: string, sala?: string, activity?: string, teamStatus?: string }} opts
 */
export function rowMatchesEquiposFilters(row, opts) {
  const term = String(opts.q || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');
  const salaFilter = String(opts.sala || '').trim();
  const activity = String(opts.activity || 'all').trim() || 'all';
  const teamStatus = String(opts.teamStatus || 'all').trim() || 'all';

  const hay = String(row.getAttribute('data-search') || '');
  const rowSala = rowSalaForFilter(row);
  const activityFlag = String(row.getAttribute('data-activity') || 'none');
  const hasTeam = String(row.getAttribute('data-has-team') || '0') === '1';

  return (
    matchesEquiposSearch(hay, term) &&
    matchesEquiposSala(rowSala, salaFilter) &&
    matchesEquiposActivity(activityFlag, activity) &&
    matchesEquiposTeamStatus(hasTeam, teamStatus)
  );
}

/**
 * Client-only hide/show — never remounts rows (keeps checkbox selections).
 * @param {HTMLElement} host
 * @param {{ q?: string, sala?: string, activity?: string, teamStatus?: string }} opts
 */
export function applyEquiposClientFilters(host, opts = {}) {
  host.querySelectorAll('.cloud-sync-admin-equipos-row').forEach((row) => {
    if (!(row instanceof HTMLElement)) return;
    row.hidden = !rowMatchesEquiposFilters(row, opts);
  });
}

/** @param {object | undefined} clinical */
function equiposActivityFields(clinical) {
  return {
    last_activity_at: clinical?.last_activity_at ? String(clinical.last_activity_at) : '',
    created_at: clinical?.created_at ? String(clinical.created_at) : '',
    activity_history: Array.isArray(clinical?.activity_history) ? clinical.activity_history : [],
  };
}

/** @param {object | undefined} clinical @param {string} displayNameFallback */
function equiposClinicalFields(clinical, displayNameFallback) {
  return {
    clinical_name: String(clinical?.clinical_name || displayNameFallback || '').trim(),
    rank: String(clinical?.rank || 'R1'),
    sala: String(clinical?.sala || '').trim(),
    ...equiposActivityFields(clinical),
  };
}

/** @param {Array<{ username?: string, user_id?: string }>} clinicalUsers */
export function clinicalByUsername(clinicalUsers) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const u of clinicalUsers || []) {
    const h = normalizeUsername(u?.username || '');
    if (h) map.set(h, u);
  }
  return map;
}

/**
 * @param {{ id?: string, username?: string, display_name?: string }} cloud
 * @param {object | undefined} clinical
 */
export function buildEquiposRowFromCloud(cloud, clinical) {
  const handle = normalizeUsername(cloud.username || '');
  return {
    user_id: clinical?.user_id ? String(clinical.user_id) : '',
    username: handle,
    ...equiposClinicalFields(clinical, cloud.display_name),
    cloudId: String(cloud.id || ''),
    hasLocalProfile: Boolean(clinical?.user_id),
    clinicalOnly: false,
  };
}

/** @param {object} clinical */
export function buildEquiposRowFromClinicalOnly(clinical) {
  const handle = normalizeUsername(clinical?.username || '');
  return {
    user_id: String(clinical?.user_id || '').trim(),
    username: handle,
    ...equiposClinicalFields(clinical, ''),
    cloudId: '',
    hasLocalProfile: true,
    clinicalOnly: true,
  };
}

/** @param {object[]} cloudUsers @param {Map<string, object>} byHandle @param {Set<string>} seen */
function collectCloudEquiposRows(cloudUsers, byHandle, seen) {
  /** @type {object[]} */
  const rows = [];
  for (const cloud of cloudUsers || []) {
    if (!cloud || cloud.disabled) continue;
    const handle = normalizeUsername(cloud.username || '');
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    rows.push(buildEquiposRowFromCloud(cloud, byHandle.get(handle)));
  }
  return rows;
}

/** @param {object[]} clinicalUsers @param {Set<string>} seen */
function collectClinicalOnlyEquiposRows(clinicalUsers, seen) {
  /** @type {object[]} */
  const rows = [];
  for (const clinical of clinicalUsers || []) {
    const handle = normalizeUsername(clinical?.username || '');
    if (!handle || seen.has(handle)) continue;
    if (!String(clinical?.user_id || '').trim()) continue;
    seen.add(handle);
    rows.push(buildEquiposRowFromClinicalOnly(clinical));
  }
  return rows;
}

/**
 * Cloud accounts + clinical-only roster users (test / LAN peers without Nube login).
 * @param {Array<{ id?: string, username?: string, display_name?: string, disabled?: boolean }>} cloudUsers
 * @param {object[]} clinicalUsers
 */
export function mergeCloudUsersForEquipos(cloudUsers, clinicalUsers) {
  const byHandle = clinicalByUsername(clinicalUsers);
  const seen = new Set();
  const rows = [
    ...collectCloudEquiposRows(cloudUsers, byHandle, seen),
    ...collectClinicalOnlyEquiposRows(clinicalUsers, seen),
  ];
  return rows.sort((a, b) => a.username.localeCompare(b.username, 'es'));
}

/** @param {string} userId @param {object[]} teams */
function equiposAssignmentRank(userId, teams) {
  return userId && resolveUserPlacement(userId, teams) ? 1 : 0;
}

/** @param {string} iso */
function equiposActivityRank(iso) {
  const ts = Date.parse(String(iso || '')) || 0;
  return { ts, has: ts > 0 ? 1 : 0 };
}

/**
 * @param {object} a
 * @param {object} b
 * @param {object[]} teams
 */
export function compareEquiposRowsForAdmin(a, b, teams) {
  const assignDelta =
    equiposAssignmentRank(String(a.user_id || ''), teams) -
    equiposAssignmentRank(String(b.user_id || ''), teams);
  if (assignDelta) return assignDelta;

  const aAct = equiposActivityRank(a.last_activity_at);
  const bAct = equiposActivityRank(b.last_activity_at);
  if (aAct.has !== bAct.has) return aAct.has - bAct.has;
  if (aAct.ts !== bAct.ts) return bAct.ts - aAct.ts;
  return String(a.username || '').localeCompare(String(b.username || ''), 'es');
}

/**
 * Unassigned + unused first, then by username — faster admin pass.
 * @param {object[]} rows
 * @param {object[]} teams
 */
export function sortEquiposRowsForAdmin(rows, teams) {
  return (rows || []).slice().sort((a, b) => compareEquiposRowsForAdmin(a, b, teams));
}

/** @type {{ overview: object | null, rooms: object[] }} */
let equiposAdminMeta = { overview: null, rooms: [] };

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
  const sala = salaSel instanceof HTMLSelectElement ? salaSel.value : '';
  applyEquiposClientFilters(list, {
    q: search instanceof HTMLInputElement ? search.value : '',
    sala,
    activity: activitySel instanceof HTMLSelectElement ? activitySel.value : 'all',
    teamStatus: teamSel instanceof HTMLSelectElement ? teamSel.value : 'all',
  });
  const counts = countVisibleEquiposRows(list);
  paintEquiposFilterSummary(root, {
    ...counts,
    overview: equiposAdminMeta.overview,
    salaFilter: sala,
    rooms: equiposAdminMeta.rooms,
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
  const [cloudRes, teamsRes, clinicalRes, overviewRes, roomsRes] = await Promise.all([
    getApi().adminUsers(''),
    api.dbClinicalTeamsList(),
    clinicalPromise,
    getApi().adminOverview().catch(() => null),
    getApi().adminRooms().catch(() => ({ rooms: [] })),
  ]);
  return {
    teams: teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [],
    clinicalUsers: clinicalRes?.ok && Array.isArray(clinicalRes.users) ? clinicalRes.users : [],
    cloudUsers: cloudRes?.users || [],
    overview: overviewRes,
    rooms: roomsRes?.rooms || [],
  };
}

/**
 * @param {HTMLElement} root
 * @param {{ teams: object[], clinicalUsers: object[], cloudUsers: object[] }} payload
 */
function renderEquiposAdminList(root, payload) {
  equiposAdminMeta = {
    overview: payload.overview || null,
    rooms: Array.isArray(payload.rooms) ? payload.rooms : [],
  };
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
