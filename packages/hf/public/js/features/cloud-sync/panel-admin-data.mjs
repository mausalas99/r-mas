import { adminTableHtml } from './panel-admin-helpers.mjs';
import {
  adminErrorHtml,
  mutationsListHtml,
  resumenHtml,
  roomDetailHtml,
  salasTableHtml,
  roomDetailHostHtml,
  userActionsHtml,
} from './panel-admin-html.mjs';

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 */
export async function loadAdminResumen(root, getApi) {
  const el = root.querySelector('[data-admin-resumen]');
  if (!el) return;
  try {
    const data = await getApi().adminOverview();
    el.innerHTML = resumenHtml(data);
  } catch (err) {
    el.innerHTML = adminErrorHtml(err?.data?.message || err?.message || 'No se pudo cargar el resumen.');
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
    el.innerHTML = salasTableHtml(ctx.roomsCache) + (ctx.openRoomDetailId ? roomDetailHostHtml() : '');
    if (ctx.openRoomDetailId) await ctx.loadRoomDetail(ctx.openRoomDetailId);
  } catch (err) {
    el.innerHTML = adminErrorHtml(err?.data?.message || err?.message || 'No se pudieron cargar las salas.');
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
  el.innerHTML = '<p class="cloud-sync-hint">Cargando detalle…</p>';
  try {
    const data = await getApi().adminRoom(roomId);
    el.innerHTML = roomDetailHtml(data);
  } catch (err) {
    el.innerHTML = adminErrorHtml(err?.data?.message || err?.message || 'No se pudo cargar el detalle.');
  }
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 */
export async function loadAdminUsers(root, getApi) {
  const list = root.querySelector('[data-admin-users-list]');
  const search = root.querySelector('[data-admin-user-search]');
  if (!list) return;
  const q = search instanceof HTMLInputElement ? String(search.value || '').trim() : '';
  list.innerHTML = '<p class="cloud-sync-hint">Buscando…</p>';
  try {
    const data = await getApi().adminUsers(q);
    const users = data.users || [];
    const cols = [
      { label: 'Usuario', cell: (u) => '@' + String(u.username || '') },
      { label: 'Nombre', key: 'display_name' },
      { label: 'Rol', cell: (u) => String(u.role || '') },
      {
        label: 'Estado',
        cell: (u) => (u.disabled ? '<span class="cloud-sync-admin-badge is-disabled">Deshabilitado</span>' : 'Activo'),
      },
      { label: 'Acciones', cell: (u) => userActionsHtml(u) },
    ];
    list.innerHTML = adminTableHtml(users, cols, {
      emptyHtml:
        '<p class="cloud-sync-hint">Sin cuentas Nube con esa búsqueda.</p>' +
        '<p class="cloud-sync-hint">Si el @usuario solo aparece en <strong>Integrantes</strong> del equipo (p. ej. tests), ábrelo en la pestaña <strong>Equipos</strong> o en Mi rotación → directorio → <strong>Quitar</strong>.</p>',
    });
  } catch (err) {
    list.innerHTML = adminErrorHtml(err?.data?.message || err?.message || 'No se pudieron cargar usuarios.');
  }
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
  list.innerHTML = '<p class="cloud-sync-hint">Cargando…</p>';
  try {
    const data = await getApi().adminMutations(roomId, 50);
    const mutations = data.mutations || [];
    if (!mutations.length) {
      list.innerHTML = '<p class="cloud-sync-hint">Sin mutaciones en esta sala.</p>';
      return;
    }
    list.innerHTML = mutationsListHtml(mutations);
  } catch (err) {
    list.innerHTML = adminErrorHtml(err?.data?.message || err?.message || 'No se pudieron cargar mutaciones.');
  }
}
