import { esc } from '../../dom-escape.mjs';
import { formatBytes } from '../../update-helpers.mjs';
import { adminTableHtml, fmtRole } from './panel-admin-helpers.mjs';
import { formatCloudRoomLabel } from './room-label.mjs';

const ADMIN_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'salas', label: 'Salas' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'mutaciones', label: 'Mutaciones' },
  { id: 'peligro', label: 'Peligro', danger: true },
];

/** @param {boolean} [showBootstrap] */
export function buildAdminShellHtml(showBootstrap = true) {
  const tabs = ADMIN_TABS.map((t, i) => {
    const active = i === 0;
    return (
      '<button type="button" class="cloud-sync-tab cloud-sync-admin-tab' +
      (t.danger ? ' cloud-sync-admin-tab--danger' : '') +
      (active ? ' is-active' : '') +
      '" role="tab" data-admin-tab="' +
      esc(t.id) +
      '" aria-selected="' +
      (active ? 'true' : 'false') +
      '">' +
      esc(t.label) +
      '</button>'
    );
  }).join('');

  const panels = ADMIN_TABS.map((t, i) => {
    const active = i === 0;
    const loading =
      t.id === 'resumen' || t.id === 'salas'
        ? adminSkeletonHtml()
        : '';
    return (
      '<div class="cloud-sync-admin-panel" role="tabpanel" data-admin-section="' +
      esc(t.id) +
      '" data-admin-' +
      esc(t.id) +
      (active ? '' : ' hidden') +
      '>' +
      loading +
      '</div>'
    );
  }).join('');

  return (
    '<div class="cloud-sync-admin-shell">' +
    (showBootstrap ? bootstrapHtml() : '') +
    '<div class="cloud-sync-tabs cloud-sync-admin-tabs" role="tablist" aria-label="Secciones de administración">' +
    tabs +
    '</div>' +
    '<div class="cloud-sync-admin-panels">' +
    panels +
    '</div></div>'
  );
}

export function bootstrapHtml() {
  return (
    '<div class="cloud-sync-admin-bootstrap" data-admin-bootstrap>' +
    '<p class="cloud-sync-hint">Clave de administración (solo esta sesión) para promover tu cuenta.</p>' +
    '<div class="cloud-sync-field">' +
    '<label for="cloud-sync-admin-key">Clave de sesión</label>' +
    '<input id="cloud-sync-admin-key" type="password" class="profile-input" data-admin-key-input ' +
    'autocomplete="off" spellcheck="false" placeholder="Clave de sesión" /></div>' +
    '<div class="cloud-sync-admin-bootstrap-actions">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="save-key">Guardar clave</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--primary" data-admin-action="promote-self">' +
    'Promover a admin</button></div></div>'
  );
}

export function adminSkeletonHtml() {
  return (
    '<div class="cloud-sync-admin-skeleton" aria-busy="true" aria-label="Cargando">' +
    '<span class="cloud-sync-admin-skeleton-bar"></span>' +
    '<span class="cloud-sync-admin-skeleton-bar"></span>' +
    '<span class="cloud-sync-admin-skeleton-bar cloud-sync-admin-skeleton-bar--short"></span></div>'
  );
}

/** @param {object} data */
export function resumenHtml(data) {
  const c = data.counts || {};
  const m = data.meters || {};
  const storage = Number(c.storageBytes ?? m.storageBytes ?? 0);
  const soft = Number(m.storageSoftBytes ?? 0);
  const hard = Number(m.storageHardBytes ?? 0);
  const storageMeta = [
    soft ? 'soft ' + formatBytes(soft) : '',
    hard ? 'tope ' + formatBytes(hard) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    '<div class="cloud-sync-admin-panel-head">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-resumen">Actualizar</button></div>' +
    '<dl class="cloud-sync-admin-stats">' +
    '<div class="cloud-sync-admin-stat"><dt>Usuarios</dt><dd>' +
    esc(String(c.users ?? 0)) +
    '</dd></div>' +
    '<div class="cloud-sync-admin-stat"><dt>Salas</dt><dd>' +
    esc(String(c.rooms ?? 0)) +
    '</dd></div>' +
    '<div class="cloud-sync-admin-stat"><dt>Miembros</dt><dd>' +
    esc(String(c.members ?? 0)) +
    '</dd></div>' +
    '<div class="cloud-sync-admin-stat"><dt>Máx. por sala</dt><dd>' +
    esc(String(m.maxMembersPerRoom ?? '—')) +
    ' miembros</dd></div>' +
    '<div class="cloud-sync-admin-stat cloud-sync-admin-stats__wide"><dt>Almacenamiento</dt><dd>' +
    '<span class="cloud-sync-admin-stat-value">' +
    esc(formatBytes(storage)) +
    '</span>' +
    (storageMeta
      ? '<span class="cloud-sync-admin-stat-meta">' + esc(storageMeta) + '</span>'
      : '') +
    '</dd></div></dl>'
  );
}

/** @param {Array<Record<string, unknown>>} rooms */
export function salasTableHtml(rooms) {
  const cols = [
    {
      label: 'Sala',
      cell: (row) => {
        const sala = String(row.sala || '—');
        if (sala === 'Sala') {
          return (
            '<span class="cloud-sync-admin-sala">' +
            esc(sala) +
            '</span><span class="cloud-sync-admin-sala-sub">1 · 2 · E</span>'
          );
        }
        return esc(sala);
      },
    },
    { label: 'Turno', cell: (row) => esc(String(row.turnKey || '—')) },
    { label: 'Código', key: 'code' },
    { label: 'Rev.', key: 'revision' },
    { label: 'Miembros', key: 'memberCount' },
    {
      label: 'Almacenamiento',
      cell: (row) => esc(formatBytes(Number(row.storageBytes) || 0)),
    },
    {
      label: 'Acciones',
      cell: (row) =>
        '<div class="cloud-sync-admin-row-actions">' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="room-detail" data-room-id="' +
        esc(String(row.id)) +
        '">Ver detalle</button>' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="rotate-code" data-room-id="' +
        esc(String(row.id)) +
        '">Rotar código</button>' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="purge-room" data-room-id="' +
        esc(String(row.id)) +
        '" data-room-code="' +
        esc(String(row.code || '')) +
        '">Purgar</button></div>',
    },
  ];
  return (
    '<div class="cloud-sync-admin-panel-head">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-salas">Actualizar</button></div>' +
    '<p class="cloud-sync-hint cloud-sync-admin-salas-hint">En Nube, Sala 1, Sala 2 y Sala E comparten el mismo espacio por turno. Distinguilas por la fecha de turno.</p>' +
    adminTableHtml(rooms, cols)
  );
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
    '<p class="cloud-sync-room-title">' +
    esc(formatCloudRoomLabel(room)) +
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
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="revoke-sessions" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Revocar sesiones</button>' +
    '<select class="profile-input cloud-sync-admin-role-select" data-admin-promote-role data-user-id="' +
    id +
    '">' +
    '<option value="admin">Admin</option><option value="program_admin">Admin programa</option>' +
    '<option value="member">Miembro</option></select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="promote-user" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Cambiar rol</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="reset-password" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Restablecer contraseña</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="disable-user" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Deshabilitar</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="delete-user" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Eliminar</button></div>'
  );
}

export function mutacionesShellHtml() {
  return (
    '<div class="cloud-sync-admin-toolbar">' +
    '<label class="cloud-sync-admin-toolbar-label">Sala</label>' +
    '<select class="profile-input" data-admin-mutations-room><option value="">— Elige una sala —</option></select>' +
    '<button type="button" class="cloud-sync-btn" data-admin-action="load-mutations">Cargar</button></div>' +
    '<div data-admin-mutations-list></div>'
  );
}

/** @param {Array<{ id: string, code?: string, sala?: string, turnKey?: string, memberCount?: number }>} rooms */
export function mutationsRoomOptionsHtml(rooms) {
  return (
    '<option value="">— Elige una sala —</option>' +
    rooms
      .map(
        (r) =>
          '<option value="' + esc(String(r.id)) + '">' + esc(formatCloudRoomLabel(r)) + '</option>'
      )
      .join('')
  );
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
    '<div class="cloud-sync-admin-danger">' +
    '<p class="cloud-sync-hint">Solo afecta datos en la nube del piloto (D1). Lo local en cada Mac no se borra.</p>' +
    '<section class="cloud-sync-admin-danger-card">' +
    '<h5 class="cloud-sync-admin-danger-title">Purgar sala</h5>' +
    '<p class="cloud-sync-hint">Elimina miembros, mutaciones, estado y la sala.</p>' +
    '<div class="cloud-sync-admin-toolbar">' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-peligro-room">Sala</label>' +
    '<select id="cloud-admin-peligro-room" class="profile-input" data-admin-peligro-room>' +
    '<option value="">— Elige una sala —</option></select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger" data-admin-action="purge-room-selected">Purgar</button>' +
    '</div></section>' +
    '<section class="cloud-sync-admin-danger-card">' +
    '<h5 class="cloud-sync-admin-danger-title">Usuarios</h5>' +
    '<p class="cloud-sync-hint">Revocar sesiones, deshabilitar o borrar cuentas.</p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-tab="usuarios">Ir a Usuarios</button>' +
    '</section></div>'
  );
}

/** @param {string} message */
export function adminErrorHtml(message) {
  return '<p class="cloud-sync-admin-error">' + esc(message) + '</p>';
}
