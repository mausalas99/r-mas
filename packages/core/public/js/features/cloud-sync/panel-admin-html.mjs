import { esc } from '../../dom-escape.mjs';
import { formatBytes } from '../../update-helpers.mjs';
import { adminTableHtml, fmtRole } from './panel-admin-helpers.mjs';
import { formatCloudRoomLabel } from './room-label.mjs';
import { resolvePatientCensusTeamId } from '../patients-clinical-filter.mjs';
import { getCachedLabVerify } from './lab-verify-cache.mjs';

/** Sentinel team-filter value meaning "sin equipo" (no resolved team), distinct from "" = todos. */
const NO_TEAM_FILTER_VALUE = '__sin_equipo__';

const ADMIN_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'salas', label: 'Salas' },
  { id: 'red', label: 'Red' },
  // Equipos + cuentas Nube (antes pestaña Usuarios) en un solo panel.
  { id: 'equipos', label: 'Usuarios' },
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
    { label: 'Sala', key: 'sala' },
    { label: 'Mes', cell: (row) => esc(String(row.turnKey || '—')) },
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
    '<p class="cloud-sync-hint cloud-sync-admin-salas-hint">Cada sala de guardia (Sala 1, Sala 2, Sala E, Torre HU) tiene su propio espacio por mes (YYYY-MM).</p>' +
    adminTableHtml(rooms, cols)
  );
}

/** Newest `{ updatedAt, actorId }` among a patient's own entity-version keys (`entries/{id}`, `entries/{id}/fields`, …). */
function lastPatientActivity(entityVersions, patientId) {
  if (!entityVersions) return null;
  const prefix = 'entries/' + patientId;
  let best = null;
  for (const key of Object.keys(entityVersions)) {
    if (key !== prefix && !key.startsWith(prefix + '/')) continue;
    const v = entityVersions[key];
    if (!v || !v.updatedAt) continue;
    if (!best || String(v.updatedAt) > String(best.updatedAt)) best = v;
  }
  return best;
}

/**
 * Newest `{ updatedAt, actorId }` among a patient's own lab-set writes
 * (`labSidecars/{id}/{setId}`, one entityVersions key per lab set — see
 * `lww.js`'s `applyOps`). Same entityVersions map `lastPatientActivity`
 * reads, filtered to lab paths only — costs no extra fetch or decrypt,
 * since `entityVersions` already lives in the core (unsharded) room state
 * that `handleNetworkCensus` loads with `skipLabShards: true`.
 */
function lastPatientLabActivity(entityVersions, patientId) {
  if (!entityVersions) return null;
  const prefix = 'labSidecars/' + patientId + '/';
  let best = null;
  for (const key of Object.keys(entityVersions)) {
    if (!key.startsWith(prefix)) continue;
    const v = entityVersions[key];
    if (!v || !v.updatedAt) continue;
    if (!best || String(v.updatedAt) > String(best.updatedAt)) best = v;
  }
  return best;
}

const STALE_LABS_MS = 7 * 24 * 60 * 60 * 1000;

/** No lab draw in 7 days, or ever — lab age alone, regardless of archived/admission state. */
function isStaleLabsRow(row, now) {
  if (!row.lastLabAt) return true;
  return now.getTime() - new Date(row.lastLabAt).getTime() > STALE_LABS_MS;
}

/** @param {Map<string, object>} usersById @param {string} actorId */
function labelForActor(usersById, actorId) {
  const id = String(actorId || '').trim();
  if (!id) return '';
  const u = usersById.get(id);
  return u ? String(u.clinical_name || u.username || id) : id;
}

function baseFieldsForNetworkCensusRow(fields) {
  return {
    registro: fields.registro || '',
    nombre: fields.nombre || '(sin nombre)',
    cama: fields.cama || '—',
    cuarto: fields.cuarto || '—',
    servicio: fields.servicio || '—',
    archived: !!fields.archived,
  };
}

function resolveNetworkCensusTeamId(patientId, fields, teams, assignments, now, teamOptions) {
  const teamId = resolvePatientCensusTeamId({ id: patientId, ...fields }, teams, assignments, now);
  if (teamId) {
    const team = teams.find((t) => String(t.team_id || '') === teamId);
    teamOptions.set(teamId, team?.name || teamId);
  }
  return teamId;
}

function networkCensusRowFromEntry(area, entry, teams, assignments, now, teamOptions, usersById) {
  const fields = entry?.fields || {};
  const patientId = String(entry?.id || '');
  const teamId = resolveNetworkCensusTeamId(patientId, fields, teams, assignments, now, teamOptions);
  const activity = lastPatientActivity(area.entityVersions, patientId);
  const labActivity = lastPatientLabActivity(area.entityVersions, patientId);
  const row = {
    sala: area.sala,
    roomId: area.roomId,
    code: area.code,
    patientId,
    ...baseFieldsForNetworkCensusRow(fields),
    teamId,
    lastUpdatedAt: activity?.updatedAt || '',
    lastActor: activity ? labelForActor(usersById, activity.actorId) : '',
    lastLabAt: labActivity?.updatedAt || '',
  };
  row.staleLabs = isStaleLabsRow(row, now);
  return row;
}

function networkCensusRowsFromArea(area, now, teamOptions, usersById) {
  const teams = area.clinicalOps?.teams || [];
  const assignments = area.clinicalOps?.patient_team_assignment || [];
  return (area.entries || []).map((entry) =>
    networkCensusRowFromEntry(area, entry, teams, assignments, now, teamOptions, usersById)
  );
}

/**
 * Walks every area's entries into flat rows, plus the areas that errored and
 * the teamId->label map for the team filter's <option>s.
 * @param {object[]} census
 * @param {Date} now
 * @param {Array<{ user_id?: string, clinical_name?: string, username?: string }>} [users]
 */
function buildNetworkCensusRows(census, now, users) {
  const rows = [];
  const errors = [];
  const teamOptions = new Map(); // teamId -> label
  const usersById = new Map(
    (users || []).filter((u) => u && u.user_id).map((u) => [String(u.user_id), u])
  );
  for (const area of Array.isArray(census) ? census : []) {
    if (area.error) {
      errors.push(area);
      continue;
    }
    rows.push(...networkCensusRowsFromArea(area, now, teamOptions, usersById));
  }
  rows.sort(
    (a, b) =>
      a.sala.localeCompare(b.sala, 'es') ||
      String(a.cama).localeCompare(String(b.cama), 'es', { numeric: true })
  );
  return { rows, errors, teamOptions };
}

/** @param {string} iso */
function timeAgoLong(iso) {
  if (!iso) return '';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return diffMin + ' min';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + ' h';
  const diffD = Math.floor(diffH / 24);
  return diffD + ' d' + (diffD === 1 ? 'ía' : 'ías');
}

function activityCellHtml(row) {
  if (!row.lastUpdatedAt) return '<span class="cloud-sync-hint">Sin datos</span>';
  const who = row.lastActor ? esc(row.lastActor) : 'desconocido';
  return 'hace ' + timeAgoLong(row.lastUpdatedAt) + ' · ' + who;
}

/** "Últ. labs" cell — highlighted when isStaleLabsRow flagged the patient as a probable discharge. */
function labActivityCellHtml(row) {
  if (!row.lastLabAt) {
    return row.staleLabs
      ? '<span class="cloud-sync-admin-stale-labs">Nunca</span>'
      : '<span class="cloud-sync-hint">Sin datos</span>';
  }
  const text = 'hace ' + timeAgoLong(row.lastLabAt);
  return row.staleLabs ? '<span class="cloud-sync-admin-stale-labs">' + text + '</span>' : text;
}

function networkCensusCols() {
  return [
    {
      label: '',
      cell: (row) =>
        '<input type="checkbox" data-network-select data-room-id="' +
        esc(String(row.roomId || '')) +
        '" data-patient-id="' +
        esc(String(row.patientId || '')) +
        '" data-registro="' +
        esc(String(row.registro || '')) +
        '" data-archived="' +
        (row.archived ? '1' : '0') +
        '" aria-label="Seleccionar paciente" />',
    },
    { label: 'Sala', key: 'sala' },
    { label: 'Nombre', key: 'nombre' },
    { label: 'Cama', key: 'cama' },
    { label: 'Cuarto', key: 'cuarto' },
    { label: 'Servicio', key: 'servicio' },
    { label: 'Estado', cell: (row) => (row.archived ? 'Archivado' : 'Activo') },
    { label: 'Últ. actividad', cell: activityCellHtml },
    { label: 'Últ. labs', cell: labActivityCellHtml },
    {
      label: 'Acciones',
      cell: (row) =>
        '<div class="cloud-sync-admin-row-actions">' +
        '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" ' +
        'data-admin-action="switch-network-room" data-room-code="' +
        esc(String(row.code || '')) +
        '" data-patient-id="' +
        esc(String(row.patientId || '')) +
        '">Abrir expediente</button>' +
        '<details class="cloud-sync-admin-equipos-edit wb-menu">' +
        '<summary class="cloud-sync-admin-equipos-edit-summary" title="Más acciones">⋯</summary>' +
        '<div class="wb-menu-panel">' +
        '<button type="button" class="wb-menu-item" ' +
        'data-admin-action="archive-network-patient" data-room-id="' +
        esc(String(row.roomId || '')) +
        '" data-patient-id="' +
        esc(String(row.patientId || '')) +
        '" data-archived="' +
        (row.archived ? '1' : '0') +
        '">' +
        (row.archived ? 'Restaurar' : 'Archivar') +
        '</button>' +
        '<button type="button" class="wb-menu-item" ' +
        'data-admin-action="delete-network-patient" data-room-id="' +
        esc(String(row.roomId || '')) +
        '" data-patient-id="' +
        esc(String(row.patientId || '')) +
        '" data-registro="' +
        esc(String(row.registro || '')) +
        '">Eliminar</button>' +
        '</div></details>' +
        '</div>',
    },
  ];
}

function networkCensusErrorsHtml(errors) {
  return errors.length
    ? '<p class="cloud-sync-hint">Sin acceso aún: ' +
      errors.map((a) => esc(a.sala) + ' (' + esc(a.error) + ')').join(', ') +
      '</p>'
    : '';
}

function networkCensusFiltersHtml(census, teamOptions) {
  const salaOptionsHtml = (Array.isArray(census) ? census : [])
    .filter((a) => !a.error)
    .map((a) => '<option value="' + esc(a.sala) + '">' + esc(a.sala) + '</option>')
    .join('');
  const teamOptionsHtml = Array.from(teamOptions.entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .map(([id, label]) => '<option value="' + esc(id) + '">' + esc(label) + '</option>')
    .join('');

  return (
    '<div class="cloud-sync-admin-red-filters">' +
    '<select class="profile-input" data-network-filter="sala" aria-label="Filtrar por área">' +
    '<option value="">Todas las áreas</option>' +
    salaOptionsHtml +
    '</select>' +
    '<select class="profile-input" data-network-filter="team" aria-label="Filtrar por equipo">' +
    '<option value="">Todos los equipos</option>' +
    '<option value="' + NO_TEAM_FILTER_VALUE + '">Sin equipo</option>' +
    teamOptionsHtml +
    '</select>' +
    '<select class="profile-input" data-network-filter="activity" aria-label="Filtrar por estado">' +
    '<option value="">Todos</option>' +
    '<option value="active">Activos</option>' +
    '<option value="archived">Archivados</option>' +
    '</select>' +
    '<select class="profile-input" data-network-filter="labs" aria-label="Filtrar por labs">' +
    '<option value="">Todos</option>' +
    '<option value="stale">Más de 6 días</option>' +
    '<option value="fresh">Menos de 6 días</option>' +
    '</select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" ' +
    'data-admin-action="verify-red-labs" title="Consulta el repositorio de labs por cada paciente visible">' +
    'Verificar labs</button>' +
    '</div>'
  );
}

/**
 * Cross-area patient list ("Red" tab) — one row per patient, every sala's
 * current room. Rows carry the patient's room code so a click can switch
 * this device to that area (`data-admin-action="switch-network-room"`), plus
 * `data-sala`/`data-team-id`/`data-archived` for the client-side filters
 * (`applyNetworkCensusFilters` in panel-admin.mjs — no re-fetch on filter change).
 * @param {Array<{ sala: string, roomId?: string, code?: string, entries?: object[], clinicalOps?: { teams?: object[], patient_team_assignment?: object[] }|null, entityVersions?: Record<string, { updatedAt: string, actorId: string }>|null, error?: string }>} census
 * @param {Array<{ user_id?: string, clinical_name?: string, username?: string }>} [users] Clinical roster, for labeling "Últ. actividad" by actor id.
 */
export function redCensusHtml(census, users) {
  const { rows, errors, teamOptions } = buildNetworkCensusRows(census, new Date(), users);

  return (
    '<div class="cloud-sync-admin-panel-head">' +
    '<label class="cloud-sync-admin-red-select-all">' +
    '<input type="checkbox" data-network-select-all aria-label="Seleccionar todos los visibles" /> Todos</label>' +
    '<div class="cloud-sync-admin-equipos-bulk-actions" data-admin-red-bulk-actions hidden>' +
    '<span class="cloud-sync-admin-equipos-bulk-count" data-admin-red-bulk-count></span>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="bulk-archive-network">Archivar seleccionados</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="bulk-delete-network">Eliminar seleccionados</button>' +
    '</div>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="refresh-red">Actualizar</button></div>' +
    '<p class="cloud-sync-hint">Todos los pacientes, en todas las áreas, con la sala actual de cada una.</p>' +
    networkCensusFiltersHtml(census, teamOptions) +
    networkCensusErrorsHtml(errors) +
    adminTableHtml(rows, networkCensusCols(), {
      emptyHtml: '<p class="cloud-sync-hint">Sin pacientes en ninguna área.</p>',
      rowAttrs: (row) =>
        'data-sala="' +
        esc(row.sala) +
        '" data-team-id="' +
        esc(row.teamId || NO_TEAM_FILTER_VALUE) +
        '" data-archived="' +
        (row.archived ? '1' : '0') +
        '" data-no-labs="' +
        (row.lastLabAt ? '0' : '1') +
        '"' +
        (row.staleLabs ? ' class="cloud-sync-admin-row--stale-labs"' : ''),
    })
  );
}

/**
 * Applies the Red tab's sala/team/activity/labs filters by toggling row visibility —
 * no re-fetch, the census HTML already carries every row's `data-sala`,
 * `data-team-id`, `data-archived`. The labs filter reads the same
 * `cloud-sync-admin-row--stale-labs` class the row highlight uses (no labs at
 * all, or a last lab over 6 days old once verified — see
 * `markNetworkRowLabsVerified`), so "stale"/"fresh" always match what's lit up.
 * Safe to call with no filter selects present.
 * @param {HTMLElement} root
 */
export function applyNetworkCensusFilters(root) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel) return;
  const val = (name) => {
    const sel = panel.querySelector('[data-network-filter="' + name + '"]');
    return sel instanceof HTMLSelectElement ? sel.value : '';
  };
  const sala = val('sala');
  const team = val('team');
  const activity = val('activity');
  const labs = val('labs');
  panel.querySelectorAll('tbody tr').forEach((tr) => {
    let show = true;
    if (sala && tr.getAttribute('data-sala') !== sala) show = false;
    if (team && tr.getAttribute('data-team-id') !== team) show = false;
    if (activity === 'active' && tr.getAttribute('data-archived') === '1') show = false;
    if (activity === 'archived' && tr.getAttribute('data-archived') !== '1') show = false;
    const stale = tr.classList.contains('cloud-sync-admin-row--stale-labs');
    if (labs === 'stale' && !stale) show = false;
    if (labs === 'fresh' && stale) show = false;
    tr.hidden = !show;
  });
}

/**
 * Checkboxes belonging to rows the filters currently show (`tr.hidden === false`) —
 * "select all" only ever touches what the admin can actually see.
 * @param {HTMLElement} root
 */
export function listVisibleNetworkCheckboxes(root) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel) return [];
  return [...panel.querySelectorAll('tbody input[data-network-select]')].filter(
    (cb) => cb instanceof HTMLInputElement && !cb.closest('tr')?.hidden
  );
}

/**
 * @param {HTMLElement} root
 * @returns {Array<{ roomId: string, patientId: string, registro: string, archived: boolean }>}
 */
export function listSelectedNetworkPatients(root) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel) return [];
  return [...panel.querySelectorAll('tbody input[data-network-select]:checked')]
    .filter((cb) => cb instanceof HTMLInputElement)
    .map((cb) => ({
      roomId: cb.getAttribute('data-room-id') || '',
      patientId: cb.getAttribute('data-patient-id') || '',
      registro: cb.getAttribute('data-registro') || '',
      archived: cb.getAttribute('data-archived') === '1',
    }));
}

/** @param {HTMLElement} root @param {boolean} checked */
export function setSelectAllVisibleNetwork(root, checked) {
  for (const cb of listVisibleNetworkCheckboxes(root)) cb.checked = checked;
}

/**
 * Rows the filters currently show, with a registro to check against the lab
 * repo portal. Used by "Verificar labs" — same registro the delete action uses.
 * @param {HTMLElement} root
 * @returns {Array<{ tr: HTMLTableRowElement, registro: string, patientId: string }>}
 */
export function listVisibleNetworkRowsWithRegistro(root) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel) return [];
  return [...panel.querySelectorAll('tbody tr')]
    .filter((tr) => !tr.hidden)
    .map((tr) => {
      const cb = tr.querySelector('input[data-network-select]');
      return {
        tr: /** @type {HTMLTableRowElement} */ (tr),
        registro: cb?.getAttribute('data-registro') || '',
        patientId: cb?.getAttribute('data-patient-id') || '',
      };
    })
    .filter((row) => row.registro);
}

const VERIFIED_STALE_LABS_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * Stamps a verified existence result onto a row: `data-no-labs` reflects the
 * live portal check instead of the cloud-sync guess, and the "Últ. labs" cell
 * shows the newest `fechaSolicitud` the portal reported (existence check only,
 * no PDF parse — so no lab values, just the date it was requested). The stale
 * highlight stays lit for no labs at all, or a last lab over 6 days old —
 * archived/incomplete-admission no longer exempt (age alone decides).
 * @param {HTMLTableRowElement} tr @param {boolean} hasStudies
 * @param {string|null} [lastFechaSolicitud]
 */
export function markNetworkRowLabsVerified(tr, hasStudies, lastFechaSolicitud) {
  tr.setAttribute('data-no-labs', hasStudies ? '0' : '1');
  const ageMs = lastFechaSolicitud ? Date.now() - new Date(lastFechaSolicitud).getTime() : NaN;
  const stale = !hasStudies || (Number.isFinite(ageMs) && ageMs > VERIFIED_STALE_LABS_MS);
  tr.classList.toggle('cloud-sync-admin-row--stale-labs', stale);
  const cell = tr.querySelector('td:nth-child(9)');
  if (cell) {
    cell.innerHTML = !hasStudies
      ? '<span class="cloud-sync-admin-stale-labs">Sin labs (verificado)</span>'
      : lastFechaSolicitud
        ? 'hace ' + timeAgoLong(lastFechaSolicitud) + ' (verificado)'
        : '<span class="cloud-sync-hint">Tiene labs (verificado)</span>';
  }
}

/**
 * Restores any cached "Verificar labs" result onto freshly rendered rows —
 * keeps the verified state visible across a Red census reload, before
 * `autoVerifyStaleNetworkLabs` (panel-admin-labs-verify.mjs) re-checks stale ones.
 * @param {HTMLElement} root
 */
export function applyCachedLabVerifications(root) {
  const panel = root.querySelector('[data-admin-red]');
  if (!panel) return;
  panel.querySelectorAll('tbody tr').forEach((tr) => {
    const patientId = tr.querySelector('input[data-network-select]')?.getAttribute('data-patient-id') || '';
    const cached = patientId ? getCachedLabVerify(patientId) : null;
    if (cached) markNetworkRowLabsVerified(/** @type {HTMLTableRowElement} */ (tr), cached.hasStudies, cached.lastFechaSolicitud);
  });
}

/** Show Archivar/Eliminar only once a row is checked. @param {HTMLElement} root */
export function updateNetworkBulkBarVisibility(root) {
  const panel = root.querySelector('[data-admin-red]');
  const actions = panel?.querySelector('[data-admin-red-bulk-actions]');
  if (!(actions instanceof HTMLElement)) return;
  const count = listSelectedNetworkPatients(root).length;
  actions.hidden = count === 0;
  const countEl = actions.querySelector('[data-admin-red-bulk-count]');
  if (countEl) countEl.textContent = count ? count + ' seleccionado' + (count === 1 ? '' : 's') : '';
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
    '<div><dt>Mes</dt><dd>' +
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

/** @deprecated Usuarios merged into Equipos — kept for tests/import stability. */
export function usuariosShellHtml() {
  return equiposRedirectHintHtml();
}

function equiposRedirectHintHtml() {
  return (
    '<p class="cloud-sync-hint">La gestión de usuarios está en la pestaña <strong>Usuarios</strong> (equipos + cuenta Nube).</p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-tab="equipos">Ir a Usuarios</button>'
  );
}

/**
 * Compact Nube account actions for Equipos rows (replaces the old Usuarios table).
 * @param {{ id: string, username?: string }} user
 * @param {{ bare?: boolean }} [opts] — bare: return just the actions, no own <details> wrap (caller supplies one)
 */
export function userActionsHtml(user, opts = {}) {
  const id = esc(String(user.id));
  const handle = esc(String(user.username || ''));
  const actions =
    '<div class="cloud-sync-admin-row-actions cloud-sync-admin-row-actions--compact">' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="revoke-sessions" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Revocar</button>' +
    '<select class="profile-input cloud-sync-admin-role-select" data-admin-promote-role data-user-id="' +
    id +
    '" title="Rol Nube" aria-label="Rol Nube">' +
    '<option value="admin">Admin</option><option value="program_admin">Admin programa</option>' +
    '<option value="member" selected>Miembro</option></select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="promote-user" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Rol</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost cloud-sync-btn--compact" data-admin-action="disable-user" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Deshabilitar</button>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--danger cloud-sync-btn--compact" data-admin-action="delete-user" data-user-id="' +
    id +
    '" data-user-handle="' +
    handle +
    '">Eliminar Nube</button></div>';
  if (opts.bare) return actions;
  return (
    '<details class="cloud-sync-admin-equipos-nube">' +
    '<summary class="cloud-sync-admin-equipos-nube-summary">Nube</summary>' +
    actions +
    '</details>'
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
    { label: '#Ops', key: 'opCount' },
    {
      label: 'Tamaño',
      cell: (m) => {
        const total = Number(m.totalBytes);
        const maxB = Number(m.maxOpBytes);
        if (!Number.isFinite(total) && !Number.isFinite(maxB)) return '—';
        const parts = [];
        if (Number.isFinite(total)) parts.push(String(Math.round(total / 1024)) + ' KB');
        if (Number.isFinite(maxB)) parts.push('max ' + String(Math.round(maxB / 1024)) + ' KB');
        return esc(parts.join(' · '));
      },
    },
    {
      label: 'Path max',
      cell: (m) => esc(String(m.maxOpPath || '—')),
    },
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
    '<p class="cloud-sync-hint">Revocar sesiones, deshabilitar o borrar cuentas (pestaña Usuarios).</p>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-tab="equipos">Ir a Usuarios</button>' +
    '</section></div>'
  );
}

/** @param {string} message */
export function adminErrorHtml(message) {
  return '<p class="cloud-sync-admin-error">' + esc(message) + '</p>';
}
