import { esc } from '../../dom-escape.mjs';
import { formatBytes } from '../../update-helpers.mjs';
import { fmtRole } from './panel-admin-helpers.mjs';
import { formatCloudRoomLabel } from './room-label.mjs';
import { resolvePatientCensusTeamId } from '../patients-clinical-filter.mjs';
import { getCachedLabVerify } from './lab-verify-cache.mjs';
import { classifyCloudOpPath } from './cloud-sync-diagnostics.mjs';

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
  solicitudes: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>',
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
  { id: 'solicitudes', label: 'Solicitudes', count: true },
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
export function adminHeadHtml(title, sub, right = '') {
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

const ONE_MB = 1024 * 1024;

/**
 * Resumen model (board «Admin · Resumen»): four cards. The attention list and the patient card
 * fill in once the salas and the network census load (see renderAdminResumenExtras).
 * @param {object} data @param {Date} [now]
 */
export function resumenModel(data, now = new Date()) {
  const c = data.counts || {};
  const m = data.meters || {};
  const storage = Number(c.storageBytes ?? m.storageBytes ?? 0);
  const soft = Number(m.storageSoftBytes ?? 0);
  const hard = Number(m.storageHardBytes ?? 0);
  const storageMeta = [soft ? 'aviso ' + formatBytes(soft) : '', hard ? 'tope ' + formatBytes(hard) : '']
    .filter(Boolean)
    .join(' · ');
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  return {
    sub: monthLabel(thisMonth) + ' · actualizado ahora',
    cards: [
      { label: 'Salas activas', value: String(c.rooms ?? 0), meta: 'Hasta ' + (m.maxMembersPerRoom ?? '—') + ' miembros por sala', id: 'rooms' },
      { label: 'Usuarios', value: String(c.users ?? 0), meta: String(c.members ?? 0) + (Number(c.members) === 1 ? ' lugar' : ' lugares') + ' en salas', id: 'users' },
      { label: 'Pacientes', value: '…', meta: 'En todas las salas', id: 'patients' },
      { label: 'Espacio usado', value: formatBytes(storage), meta: storageMeta || 'En Nube', id: 'storage' },
    ],
  };
}

/**
 * «Necesita atención» + «Espacio por sala» model, from what the other sections
 * already loaded (no extra requests). Any part with no data is left out.
 * @param {{ rooms?: Array<{ sala?: string, turnKey?: string, storageBytes?: number }>, patients?: Array<{ sala: string, nombre: string, staleLabs?: boolean, archived?: boolean }> | null }} d
 */
export function resumenExtrasModel(d) {
  const rooms = Array.isArray(d.rooms) ? d.rooms : [];
  const patients = Array.isArray(d.patients) ? d.patients : null;
  const attention = [];
  if (patients) {
    const unnamed = new Map();
    patients.filter((p) => p.nombre === '(sin nombre)').forEach((p) => unnamed.set(p.sala, (unnamed.get(p.sala) || 0) + 1));
    for (const [sala, n] of unnamed) {
      attention.push({ text: n + (n === 1 ? ' paciente sin nombre en ' : ' pacientes sin nombre en ') + sala, cta: 'Revisar', tab: 'red' });
    }
    const stale = patients.filter((p) => p.staleLabs && !p.archived).length;
    if (stale) attention.push({ text: stale + (stale === 1 ? ' paciente activo' : ' pacientes activos') + ' sin labs recientes', cta: 'Ver', tab: 'red' });
  }
  rooms
    .filter((r) => Number(r.storageBytes) > ONE_MB)
    .forEach((r) => attention.push({ text: (r.sala || 'Una sala') + ' usa ' + formatBytes(Number(r.storageBytes)), cta: 'Salas', tab: 'salas' }));
  const sorted = rooms.slice().sort((a, b) => Number(b.storageBytes || 0) - Number(a.storageBytes || 0));
  const max = Math.max(1, ...sorted.map((r) => Number(r.storageBytes) || 0));
  return {
    attention,
    space: sorted.map((r) => {
      const bytes = Number(r.storageBytes) || 0;
      return { name: r.sala || '—', pct: Math.max(2, Math.round((bytes / max) * 100)), value: formatBytes(bytes) };
    }),
  };
}

/**
 * Salas model (board «Admin · Salas en tarjetas»): one card per sala, a month picker and a search
 * box (client-side, see applyAdminSalasFilters). Purge sits in the ··· menu, never as a red button on every card.
 * @param {Array<Record<string, unknown>>} rooms
 * @param {string} [currentRoomId] this device's room → «Tu sala»
 * @param {boolean} [detailHost] a room's detail is open → leave a host for it under the cards
 */
export function salasModel(rooms, currentRoomId = '', detailHost = false) {
  const list = Array.isArray(rooms) ? rooms : [];
  const months = [...new Set(list.map((r) => String(r.turnKey || '')).filter(Boolean))].sort().reverse();
  const latest = months[0] || '';
  const byBytes = list.slice().sort((a, b) => Number(b.storageBytes || 0) - Number(a.storageBytes || 0));
  const mineId = String(currentRoomId || '');
  return {
    months: months.map((k) => ({ key: k, label: monthLabel(k), selected: k === latest })),
    detailHost,
    cards: byBytes.map((row) => ({
      id: String(row.id),
      mine: !!mineId && String(row.id) === mineId,
      sala: String(row.sala || ''),
      turn: String(row.turnKey || ''),
      name: String(row.sala || '—'),
      bytes: formatBytes(Number(row.storageBytes) || 0),
      code: String(row.code || ''),
      meta: String(row.memberCount ?? 0) + (Number(row.memberCount) === 1 ? ' miembro' : ' miembros') + ' · Rev. ' + String(row.revision ?? 0),
      moreLabel: 'Más acciones de ' + String(row.sala || 'la sala'),
    })),
  };
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

/**
 * Clinical work that counts as patient activity, by entry sub-path. `fields`
 * (archive, cama, cuarto) is left out on purpose: housekeeping is not care.
 */
const CLINICAL_ENTRY_KINDS = {
  monitoreo: 'Estado actual',
  eventualidades: 'Estado actual',
  note: 'Manejo',
  indicaciones: 'Manejo',
  medReceta: 'Manejo',
  listadoProblemas: 'Manejo',
  vpo: 'Manejo',
  medPharmProfile: 'Manejo',
};

/** @param {string} key @param {string} patientId @returns {string} '' when the path is not clinical work */
function clinicalActivityKind(key, patientId) {
  if (key.startsWith('labSidecars/' + patientId + '/')) return 'Labs';
  const prefix = 'entries/' + patientId + '/';
  return key.startsWith(prefix) ? CLINICAL_ENTRY_KINDS[key.slice(prefix.length)] || '' : '';
}

/**
 * Newest clinical write (labs, Estado actual, Manejo) by someone on the
 * patient's team. `memberIds` null = patient has no team → any actor counts.
 * Admin-side reads (Verificar labs) never write, so they never show here.
 * @param {Record<string, { updatedAt: string, actorId: string }>|null} entityVersions
 * @param {string} patientId @param {Set<string>|null} memberIds
 * @returns {{ updatedAt: string, actorId: string, kind: string }|null}
 */
export function lastTeamActivity(entityVersions, patientId, memberIds) {
  if (!entityVersions) return null;
  let best = null;
  for (const [key, v] of Object.entries(entityVersions)) {
    if (!v?.updatedAt) continue;
    const kind = clinicalActivityKind(key, patientId);
    if (!kind) continue;
    if (memberIds && !memberIds.has(String(v.actorId || ''))) continue;
    if (!best || String(v.updatedAt) > best.updatedAt) best = { updatedAt: String(v.updatedAt), actorId: v.actorId, kind };
  }
  return best;
}

/** @param {object[]|undefined} membership `clinicalOps.team_membership` rows @param {string} teamId */
function teamMemberIds(membership, teamId) {
  if (!teamId) return null;
  return new Set(
    (membership || []).filter((m) => String(m?.team_id || '') === teamId).map((m) => String(m?.user_id || ''))
  );
}

const INACTIVE_MS = 7 * 24 * 60 * 60 * 1000;

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
  const members = teamMemberIds(area.clinicalOps?.team_membership, teamId);
  const activity = lastTeamActivity(area.entityVersions, patientId, members);
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
    lastKind: activity?.kind || '',
    lastLabAt: labActivity?.updatedAt || '',
  };
  row.staleLabs = isStaleLabsRow(row, now);
  row.inactive =
    !row.archived && (!activity || now.getTime() - new Date(activity.updatedAt).getTime() >= INACTIVE_MS);
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

/** @param {string} iso @param {number} [nowMs] */
function timeAgoLong(iso, nowMs = Date.now()) {
  if (!iso) return '';
  const diffMin = Math.floor((nowMs - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return diffMin + ' min';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + ' h';
  const diffD = Math.floor(diffH / 24);
  return diffD + ' d' + (diffD === 1 ? 'ía' : 'ías');
}

/**
 * Text for the Estado / Últ. actividad / Últ. labs cells. Estado: colored dot + age of last team
 * activity (<24 h ok, <7 d quiet, 7 d+/none inactive). Últ. actividad: team clinical work only
 * (see lastTeamActivity). Últ. labs: highlighted when isStaleLabsRow flagged a probable discharge.
 */
function censusCells(row, nowMs) {
  let estado;
  if (row.archived) estado = { tone: 'off', text: 'Archivado' };
  else if (!row.lastUpdatedAt) estado = { tone: 'bad', text: 'Inactivo · nunca' };
  else {
    const tone = row.inactive ? 'bad' : nowMs - new Date(row.lastUpdatedAt).getTime() < 86400000 ? 'ok' : 'warn';
    const label = tone === 'ok' ? 'Activo' : tone === 'warn' ? 'Sin cambios' : 'Inactivo';
    estado = { tone, text: label + ' · ' + timeAgoLong(row.lastUpdatedAt, nowMs) };
  }
  const activity = row.lastUpdatedAt
    ? { text: row.lastKind + ' · hace ' + timeAgoLong(row.lastUpdatedAt, nowMs), who: row.lastActor || 'desconocido' }
    : null;
  const labs = !row.lastLabAt
    ? { kind: row.staleLabs ? 'never' : 'nodata' }
    : { kind: row.staleLabs ? 'stale' : 'plain', text: 'hace ' + timeAgoLong(row.lastLabAt, nowMs) };
  return { estado, activity, labs };
}


/**
 * Cross-area patient list ("Red" tab) model — one row per patient, every sala's
 * current room, drawn by AdminRed. Rows carry the patient's room code so a click can switch
 * this device to that area (`data-admin-action="switch-network-room"`), plus
 * `data-sala`/`data-team-id`/`data-archived` for the client-side filters
 * (`applyNetworkCensusFilters` — no re-fetch on filter change).
 * @param {Array<{ sala: string, roomId?: string, code?: string, entries?: object[], clinicalOps?: { teams?: object[], patient_team_assignment?: object[] }|null, entityVersions?: Record<string, { updatedAt: string, actorId: string }>|null, error?: string }>} census
 * @param {Array<{ user_id?: string, clinical_name?: string, username?: string }>} [users] Clinical roster, for labeling "Últ. actividad" by actor id.
 * @param {number} [nowMs]
 */
export function networkCensusModel(census, users, nowMs = Date.now()) {
  const { rows, errors, teamOptions } = buildNetworkCensusRows(census, new Date(nowMs), users);
  const byReason = new Map();
  for (const a of errors) {
    const reason = String(a.error || 'Sin acceso').replace(/\.$/, '');
    byReason.set(reason, (byReason.get(reason) || []).concat(a.sala));
  }
  const unnamed = rows.filter((r) => r.nombre === '(sin nombre)');
  const n = unnamed.length;
  return {
    noTeamValue: NO_TEAM_FILTER_VALUE,
    salas: (Array.isArray(census) ? census : []).filter((a) => !a.error).map((a) => String(a.sala)),
    teams: Array.from(teamOptions.entries()).sort((a, b) => a[1].localeCompare(b[1], 'es')),
    banner: n
      ? {
          text: n + (n === 1 ? ' registro sin nombre' : ' registros sin nombre') + ' en ' + [...new Set(unnamed.map((r) => r.sala))].join(', ') + '.',
          button: 'Revisar ' + (n === 1 ? 'el registro' : 'los ' + n),
        }
      : null,
    errorText: [...byReason].map(([reason, salas]) => reason + ': ' + salas.join(', ') + '.').join(' '),
    rows: rows.map((row) => ({ ...row, ...censusCells(row, nowMs) })),
  };
}


/** Estado filter: active / archived / inactive (no team activity 7+ days) — read off row attrs. */
function matchesActivityFilter(tr, activity) {
  if (activity === 'active') return tr.getAttribute('data-archived') !== '1';
  if (activity === 'archived') return tr.getAttribute('data-archived') === '1';
  if (activity === 'inactive') return tr.getAttribute('data-inactive') === '1';
  return true;
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
  const qEl = panel.querySelector('[data-network-filter="q"]');
  const q = qEl instanceof HTMLInputElement ? qEl.value.trim().toLowerCase() : '';
  panel.querySelectorAll('tbody tr').forEach((tr) => {
    let show = !q || String(tr.getAttribute('data-search') || '').includes(q);
    if (sala && tr.getAttribute('data-sala') !== sala) show = false;
    if (team && tr.getAttribute('data-team-id') !== team) show = false;
    if (activity && !matchesActivityFilter(tr, activity)) show = false;
    const stale = tr.classList.contains('cloud-sync-admin-row--stale-labs');
    if (labs === 'stale' && !stale) show = false;
    if (labs === 'fresh' && stale) show = false;
    tr.hidden = !show;
  });
  const table = panel.querySelector('table');
  panel.querySelector('[data-network-empty]')?.remove();
  if (table && !panel.querySelector('tbody tr:not([hidden])')) {
    table.insertAdjacentHTML(
      'afterend',
      '<p class="cloud-sync-hint" data-network-empty>Ningún paciente coincide con estos filtros.</p>'
    );
  }
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

/** Room detail model, drawn by AdminRoomDetail. @param {object} data */
export function roomDetailModel(data) {
  const room = data.room || {};
  const members = data.members || [];
  return {
    title: formatCloudRoomLabel(room),
    id: String(room.id),
    month: String(room.turnKey || '—'),
    revision: String(room.revision ?? 0),
    storage: formatBytes(Number(room.storageBytes) || 0),
    members: members.map((m) => ({
      username: '@' + (m.username || ''),
      displayName: m.displayName || '',
      role: fmtRole(m.role),
      joinedAt: m.joinedAt || '',
    })),
  };
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

/** Registro (board «Admin · Registro»): loads on its own when a sala is picked. */
export function mutacionesShellHtml() {
  return (
    adminHeadHtml(
      'Registro de cambios',
      'Quién cambió qué, en cada sala. Se carga solo al elegir sala.',
      '<select class="profile-input cloud-sync-admin-search" data-admin-mutations-room aria-label="Sala">' +
        '<option value="">— Elige una sala —</option></select>'
    ) +
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

/** What a mutation did, in words, from its biggest op path. @param {Record<string, unknown>} m */
function mutationVerb(m) {
  const path = String(m.maxOpPath || (Array.isArray(m.paths) ? m.paths[0] : '') || '');
  if (/medReceta/i.test(path)) return 'cambió la receta de un paciente';
  const verbs = {
    clinicalOps: 'guardó la lista clínica',
    labs: 'agregó laboratorios',
    censo: 'actualizó el censo',
    patient: 'actualizó un paciente',
    signos: 'registró signos',
    eventualidades: 'anotó una eventualidad',
    pendientes: 'cambió pendientes',
    agenda: 'cambió la agenda',
    delete: 'borró un registro',
  };
  return verbs[classifyCloudOpPath(path)] || 'guardó cambios';
}

/** @param {unknown} bytes */
function kb(bytes) {
  const n = Number(bytes);
  return Number.isFinite(n) ? Math.max(1, Math.round(n / 1024)) + ' KB' : '';
}

/** @param {string} name */
function initials(name) {
  const words = String(name || '').replace(/^(dra?|dr)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  return (words[0].charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : '')).toUpperCase();
}

/** «Hoy · 15 h» / «25/09 · 9 h». @param {Date} d @param {Date} now */
function hourGroup(d, now) {
  const sameDay = d.toDateString() === now.toDateString();
  const day = sameDay ? 'Hoy' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  return day + ' · ' + d.getHours() + ' h';
}

/**
 * Registro model: last-hour count, typical size and active people, then one line
 * per change with a person's name (not a user ID), grouped by hour. Drawn by AdminMutations.
 * @param {Array<Record<string, unknown>>} mutations
 * @param {Array<{ user_id?: string, clinical_name?: string, username?: string }>} [users]
 * @param {number} [nowMs]
 */
export function mutationsModel(mutations, users = [], nowMs = Date.now()) {
  const list = Array.isArray(mutations) ? mutations : [];
  const byId = new Map((users || []).filter((u) => u && u.user_id).map((u) => [String(u.user_id), u]));
  const who = (id) => {
    const u = byId.get(String(id || ''));
    return u ? String(u.clinical_name || u.username || 'Usuario') : 'Otro dispositivo';
  };
  const now = new Date(nowMs);
  const lastHour = list.filter((m) => nowMs - Date.parse(String(m.createdAt || '')) < 3600e3).length;
  const sizes = list.map((m) => Number(m.totalBytes)).filter(Number.isFinite).sort((a, b) => a - b);
  const typical = sizes.length ? kb(sizes[Math.floor(sizes.length / 2)]) : '—';
  const people = new Set(list.map((m) => String(m.actorId || '')).filter(Boolean)).size;
  const items = [];
  let group = '';
  for (const m of list) {
    const d = new Date(String(m.createdAt || ''));
    const g = Number.isNaN(d.getTime()) ? '' : hourGroup(d, now);
    if (g && g !== group) {
      group = g;
      items.push({ group: g });
    }
    const name = who(m.actorId);
    const time = Number.isNaN(d.getTime()) ? String(m.createdAt || '') : d.toLocaleTimeString('es-MX', { hour12: false });
    items.push({
      event: {
        initials: initials(name),
        who: name,
        verb: mutationVerb(m),
        meta: ['Rev. ' + String(m.revision ?? '—'), kb(m.totalBytes), String(m.maxOpPath || '')].filter(Boolean).join(' · '),
        time,
        path: String(m.maxOpPath || '—'),
        opCount: String(m.opCount ?? '—'),
        mutationId: String(m.clientMutationId || '—'),
        actorId: String(m.actorId || '—'),
        ops: String(m.opsJson || '') + (m.opsJsonTruncated ? '…' : ''),
      },
    });
  }
  return {
    cards: [
      { label: 'Última hora', value: lastHour + (lastHour === 1 ? ' cambio' : ' cambios'), meta: 'En esta sala' },
      { label: 'Tamaño típico', value: typical, meta: 'Por cambio' },
      { label: 'Personas activas', value: String(people), meta: 'En los últimos ' + list.length },
    ],
    items,
  };
}

export function peligroHtml() {
  return (
    adminHeadHtml('Zona de peligro', 'Solo afecta datos en Nube. Lo guardado en cada equipo no se borra.') +
    '<div class="cloud-sync-admin-danger">' +
    '<section class="cloud-sync-admin-danger-card">' +
    '<h5 class="cloud-sync-admin-danger-title">Purgar sala</h5>' +
    '<p class="cloud-sync-hint">Elimina miembros, cambios, estado y la sala. No se puede deshacer.</p>' +
    '<div class="cloud-sync-admin-toolbar">' +
    '<label class="cloud-sync-admin-toolbar-label" for="cloud-admin-peligro-room">Sala</label>' +
    '<select id="cloud-admin-peligro-room" class="profile-input" data-admin-peligro-room>' +
    '<option value="">— Elige una sala —</option></select>' +
    '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-admin-action="purge-room-selected">Purgar…</button>' +
    '</div></section>' +
    '<section class="cloud-sync-admin-danger-card">' +
    '<h5 class="cloud-sync-admin-danger-title">Cuentas</h5>' +
    '<p class="cloud-sync-hint">Revocar sesiones, deshabilitar o borrar cuentas se hace en Usuarios.</p>' +
    '<button type="button" class="cloud-sync-btn" data-admin-tab="equipos">Ir a Usuarios</button>' +
    '</section></div>'
  );
}

/** @param {string} message */
export function adminErrorHtml(message) {
  return '<p class="cloud-sync-admin-error">' + esc(message) + '</p>';
}
