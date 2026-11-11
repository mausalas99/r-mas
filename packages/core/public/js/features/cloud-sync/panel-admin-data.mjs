import {
  applyAdminSalasFilters,
  applyCachedLabVerifications,
  applyNetworkCensusFilters,
  updateNetworkBulkBarVisibility,
  mutationsModel,
  networkCensusModel,
  networkCensusRows,
  resumenExtrasModel,
  resumenModel,
  roomDetailModel,
  salasModel,
} from './panel-admin-html.mjs';
import {
  drawAdminError,
  drawAdminHint,
  drawAdminMutations,
  drawAdminRed,
  drawAdminResumen,
  drawAdminResumenExtras,
  drawAdminRoomDetail,
  drawAdminSalas,
} from './panel-admin-view.jsx';
import { getCloudSyncRoomId } from './settings.mjs';

/** What each section loaded, so the Resumen can reuse it without refetching. @param {HTMLElement} root */
function adminData(root) {
  root._adminData ||= { rooms: null, patients: null, accounts: null };
  return root._adminData;
}

/** @param {HTMLElement} root @param {string} tab @param {number | null} n */
function setAdminCount(root, tab, n) {
  const el = root.querySelector('[data-admin-count="' + tab + '"]');
  if (el) el.textContent = n == null ? '' : String(n);
}

/**
 * Mutations carry the Nube account id as actor, so Registro names people
 * from the Nube account list (one request, cached for the panel's life).
 * @param {HTMLElement} root @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 */
async function nubeAccountsForNames(root, getApi) {
  const d = adminData(root);
  if (!d.accounts) {
    try {
      const data = await getApi().adminUsers('');
      d.accounts = (data.users || []).map((u) => ({
        user_id: String(u.id || ''),
        clinical_name: String(u.display_name || ''),
        username: String(u.username || ''),
      }));
    } catch {
      return [];
    }
  }
  return d.accounts;
}

/** Resumen's attention list, space bars and patient card. @param {HTMLElement} root */
export function renderAdminResumenExtras(root) {
  const d = adminData(root);
  const extras = root.querySelector('[data-admin-resumen-extras]');
  if (extras) drawAdminResumenExtras(extras, resumenExtrasModel(d));
  const card = root.querySelector('[data-admin-stat="patients"] .cloud-sync-admin-card-value');
  if (card && d.patients) card.textContent = String(d.patients.filter((p) => !p.archived).length);
}
import { fetchNetworkCensus } from './network-census.mjs';
import { autoVerifyStaleNetworkLabs } from './panel-admin-labs-verify.mjs';
import {
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
} from '../../clinical-access-runtime.mjs';

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 */
export async function loadAdminResumen(root, getApi) {
  const el = root.querySelector('[data-admin-resumen]');
  if (!el) return;
  try {
    const data = await getApi().adminOverview();
    drawAdminResumen(el, resumenModel(data));
    setAdminCount(root, 'equipos', Number(data?.counts?.users ?? 0));
    renderAdminResumenExtras(root);
  } catch (err) {
    drawAdminError(el, err?.data?.message || err?.message || 'No se pudo cargar el resumen.');
  }
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {{ roomsCache: Array<{ id: string, code?: string, sala?: string }>, openRoomDetailId: string | null, updateMutacionesRoomSelect: () => void, loadRoomDetail: (id: string) => Promise<void> }} ctx
 */
export async function loadAdminSalas(root, getApi, ctx) {
  const el = root.querySelector('[data-admin-salas]');
  if (!el) return;
  try {
    const data = await getApi().adminRooms();
    ctx.roomsCache.length = 0;
    ctx.roomsCache.push(...(data.rooms || []));
    ctx.updateMutacionesRoomSelect();
    drawAdminSalas(el, salasModel(ctx.roomsCache, getCloudSyncRoomId(), !!ctx.openRoomDetailId));
    applyAdminSalasFilters(root);
    const months = ctx.roomsCache.map((r) => String(r.turnKey || '')).sort();
    const latest = months[months.length - 1] || '';
    setAdminCount(root, 'salas', ctx.roomsCache.filter((r) => String(r.turnKey || '') === latest).length);
    adminData(root).rooms = ctx.roomsCache.filter((r) => String(r.turnKey || '') === latest);
    renderAdminResumenExtras(root);
    if (ctx.openRoomDetailId) await ctx.loadRoomDetail(ctx.openRoomDetailId);
  } catch (err) {
    drawAdminError(el, err?.data?.message || err?.message || 'No se pudieron cargar las salas.');
  }
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {string} roomId
 */
export async function loadAdminRoomDetail(root, getApi, roomId) {
  const el = root.querySelector('[data-admin-room-detail]');
  if (!el) return;
  drawAdminHint(el, 'Cargando detalle…');
  try {
    const data = await getApi().adminRoom(roomId);
    drawAdminRoomDetail(el, roomDetailModel(data));
  } catch (err) {
    drawAdminError(el, err?.data?.message || err?.message || 'No se pudo cargar el detalle.');
  }
}

/**
 * Cross-area patient list ("Red" tab). One request (`fetchNetworkCensus`)
 * fetches and decrypts every sala's current room — this device's own active
 * room is never touched, so there's nothing to restore afterward.
 * @param {HTMLElement} root
 * @param {{ getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi> }} deps
 */
export async function loadAdminNetworkCensus(root, deps) {
  const el = root.querySelector('[data-admin-red]');
  if (!el) return;
  drawAdminHint(el, 'Recorriendo áreas…');
  try {
    const census = await fetchNetworkCensus(deps.getApi());
    const scope = clinicalSessionContext.scopeContext || getClinicalScopeContextForEvaluate();
    drawAdminRed(el, networkCensusModel(census, scope.users || []));
    const rows = networkCensusRows(census, scope.users || []);
    adminData(root).patients = rows;
    setAdminCount(root, 'red', rows.filter((r) => !r.archived).length);
    renderAdminResumenExtras(root);
    applyCachedLabVerifications(root);
    void autoVerifyStaleNetworkLabs(root).then(() => syncNetworkStaleFromDom(root));
  } catch (err) {
    drawAdminError(el, err?.data?.message || err?.message || 'No se pudo recorrer la red.');
  }
}

/**
 * The lab check rewrites the "old labs" mark on rows. Copy it back into the cached
 * rows so the Resumen count matches what the Pacientes tab shows.
 * @param {HTMLElement} root
 */
export function syncNetworkStaleFromDom(root) {
  const d = adminData(root);
  const panel = root.querySelector('[data-admin-red]');
  if (!panel || !d.patients) return;
  const stale = new Set();
  panel.querySelectorAll('tbody tr.cloud-sync-admin-row--stale-labs input[data-network-select]').forEach((cb) => {
    stale.add(cb.getAttribute('data-room-id') + '\u0000' + cb.getAttribute('data-patient-id'));
  });
  d.patients = d.patients.map((r) => ({ ...r, staleLabs: stale.has(r.roomId + '\u0000' + r.patientId) }));
  renderAdminResumenExtras(root);
}

/**
 * After a successful archive/restore/delete, patch the Red list in place instead of
 * refetching and decrypting every sala. Rows, cached data, counts and filters stay in sync.
 * @param {HTMLElement} root
 * @param {Array<{ roomId: string, patientId: string }>} done
 * @param {{ remove: true } | { archived: boolean }} change
 */
export function applyNetworkPatientChange(root, done, change) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel || !done.length) return;
  const keyOf = (roomId, patientId) => roomId + '\u0000' + patientId;
  const keys = new Set(done.map((d) => keyOf(d.roomId, d.patientId)));
  const estadoCol = [...panel.querySelectorAll('thead th')].findIndex((th) => th.textContent?.trim() === 'Estado');
  panel.querySelectorAll('tbody tr').forEach((tr) => {
    const cb = tr.querySelector('input[data-network-select]');
    if (!cb || !keys.has(keyOf(cb.getAttribute('data-room-id') || '', cb.getAttribute('data-patient-id') || ''))) return;
    if ('remove' in change) {
      tr.remove();
      return;
    }
    const flag = change.archived ? '1' : '0';
    tr.setAttribute('data-archived', flag);
    cb.setAttribute('data-archived', flag);
    cb.checked = false;
    const btn = tr.querySelector('[data-admin-action="archive-network-patient"]');
    if (btn) {
      btn.setAttribute('data-archived', flag);
      btn.textContent = change.archived ? 'Restaurar' : 'Archivar';
    }
    const cell = estadoCol >= 0 ? tr.children[estadoCol] : null;
    if (cell) cell.textContent = change.archived ? 'Archivado' : 'Activo';
  });
  const d = adminData(root);
  if (d.patients) {
    d.patients =
      'remove' in change
        ? d.patients.filter((r) => !keys.has(keyOf(r.roomId, r.patientId)))
        : d.patients.map((r) => (keys.has(keyOf(r.roomId, r.patientId)) ? { ...r, archived: change.archived } : r));
    setAdminCount(root, 'red', d.patients.filter((r) => !r.archived).length);
  }
  renderAdminResumenExtras(root);
  applyNetworkCensusFilters(root);
  updateNetworkBulkBarVisibility(root);
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function loadAdminMutations(root, getApi, toast) {
  const sel = root.querySelector('[data-admin-mutations-room]');
  const list = root.querySelector('[data-admin-mutations-list]');
  if (!(sel instanceof HTMLSelectElement) || !list) return;
  const roomId = String(sel.value || '').trim();
  if (!roomId) {
    toast('Elige una sala.', 'error');
    return;
  }
  drawAdminHint(list, 'Cargando…');
  try {
    const data = await getApi().adminMutations(roomId, 100);
    const mutations = data.mutations || [];
    if (!mutations.length) {
      drawAdminHint(list, 'Sin cambios registrados en esta sala.');
      return;
    }
    drawAdminMutations(list, mutationsModel(mutations, await nubeAccountsForNames(root, getApi)));
  } catch (err) {
    drawAdminError(list, err?.data?.message || err?.message || 'No se pudo cargar el registro.');
  }
}
