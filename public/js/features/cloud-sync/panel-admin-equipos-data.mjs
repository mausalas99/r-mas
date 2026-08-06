import { normalizeUsername } from '../../clinical-username.mjs';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { CLINICAL_SALAS } from '../clinical-teams/shared.mjs';
import {
  adminErrorHtml,
  equiposListHtml,
  equiposSalaOptionsHtml,
} from './panel-admin-equipos-html.mjs';

/** @returns {import('../../preload.js').ElectronAPI | null} */
function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {Array<{ username?: string, user_id?: string, clinical_name?: string, rank?: string, sala?: string }>} clinicalUsers */
function clinicalByUsername(clinicalUsers) {
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const u of clinicalUsers || []) {
    const h = normalizeUsername(u?.username || '');
    if (h) map.set(h, u);
  }
  return map;
}

/**
 * Cloud accounts + clinical-only roster users (test / LAN peers without Nube login).
 * @param {Array<{ id?: string, username?: string, display_name?: string, disabled?: boolean }>} cloudUsers
 * @param {object[]} clinicalUsers
 */
export function mergeCloudUsersForEquipos(cloudUsers, clinicalUsers) {
  const byHandle = clinicalByUsername(clinicalUsers);
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {object[]} */
  const rows = [];

  for (const cloud of cloudUsers || []) {
    if (!cloud || cloud.disabled) continue;
    const handle = normalizeUsername(cloud.username || '');
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    const clinical = byHandle.get(handle);
    rows.push({
      user_id: clinical?.user_id ? String(clinical.user_id) : '',
      username: handle,
      clinical_name: String(clinical?.clinical_name || cloud.display_name || '').trim(),
      rank: String(clinical?.rank || 'R1'),
      sala: String(clinical?.sala || '').trim(),
      cloudId: String(cloud.id || ''),
      hasLocalProfile: Boolean(clinical?.user_id),
      clinicalOnly: false,
    });
  }

  for (const clinical of clinicalUsers || []) {
    const handle = normalizeUsername(clinical?.username || '');
    if (!handle || seen.has(handle)) continue;
    const userId = String(clinical?.user_id || '').trim();
    if (!userId) continue;
    seen.add(handle);
    rows.push({
      user_id: userId,
      username: handle,
      clinical_name: String(clinical?.clinical_name || '').trim(),
      rank: String(clinical?.rank || 'R1'),
      sala: String(clinical?.sala || '').trim(),
      cloudId: '',
      hasLocalProfile: true,
      clinicalOnly: true,
    });
  }

  return rows.sort((a, b) => a.username.localeCompare(b.username, 'es'));
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
  const salas = [...new Set((teams || []).map((t) => String(t.sala || '').trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'es')
  );
  const ordered = CLINICAL_SALAS.filter((s) => salas.includes(s));
  const extras = salas.filter((s) => !ordered.includes(s));
  sel.innerHTML = equiposSalaOptionsHtml([...ordered, ...extras]);
  if (prev) sel.value = prev;
}

/** @param {HTMLElement} host @param {string} q @param {string} sala */
function applyEquiposClientFilters(host, q, sala) {
  const term = String(q || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');
  const salaFilter = String(sala || '').trim();
  host.querySelectorAll('.cloud-sync-admin-equipos-row').forEach((row) => {
    const hay = String(row.getAttribute('data-search') || '');
    const rowSala = String(row.getAttribute('data-sala') || '').trim();
    const matchQ = !term || hay.includes(term);
    const matchSala = !salaFilter || !rowSala || rowSala === salaFilter;
    row.hidden = !(matchQ && matchSala);
  });
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
    const callerUserId = String(clinicalSessionContext.user?.user_id || '');
    const [cloudRes, teamsRes, clinicalRes] = await Promise.all([
      getApi().adminUsers(''),
      api.dbClinicalTeamsList(),
      typeof api.dbClinicalUsersList === 'function'
        ? api.dbClinicalUsersList({ callerUserId })
        : Promise.resolve({ ok: true, users: [] }),
    ]);

    const teams = teamsRes?.ok && Array.isArray(teamsRes.teams) ? teamsRes.teams : [];
    const clinicalUsers =
      clinicalRes?.ok && Array.isArray(clinicalRes.users) ? clinicalRes.users : [];
    const rows = mergeCloudUsersForEquipos(cloudRes?.users || [], clinicalUsers);

    paintEquiposSalaSelect(root, teams);

    const salaSel = root.querySelector('[data-admin-equipos-sala]');
    const salaFilter = salaSel instanceof HTMLSelectElement ? salaSel.value : '';
    const filteredTeams = filterTeamsBySala(teams, salaFilter);

    list.innerHTML = equiposListHtml(rows, filteredTeams);

    const search = root.querySelector('[data-admin-equipos-search]');
    const q = search instanceof HTMLInputElement ? search.value : '';
    applyEquiposClientFilters(list, q, salaFilter);

    root.dispatchEvent(
      new CustomEvent('cloud-admin-equipos-loaded', {
        bubbles: true,
        detail: { teams, rows },
      })
    );
  } catch (err) {
    list.innerHTML = adminErrorHtml(
      err?.data?.message || err?.message || 'No se pudieron cargar usuarios y equipos.'
    );
  }
}
