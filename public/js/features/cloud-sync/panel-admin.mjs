import { esc } from '../../dom-escape.mjs';
import { formatBytes } from '../../update-helpers.mjs';
import { hasProgramAdminPrivileges, effectiveClinicalRank } from '../../clinical-privileges.mjs';
import { adminTableHtml, fmtRole, normalizeUsernameConfirm } from './panel-admin-helpers.mjs';

/** Session-only admin key for bootstrap (not persisted). */
let sessionAdminKey = '';

export function getSessionAdminKey() {
  return sessionAdminKey;
}

export function setSessionAdminKey(key) {
  sessionAdminKey = String(key || '').trim();
}

/** @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user */
export function canAccessCloudAdmin(user) {
  if (!user) return false;
  return hasProgramAdminPrivileges(user) || effectiveClinicalRank(user) === 'R4';
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   toast?: (msg: string, kind?: string) => void,
 * }} deps
 */
export function mountCloudAdminPanel(host, deps) {
  const toast = deps.toast || function () {};
  /** @type {Array<{ id: string, code?: string, sala?: string }>} */
  let roomsCache = [];
  /** @type {string | null} */
  let openRoomDetailId = null;

  const root = document.createElement('div');
  root.className = 'cloud-sync-admin';
  root.innerHTML = buildShellHtml();
  host.appendChild(root);

  const keyInput = root.querySelector('[data-admin-key-input]');
  if (keyInput instanceof HTMLInputElement && sessionAdminKey) {
    keyInput.value = sessionAdminKey;
  }

  renderPeligro();
  renderMutacionesShell();
  renderUsuariosShell();
  void loadResumen();
  void loadSalas();

  root.addEventListener('click', onClick);

  function getApi() {
    return deps.getApi();
  }

  function buildShellHtml() {
    return (
      '<header class="cloud-sync-admin-head">' +
      '<h4 class="cloud-sync-admin-title">Administración nube</h4>' +
      '<p class="cloud-sync-hint">Consola de operaciones para salas y usuarios del piloto Free.</p></header>' +
      bootstrapHtml() +
      '<details class="cloud-sync-admin-block" open data-admin-section="resumen">' +
      '<summary>Resumen</summary><div class="cloud-sync-admin-body" data-admin-resumen>Cargando…</div></details>' +
      '<details class="cloud-sync-admin-block" data-admin-section="salas">' +
      '<summary>Salas</summary><div class="cloud-sync-admin-body" data-admin-salas>Cargando…</div></details>' +
      '<details class="cloud-sync-admin-block" data-admin-section="usuarios">' +
      '<summary>Usuarios</summary><div class="cloud-sync-admin-body" data-admin-usuarios></div></details>' +
      '<details class="cloud-sync-admin-block" data-admin-section="mutaciones">' +
      '<summary>Mutaciones</summary><div class="cloud-sync-admin-body" data-admin-mutaciones></div></details>' +
      '<details class="cloud-sync-admin-block cloud-sync-admin-block--danger" data-admin-section="peligro">' +
      '<summary>Peligro</summary><div class="cloud-sync-admin-body" data-admin-peligro></div></details>'
    );
  }

  function bootstrapHtml() {
    return (
      '<div class="cloud-sync-admin-bootstrap">' +
      '<p class="cloud-sync-hint">Si aún no tenés rol admin en la nube, ingresá la clave de administración ' +
      '(solo esta sesión) para promover tu cuenta una vez.</p>' +
      '<div class="cloud-sync-field">' +
      '<label for="cloud-sync-admin-key">Clave de administración</label>' +
      '<input id="cloud-sync-admin-key" type="password" class="profile-input" data-admin-key-input ' +
      'autocomplete="off" spellcheck="false" placeholder="SYNC_ADMIN_KEY — no se guarda en disco" /></div>' +
      '<div class="cloud-sync-admin-bootstrap-actions">' +
      '<button type="button" class="cloud-sync-btn" data-admin-action="save-key">Guardar clave</button>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="promote-self">' +
      'Promover mi cuenta a admin</button></div></div>'
    );
  }

  async function loadResumen() {
    const el = root.querySelector('[data-admin-resumen]');
    if (!el) return;
    try {
      const data = await getApi().adminOverview();
      const c = data.counts || {};
      const m = data.meters || {};
      const storage = Number(c.storageBytes ?? m.storageBytes ?? 0);
      const soft = Number(m.storageSoftBytes ?? 0);
      const hard = Number(m.storageHardBytes ?? 0);
      el.innerHTML =
        '<dl class="cloud-sync-admin-stats">' +
        '<div><dt>Usuarios</dt><dd>' +
        esc(String(c.users ?? 0)) +
        '</dd></div>' +
        '<div><dt>Salas</dt><dd>' +
        esc(String(c.rooms ?? 0)) +
        '</dd></div>' +
        '<div><dt>Miembros</dt><dd>' +
        esc(String(c.members ?? 0)) +
        '</dd></div>' +
        '<div><dt>Almacenamiento</dt><dd>' +
        esc(formatBytes(storage)) +
        (soft ? ' / ' + esc(formatBytes(soft)) + ' soft' : '') +
        (hard ? ' · tope ' + esc(formatBytes(hard)) : '') +
        '</dd></div>' +
        '<div><dt>Máx. por sala</dt><dd>' +
        esc(String(m.maxMembersPerRoom ?? '—')) +
        ' miembros</dd></div></dl>' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="refresh-resumen">' +
        'Actualizar</button>';
    } catch (err) {
      el.innerHTML =
        '<p class="cloud-sync-admin-error">' +
        esc(err?.data?.message || err?.message || 'No se pudo cargar el resumen.') +
        '</p>';
    }
  }

  async function loadSalas() {
    const el = root.querySelector('[data-admin-salas]');
    if (!el) return;
    try {
      const data = await getApi().adminRooms();
      roomsCache = data.rooms || [];
      updateMutacionesRoomSelect();
      el.innerHTML = renderSalasTable() + (openRoomDetailId ? renderRoomDetailHost() : '');
      if (openRoomDetailId) void loadRoomDetail(openRoomDetailId);
    } catch (err) {
      el.innerHTML =
        '<p class="cloud-sync-admin-error">' +
        esc(err?.data?.message || err?.message || 'No se pudieron cargar las salas.') +
        '</p>';
    }
  }

  function renderSalasTable() {
    const cols = [
      { label: 'Sala', key: 'sala' },
      { label: 'Código', key: 'code' },
      { label: 'Rev.', key: 'revision' },
      { label: 'Miembros', key: 'memberCount' },
      {
        label: 'Storage',
        cell: (row) => esc(formatBytes(Number(row.storageBytes) || 0)),
      },
      {
        label: 'Acciones',
        cell: (row) =>
          '<div class="cloud-sync-admin-row-actions">' +
          '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="room-detail" data-room-id="' +
          esc(String(row.id)) +
          '">Ver detalle</button>' +
          '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="rotate-code" data-room-id="' +
          esc(String(row.id)) +
          '">Rotar código</button>' +
          '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="purge-room" data-room-id="' +
          esc(String(row.id)) +
          '" data-room-code="' +
          esc(String(row.code || '')) +
          '">Purgar</button></div>',
      },
    ];
    return (
      adminTableHtml(roomsCache, cols) +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="refresh-salas">Actualizar</button>'
    );
  }

  function renderRoomDetailHost() {
    return '<div class="cloud-sync-admin-room-detail" data-admin-room-detail></div>';
  }

  async function loadRoomDetail(roomId) {
    const el = root.querySelector('[data-admin-room-detail]');
    if (!el) return;
    el.innerHTML = '<p class="cloud-sync-hint">Cargando detalle…</p>';
    try {
      const data = await getApi().adminRoom(roomId);
      const room = data.room || {};
      const members = data.members || [];
      const memberRows = members.map((m) => ({
        username: '@' + (m.username || ''),
        displayName: m.displayName || '',
        role: fmtRole(m.role),
        joinedAt: m.joinedAt || '',
      }));
      el.innerHTML =
        '<p class="cloud-sync-room-title">Sala ' +
        esc(String(room.code || room.id)) +
        ' · ' +
        esc(String(room.sala || '')) +
        '</p>' +
        '<dl class="cloud-sync-room-meta">' +
        '<div><dt>ID</dt><dd>' +
        esc(String(room.id)) +
        '</dd></div>' +
        '<div><dt>Turno</dt><dd>' +
        esc(String(room.turnKey || '—')) +
        '</dd></div>' +
        '<div><dt>Revisión</dt><dd>' +
        esc(String(room.revision ?? 0)) +
        '</dd></div>' +
        '<div><dt>Storage</dt><dd>' +
        esc(formatBytes(Number(room.storageBytes) || 0)) +
        '</dd></div></dl>' +
        '<p class="cloud-sync-hint">Miembros (' +
        esc(String(members.length)) +
        ')</p>' +
        adminTableHtml(memberRows, [
          { label: 'Usuario', key: 'username' },
          { label: 'Nombre', key: 'displayName' },
          { label: 'Rol', key: 'role' },
          { label: 'Unido', key: 'joinedAt' },
        ]) +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="close-room-detail">Cerrar detalle</button>';
    } catch (err) {
      el.innerHTML =
        '<p class="cloud-sync-admin-error">' +
        esc(err?.data?.message || err?.message || 'No se pudo cargar el detalle.') +
        '</p>';
    }
  }

  function renderUsuariosShell() {
    const el = root.querySelector('[data-admin-usuarios]');
    if (!el) return;
    el.innerHTML =
      '<div class="cloud-sync-admin-toolbar">' +
      '<input type="search" class="profile-input" data-admin-user-search placeholder="Buscar @usuario o nombre" />' +
      '<button type="button" class="cloud-sync-btn" data-admin-action="search-users">Buscar</button></div>' +
      '<div data-admin-users-list><p class="cloud-sync-hint">Buscá usuarios o dejá vacío para los últimos 50.</p></div>';
  }

  async function loadUsers() {
    const list = root.querySelector('[data-admin-users-list]');
    const search = root.querySelector('[data-admin-user-search]');
    if (!list) return;
    const q = search instanceof HTMLInputElement ? String(search.value || '').trim() : '';
    list.innerHTML = '<p class="cloud-sync-hint">Buscando…</p>';
    try {
      const data = await getApi().adminUsers(q);
      const users = data.users || [];
      const cols = [
        { label: 'Usuario', cell: (u) => esc('@' + String(u.username || '')) },
        { label: 'Nombre', key: 'display_name' },
        { label: 'Rol', cell: (u) => esc(fmtRole(u.role)) },
        {
          label: 'Estado',
          cell: (u) => (u.disabled ? '<span class="cloud-sync-admin-badge is-disabled">Deshabilitado</span>' : 'Activo'),
        },
        {
          label: 'Acciones',
          cell: (u) => userActionsHtml(u),
        },
      ];
      list.innerHTML = adminTableHtml(users, cols);
    } catch (err) {
      list.innerHTML =
        '<p class="cloud-sync-admin-error">' +
        esc(err?.data?.message || err?.message || 'No se pudieron cargar usuarios.') +
        '</p>';
    }
  }

  /** @param {{ id: string, username?: string }} user */
  function userActionsHtml(user) {
    const id = esc(String(user.id));
    const handle = esc(String(user.username || ''));
    return (
      '<div class="cloud-sync-admin-row-actions">' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="revoke-sessions" data-user-id="' +
      id +
      '" data-user-handle="' +
      handle +
      '">Revocar sesiones</button>' +
      '<select class="profile-input cloud-sync-admin-role-select" data-admin-promote-role data-user-id="' +
      id +
      '">' +
      '<option value="admin">Admin</option>' +
      '<option value="program_admin">Admin programa</option>' +
      '<option value="member">Miembro</option></select>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="promote-user" data-user-id="' +
      id +
      '" data-user-handle="' +
      handle +
      '">Cambiar rol</button>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="disable-user" data-user-id="' +
      id +
      '" data-user-handle="' +
      handle +
      '">Deshabilitar</button>' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="delete-user" data-user-id="' +
      id +
      '" data-user-handle="' +
      handle +
      '">Eliminar</button></div>'
    );
  }

  function renderMutacionesShell() {
    const el = root.querySelector('[data-admin-mutaciones]');
    if (!el) return;
    el.innerHTML =
      '<div class="cloud-sync-admin-toolbar">' +
      '<label class="cloud-sync-hint">Sala</label>' +
      '<select class="profile-input" data-admin-mutations-room><option value="">— Elegí sala —</option></select>' +
      '<button type="button" class="cloud-sync-btn" data-admin-action="load-mutations">Cargar mutaciones</button></div>' +
      '<div data-admin-mutations-list></div>';
    updateMutacionesRoomSelect();
  }

  function updateMutacionesRoomSelect() {
    const sel = root.querySelector('[data-admin-mutations-room]');
    if (!(sel instanceof HTMLSelectElement)) return;
    const prev = sel.value;
    const opts =
      '<option value="">— Elegí sala —</option>' +
      roomsCache
        .map(
          (r) =>
            '<option value="' +
            esc(String(r.id)) +
            '">' +
            esc(String(r.sala || '')) +
            ' · ' +
            esc(String(r.code || r.id)) +
            '</option>'
        )
        .join('');
    sel.innerHTML = opts;
    if (prev) sel.value = prev;
  }

  async function loadMutations() {
    const sel = root.querySelector('[data-admin-mutations-room]');
    const list = root.querySelector('[data-admin-mutations-list]');
    if (!(sel instanceof HTMLSelectElement) || !list) return;
    const roomId = String(sel.value || '').trim();
    if (!roomId) {
      toast('Elegí una sala.', 'error');
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
      const cols = [
        { label: 'Rev.', key: 'revision' },
        { label: 'Actor', key: 'actorId' },
        { label: 'Cliente', key: 'clientMutationId' },
        {
          label: 'Ops (truncado)',
          cell: (m) => {
            const txt = String(m.opsJson || '');
            const suffix = m.opsJsonTruncated ? '…' : '';
            return '<code class="cloud-sync-admin-ops">' + esc(txt) + esc(suffix) + '</code>';
          },
        },
        { label: 'Fecha', key: 'createdAt' },
      ];
      list.innerHTML = adminTableHtml(mutations, cols);
    } catch (err) {
      list.innerHTML =
        '<p class="cloud-sync-admin-error">' +
        esc(err?.data?.message || err?.message || 'No se pudieron cargar mutaciones.') +
        '</p>';
    }
  }

  function renderPeligro() {
    const el = root.querySelector('[data-admin-peligro]');
    if (!el) return;
    el.innerHTML =
      '<p class="cloud-sync-hint">Las acciones destructivas afectan solo la nube del piloto (D1). ' +
      'Los datos clínicos locales en cada Mac no se borran desde aquí.</p>' +
      '<ul class="cloud-sync-admin-danger-list">' +
      '<li><strong>Purgar sala</strong> — elimina miembros, mutaciones, estado y la sala. Usá la tabla en Salas.</li>' +
      '<li><strong>Reset piloto completo</strong> — requiere acceso a Wrangler/Cloudflare: ' +
      '<code>wrangler d1 execute</code> con el script de wipe documentado en el README del worker. ' +
      'No ejecutar en producción sin anuncio al equipo.</li>' +
      '<li><strong>Revocar sesiones</strong> — por usuario en la sección Usuarios.</li></ul>';
  }

  async function handlePromoteSelf() {
    try {
      const me = await getApi().me();
      const userId = me?.user?.id;
      if (!userId) {
        toast('Iniciá sesión en la nube primero.', 'error');
        return;
      }
      if (!confirmAction('¿Promover tu cuenta a admin en la nube?')) return;
      await getApi().adminPromote(userId, 'admin');
      toast('Cuenta promovida a admin.', 'success');
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo promover.', 'error');
    }
  }

  /** @param {Event} ev */
  function onClick(ev) {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-admin-action]') : null;
    if (!btn) return;
    const action = btn.getAttribute('data-admin-action');
    if (action === 'save-key') {
      const input = root.querySelector('[data-admin-key-input]');
      if (input instanceof HTMLInputElement) setSessionAdminKey(input.value);
      toast('Clave guardada solo para esta sesión.', 'info');
      return;
    }
    if (action === 'promote-self') {
      void handlePromoteSelf();
      return;
    }
    if (action === 'refresh-resumen') {
      void loadResumen();
      return;
    }
    if (action === 'refresh-salas') {
      void loadSalas();
      return;
    }
    if (action === 'search-users') {
      void loadUsers();
      return;
    }
    if (action === 'load-mutations') {
      void loadMutations();
      return;
    }
    if (action === 'close-room-detail') {
      openRoomDetailId = null;
      void loadSalas();
      return;
    }
    const roomId = btn.getAttribute('data-room-id');
    const userId = btn.getAttribute('data-user-id');
    const handle = btn.getAttribute('data-user-handle') || '';
    if (action === 'room-detail' && roomId) {
      openRoomDetailId = roomId;
      void loadSalas();
      return;
    }
    if (action === 'rotate-code' && roomId) {
      void handleRotateCode(roomId);
      return;
    }
    if (action === 'purge-room' && roomId) {
      const code = btn.getAttribute('data-room-code') || roomId;
      void handlePurgeRoom(roomId, code);
      return;
    }
    if (action === 'revoke-sessions' && userId) {
      void handleRevokeSessions(userId, handle);
      return;
    }
    if (action === 'promote-user' && userId) {
      void handlePromoteUser(userId, handle, btn);
      return;
    }
    if (action === 'disable-user' && userId) {
      void handleDisableUser(userId, handle);
      return;
    }
    if (action === 'delete-user' && userId) {
      void handleDeleteUser(userId, handle);
    }
  }

  async function handleRotateCode(roomId) {
    if (!confirmAction('¿Rotar el código de esta sala? Quienes tengan el código anterior no podrán unirse.')) return;
    try {
      const data = await getApi().adminRotateCode(roomId);
      toast('Nuevo código: ' + (data.code || '—'), 'success');
      void loadSalas();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo rotar el código.', 'error');
    }
  }

  async function handlePurgeRoom(roomId, code) {
    const typed = window.prompt(
      'Esto elimina la sala "' + code + '" y todos sus datos en la nube.\n\nEscribí el código de sala para confirmar:'
    );
    if (typed === null || String(typed).trim().toUpperCase() !== String(code).trim().toUpperCase()) {
      if (typed !== null) toast('Confirmación incorrecta; no se purgó.', 'error');
      return;
    }
    try {
      await getApi().adminPurgeRoom(roomId);
      if (openRoomDetailId === roomId) openRoomDetailId = null;
      toast('Sala purgada.', 'success');
      void loadSalas();
      void loadResumen();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo purgar la sala.', 'error');
    }
  }

  async function handleRevokeSessions(userId, handle) {
    if (!confirmAction('¿Revocar todas las sesiones de @' + handle + '?')) return;
    try {
      const data = await getApi().adminRevokeSessions(userId);
      toast('Sesiones revocadas: ' + String(data.revoked ?? 0), 'success');
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudieron revocar sesiones.', 'error');
    }
  }

  async function handlePromoteUser(userId, handle, btn) {
    const row = btn.closest('.cloud-sync-admin-row-actions');
    const sel = row?.querySelector('[data-admin-promote-role]');
    const role = sel instanceof HTMLSelectElement ? sel.value : 'admin';
    if (!confirmAction('¿Cambiar rol de @' + handle + ' a ' + fmtRole(role) + '?')) return;
    try {
      await getApi().adminPromote(userId, role);
      toast('Rol actualizado.', 'success');
      void loadUsers();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo cambiar el rol.', 'error');
    }
  }

  async function handleDisableUser(userId, handle) {
    if (!confirmAction('¿Deshabilitar @' + handle + ' y revocar sus sesiones?')) return;
    try {
      await getApi().adminDisable(userId);
      toast('Usuario deshabilitado.', 'success');
      void loadUsers();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo deshabilitar.', 'error');
    }
  }

  async function handleDeleteUser(userId, handle) {
    if (!confirmAction('¿Eliminar permanentemente a @' + handle + ' de la nube?')) return;
    const typed = window.prompt('Escribí el usuario (@' + handle + ') para confirmar:');
    if (typed === null || normalizeUsernameConfirm(typed) !== normalizeUsernameConfirm(handle)) {
      if (typed !== null) toast('Confirmación incorrecta.', 'error');
      return;
    }
    try {
      await getApi().adminDeleteUser(userId);
      toast('Usuario eliminado.', 'success');
      void loadUsers();
      void loadResumen();
    } catch (err) {
      toast(err?.data?.message || err?.message || 'No se pudo eliminar.', 'error');
    }
  }

  return {
    root,
    refresh() {
      void loadResumen();
      void loadSalas();
    },
  };
}

