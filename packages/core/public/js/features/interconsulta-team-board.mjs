/**
 * Interconsulta team board — Sala-style cards in two modes.
 *
 * "Asignar": one row per team on top (guardia, activo x2, postguardia, any
 * overflow teams) and every unassigned patient below ("Por asignar"), all
 * visible at once. Rows and the tray are drop targets (`data-drop-team-id`).
 * "Mi equipo": one team's patients as full Sala cards, grouped by bucket.
 *
 * Plain HTML-string rendering, like patients-card-html.mjs.
 */
import { getInterconsultaTeamRoles } from '../../../lib/clinical-scope/interconsulta-team-roles.mjs';
import { classifyInterconsultaBoardBucket } from '../../../lib/clinical-scope/interconsulta-board-buckets.mjs';
import { requestingServiceHue } from './patients-card-html.mjs';
import { getConsultInfo } from './patient-dashboard/consult-band.mjs';
import { bedLine, cardTagsHtml, cornerBtnHtml } from './sala-view-variants.mjs';
import { ensurePatientDiagnosticos } from '../patient-diagnosticos.mjs';
import { escHtml } from '../dom-escape.mjs';

const BUCKET_LABELS = {
  preop: 'Preop / Nuevas hoy',
  pendientes: 'Pendientes',
  under: 'Under',
};

function teamLabel(team, fallback) {
  return String(team?.name || team?.service || fallback || 'Equipo').trim() || 'Equipo';
}

function groupByBucket(patients, isGuardiaTeam, now) {
  /** @type {Record<string, object[]>} */
  const groups = { preop: [], pendientes: [], under: [], archivado: [] };
  for (const p of patients || []) {
    const bucket = classifyInterconsultaBoardBucket(p, { isGuardiaTeam, now });
    (groups[bucket] || groups.pendientes).push(p);
  }
  return groups;
}

/** Sala card (`.sv-card`) plus what only interconsultas has: the requesting
 * service chip. `compact` (team rows, tray) is three short lines: bed, name,
 * service. Full cards (Mi equipo) add diagnósticos. `archivable` adds the Sala
 * archive corner. */
export function icCardHtml(p, compact, archivable) {
  const id = escHtml(String(p.id));
  const svcName = String(getConsultInfo(p).requestingService || '').trim();
  const hue = requestingServiceHue(p);
  const svc = svcName
    ? '<span class="svc" style="--h:' + (hue == null ? 220 : hue) + '">' + escHtml(svcName) + '</span>'
    : '<span class="sv-none">Sin servicio</span>';
  let dx = '';
  if (!compact) {
    ensurePatientDiagnosticos(p);
    const list = p.diagnosticosList.filter(Boolean);
    dx =
      '<span class="sv-label">Diagnósticos</span>' +
      (list.length
        ? '<ul class="sv-dx">' + list.map((d) => '<li>' + escHtml(d) + '</li>').join('') + '</ul>'
        : '<span class="sv-none">Sin diagnóstico</span>');
  }
  return (
    '<div class="sv-card-wrap">' +
    '<button type="button" class="sv-card ic-card' + (compact ? ' ic-card--compact' : '') +
    '" draggable="true" data-ic-open="' + id + '" data-patient-id="' + id + '">' +
    '<span class="sv-card-top"><span class="sv-bed">' + escHtml(bedLine(p)) + '</span>' + cardTagsHtml(p) + '</span>' +
    '<span class="sv-name" title="' + escHtml([p.registro].filter(Boolean).join(' · ')) + '">' + escHtml(p.nombre || 'Sin nombre') + '</span>' +
    (compact ? '<span class="sv-ic">' + svc + '</span>' : '<span class="sv-label">Servicio solicitante</span><span class="sv-ic">' + svc + '</span>') +
    dx +
    '</button>' +
    (archivable ? cornerBtnHtml(p) : '') +
    '</div>'
  );
}

/** Two fixed activo slots; any further real teams become extra rows. */
function laneSlots(roles) {
  const activo = roles.activo || [];
  return { activo: [activo[0] || null, activo[1] || null], overflow: activo.slice(2) };
}

function groupPatientsByTeamId(patients) {
  const byTeam = new Map();
  for (const p of patients || []) {
    const teamId = String(p?.censusTeamId || '');
    if (!teamId) continue;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    byTeam.get(teamId).push(p);
  }
  return byTeam;
}

// Computed BEFORE hidePostguardia filtering — postguardia's patients must
// stay "known" even when its row is hidden, or they'd wrongly leak into the
// "Por asignar" tray.
function computeKnownTeamIds(roles, slots) {
  return new Set(
    [roles.guardia, roles.postguardia, ...slots.activo, ...slots.overflow]
      .filter(Boolean)
      .map((t) => String(t.team_id || ''))
  );
}

/** A team row. `team` null = empty slot: a slim, non-droppable placeholder. */
function renderTeamRowHtml({ role, team, title, pill, note, emptyText, patients, buckets, isGuardiaTeam, now }) {
  const count = team ? '<span class="sv-tag ic-row__count">' + patients.length + '</span>' : '';
  let body;
  if (!team) {
    body = '<p class="ic-board-empty">' + escHtml(emptyText) + '</p>';
  } else {
    const groups = groupByBucket(patients, isGuardiaTeam, now);
    body =
      buckets
        .filter((key) => groups[key].length)
        .map(
          (key) =>
            '<div class="ic-row__bucket' + (key === 'preop' ? ' ic-row__bucket--accent' : '') + '">' +
            '<span class="sv-label">' + BUCKET_LABELS[key] + ' · ' + groups[key].length + '</span>' +
            '<div class="ic-row__cards">' + groups[key].map((p) => icCardHtml(p, true)).join('') + '</div>' +
            '</div>'
        )
        .join('') || '<p class="ic-board-empty">Suelta un paciente aquí</p>';
  }
  const drop = team ? ' data-drop-team-id="' + escHtml(String(team.team_id || '')) + '"' : '';
  return (
    '<section class="ic-board-lane ic-row ic-row--' + role + (team ? '' : ' ic-row--empty') + '" data-role="' + role + '"' + drop + '>' +
    '<div class="ic-row__head">' +
    '<h3 class="ic-board-lane__title">' + escHtml(title) + '</h3>' +
    (pill ? '<span class="sv-tag ic-row__pill">' + escHtml(pill) + '</span>' : '') +
    count +
    (note ? '<span class="ic-row__note">' + escHtml(note) + '</span>' : '') +
    '</div>' +
    '<div class="ic-board-lane__body ic-row__body">' + body + '</div>' +
    '</section>'
  );
}

function renderTrayHtml(patients) {
  const body = patients.length
    ? '<div class="sv-grid">' + patients.map((p) => icCardHtml(p, true, true)).join('') + '</div>'
    : '<p class="ic-board-empty">Todos tienen equipo.</p>';
  return (
    '<section class="ic-board-lane ic-tray" data-role="sin-equipo" data-drop-team-id="">' +
    '<div class="ic-row__head"><h3 class="ic-board-lane__title">Por asignar</h3>' +
    '<span class="sv-tag ic-row__count">' + patients.length + '</span>' +
    '<span class="ic-row__note">Arrastra cada tarjeta a un equipo</span></div>' +
    '<div class="ic-board-lane__body ic-tray__body">' + body + '</div>' +
    '</section>'
  );
}

/**
 * "Asignar" mode as an HTML string.
 * @param {object[]} patients — patients already scoped to interconsulta, each with `censusTeamId`
 * @param {object[]} teams — all clinical teams (filtered internally to Interconsultas)
 * @param {Date|string} [now]
 * @param {{ filterGuardiaOnly?: boolean, hidePostguardia?: boolean }} [opts]
 * @returns {string}
 */
export function renderInterconsultaTeamBoardHtml(patients, teams, now = new Date(), opts = {}) {
  const { filterGuardiaOnly = false, hidePostguardia = false } = opts || {};
  const roles = getInterconsultaTeamRoles(teams, now);
  const byTeam = groupPatientsByTeamId(patients);
  const patientsFor = (team) => (team ? byTeam.get(String(team.team_id || '')) || [] : []);
  const slots = laneSlots(roles);
  const row = (spec) => renderTeamRowHtml({ now, patients: patientsFor(spec.team), ...spec });

  const guardia = {
    role: 'guardia', team: roles.guardia, title: teamLabel(roles.guardia, 'Guardia'), pill: 'Guardia',
    emptyText: 'Sin equipo de guardia hoy.', isGuardiaTeam: true, buckets: ['preop', 'pendientes', 'under'],
  };
  if (filterGuardiaOnly) {
    return '<div class="ic-team-board ic-team-board--filtered">' + row({ ...guardia, buckets: ['preop'] }) + '</div>';
  }

  const active = { isGuardiaTeam: false, buckets: ['pendientes', 'under'] };
  const rows = [
    row(guardia),
    ...slots.activo.map((team, i) =>
      row({ ...active, role: 'activo', team, title: teamLabel(team, 'Activo ' + (i + 1)), emptyText: 'Sin equipo asignado.' })
    ),
  ];
  if (!hidePostguardia) {
    rows.push(
      row({
        ...active, role: 'postguardia', team: roles.postguardia,
        title: teamLabel(roles.postguardia, 'Post-guardia'), pill: 'Post-guardia',
        note: 'No presencial hoy — pacientes repartidos al resto del equipo.', emptyText: 'Sin equipo.',
      })
    );
  }
  for (const team of slots.overflow) {
    rows.push(row({ ...active, role: 'activo', team, title: teamLabel(team), emptyText: '' }));
  }

  const known = computeKnownTeamIds(roles, slots);
  const unassigned = (patients || []).filter((p) => !known.has(String(p?.censusTeamId || '')));
  return '<div class="ic-team-board"><div class="ic-rows">' + rows.join('') + '</div>' + renderTrayHtml(unassigned) + '</div>';
}

/** Teams that can be "mine", in board order: [{ id, label }]. Empty when no real team exists. */
export function interconsultaTeamOptions(teams, now = new Date()) {
  const roles = getInterconsultaTeamRoles(teams, now);
  const slots = laneSlots(roles);
  return [roles.guardia, ...slots.activo, roles.postguardia, ...slots.overflow]
    .filter(Boolean)
    .map((t) => ({ id: String(t.team_id || ''), label: teamLabel(t) }));
}

/** "Mi equipo" mode: one team's patients as full Sala cards, grouped by bucket. */
export function renderInterconsultaTeamViewHtml(patients, teams, now = new Date(), teamId = '') {
  const roles = getInterconsultaTeamRoles(teams, now);
  const isGuardiaTeam = !!roles.guardia && String(roles.guardia.team_id || '') === String(teamId);
  const mine = (patients || []).filter((p) => String(p?.censusTeamId || '') === String(teamId));
  const groups = groupByBucket(mine, isGuardiaTeam, now);
  const body = ['preop', 'pendientes', 'under']
    .filter((key) => groups[key].length)
    .map(
      (key) =>
        '<section class="ic-team-view__bucket"><h3 class="ic-team-view__label">' + BUCKET_LABELS[key] + ' · ' + groups[key].length + '</h3>' +
        '<div class="sv-grid" data-drop-team-id="' + escHtml(String(teamId)) + '">' + groups[key].map((p) => icCardHtml(p, false, true)).join('') + '</div></section>'
    )
    .join('');
  return '<div class="ic-team-view">' + (body || '<p class="sv-none">Sin pacientes en este equipo.</p>') + '</div>';
}

/**
 * Mounts the board into `container` and wires drag/drop team reassignment.
 *
 * @param {HTMLElement} container
 * @param {object[]} patients
 * @param {object[]} teams
 * @param {{
 *   now?: Date|string,
 *   mode?: 'asignar'|'equipo',
 *   teamId?: string,
 *   filterGuardiaOnly?: boolean,
 *   hidePostguardia?: boolean,
 *   assignTeam?: (patientId: string, teamId: string) => Promise<any>,
 *   onAssignTeam?: (result: any) => void,
 * }} opts
 */
export function mountInterconsultaTeamBoard(container, patients, teams, opts = {}) {
  if (!container) return;
  const now = opts.now || new Date();
  container.innerHTML =
    opts.mode === 'equipo'
      ? renderInterconsultaTeamViewHtml(patients, teams, now, opts.teamId)
      : renderInterconsultaTeamBoardHtml(patients, teams, now, {
          filterGuardiaOnly: opts.filterGuardiaOnly,
          hidePostguardia: opts.hidePostguardia,
        });
  wireTeamBoardDragAndDrop(container, opts);
}

/** Drag a `.ic-card` from any row or the tray, drop it on any element with
 * `data-drop-team-id` ("" = Por asignar) to reassign that patient's team via
 * `opts.assignTeam`. Native HTML5 DnD — no library needed for a same-page move.
 * The listeners go on the container, which the header re-render keeps, so they
 * are attached once. */
function wireTeamBoardDragAndDrop(container, opts) {
  container._icDndOpts = opts;
  if (container.dataset.icDndWired) return;
  container.dataset.icDndWired = '1';
  const CARD = '.ic-card[data-patient-id]';
  const ZONE = '[data-drop-team-id]';

  container.addEventListener('dragstart', (ev) => {
    const card = ev.target.closest && ev.target.closest(CARD);
    if (!card) return;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', card.getAttribute('data-patient-id') || '');
    card.classList.add('ic-board-card--dragging');
  });

  const clearOver = () => container.querySelectorAll('.ic-drop-over').forEach((el) => el.classList.remove('ic-drop-over'));

  container.addEventListener('dragend', (ev) => {
    const card = ev.target.closest && ev.target.closest(CARD);
    if (card) card.classList.remove('ic-board-card--dragging');
    clearOver();
  });

  container.addEventListener('dragover', (ev) => {
    const zone = ev.target.closest && ev.target.closest(ZONE);
    if (!zone) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    if (!zone.classList.contains('ic-drop-over')) {
      clearOver();
      zone.classList.add('ic-drop-over');
    }
  });

  container.addEventListener('dragleave', (ev) => {
    const zone = ev.target.closest && ev.target.closest(ZONE);
    if (zone && !zone.contains(ev.relatedTarget)) zone.classList.remove('ic-drop-over');
  });

  container.addEventListener('drop', async (ev) => {
    const zone = ev.target.closest && ev.target.closest(ZONE);
    if (!zone) return;
    ev.preventDefault();
    clearOver();
    const patientId = ev.dataTransfer.getData('text/plain');
    const teamId = zone.getAttribute('data-drop-team-id') || '';
    const cur = container._icDndOpts;
    if (!patientId || typeof cur.assignTeam !== 'function') return;
    const result = await cur.assignTeam(patientId, teamId);
    if (typeof cur.onAssignTeam === 'function') cur.onAssignTeam(result);
  });
}
