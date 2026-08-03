import { esc } from '../../dom-escape.mjs';
import { formatBytes } from '../../update-helpers.mjs';
import { adminTableHtml, fmtRole } from './panel-admin-helpers.mjs';
import { formatCloudRoomLabel } from './room-label.mjs';

export function buildAdminShellHtml() {
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

export function bootstrapHtml() {
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

/** @param {object} data */
export function resumenHtml(data) {
  const c = data.counts || {};
  const m = data.meters || {};
  const storage = Number(c.storageBytes ?? m.storageBytes ?? 0);
  const soft = Number(m.storageSoftBytes ?? 0);
  const hard = Number(m.storageHardBytes ?? 0);
  return (
    '<dl class="cloud-sync-admin-stats">' +
    '<div><dt>Usuarios</dt><dd>' + esc(String(c.users ?? 0)) + '</dd></div>' +
    '<div><dt>Salas</dt><dd>' + esc(String(c.rooms ?? 0)) + '</dd></div>' +
    '<div><dt>Miembros</dt><dd>' + esc(String(c.members ?? 0)) + '</dd></div>' +
    '<div><dt>Almacenamiento</dt><dd>' +
    esc(formatBytes(storage)) +
    (soft ? ' / ' + esc(formatBytes(soft)) + ' soft' : '') +
    (hard ? ' · tope ' + esc(formatBytes(hard)) : '') +
    '</dd></div>' +
    '<div><dt>Máx. por sala</dt><dd>' + esc(String(m.maxMembersPerRoom ?? '—')) + ' miembros</dd></div></dl>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="refresh-resumen">Actualizar</button>'
  );
}

/** @param {Array<Record<string, unknown>>} rooms */
export function salasTableHtml(rooms) {
  const cols = [
    { label: 'Sala', key: 'sala' },
    { label: 'Turno', cell: (row) => esc(String(row.turnKey || '—')) },
    { label: 'Código', key: 'code' },
    { label: 'Rev.', key: 'revision' },
    { label: 'Miembros', key: 'memberCount' },
    { label: 'Storage', cell: (row) => esc(formatBytes(Number(row.storageBytes) || 0)) },
    {
      label: 'Acciones',
      cell: (row) =>
        '<div class="cloud-sync-admin-row-actions">' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="room-detail" data-room-id="' +
        esc(String(row.id)) + '">Ver detalle</button>' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="rotate-code" data-room-id="' +
        esc(String(row.id)) + '">Rotar código</button>' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="purge-room" data-room-id="' +
        esc(String(row.id)) + '" data-room-code="' + esc(String(row.code || '')) + '">Purgar</button></div>',
    },
  ];
  return adminTableHtml(rooms, cols) +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="refresh-salas">Actualizar</button>';
}

export function roomDetailHostHtml() {
  return '<div class="cloud-sync-admin-room-detail" data-admin-room-detail></div>';
}

/** @param {object} data */
export function roomDetailHtml(data) {
  const room = data.room || {};
  const members = data.members || [];
  const memberRows = members.map((m) => ({
    username: '@' + (m.username || ''),
    displayName: m.displayName || '',
    role: fmtRole(m.role),
    joinedAt: m.joinedAt || '',
  }));
  return (
    '<p class="cloud-sync-room-title">' + esc(formatCloudRoomLabel(room)) + '</p>' +
    '<dl class="cloud-sync-room-meta">' +
    '<div><dt>ID</dt><dd>' + esc(String(room.id)) + '</dd></div>' +
    '<div><dt>Turno</dt><dd>' + esc(String(room.turnKey || '—')) + '</dd></div>' +
    '<div><dt>Revisión</dt><dd>' + esc(String(room.revision ?? 0)) + '</dd></div>' +
    '<div><dt>Storage</dt><dd>' + esc(formatBytes(Number(room.storageBytes) || 0)) + '</dd></div></dl>' +
    '<p class="cloud-sync-hint">Miembros (' + esc(String(members.length)) + ')</p>' +
    adminTableHtml(memberRows, [
      { label: 'Usuario', key: 'username' },
      { label: 'Nombre', key: 'displayName' },
      { label: 'Rol', key: 'role' },
      { label: 'Unido', key: 'joinedAt' },
    ]) +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="close-room-detail">Cerrar detalle</button>'
  );
}

export function usuariosShellHtml() {
  return (
    '<div class="cloud-sync-admin-toolbar">' +
    '<input type="search" class="profile-input" data-admin-user-search placeholder="Buscar @usuario o nombre" />' +
    '<button type="button" class="cloud-sync-btn" data-admin-action="search-users">Buscar</button></div>' +
    '<div data-admin-users-list><p class="cloud-sync-hint">Buscá usuarios o dejá vacío para los últimos 50.</p></div>'
  );
}

/** @param {{ id: string, username?: string }} user */
export function userActionsHtml(user) {
  const id = esc(String(user.id));
  const handle = esc(String(user.username || ''));
  return (
    '<div class="cloud-sync-admin-row-actions">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="revoke-sessions" data-user-id="' +
    id + '" data-user-handle="' + handle + '">Revocar sesiones</button>' +
    '<select class="profile-input cloud-sync-admin-role-select" data-admin-promote-role data-user-id="' + id + '">' +
    '<option value="admin">Admin</option><option value="program_admin">Admin programa</option>' +
    '<option value="member">Miembro</option></select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="promote-user" data-user-id="' +
    id + '" data-user-handle="' + handle + '">Cambiar rol</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="reset-password" data-user-id="' +
    id + '" data-user-handle="' + handle + '">Restablecer contraseña</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="disable-user" data-user-id="' +
    id + '" data-user-handle="' + handle + '">Deshabilitar</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="delete-user" data-user-id="' +
    id + '" data-user-handle="' + handle + '">Eliminar</button></div>'
  );
}

export function mutacionesShellHtml() {
  return (
    '<div class="cloud-sync-admin-toolbar">' +
    '<label class="cloud-sync-hint">Sala</label>' +
    '<select class="profile-input" data-admin-mutations-room><option value="">— Elegí sala —</option></select>' +
    '<button type="button" class="cloud-sync-btn" data-admin-action="load-mutations">Cargar mutaciones</button></div>' +
    '<div data-admin-mutations-list></div>'
  );
}

/** @param {Array<{ id: string, code?: string, sala?: string, turnKey?: string, memberCount?: number }>} rooms */
export function mutationsRoomOptionsHtml(rooms) {
  return '<option value="">— Elegí sala —</option>' + rooms.map((r) =>
    '<option value="' + esc(String(r.id)) + '">' + esc(formatCloudRoomLabel(r)) + '</option>'
  ).join('');
}

/** @param {unknown[]} mutations */
export function mutationsListHtml(mutations) {
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
  return adminTableHtml(mutations, cols);
}

export function peligroHtml() {
  return (
    '<p class="cloud-sync-hint">Las acciones destructivas afectan solo la nube del piloto (D1). ' +
    'Los datos clínicos locales en cada Mac no se borran desde aquí.</p>' +
    '<ul class="cloud-sync-admin-danger-list">' +
    '<li><strong>Purgar sala</strong> — elimina miembros, mutaciones, estado y la sala. Usá la tabla en Salas.</li>' +
    '<li><strong>Reset piloto completo</strong> — requiere acceso a Wrangler/Cloudflare: ' +
    '<code>wrangler d1 execute</code> con el script de wipe documentado en el README del worker. ' +
    'No ejecutar en producción sin anuncio al equipo.</li>' +
    '<li><strong>Revocar sesiones</strong> — por usuario en la sección Usuarios.</li></ul>'
  );
}

/** @param {string} message */
export function adminErrorHtml(message) {
  return '<p class="cloud-sync-admin-error">' + esc(message) + '</p>';
}
