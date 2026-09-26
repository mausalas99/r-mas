import { esc } from '../../dom-escape.mjs';
import { formatBytes } from '../../update-helpers.mjs';
import { adminTableHtml, fmtRole } from './panel-admin-helpers.mjs';
import { formatCloudRoomLabel } from './room-label.mjs';
import { resolvePatientCensusTeamId } from '../patients-clinical-filter.mjs';
import { getCachedLabVerify } from './lab-verify-cache.mjs';

/** Sentinel team-filter value meaning "sin equipo" (no resolved team), distinct from "" = todos. */
const NO_TEAM_FILTER_VALUE = '__sin_equipo__';

const ADMIN_ICON_PATHS = {
  resumen:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>' +
    '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  salas: '<path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16"/><path d="M2 21h20"/><path d="M14 12h.01"/>',
  red: '<path d="M2 18V6"/><path d="M2 14h20v4"/><path d="M22 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="10.5" r="2"/>',
  equipos:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/>' +
    '<path d="M18 14a6 6 0 0 1 3.5 6"/>',
  mutaciones: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  peligro: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
};

/**
 * Board «Nube + Admin»: a side menu instead of tabs. Ids stay the same
 * (data-admin-tab / data-admin-section) — «red» shows as Pacientes and
 * «mutaciones» as Registro; Zona de peligro sits at the bottom.
 */
const ADMIN_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'salas', label: 'Salas', count: true },
  { id: 'red', label: 'Pacientes', count: true },
  // Equipos + cuentas Nube (antes pestaña Usuarios) en un solo panel.
  { id: 'equipos', label: 'Usuarios', count: true },
  { id: 'mutaciones', label: 'Registro' },
  { id: 'peligro', label: 'Zona de peligro', danger: true },
];

/** @param {string} id */
function adminIconSvg(id) {
  return (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ADMIN_ICON_PATHS[id] || '') +
    '</svg>'
  );
}

/** @param {{ id: string, label: string, count?: boolean, danger?: boolean }} t @param {boolean} active */
function adminNavItemHtml(t, active) {
  return (
    '<button type="button" class="cloud-sync-admin-nav-item' +
    (t.danger ? ' cloud-sync-admin-nav-item--danger' : '') +
    (active ? ' is-active' : '') +
    '" role="tab" data-admin-tab="' +
    esc(t.id) +
    '" aria-selected="' +
    (active ? 'true' : 'false') +
    '">' +
    adminIconSvg(t.id) +
    '<span>' +
    esc(t.label) +
    '</span>' +
    (t.count ? '<span class="cloud-sync-admin-nav-count" data-admin-count="' + esc(t.id) + '"></span>' : '') +
    '</button>'
  );
}

/** @param {boolean} [showBootstrap] */
export function buildAdminShellHtml(showBootstrap = true) {
  const main = ADMIN_TABS.filter((t) => !t.danger);
  const danger = ADMIN_TABS.filter((t) => t.danger);
  const panels = ADMIN_TABS.map((t, i) => {
    const active = i === 0;
    const loading = t.id === 'resumen' || t.id === 'salas' ? adminSkeletonHtml() : '';
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
    '<nav class="cloud-sync-admin-nav" role="tablist" aria-orientation="vertical" aria-label="Secciones de administración">' +
    main.map((t, i) => adminNavItemHtml(t, i === 0)).join('') +
    '<span class="cloud-sync-admin-nav-spacer" aria-hidden="true"></span>' +
    danger.map((t) => adminNavItemHtml(t, false)).join('') +
    '</nav>' +
    '<div class="cloud-sync-admin-main">' +
    (showBootstrap ? bootstrapHtml() : '') +
    '<div class="cloud-sync-admin-panels">' +
    panels +
    '</div></div></div>'
  );
}

/** Section title, one grey line, and optional controls on the right. @param {string} title @param {string} sub @param {string} [right] */
function adminHeadHtml(title, sub, right = '') {
  return (
    // A <div>, not <header>: layout.css styles every <header> as the app bar.
    '<div class="cloud-sync-admin-head">' +
    '<div class="cloud-sync-admin-head-text"><h4 class="cloud-sync-admin-h">' +
    esc(title) +
    '</h4>' +
    (sub ? '<p class="cloud-sync-admin-sub">' + sub + '</p>' : '') +
    '</div>' +
    (right ? '<div class="cloud-sync-admin-head-right">' + right + '</div>' : '') +
    '</div>'
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

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** «2026-09» → «Septiembre 2026». @param {unknown} key */
function monthLabel(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || '').trim());
  const name = m ? MONTHS_ES[Number(m[2]) - 1] : '';
  return name ? name.charAt(0).toUpperCase() + name.slice(1) + ' ' + m[1] : String(key || '');
}

/** @param {string} label @param {string} value @param {string} meta @param {string} [id] */
function statCardHtml(label, value, meta, id = '') {
  return (
    '<div class="cloud-sync-admin-card"' +
    (id ? ' data-admin-stat="' + esc(id) + '"' : '') +
    '><span class="cloud-sync-admin-card-label">' +
    esc(label) +
    '</span><span class="cloud-sync-admin-card-value">' +
    esc(value) +
    '</span><span class="cloud-sync-admin-card-meta">' +
    esc(meta) +
    '</span></div>'
  );
}

const ONE_MB = 1024 * 1024;

/**
 * Resumen (board «Admin · Resumen»): four cards, what needs attention, and
 * space per sala. The attention list and the patient card fill in once the
 * salas and the network census load (see renderAdminResumenExtras).
 * @param {object} data
 */
export function resumenHtml(data) {
  const c = data.counts || {};
  const m = data.meters || {};
  const storage = Number(c.storageBytes ?? m.storageBytes ?? 0);
  const soft = Number(m.storageSoftBytes ?? 0);
  const hard = Number(m.storageHardBytes ?? 0);
  const storageMeta = [soft ? 'aviso ' + formatBytes(soft) : '', hard ? 'tope ' + formatBytes(hard) : '']
    .filter(Boolean)
    .join(' · ');
  const now = new Date();
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  return (
    adminHeadHtml(
      'Resumen',
      esc(monthLabel(thisMonth)) + ' · actualizado ahora',
      '<button type="button" class="cloud-sync-btn" data-admin-action="refresh-resumen">Actualizar</button>'
    ) +
    '<div class="cloud-sync-admin-cards">' +
    statCardHtml('Salas activas', String(c.rooms ?? 0), 'Hasta ' + (m.maxMembersPerRoom ?? '—') + ' miembros por sala', 'rooms') +
    statCardHtml('Usuarios', String(c.users ?? 0), String(c.members ?? 0) + (Number(c.members) === 1 ? ' lugar' : ' lugares') + ' en salas', 'users') +
    statCardHtml('Pacientes', '…', 'En todas las salas', 'patients') +
    statCardHtml('Espacio usado', formatBytes(storage), storageMeta || 'En Nube', 'storage') +
    '</div>' +
    '<div class="cloud-sync-admin-resumen-extras" data-admin-resumen-extras></div>'
  );
}

/**
 * «Necesita atención» + «Espacio por sala», from what the other sections
 * already loaded (no extra requests). Any part with no data is left out.
 * @param {{ rooms?: Array<{ sala?: string, turnKey?: string, storageBytes?: number }>, patients?: Array<{ sala: string, nombre: string, staleLabs?: boolean, archived?: boolean }> | null }} d
 */
export function resumenExtrasHtml(d) {
  const rooms = Array.isArray(d.rooms) ? d.rooms : [];
  const patients = Array.isArray(d.patients) ? d.patients : null;
  const items = [];
  if (patients) {
    const unnamed = new Map();
    patients.filter((p) => p.nombre === '(sin nombre)').forEach((p) => unnamed.set(p.sala, (unnamed.get(p.sala) || 0) + 1));
    for (const [sala, n] of unnamed) {
      items.push([n + (n === 1 ? ' paciente sin nombre en ' : ' pacientes sin nombre en ') + sala, 'Revisar', 'red']);
    }
    const stale = patients.filter((p) => p.staleLabs && !p.archived).length;
    if (stale) items.push([stale + (stale === 1 ? ' paciente activo' : ' pacientes activos') + ' sin labs recientes', 'Ver', 'red']);
  }
  rooms
    .filter((r) => Number(r.storageBytes) > ONE_MB)
    .forEach((r) => items.push([(r.sala || 'Una sala') + ' usa ' + formatBytes(Number(r.storageBytes)), 'Salas', 'salas']));
  const attention = items.length
    ? '<section class="cloud-sync-admin-block"><h5 class="cloud-sync-options-label">Necesita atención</h5>' +
      '<div class="cloud-sync-inset-group">' +
      items
        .map(
          ([text, cta, tab]) =>
            '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-admin-attention">' +
            '<span>' + esc(text) + '</span>' +
            '<button type="button" class="cloud-sync-btn" data-admin-tab="' + esc(tab) + '">' + esc(cta) + '</button></div>'
        )
        .join('') +
      '</div></section>'
    : '';
  const sorted = rooms.slice().sort((a, b) => Number(b.storageBytes || 0) - Number(a.storageBytes || 0));
  const max = Math.max(1, ...sorted.map((r) => Number(r.storageBytes) || 0));
  const space = sorted.length
    ? '<section class="cloud-sync-admin-block"><h5 class="cloud-sync-options-label">Espacio por sala</h5>' +
      '<div class="cloud-sync-inset-group cloud-sync-admin-space">' +
      sorted
        .map((r) => {
          const bytes = Number(r.storageBytes) || 0;
          const pct = Math.max(2, Math.round((bytes / max) * 100));
          return (
            '<div class="cloud-sync-inset-row cloud-sync-inset-row--static cloud-sync-admin-space-row">' +
            '<span class="cloud-sync-admin-space-name">' + esc(r.sala || '—') + '</span>' +
            '<span class="cloud-sync-admin-space-track" aria-hidden="true"><span style="width:' + pct + '%"></span></span>' +
            '<span class="cloud-sync-admin-space-value">' + esc(formatBytes(bytes)) + '</span></div>'
          );
        })
        .join('') +
      '</div></section>'
    : '';
  return attention + space;
}

/** @param {Record<string, unknown>} row @param {string} currentRoomId */
function salaCardHtml(row, currentRoomId) {
  const id = esc(String(row.id));
  const code = String(row.code || '');
  const mine = currentRoomId && String(row.id) === currentRoomId;
  return (
    '<article class="cloud-sync-admin-sala' +
    (mine ? ' is-mine' : '') +
    '" data-admin-sala-card data-sala="' +
    esc(String(row.sala || '')) +
    '" data-turn="' +
    esc(String(row.turnKey || '')) +
    '">' +
    '<div class="cloud-sync-admin-sala-top"><h5 class="cloud-sync-admin-sala-name">' +
    esc(String(row.sala || '—')) +
    '</h5>' +
    (mine ? '<span class="cloud-sync-admin-pill">Tu sala</span>' : '') +
    '<span class="cloud-sync-admin-sala-bytes">' +
    esc(formatBytes(Number(row.storageBytes) || 0)) +
    '</span></div>' +
    '<code class="cloud-sync-admin-sala-code">' +
    esc(code || '—') +
    '</code>' +
    '<p class="cloud-sync-admin-sala-meta">' +
    esc(String(row.memberCount ?? 0) + (Number(row.memberCount) === 1 ? ' miembro' : ' miembros') + ' · Rev. ' + String(row.revision ?? 0)) +
    '</p>' +
    '<div class="cloud-sync-admin-sala-actions">' +
    '<button type="button" class="cloud-sync-btn" data-admin-action="room-detail" data-room-id="' + id + '">Ver detalle</button>' +
    '<details class="cloud-sync-admin-more wb-menu">' +
    '<summary class="cloud-sync-admin-more-btn" aria-label="Más acciones de ' + esc(String(row.sala || 'la sala')) + '">···</summary>' +
    '<div class="wb-menu-panel">' +
    '<button type="button" class="wb-menu-item" data-admin-action="rotate-code" data-room-id="' + id + '">Cambiar código</button>' +
    '<button type="button" class="wb-menu-item" data-admin-action="copy-room-invite" data-room-code="' + esc(code) + '">Copiar invitación</button>' +
    '<button type="button" class="wb-menu-item wb-menu-item--danger" data-admin-action="purge-room" data-room-id="' + id +
    '" data-room-code="' + esc(code) + '">Purgar sala…</button>' +
    '</div></details></div></article>'
  );
}

/**
 * Salas (board «Admin · Salas en tarjetas»): one card per sala, a month
 * picker and a search box (client-side, see applyAdminSalasFilters). Purge
 * sits in the ··· menu, never as a red button on every card.
 * @param {Array<Record<string, unknown>>} rooms
 * @param {string} [currentRoomId] this device's room → «Tu sala»
 */
export function salasTableHtml(rooms, currentRoomId = '') {
  const list = Array.isArray(rooms) ? rooms : [];
  const months = [...new Set(list.map((r) => String(r.turnKey || '')).filter(Boolean))].sort().reverse();
  const latest = months[0] || '';
  const byBytes = list.slice().sort((a, b) => Number(b.storageBytes || 0) - Number(a.storageBytes || 0));
  const monthOptions = months
    .map((k) => '<option value="' + esc(k) + '"' + (k === latest ? ' selected' : '') + '>' + esc(monthLabel(k)) + '</option>')
    .join('');
  return (
    adminHeadHtml(
      'Salas',
      'Cada sala de guardia tiene su propio espacio por mes.',
      '<button type="button" class="cloud-sync-btn" data-admin-action="refresh-salas">Actualizar</button>'
    ) +
    '<div class="cloud-sync-admin-filters">' +
    (months.length > 1
      ? '<label class="cloud-sync-admin-filter"><span>Mes</span><select class="profile-input" data-admin-salas-month>' +
        monthOptions +
        '<option value="">Todos</option></select></label>'
      : '') +
    '<input type="search" class="profile-input cloud-sync-admin-search" data-admin-salas-search placeholder="Buscar sala" aria-label="Buscar sala" />' +
    '</div>' +
    (list.length
      ? '<div class="cloud-sync-admin-sala-grid" data-admin-sala-grid>' +
        byBytes.map((row) => salaCardHtml(row, String(currentRoomId || ''))).join('') +
        '</div>'
      : '<p class="cloud-sync-hint">Sin salas todavía.</p>')
  );
}

/**
 * Month + search filters for the Salas cards — no re-fetch.
 * @param {HTMLElement} root
 */
export function applyAdminSalasFilters(root) {
  const panel = root.querySelector('[data-admin-salas]');
  if (!panel) return;
  const month = panel.querySelector('[data-admin-salas-month]');
  const search = panel.querySelector('[data-admin-salas-search]');
  const m = month instanceof HTMLSelectElement ? month.value : '';
  const q = search instanceof HTMLInputElement ? search.value.trim().toLowerCase() : '';
  panel.querySelectorAll('[data-admin-sala-card]').forEach((card) => {
    const okMonth = !m || card.getAttribute('data-turn') === m;
    const okText = !q || String(card.getAttribute('data-sala') || '').toLowerCase().includes(q);
    card.hidden = !(okMonth && okText);
  });
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

/**
 * Flat patient rows for the Resumen (counts, «sin nombre», stale labs).
 * @param {object[]} census @param {Array<{ user_id?: string }>} [users]
 */
export function networkCensusRows(census, users) {
  return buildNetworkCensusRows(census, new Date(), users).rows;
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
