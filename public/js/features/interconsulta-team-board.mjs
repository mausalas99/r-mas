/**
 * Interconsulta team board — 4 lanes (guardia, activo x2, postguardia),
 * each split into status-bucket sections. Modeled on
 * unified-patient-grid-board.mjs's team-grouped pattern, but as plain
 * HTML-string rendering (matching patients-card-html.mjs) since this board
 * has no per-chip vitals ticker or click wiring of its own.
 */
import { getInterconsultaTeamRoles } from '../../../lib/clinical-scope/interconsulta-team-roles.mjs';
import { classifyInterconsultaBoardBucket } from '../../../lib/clinical-scope/interconsulta-board-buckets.mjs';
import { renderPatientCardHtml } from './patients-card-html.mjs';
import { escHtml } from '../dom-escape.mjs';

const BUCKET_LABELS = {
  preop: 'Preop / Nuevas hoy',
  pendientes: 'Pendientes',
  under: 'Under',
};

function teamLabel(team) {
  return String(team?.name || team?.service || 'Equipo').trim() || 'Equipo';
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

function renderCardGroupHtml(label, patients, accent) {
  return (
    '<div class="ic-board-bucket' + (accent ? ' ic-board-bucket--accent' : '') + '">' +
    '<div class="r4-section-divider">' + escHtml(label) + ' (' + patients.length + ')</div>' +
    '<div class="patient-chips-grid">' +
    patients.map(renderPatientCardHtml).join('') +
    '</div></div>'
  );
}

function renderBucketSectionHtml(bucketKey, patients, highlight) {
  return renderCardGroupHtml(BUCKET_LABELS[bucketKey], patients, highlight);
}

function renderActiveLaneBodyHtml(patients, bucketKeys, isGuardiaTeam, now) {
  const groups = groupByBucket(patients, isGuardiaTeam, now);
  return bucketKeys
    .map((key) => renderBucketSectionHtml(key, groups[key], key === 'preop'))
    .join('');
}

/** Lanes double as drop targets: `data-drop-team-id` (possibly empty, for
 * "Sin equipo") is how the drag/drop wiring in mountInterconsultaTeamBoard
 * finds which team a dropped patient card should be reassigned to. */
function laneBodyAttr(dropTeamId) {
  return dropTeamId == null ? '' : ' data-drop-team-id="' + escHtml(String(dropTeamId)) + '"';
}

function renderGuardiaLaneHtml(team, patients, now) {
  const body = team
    ? renderActiveLaneBodyHtml(patients, ['preop', 'pendientes', 'under'], true, now)
    : '<p class="ic-board-empty">Sin equipo de guardia hoy.</p>';
  return (
    '<section class="ic-board-lane ic-board-lane--guardia" data-role="guardia">' +
    '<div class="ic-board-lane__head">' +
    '<h3 class="ic-board-lane__title">' + escHtml(teamLabel(team)) + ' — Guardia</h3>' +
    '</div>' +
    '<div class="ic-board-lane__body"' + laneBodyAttr(team && team.team_id) + '>' + body + '</div>' +
    '</section>'
  );
}

/** Two fixed activo slots + whatever real teams don't fit are folded into
 * an "Otros equipos" lane — lane count is now always fixed at 4 (+1 for
 * Otros equipos / Sin equipo when there's overflow or truly unassigned
 * patients), never varying with how many real teams exist. */
function laneSlots(roles) {
  const activo = roles.activo || [];
  return { activo: [activo[0] || null, activo[1] || null], overflow: activo.slice(2) };
}

function renderActivoLaneHtml(team, patients, now, slotIndex) {
  const title = team ? teamLabel(team) : 'Activo ' + (slotIndex + 1);
  const body = team
    ? renderActiveLaneBodyHtml(patients, ['pendientes', 'under'], false, now)
    : '<p class="ic-board-empty">Sin equipo asignado.</p>';
  return (
    '<section class="ic-board-lane ic-board-lane--activo" data-role="activo">' +
    '<div class="ic-board-lane__head">' +
    '<h3 class="ic-board-lane__title">' + escHtml(title) + '</h3>' +
    '</div>' +
    '<div class="ic-board-lane__body"' + laneBodyAttr(team && team.team_id) + '>' + body + '</div>' +
    '</section>'
  );
}

/** `groups`: [{ label, patients }] — one per overflow team plus, if any
 * exist, one for truly unassigned patients. No Preop/Pendientes/Under
 * split here — a non-guardia lane's Preop bucket is always empty
 * (classifyInterconsultaBoardBucket), so it's not worth rendering. */
function renderOtrosLaneHtml(groups) {
  const hasOverflowTeam = groups.some((g) => g.label !== 'Sin equipo');
  const title = hasOverflowTeam ? 'Otros equipos' : 'Sin equipo';
  const body = groups.map((g) => renderCardGroupHtml(g.label, g.patients, false)).join('');
  return (
    '<section class="ic-board-lane ic-board-lane--unassigned" data-role="sin-equipo">' +
    '<div class="ic-board-lane__head"><h3 class="ic-board-lane__title">' + escHtml(title) + '</h3></div>' +
    '<div class="ic-board-lane__body" data-drop-team-id="">' + body + '</div>' +
    '</section>'
  );
}

/** Post-guardia stays a normal, fully-open drop target (not dimmed) so
 * patients can still be assigned to it — the "no presencial" note is just
 * informational, it no longer means the lane is closed. */
function renderPostguardiaLaneHtml(team, patients, now) {
  const body = team
    ? renderActiveLaneBodyHtml(patients, ['pendientes', 'under'], false, now)
    : '<p class="ic-board-empty">Sin equipo.</p>';
  return (
    '<section class="ic-board-lane ic-board-lane--postguardia" data-role="postguardia">' +
    '<div class="ic-board-lane__head">' +
    '<h3 class="ic-board-lane__title">' + escHtml(teamLabel(team)) + ' — Post-guardia</h3>' +
    '<p class="ic-board-empty">No presencial hoy — pacientes repartidos al resto del equipo.</p>' +
    '</div>' +
    '<div class="ic-board-lane__body"' + laneBodyAttr(team && team.team_id) + '>' + body + '</div>' +
    '</section>'
  );
}

/**
 * Renders the fixed 4-lane interconsulta team board as an HTML string
 * (guardia, activo x2, postguardia — postguardia hideable, extra real
 * teams beyond 2 activo slots fold into a 5th "Otros equipos" lane).
 * @param {object[]} patients — patients already scoped to interconsulta, each with `censusTeamId`
 * @param {object[]} teams — all clinical teams (filtered internally to Interconsultas)
 * @param {Date|string} [now]
 * @param {{ filterGuardiaOnly?: boolean, hidePostguardia?: boolean }} [opts]
 * @returns {string}
 */
export function renderInterconsultaTeamBoardHtml(patients, teams, now = new Date(), opts = {}) {
  const { filterGuardiaOnly = false, hidePostguardia = false } = opts || {};
  const roles = getInterconsultaTeamRoles(teams, now);
  const byTeam = new Map();
  for (const p of patients || []) {
    const teamId = String(p?.censusTeamId || '');
    if (!teamId) continue;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    byTeam.get(teamId).push(p);
  }
  const patientsFor = (team) => (team ? byTeam.get(String(team.team_id || '')) || [] : []);

  const slots = laneSlots(roles);
  // Computed BEFORE hidePostguardia filtering — postguardia's patients must
  // stay "known" even when its lane is hidden, or they'd wrongly leak into
  // the Otros equipos / Sin equipo lane below.
  const knownTeamIds = new Set(
    [roles.guardia, roles.postguardia, ...slots.activo, ...slots.overflow]
      .filter(Boolean)
      .map((t) => String(t.team_id || ''))
  );

  if (filterGuardiaOnly) {
    const body = roles.guardia
      ? renderActiveLaneBodyHtml(patientsFor(roles.guardia), ['preop'], true, now)
      : '<p class="ic-board-empty">Sin equipo de guardia hoy.</p>';
    return (
      '<div class="ic-team-board ic-team-board--filtered">' +
      '<section class="ic-board-lane ic-board-lane--guardia" data-role="guardia">' +
      '<h3 class="ic-board-lane__title">' + escHtml(teamLabel(roles.guardia)) + ' — Guardia</h3>' +
      body +
      '</section></div>'
    );
  }

  const lanes = [
    renderGuardiaLaneHtml(roles.guardia, patientsFor(roles.guardia), now),
    renderActivoLaneHtml(slots.activo[0], patientsFor(slots.activo[0]), now, 0),
    renderActivoLaneHtml(slots.activo[1], patientsFor(slots.activo[1]), now, 1),
  ];
  if (!hidePostguardia) {
    lanes.push(renderPostguardiaLaneHtml(roles.postguardia, patientsFor(roles.postguardia), now));
  }

  const otrosGroups = slots.overflow
    .map((team) => ({ label: teamLabel(team), patients: patientsFor(team) }))
    .filter((g) => g.patients.length);
  const unassignedPatients = (patients || []).filter((p) => {
    const teamId = String(p?.censusTeamId || '');
    return !teamId || !knownTeamIds.has(teamId);
  });
  if (unassignedPatients.length) {
    otrosGroups.push({ label: 'Sin equipo', patients: unassignedPatients });
  }
  if (otrosGroups.length) {
    lanes.push(renderOtrosLaneHtml(otrosGroups));
  }

  return '<div class="ic-team-board">' + lanes.join('') + '</div>';
}

/**
 * Mounts the board into `container` and wires drag/drop team reassignment.
 *
 * @param {HTMLElement} container
 * @param {object[]} patients
 * @param {object[]} teams
 * @param {{
 *   now?: Date|string,
 *   filterGuardiaOnly?: boolean,
 *   hidePostguardia?: boolean,
 *   assignTeam?: (patientId: string, teamId: string) => Promise<any>,
 *   onAssignTeam?: (result: any) => void,
 * }} opts
 */
export function mountInterconsultaTeamBoard(container, patients, teams, opts = {}) {
  if (!container) return;
  const now = opts.now || new Date();
  container.innerHTML = renderInterconsultaTeamBoardHtml(patients, teams, now, {
    filterGuardiaOnly: opts.filterGuardiaOnly,
    hidePostguardia: opts.hidePostguardia,
  });
  wireTeamBoardDragAndDrop(container, opts);
}

/** Drag a `.patient-card` from any lane, drop it on any `.ic-board-lane__body`
 * (each carries `data-drop-team-id`, including "" for Sin equipo) to
 * reassign that patient's team via `opts.assignTeam`. Native HTML5 DnD —
 * no library needed for a same-page card move. */
function wireTeamBoardDragAndDrop(container, opts) {
  for (const card of container.querySelectorAll('.patient-card[data-patient-id]')) {
    card.draggable = true;
  }

  container.addEventListener('dragstart', (ev) => {
    const card = ev.target.closest && ev.target.closest('.patient-card[data-patient-id]');
    if (!card) return;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', card.getAttribute('data-patient-id') || '');
    card.classList.add('ic-board-card--dragging');
  });

  container.addEventListener('dragend', (ev) => {
    const card = ev.target.closest && ev.target.closest('.patient-card[data-patient-id]');
    if (card) card.classList.remove('ic-board-card--dragging');
  });

  container.addEventListener('dragover', (ev) => {
    const body = ev.target.closest && ev.target.closest('.ic-board-lane__body[data-drop-team-id]');
    if (!body) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    body.classList.add('ic-board-lane__body--drop-over');
  });

  container.addEventListener('dragleave', (ev) => {
    const body = ev.target.closest && ev.target.closest('.ic-board-lane__body[data-drop-team-id]');
    if (body && !body.contains(ev.relatedTarget)) body.classList.remove('ic-board-lane__body--drop-over');
  });

  container.addEventListener('drop', async (ev) => {
    const body = ev.target.closest && ev.target.closest('.ic-board-lane__body[data-drop-team-id]');
    if (!body) return;
    ev.preventDefault();
    body.classList.remove('ic-board-lane__body--drop-over');
    const patientId = ev.dataTransfer.getData('text/plain');
    const teamId = body.getAttribute('data-drop-team-id') || '';
    if (!patientId || typeof opts.assignTeam !== 'function') return;
    const result = await opts.assignTeam(patientId, teamId);
    if (typeof opts.onAssignTeam === 'function') opts.onAssignTeam(result);
  });
}
